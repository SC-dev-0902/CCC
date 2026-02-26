const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

/**
 * Parse a version string like "1.0", "1.1", "1.1.1" into components.
 */
function parseVersionString(str) {
  const parts = str.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] !== undefined ? parts[2] : null
  };
}

/**
 * Get the relative folder path for a version within docs/.
 * "1.0" → "docs/v1.0"
 * "1.1.1" → "docs/v1.1/v1.1.1"
 */
function getVersionFolder(version) {
  const parsed = parseVersionString(version);
  if (parsed.patch !== null) {
    const parentMinor = `${parsed.major}.${parsed.minor}`;
    return path.join('docs', `v${parentMinor}`, `v${version}`);
  }
  return path.join('docs', `v${version}`);
}

/**
 * Detect whether a project has flat (non-versioned) docs.
 * Returns true if concept or tasklist files exist directly in docs/ (not in vX.Y/).
 */
function detectFlatDocs(projectAbsPath, projectName) {
  const docsDir = path.join(projectAbsPath, 'docs');
  if (!fs.existsSync(docsDir)) return false;

  const conceptFile = path.join(docsDir, `${projectName}_concept.md`);
  const tasklistFile = path.join(docsDir, `${projectName}_tasklist.md`);

  return fs.existsSync(conceptFile) || fs.existsSync(tasklistFile);
}

/**
 * Scan a project's docs/ directory for version folders.
 * Returns { versions: [...], hasFlatDocs: bool }
 */
function scanVersions(projectAbsPath, projectName) {
  const docsDir = path.join(projectAbsPath, 'docs');
  const result = {
    versions: [],
    hasFlatDocs: detectFlatDocs(projectAbsPath, projectName),
    flatTestFiles: []  // Legacy: test files in flat docs/ (not inside version folders)
  };

  if (!fs.existsSync(docsDir)) return result;

  // Scan for flat test files in docs/ (legacy backward compat)
  const allDocsFiles = fs.readdirSync(docsDir);
  const escapedName = projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const testPattern = new RegExp(`^${escapedName}_test_stage\\d+\\.md$`);
  for (const f of allDocsFiles) {
    if (testPattern.test(f) && fs.statSync(path.join(docsDir, f)).isFile()) {
      result.flatTestFiles.push(f);
    }
  }

  const entries = fs.readdirSync(docsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^v(\d+\.\d+)$/);
    if (!match) continue;

    const version = match[1];
    const versionDir = path.join(docsDir, entry.name);
    const parsed = parseVersionString(version);

    const scanned = scanVersionFiles(versionDir, projectName);

    const versionInfo = {
      version,
      type: parsed.minor === 0 ? 'major' : 'minor',
      folder: path.join('docs', entry.name),
      files: scanned.files,
      testFiles: scanned.testFiles,
      patches: []
    };

    // Scan for patch subdirectories (e.g. v1.1.1/)
    const subEntries = fs.readdirSync(versionDir, { withFileTypes: true });
    for (const sub of subEntries) {
      if (!sub.isDirectory()) continue;
      const patchMatch = sub.name.match(/^v(\d+\.\d+\.\d+)$/);
      if (!patchMatch) continue;

      const patchVersion = patchMatch[1];
      const patchDir = path.join(versionDir, sub.name);
      const patchScanned = scanVersionFiles(patchDir, projectName);

      versionInfo.patches.push({
        version: patchVersion,
        type: 'patch',
        folder: path.join('docs', entry.name, sub.name),
        files: patchScanned.files,
        testFiles: patchScanned.testFiles
      });
    }

    // Sort patches by version
    versionInfo.patches.sort((a, b) => compareVersions(a.version, b.version));

    result.versions.push(versionInfo);
  }

  // Sort versions by version number
  result.versions.sort((a, b) => compareVersions(a.version, b.version));

  return result;
}

/**
 * Scan a version directory for core files and test files.
 * Returns { files: string[], testFiles: string[] }
 * Test files match {projectName}_test_stage\d+\.md
 */
function scanVersionFiles(dirPath, projectName) {
  const result = { files: [], testFiles: [] };
  if (!fs.existsSync(dirPath)) return result;

  const escapedName = projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const testPattern = new RegExp(`^${escapedName}_test_stage\\d+\\.md$`);

  const entries = fs.readdirSync(dirPath);
  for (const name of entries) {
    const fullPath = path.join(dirPath, name);
    if (fs.statSync(fullPath).isFile() && name.endsWith('.md')) {
      if (testPattern.test(name)) {
        result.testFiles.push(name);
      } else {
        result.files.push(name);
      }
    }
  }
  return result;
}

