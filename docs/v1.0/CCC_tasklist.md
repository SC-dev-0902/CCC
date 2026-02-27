# CCC_tasklist.md — Claude Command Center
*Derived from: docs/CCC_concept.md*
*Stage gate process: each stage ends with Go/NoGo before next stage begins*

---

## Stage 01 — UI Shell & Layout
**Focus:** Static frontend only. Hardcoded data. No backend, no real terminals, no WebSocket.
**Goal:** The interface must feel right to live in all day before a single line of backend code is written.

### Tasks
- [x] Set up project folder structure (`src/`, `public/`, `data/`, `docs/`)
- [x] Create `index.html` with split-pane layout (tree view left, main panel right)
- [x] Tree view: render hardcoded project groups (Active, Parked)
- [x] Tree view: render hardcoded projects with status dots (all five colours represented)
- [x] Tree view: collapsible groups
- [x] Tree view: expandable project node showing three core files
- [x] Tree view: Settings entry at bottom, always visible
- [x] Tab bar: render hardcoded tabs with status colours
- [x] Tab bar: active tab switching (click to switch)
- [x] Main panel: placeholder content per tab
- [x] Basic responsive behaviour — panel widths hold at different window sizes
- [x] Colour scheme and typography established

### Go/NoGo Gate → **GO** (bundled with Stage 02, commit `09aadcd`)

---

## Stage 02 — Project Persistence & JSON
**Focus:** Replace hardcoded data with real `projects.json`. Projects survive app restart.

### Tasks
- [x] Create `data/projects.json` schema (id, name, path, group, coreFiles)
- [x] Create `data/settings.json` schema (port, editor, shell, theme, filePatterns)
- [x] Express server reads and serves projects from JSON on startup
- [x] Add project: UI form → writes to `projects.json`
- [x] Remove project: removes from `projects.json`
- [x] Edit project: rename, reassign group
- [x] Drag & drop: move project between groups → persists to `projects.json`
- [x] Drag & drop: reorder projects within a group → persists
- [x] `.env` and `.env.example` in place, `PORT` read from environment everywhere
- [x] `.gitignore` configured (`.env`, `data/settings.json`, `node_modules`)

### Go/NoGo Gate → **GO** (commit `09aadcd`)

---

## Stage 03 — Terminal Sessions (PTY + xterm.js)
**Focus:** Real, fully interactive terminal sessions per project. The core of CCC.

### Tasks
- [x] Integrate `node-pty` on the server
- [x] WebSocket server (`ws`) — one connection per terminal session
- [x] Integrate `xterm.js` in the frontend
- [x] Spawn PTY session in project directory on demand
- [x] Full bidirectional input/output between xterm.js and PTY
- [x] Terminal resize handling (cols/rows sync on window resize)
- [x] Sessions persist in background when switching tabs
- [x] Terminal auto-start: "Start Claude Code" / "Open Shell" prompt for new sessions
- [x] Session state tracked per project (active / exited)
- [x] Keyboard shortcuts work: Ctrl+C, Ctrl+D, arrow keys, tab completion, history
- [x] Colours and formatting: 256-colour / truecolor via xterm.js
- [x] Scroll back through session history

### Go/NoGo Gate → **GO** (commit `99a8e65`)

---

## Stage 04 — Status Detection (Parser Module)
**Focus:** Live status dots derived from Claude Code output. The intelligence layer of CCC.

### Tasks
- [x] Create `src/parser.js` — isolated, single responsibility
- [x] Define the five state patterns: WAITING_FOR_INPUT, RUNNING, COMPLETED, ERROR, UNKNOWN
- [x] Research and document current Claude Code output patterns for each state
- [x] Parser receives PTY output stream and emits state change events
- [x] State changes propagate via WebSocket to frontend
- [x] Tree view status dots update live
- [x] Tab colours update live
- [x] Parser confidence monitoring: flag degraded state after 60s of unrecognised output
- [x] Degraded state: all dots fall back to ⚫
- [x] Degraded state: warning banner with link to GitHub issues
- [x] Optional: auto-file GitHub issue on degradation (requires GitHub token in Settings)
- [x] Parser is fully unit-testable in isolation

### Go/NoGo Gate → **GO** (commit `d7c74f1`)

---

