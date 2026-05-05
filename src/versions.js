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
 * Get the relative folder path for a version, anchored at the project root (v1.1+).
 * "1.0"   -> "v1.0"
 * "1.1.1" -> "v1.1/v1.1.1"
 */
function getVersionFolder(version) {
  const parsed = parseVersionString(version);
  if (parsed.patch !== null) {
    const parentMinor = `${parsed.major}.${parsed.minor}`;
    return path.join(`v${parentMinor}`, `v${version}`);
  }
  return `v${version}`;
}

/**
 * Detect whether a project has flat (non-versioned) docs.
 * Returns true if {projectName}_concept.md or {projectName}_tasklist.md exist
 * directly in docs/ (legacy unversioned / pre-migration projects).
 */
function detectFlatDocs(projectAbsPath, projectName) {
  const docsDir = path.join(projectAbsPath, 'docs');
  if (!fs.existsSync(docsDir)) return false;

  const conceptFile = path.join(docsDir, `${projectName}_concept.md`);
  const tasklistFile = path.join(docsDir, `${projectName}_tasklist.md`);

  return fs.existsSync(conceptFile) || fs.existsSync(tasklistFile);
}

/**
 * Scan a project directory for v1.1+ version folders (vX.Y/ at project root).
 * Returns { versions: [...], hasFlatDocs: bool }
 */
function scanVersions(projectAbsPath, projectName) {
  const result = {
    versions: [],
    hasFlatDocs: detectFlatDocs(projectAbsPath, projectName)
  };

  if (!fs.existsSync(projectAbsPath)) return result;

  const entries = fs.readdirSync(projectAbsPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^v(\d+\.\d+)$/);
    if (!match) continue;

    const version = match[1];
    const versionDir = path.join(projectAbsPath, entry.name);
    const parsed = parseVersionString(version);

    const scanned = scanVersionFiles(versionDir, projectName);

    const versionInfo = {
      version,
      type: parsed.minor === 0 ? 'major' : 'minor',
      folder: entry.name,
      files: scanned.files,
      testFiles: scanned.testFiles,
      patches: []
    };

    // Patch subdirectories live one level inside the version folder (e.g. v1.0/v1.0.1/)
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
        folder: path.join(entry.name, sub.name),
        files: patchScanned.files,
        testFiles: patchScanned.testFiles
      });
    }

    versionInfo.patches.sort((a, b) => compareVersions(a.version, b.version));
    result.versions.push(versionInfo);
  }

  result.versions.sort((a, b) => compareVersions(a.version, b.version));
  return result;
}

/**
 * Count checked and total checkboxes in a Markdown file.
 * Matches lines like `- [x]` (checked) and `- [ ]` (unchecked).
 */
function countTestCheckboxes(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let checked = 0;
    let total = 0;
    for (const line of lines) {
      if (/^\s*- \[x\]/i.test(line)) {
        checked++;
        total++;
      } else if (/^\s*- \[ \]/.test(line)) {
        total++;
      }
    }
    return { checked, total };
  } catch {
    return { checked: 0, total: 0 };
  }
}

/**
 * Count completed vs total stages in a tasklist file.
 * A stage starts at a `## Stage` heading. Complete = at least one checkbox AND
 * all checkboxes ticked.
 */
function countCompletedStages(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const stages = [];
    let current = null;

    for (const line of lines) {
      if (/^##\s+Stage\s/i.test(line)) {
        if (current) stages.push(current);
        current = { checked: 0, unchecked: 0 };
      } else if (current) {
        if (/^\s*- \[x\]/i.test(line)) current.checked++;
        else if (/^\s*- \[ \]/.test(line)) current.unchecked++;
      }
    }
    if (current) stages.push(current);

    let completed = 0;
    for (const s of stages) {
      if (s.checked > 0 && s.unchecked === 0) completed++;
    }
    return { completed, total: stages.length };
  } catch {
    return { completed: 0, total: 0 };
  }
}

