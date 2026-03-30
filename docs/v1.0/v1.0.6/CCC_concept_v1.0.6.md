# CCC
**Concept Document v1.0.6**

---

## Overview

v1.0.6 is the final local-era release before CCC moves to centralized deployment in v1.1. Four items:

1. **Non-code project support** — projects like VitalPBX (config/infra) can't be activated because the stage-gate workflow requires git. CCC must support a "config/infra" project type that skips git requirements while keeping the stage-gate workflow.
2. **Development workflow enforcement** — CCC must enforce the Cowork→CC pipeline in code, not just in CLAUDE.md instructions.
3. **Test file version-aware placement** — test files must be created in the version subfolder, not the major version root.
4. **Project activation fix** — projects created in CCC or imported/initialized cannot be moved from Parked to Active. The activation gate is too restrictive.

---

## 1. Non-Code Project Support

### Problem
Projects like VitalPBX are infrastructure/configuration projects — no source code, no git repo, no build artifacts. The current CCC activation flow requires git (branch detection, commit history, etc.). These projects get stuck in Parked because they can't pass the activation checks.

### Solution
Add a project type field. Two types:
- **`code`** (default) — existing behaviour, git required, full stage-gate workflow
- **`config`** — skips git requirements (no branch checks, no commit history, no repo validation). Stage-gate workflow still applies (stages, kickoff prompts, test files, Go/NoGo gates). The difference is purely about git — nothing else changes.

### Requirements
- [ ] Add `type` field to project data model (`"code"` | `"config"`, default `"code"`)
- [ ] Project creation/edit UI: option to set project type
- [ ] Activation flow: skip git validation when `type === "config"`
- [ ] Stage-gate workflow works identically for both types
- [ ] Existing projects remain `type: "code"` (backward compatible, no migration needed)

---

## 2. Development Workflow Enforcement + Slash Command Alignment

### Problem
The Cowork→CC pipeline rule (Cowork writes kickoff prompts, CC only executes them) is currently enforced by CLAUDE.md instructions alone. Two gaps:

1. **Code-level enforcement:** CCC source code may still auto-generate tasklists or stage plans, bypassing the pipeline.
2. **Slash command templates:** `generateSlashCommand()` in `server.js` deploys outdated command text to scaffolded/imported projects. For example, the `/update-tasklist` template still says "Add any new tasks" — directly contradicting the workflow. It also only deploys 3 of 8 commands, leaving new projects without `/start-stage`, `/continue`, `/eod`, `/test`, and the `/create-tasklist` deprecation guard.

### What Cowork Already Changed (ad-hoc, in CLAUDE.md + command files)
These changes are already on disk in CCC's own `.claude/commands/` and working:
- `/continue` — checks for kickoff prompt, won't start without one
- `/create-tasklist` — deprecated (CC no longer creates tasklists)
- `/start-stage` — reads kickoff prompt, refuses to start without one
- `/update-tasklist` — CC only marks completion, no structural changes
- `/review-concept` — drift measured against kickoff prompt, not concept doc
- `/eod` — end-of-day wrap-up
- `/test` — run test suite, build, lint
- `/status` — project status report
- CCC CLAUDE.md — Development Workflow section added, Project Memory section updated

### What CC Must Fix in Code
- [ ] Audit `projects.js` and any CCC source code for auto-generation of tasklists or stage plans. Remove or gate that logic.
- [ ] Ensure no code path allows CC to create or modify a tasklist structure. CC can only mark tasks as complete — not add, remove, reorder, or create tasks.
- [ ] Rewrite `generateSlashCommand()` to support all 8 commands with workflow-aligned instruction text. Use CCC's own `.claude/commands/` files as the reference for correct text.
- [ ] Update both scaffold routes (`scaffold-project` and `scaffold-import`) to deploy all 8 commands instead of 3.
- [ ] Remove `/start-project` references from the import modal UI notices (lines ~2657, 2660 in app.js). There is no `/start-project` command. Replace with accurate notices: CLAUDE.md → "will be scaffolded during import"; tasklist → "will be created in a Cowork session after import."

