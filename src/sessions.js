const pty = require('node-pty');
const os = require('os');
const fs = require('fs');
const path = require('path');

const { ClaudeParser, STATES } = require('./parser');

// Active sessions keyed by project ID
const sessions = new Map();

// Track whether we've already filed a degraded issue this session
let degradedIssueFiled = false;


function getDefaultShell() {
  if (os.platform() === 'win32') {
    return process.env.COMSPEC || 'powershell.exe';
  }
  return process.env.SHELL || '/bin/sh';
}

function createSession(projectId, projectPath, command) {
  // Kill existing session for this project if any
  if (sessions.has(projectId)) {
    destroySession(projectId);
  }

  const shell = getDefaultShell();
  const isClaudeCode = command === 'claude';

  // Platform-aware shell arguments:
  // - macOS/Linux: interactive shell with -c for Claude, -i for plain shell
  // - Windows: PowerShell uses -Command for Claude, no flags for plain shell
  const isWindows = os.platform() === 'win32';
  let spawnArgs;
  if (isClaudeCode) {
    spawnArgs = isWindows ? ['-Command', 'claude'] : ['-i', '-c', 'claude'];
  } else {
    spawnArgs = isWindows ? [] : ['-i'];
  }

  const ptyProcess = pty.spawn(shell, spawnArgs, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: projectPath,
    env: (() => {
      const env = Object.assign({}, process.env, {
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        HOME: os.homedir()
      });
      // Remove Claude Code nesting guards so spawned sessions can run claude
      delete env.CLAUDECODE;
      delete env.CLAUDE_CODE_ENTRYPOINT;
      return env;
    })()
  });

  const session = {
    id: projectId,
    pty: ptyProcess,
    state: 'active',
    command,
    claudeStatus: isClaudeCode ? STATES.UNKNOWN : null,
    parser: null,
    degraded: false,
    wsClients: new Set()
  };

  // Create parser for Claude Code sessions
  if (isClaudeCode) {
    session.parser = new ClaudeParser({
      onStateChange: (newState, previousState) => {
        session.claudeStatus = newState;
        // Broadcast status change to all connected clients
        session.wsClients.forEach(ws => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'claudeStatus', status: newState, previous: previousState }));
          }
        });
      },
      onDegraded: (info) => {
        session.degraded = true;
        session.wsClients.forEach(ws => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'degraded', info }));
          }
        });
        // Auto-file GitHub issue (optional, requires token)
        autoFileGitHubIssue(info);
      },
    });
    // Degradation monitor disabled in v1.0 — false positives on streaming output.
    // Redesign deferred to v1.1. See parser.js comment at feed().
  }

  // Forward PTY output to all connected WebSocket clients
  ptyProcess.onData((data) => {
    // Feed data to parser if this is a Claude Code session
    if (session.parser) {
      session.parser.feed(data);
    }

    session.wsClients.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify({ type: 'output', data }));
      }
    });
  });

  // Handle PTY exit
  ptyProcess.onExit(({ exitCode }) => {
    session.state = 'exited';
    if (session.parser) {
      session.parser.stopDegradeMonitor();
      session.parser.reset();
    }
    session.wsClients.forEach(ws => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'exit', exitCode }));
      }
    });
  });

  sessions.set(projectId, session);
  return session;
}

function getSession(projectId) {
  return sessions.get(projectId) || null;
}

function destroySession(projectId) {
  const session = sessions.get(projectId);
  if (!session) return;

  if (session.parser) {
    session.parser.stopDegradeMonitor();
  }

  try {
    session.pty.kill();
  } catch (e) {
    // Process may already be dead
  }
  session.wsClients.forEach(ws => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'exit', exitCode: -1 }));
    }
  });
  sessions.delete(projectId);
}

function resizeSession(projectId, cols, rows) {
  const session = sessions.get(projectId);
  if (!session || session.state !== 'active') return;

  try {
    session.pty.resize(cols, rows);
  } catch (e) {
    // Ignore resize errors on dead processes
  }
}

function writeToSession(projectId, data) {
  const session = sessions.get(projectId);
  if (!session || session.state !== 'active') return;

  session.pty.write(data);
}

