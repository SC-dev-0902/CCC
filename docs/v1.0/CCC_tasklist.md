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

### Go/NoGo Gate
> Does the layout feel right to live in all day?
> Is the status dot concept immediately readable at a glance?
> Would you be comfortable showing this to another developer?

**→ GO:** Proceed to Stage 02
**→ NOGO:** Revise UI, re-evaluate — do not proceed

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

### Go/NoGo Gate
> Do projects persist correctly across app restarts?
> Does drag & drop feel natural and reliable?

**→ GO:** Proceed to Stage 03
**→ NOGO:** Fix persistence issues, re-evaluate

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

### Go/NoGo Gate
> Can you run Claude Code in a terminal tab and interact with it fully?
> Does switching tabs leave sessions running in the background?
> Would this replace a native terminal window for Claude Code work?

**→ GO:** Proceed to Stage 04
**→ NOGO:** Fix terminal issues, re-evaluate

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

### Go/NoGo Gate
> Do status dots accurately reflect Claude Code state in real usage?
> Does the degraded state fallback work correctly?
> Is the parser truly isolated — no other file touches raw output parsing?

**→ GO:** Proceed to Stage 05
**→ NOGO:** Refine parser patterns, re-evaluate

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

### Go/NoGo Gate
> Can you read CLAUDE.md and the tasklist comfortably without leaving CCC?
> Does "Open in Editor" reliably launch the correct file in the correct editor?

**→ GO:** Proceed to Stage 06
**→ NOGO:** Fix rendering or editor launch issues, re-evaluate

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

### Go/NoGo Gate
> Can you create a new version of an existing project and see it in the tree?
> Does the active version pointer persist correctly across restarts?
> Is the versioned folder structure on disk clean and human-readable?

**→ GO:** Proceed to Stage 07
**→ NOGO:** Fix versioning issues, re-evaluate

---

## Stage 07 — New Project Wizard
**Focus:** Scaffold new projects from inside CCC. CCC becomes the starting point of every project.

### Tasks
- [x] Wizard UI: step-by-step flow (Name → Location → Template → Group → Create)
- [x] Name input: becomes folder name and file prefix
- [x] Location input: browse or type parent directory path
- [x] Template selection: Web App / API / Script / Research / Blank (CLAUDE.md starters)
- [x] Group selection: existing groups or create new
- [x] Create: generate folder structure
  - [x] `CLAUDE.md` pre-filled from selected template
  - [x] `docs/{NAME}_concept.md` with section headers
  - [x] `docs/{NAME}_tasklist.md` with Todo/In Progress/Done skeleton
  - [x] `.claude/commands/` with starter slash commands (`/update-tasklist`, `/review-concept`, `/status`)
  - [x] `.ccc-project.json` (CCC metadata, gitignored)
- [x] New project lands in **Parked** group by default
- [x] Project registered in `projects.json`

### Go/NoGo Gate
> Can you create a new project end-to-end in under 60 seconds?
> Are all scaffolded files correct and immediately usable?
> Does the project land in Parked as expected?

**→ GO:** Proceed to Stage 08
**→ NOGO:** Fix wizard flow or scaffolding issues, re-evaluate

---

## Stage 08 — Import Existing Projects
**Focus:** Bring existing projects under CCC management. Non-destructive, filesystem read-only.

### Tasks
- [x] Import UI: point at existing directory
- [x] Hard gate: block import if `*_concept.md` is absent, explain why
- [x] Auto-detect core filenames (concept, tasklist, CLAUDE.md)
- [x] Ambiguous detection: ask user to confirm mappings
- [x] ~~Missing CLAUDE.md: offer to generate from concept doc~~ — Skipped: info notice only, user creates docs via Claude.ai before import
- [x] ~~Missing tasklist: offer to generate from concept doc~~ — Skipped: info notice only, user creates docs via Claude.ai before import
- [x] Group assignment: existing or new
- [x] Register in `projects.json` — no filesystem writes to imported project

