# CCC Tasklist — v1.0.4
*Patch: Project Rename, UX Improvements, Session Resilience & Documentation Audit*
*Seeded from: CCC_concept_v1.0.4.md*

---

## Stage 01: Project Rename (Full Propagation)

Currently renaming a project only updates the display name in `projects.json`. All associated files and references stay under the old name, breaking `scanVersionFiles` regex and other name-dependent features.

├── [x] Investigate current rename flow — trace `PUT /api/projects/:id` through `updateProject()`, identify every location that uses the project name
├── [x] Implement `renameProject(projectId, newName)` in `src/projects.js`:
│       - Collect all files matching `{OldName}_*` pattern across `docs/`, `docs/handoff/`, and all version folders (`docs/vX.Y/`, `docs/vX.Y/vX.Y.Z/`)
│       - Rename files: concept docs, tasklists, test files, SHP, recovery files
│       - Rename project folder on disk, update `path` in `projects.json`
│       - Update `coreFiles` array in `projects.json` with new paths
│       - Grep + replace old name → new name inside CLAUDE.md
│       - Transaction-like pattern: collect all renames first, execute, roll back on failure
├── [x] Add `POST /api/projects/:id/rename` endpoint in `server.js` — calls `renameProject()`, returns success/failure with list of renamed files
├── [x] Preserve git history — use `fs.renameSync` not delete+create
├── [x] Frontend: wire rename action to new endpoint, refresh treeview on completion
├── [x] Edge cases: handle version subfolders, skip files that don't follow `{ProjectName}_` pattern, handle name/folder collisions
├── [x] Generate pre-GoNoGo test file: docs/v1.0/v1.0.4/CCC_test_stage01.md
└── Go/NoGo: Can a project be renamed end-to-end with all files, references, and coreFiles updated correctly?
    → **GO** (2026-03-13) — 19/19 tests passed

---

## Stage 02: UX Improvements

Four targeted UX fixes: testing refresh button, splitter constraint removal, treeview alphabetical sorting, and red dot for waiting state.

├── [x] **2a. Testing Refresh Button** — ↻ icon inline with "Testing" header, rescans on click
├── [x] **2b. Splitter Max-Width Removal** — CSS changed from 400px to 50vw, JS drag clamp updated
├── [x] **2c. Treeview Alphabetical Sorting** — Groups, projects, and files all sorted alphabetically via localeCompare
├── [x] **2d. "Waiting for Action" Red Dot** — Full chain verified intact: parser → WebSocket → claudeStatus → CSS class. Already working.
├── [x] Generate pre-GoNoGo test file: docs/v1.0/v1.0.4/CCC_test_stage02.md
└── Go/NoGo: Do all four UX improvements work as specified?
    → **GO** (2026-03-13) — 16/16 tests passed

---

## Stage 03: Session Resilience (Unresponsive/Frozen Prompt)

CC inside CCC frequently becomes unresponsive — the prompt freezes and the user cannot type or interact. Investigate root cause and implement detection + recovery.

├── [x] Investigate root cause — check for:
│       - Resource exhaustion (memory/CPU from long PTY sessions)
│       - Stuck WebSocket (connection alive but no data flowing)
│       - xterm.js rendering deadlock (terminal buffer overflow)
│       - node-pty child process stopped responding
│       - PTY output backpressure (buffer full, write blocks)
├── [x] Implement heartbeat check — ping PTY process every 10s, track last response
├── [x] Implement "Session unresponsive" detection — if no PTY response for 30s after activity, trigger warning state
├── [x] Add "Session unresponsive" banner in UI — visible warning with "Restart session" button
├── [x] Implement session restart action — kill frozen PTY via banner (no always-visible kill button — protects unsaved SHP)
├── [x] Ensure the user is NEVER stuck — unresponsive banner provides restart path; file drops blocked from navigating browser
├── [x] Generate pre-GoNoGo test file: docs/v1.0/v1.0.4/CCC_test_stage03.md
└── Go/NoGo: Can CCC detect and recover from frozen sessions? Is the user never stuck?
    → **GO** (2026-03-13) — 9/12 tested, 3 banner-restart items await natural freeze event

---

## Stage 04: Documentation Audit

Fix 10 documented issues across CLAUDE.md, CCC_concept_v1.0.md, and CCC_Roadmap.md. All changes are text-only.

### Contradictions
├── [x] **(1) SHP path** — Aligned concept doc to `docs/handoff/{ProjectName}_shp.md`
├── [x] **(2) User Manual stage number** — Stage 16 is correct. Updated CLAUDE.md (was stale "Stage 13")
├── [x] **(3) Filename versioning convention** — Updated concept doc to match reality: `{Name}_concept_v{X.Y}.md`
├── [x] **(4) Slash commands scope** — Clarified concept doc: global commands at `~/.claude/commands/`, project commands at `.claude/commands/`

### Gaps
├── [x] **(5) `src/usage.js` in Project Structure** — Added to CLAUDE.md's project tree
├── [x] **(6) Roadmap v1.0 status** — Changed "In development" to "Shipped"
├── [x] **(7) Anti-AI-Look rule 8 (border-radius)** — Reworded to project-agnostic
├── [x] **(8) Anti-AI-Look rule 4 (palette)** — Reworded to avoid naming CCC-specific colours

### Ambiguities
├── [x] **(9) Test file naming propagation** — Propagated via global `~/.claude/CLAUDE.md`. No per-project duplication needed. Documented in concept doc.
├── [x] **(10) `activeVersion` pointer** — Clarified: tracks major.minor only. Patches are subfolders. Updated concept doc and CLAUDE.md.
├── [x] Generate pre-GoNoGo test file: docs/v1.0/v1.0.4/CCC_test_stage04.md
└── Go/NoGo: Are all 10 documentation issues resolved with no new contradictions introduced?
    → **GO** (2026-03-13) — 10/10 items resolved

---

## Stage 05: Ship

Final testing, version bump, changelog, tag, and push.

├── [x] Version bump in `package.json` → 1.0.4 (done in Stage 01)
├── [ ] Update SHP with v1.0.4 state
├── [x] Ask Phet about changelog entry — drafted and confirmed
├── [x] Ask Phet about roadmap update — marked v1.0.4 as shipped
├── [x] Update USER_MANUAL.md and regenerate PDF
├── [ ] Git tag `v1.0.4`
├── [ ] Push to both remotes (origin + github)
├── [ ] Generate pre-GoNoGo test file: docs/v1.0/v1.0.4/CCC_test_stage05.md
└── Go/NoGo: Is v1.0.4 tagged, pushed, and all documentation consistent?
    → GO → v1.0.4 shipped
    → NOGO → Address remaining issues before tagging

---

*5 stages. 3 decisions needed from Phet during Stage 04 (items 2, 9, 10).*
