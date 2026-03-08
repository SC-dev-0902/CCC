# CCC Tasklist — v1.0.2
*Patch: Workspace compatibility + documentation model*

---

## Stage 01: Scaffolding Updates
*Version-in-filename, topic folders, PROJECT_MAP.md*

- [x] **New Project Wizard** (`server.js` → `/api/scaffold-project`):
  - [x] Concept template filename includes version: `{Name}_concept_v{X.Y}.md`
  - [x] Tasklist template filename includes version: `{Name}_tasklist_v{X.Y}.md`
  - [x] Create topic-based documentation folders: `docs/discussion/`, `docs/architecture/`, `docs/spec/`, `docs/adr/`, `docs/context/`, `docs/handoff/`
  - [x] Generate `PROJECT_MAP.md` at project root from scaffolded structure
- [x] **Import Wizard** (`server.js` → `/api/scaffold-import`):
  - [x] Scaffold missing topic-based folders (non-destructive — never overwrite existing)
  - [x] Generate `PROJECT_MAP.md` if it doesn't exist
  - [x] Concept/tasklist templates use versioned filenames
  - Import test deferred — no project available to import
- [x] **New Version action** (`server.js` → `/api/projects/:id/versions`):
  - [x] Concept template filename includes version: `{Name}_concept_v{X.Y}.md`
  - [x] Tasklist template filename includes version: `{Name}_tasklist_v{X.Y}.md`
  - [x] Patch version templates nested correctly: `docs/vX.Y/vX.Y.Z/{Name}_concept_v{X.Y.Z}.md`
- [x] **Version file scanning** (`src/versions.js` → `scanVersionFiles()`):
  - [x] Detect both old-style (`{Name}_concept.md`) and new-style (`{Name}_concept_v{X.Y}.md`) filenames
  - [x] Ensure tree view displays versioned filenames correctly
- [x] Test: create new project via wizard → verify versioned filenames, topic folders, and PROJECT_MAP.md
- [x] Test: import existing project → deferred (no project available to import)
- [x] Test: create new version (major, minor, patch) → verify versioned filenames
- [x] **Active version delete** (scope addition — Phet request):
  - [x] API: allow deleting the active version, auto-fall-back to parent/previous version
  - [x] UI: show delete button on active versions (currently hidden)
  - [x] Test: delete active patch version → active falls back to parent minor
- [x] **Tasklist stage progress badge** (scope addition — Phet request):
  - [x] `scanVersionFiles()` counts completed stages for tasklist files
  - [x] Tree view shows `[x/y]` badge next to tasklist filenames
- [x] Generate pre-GoNoGo test file: `docs/v1.0/v1.0.2/CCC_test_stage01.md`

→ **GO** — All scaffolding paths produce correct structure. Old-style filenames work. Active versions deletable with fallback.
  → GO → Stage 02

---

## Stage 02: Path Migration
*SHP read path, recovery write path, auto-inject /continue*

- [x] **Recovery auto-save** (`public/app.js` → `saveRecoveryFiles()`):
  - [x] Change output path from `docs/${project.name}_recovery.txt` to `docs/handoff/${project.name}_recovery.md`
  - [x] Ensure `docs/handoff/` directory exists before writing (file API auto-creates parent dirs)
- [x] **Auto-inject /continue** (`public/app.js`):
  - [x] Update SHP check path from `docs/${proj.name}_shp.md` to `docs/handoff/${proj.name}_shp.md`
  - [x] Update recovery check path from `docs/${proj.name}_recovery.txt` to `docs/handoff/${proj.name}_recovery.md`
- [x] **Backwards compatibility**: check for files at BOTH old and new locations during a transition period — if file exists at old path but not new, use old path (graceful migration)
- [x] Test: recovery file lands in `docs/handoff/` not `docs/`
- [x] Test: auto-inject `/continue` finds SHP at new path
- [x] Test: auto-inject `/continue` still finds SHP at old path (backwards compat for projects not yet migrated)
- [x] Generate pre-GoNoGo test file: `docs/v1.0/v1.0.2/CCC_test_stage02.md`
- [x] Updated `~/.claude/commands/continue.md` to check `docs/handoff/` first with fallback to old paths

**Coordination note:** The global slash commands (`/eod`, `/continue`, `/start-project`) are outside CCC's codebase. Phet will update `~/.claude/CLAUDE.md` to v0.7 and the slash command files separately. Until then, Claude Code sessions will still write SHP to the old `docs/` path. CCC must handle both locations.

→ **GO** — Recovery writes to `docs/handoff/`, auto-inject finds SHP/recovery at both new and old paths, `/continue` slash command updated.
  → GO → Stage 03

---

## Stage 03: CCC Self-Migration + CLAUDE.md
*CCC adopts its own new documentation structure*

- [x] Create CCC's topic-based folders: `docs/discussion/`, `docs/architecture/`, `docs/spec/`, `docs/adr/`, `docs/context/`, `docs/handoff/`
- [x] Move `docs/CCC_shp.md` → `docs/handoff/CCC_shp.md`
- [x] Update CCC's `CLAUDE.md`:
  - [x] Change "Never write version numbers into filenames" rule → new convention (version in filename, forward-only)
  - [x] Add PROJECT_MAP.md to project structure diagram
  - [x] Update SHP path references to `docs/handoff/`
  - [x] Add `docs/handoff/` to project structure diagram
  - [x] Add topic-based folders to project structure diagram
- [x] Create `PROJECT_MAP.md` at CCC project root
- [x] Update `data/projects.json` if any coreFiles paths reference the old SHP location — N/A (no SHP references in coreFiles)
- [x] Rename existing `docs/v1.0/CCC_concept.md` → leave as-is (forward-only convention, per Phet)
- [x] Test: CCC's own tree view correctly shows the new folder structure
- [x] Test: `/continue` auto-inject finds CCC's own SHP at `docs/handoff/CCC_shp.md`
- [x] Generate pre-GoNoGo test file: `docs/v1.0/v1.0.2/CCC_test_stage03.md`
- [x] Added startup migration: topic folders created for all registered projects on CCC boot (not just new/imported)

→ **GO** — CCC's own docs restructured. CLAUDE.md updated. Topic folders propagated to all projects via startup migration.
  → GO → Stage 04

---

## Stage 04: Settings, Verification & Ship
*End-to-end verification, settings patterns, tag*

- [x] **Settings file patterns** (`data/settings.json` / `server.js` defaults):
  - [x] Update concept file pattern to match versioned filenames
  - [x] Update tasklist file pattern to match versioned filenames
- [x] **Verify `projects.json`**: confirm existing project paths still resolve correctly (all 11 projects OK)
- [x] **End-to-end walkthrough**:
  - [x] Create a new project → verify full new structure
  - [ ] Import an existing project → deferred (no project available)
  - [x] Create a new version → verify versioned filenames
  - [x] Start a session → verify recovery auto-save writes to `docs/handoff/`
  - [x] Verify old projects with old-path SHPs still work
- [x] **Scaffold wizard evaluated flag fix**: new projects set `evaluated: true`, startup migration backfills
- [x] Generate pre-GoNoGo test file: `docs/v1.0/v1.0.2/CCC_test_stage04.md`

→ **GO** — End-to-end verified. Old projects unbroken. Import test deferred. v1.0.2 ready to tag.
  → GO → Git tag `v1.0.2`, push to both remotes

---

*Patch release. For full project context, see `docs/v1.0/CCC_concept_v1.0.md`. For patch context, see `docs/v1.0/v1.0.2/CCC_concept_v1.0.2.md`.*
