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

  const allowed = ['name', 'group', 'coreFiles', 'activeVersion'];
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

module.exports = {
  getAllProjects,
  addProject,
  updateProject,
  removeProject,
  reorderProjects,
  addGroup,
  removeGroup,
  resolveProjectPath
};
