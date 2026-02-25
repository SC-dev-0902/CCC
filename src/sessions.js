const pty = require('node-pty');
const os = require('os');

// Active sessions keyed by project ID
const sessions = new Map();

function getDefaultShell() {
  return process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/zsh');
}

function createSession(projectId, projectPath, command) {
  // Kill existing session for this project if any
  if (sessions.has(projectId)) {
    destroySession(projectId);
  }

  const shell = getDefaultShell();
  const isClaudeCode = command === 'claude';

  // Determine what to spawn
  let spawnCmd, spawnArgs;
  if (isClaudeCode) {
    spawnCmd = shell;
    spawnArgs = ['-i', '-c', 'claude'];
  } else {
    spawnCmd = shell;
    spawnArgs = ['-i'];
  }

  const ptyProcess = pty.spawn(spawnCmd, spawnArgs, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: projectPath,
    env: Object.assign({}, process.env, {
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      HOME: process.env.HOME
    })
  });

  const session = {
    id: projectId,
    pty: ptyProcess,
    state: 'active',
    wsClients: new Set()
  };

  // Forward PTY output to all connected WebSocket clients
  ptyProcess.onData((data) => {
    session.wsClients.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify({ type: 'output', data }));
      }
    });
  });

  // Handle PTY exit
  ptyProcess.onExit(({ exitCode }) => {
    session.state = 'exited';
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
    states[id] = session.state;
  });
  return states;
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