## Stage 05 — Read Panel (Markdown Viewer)
**Focus:** Inline Markdown preview of core project files. Read in CCC, edit in external editor.

### Tasks
- [x] Clicking a core file in the tree opens the Read panel in the main area
- [x] Render Markdown as sanitised HTML (`marked.js` + sanitisation)
- [x] "Open in Editor" button launches configured external editor with the file path
- [x] Default external editor reads from `settings.json` (default: system default)
- [x] Read panel and terminal panel coexist per tab (toggle between them)
- [x] Markdown renders cleanly: headings, tables, code blocks, task lists
- [x] Read panel is read-only — no inline editing

### Go/NoGo Gate → **GO** (bundled with Stage 06, commit `fa14b5f`)

---

## Stage 06 — Project Versioning
**Focus:** Version management in the tree view and on disk. Projects can evolve through versioned development cycles.

### Tasks
- [x] Extend `projects.json` schema with `activeVersion` field per project
- [x] Create versioned folder structure: `docs/vX.Y/` containing concept and tasklist per version
- [x] Tree view: expand project node to show Versions list with nested version entries
- [x] Tree view: active version visually distinguished (bold, indicator, or highlight)
- [x] Tree view: expanding a version shows its core files (concept, tasklist)
- [x] Tree view: project-level status dot reflects active version's status
- [x] "New Version" action on a project: scaffolds `docs/vX.Y/` with concept and tasklist templates
- [x] New version automatically becomes active version (updates `activeVersion` in `projects.json`)
- [x] Patch version (x.y.Z) nests inside parent minor folder, gets own concept doc seeded from parent
- [x] Version completion: when final stage receives Go, prompt for Git tag matching version number
- [x] CLAUDE.md at project root reflects active version's concept doc
- [x] Migrate existing flat `docs/` projects to versioned structure on first use

### Go/NoGo Gate → **GO** (commit `fa14b5f`)

---

## Stage 07 — New Project Wizard
**Focus:** Scaffold new projects from inside CCC. CCC becomes the starting point of every project.

### Tasks
- [x] Wizard UI: step-by-step modal flow (Name → Location → Template → Group → Create)
- [x] Name input: becomes folder name and file prefix
- [x] Location input: browse or type parent directory path
- [x] Template selection: Web App / API / Script / Research / Blank (CLAUDE.md starters)
- [x] Group selection: existing groups or create new
- [x] Create: generate folder structure
  - [x] `CLAUDE.md` pre-filled from selected template
  - [x] `docs/{NAME}_concept.md` with section headers
  - [x] `docs/{NAME}_tasklist.md` with Todo/In Progress/Done skeleton
  - [x] `.claude/commands/` with starter slash commands (`/update-tasklist`, `/review-concept`, `/status`)
- [x] New project lands in **Parked** group by default
- [x] Project registered in `projects.json`

### Post-Stage 07 fixes (commit `40c1ce9`)
- [x] API hardening, loading overlay, group pruning, disk delete option

### Go/NoGo Gate → **GO** (commit `a0beeef`)

---

## Stage 08 — Import Existing Projects
**Focus:** Bring existing projects under CCC management. Non-destructive, filesystem read-only.

### Tasks
- [x] Import UI: two-phase modal (scan directory → confirm detected files)
- [x] Hard gate: block import if `*_concept.md` is absent, explain why
- [x] Auto-detect core filenames (concept, tasklist, CLAUDE.md)
- [x] Ambiguous detection: ask user to confirm mappings
- [x] Missing CLAUDE.md: offer to generate from concept doc
- [x] Missing tasklist: offer to generate from concept doc
- [x] Group assignment: existing or new
- [x] Register in `projects.json` — no filesystem writes to imported project

### Go/NoGo Gate → **GO** (commit `581d9b5`)

---

## Stage 09 — Settings Panel
**Focus:** All user-configurable preferences in one clean panel.

### Tasks
- [x] Settings panel opens when clicking ⚙ Settings in tree view
- [x] External editor: app name or binary path
- [x] Default shell: path, defaults to `$SHELL`
- [x] Theme: Light / Dark / System (with live switching)
- [x] File naming pattern: default concept and tasklist name patterns
- [x] GitHub token: optional, for auto-issue filing
- [x] All settings persist to `settings.json`
- [x] Settings panel feels consistent with the rest of the UI

