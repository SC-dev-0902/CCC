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
- [x] Tree view: render hardcoded project groups (Active, Bug Fixing, Parked)
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
- [ ] Integrate `node-pty` on the server
- [ ] WebSocket server (`ws`) — one connection per terminal session
- [ ] Integrate `xterm.js` in the frontend
- [ ] Spawn PTY session in project directory on demand
- [ ] Full bidirectional input/output between xterm.js and PTY
- [ ] Terminal resize handling (cols/rows sync on window resize)
- [ ] Sessions persist in background when switching tabs
- [ ] Terminal auto-start: "Start Claude Code" / "Open Shell" prompt for new sessions
- [ ] Session state tracked per project (active / exited)
- [ ] Keyboard shortcuts work: Ctrl+C, Ctrl+D, arrow keys, tab completion, history
- [ ] Colours and formatting: 256-colour / truecolor via xterm.js
- [ ] Scroll back through session history

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
- [ ] Create `src/parser.js` — isolated, single responsibility
- [ ] Define the five state patterns: WAITING_FOR_INPUT, RUNNING, COMPLETED, ERROR, UNKNOWN
- [ ] Research and document current Claude Code output patterns for each state
- [ ] Parser receives PTY output stream and emits state change events
- [ ] State changes propagate via WebSocket to frontend
- [ ] Tree view status dots update live
- [ ] Tab colours update live
- [ ] Parser confidence monitoring: flag degraded state after 60s of unrecognised output
- [ ] Degraded state: all dots fall back to ⚫
- [ ] Degraded state: warning banner with link to GitHub issues
- [ ] Optional: auto-file GitHub issue on degradation (requires GitHub token in Settings)
- [ ] Parser is fully unit-testable in isolation

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
- [ ] Clicking a core file in the tree opens the Read panel in the main area
- [ ] Render Markdown as sanitised HTML (`marked.js` + sanitisation)
- [ ] "Open in Editor" button launches configured external editor with the file path
- [ ] Default external editor reads from `settings.json` (default: system default)
- [ ] Read panel and terminal panel coexist per tab (toggle between them)
- [ ] Markdown renders cleanly: headings, tables, code blocks, task lists
- [ ] Read panel is read-only — no inline editing

### Go/NoGo Gate
> Can you read CLAUDE.md and the tasklist comfortably without leaving CCC?
> Does "Open in Editor" reliably launch the correct file in the correct editor?

**→ GO:** Proceed to Stage 06
**→ NOGO:** Fix rendering or editor launch issues, re-evaluate

---

## Stage 06 — New Project Wizard
**Focus:** Scaffold new projects from inside CCC. CCC becomes the starting point of every project.

### Tasks
- [ ] Wizard UI: step-by-step flow (Name → Location → Template → Group → Create)
- [ ] Name input: becomes folder name and file prefix
- [ ] Location input: browse or type parent directory path
- [ ] Template selection: Web App / API / Script / Research / Blank (CLAUDE.md starters)
- [ ] Group selection: existing groups or create new
- [ ] Create: generate folder structure
  - [ ] `CLAUDE.md` pre-filled from selected template
  - [ ] `docs/{NAME}_concept.md` with section headers
  - [ ] `docs/{NAME}_tasklist.md` with Todo/In Progress/Done skeleton
  - [ ] `.claude/commands/` with starter slash commands (`/update-tasklist`, `/review-concept`, `/status`)
  - [ ] `.ccc-project.json` (CCC metadata, gitignored)
- [ ] New project lands in **Parked** group by default
- [ ] Project registered in `projects.json`

### Go/NoGo Gate
> Can you create a new project end-to-end in under 60 seconds?
> Are all scaffolded files correct and immediately usable?
> Does the project land in Parked as expected?

**→ GO:** Proceed to Stage 07
**→ NOGO:** Fix wizard flow or scaffolding issues, re-evaluate

---

## Stage 07 — Import Existing Projects
**Focus:** Bring existing projects under CCC management. Non-destructive, filesystem read-only.

### Tasks
- [ ] Import UI: point at existing directory
- [ ] Hard gate: block import if `*_concept.md` is absent, explain why
- [ ] Auto-detect core filenames (concept, tasklist, CLAUDE.md)
- [ ] Ambiguous detection: ask user to confirm mappings
- [ ] Missing CLAUDE.md: offer to generate from concept doc (via Claude.ai redirect or API if configured)
- [ ] Missing tasklist: offer to generate from concept doc
- [ ] Group assignment: existing or new
- [ ] Register in `projects.json` — no filesystem writes to imported project

### Go/NoGo Gate
> Does import work cleanly for projects that follow the naming convention?
> Is the hard gate on missing concept doc clear and instructive?
> Is import genuinely non-destructive?

**→ GO:** Proceed to Stage 08
**→ NOGO:** Fix import flow, re-evaluate

---

## Stage 08 — Settings Panel
**Focus:** All user-configurable preferences in one clean panel.

### Tasks
- [ ] Settings panel opens when clicking ⚙ Settings in tree view
- [ ] External editor: app name or binary path, with test button
- [ ] Default shell: path, defaults to `$SHELL`
- [ ] Theme: Light / Dark / System
- [ ] File naming pattern: default concept and tasklist name patterns
- [ ] GitHub token: optional, for auto-issue filing
- [ ] All settings persist to `settings.json`
- [ ] Settings panel feels consistent with the rest of the UI

### Go/NoGo Gate
> Can you configure all settings and have them persist across restarts?
> Does the external editor launch correctly after configuration?

**→ GO:** Proceed to Stage 09
**→ NOGO:** Fix settings persistence or editor issues, re-evaluate

---

## Stage 09 — Resilience & Polish
**Focus:** Edge cases, error states, and production-readiness.

### Tasks
- [ ] Parser degradation: auto-issue filing tested end-to-end
- [ ] App handles missing `projects.json` gracefully (first run)
- [ ] App handles missing `settings.json` gracefully (first run)
- [ ] App handles invalid project paths gracefully
- [ ] Session crash recovery: detect exited PTY, offer restart
- [ ] Port conflict: clear error message if PORT is already in use
- [ ] `README.md` written: install, configure, run
- [ ] `.env.example` complete and documented
- [ ] All console errors resolved
- [ ] Performance: switching tabs is instant, no lag on 10+ projects

### Go/NoGo Gate
> Is CCC stable enough to use as your daily driver?
> Would you be comfortable sharing this on GitHub today?

**→ GO:** Proceed to Stage 10
**→ NOGO:** Fix stability issues, re-evaluate

---

## Stage 10 — v1.0 Release
**Focus:** Ship it.

### Tasks
- [ ] Final README review
- [ ] Git repository cleaned up (no debug code, no stray files)
- [ ] `v1.0.0` tag created
- [ ] GitHub repository made public
- [ ] CCC project imported into CCC (dog food moment)

### Go/NoGo Gate
> Is this something you would recommend to another developer without hesitation?

**→ GO:** v1.0.0 shipped 🎉
**→ NOGO:** What's missing? Fix it first.

---

*"An assumption is the first step in a major cluster fuck." — Keep it sharp.*
