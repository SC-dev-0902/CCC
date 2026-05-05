# Stage 04b Kickoff Prompt — Filesystem Scanner Update

## Non-Negotiable Rules
- No free-styling. Implement exactly what is specified here.
- No em dash (—). Use hyphen with spaces ( - ) instead.
- No code in chat. Write to files.
- No deploy step. Dev-Web has /mnt/sc-development mounted via NFS. Files are live immediately after write.
- Commit to Forgejo on completion.

---

## Context

CCC v1.1 introduces a new filesystem structure for version folders. This sub-stage updates `src/versions.js` and `public/app.js` to match the new structure.

**There is no backward compatibility requirement.** The Migration Wizard (Stage 08) handles one-time migration of existing v1.0 projects. The scanner is new-structure only.

### Old structure (v1.0 - do NOT support)
```
{projectRoot}/docs/v1.0/           <- version folder inside docs/
    ProjectName_concept_v1.0.md
    ProjectName_tasklist_v1.0.md
    ProjectName_test_stage01.md    <- test files flat
```

### New structure (v1.1 - implement this)
```
{projectRoot}/v1.0/                <- version folder at project root
    docs/
        ProjectName_concept_v1.0.md
        ProjectName_tasklist_v1.0.md
        handoff/
            ProjectName_shp.md
            stage01-prompt.md
        testfiles/
            stage01/
                ProjectName_test_stage01.md
                stage01a/
                    ProjectName_test_stage01a.md
            stage02/
                ProjectName_test_stage02.md
    v1.0.1/                        <- patch nested inside version
        docs/
            ProjectName_concept_v1.0.1.md
            ProjectName_tasklist_v1.0.1.md
            handoff/
            testfiles/
```

---

## Task 1 — Update `src/versions.js`

### 1a. `getVersionFolder(version)`

Change so version folders resolve at project root, not inside `docs/`:

- `"1.0"` → `"v1.0"` (was `"docs/v1.0"`)
- `"1.1.1"` → `"v1.1/v1.1.1"` (was `"docs/v1.1/v1.1.1"`)

### 1b. `scanVersions(projectAbsPath, projectName)`

Change scan target from `{projectAbsPath}/docs/` to `{projectAbsPath}` directly.

- Scan `projectAbsPath` for directories matching `/^v(\d+\.\d+)$/`
- For each match, the version directory is `{projectAbsPath}/vX.Y/`
- Set `folder` field to `vX.Y` (relative, at project root)
- Remove `flatTestFiles` from the result object entirely - it has no equivalent in v1.1
- `hasFlatDocs` detection: keep `detectFlatDocs()` unchanged - it still checks `docs/` for flat concept/tasklist files (valid for unversioned/pre-migration projects)

Patch subdirectories: scan for `/^v(\d+\.\d+\.\d+)$/` inside `{projectAbsPath}/vX.Y/` (one level up from the old location).

### 1c. `scanVersionFiles(versionDir, projectName)`

`versionDir` is now `{projectAbsPath}/vX.Y/` (the version root). Docs are inside it.

Change the function to:

1. Look for concept/tasklist `.md` files in `{versionDir}/docs/` (flat, not recursive)
2. Look for test files by walking `{versionDir}/docs/testfiles/` recursively:
   - Walk `testfiles/stageNN/` directories
   - For each stageNN dir, check for `.md` files matching the test file regex
   - Also walk `testfiles/stageNN/stageNNa/` subdirectories for sub-stage tests
   - Collect all test files with their `{ name, checked, total, stagePath }` where `stagePath` is the relative path from `testfiles/` (e.g., `"stage01"` or `"stage01/stage01a"`)

Test file regex (filename only): `/_test_stage\d+[a-z]*\d*\.md$/`

Return shape of `testFiles` entries: `{ name, checked, total, stagePath }` - same as before but with `stagePath` added.

### 1d. `getTestFilePath(projectName, stageId, activeVersion)`

Change to return the new path pattern:

- For major/minor versions (e.g., `"1.0"`):
  `v1.0/docs/testfiles/stageNN/ProjectName_test_stageNN.md`
- For patch versions (e.g., `"1.0.1"`):
  `v1.0/v1.0.1/docs/testfiles/stageNN/ProjectName_test_stageNN.md`

Where `stageNN` is:
- Purely numeric `stageId` (e.g., `"11"`) -> zero-padded: `"stage11"`
- Sub-stage or fix identifier (e.g., `"11a"`, `"11a01"`) -> `"stage11a"`, `"stage11a01"`

