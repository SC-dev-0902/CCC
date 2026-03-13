const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'projects.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_DATA = {
  groups: [
    { name: 'Active', order: 0 },
    { name: 'Parked', order: 1 }
  ],
  projects: []
};

/**
 * Resolve a project's relative path to an absolute path using settings.projectRoot.
 * If the path is already absolute, returns it as-is.
 */
function resolveProjectPath(projectPath) {
  if (path.isAbsolute(projectPath)) return projectPath;

  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    if (settings.projectRoot) {
      return path.join(settings.projectRoot, projectPath);
    }
  } catch (e) {
    // Fall back to raw path
  }
  return projectPath;
}

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    // First run or corrupted file — create defaults
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    writeData(DEFAULT_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const PROTECTED_GROUPS = ['Active', 'Parked'];

function pruneEmptyGroups(data) {
  const usedGroups = new Set(data.projects.map(p => p.group));
  data.groups = data.groups.filter(g => PROTECTED_GROUPS.includes(g.name) || usedGroups.has(g.name));
}

function getAllProjects() {
  return readData();
}

function addProject({ name, path: projectPath, group, coreFiles }) {
  const data = readData();

  // Ensure the group exists
  if (!data.groups.find(g => g.name === group)) {
    const maxOrder = data.groups.reduce((max, g) => Math.max(max, g.order), -1);
    data.groups.push({ name: group, order: maxOrder + 1 });
  }

  const id = crypto.randomUUID();

  // Determine order — append to end of group
  const groupProjects = data.projects.filter(p => p.group === group);
  const order = groupProjects.length;

  const project = {
    id,
    name,
    path: projectPath,
    group,
    order,
    coreFiles: coreFiles || {
      claude: 'CLAUDE.md',
      concept: '',
      tasklist: ''
    }
  };

  data.projects.push(project);
  writeData(data);
  return project;
}

function updateProject(id, updates) {
  const data = readData();
  const index = data.projects.findIndex(p => p.id === id);
  if (index === -1) return null;

  const allowed = ['name', 'group', 'coreFiles', 'activeVersion', 'evaluated'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      data.projects[index][key] = updates[key];
    }
  }

  pruneEmptyGroups(data);
  writeData(data);
  return data.projects[index];
}

function removeProject(id) {
  const data = readData();
  const index = data.projects.findIndex(p => p.id === id);
  if (index === -1) return false;

  data.projects.splice(index, 1);
  pruneEmptyGroups(data);
  writeData(data);
  return true;
}

function reorderProjects(orderedIds) {
  const data = readData();

  // orderedIds is an array of { id, group, order }
  for (const entry of orderedIds) {
    const project = data.projects.find(p => p.id === entry.id);
    if (project) {
      project.group = entry.group;
      project.order = entry.order;
    }
  }

  pruneEmptyGroups(data);
  writeData(data);
  return data;
}

function addGroup(name) {
  const data = readData();
  if (data.groups.find(g => g.name === name)) return null;

  const maxOrder = data.groups.reduce((max, g) => Math.max(max, g.order), -1);
  data.groups.push({ name, order: maxOrder + 1 });
  writeData(data);
  return data.groups;
}