### Go/NoGo Gate → **GO** (commit `774d9f3`)

---

## Stage 10 — Project Memory (SHP Storage)
**Focus:** File-based Session Handover Pack storage. CCC gives Claude Code session continuity.

### Tasks
- [x] Single-file SHP: `docs/{ProjectName}_shp.md` (overwritten each `/eod`, Git provides history)
- [x] `/start-project` slash command: reads CLAUDE.md, concept doc, tasklist, asks comprehension questions
- [x] `/eod` slash command: Claude Code generates SHP, overwrites `docs/{ProjectName}_shp.md`
- [x] `/continue` slash command: reads current SHP, feeds to Claude Code session
- [x] SHP file format: standard Markdown, human-readable, Git-friendly
- [x] SHP contains: work done, decisions made, open items, next actions, current stage status
- [x] Global slash commands installed in `~/.claude/commands/` (not per-project)
- [x] `/continue` handles no existing SHP gracefully (falls back to `/start-project` behaviour)

### Implementation note
SHP storage simplified from dated files in `docs/shp/` to a single file `docs/{ProjectName}_shp.md` that is overwritten each `/eod`. Git history serves as the archive. This avoids directory management complexity while maintaining full traceability.

### Go/NoGo Gate → **GO** (commit `1176bd0`)

---

## Stage 11 — Resilience & Polish
**Focus:** Edge cases, error states, and production-readiness.

### Tasks
- [x] First-run onboarding experience
- [x] App handles missing `projects.json` gracefully (first run)
- [x] App handles missing `settings.json` gracefully (first run)
- [x] App handles invalid project paths gracefully
- [x] Session crash recovery: detect exited PTY, offer restart
- [x] Port conflict: clear error message if PORT is already in use
- [x] `README.md` written: install, configure, run
- [x] `.env.example` complete and documented
- [x] Read panel auto-refresh
- [x] All console errors resolved
- [x] Performance: switching tabs is instant, no lag on 10+ projects

### Go/NoGo Gate → **GO** (commit `3dcecdd`)

---

## Stage 12 — Session-Version Binding & Interactive Test Runner
**Focus:** Session entry via version node, test file management, interactive test runner for Go/NoGo gates.

### Tasks

**Wave 1 — Session-Version Binding**
- [x] Project row click changed from opening tab to expand/collapse only
- [x] `openSessionTab(projectId)` using `projectId::session` tab ID scheme (double colon)
- [x] Active version row click opens session tab
- [x] Non-active version click sets version active then opens session tab
- [x] Extracted `renderSessionContent()` helper for session/terminal rendering
- [x] Session exit disposes terminal and returns to "no active session" prompt
- [x] Status dot moved from project row to active version row
- [x] Updated `getTabInfo()` and `renderTabContent()` for `::session` tab ID format

**Wave 2 — Test File Relocation**
- [x] `scanVersionFiles()` returns `{ files[], testFiles[] }` (separated by `_test_stage\d+\.md` regex)
- [x] `scanVersions()` renamed top-level `testFiles` to `flatTestFiles` for backward compat
- [x] Test files render under collapsible "Testing" sub-header inside each version node
- [x] Added `expandedTestingSections` Set for Testing sub-header expand state
- [x] Moved `docs/CCC_test_stage11.md` into `docs/v1.0/CCC_test_stage11.md`

**Wave 3 — Interactive Test Runner**
- [x] `PUT /api/file/:projectId` endpoint with path traversal protection for file write-back
- [x] `isTestFile()` helper detects `_test_stage\d+\.md` pattern
- [x] `renderTestRunner()` renders interactive panel: checkboxes, comment textareas, progress counter, Save button
- [x] `parseTestFile()` parses markdown: headings, checkbox lines, bold labels, `  > ` comment lines
- [x] `reconstructTestFile()` rebuilds markdown from parsed structure
- [x] Manual Save button only (no auto-save — explicit user preference)
- [x] `DELETE /api/projects/:id/versions/:version` endpoint with active-version protection and FS deletion
- [x] Remove button on non-active version rows with confirmation modal
- [x] Sidebar refresh button (↻) that clears `projectVersions` cache and reloads tree

