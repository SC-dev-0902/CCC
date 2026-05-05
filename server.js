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
const { scanUsage, scanWeeklyUsage, PLAN_LIMITS } = require('./src/usage');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/design-preview', express.static(path.join(__dirname, 'docs/v1.1/design/preview')));
app.use('/vendor/xterm', express.static(path.join(__dirname, 'node_modules', '@xterm', 'xterm')));
app.use('/vendor/xterm-addon-fit', express.static(path.join(__dirname, 'node_modules', '@xterm', 'addon-fit')));
app.use('/vendor/marked', express.static(path.join(__dirname, 'node_modules', 'marked', 'lib')));

// --- Settings Helper ---

const SETTINGS_DEFAULTS = {
  projectRoot: '',
  editor: '',
  shell: '',
  theme: 'dark',
  filePatterns: { concept: 'docs/v{VERSION}/{PROJECT}_concept_v{VERSION}.md', tasklist: 'docs/v{VERSION}/{PROJECT}_tasklist_v{VERSION}.md' },
  githubToken: '',
  recoveryInterval: 5,
  usagePlan: 'max5',
  tokenBudget5h: 1000000,
  weeklyTokenBudget: 20000000,
  weeklyMessageBudget: 45000
};

function readSettings() {
  const settingsPath = path.join(__dirname, 'data', 'settings.json');
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    // First run or corrupted — create defaults
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(SETTINGS_DEFAULTS, null, 2) + '\n', 'utf8');
    return JSON.parse(JSON.stringify(SETTINGS_DEFAULTS));
  }
}

// --- Path Security Helper ---

function isPathWithin(child, parent) {
  const resolvedChild = path.resolve(child);
  const resolvedParent = path.resolve(parent);
  if (os.platform() === 'win32') {
    return resolvedChild.toLowerCase().startsWith(resolvedParent.toLowerCase() + path.sep) ||
           resolvedChild.toLowerCase() === resolvedParent.toLowerCase();
  }
  return resolvedChild.startsWith(resolvedParent + path.sep) || resolvedChild === resolvedParent;
}

// --- API Routes ---

// Get all projects and groups
app.get('/api/projects', async (req, res) => {
  try {
    const data = await projects.getAllProjects();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read projects' });
  }
});

// Add a project
app.post('/api/projects', async (req, res) => {
  const { name, path: projectPath, group, coreFiles, type } = req.body;
  if (!name || !projectPath || !group) {
    return res.status(400).json({ error: 'name, path, and group are required' });
  }
  try {
    const project = await projects.addProject({ name, path: projectPath, group, coreFiles, type });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add project' });
  }
});

// Update a project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const updated = await projects.updateProject(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Project not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Rename a project (full propagation — files, coreFiles, CLAUDE.md)
app.post('/api/projects/:id/rename', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const result = await projects.renameProject(req.params.id, name.trim());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove a project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const deleteFiles = req.query.deleteFiles === 'true';

    // Resolve path before removing from registry
    let absPath = null;
    if (deleteFiles) {
      const project = (await projects.getAllProjects()).projects.find(p => p.id === req.params.id);
      if (project) {
        absPath = await projects.resolveProjectPath(project.path);
      }
    }

    const removed = await projects.removeProject(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Project not found' });

    // Delete from disk if requested
    if (deleteFiles && absPath && fs.existsSync(absPath)) {
      fs.rmSync(absPath, { recursive: true, force: true });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove project: ' + err.message });
  }
});

// Reorder projects (drag & drop)
app.put('/api/projects-reorder', async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds array is required' });
  }
  try {
    const data = await projects.reorderProjects(orderedIds);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder projects' });
  }
});

// Add a group
app.post('/api/groups', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await projects.addGroup(name);
    if (!result) return res.status(409).json({ error: 'Group already exists' });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add group' });
  }
});