/**
 * Compare two version strings for sorting.
 */
function compareVersions(a, b) {
  const pa = parseVersionString(a);
  const pb = parseVersionString(b);
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  const paPatch = pa.patch !== null ? pa.patch : -1;
  const pbPatch = pb.patch !== null ? pb.patch : -1;
  return paPatch - pbPatch;
}

/**
 * Create a new version folder with scaffolded templates.
 * type: 'major', 'minor', or 'patch'
 * previousConceptContent: optional string — if provided, seeds the new concept doc
 */
function createVersion(projectAbsPath, projectName, version, type, previousConceptContent) {
  const folder = getVersionFolder(version);
  const absFolder = path.join(projectAbsPath, folder);

  if (fs.existsSync(absFolder)) {
    throw new Error(`Version folder already exists: ${folder}`);
  }

  fs.mkdirSync(absFolder, { recursive: true });

  // Scaffold tasklist (always)
  const tasklistContent = `# ${projectName}_tasklist.md — v${version}\n*Derived from: ${projectName}_concept.md*\n*Stage gate process: each stage ends with Go/NoGo before next stage begins*\n\n---\n\n## Stage 01 — [Stage Name]\n**Focus:** [Description]\n\n### Tasks\n- [ ] Task 1\n\n### Go/NoGo Gate\n> [Gate question]\n\n**→ GO:** Proceed to Stage 02\n**→ NOGO:** Revise, re-evaluate\n\n---\n`;
  fs.writeFileSync(path.join(absFolder, `${projectName}_tasklist.md`), tasklistContent, 'utf8');

  // Scaffold concept doc (all version types — seeded from previous if available)
  let conceptContent;
  if (previousConceptContent) {
    conceptContent = previousConceptContent.replace(
      /\*\*Concept Document v[\d.]+\*\*/,
      `**Concept Document v${version}**`
    );
  } else {
    conceptContent = `# ${projectName}\n**Concept Document v${version}**\n\n---\n\n## Overview\n\n[Describe the goals and scope of this version]\n\n---\n\n## Changes from Previous Version\n\n[What's new or different in v${version}]\n\n---\n`;
  }
  fs.writeFileSync(path.join(absFolder, `${projectName}_concept.md`), conceptContent, 'utf8');

  return { folder, version, type };
}

/**
 * Migrate flat docs into a versioned folder structure.
 * Moves {projectName}_concept.md and {projectName}_tasklist.md from docs/ into docs/vX.Y/.
 */
function migrateToVersioned(projectAbsPath, projectName, version) {
  const docsDir = path.join(projectAbsPath, 'docs');
  const folder = getVersionFolder(version);
  const absFolder = path.join(projectAbsPath, folder);

  if (fs.existsSync(absFolder)) {
    throw new Error(`Version folder already exists: ${folder}`);
  }

  fs.mkdirSync(absFolder, { recursive: true });

  const conceptSrc = path.join(docsDir, `${projectName}_concept.md`);
  const tasklistSrc = path.join(docsDir, `${projectName}_tasklist.md`);

  const moved = [];

  if (fs.existsSync(conceptSrc)) {
    fs.renameSync(conceptSrc, path.join(absFolder, `${projectName}_concept.md`));
    moved.push(`${projectName}_concept.md`);
  }

  if (fs.existsSync(tasklistSrc)) {
    fs.renameSync(tasklistSrc, path.join(absFolder, `${projectName}_tasklist.md`));
    moved.push(`${projectName}_tasklist.md`);
  }

  return { folder, version, moved };
}

/**
 * Run git tag in the project directory.
 * Returns a promise that resolves with { ok, message } or rejects with error.
 */
function runGitTag(projectAbsPath, tagName) {
  return new Promise((resolve, reject) => {
    execFile('git', ['tag', tagName], { cwd: projectAbsPath }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr.trim() || err.message));
      } else {
        resolve({ ok: true, message: `Tag '${tagName}' created` });
      }
    });
  });
}

module.exports = {
  parseVersionString,
  getVersionFolder,
  detectFlatDocs,
  scanVersions,
  createVersion,
  migrateToVersioned,
  runGitTag,
  compareVersions
};