**Post-Go parser fixes**
- [x] Added three PERMISSION_PATTERNS: `/Do you want to/i`, `/❯\s+\d/` (selection list), `/Esc to cancel/i`
- [x] Empty chunk filter: skip chunks that strip to empty (pure ANSI control sequences)
- [x] Decorative line filters: skip horizontal rules (`─────`), IDE hints (`/ide for`), shortcut hints (`? for shortcuts`)
- [x] Degradation check disabled (false positives on idle silence — redesign deferred to v1.1)

### Go/NoGo Gate → **GO** (commit `955643f`)

---

## Stage 13 — Cross-Platform Support
**Focus:** CCC runs on macOS, Linux, and Windows. No developer left behind.

### Tasks

**Code changes (complete)**
- [x] Audit all file paths for platform-specific assumptions — `isPathWithin()` helper with case-insensitive comparison on Windows
- [x] Audit shell assumptions — `getDefaultShell()` uses `COMSPEC`/`powershell.exe` on Windows, `/bin/sh` fallback on POSIX
- [x] Platform-aware PTY spawn args — `-Command claude` on Windows, `-i -c claude` on POSIX
- [x] `env.HOME` replaced with `os.homedir()` (cross-platform)
- [x] `2>/dev/null` replaced with `stdio: 'pipe'` (cross-platform stderr suppression)
- [x] Platform-aware editor launch — `open`/`xdg-open`/`start ""` per OS, `open -a` for macOS named apps
- [x] `SETTINGS_DEFAULTS.editor` changed from `'open'` to `''` (system default at runtime)
- [x] README install instructions cover macOS, Linux, and Windows
- [x] `.env.example` verified — no platform-specific configuration needed
- [x] OS-specific installer scripts: `tools/macos/install_CCC.sh`, `tools/linux/install_CCC.sh`, `tools/windows/install_CCC.ps1`
- [x] Release build script: `tools/build-release.sh` — produces OS-specific archives in `dist/`

**Manual testing (Phet — on target hardware)**
- [ ] Test `node-pty` compilation on Linux (document required build tools: `build-essential`, `python3`)
- [ ] Test `node-pty` compilation on Windows (document required build tools: Visual Studio Build Tools)
- [ ] Test terminal sessions on Linux — full PTY interactivity, colours, resize
- [ ] Test terminal sessions on Windows — full PTY interactivity, colours, resize
- [ ] Test "Open in Editor" on Linux (`xdg-open`) and Windows (`start ""`)
- [ ] Test project paths with spaces and special characters on all three platforms
- [ ] Test SHP and versioned folder creation on all three platforms
- [ ] All three platforms pass the full test suite

### Go/NoGo Gate → **GO** (macOS verified, Linux/Windows deferred — no target hardware available)

> Code changes complete. Linux/Windows manual testing to be done when hardware is available.

---

## Stage 14 — Housekeeping
**Focus:** Project filesystem cleanup, documentation consistency, final audit before release.

### Tasks
- [x] Tree view: test file progress counts — `CCC_test_stage01.md [6/30]` showing checked/total items
- [x] Sidebar width persistence via localStorage
- [x] Audit project folder structure — remove stray files, temp files, debug artifacts
- [x] Verify all `docs/` version folders are consistent and complete
- [x] Verify `projects.json` schema matches all implemented features
- [x] Verify `settings.json` schema matches all implemented features
- [x] Verify CLAUDE.md project structure section matches actual filesystem
- [x] Verify concept doc, tasklist, and roadmap are internally consistent
- [x] Verify CHANGELOG.md exists and is up to date for v1.0.0
- [x] Run linter / code style check across entire codebase
- [x] Remove all `console.log` debug statements (none found — all operational)
- [x] Remove all TODO/FIXME comments (none found)
- [x] Verify `.gitignore` is complete (no tracked files that should be ignored)
- [x] Remove unused `@xterm/addon-webgl` dependency

**Additional fixes during audit:**
- Updated CLAUDE.md: structure tree, file references (`docs/CCC_concept.md` → `docs/v1.0/...`), SHP description
- Created CHANGELOG.md with v1.0.0 entry
- Updated concept doc: SHP storage from dated files to single-file model
- Updated roadmap: cross-platform status reflects actual state (macOS verified, Linux/Windows code-complete)