// Remove a group
app.delete('/api/groups/:name', async (req, res) => {
  try {
    const result = await projects.removeGroup(req.params.name);
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
    res.json(readSettings());
  } catch (err) {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// Update settings
app.put('/api/settings', (req, res) => {
  try {
    const current = readSettings();

    const allowed = ['projectRoot', 'editor', 'shell', 'theme', 'filePatterns', 'githubToken'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        current[key] = req.body[key];
      }
    }

    const settingsPath = path.join(__dirname, 'data', 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(current, null, 2) + '\n', 'utf8');
    res.json(current);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// --- File API ---

// Read a project file (for Markdown preview)
app.get('/api/file/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { filePath } = req.query;

  if (!filePath) return res.status(400).json({ error: 'filePath query parameter required' });

  const project = (await projects.getAllProjects()).projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const projectPath = await projects.resolveProjectPath(project.path);

  if (!fs.existsSync(projectPath)) {
    return res.status(400).json({ error: 'Project directory does not exist: ' + project.path });
  }

  const fullPath = path.join(projectPath, filePath);

  // Security: ensure the resolved path is within the project directory
  if (!isPathWithin(fullPath, projectPath)) {
    return res.status(403).json({ error: 'Access denied: path outside project directory' });
  }

  try {
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found: ' + filePath });
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ content, filePath, fullPath: path.resolve(fullPath) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Write a project file (for test runner save-back)
app.put('/api/file/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { filePath, content } = req.body;

  if (!filePath) return res.status(400).json({ error: 'filePath is required' });
  if (content === undefined) return res.status(400).json({ error: 'content is required' });

  const project = (await projects.getAllProjects()).projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const projectPath = await projects.resolveProjectPath(project.path);

  if (!fs.existsSync(projectPath)) {
    return res.status(400).json({ error: 'Project directory does not exist: ' + project.path });
  }

  const fullPath = path.join(projectPath, filePath);

  // Security: ensure the resolved path is within the project directory
  if (!isPathWithin(fullPath, projectPath)) {
    return res.status(403).json({ error: 'Access denied: path outside project directory' });
  }

  try {
    // Ensure parent directory exists (e.g. docs/handoff/ for recovery files)
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write file: ' + err.message });
  }
});

// Open a file in the configured external editor
app.post('/api/open-editor', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });

  // Read editor from settings (empty string = system default)
  let editor = '';
  try {
    const settings = readSettings();
    if (settings.editor) {
      editor = settings.editor;
    }
  } catch (e) {
    // Fall back to system default
  }

  try {
    const { exec } = require('child_process');
    const platform = os.platform();

    if (!editor) {
      // System default: platform-aware open command
      if (platform === 'darwin') {
        exec(`open "${filePath}"`);
      } else if (platform === 'win32') {
        exec(`start "" "${filePath}"`);
      } else {
        exec(`xdg-open "${filePath}"`);
      }
    } else {
      // Specific editor configured
      if (platform === 'darwin') {
        exec(`open -a "${editor}" "${filePath}"`);
      } else {
        exec(`"${editor}" "${filePath}"`);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to open editor' });
  }
});

// --- Version API ---

// Helper: find project and resolve path
async function findProjectWithPath(projectId) {
  const project = (await projects.getAllProjects()).projects.find(p => p.id === projectId);
  if (!project) return null;
  return { project, absPath: await projects.resolveProjectPath(project.path) };
}

// Scan project versions
app.get('/api/projects/:id/versions', async (req, res) => {
  try {
    const found = await findProjectWithPath(req.params.id);
    if (!found) return res.status(404).json({ error: 'Project not found' });

    const result = versions.scanVersions(found.absPath, found.project.name);
    result.activeVersion = found.project.activeVersion || null;

    // Pass evaluated flag through — only cleared via POST /api/projects/:id/evaluated
    result.evaluated = found.project.evaluated;
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to scan versions: ' + err.message });
  }
});

// Create a new version
app.post('/api/projects/:id/versions', async (req, res) => {
  const { version, type } = req.body;
  if (!version || !type) return res.status(400).json({ error: 'version and type are required' });

  try {
    const found = await findProjectWithPath(req.params.id);
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
    await projects.updateProject(req.params.id, { activeVersion: version });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create version: ' + err.message });
  }
});

// Set active version
app.put('/api/projects/:id/active-version', async (req, res) => {
  const { version } = req.body;
  if (!version) return res.status(400).json({ error: 'version is required' });

  try {
    const updated = await projects.updateProject(req.params.id, { activeVersion: version });
    if (!updated) return res.status(404).json({ error: 'Project not found' });
    res.json({ ok: true, activeVersion: version });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set active version: ' + err.message });
  }
});

// Delete a version
app.delete('/api/projects/:id/versions/:version', async (req, res) => {
  try {
    const found = await findProjectWithPath(req.params.id);
    if (!found) return res.status(404).json({ error: 'Project not found' });

    const deletingVersion = req.params.version;
    const isActive = found.project.activeVersion === deletingVersion;

    const folder = versions.getVersionFolder(deletingVersion);
    const absFolder = path.join(found.absPath, folder);

    if (!fs.existsSync(absFolder)) {
      return res.status(404).json({ error: 'Version folder not found: ' + folder });
    }

    // Security: ensure path is within project
    if (!isPathWithin(absFolder, found.absPath)) {
      return res.status(403).json({ error: 'Access denied: path outside project directory' });
    }

    // If deleting the active version, fall back to parent/previous version
    let fallbackVersion = null;
    if (isActive) {
      const parsed = versions.parseVersionString(deletingVersion);
      if (parsed.patch !== null) {
        // Patch → fall back to parent minor (e.g. 1.0.3 → 1.0)
        fallbackVersion = `${parsed.major}.${parsed.minor}`;
      } else {
        // Minor/major → fall back to nearest remaining version
        const versionData = versions.scanVersions(found.absPath, found.project.name);
        const remaining = versionData.versions
          .map(v => v.version)
          .filter(v => v !== deletingVersion);
        if (remaining.length > 0) {
          fallbackVersion = remaining[remaining.length - 1];
        }
      }

      if (!fallbackVersion) {
        return res.status(400).json({ error: 'Cannot delete the only version. At least one version must remain.' });
      }

      // Verify fallback version folder exists
      const fallbackFolder = path.join(found.absPath, versions.getVersionFolder(fallbackVersion));
      if (!fs.existsSync(fallbackFolder)) {
        return res.status(400).json({ error: 'Fallback version folder does not exist: v' + fallbackVersion });
      }

      await projects.updateProject(req.params.id, { activeVersion: fallbackVersion });
    }

    fs.rmSync(absFolder, { recursive: true, force: true });
    res.json({ ok: true, deleted: folder, fallbackVersion });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete version: ' + err.message });
  }
});

// Mark version complete (git tag)
app.post('/api/projects/:id/versions/:version/complete', async (req, res) => {
  const { tagName } = req.body;
  if (!tagName) return res.status(400).json({ error: 'tagName is required' });

  try {
    const found = await findProjectWithPath(req.params.id);
    if (!found) return res.status(404).json({ error: 'Project not found' });

    const result = await versions.runGitTag(found.absPath, tagName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create git tag: ' + err.message });
  }
});

// Migrate flat docs to versioned structure
app.post('/api/projects/:id/migrate-versions', async (req, res) => {
  const { version } = req.body;
  if (!version) return res.status(400).json({ error: 'version is required' });

  try {
    const found = await findProjectWithPath(req.params.id);
    if (!found) return res.status(404).json({ error: 'Project not found' });

    const result = versions.migrateToVersioned(found.absPath, found.project.name, version);

    // Set as active version and update coreFiles to point to versioned paths
    const versionFolder = versions.getVersionFolder(version);
    await projects.updateProject(req.params.id, {
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

// --- Evaluated Flag ---

// Called by /evaluate-import at completion to clear the unevaluated notice
app.post('/api/projects/:id/evaluated', async (req, res) => {
  try {
    const found = await findProjectWithPath(req.params.id);
    if (!found) return res.status(404).json({ error: 'Project not found' });

    await projects.updateProject(req.params.id, { evaluated: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update evaluated flag: ' + err.message });
  }
});

// Get the correct test file path for a project's active version
app.get('/api/projects/:id/test-file-path', async (req, res) => {
  try {
    const found = await findProjectWithPath(req.params.id);
    if (!found) return res.status(404).json({ error: 'Project not found' });

    const stageId = req.query.stage;
    if (!stageId || !/^\d+[a-z]?\d*$/.test(stageId)) {
      return res.status(400).json({ error: 'stage query parameter is required (e.g. "11", "11a", "11a01")' });
    }

    const activeVersion = found.project.activeVersion || '1.0';
    const relativePath = versions.getTestFilePath(found.project.name, stageId, activeVersion);
    const absPath = path.join(found.absPath, relativePath);

    // Auto-create the directory if it doesn't exist
    const dir = path.dirname(absPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    res.json({ path: relativePath, absPath });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute test file path: ' + err.message });
  }
});

// --- Wizard Templates ---

const WIZARD_TEMPLATES = {
  'web-app': {
    name: 'Web App',
    icon: '\uD83C\uDF10',
    description: 'Frontend + server project',
    sections: `
## Tech Stack

| Concern | Technology |
|---|---|
| Frontend | *TBD* |
| Server | *TBD* |
| Persistence | *TBD* |

## Behavioural Rules

- *Add project-specific rules here*
`
  },
  'api': {
    name: 'API',
    icon: '\u26A1',
    description: 'Backend API service',
    sections: `
## Tech Stack

| Concern | Technology |
|---|---|
| Runtime | *TBD* |
| Framework | *TBD* |
| Persistence | *TBD* |

## Behavioural Rules

- *Add project-specific rules here*
`
  },
  'script': {
    name: 'Script',
    icon: '\uD83D\uDCDC',
    description: 'CLI tool or automation',
    sections: `
## Tech Stack

| Concern | Technology |
|---|---|
| Language | *TBD* |
| Dependencies | *TBD* |

## Behavioural Rules

- *Add project-specific rules here*
`
  },
  'research': {
    name: 'Research',
    icon: '\uD83D\uDD2C',
    description: 'Investigation or analysis',
    sections: `
## Scope

- *Define research boundaries here*

## Behavioural Rules

- *Add project-specific rules here*
`
  },
  'blank': {
    name: 'Blank',
    icon: '\uD83D\uDCC4',
    description: 'Empty starter',
    sections: ''
  }
};

function generateClaudeMd(projectName, templateKey) {
  const template = WIZARD_TEMPLATES[templateKey] || WIZARD_TEMPLATES['blank'];
  return `# CLAUDE.md — ${projectName}
*Derived from: docs/v1.0/${projectName}_concept_v1.0.md*

---

## Prime Directive

> "An assumption is the first step in a major cluster fuck." — Marine Corps

**Never assume. Always ask.** When in doubt about scope, intent, or next action — stop and ask. Do not proceed based on inference.

---

## What ${projectName} Is

*Describe the project here. Read the concept doc for the full specification.*

Read \`docs/v1.0/${projectName}_concept_v1.0.md\` before starting any task. It is the single source of truth.
${template.sections}
---

## Stage Gate Process

Development proceeds in defined stages. See \`docs/v1.0/${projectName}_tasklist_v1.0.md\` for the full breakdown.

- Each stage has a defined set of tasks
- Each stage ends with a Go/NoGo decision
- **Never begin Stage N+1 without an explicit Go**
`;
}

function generateConceptMd(projectName) {
  return `# ${projectName} — Concept Document
*Version: 1.0*

---

## The Problem

*What problem does this project solve? Why does it need to exist?*

---

## The Vision

*What does "done" look like? What is the end state?*

---

## Core Concepts

*Key architectural ideas, domain model, or design principles.*

---

## Tech Stack

*Technologies, libraries, infrastructure decisions.*

---

## Out of Scope

*What this project explicitly does NOT do.*

---

*End of concept document.*
`;
}

function generateTasklistMd(projectName) {
  return `# ${projectName} — Tasklist
*Derived from: docs/v1.0/${projectName}_concept_v1.0.md*
*Stage gate process: each stage ends with Go/NoGo before next stage begins*

---

## Stage 01 — *[Stage Name]*
**Focus:** *[What this stage achieves]*
**Goal:** *[What must be true when this stage is done]*

### Tasks
- [ ] *Task 1*
- [ ] *Task 2*
- [ ] *Task 3*

### Go/NoGo Gate
> *Gate question — what must be true to proceed?*

**→ GO:** Proceed to Stage 02
**→ NOGO:** Revise, re-evaluate — do not proceed

---

*"An assumption is the first step in a major cluster fuck." — Keep it sharp.*
`;
}

function generateImportClaudeMd(projectName, version) {
  const majorMinor = version.split('.').slice(0, 2).join('.');
  const vFolder = `v${majorMinor}`;
  return `# CLAUDE.md — ${projectName}
*Derived from: docs/${vFolder}/${projectName}_concept_v${majorMinor}.md*

---

## Prime Directive

> "An assumption is the first step in a major cluster fuck." — Marine Corps

**Never assume. Always ask.** When in doubt about scope, intent, or next action — stop and ask. Do not proceed based on inference.

---

## What ${projectName} Is

*Describe the project here. Read the concept doc for the full specification.*

Read \`docs/${vFolder}/${projectName}_concept_v${majorMinor}.md\` before starting any task. It is the single source of truth.

---

## Stage Gate Process

Development proceeds in defined stages. See \`docs/${vFolder}/${projectName}_tasklist_v${majorMinor}.md\` for the full breakdown.

- Each stage has a defined set of tasks
- Each stage ends with a Go/NoGo decision
- **Never begin Stage N+1 without an explicit Go**
`;
}

function generateImportConceptMd(projectName, version) {
  const majorMinor = version.split('.').slice(0, 2).join('.');
  return `<!-- CCC_TEMPLATE: Run /evaluate-import to populate this document -->
# ${projectName} — Concept Document
*Version: ${majorMinor}*

---

## The Problem

*What problem does this project solve? Why does it need to exist?*

---

## The Vision

*What does "done" look like? What is the end state?*

---

## Core Concepts

*Key architectural ideas, domain model, or design principles.*

---

## Tech Stack

*Technologies, libraries, infrastructure decisions.*

---

## Out of Scope

*What this project explicitly does NOT do.*

---

*End of concept document.*
`;
}

function generateImportTasklistMd(projectName, version) {
  const majorMinor = version.split('.').slice(0, 2).join('.');
  const vFolder = `v${majorMinor}`;
  return `# ${projectName} — Tasklist
*Derived from: docs/${vFolder}/${projectName}_concept_v${majorMinor}.md*
*Stage gate process: each stage ends with Go/NoGo before next stage begins*

---

## Stage 01 — *[Stage Name]*
**Focus:** *[What this stage achieves]*
**Goal:** *[What must be true when this stage is done]*

### Tasks
- [ ] *Task 1*
- [ ] *Task 2*
- [ ] *Task 3*

### Go/NoGo Gate
> *Gate question — what must be true to proceed?*

**→ GO:** Proceed to Stage 02
**→ NOGO:** Revise, re-evaluate — do not proceed

---

*"An assumption is the first step in a major cluster fuck." — Keep it sharp.*
`;
}

function generateSlashCommand(type) {
  const commands = {
    'start-stage': `Begin a new stage. Reads the kickoff prompt and executes it.

Instructions:
1. Read CLAUDE.md to refresh project identity, stack, and standing rules
2. Read the tasklist to confirm the current stage number and that the previous stage has a Go
3. Look for the stage kickoff prompt: \`docs/handoff/stage{XX}-prompt.md\`
   - If it exists: read it completely. This is your approved plan. Begin executing immediately.
   - If it does not exist: STOP. Inform the developer: "No kickoff prompt found for Stage {XX}. Cowork needs to produce this before I can start."
4. Execute all tasks in the kickoff prompt autonomously. Work through them one by one without asking for permission at each step.
5. Only stop and ask when you encounter genuine ambiguity — something the kickoff prompt doesn't cover, contradicts itself, or where a decision could go multiple ways.

The kickoff prompt IS the approval. Do NOT ask "shall I proceed?" or "can I start coding?" — just build what it says. When all tasks are complete, report what was built and present the acceptance criteria results.

IMPORTANT: You do NOT create your own stage plan. You do NOT interpret the concept doc to decide what to build. The kickoff prompt is the instruction. If it is missing, the stage cannot start.`,

    'continue': `Continue working on this project from where the last session left off.

Instructions:
1. Read CLAUDE.md to refresh project identity, stack, and standing rules
2. Read the tasklist to find the current stage and open tasks
3. Check for a stage kickoff prompt: \`docs/handoff/stage{XX}-prompt.md\` for the current stage
   - If it exists: this is your primary instruction document. Read it and begin executing.
   - If it does not exist: inform the developer and stop. Do NOT start without a kickoff prompt.
4. Check git log (last 10 commits) for recent progress
5. Brief status summary (keep it short), then begin working immediately on the next open task

The kickoff prompt is your approved plan. Execute it. Do NOT ask "shall I proceed?" or "can I start?" for each task. Work autonomously through all tasks in the current stage. Only stop and ask when you encounter genuine ambiguity — something the kickoff prompt doesn't cover or contradicts.

IMPORTANT: You do NOT interpret the concept doc to decide what to build. The kickoff prompt tells you exactly what to build. If the kickoff prompt is missing or ambiguous on a specific point, stop and ask about THAT point — then continue.`,

    'update-tasklist': `Update the project's tasklist with current progress.

Instructions:
1. Read the current tasklist file
2. For each task in the CURRENT STAGE ONLY, check whether it has been completed based on the codebase
3. Mark completed tasks with [x]
4. Update the stage status if all tasks in a stage are complete
5. Do NOT remove tasks — only update their status
6. Do NOT add new tasks or stages — the tasklist is owned by Cowork, not CC
7. Do NOT modify tasks in future stages
8. Present the changes for review before writing

IMPORTANT: The tasklist is created and maintained by Cowork. CC only updates completion status for tasks it has built. If you think a task is missing or wrong, inform the developer — do not modify the tasklist structure.`,

    'review-concept': `Review the current stage's kickoff prompt and concept document against the implementation and flag any drift.

Instructions:
1. Read the stage kickoff prompt (\`docs/handoff/stage{XX}-prompt.md\`) for the current stage
2. Read the concept document for reference
3. Compare the kickoff prompt's requirements against what has actually been built
4. Flag any deviations: features built that aren't in the kickoff prompt, or kickoff items that haven't been addressed
5. Flag any scope creep — anything built that the kickoff prompt explicitly said NOT to build
6. Present findings as a structured summary

IMPORTANT: The kickoff prompt is the primary instruction. The concept doc is background context. Drift is measured against the kickoff prompt, not the concept doc.`,

    'status': `Give a brief project status update.

Instructions:
1. Read the tasklist to determine the current stage
2. Count completed vs remaining tasks in the current stage
3. Note any blockers or open questions
4. Format as:
   - **Stage:** [current stage name and number]
   - **Done:** [count] / [total] tasks
   - **Remaining:** [list of incomplete tasks]
   - **Blockers:** [any blockers, or "None"]`,

    'create-tasklist': `DEPRECATED — CC does not create tasklists.

Tasklists are created and maintained by Cowork (the concept/architecture session). CC only executes stages defined in the tasklist and marks tasks complete.

If this project has no tasklist, inform the developer:
"No tasklist found. The tasklist needs to be created in a Cowork session before CC can start building."

Do NOT generate a tasklist from the concept doc. Do NOT create your own stage breakdown.`,

    'eod': `Wrap up the current working session with an end-of-day summary.

Instructions:
1. Read git log for today's commits (use --since="midnight" or last 24h)
2. Read the tasklist and note what moved from open to done today
3. Note any files that were changed but not yet committed
4. Summarise:
   - **Done today:** bullet list of completed work
   - **In progress:** anything started but not finished
   - **Blockers:** issues that need resolution
   - **Tomorrow:** suggested next steps
5. If there are uncommitted changes, ask whether to commit them`,

    'test': `Run the project's test suite and verify the build.

Instructions:
1. Check package.json (or equivalent) for available test/build scripts
2. Run the test suite (npm test, pytest, etc.) and capture output
3. Run the build/compile step if applicable
4. Run any linting or type-checking configured in the project
5. Summarise:
   - **Tests:** pass/fail count, any failures with file + line
   - **Build:** success or error summary
   - **Lint:** clean or list of issues
6. If all green, confirm the project is healthy
7. If failures, suggest fixes for the top-priority issues`
  };
  return commands[type] || '';
}

function generateProjectMapMd(projectName, version) {
  const majorMinor = version.split('.').slice(0, 2).join('.');
  const vFolder = `v${majorMinor}`;
  return `# Project Map — ${projectName}

## Key Files
- \`CLAUDE.md\` — behavioural instructions for Claude Code
- \`docs/${vFolder}/${projectName}_concept_v${majorMinor}.md\` — active version concept
- \`docs/${vFolder}/${projectName}_tasklist_v${majorMinor}.md\` — active version tasklist

## Documentation
- \`docs/${vFolder}/\` — version-specific (concept, tasklist, test files)
- \`docs/discussion/\` — brainstorming and idea exploration
- \`docs/architecture/\` — system structure and component diagrams
- \`docs/spec/\` — implementation contracts
- \`docs/adr/\` — architectural decision records
- \`docs/context/\` — persistent project knowledge
- \`docs/handoff/\` — SHP and recovery file

## Source
- \`src/\` — application source code
- \`tests/\` — test files
- \`tools/\` — automation scripts
`;
}

// Scaffold a new project
app.post('/api/scaffold-project', async (req, res) => {
  const { name, parentDir, template, group, type } = req.body;

  // Validate name
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  const safeName = name.trim();
  const unsafeChars = /[\/\\:*?"<>|]/;
  if (unsafeChars.test(safeName)) {
    return res.status(400).json({ error: 'Project name contains invalid characters: / \\ : * ? " < > |' });
  }

  // Validate parentDir
  if (!parentDir || !parentDir.trim()) {
    return res.status(400).json({ error: 'Location is required' });
  }
  const resolvedParent = path.resolve(parentDir.trim());
  if (!fs.existsSync(resolvedParent)) {
    return res.status(400).json({ error: 'Location does not exist: ' + resolvedParent });
  }

  // Validate template
  if (!template || !WIZARD_TEMPLATES[template]) {
    return res.status(400).json({ error: 'Invalid template: ' + template });
  }

  // Validate group
  if (!group || !group.trim()) {
    return res.status(400).json({ error: 'Group is required' });
  }

  const projectDir = path.join(resolvedParent, safeName);

  // Check if directory already exists
  if (fs.existsSync(projectDir)) {
    return res.status(409).json({ error: 'A folder named "' + safeName + '" already exists at this location' });
  }

  try {
    // Create directory tree
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'docs', 'v1.0'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.claude', 'commands'), { recursive: true });

    // Create topic-based documentation folders
    const topicFolders = ['discussion', 'architecture', 'spec', 'adr', 'context', 'handoff'];
    for (const folder of topicFolders) {
      fs.mkdirSync(path.join(projectDir, 'docs', folder), { recursive: true });
    }

    // Write files
    const scaffoldedFiles = [];

    // CLAUDE.md
    const claudePath = path.join(projectDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, generateClaudeMd(safeName, template), 'utf8');
    scaffoldedFiles.push('CLAUDE.md');

    // PROJECT_MAP.md
    const projectMapPath = path.join(projectDir, 'PROJECT_MAP.md');
    fs.writeFileSync(projectMapPath, generateProjectMapMd(safeName, '1.0'), 'utf8');
    scaffoldedFiles.push('PROJECT_MAP.md');

    // Concept doc (versioned filename)
    const conceptPath = path.join(projectDir, 'docs', 'v1.0', safeName + '_concept_v1.0.md');
    fs.writeFileSync(conceptPath, generateConceptMd(safeName), 'utf8');
    scaffoldedFiles.push('docs/v1.0/' + safeName + '_concept_v1.0.md');

    // Tasklist (versioned filename)
    const tasklistPath = path.join(projectDir, 'docs', 'v1.0', safeName + '_tasklist_v1.0.md');
    fs.writeFileSync(tasklistPath, generateTasklistMd(safeName), 'utf8');
    scaffoldedFiles.push('docs/v1.0/' + safeName + '_tasklist_v1.0.md');

    // Slash commands
    const slashCommands = ['start-stage', 'continue', 'update-tasklist', 'review-concept', 'status', 'create-tasklist', 'eod', 'test'];
    for (const cmd of slashCommands) {
      const cmdPath = path.join(projectDir, '.claude', 'commands', cmd + '.md');
      fs.writeFileSync(cmdPath, generateSlashCommand(cmd), 'utf8');
      scaffoldedFiles.push('.claude/commands/' + cmd + '.md');
    }

    // .ccc-project.json
    const cccMeta = {
      createdAt: new Date().toISOString(),
      template: template,
      cccVersion: '1.0'
    };
    fs.writeFileSync(path.join(projectDir, '.ccc-project.json'), JSON.stringify(cccMeta, null, 2) + '\n', 'utf8');
    scaffoldedFiles.push('.ccc-project.json');

    // Compute relative path if under projectRoot
    let projectPath = projectDir;
    try {
      const settingsData = readSettings();
      if (settingsData.projectRoot) {
        const root = path.resolve(settingsData.projectRoot);
        if (projectDir.startsWith(root + path.sep) || projectDir === root) {
          projectPath = path.relative(root, projectDir);
        }
      }
    } catch (e) {
      // Fall back to absolute path
    }

    // Register in projects registry
    const versionFolder = path.join('docs', 'v1.0');
    const project = await projects.addProject({
      name: safeName,
      path: projectPath,
      group: group.trim(),
      coreFiles: {
        claude: 'CLAUDE.md',
        concept: path.join(versionFolder, safeName + '_concept_v1.0.md'),
        tasklist: path.join(versionFolder, safeName + '_tasklist_v1.0.md')
      },
      type: type || 'code'
    });

    // Set activeVersion and mark as evaluated (scaffolded projects have all docs)
    await projects.updateProject(project.id, { activeVersion: '1.0', evaluated: true });

    res.status(201).json({
      project,
      scaffoldedFiles,
      projectDir
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to scaffold project: ' + err.message });
  }
});

// --- Scaffold Import ---

app.post('/api/scaffold-import', (req, res) => {
  const { absPath, projectName, version, existingConcept, existingTasklist } = req.body;

  if (!absPath || !projectName || !version) {
    return res.status(400).json({ error: 'absPath, projectName, and version are required' });
  }

  const resolved = path.resolve(absPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return res.status(400).json({ error: 'absPath must be an existing directory' });
  }

  try {
    const majorMinor = version.split('.').slice(0, 2).join('.');
    const vFolder = path.join('docs', `v${majorMinor}`);
    const absvFolder = path.join(resolved, vFolder);
    const scaffoldedFiles = [];

    // Create version folder if it doesn't exist
    if (!fs.existsSync(absvFolder)) {
      fs.mkdirSync(absvFolder, { recursive: true });
    }

    // Create topic-based documentation folders (non-destructive)
    const topicFolders = ['discussion', 'architecture', 'spec', 'adr', 'context', 'handoff'];
    for (const folder of topicFolders) {
      const topicDir = path.join(resolved, 'docs', folder);
      if (!fs.existsSync(topicDir)) {
        fs.mkdirSync(topicDir, { recursive: true });
      }
    }

    // Write concept doc if missing — skip if scan already found one anywhere in the project
    if (!existingConcept) {
      const conceptPath = path.join(absvFolder, projectName + '_concept_v' + majorMinor + '.md');
      if (!fs.existsSync(conceptPath)) {
        fs.writeFileSync(conceptPath, generateImportConceptMd(projectName, version), 'utf8');
        scaffoldedFiles.push(path.join(vFolder, projectName + '_concept_v' + majorMinor + '.md'));
      }
    }

    // Write tasklist if missing — skip if scan already found one anywhere in the project
    if (!existingTasklist) {
      const tasklistPath = path.join(absvFolder, projectName + '_tasklist_v' + majorMinor + '.md');
      if (!fs.existsSync(tasklistPath)) {
        fs.writeFileSync(tasklistPath, generateImportTasklistMd(projectName, version), 'utf8');
        scaffoldedFiles.push(path.join(vFolder, projectName + '_tasklist_v' + majorMinor + '.md'));
      }
    }

    // Write CLAUDE.md if missing
    const claudePath = path.join(resolved, 'CLAUDE.md');
    if (!fs.existsSync(claudePath)) {
      fs.writeFileSync(claudePath, generateImportClaudeMd(projectName, version), 'utf8');
      scaffoldedFiles.push('CLAUDE.md');
    }

    // Write PROJECT_MAP.md if missing
    const projectMapPath = path.join(resolved, 'PROJECT_MAP.md');
    if (!fs.existsSync(projectMapPath)) {
      fs.writeFileSync(projectMapPath, generateProjectMapMd(projectName, version), 'utf8');
      scaffoldedFiles.push('PROJECT_MAP.md');
    }

    // Create .claude/commands/ with slash commands — per-file checks
    const commandsDir = path.join(resolved, '.claude', 'commands');
    if (!fs.existsSync(commandsDir)) {
      fs.mkdirSync(commandsDir, { recursive: true });
    }
    const slashCommands = ['start-stage', 'continue', 'update-tasklist', 'review-concept', 'status', 'create-tasklist', 'eod', 'test'];
    for (const cmd of slashCommands) {
      const cmdPath = path.join(commandsDir, cmd + '.md');
      if (!fs.existsSync(cmdPath)) {
        fs.writeFileSync(cmdPath, generateSlashCommand(cmd), 'utf8');
        scaffoldedFiles.push('.claude/commands/' + cmd + '.md');
      }
    }

    // Create .ccc-project.json if missing
    const cccMetaPath = path.join(resolved, '.ccc-project.json');
    if (!fs.existsSync(cccMetaPath)) {
      const cccMeta = {
        createdAt: new Date().toISOString(),
        template: 'import',
        cccVersion: '1.0'
      };
      fs.writeFileSync(cccMetaPath, JSON.stringify(cccMeta, null, 2) + '\n', 'utf8');
      scaffoldedFiles.push('.ccc-project.json');
    }

    res.json({ scaffoldedFiles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to scaffold import: ' + err.message });
  }
});

// --- Preflight Check ---

app.get('/api/preflight', (req, res) => {
  const { execFile } = require('child_process');
  const referralUrl = process.env.CLAUDE_REFERRAL_URL || 'https://claude.ai';

  execFile('claude', ['--version'], { timeout: 10000, shell: true }, (err, stdout) => {
    if (err) {
      return res.json({ claudeInstalled: false, claudeVersion: null, referralUrl });
    }
    const version = stdout.trim();
    res.json({ claudeInstalled: true, claudeVersion: version, referralUrl });
  });
});

// --- Version / Build Info ---

const APP_VERSION = require('./package.json').version;
let appBuild = null;

// Count total commits in the repo at startup (non-blocking)
const { execFile: execFileCb } = require('child_process');
execFileCb('git', ['rev-list', '--count', 'HEAD'], { cwd: __dirname }, (err, stdout) => {
  if (!err && stdout) {
    appBuild = stdout.trim();
  }
});

app.get('/api/version', (req, res) => {
  res.json({ version: APP_VERSION, build: appBuild });
});

// --- Scan / Import API ---

// Scan an existing project directory for core files
app.post('/api/scan-project', (req, res) => {
  const { dirPath } = req.body;
  if (!dirPath || !dirPath.trim()) {
    return res.status(400).json({ error: 'dirPath is required' });
  }

  try {
    const absPath = path.resolve(dirPath.trim());

    if (!fs.existsSync(absPath)) {
      return res.status(400).json({ valid: false, reason: 'not_found', message: 'Directory does not exist.' });
    }
    const stat = fs.statSync(absPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ valid: false, reason: 'not_directory', message: 'Path is not a directory.' });
    }

    const folderName = path.basename(absPath);

    // 1. Check CLAUDE.md
    const claudePath = path.join(absPath, 'CLAUDE.md');
    const claudeFound = fs.existsSync(claudePath);

    // 2. Search for *_concept.md
    const conceptMatches = [];
    const searchDirs = [];

    // Versioned dirs: docs/vX.Y/
    const docsDir = path.join(absPath, 'docs');
    if (fs.existsSync(docsDir) && fs.statSync(docsDir).isDirectory()) {
      const docsEntries = fs.readdirSync(docsDir, { withFileTypes: true });
      for (const entry of docsEntries) {
        if (entry.isDirectory() && /^v\d+\.\d+$/.test(entry.name)) {
          searchDirs.push({ dir: path.join(docsDir, entry.name), rel: path.join('docs', entry.name) });
        }
      }
      // Also search docs/ itself (flat structure)
      searchDirs.push({ dir: docsDir, rel: 'docs' });
    }
    // Also search project root
    searchDirs.push({ dir: absPath, rel: '' });

    for (const { dir, rel } of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('_concept.md')) {
          const fullFile = path.join(dir, file);
          if (fs.statSync(fullFile).isFile()) {
            conceptMatches.push(rel ? path.join(rel, file) : file);
          }
        }
      }
    }

    // 3. Search for *_tasklist.md in same locations
    const tasklistMatches = [];
    for (const { dir, rel } of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('_tasklist.md')) {
          const fullFile = path.join(dir, file);
          if (fs.statSync(fullFile).isFile()) {
            tasklistMatches.push(rel ? path.join(rel, file) : file);
          }
        }
      }
    }

    // 4. Version structure detection via scanVersions
    const versionData = versions.scanVersions(absPath, folderName);

    // 5. Compute registrationPath (relative to projectRoot if applicable)
    let registrationPath = absPath;
    try {
      const settingsData = readSettings();
      if (settingsData.projectRoot) {
        const root = path.resolve(settingsData.projectRoot);
        if (absPath.startsWith(root + path.sep) || absPath === root) {
          registrationPath = path.relative(root, absPath);
        }
      }
    } catch (e) {
      // Fall back to absolute path
    }

    // Pick best concept match (prefer versioned over flat over root)
    const conceptFound = conceptMatches.length > 0;
    const bestConcept = conceptFound ? conceptMatches[0] : null;
    const bestTasklist = tasklistMatches.length > 0 ? tasklistMatches[0] : null;

    // Determine suggested active version from versioned docs
    let suggestedActiveVersion = null;
    if (versionData.versions.length > 0) {
      suggestedActiveVersion = versionData.versions[versionData.versions.length - 1].version;
    }

    res.json({
      valid: true,
      absPath,
      registrationPath,
      folderName,
      detected: {
        claude: { found: claudeFound, path: claudeFound ? 'CLAUDE.md' : null },
        concept: {
          found: conceptFound,
          path: bestConcept,
          ambiguous: conceptMatches.length > 1,
          allMatches: conceptMatches
        },
        tasklist: {
          found: tasklistMatches.length > 0,
          path: bestTasklist,
          ambiguous: tasklistMatches.length > 1,
          allMatches: tasklistMatches
        }
      },
      versioning: {
        hasVersionedDocs: versionData.versions.length > 0,
        hasFlatDocs: versionData.hasFlatDocs,
        suggestedActiveVersion
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to scan project: ' + err.message });
  }
});

// --- Session API ---

// Start a session for a project
app.post('/api/sessions/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { command } = req.body; // 'claude' or 'shell'

  const project = (await projects.getAllProjects()).projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const projectPath = await projects.resolveProjectPath(project.path);

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

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nError: Port ${PORT} is already in use.`);
    console.error(`Another instance of CCC may be running, or another service is using this port.`);
    console.error(`To fix: stop the other process, or set a different port in .env (PORT=3001)\n`);
    process.exit(1);
  }
  throw err;
});

// --- Usage Status Bar: REST endpoint + periodic scanner ---

app.get('/api/usage', async (req, res) => {
  try {
    const settings = readSettings();
    const plan = settings.usagePlan || 'max5';
    const tokenBudget = settings.tokenBudget5h || 1000000;
    const usage = await scanUsage(plan, tokenBudget);
    if (!usage) return res.json({ error: 'No usage data available' });
    const weekly = await scanWeeklyUsage();
    if (weekly) Object.assign(usage, weekly);
    usage.weeklyTokenBudget = settings.weeklyTokenBudget || 20000000;
    usage.weeklyMessageBudget = settings.weeklyMessageBudget || 45000;
    res.json(usage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Broadcast usage to all WS clients every 30 seconds
setInterval(async () => {
  try {
    if (wss.clients.size === 0) return;
    const settings = readSettings();
    const plan = settings.usagePlan || 'max5';
    const tokenBudget = settings.tokenBudget5h || 1000000;
    const usage = await scanUsage(plan, tokenBudget);
    if (!usage) return;
    const weekly = await scanWeeklyUsage();
    if (weekly) Object.assign(usage, weekly);
    usage.weeklyTokenBudget = settings.weeklyTokenBudget || 20000000;
    usage.weeklyMessageBudget = settings.weeklyMessageBudget || 45000;
    const json = JSON.stringify({ type: 'usage', usage });
    wss.clients.forEach(ws => {
      if (ws.readyState === 1) {
        ws.send(json);
      }
    });
  } catch (e) {
    // Silent — usage scanning is optional
  }
}, 30000);

// --- Startup Migration: ensure topic folders + evaluated flag for all registered projects ---
(async function startupMigration() {
  const TOPIC_FOLDERS = ['discussion', 'architecture', 'spec', 'adr', 'context', 'handoff'];
  try {
    const registry = await projects.getAllProjects();
    for (const proj of registry.projects) {
      const absPath = await projects.resolveProjectPath(proj.path);
      const docsDir = path.join(absPath, 'docs');
      if (!fs.existsSync(docsDir)) continue;

      // Ensure topic folders exist
      for (const folder of TOPIC_FOLDERS) {
        const folderPath = path.join(docsDir, folder);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
      }

      // Backfill evaluated flag for projects that pre-date the flag
      if (proj.evaluated === undefined) {
        await projects.updateProject(proj.id, { evaluated: true });
      }

      // Backfill type field for projects that pre-date the field
      if (proj.type === undefined) {
        await projects.updateProject(proj.id, { type: 'code' });
      }
    }
  } catch (e) {
    // Non-fatal — migration is best-effort
  }
})();

server.listen(PORT, () => {
  console.log(`CCC running on http://localhost:${PORT}`);
});
