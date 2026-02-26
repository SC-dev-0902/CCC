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

// --- Settings Helper ---

const SETTINGS_DEFAULTS = {
  projectRoot: '',
  editor: 'open',
  shell: '',
  theme: 'dark',
  filePatterns: { concept: 'docs/{PROJECT}_concept.md', tasklist: 'docs/{PROJECT}_tasklist.md' },
  githubToken: ''
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
    const deleteFiles = req.query.deleteFiles === 'true';

    // Resolve path before removing from registry
    let absPath = null;
    if (deleteFiles) {
      const project = projects.getAllProjects().projects.find(p => p.id === req.params.id);
      if (project) {
        absPath = projects.resolveProjectPath(project.path);
      }
    }

    const removed = projects.removeProject(req.params.id);
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
app.get('/api/file/:projectId', (req, res) => {
  const { projectId } = req.params;
  const { filePath } = req.query;

  if (!filePath) return res.status(400).json({ error: 'filePath query parameter required' });

  const project = projects.getAllProjects().projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const projectPath = projects.resolveProjectPath(project.path);

  if (!fs.existsSync(projectPath)) {
    return res.status(400).json({ error: 'Project directory does not exist: ' + project.path });
  }

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
    const settings = readSettings();
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
*Derived from: docs/v1.0/${projectName}_concept.md*

---

## Prime Directive

> "An assumption is the first step in a major cluster fuck." — Marine Corps

**Never assume. Always ask.** When in doubt about scope, intent, or next action — stop and ask. Do not proceed based on inference.

---

## What ${projectName} Is

*Describe the project here. Read the concept doc for the full specification.*

Read \`docs/v1.0/${projectName}_concept.md\` before starting any task. It is the single source of truth.
${template.sections}
---

## Stage Gate Process

Development proceeds in defined stages. See \`docs/v1.0/${projectName}_tasklist.md\` for the full breakdown.

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
*Derived from: docs/v1.0/${projectName}_concept.md*
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
    'update-tasklist': `Update the project's tasklist with current progress.

Instructions:
1. Read the current tasklist file
2. For each task, check whether it has been completed based on the codebase
3. Mark completed tasks with [x]
4. Add any new tasks that have emerged during implementation
5. Update the stage status if all tasks in a stage are complete
6. Do NOT remove tasks — only update their status
7. Present the changes for review before writing`,

    'review-concept': `Review the concept document against the current implementation and flag any drift.

Instructions:
1. Read the concept document
2. Compare stated goals, architecture, and scope against what has actually been built
3. Flag any deviations: features added that aren't in the concept, or concept items that haven't been addressed
4. Flag any scope creep or missing items
5. Present findings as a structured summary`,

    'status': `Give a brief project status update.

Instructions:
1. Read the tasklist to determine the current stage
2. Count completed vs remaining tasks in the current stage
3. Note any blockers or open questions
4. Format as:
   - **Stage:** [current stage name and number]
   - **Done:** [count] / [total] tasks
   - **Remaining:** [list of incomplete tasks]
   - **Blockers:** [any blockers, or "None"]`
  };
  return commands[type] || '';
}

// Scaffold a new project
app.post('/api/scaffold-project', (req, res) => {
  const { name, parentDir, template, group } = req.body;

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

    // Write files
    const scaffoldedFiles = [];

    // CLAUDE.md
    const claudePath = path.join(projectDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, generateClaudeMd(safeName, template), 'utf8');
    scaffoldedFiles.push('CLAUDE.md');

    // Concept doc
    const conceptPath = path.join(projectDir, 'docs', 'v1.0', safeName + '_concept.md');
    fs.writeFileSync(conceptPath, generateConceptMd(safeName), 'utf8');
    scaffoldedFiles.push('docs/v1.0/' + safeName + '_concept.md');

    // Tasklist
    const tasklistPath = path.join(projectDir, 'docs', 'v1.0', safeName + '_tasklist.md');
    fs.writeFileSync(tasklistPath, generateTasklistMd(safeName), 'utf8');
    scaffoldedFiles.push('docs/v1.0/' + safeName + '_tasklist.md');

    // Slash commands
    const slashCommands = ['update-tasklist', 'review-concept', 'status'];
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

    // Register in projects.json
    const versionFolder = path.join('docs', 'v1.0');
    const project = projects.addProject({
      name: safeName,
      path: projectPath,
      group: group.trim(),
      coreFiles: {
        claude: 'CLAUDE.md',
        concept: path.join(versionFolder, safeName + '_concept.md'),
        tasklist: path.join(versionFolder, safeName + '_tasklist.md')
      }
    });

    // Set activeVersion
    projects.updateProject(project.id, { activeVersion: '1.0' });

    res.status(201).json({
      project,
      scaffoldedFiles,
      projectDir
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to scaffold project: ' + err.message });
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

// Extract highest stage number from commit messages at startup (non-blocking)
const { execFile: execFileCb } = require('child_process');
execFileCb('git', ['log', '--oneline', '--grep=^Stage', '--all'], { cwd: __dirname }, (err, stdout) => {
  if (!err && stdout) {
    const match = stdout.trim().split('\n')[0].match(/Stage\s+0*(\d+)/);
    if (match) appBuild = match[1];
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

    // Hard gate: no concept doc
    if (conceptMatches.length === 0) {
      return res.json({
        valid: false,
        reason: 'no_concept_doc',
        message: 'No concept document found. CCC requires a concept doc before importing. Use Claude.ai to create one from your project idea, then try again.'
      });
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
    const bestConcept = conceptMatches[0];
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
          found: true,
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

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nError: Port ${PORT} is already in use.`);
    console.error(`Another instance of CCC may be running, or another service is using this port.`);
    console.error(`To fix: stop the other process, or set a different port in .env (PORT=3001)\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`CCC running on http://localhost:${PORT}`);
});