/**
 * Scan a v1.1+ version directory for docs and test files.
 * versionDir is the version root (e.g. {abs}/v1.0 or {abs}/v1.0/v1.0.1).
 *
 * Returns { files, testFiles } where:
 *   - files: concept/tasklist .md files from {versionDir}/docs/ (flat, non-recursive)
 *     Tasklist entries are {name, stagesCompleted, stagesTotal}; others are bare strings.
 *   - testFiles: walked from {versionDir}/docs/testfiles/stageNN/ (and stageNN/stageNNa/)
 *     Each entry: {name, checked, total, stagePath} - stagePath is POSIX-relative to
 *     testfiles/ (e.g. "stage01" or "stage01/stage01a").
 *
 * Test file regex (filename only): /_test_stage\d+[a-z]*\d*\.md$/
 * Supports main stages (stage11), sub-stages (stage11a, stage07ac), and fixes (stage11a01).
 */
function scanVersionFiles(versionDir, projectName) {
  const result = { files: [], testFiles: [] };
  const docsDir = path.join(versionDir, 'docs');
  if (!fs.existsSync(docsDir)) return result;

  const escapedName = projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const testPattern = new RegExp(`^${escapedName}_test_stage\\d+[a-z]*\\d*\\.md$`);

  // 1. Concept / tasklist / other docs (flat in docs/)
  const docsEntries = fs.readdirSync(docsDir, { withFileTypes: true });
  for (const ent of docsEntries) {
    if (!ent.isFile() || !ent.name.endsWith('.md')) continue;
    if (testPattern.test(ent.name)) continue;  // test files only live under testfiles/
    const fullPath = path.join(docsDir, ent.name);
    if (/_tasklist/.test(ent.name)) {
      const stageCounts = countCompletedStages(fullPath);
      result.files.push({ name: ent.name, stagesCompleted: stageCounts.completed, stagesTotal: stageCounts.total });
    } else {
      result.files.push(ent.name);
    }
  }

  // 2. Test files - walk docs/testfiles/stageNN/ (and one level of sub-stage nesting)
  const testfilesDir = path.join(docsDir, 'testfiles');
  if (fs.existsSync(testfilesDir)) {
    const stageDirs = fs.readdirSync(testfilesDir, { withFileTypes: true });
    for (const stageDir of stageDirs) {
      if (!stageDir.isDirectory()) continue;
      const stagePath = stageDir.name;
      const stageDirPath = path.join(testfilesDir, stageDir.name);

      const stageEntries = fs.readdirSync(stageDirPath, { withFileTypes: true });
      for (const ent of stageEntries) {
        if (ent.isFile() && testPattern.test(ent.name)) {
          const counts = countTestCheckboxes(path.join(stageDirPath, ent.name));
          result.testFiles.push({ name: ent.name, checked: counts.checked, total: counts.total, stagePath });
        } else if (ent.isDirectory()) {
          const subStagePath = `${stagePath}/${ent.name}`;
          const subDirPath = path.join(stageDirPath, ent.name);
          const subEntries = fs.readdirSync(subDirPath, { withFileTypes: true });
          for (const subEnt of subEntries) {
            if (subEnt.isFile() && testPattern.test(subEnt.name)) {
              const counts = countTestCheckboxes(path.join(subDirPath, subEnt.name));
              result.testFiles.push({ name: subEnt.name, checked: counts.checked, total: counts.total, stagePath: subStagePath });
            }
          }
        }
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
 * Create a new version folder with scaffolded templates (v1.1+ layout).
 * Creates {abs}/vX.Y/docs/, {abs}/vX.Y/docs/handoff/, {abs}/vX.Y/docs/testfiles/
 * Writes seeded concept and tasklist into {abs}/vX.Y/docs/.
 *
 * type: 'major' | 'minor' | 'patch'
 * previousConceptContent: optional string - if provided, seeds the new concept doc
 */
function createVersion(projectAbsPath, projectName, version, type, previousConceptContent) {
  const folder = getVersionFolder(version);
  const absVersionFolder = path.join(projectAbsPath, folder);
  const absDocsFolder = path.join(absVersionFolder, 'docs');

  if (fs.existsSync(absVersionFolder)) {
    throw new Error(`Version folder already exists: ${folder}`);
  }

  fs.mkdirSync(absDocsFolder, { recursive: true });
  fs.mkdirSync(path.join(absDocsFolder, 'handoff'), { recursive: true });
  fs.mkdirSync(path.join(absDocsFolder, 'testfiles'), { recursive: true });

  const tasklistContent = `# ${projectName}_tasklist_v${version}.md - v${version}\n*Derived from: ${projectName}_concept_v${version}.md*\n*Stage gate process: each stage ends with Go/NoGo before next stage begins*\n\n---\n\n## Stage 01 - [Stage Name]\n**Focus:** [Description]\n\n### Tasks\n- [ ] Task 1\n\n### Go/NoGo Gate\n> [Gate question]\n\n**-> GO:** Proceed to Stage 02\n**-> NOGO:** Revise, re-evaluate\n\n---\n`;
  fs.writeFileSync(path.join(absDocsFolder, `${projectName}_tasklist_v${version}.md`), tasklistContent, 'utf8');

  let conceptContent;
  if (previousConceptContent) {
    conceptContent = previousConceptContent.replace(
      /\*\*Concept Document v[\d.]+\*\*/,
      `**Concept Document v${version}**`
    );
  } else {
    conceptContent = `# ${projectName}\n**Concept Document v${version}**\n\n---\n\n## Overview\n\n[Describe the goals and scope of this version]\n\n---\n\n## Changes from Previous Version\n\n[What's new or different in v${version}]\n\n---\n`;
  }
  fs.writeFileSync(path.join(absDocsFolder, `${projectName}_concept_v${version}.md`), conceptContent, 'utf8');

  return { folder, version, type };
}

/**
 * Migrate flat docs into a v1.1+ versioned folder.
 * Moves {abs}/docs/{projectName}_concept.md and _tasklist.md into {abs}/vX.Y/docs/.
 * Creates handoff/ and testfiles/ subfolders alongside.
 */
function migrateToVersioned(projectAbsPath, projectName, version) {
  const docsDir = path.join(projectAbsPath, 'docs');
  const folder = getVersionFolder(version);
  const absVersionFolder = path.join(projectAbsPath, folder);
  const absDocsFolder = path.join(absVersionFolder, 'docs');

  if (fs.existsSync(absVersionFolder)) {
    throw new Error(`Version folder already exists: ${folder}`);
  }

  fs.mkdirSync(absDocsFolder, { recursive: true });
  fs.mkdirSync(path.join(absDocsFolder, 'handoff'), { recursive: true });
  fs.mkdirSync(path.join(absDocsFolder, 'testfiles'), { recursive: true });

  const conceptSrc = path.join(docsDir, `${projectName}_concept.md`);
  const tasklistSrc = path.join(docsDir, `${projectName}_tasklist.md`);

  const moved = [];

  if (fs.existsSync(conceptSrc)) {
    fs.renameSync(conceptSrc, path.join(absDocsFolder, `${projectName}_concept.md`));
    moved.push(`${projectName}_concept.md`);
  }

  if (fs.existsSync(tasklistSrc)) {
    fs.renameSync(tasklistSrc, path.join(absDocsFolder, `${projectName}_tasklist.md`));
    moved.push(`${projectName}_tasklist.md`);
  }

  return { folder, version, moved };
}

/**
 * Run git tag in the project directory.
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

/**
 * Resolve the relative path for a stage's test file under v1.1+ layout, and
 * ensure the stage subfolder exists on disk before returning.
 *
 * stageId: "11" -> "stage11", "11a" -> "stage11a", "11a01" -> "stage11a01".
 *   Purely numeric stageIds are zero-padded to 2 digits.
 *
 * Returns the relative path within the project, e.g.
 *   "v1.0/docs/testfiles/stage11/{name}_test_stage11.md"
 *   "v1.0/v1.0.1/docs/testfiles/stage11a/{name}_test_stage11a.md"
 */
function getTestFilePath(projectAbsPath, projectName, stageId, activeVersion) {
  const stageStr = /^\d+$/.test(String(stageId))
    ? String(stageId).padStart(2, '0')
    : String(stageId);
  const stageFolder = `stage${stageStr}`;
  const fileName = `${projectName}_test_stage${stageStr}.md`;
  const versionFolder = getVersionFolder(activeVersion);
  const stageRelDir = path.join(versionFolder, 'docs', 'testfiles', stageFolder);

  fs.mkdirSync(path.join(projectAbsPath, stageRelDir), { recursive: true });

  return path.join(stageRelDir, fileName);
}

module.exports = {
  parseVersionString,
  getVersionFolder,
  getTestFilePath,
  detectFlatDocs,
  scanVersions,
  createVersion,
  migrateToVersioned,
  runGitTag,
  compareVersions
};