### Go/NoGo Gate → **GO**

> Is the codebase clean enough for a public repository? **Yes.**
> Would a new contributor understand the project structure at a glance? **Yes.**

---

## Stage 15 — v1.0 Release
**Focus:** Ship it.

### Tasks
- [ ] Final README review (install instructions for macOS, Linux, Windows)
- [ ] Git repository cleaned up (no debug code, no stray files)
- [ ] `v1.0.0` tag created
- [ ] GitHub repository made public
- [ ] CCC project imported into CCC (dog food moment)

### Go/NoGo Gate
> Is this something you would recommend to another developer on any platform without hesitation?

**→ GO:** v1.0.0 shipped 🎉
**→ NOGO:** What's missing? Fix it first.

---

## Stage 16 — User Manual
**Focus:** Complete user documentation written by Claude Code from inside the running application.
**Prerequisite:** Stage 15 complete. Post-ship housekeeping (platform folder restructure) complete. CCC is running and fully functional.

### Screenshot Strategy — Playwright (Guided)
Claude Code writes all scripts. Phet runs them. No prior Playwright experience required.

```
Claude Code writes screenshot.js
    ↓
Phet runs: node screenshot.js  (CCC must be running)
    ↓
Screenshots land in docs/screenshots/
    ↓
Claude Code builds manual around them
```

Playwright installed as dev dependency only — not part of the CCC runtime.

### Tasks

**Setup**
- [ ] Claude Code writes Playwright install instructions for CCC context
- [ ] `npm install --save-dev playwright`
- [ ] `npx playwright install chromium`
- [ ] Claude Code writes `screenshot.js` — navigates every CCC screen, captures each state
- [ ] Phet runs `node screenshot.js` with CCC running
- [ ] Review screenshots together — reshoot any that need adjustment
- [ ] Screenshots committed to `docs/screenshots/`

**Full re-read before writing**
- [ ] `CLAUDE.md`
- [ ] `docs/CCC_concept.md`
- [ ] `docs/CCC_tasklist.md`
- [ ] `docs/CCC_shp.md`

**Structure confirmed with Phet before writing begins**

**Manual content**
- [ ] Cover: installation, first run, onboarding screen
- [ ] Cover: project groups, tree view, status dots, tab colours
- [ ] Cover: terminal sessions — starting, switching, background persistence
- [ ] Cover: Read panel, Open in Editor, external editor configuration
- [ ] Cover: Read panel auto-refresh (10 min)
- [ ] Cover: New Project Wizard end-to-end
- [ ] Cover: Import existing project end-to-end
- [ ] Cover: Settings panel — all configurable options
- [ ] Cover: Project versioning — creating a new version, active version pointer
- [ ] Cover: SHP workflow — `/start-project`, `/eod`, `/continue`
- [ ] Cover: Pre-GoNoGo test list — how test files are generated, reviewed in CCC, `/tested`
- [ ] Cover: Parser degradation — warning banner, what to do, auto-issue filing
- [ ] Cover: global `~/.claude/CLAUDE.md` — dedicated section with guided template
- [ ] Global CLAUDE.md template: placeholders for Git/Forgejo, Dev-Web, Dev-DB, editor, shell, stack decisions
- [ ] Cover: `.env` and `CLAUDE_REFERRAL_URL` configuration
- [ ] Cover: cross-platform note — macOS v1.0, Windows/Linux planned
- [ ] Save as `docs/USER_MANUAL.md`

**Bonus — Promotion Tour asset**
- [ ] Playwright script extended to produce animated GIF of live status dots changing
- [ ] GIF saved to `docs/screenshots/` — ready for README and Show HN post

**Final**
- [ ] Human Editorial Pass (HEP) — Phet reviews all text before publish
- [ ] All screenshot filenames and references verified in the manual

### Go/NoGo Gate
> Can a developer with no prior knowledge of CCC install, configure, and use it effectively using only this manual?
> Is the global CLAUDE.md template clear enough to fill in without assistance?
> Are screenshots crisp, correctly captioned, and representative of the final UI?

**→ GO:** User manual published. Hand off to Promotion Tour.
**→ NOGO:** Fill gaps, re-evaluate.

---

*"An assumption is the first step in a major cluster fuck." — Keep it sharp.*