### Go/NoGo Gate
> Does import work cleanly for projects that follow the naming convention?
> Is the hard gate on missing concept doc clear and instructive?
> Is import genuinely non-destructive?

**→ GO:** Proceed to Stage 09
**→ NOGO:** Fix import flow, re-evaluate

---

## Stage 09 — Settings Panel
**Focus:** All user-configurable preferences in one clean panel.

### Tasks
- [x] Settings panel opens when clicking ⚙ Settings in tree view
- [x] External editor: app name or binary path, with test button
- [x] Default shell: path, defaults to `$SHELL`
- [x] Theme: Light / Dark / System
- [x] File naming pattern: default concept and tasklist name patterns
- [x] GitHub token: optional, for auto-issue filing
- [x] All settings persist to `settings.json`
- [x] Settings panel feels consistent with the rest of the UI

### Go/NoGo Gate
> Can you configure all settings and have them persist across restarts?
> Does the external editor launch correctly after configuration?

**→ GO:** Proceed to Stage 10
**→ NOGO:** Fix settings persistence or editor issues, re-evaluate

---

## Stage 10 — Project Memory (SHP Storage)
**Focus:** File-based Session Handover Pack. One file per project. CCC gives Claude Code session continuity.

### Tasks
- [x] `/start-project` slash command: reads CLAUDE.md, concept doc, tasklist, asks comprehension questions — global command at `~/.claude/commands/`, works without CCC running
- [x] `/eod` slash command: Claude Code writes complete SHP, CCC overwrites `docs/{ProjectName}_shp.md` — global command at `~/.claude/commands/`
- [x] `/continue` slash command: CCC reads current SHP, feeds to Claude Code session — global command at `~/.claude/commands/`
- [x] SHP file format: standard Markdown, human-readable, Git-friendly
- [x] SHP standard: a fresh session reading it can start work immediately without re-reading source files
- [x] SHP contains: full timeline, API inventory, state model, parser state machine, path resolution, architecture decisions, dependencies, known gotchas, current stage status
- [x] One file per project — `docs/{ProjectName}_shp.md` — always overwritten at `/eod`
- [x] Git captures SHP history — no dated archive folder needed
- [x] Global slash commands installed in `~/.claude/commands/` (not per-project)
- [x] CCC UI: current SHP visible per project (Read panel)
- [x] CCC handles missing SHP gracefully (first session — falls back to `/start-project` behaviour)

### Go/NoGo Gate
> Does `/eod` produce a complete SHP that meets the standard?
> Does `/continue` pick up context seamlessly without re-reading source files?
> Would you trust this to carry your project context across sessions?

**→ GO:** Proceed to Stage 11
**→ NOGO:** Fix SHP generation or retrieval issues, re-evaluate

---

## Stage 11 — Resilience & Polish
**Focus:** Edge cases, error states, and production-readiness.

### Tasks
- [ ] Parser degradation: auto-issue filing tested end-to-end
- [ ] App handles missing `projects.json` gracefully (first run)
- [ ] App handles missing `settings.json` gracefully (first run)
- [ ] App handles invalid project paths gracefully
- [ ] Session crash recovery: detect exited PTY, offer restart
- [ ] Port conflict: clear error message if PORT is already in use
- [ ] **Read panel auto-refresh every 10 minutes** — picks up external edits made in CotEditor without manual reload
- [ ] **First-run onboarding: run `claude --version` on startup**
  - [ ] SUCCESS → proceed to main UI normally
  - [ ] FAIL → show onboarding screen: *"CCC requires Claude Code. It looks like Claude Code isn't installed or authenticated yet."*
  - [ ] Onboarding screen shows "Get Claude Code →" button linking to `CLAUDE_REFERRAL_URL` from `.env` (falls back to `https://claude.ai` if not set)
  - [ ] Onboarding screen shows instructions for users who have Claude Code but haven't authenticated
  - [ ] Check runs silently on every subsequent launch — onboarding only reappears if `claude` is no longer detected
  - [ ] Add `CLAUDE_REFERRAL_URL` to `.env.example` with comment explaining its purpose
