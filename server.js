require('dotenv').config();

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');
const projects = require('./src/projects');
const sessions = require('./src/sessions');
const versions = require('./src/versions');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/xterm', express.static(path.join(__dirname, 'node_modules', '@xterm', 'xterm')));
app.use('/vendor/xterm-addon-fit', express.static(path.join(__dirname, 'node_modules', '@xterm', 'addon-fit')));
app.use('/vendor/xterm-addon-webgl', express.static(path.join(__dirname, 'node_modules', '@xterm', 'addon-webgl')));
app.use('/vendor/marked', express.static(path.join(__dirname, 'node_modules', 'marked', 'lib')));

// --- API Routes ---

// Get all projects and groups
app.get('/api/projects', (req, res) => {
  try {
    const data = projects.getAllProjects();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read projects' });
  }
});

// Add a project
app.post('/api/projects', (req, res) => {
  const { name, path: projectPath, group, coreFiles } = req.body;
  if (!name || !projectPath || !group) {
    return res.status(400).json({ error: 'name, path, and group are required' });
  }
  try {
    const project = projects.addProject({ name, path: projectPath, group, coreFiles });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add project' });
  }
});

// Update a project
app.put('/api/projects/:id', (req, res) => {
  try {
    const updated = projects.updateProject(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Project not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Remove a project
app.delete('/api/projects/:id', (req, res) => {
  try {
    const removed = projects.removeProject(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Project not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove project' });
  }
});

// Reorder projects (drag & drop)
app.put('/api/projects-reorder', (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds array is required' });
  }
  try {
    const data = projects.reorderProjects(orderedIds);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder projects' });
  }
});

// Add a group
app.post('/api/groups', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = projects.addGroup(name);
    if (!result) return res.status(409).json({ error: 'Group already exists' });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add group' });
  }
});

// Remove a group
app.delete('/api/groups/:name', (req, res) => {
  try {
    const result = projects.removeGroup(req.params.name);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove group' });
  }
});

// Browse directories
app.get('/api/browse', (req, res) => {
  try {
    const browsePath = req.query.path || os.homedir();
    const resolved = path.resolve(browsePath);

    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'Path does not exist' });
    }

    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const dirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    res.json({
      current: resolved,
      parent: path.dirname(resolved),
      directories: dirs
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to browse directory' });
  }
});

// Get settings
app.get('/api/settings', (req, res) => {
  try {
    const settingsPath = path.join(__dirname, 'data', 'settings.json');
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// --- File API ---

// Read a project file (for Markdown preview)
app.get('/api/file/:projectId', (req, res) => {
  const { projectId } = req.params;
  const { filePath } = req.query;

  if (!filePath) return res.status(400).json({ error: 'filePath query parameter required' });

  const project = projects.getAllProjects().projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const projectPath = projects.resolveProjectPath(project.path);
  const fullPath = path.join(projectPath, filePath);

  // Security: ensure the resolved path is within the project directory
  const resolvedProject = path.resolve(projectPath);
  const resolvedFile = path.resolve(fullPath);
  if (!resolvedFile.startsWith(resolvedProject)) {
    return res.status(403).json({ error: 'Access denied: path outside project directory' });
  }

  try {
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found: ' + filePath });
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ content, filePath, fullPath: resolvedFile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Open a file in the configured external editor
app.post('/api/open-editor', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });

  // Read editor from settings
  let editor = 'open'; // macOS default
  try {
    const settingsPath = path.join(__dirname, 'data', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (settings.editor) {
      editor = settings.editor;
    }
  } catch (e) {
    // Fall back to system default
  }

  try {
    const { exec } = require('child_process');
    // Use 'open -a <editor>' on macOS for app names, or direct command for binary paths
    if (editor === 'open' || editor === '') {
      exec(`open "${filePath}"`);
    } else {
      exec(`open -a "${editor}" "${filePath}"`);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to open editor' });
  }
});

// --- Version API ---

// Helper: find project and resolve path
function findProjectWithPath(projectId) {
  const project = projects.getAllProjects().projects.find(p => p.id === projectId);
  if (!project) return null;
  return { project, absPath: projects.resolveProjectPath(project.path) };
}

// Scan project versions
app.get('/api/projects/:id/versions', (req, res) => {
  try {
    const found = findProjectWithPath(req.params.id);
    if (!found) return res.status(404).json({ error: 'Project not found' });

    const result = versions.scanVersions(found.absPath, found.project.name);
    result.activeVersion = found.project.activeVersion || null;
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to scan versions: ' + err.message });
  }
});

// Create a new version
app.post('/api/projects/:id/versions', (req, res) => {
  const { version, type } = req.body;
  if (!version || !type) return res.status(400).json({ error: 'version and type are required' });

  try {
    const found = findProjectWithPath(req.params.id);
    if (!found) return res.status(404).json({ error: 'Project not found' });

    // Read previous version's concept doc to seed the new one
    // For patches: read from parent minor version
    // For major/minor: read from current active version
    let previousConceptContent = null;
    let sourceVersion = found.project.activeVersion;
    if (type === 'patch') {
      const parsed = versions.parseVersionString(version);
      sourceVersion = `${parsed.major}.${parsed.minor}`;
    }
    if (sourceVersion) {
      const prevFolder = versions.getVersionFolder(sourceVersion);
      const prevConceptPath = path.join(found.absPath, prevFolder, `${found.project.name}_concept.md`);
      try {
        if (fs.existsSync(prevConceptPath)) {
          previousConceptContent = fs.readFileSync(prevConceptPath, 'utf8');
        }
      } catch (e) {
        // Fall back to blank template
      }
    }

    const result = versions.createVersion(found.absPath, found.project.name, version, type, previousConceptContent);

    // Set as active version
    projects.updateProject(req.params.id, { activeVersion: version });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create version: ' + err.message });
  }
});

// Set active version
app.put('/api/projects/:id/active-version', (req, res) => {
  const { version } = req.body;
  if (!version) return res.status(400).json({ error: 'version is required' });

  try {
    const updated = projects.updateProject(req.params.id, { activeVersion: version });
    if (!updated) return res.status(404).json({ error: 'Project not found' });
    res.json({ ok: true, activeVersion: version });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set active version: ' + err.message });
  }
});

// Mark version complete (git tag)
app.post('/api/projects/:id/versions/:version/complete', async (req, res) => {
  const { tagName } = req.body;
  if (!tagName) return res.status(400).json({ error: 'tagName is required' });

  try {
    const found = findProjectWithPath(req.params.id);
    if (!found) return res.status(404).json({ error: 'Project not found' });

    const result = await versions.runGitTag(found.absPath, tagName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create git tag: ' + err.message });
  }
});

// Migrate flat docs to versioned structure
app.post('/api/projects/:id/migrate-versions', (req, res) => {
  const { version } = req.body;
  if (!version) return res.status(400).json({ error: 'version is required' });

  try {
    const found = findProjectWithPath(req.params.id);
    if (!found) return res.status(404).json({ error: 'Project not found' });

    const result = versions.migrateToVersioned(found.absPath, found.project.name, version);

    // Set as active version and update coreFiles to point to versioned paths
    const versionFolder = versions.getVersionFolder(version);
    projects.updateProject(req.params.id, {
      activeVersion: version,
      coreFiles: {
        claude: 'CLAUDE.md',
        concept: path.join(versionFolder, `${found.project.name}_concept.md`),
        tasklist: path.join(versionFolder, `${found.project.name}_tasklist.md`)
      }
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to migrate: ' + err.message });
  }
});

// --- Session API ---

// Start a session for a project
app.post('/api/sessions/:projectId', (req, res) => {
  const { projectId } = req.params;
  const { command } = req.body; // 'claude' or 'shell'

  const project = projects.getAllProjects().projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const projectPath = projects.resolveProjectPath(project.path);

  if (!fs.existsSync(projectPath)) {
    return res.status(400).json({ error: 'Project path does not exist: ' + projectPath });
  }

  try {
    sessions.createSession(projectId, projectPath, command || 'shell');
    res.json({ ok: true, state: 'active' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start session: ' + err.message });
  }
});

// Get session state
app.get('/api/sessions/:projectId', (req, res) => {
  const session = sessions.getSession(req.params.projectId);
  if (!session) return res.json({ state: 'none' });
  res.json({ state: session.state });
});

// Get all session states
app.get('/api/sessions', (req, res) => {
  res.json(sessions.getAllSessionStates());
});

// --- Start ---

const server = http.createServer(app);

// WebSocket server on the same HTTP server
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    ws.close(1008, 'projectId required');
    return;
  }

  // Register this client with the session
  const attached = sessions.addClient(projectId, ws);
  if (!attached) {
    ws.send(JSON.stringify({ type: 'state', state: 'none' }));
  }

  ws.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg);

      if (parsed.type === 'input') {
        sessions.writeToSession(projectId, parsed.data);
      } else if (parsed.type === 'resize') {
        sessions.resizeSession(projectId, parsed.cols, parsed.rows);
      }
    } catch (e) {
      // Ignore malformed messages
    }
  });

  ws.on('close', () => {
    sessions.removeClient(projectId, ws);
  });
});

server.listen(PORT, () => {
  console.log(`CCC running on http://localhost:${PORT}`);
});