### Acceptance Criteria
- Starting a stage without a kickoff prompt in `docs/handoff/` fails with a clear message
- CC cannot generate a tasklist from a concept doc — only Cowork does that
- `/update-tasklist` only modifies task status (complete/incomplete), not task content or structure
- `generateSlashCommand()` returns correct workflow-aligned text for all 8 commands
- Both scaffold routes deploy all 8 slash commands to new projects
- No UI references to `/start-project` remain

---

## 3. Test File Version-Aware Placement

### Problem
Test files are currently created in the major version root: `docs/v1.0/ProjectName_test_stageXX.md`. For patch versions (v1.0.6, v1.0.7, etc.), they should be in the version subfolder: `docs/v1.0/v1.0.6/ProjectName_test_stageXX.md`.

The global CLAUDE.md already documents this rule under "Test File Generation (MANDATORY)" → rule 4: *"For patch versions: Place in the patch subfolder: `docs/v{X.Y}/v{X.Y.Z}/{ProjectName}_test_stage{XX}.md`"*. But CCC code does not enforce it — test files land wherever CC decides.

### Solution
CCC must determine the active version of a project and construct the correct test file path:

- **Major version** (e.g. v1.0, v2.0): `docs/v{X.Y}/{ProjectName}_test_stage{XX}.md`
- **Patch version** (e.g. v1.0.6): `docs/v{X.Y}/v{X.Y.Z}/{ProjectName}_test_stage{XX}.md`

### Requirements
- [ ] CCC detects the active version of a project (from tasklist filename, project metadata, or folder structure)
- [ ] When a patch version is active (three-part version like v1.0.6), the test file path includes the patch subfolder
- [ ] The version subfolder is created automatically if it doesn't exist
- [ ] The test file naming pattern remains: `{ProjectName}_test_stage{XX}.md` — only the directory changes
- [ ] The treeview regex `/_test_stage\d+\.md$/` continues to match (no naming change, just path change)

### Acceptance Criteria
- Test file for a v1.0.6 stage lands in `docs/v1.0/v1.0.6/`, not `docs/v1.0/`
- Test file for a v2.0 stage (no patch) lands in `docs/v2.0/` as before
- CCC treeview still finds and displays test files regardless of depth

---

## 4. Project Activation Fix

### Problem
Projects created directly in CCC (via the UI) or imported/initialized cannot be dragged from Parked to Active. An ad-hoc fix on 2026-03-27 changed `evaluated !== true` to `=== false` in `handleDrop()` and the edit modal validation, but this only patched one symptom. The underlying activation flow is too restrictive — it blocks projects that should be movable.

### Root Cause
The `evaluated` field gates the Parked→Active drag. Projects created via CCC UI or imported get `evaluated` as `undefined` (never explicitly set), which fails the activation check. The ad-hoc fix helped but didn't address all code paths.

### Solution
Comprehensive fix of the activation gate:
- Any project that exists in CCC (created, imported, or initialized) should be movable from Parked to Active
- The `evaluated` field should not block drag-and-drop between groups. If a project needs evaluation, prompt the user AFTER the move — don't prevent the move.
- For `config` type projects (Item 1), evaluation/git checks are skipped entirely

### Requirements
- [ ] Audit ALL code paths that check `evaluated` — `handleDrop()`, edit modal, any API validation
- [ ] Parked→Active drag must work for: manually created projects, imported projects, initialized projects, config projects
- [ ] If `evaluated` is `undefined` or not set, treat the project as movable (not blocked)
- [ ] Remove the ad-hoc fix from 2026-03-27 and replace with the proper solution
- [ ] The `evaluated` field can still exist for tracking purposes, but it must NOT prevent group moves

### Acceptance Criteria
- Create a project in CCC → drag from Parked to Active → succeeds
- Import a project → drag from Parked to Active → succeeds
- Config project → drag from Parked to Active → succeeds (no git check)
- Existing projects with `evaluated: true` → behaviour unchanged

---

## Changes from Previous Version (v1.0.5)

v1.0.5 fixed the status bar usage timer. v1.0.6 adds:
- Project type field (`code` / `config`) for non-code projects
- Code-level enforcement of the Cowork→CC development pipeline
- Version-aware test file placement in patch subfolders
- Project activation fix — Parked→Active drag works for all project origins
