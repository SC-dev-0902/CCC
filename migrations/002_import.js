#!/usr/bin/env node
// CCC v1.1 - Stage 03b: seed projects.json + settings.json into MariaDB.
// Run from the CCC project root: `node migrations/002_import.js`.
// Idempotent: re-running is safe (INSERT IGNORE for projects/core_files,
// ON DUPLICATE KEY UPDATE for settings).
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const { transaction } = require('../src/db.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const CORE_FILE_KEYS = ['claude', 'concept', 'tasklist'];

const SETTINGS_KEY_MAP = {
  projectRoot: 'project_root',
  editor: 'editor',
  shell: 'shell',
  theme: 'theme',
  githubToken: 'github_token',
  forgejoToken: 'forgejo_token',
};

function readJson(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Required input file not found: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function main() {
  const projectsData = readJson(PROJECTS_FILE);
  const settingsData = readJson(SETTINGS_FILE);
  const projects = Array.isArray(projectsData.projects) ? projectsData.projects : [];

  const counts = {
    projectsInserted: 0,
    projectsSkipped: 0,
    coreFilesInserted: 0,
    coreFilesSkipped: 0,
    settingsWritten: 0,
  };

  await transaction(async (conn) => {
    for (const p of projects) {
      const projectRow = [
        p.id,
        p.name,
        p.path,
        p.group || null,
        Number.isInteger(p.order) ? p.order : 0,
        p.type || 'code',
        p.activeVersion || null,
        p.evaluated === true,
      ];

      const res = await conn.query(
        `INSERT IGNORE INTO projects
           (id, name, path, parent_id, group_name, sort_order, type, active_version, evaluated)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
        projectRow
      );
      if (Number(res.affectedRows) > 0) counts.projectsInserted++;
      else counts.projectsSkipped++;

      const coreFiles = p.coreFiles || {};
      for (const key of CORE_FILE_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(coreFiles, key)) continue;
        const cfRes = await conn.query(
          `INSERT IGNORE INTO project_core_files (project_id, file_type, file_path)
           VALUES (?, ?, ?)`,
          [p.id, key, coreFiles[key]]
        );
        if (Number(cfRes.affectedRows) > 0) counts.coreFilesInserted++;
        else counts.coreFilesSkipped++;
      }
    }

    for (const [jsonKey, dbKey] of Object.entries(SETTINGS_KEY_MAP)) {
      if (!Object.prototype.hasOwnProperty.call(settingsData, jsonKey)) continue;
      const value = settingsData[jsonKey];
      if (value === null || value === undefined) continue;
      const valueStr = typeof value === 'string' ? value : String(value);
      await conn.query(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
        [dbKey, valueStr]
      );
      counts.settingsWritten++;
    }

    if (settingsData.filePatterns && typeof settingsData.filePatterns === 'object') {
      await conn.query(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
        ['file_patterns', JSON.stringify(settingsData.filePatterns)]
      );
      counts.settingsWritten++;
    }
  });

  console.log('Import complete.');
  console.log(`  Projects inserted: ${counts.projectsInserted}  (skipped: ${counts.projectsSkipped})`);
  console.log(`  Core files inserted: ${counts.coreFilesInserted}  (skipped: ${counts.coreFilesSkipped})`);
  console.log(`  Settings rows written: ${counts.settingsWritten}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Import failed:', err && err.message ? err.message : err);
  if (err && err.stack) console.error(err.stack);
  process.exit(1);
});