function addClient(projectId, ws) {
  const session = sessions.get(projectId);
  if (!session) return false;

  session.wsClients.add(ws);
  // Send current state to new client
  ws.send(JSON.stringify({ type: 'state', state: session.state }));
  // Send current Claude status if this is a Claude Code session
  if (session.claudeStatus) {
    ws.send(JSON.stringify({ type: 'claudeStatus', status: session.claudeStatus }));
  }
  if (session.degraded) {
    ws.send(JSON.stringify({ type: 'degraded' }));
  }
  return true;
}

function removeClient(projectId, ws) {
  const session = sessions.get(projectId);
  if (!session) return;

  session.wsClients.delete(ws);
}

function getAllSessionStates() {
  const states = {};
  sessions.forEach((session, id) => {
    states[id] = {
      state: session.state,
      command: session.command,
      claudeStatus: session.claudeStatus,
      degraded: session.degraded
    };
  });
  return states;
}

/**
 * Auto-file a GitHub issue when parser enters degraded state.
 * Only files once per application lifecycle. Checks for duplicates.
 */
async function autoFileGitHubIssue(info) {
  if (degradedIssueFiled) return;

  // Read settings for GitHub token
  let settings;
  try {
    const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    return; // No settings, can't file
  }

  const token = settings.githubToken || process.env.GITHUB_TOKEN;
  if (!token) return; // No token configured

  const repo = process.env.GITHUB_REPO;
  if (!repo) return;

  // Extract owner/repo from URL (e.g. http://host/Owner/Repo)
  let apiBase, owner, repoName;
  try {
    const url = new URL(repo);
    apiBase = `${url.protocol}//${url.host}/api/v1`;
    const parts = url.pathname.replace(/^\/|\.git$/g, '').split('/');
    owner = parts[0];
    repoName = parts[1];
  } catch (e) {
    return;
  }

  const issueTitle = '[Auto] Status detection degraded — Claude Code output format may have changed';

  try {
    // Check for existing open issue with same title
    const searchRes = await fetch(
      `${apiBase}/repos/${owner}/${repoName}/issues?state=open&type=issues&limit=50`,
      { headers: { 'Authorization': `token ${token}` } }
    );
    if (searchRes.ok) {
      const issues = await searchRes.json();
      const existing = issues.find(i => i.title === issueTitle);
      if (existing) {
        degradedIssueFiled = true;
        return; // Issue already exists
      }
    }

    // Get Claude Code version
    let claudeVersion = 'unknown';
    try {
      const { execSync } = require('child_process');
      claudeVersion = execSync('claude --version', { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    } catch (e) {
      // Can't determine version
    }

    // Get CCC version
    let cccVersion = 'unknown';
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
      cccVersion = pkg.version || 'unknown';
    } catch (e) {
      // Can't determine version
    }

    const body = [
      `## Status Detection Degraded`,
      ``,
      `CCC's parser has been unable to recognise Claude Code output patterns for over 60 seconds.`,
      `This may indicate that Claude Code's output format has changed.`,
      ``,
      `### Environment`,
      `- **CCC version:** ${cccVersion}`,
      `- **Claude Code version:** ${claudeVersion}`,
      `- **Platform:** ${os.platform()} ${os.release()}`,
      `- **Timestamp:** ${new Date().toISOString()}`,
      ``,
      `### Sanitised Output Sample`,
      '```',
      info.recentOutput || '(no sample available)',
      '```',
      ``,
      `### Notes`,
      `This issue was auto-filed by CCC. If you are seeing the same behaviour,`,
      `please add your Claude Code version and observations in a comment.`
    ].join('\n');

    const createRes = await fetch(`${apiBase}/repos/${owner}/${repoName}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: issueTitle, body })
    });

    if (createRes.ok) {
      degradedIssueFiled = true;
    }
  } catch (e) {
    // Silently fail — auto-filing is optional
  }
}

module.exports = {
  createSession,
  getSession,
  destroySession,
  resizeSession,
  writeToSession,
  addClient,
  removeClient,
  getAllSessionStates
};
