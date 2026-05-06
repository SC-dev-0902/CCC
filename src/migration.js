const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');
const { resolveProjectPath } = require('./projects');

const TO_BE_MIGRATED = 'To Be Migrated';
const SKIP_NAMES = new Set(['node_modules', '__pycache__', '.git']);

function v11SubdirsForVersion(version) {
  const v = `v${version}`;
  return [
    'docs',
    'docs/adr',
    'docs/architecture',
    'docs/discussion',
    'docs/handoff',
    'docs/context',
    'docs/spec',
    v,
    `${v}/docs`,
    `${v}/docs/adr`,
    `${v}/docs/architecture`,
    `${v}/docs/discussion`,
    `${v}/docs/handoff`,
    `${v}/docs/context`,
    `${v}/docs/spec`,
    `${v}/docs/testfiles`
  ];
}

async function scanHomeFolder(projectRoot) {
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    throw new Error('projectRoot does not exist or is not a directory: ' + projectRoot);
  }

  const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    if (SKIP_NAMES.has(entry.name)) continue;
    candidates.push(entry.name);
  }

  const existingRows = await db.query('SELECT path FROM projects');
  const existingPaths = new Set(existingRows.map(r => r.path));

  let added = 0;
  for (const name of candidates) {
    const absPath = path.join(projectRoot, name);
    const relPath = path.relative(projectRoot, absPath);
    if (existingPaths.has(relPath) || existingPaths.has(absPath)) continue;

    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO projects
         (id, name, path, group_name, sort_order, type, evaluated, parent_id, active_version)
       VALUES (?, ?, ?, ?, 0, 'code', 0, NULL, NULL)`,
      [id, name, relPath, TO_BE_MIGRATED]
    );
    existingPaths.add(relPath);
    added++;
  }

  return { added };
}

async function loadProjectRow(projectId) {
  const row = await db.queryOne(
    `SELECT id, name, path, group_name, active_version
       FROM projects WHERE id = ?`,
    [projectId]
  );
  return row || null;
}

async function previewMigration(projectId) {
  const row = await loadProjectRow(projectId);
  if (!row) return null;

  const rootPath = await resolveProjectPath(row.path);
  const version = row.active_version || '1.0';

  const subdirs = v11SubdirsForVersion(version);
  const toCreate = [];
  for (const rel of subdirs) {
    const abs = path.join(rootPath, rel);
    if (!fs.existsSync(abs)) toCreate.push(rel);
  }
  const claudeAbs = path.join(rootPath, 'CLAUDE.md');
  if (!fs.existsSync(claudeAbs)) toCreate.push('CLAUDE.md');

  return {
    projectName: row.name,
    rootPath,
    version,
    toCreate
  };
}

async function executeMigration(projectId, targetGroup, parentId, emitLine) {
  const preview = await previewMigration(projectId);
  if (!preview) throw new Error('Project not found: ' + projectId);

  const row = await loadProjectRow(projectId);
  const rootPath = preview.rootPath;
  const version = preview.version;

  if (!fs.existsSync(rootPath)) {
    fs.mkdirSync(rootPath, { recursive: true });
    emitLine('Creating project root: ' + rootPath);
  }

  for (const rel of preview.toCreate) {
    const abs = path.join(rootPath, rel);
    if (rel === 'CLAUDE.md') {
      fs.writeFileSync(abs, '# CLAUDE.md\n', 'utf8');
    } else {
      fs.mkdirSync(abs, { recursive: true });
    }
    emitLine('Creating ' + rel);
  }

  const markerPath = path.join(rootPath, '.ccc-project.json');
  const marker = {
    id: row.id,
    name: row.name,
    version,
    migratedAt: new Date().toISOString()
  };
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2) + '\n', 'utf8');
  emitLine('Writing .ccc-project.json');

  const finalParentId = parentId || null;
  const finalGroup = finalParentId ? null : (targetGroup || 'Active');

  let nextSortOrder = 0;
  if (finalParentId) {
    const r = await db.query(
      'SELECT COUNT(*) AS c FROM projects WHERE parent_id = ?',
      [finalParentId]
    );
    nextSortOrder = Number(r[0].c);
  } else {
    const r = await db.query(
      'SELECT COUNT(*) AS c FROM projects WHERE group_name = ? AND parent_id IS NULL',
      [finalGroup]
    );
    nextSortOrder = Number(r[0].c);
  }

  await db.query(
    `UPDATE projects
        SET group_name = ?, parent_id = ?, evaluated = 0,
            active_version = ?, sort_order = ?
      WHERE id = ?`,
    [finalGroup, finalParentId, version, nextSortOrder, projectId]
  );

  emitLine('Done');
}

module.exports = {
  scanHomeFolder,
  previewMigration,
  executeMigration,
  TO_BE_MIGRATED
};
