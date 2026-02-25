require('dotenv').config();

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');
const projects = require('./src/projects');
const sessions = require('./src/sessions');

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

// --- Session API ---

// Start a session for a project
app.post('/api/sessions/:projectId', (req, res) => {
  const { projectId } = req.params;
  const { command } = req.body; // 'claude' or 'shell'

  const project = projects.getAllProjects().projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Resolve project path using settings projectRoot
  let projectPath = project.path;
  try {
    const settingsPath = path.join(__dirname, 'data', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (settings.projectRoot && !path.isAbsolute(projectPath)) {
      projectPath = path.join(settings.projectRoot, projectPath);
    }
  } catch (e) {
    // Fall back to raw path
  }

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