**Critical**: Before returning the path, ensure the stage subfolder exists. Use `fs.mkdirSync(path.join(projectAbsPath, stageFolder), { recursive: true })`. The function signature must therefore also accept `projectAbsPath` as a new parameter:

```js
function getTestFilePath(projectAbsPath, projectName, stageId, activeVersion)
```

Update all callers in `server.js` accordingly.

### 1e. `createVersion(projectAbsPath, projectName, version, type, previousConceptContent)`

Update to scaffold the new v1.1 folder structure at project root:

Create the following directories:
- `{projectAbsPath}/vX.Y/docs/`
- `{projectAbsPath}/vX.Y/docs/handoff/`
- `{projectAbsPath}/vX.Y/docs/testfiles/`

Write the following files:
- `{projectAbsPath}/vX.Y/docs/{projectName}_tasklist_v{version}.md` (same template content as before)
- `{projectAbsPath}/vX.Y/docs/{projectName}_concept_v{version}.md` (same template/seeded content as before)

For patch versions (`type === 'patch'`), the folder path is `{projectAbsPath}/vX.Y/vX.Y.Z/docs/` etc. The `getVersionFolder()` function already returns the correct relative path after Task 1a - use `path.join(projectAbsPath, getVersionFolder(version))` as the base, then append `/docs/`.

### 1f. `migrateToVersioned(projectAbsPath, projectName, version)`

Update the destination from `docs/vX.Y/` to `vX.Y/docs/`:

- Create `{projectAbsPath}/vX.Y/docs/` (and `handoff/`, `testfiles/` subdirs)
- Move `{projectAbsPath}/docs/{projectName}_concept.md` to `{projectAbsPath}/vX.Y/docs/{projectName}_concept.md`
- Move `{projectAbsPath}/docs/{projectName}_tasklist.md` to `{projectAbsPath}/vX.Y/docs/{projectName}_tasklist.md`

---

## Task 2 — Update `public/app.js`: Test files grouped by stage

The Testing section in the treeview currently renders test files as a flat list. With the new `stagePath` field on each test file, group them by stage.

**Current rendering (flat):**
```
Testing
  ProjectName_test_stage01.md  [3/10]
  ProjectName_test_stage01a.md [2/5]
  ProjectName_test_stage02.md  [0/8]
```

**New rendering (grouped by stage):**
```
Testing
  stage01
    ProjectName_test_stage01.md  [3/10]
    stage01a
      ProjectName_test_stage01a.md [2/5]
  stage02
    ProjectName_test_stage02.md  [0/8]
```

Implementation notes:
- Group using the `stagePath` field (e.g., `"stage01"`, `"stage01/stage01a"`)
- Stage group headers are non-clickable labels, visually indented to match hierarchy
- Stage headers with a `"/"` in `stagePath` indicate sub-stage nesting - render the sub-stage folder as a child of its parent stage group
- Test file click behaviour is unchanged (opens test runner panel)
- If `stagePath` is missing or empty (defensive fallback), render file in an "Ungrouped" section

---

## Task 3 — Verify `server.js` callers

After changing `getTestFilePath()` to require `projectAbsPath` as first parameter, find all call sites in `server.js` and update them to pass the resolved project absolute path.

Use `resolveProjectPath(project)` from `src/projects.js` to get the absolute path at each call site.

---

## Acceptance Criteria

1. `scanVersions()` scans version folders at project root (`vX.Y/`), not inside `docs/`
2. `scanVersionFiles()` returns concept/tasklist files from `vX.Y/docs/` and test files from `vX.Y/docs/testfiles/` with correct `stagePath` values
3. Patch versions (`vX.Y.Z/`) nested inside `vX.Y/` are correctly detected and scanned
4. `getTestFilePath()` returns the new path pattern and creates the stage subfolder if it does not exist
5. `createVersion()` creates `vX.Y/docs/`, `vX.Y/docs/handoff/`, and `vX.Y/docs/testfiles/` with seeded concept + tasklist files
6. `migrateToVersioned()` moves flat docs into `vX.Y/docs/` (not `docs/vX.Y/`)
7. All `getTestFilePath()` callers in `server.js` pass `projectAbsPath` as first argument
8. Treeview Testing section groups test files by stage with correct hierarchy
9. `flatTestFiles` is no longer present in the `scanVersions()` result
10. No references to `docs/vX.Y` remain in `src/versions.js` after the change

---

## Commit

On completion, commit to Forgejo:

```
git add .
git commit -m "Stage 04b complete - filesystem scanner update"
git push origin main
```

Report the commit hash and the acceptance criteria results.