- [ ] `README.md` written: install, configure, run (includes macOS target note)
- [ ] `.env.example` complete and documented
- [ ] All console errors resolved
- [ ] Performance: switching tabs is instant, no lag on 10+ projects

### Go/NoGo Gate
> Is CCC stable enough to use as your daily driver?
> Would you be comfortable sharing this on GitHub today?

**→ GO:** Proceed to Stage 12
**→ NOGO:** Fix stability issues, re-evaluate

---

## Stage 12 — v1.0 Release
**Focus:** Ship it.

### Tasks
- [ ] Final README review (must state macOS target, cross-platform planned)
- [ ] Git repository cleaned up (no debug code, no stray files)
- [ ] `v1.0.0` tag created
- [ ] GitHub repository made public
- [ ] CCC project imported into CCC (dog food moment)
- [ ] **Post-ship housekeeping:** restructure to `platform/macos/` folder before v1.1 development begins — not a version bump, just tidying the house

### Go/NoGo Gate
> Is this something you would recommend to another developer without hesitation?

**→ GO:** v1.0.0 shipped 🎉 → then housekeeping → then v1.1 planning
**→ NOGO:** What's missing? Fix it first.

---

---

## Stage 13 — User Manual
**Focus:** Complete user documentation written by Claude Code from inside the running application.
**Prerequisite:** Stage 12 complete. Post-ship housekeeping (platform/macos/ restructure) complete. CCC is running and fully functional.

### Tasks
- [ ] Claude Code does a full re-read of all project documents before starting:
  - [ ] `CLAUDE.md`
  - [ ] `docs/CCC_concept.md`
  - [ ] `docs/CCC_tasklist.md`
  - [ ] `docs/CCC_shp.md` (current state)
- [ ] Define user manual structure and confirm with Phet before writing
- [ ] Screenshot every meaningful UI state from the running CCC instance
- [ ] Write manual sections around screenshots — no placeholder content
- [ ] Cover: installation, first run, onboarding screen, project groups, tree view
- [ ] Cover: terminal sessions, status dots, tab colours, switching between projects
- [ ] Cover: Read panel, Open in Editor, external editor configuration
- [ ] Cover: New Project Wizard end-to-end
- [ ] Cover: Import existing project end-to-end
- [ ] Cover: Settings panel — all configurable options
- [ ] Cover: Project versioning — creating a new version, active version pointer
- [ ] Cover: SHP workflow — `/start-project`, `/eod`, `/continue`, `/tested`
- [ ] Cover: Pre-Go/NoGo test list workflow — how test files are generated, reviewed in CCC, and processed
- [ ] Cover: global `~/.claude/CLAUDE.md` setup — dedicated section with guided template
- [ ] Global CLAUDE.md template: placeholders for Git/Forgejo, Dev-Web, Dev-DB, editor, shell, stack decisions
- [ ] Cover: `.env` configuration and `CLAUDE_REFERRAL_URL`
- [ ] Cover: parser degradation — what the warning banner means and what to do
- [ ] Cover: cross-platform note — macOS v1.0, Windows/Linux planned
- [ ] Human Editorial Pass (HEP) — Phet reviews all text before publish
- [ ] Save as `docs/USER_MANUAL.md`
- [ ] **Update global `~/.claude/CLAUDE.md` to v0.3:**
  - [ ] Replace all "Manfred" references with "Phet"
  - [ ] Add server start rule: prepare everything, wait for explicit "Yes" before starting
  - [ ] Add pre-Go/NoGo test list rule: generate `docs/{ProjectName}_test_stageXX.md` before every gate
  - [ ] Add `/tested` as 4th global slash command

### Go/NoGo Gate
> Is the manual complete enough that a developer with no prior knowledge of CCC could install, configure, and use it effectively?
> Is the global CLAUDE.md template clear enough to fill in without assistance?

**→ GO:** User manual published. Hand off to Promotion Tour.
**→ NOGO:** Fill gaps, re-evaluate.
---

*"An assumption is the first step in a major cluster fuck." — Keep it sharp.*
