require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const projects = require('./src/projects');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// --- Start ---

app.listen(PORT, () => {
  console.log(`CCC running on http://localhost:${PORT}`);
});
