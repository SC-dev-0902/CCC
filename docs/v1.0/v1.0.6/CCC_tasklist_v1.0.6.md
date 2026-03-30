# CCC_tasklist_v1.0.6.md — v1.0.6
*Derived from: CCC_concept_v1.0.6.md*
*Stage gate process: each stage ends with Go/NoGo before next stage begins*

---

## Stage 01 — Non-Code Project Support + Workflow Enforcement + Test File Placement + Activation Fix
**Focus:** All four v1.0.6 items in a single stage. Independent code changes, same codebase.

### Tasks

**Item 1: Non-code project support**
- [ ] Add `type` field to project data model in `projects.js` (`"code"` | `"config"`, default `"code"`)
- [ ] Update `data/projects.json` default structure — existing projects remain `type: "code"` (backward compatible)
- [ ] Update project creation UI in `app.js` — add project type selector (Code / Config)
- [ ] Update project edit modal — allow changing project type
- [ ] Update activation flow — skip git validation when `type === "config"`
- [ ] Verify stage-gate workflow works identically for config projects (stages, treeview, test files)

**Item 2: Development workflow enforcement + slash command alignment**
- [ ] Audit `projects.js` for any auto-generation of tasklists or stage plans — remove or gate
- [ ] Audit `server.js` scaffold routes (`/api/scaffold-project`, `/api/scaffold-import`) for tasklist auto-creation — remove or gate
- [ ] Rewrite `generateSlashCommand()` in `server.js` — support all 8 commands with workflow-aligned text (use CCC's own `.claude/commands/` as reference)
- [ ] Update both scaffold routes to deploy all 8 slash commands (not just 3)
- [ ] Remove `/start-project` UI references from import modal notices in `app.js` — replace with accurate text
- [ ] Verify deployed `/update-tasklist` template says "Do NOT add new tasks"
- [ ] Verify deployed `/start-stage` template refuses without kickoff prompt
- [ ] Verify deployed `/create-tasklist` template is a deprecation guard

**Item 3: Test file version-aware placement**
- [ ] Read `activeVersion` from project data to determine current version
- [ ] Detect patch version (three-part like `1.0.6`) vs major version (two-part like `1.0`)
- [ ] When patch version active: construct test file path as `docs/v{X.Y}/v{X.Y.Z}/{ProjectName}_test_stage{XX}.md`
- [ ] When major version active: keep existing path `docs/v{X.Y}/{ProjectName}_test_stage{XX}.md`
- [ ] Auto-create version subfolder if it doesn't exist
- [ ] Verify treeview regex `/_test_stage\d+\.md$/` still matches test files at both depths
- [ ] Update CLAUDE.md test file generation section to reference the version-aware logic

**Item 4: Project activation fix**
- [ ] Audit ALL code paths that check `evaluated` — `handleDrop()`, edit modal, any API validation
- [ ] Fix `handleDrop()`: Parked→Active drag must work for all project origins (created, imported, initialized, config)
- [ ] Fix: if `evaluated` is `undefined` or not set, treat project as movable (not blocked)
- [ ] Remove ad-hoc fix from 2026-03-27 (`evaluated !== true` → `=== false`) and replace with proper solution
- [ ] Ensure `evaluated` field does NOT prevent group moves — it can exist for tracking but must not gate drag-and-drop
- [ ] For `config` type projects: skip evaluation/git checks entirely during activation
- [ ] Verify: create project in CCC → drag Parked→Active → succeeds
- [ ] Verify: import project → drag Parked→Active → succeeds

### Go/NoGo Gate
> Does CCC handle code and config projects correctly? Does the workflow enforcement block unauthorized tasklist creation? Do test files land in the correct version subfolder? Can all project types be dragged from Parked to Active?

**→ GO:** v1.0.6 complete — tag and push
**→ NOGO:** Fix identified issues, re-test

---
