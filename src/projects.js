const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const PROTECTED_GROUPS = ['Active', 'Parked'];

// ---------------------------- helpers ----------------------------

function emptyCoreFiles() {
  return { claude: 'CLAUDE.md', concept: '', tasklist: '' };
}

function rowsToProject(rows) {
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  const coreFiles = emptyCoreFiles();
  for (const row of rows) {
    if (row.file_type) coreFiles[row.file_type] = row.file_path;
  }
  return {
    id: r.id,
    name: r.name,
    path: r.path,
    group: r.group_name,
    order: r.sort_order,
    coreFiles,
    type: r.type,
    evaluated: !!r.evaluated,
    activeVersion: r.active_version || null,
    parentId:      r.parent_id       || null,
    lockUserId:    r.lock_user_id    || null,
    lockSessionId: r.lock_session_id || null,
    subProjects:   []
  };
}

async function fetchProjectById(id) {
  const rows = await db.query(
    `SELECT p.id, p.name, p.path, p.group_name, p.sort_order,
            p.type, p.active_version, p.evaluated,
            p.parent_id, p.lock_user_id, p.lock_session_id,
            pcf.file_type, pcf.file_path
       FROM projects p
       LEFT JOIN project_core_files pcf ON p.id = pcf.project_id
      WHERE p.id = ?`,
    [id]
  );
  return rowsToProject(rows);
}

async function buildGroupsArray() {
  // Distinct group names from top-level projects only.
  // Sub-projects have group_name = NULL and must not pollute the groups list.
  const projectGroupRows = await db.query(
    'SELECT group_name FROM projects WHERE parent_id IS NULL GROUP BY group_name ORDER BY MIN(sort_order) ASC'
  );
  // Empty groups recorded in settings (extra_group_<name>)
  const extraGroupRows = await db.query(
    "SELECT value FROM settings WHERE `key` LIKE 'extra_group_%'"
  );

  const ordered = [];
  for (const row of projectGroupRows) {
    if (!PROTECTED_GROUPS.includes(row.group_name) && !ordered.includes(row.group_name)) {
      ordered.push(row.group_name);
    }
  }
  for (const row of extraGroupRows) {
    if (!PROTECTED_GROUPS.includes(row.value) && !ordered.includes(row.value)) {
      ordered.push(row.value);
    }
  }

  const groups = [
    { name: 'Active', order: 0 },
    { name: 'Parked', order: 1 }
  ];
  let nextOrder = 2;
  for (const name of ordered) {
    groups.push({ name, order: nextOrder++ });
  }
  return groups;
}

// ---------------------------- public API ----------------------------

async function getAllProjects() {
  const rows = await db.query(
    `SELECT p.id, p.name, p.path, p.group_name, p.sort_order,
            p.type, p.active_version, p.evaluated,
            p.parent_id, p.lock_user_id, p.lock_session_id,
            pcf.file_type, pcf.file_path
       FROM projects p
       LEFT JOIN project_core_files pcf ON p.id = pcf.project_id
      ORDER BY p.sort_order ASC`
  );

  const byId = new Map();
  const orderById = [];
  for (const row of rows) {
    if (!byId.has(row.id)) {
      byId.set(row.id, [row]);
      orderById.push(row.id);
    } else {
      byId.get(row.id).push(row);
    }
  }

  const flat = orderById.map((id) => rowsToProject(byId.get(id)));

  // Tree builder: top-level entries (parentId === null) hold sub-projects in subProjects[].
  // Orphaned sub-projects (parent not found) fall back to top-level.
  const topLevelById = new Map();
  for (const p of flat) {
    if (p.parentId === null) topLevelById.set(p.id, p);
  }

  const projects = [];
  for (const p of flat) {
    if (p.parentId === null) {
      projects.push(p);
    } else {
      const parent = topLevelById.get(p.parentId);
      if (parent) {
        parent.subProjects.push(p);
      } else {
        projects.push(p);
      }
    }
  }

  const groups = await buildGroupsArray();
  return { groups, projects };
}