function removeGroup(name) {
  const data = readData();
  // Only remove if no projects belong to this group
  const hasProjects = data.projects.some(p => p.group === name);
  if (hasProjects) return { error: 'Group still has projects' };

  data.groups = data.groups.filter(g => g.name !== name);
  writeData(data);
  return data.groups;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rename a project and propagate to all associated files.
 * Renames files matching {oldName}_ pattern in docs/, docs/handoff/, and version folders.
 * Updates coreFiles paths in projects.json.
 * Updates internal references in CLAUDE.md.
 * Returns { project, renamedFiles[], updatedContent[] } on success.
 * Rolls back file renames on failure.
 */
function renameProject(id, newName) {
  const data = readData();
  const project = data.projects.find(p => p.id === id);
  if (!project) throw new Error('Project not found');

  const oldName = project.name;
  if (oldName === newName) return { project, renamedFiles: [], updatedContent: [] };

  const absPath = resolveProjectPath(project.path);
  if (!fs.existsSync(absPath)) throw new Error('Project path does not exist');

  // Phase 1: Collect all file renames
  const renames = []; // { from: absPath, to: absPath }
  const namePattern = new RegExp('^' + escapeRegex(oldName) + '_');

  function collectRenames(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      if (fs.statSync(fullPath).isFile() && namePattern.test(entry)) {
        const newEntry = entry.replace(namePattern, newName + '_');
        renames.push({ from: fullPath, to: path.join(dirPath, newEntry) });
      }
    }
  }

  // Scan docs/handoff/
  collectRenames(path.join(absPath, 'docs', 'handoff'));

  // Scan docs/ (legacy flat files)
  const docsDir = path.join(absPath, 'docs');
  collectRenames(docsDir);

  // Scan version folders: docs/vX.Y/ and patch subfolders docs/vX.Y/vX.Y.Z/
  if (fs.existsSync(docsDir)) {
    const docEntries = fs.readdirSync(docsDir, { withFileTypes: true });
    for (const entry of docEntries) {
      if (!entry.isDirectory() || !/^v\d+\.\d+$/.test(entry.name)) continue;
      const versionDir = path.join(docsDir, entry.name);
      collectRenames(versionDir);

      // Patch subdirectories
      const subEntries = fs.readdirSync(versionDir, { withFileTypes: true });
      for (const sub of subEntries) {
        if (!sub.isDirectory() || !/^v\d+\.\d+\.\d+$/.test(sub.name)) continue;
        collectRenames(path.join(versionDir, sub.name));
      }
    }
  }

  // Phase 2: Validate — no target file already exists
  for (const r of renames) {
    if (fs.existsSync(r.to)) {
      throw new Error('Target file already exists: ' + path.relative(absPath, r.to));
    }
  }

  // Phase 3: Compute folder rename
  const parentDir = path.dirname(absPath);
  const newFolderName = newName;
  const newAbsPath = path.join(parentDir, newFolderName);
  let folderRenamed = false;

  // Validate folder target doesn't exist (unless it's the same path, e.g. case-only change on case-insensitive FS)
  if (absPath !== newAbsPath && fs.existsSync(newAbsPath)) {
    throw new Error('Target folder already exists: ' + newAbsPath);
  }

  // Phase 4: Execute file renames with rollback on failure
  const completed = [];
  try {
    for (const r of renames) {
      fs.renameSync(r.from, r.to);
      completed.push(r);
    }
  } catch (err) {
    for (const r of completed.reverse()) {
      try { fs.renameSync(r.to, r.from); } catch (_) { /* best effort */ }
    }
    throw new Error('Rename failed, rolled back: ' + err.message);
  }

  // Phase 5: Rename project folder
  try {
    if (absPath !== newAbsPath) {
      fs.renameSync(absPath, newAbsPath);
      folderRenamed = true;
    }
  } catch (err) {
    // Rollback file renames (now inside old folder, still at absPath since folder rename failed)
    for (const r of completed.reverse()) {
      try { fs.renameSync(r.to, r.from); } catch (_) { /* best effort */ }
    }
    throw new Error('Folder rename failed, rolled back: ' + err.message);
  }

  // From here on, project lives at newAbsPath
  const effectivePath = folderRenamed ? newAbsPath : absPath;

  // Phase 6: Update CLAUDE.md content (replace old name references)
  const updatedContent = [];
  const claudePath = path.join(effectivePath, 'CLAUDE.md');
  if (fs.existsSync(claudePath)) {
    const content = fs.readFileSync(claudePath, 'utf8');
    const updated = content.split(oldName).join(newName);
    if (updated !== content) {
      fs.writeFileSync(claudePath, updated, 'utf8');
      updatedContent.push('CLAUDE.md');
    }
  }

  // Phase 7: Update coreFiles paths in projects.json
  if (project.coreFiles) {
    for (const key of Object.keys(project.coreFiles)) {
      if (typeof project.coreFiles[key] === 'string' && project.coreFiles[key].includes(oldName)) {
        project.coreFiles[key] = project.coreFiles[key].split(oldName).join(newName);
      }
    }
  }

  // Phase 8: Update project name, path, and persist
  project.name = newName;
  if (folderRenamed) {
    // Update the relative path: replace the old basename with the new one
    const oldBasename = path.basename(absPath);
    const pathParts = project.path.split(path.sep);
    const lastIdx = pathParts.lastIndexOf(oldBasename);
    if (lastIdx !== -1) {
      pathParts[lastIdx] = newFolderName;
      project.path = pathParts.join(path.sep);
    }
  }
  writeData(data);

  return {
    project,
    folderRenamed: folderRenamed ? { from: path.basename(absPath), to: newFolderName } : null,
    renamedFiles: renames.map(r => ({
      from: path.relative(absPath, r.from),
      to: path.relative(absPath, r.to)
    })),
    updatedContent
  };
}

module.exports = {
  getAllProjects,
  addProject,
  updateProject,
  removeProject,
  reorderProjects,
  addGroup,
  removeGroup,
  resolveProjectPath,
  renameProject
};
