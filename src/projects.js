const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'projects.json');

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
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

  const allowed = ['name', 'group', 'coreFiles'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      data.projects[index][key] = updates[key];
    }
  }

  writeData(data);
  return data.projects[index];
}

function removeProject(id) {
  const data = readData();
  const index = data.projects.findIndex(p => p.id === id);
  if (index === -1) return false;

  data.projects.splice(index, 1);
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
  removeGroup
};