async function addProject({ name, path: projectPath, group, coreFiles, type, evaluated, parentId }) {
  const id = crypto.randomUUID();
  const finalType = type || 'code';
  const finalEvaluated = evaluated !== undefined ? (evaluated ? 1 : 0) : 1;
  const finalCoreFiles = coreFiles || emptyCoreFiles();
  const isSubProject = parentId !== undefined && parentId !== null;

  await db.transaction(async (conn) => {
    let sortOrder;
    if (isSubProject) {
      const countRows = await conn.query(
        'SELECT COUNT(*) AS c FROM projects WHERE parent_id = ?',
        [parentId]
      );
      sortOrder = Number(countRows[0].c);

      await conn.query(
        `INSERT INTO projects (id, name, path, group_name, sort_order, type, evaluated, parent_id)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
        [id, name, projectPath, sortOrder, finalType, finalEvaluated, parentId]
      );
    } else {
      const countRows = await conn.query(
        'SELECT COUNT(*) AS c FROM projects WHERE group_name = ?',
        [group]
      );
      sortOrder = Number(countRows[0].c);

      await conn.query(
        `INSERT INTO projects (id, name, path, group_name, sort_order, type, evaluated)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, name, projectPath, group, sortOrder, finalType, finalEvaluated]
      );
    }

    for (const [fileType, filePath] of Object.entries(finalCoreFiles)) {
      await conn.query(
        `INSERT INTO project_core_files (project_id, file_type, file_path)
         VALUES (?, ?, ?)`,
        [id, fileType, filePath]
      );
    }
  });

  return await fetchProjectById(id);
}

async function updateProject(id, updates) {
  const colMap = {
    name: 'name',
    group: 'group_name',
    activeVersion: 'active_version',
    evaluated: 'evaluated',
    type: 'type'
  };

  const setParts = [];
  const setValues = [];
  for (const [key, col] of Object.entries(colMap)) {
    if (updates[key] !== undefined) {
      setParts.push(`${col} = ?`);
      let val = updates[key];
      if (key === 'evaluated') val = val ? 1 : 0;
      setValues.push(val);
    }
  }

  const hasCoreFiles = updates.coreFiles && typeof updates.coreFiles === 'object';

  if (setParts.length === 0 && !hasCoreFiles) return null;

  const existing = await db.queryOne('SELECT id FROM projects WHERE id = ?', [id]);
  if (!existing) return null;

  await db.transaction(async (conn) => {
    if (setParts.length > 0) {
      await conn.query(
        `UPDATE projects SET ${setParts.join(', ')} WHERE id = ?`,
        [...setValues, id]
      );
    }
    if (hasCoreFiles) {
      for (const [fileType, filePath] of Object.entries(updates.coreFiles)) {
        await conn.query(
          `INSERT INTO project_core_files (project_id, file_type, file_path)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE file_path = VALUES(file_path)`,
          [id, fileType, filePath]
        );
      }
    }
  });

  return await fetchProjectById(id);
}

async function removeProject(id) {
  const result = await db.query('DELETE FROM projects WHERE id = ?', [id]);
  return Number(result.affectedRows || 0) > 0;
}

async function reorderProjects(orderedIds) {
  await db.transaction(async (conn) => {
    for (const entry of orderedIds) {
      await conn.query(
        'UPDATE projects SET group_name = ?, sort_order = ?, parent_id = ? WHERE id = ?',
        [entry.group, entry.order, entry.parentId ?? null, entry.id]
      );
    }
  });
  return await getAllProjects();
}

async function addGroup(name) {
  const countRows = await db.query(
    'SELECT COUNT(*) AS c FROM projects WHERE group_name = ?',
    [name]
  );
  if (Number(countRows[0].c) > 0) return null;
  if (PROTECTED_GROUPS.includes(name)) return null;

  const settingKey = `extra_group_${name}`;
  const existing = await db.queryOne(
    'SELECT `key` FROM settings WHERE `key` = ?',
    [settingKey]
  );
  if (existing) return null;

  await db.query(
    'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    [settingKey, name]
  );

  return await buildGroupsArray();
}

