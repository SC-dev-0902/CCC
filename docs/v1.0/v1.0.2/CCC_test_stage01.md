# CCC v1.0.2 — Stage 01 Test: Scaffolding Updates
*Version-in-filename, topic folders, PROJECT_MAP.md*

---

## New Project Wizard

### Test 1: Versioned filenames
- [x] Create a new project via the New Project Wizard (any template)
- [x] Verify concept doc filename includes version: `{Name}_concept_v1.0.md`
- [x] Verify tasklist filename includes version: `{Name}_tasklist_v1.0.md`
- [x] Verify both files appear in the tree view under v1.0

### Test 2: Topic-based documentation folders
- [x] In the newly created project, check that `docs/` contains these folders:
  - [x] `docs/discussion/`
  - [x] `docs/architecture/`
  - [x] `docs/spec/`
  - [x] `docs/adr/`
  - [x] `docs/context/`
  - [x] `docs/handoff/`

### Test 3: PROJECT_MAP.md
- [x] Verify `PROJECT_MAP.md` exists at the project root
- [x] Open it — verify it references the versioned concept and tasklist filenames
- [x] Verify it lists all topic-based documentation folders

### Test 4: CLAUDE.md references
- [x] Open the scaffolded `CLAUDE.md`
- [x] Verify the "Derived from" line references `{Name}_concept_v1.0.md` (not `{Name}_concept.md`)
- [x] Verify the "Read ... before starting" line references the versioned filename
- [x] Verify the "Stage Gate Process" section references the versioned tasklist filename

### Test 5: coreFiles in projects.json
- [x] Check CCC's own `data/projects.json` (in the CCC folder, not the test project) — find the newly created project
- [x] Verify `coreFiles.concept` path includes `_concept_v1.0.md`
- [x] Verify `coreFiles.tasklist` path includes `_tasklist_v1.0.md`
  > Verified programmatically: `"concept": "docs/v1.0/Dummy_concept_v1.0.md"`, `"tasklist": "docs/v1.0/Dummy_tasklist_v1.0.md"`

---

## Import Wizard

### Test 6: Import scaffolds topic folders
> **DEFERRED** — will test when a project is available to import

### Test 7: Non-destructive import
> **DEFERRED** — will test when a project is available to import

---

## New Version Action

### Test 8: Create a new minor version
- [x] On any project, create a new minor version (e.g. v1.1)
- [x] Verify concept filename: `{Name}_concept_v1.1.md`
- [x] Verify tasklist filename: `{Name}_tasklist_v1.1.md`

### Test 9: Create a new patch version
- [x] Create a patch version (e.g. v1.0.1)
  > Fixed: active versions can now be deleted — falls back to parent/previous version automatically.
- [x] Verify files are nested: `docs/v1.0/v1.0.1/{Name}_concept_v1.0.1.md`
- [x] Verify tasklist: `docs/v1.0/v1.0.1/{Name}_tasklist_v1.0.1.md`

---

## Backwards Compatibility

### Test 10: Old-style filenames still display
- [x] Check CCC's own tree view — v1.0 shows `CCC_tasklist.md` (old-style, no version in filename)
- [x] Verify old-style files are still clickable and readable in the Read Panel
- [x] Verify new-style files (e.g. `CCC_concept_v1.0.md`) also display and open correctly

---