async function removeGroup(name) {
  const countRows = await db.query(
    'SELECT COUNT(*) AS c FROM projects WHERE group_name = ?',
    [name]
  );
  if (Number(countRows[0].c) > 0) {
    return { error: 'Group still has projects' };
  }

  const settingKey = `extra_group_${name}`;
  await db.query('DELETE FROM settings WHERE `key` = ?', [settingKey]);

  return await buildGroupsArray();
}

/**
 * Resolve a project's relative path to an absolute path.
 * Priority: absolute path > PROJECT_ROOT env var > settings.project_root in DB > raw path.
 * PROJECT_ROOT env var takes precedence over the DB value because the DB stores the
 * Mac path while .env on each machine sets the correct local PROJECT_ROOT.
 */
async function resolveProjectPath(projectPath) {
  if (path.isAbsolute(projectPath)) return projectPath;

  if (process.env.PROJECT_ROOT) {
    return path.join(process.env.PROJECT_ROOT, projectPath);
  }

  try {
    const row = await db.queryOne(
      "SELECT value FROM settings WHERE `key` = 'project_root'"
    );
    if (row && row.value) {
      return path.join(row.value, projectPath);
    }
  } catch (e) {
    // Fall through to raw path
  }

  return projectPath;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rename a project and propagate to all associated files.
 */
async function renameProject(id, newName) {
  const project = await fetchProjectById(id);
  if (!project) throw new Error('Project not found');

  const oldName = project.name;
  if (oldName === newName) return { project, renamedFiles: [], updatedContent: [] };

  const absPath = await resolveProjectPath(project.path);
  if (!fs.existsSync(absPath)) throw new Error('Project path does not exist');

  // Phase 1: Collect all file renames
  const renames = [];
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

  collectRenames(path.join(absPath, 'docs', 'handoff'));

  const docsDir = path.join(absPath, 'docs');
  collectRenames(docsDir);

  if (fs.existsSync(docsDir)) {
    const docEntries = fs.readdirSync(docsDir, { withFileTypes: true });
    for (const entry of docEntries) {
      if (!entry.isDirectory() || !/^v\d+\.\d+$/.test(entry.name)) continue;
      const versionDir = path.join(docsDir, entry.name);
      collectRenames(versionDir);

      const subEntries = fs.readdirSync(versionDir, { withFileTypes: true });
      for (const sub of subEntries) {
        if (!sub.isDirectory() || !/^v\d+\.\d+\.\d+$/.test(sub.name)) continue;
        collectRenames(path.join(versionDir, sub.name));
      }
    }
  }

  // Phase 2: Validate
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
    for (const r of completed.reverse()) {
      try { fs.renameSync(r.to, r.from); } catch (_) { /* best effort */ }
    }
    throw new Error('Folder rename failed, rolled back: ' + err.message);
  }

  const effectivePath = folderRenamed ? newAbsPath : absPath;

  // Phase 6: Update CLAUDE.md content
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

  // Phase 7: Update coreFiles paths in the in-memory project object
  if (project.coreFiles) {
    for (const key of Object.keys(project.coreFiles)) {
      if (typeof project.coreFiles[key] === 'string' && project.coreFiles[key].includes(oldName)) {
        project.coreFiles[key] = project.coreFiles[key].split(oldName).join(newName);
      }
    }
  }

  // Phase 8: Update project name, path
  project.name = newName;
  if (folderRenamed) {
    const oldBasename = path.basename(absPath);
    const pathParts = project.path.split(path.sep);
    const lastIdx = pathParts.lastIndexOf(oldBasename);
    if (lastIdx !== -1) {
      pathParts[lastIdx] = newFolderName;
      project.path = pathParts.join(path.sep);
    }
  }

  // Persist to DB
  await db.transaction(async (conn) => {
    await conn.query(
      'UPDATE projects SET name = ?, path = ? WHERE id = ?',
      [project.name, project.path, id]
    );
    for (const [fileType, filePath] of Object.entries(project.coreFiles)) {
      await conn.query(
        `INSERT INTO project_core_files (project_id, file_type, file_path)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE file_path = VALUES(file_path)`,
        [id, fileType, filePath]
      );
    }
  });

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
