# Claude Command Center (CCC)
**Concept Document v1.0**
*A unified dashboard for managing multiple Claude Code sessions*

---

## The Problem

Working with Claude Code across multiple projects inevitably creates terminal sprawl: a growing collection of open terminal windows, browser tabs, and Finder windows with no unified view. Switching between projects means hunting for the right window, losing context, and missing moments when Claude is waiting for a decision. There is no single place that answers the question: *"What needs my attention right now?"*

---

## The Vision

CCC is a local web application that acts as a command center for all Claude Code sessions. It is not a terminal emulator, not a file browser, and not a project manager in the traditional sense. It is a **control panel for a fleet of AI agents** — always open, always current, telling you at a glance who is busy, who is done, and who is waiting for you.

It runs locally, requires no cloud account, and is fully distributable via Git so any developer fighting the same battle can use it with their own projects and preferences.

---

## Core Concepts

### Document Naming & Location Convention

Document names are always derived from the **project folder name** — no versioning in filenames, ever. Version history lives in Git.

```
CCC/
├── CLAUDE.md                  ← project root (Claude Code requires this location)
└── docs/
    ├── CCC_concept.md         ← concept document
    └── CCC_tasklist.md        ← tasklist

TradingMaster/
├── CLAUDE.md
└── docs/
    ├── TradingMaster_concept.md
    └── TradingMaster_tasklist.md
```

The pattern is always: `{ProjectFolderName}_concept.md` and `{ProjectFolderName}_tasklist.md`, stored in `/docs/`. `CLAUDE.md` always lives at the project root — this is required by Claude Code.

**Note:** For versioned projects, concept and tasklist files live inside version subdirectories within `docs/`. See **Project Versioning** for the full folder structure. The naming convention (`{ProjectFolderName}_concept.md`, `{ProjectFolderName}_tasklist.md`) remains the same — only the directory changes.

---

### Document Hierarchy

Every CCC project is built on a strict document hierarchy. These are not independent files — each is derived from the one above it:

```
Owner-Concept
    ↓  (raw brain dump — your thoughts, unstructured)
*_concept.md
    ↓  (structured, Claude-compliant project concept)
CLAUDE.md
    ↓  (Claude Code's behavioural instructions, derived from concept)
*_tasklist.md
    (stage-gated task breakdown, derived from concept)
```

**Owner-Concept** is informal input — notes, ideas, a brain dump — that the developer brings to Claude.ai to produce a structured concept doc. It is not stored as a project file; it is the raw material that feeds the process.

**`*_concept.md`** is the foundation of the project. Everything else is derived from it. If the concept changes, CLAUDE.md and the tasklist may need updating too.

**Filename versioning rule:** The concept doc filename never changes. There is always exactly one `*_concept.md` per project — no `_v0.5`, no `_v0.6` in the filename. Version history lives in Git, not in filenames. Claude Code always reads one file with one known name, and it is always the current version. The version number lives inside the document header for human reference only.

**`CLAUDE.md`** is never written from scratch independently. It is always generated from the concept doc. It contains Claude Code's instructions, constraints, and behavioural rules specific to this project.

**`*_tasklist.md`** is always generated from the concept doc. It contains the stage-gated task breakdown that drives development.

This hierarchy is enforced by CCC — see Import Rules below.

---

### Project
A project is a directory on disk that CCC tracks. Each project has:
- A **name** (human-readable label)
- A **path** (absolute path on the local machine, stored as relative/configurable so the repo is portable)
- A **group** (for organization in the tree view)
- A **status** (derived live from its terminal session)
- Three **core files**: `*_concept.md`, `CLAUDE.md`, and `*_tasklist.md` (filenames configurable per project)

### Session
A session is a live terminal process (Claude Code or a shell) attached to a project. Sessions are created on demand and persist until closed. Each project can have one active session.

### Group
A named folder in the tree view that contains projects. Groups are user-defined and a project can belong to one group at a time. Projects can be moved between groups via drag & drop. Default groups: Active, Parked. Users can create custom groups (e.g., Client A, Research).

---

### Project Versioning

A project in CCC is not a single pass from start to finish. Projects evolve — v1.0 ships, then v1.1 adds features, then v2.0 reimagines the concept. CCC models this explicitly: each **version** of a project is a full development cycle with its own concept doc, tasklist, stage progression, and Go/NoGo gates.

#### Version Types

| Type | Pattern | Meaning | Has own concept doc? | Has own tasklist? |
|------|---------|---------|----------------------|-------------------|
| Major | X.0 | Major update, new or substantially revised concept | Yes | Yes |
| Minor | x.Y | New feature integration, expanded concept | Yes | Yes |
| Patch | x.y.Z | Bug fix / repair | Yes — seeded from parent minor version's concept | Yes |

A major or minor version represents a new mandate for the project. It gets its own concept doc (which may be entirely new or an evolution of the previous one), its own tasklist, and its own full stage progression from Stage 01 to Stage 12.

A patch version is a focused repair cycle. It gets its own concept doc (seeded from the parent minor version's concept as a starting point), its own tasklist, and its own stage progression.

#### Versioned Folder Structure

Version documents live in versioned subdirectories inside `docs/`:

```
CCC/
├── CLAUDE.md                       ← project root (always current version)
├── .env
└── docs/
    ├── v1.0/
    │   ├── CCC_concept.md          ← v1.0 concept
    │   └── CCC_tasklist.md         ← v1.0 tasklist
    ├── v1.1/
    │   ├── CCC_concept.md          ← v1.1 concept (expanded or new)
    │   ├── CCC_tasklist.md         ← v1.1 tasklist
    │   └── v1.1.1/
    │       ├── CCC_concept.md     ← bugfix concept (seeded from v1.1 concept)
    │       └── CCC_tasklist.md    ← bugfix tasklist
    └── v2.0/
        ├── CCC_concept.md          ← v2.0 concept (major revision)
        └── CCC_tasklist.md         ← v2.0 tasklist
```

The `docs/` folder becomes the versioned knowledge base of the project. Open it in Finder and the full lineage is visible at a glance.

**CLAUDE.md remains at the project root.** It is always derived from the active version's concept doc and is updated when the active version changes.

#### Active Version Pointer

The active version is tracked in `projects.json` via an `activeVersion` field per project — not via filesystem symlinks. Symlinks are fragile across platforms (Windows requires elevated permissions, Git stores them as text files) and add unnecessary filesystem complexity. The JSON pointer is explicit, portable, and already part of CCC's persistence model.

When a new version is created, CCC updates `activeVersion` in `projects.json` and regenerates or prompts for an updated CLAUDE.md derived from the new version's concept doc.

#### Tree View with Versions

The tree view expands to show versions nested under the project:

```
▾ Active
  ▾ CCC                           🔴
    ▾ Versions
        v1.0                       🟢
        ▾ v1.1                     🔴  ← active version
            📄 CCC_concept.md
            📄 CCC_tasklist.md
            v1.1.1                 ⚫
        v2.0                       ⚫
    📄 CLAUDE.md
```

The active version is visually distinguished. Expanding a version shows its core files. The project-level status dot reflects the active version's status.

#### Version Lifecycle

1. Developer creates a new version from within CCC (via a "New Version" action on the project)
2. CCC scaffolds the version folder inside `docs/` with concept and tasklist templates
3. The new version becomes the active version
4. Development proceeds through the stage-gated process (stages, Go/NoGo gates)
5. When the final stage receives a Go, CCC prompts for a Git tag matching the version number (e.g., `v1.1.0`)
6. The version is marked as completed (🟢)
7. The project can continue with a new version or remain on the completed one

---

## Importing Existing Projects

CCC provides an Import flow for bringing existing projects under CCC management. Import is distinct from the New Project Wizard — it does not scaffold files, it registers an existing directory.

### Import Rules — Hard Gate

**A project cannot be imported unless `*_concept.md` is present.** This is a non-negotiable requirement. The concept doc is the foundation of the document hierarchy; without it, CLAUDE.md and the tasklist have no verified source of truth.

If `*_concept.md` is missing, CCC blocks the import and explains why:
> *"No concept document found. CCC requires a concept doc before importing. Use Claude.ai to create one from your project idea, then try again."*

### Import Flow (when concept doc is present)

1. User points CCC at an existing directory
2. CCC scans for the three core files:
   - `*_concept.md` — **required** (blocks import if absent)
   - `CLAUDE.md` — optional; if missing, CCC offers to generate one from the concept doc
   - `*_tasklist.md` — optional; if missing, CCC offers to generate one from the concept doc
3. CCC auto-detects filenames and pre-fills mappings; if ambiguous, it asks
4. User assigns a name and group
5. Project is registered in `projects.json`

**Import is read-only on the filesystem.** CCC never moves, modifies, or deletes files in an existing project directory. It only writes to `projects.json`.

### What to do if you have no concept doc

Any CCC user has access to Claude.ai. The recommended flow for projects without a concept doc:

1. Gather your raw notes and ideas (Owner-Concept)
2. Open Claude.ai and ask it to produce a structured `*_concept.md` from your notes
3. From the concept doc, ask Claude.ai to generate `CLAUDE.md` and `*_tasklist.md`
4. Save all three files into the project directory
5. Import into CCC

---

## New Projects — Default Group

All projects created via the New Project Wizard are placed in **Parked** by default. A freshly scaffolded project has no active session and no work in progress — it is ready but not yet in play. The developer consciously drags it to Active when they are ready to begin. This drag is an intentional act, not an automatic one.

---

## Application Layout

```
┌─────────────────────┬──────────────────────────────────────────────┐
│  TREE VIEW (left)   │  MAIN PANEL (right)                          │
│                     │                                              │
│  ⬡ CCC             │  [ Tab: Project A ] [ Tab: Project B ] ...   │
│                     │                                              │
│  ▾ Active           │  ┌────────────────────────────────────────┐  │
│    Project A   🔴   │  │                                        │  │
│    Project B   🟡   │  │   Terminal / Markdown / Settings view  │  │
│    Legacy API  🟠   │  │                                        │  │
│                     │  │                                        │  │
│  ▾ Parked           │  │                                        │  │
│    Experiment  ⚫   │  │                                        │  │
│                     │  └────────────────────────────────────────┘  │
│  ─────────────────  │                                              │
│  ⚙ Settings        │                                              │
└─────────────────────┴──────────────────────────────────────────────┘
```

### Tree View
The left panel is the full navigation spine of the app. It contains:
- **Project groups** (collapsible) with projects listed inside
- **Status indicator** per project (colored dot, see Status Model)
- **Expandable project node** showing the three core files as clickable children
- **Settings** entry at the bottom, always visible, opens the settings view in the main panel
- **Drag & drop** to reorder projects and move them between groups

### Main Panel
The right panel is tab-based. Each open project gets a tab. The tab itself carries the status color so state is visible even when not on that tab. Inside each tab, the view can be:

1. **Terminal view** — a fully interactive embedded terminal (xterm.js + node-pty) running the Claude Code session for that project
2. **Read panel** — a rendered Markdown preview of any core file (CLAUDE.md, concept, tasklist), with an "Open in Editor" button that launches the configured external editor
3. **Settings panel** — app configuration (only one, shared, not per-tab)

---

## Terminal View — Full Interactivity

The terminal view is not a log viewer or a read-only output pane. It is a **full PTY (pseudo-terminal) session** — functionally identical to a native terminal window. This is non-negotiable: the entire value of CCC collapses if you still need to switch to iTerm to actually *do* anything.

Full interactivity means:

- **Respond to Claude Code prompts** — approval prompts, yes/no decisions, file confirmations — directly in the terminal, exactly as you would in a normal terminal
- **Chat with Claude Code** — type instructions, follow-up messages, corrections
- **Run arbitrary shell commands** — `git status`, `ls`, `cat file.txt`, anything
- **Keyboard shortcuts work as expected** — Ctrl+C, Ctrl+D, arrow keys, tab completion, history navigation (↑↓)
- **Scroll back through session history** — review what Claude did, what changed, what errored
- **Copy/paste** — select output to copy, paste paths or snippets in
- **Colours and formatting preserved** — Claude Code's rich terminal output (syntax highlighting, spinners, progress bars) renders correctly via xterm.js with full 256-colour / truecolor support

The terminal session persists as long as CCC is open. Switching to a different project tab does not kill or suspend the session — it keeps running in the background, and its status dot updates accordingly. Switching back to the tab resumes the view exactly where you left it.

---

## Status Model

Status is detected by parsing the output stream of the Claude Code terminal session.

| Color  | Meaning                                                      |
|--------|--------------------------------------------------------------|
| 🔴 Red    | Claude is waiting for a decision (approval prompt, yes/no, file confirmation) |
| 🟡 Yellow | Claude is actively running / thinking — do not interrupt     |
| 🟢 Green  | Task completed, session idle, waiting for next instruction   |
| 🟠 Orange | Error state detected                                         |
| ⚫ Grey   | No active session / project not started                      |

Status is reflected in both the tree view dot and the tab color in the main panel.

---

## Tree View — Project Node Structure

When a project node is expanded in the tree:

```
▾ Project A                    🔴
    📄 CLAUDE.md
    📄 PROJECT_A_concept.md
    📄 PROJECT_A_tasklist.md
```

Clicking a file opens it in the **Read panel** (rendered Markdown). An "Open in Editor" button in the read panel launches the configured external editor (e.g. CotEditor, VS Code, Cursor).

Core file names are configurable per project in the project settings, with sensible defaults:
- `CLAUDE.md`
- `{PROJECT_NAME}_concept.md`
- `{PROJECT_NAME}_tasklist.md`

---

## Custom Slash Commands

Claude Code's `/` menu is fully extensible. Custom commands are defined as Markdown files placed in `.claude/commands/` inside the project directory. The filename becomes the slash command name. CCC leverages this in two ways:

### CCC-generated commands (via the New Project Wizard)
When CCC scaffolds a new project, it automatically creates a `.claude/commands/` directory with a set of starter commands tailored to the CCC workflow:

| Command | What it does |
|---|---|
| `/update-tasklist` | Instructs Claude to reflect current progress into `PROJECT_tasklist.md` |
| `/review-concept` | Asks Claude to re-read `PROJECT_concept.md` and flag any drift from current implementation |
| `/status` | Asks Claude to give a brief summary of where the project stands |

These are plain Markdown files — the user can edit, remove, or add their own freely.

### User-defined commands visible in CCC
In a future version, CCC could read the `.claude/commands/` directory per project and surface available commands in the UI — so you can trigger a slash command from the CCC interface without typing it, especially useful when responding to a waiting session.

---

## Terminal Auto-Start Behaviour

When a project is opened in CCC (either by clicking it in the tree view, or when the app first loads), CCC handles the terminal session as follows:

**Scenario 1 — New project, no active session:**
CCC shows a clean terminal panel with a prompt:
> *"No active session. Start Claude Code in this project?"*
> `[ Start Claude Code ]` `[ Open Shell ]`

Choosing **Start Claude Code** launches `claude` in the project directory automatically — no need to navigate there manually. Choosing **Open Shell** opens a plain interactive shell in the project directory, for cases where the user wants to run commands first.

**Scenario 2 — Returning to an existing session:**
If Claude Code is already running in the background (the project has a live PTY session), switching to its tab simply resumes the view — no interruption, no restart. The session has been running the whole time; the tab just brings it back into focus.

**Scenario 3 — Session exited:**
If the session ended (Claude Code finished or was closed), CCC detects this and shows the prompt again, offering to start a new session.

This means the workflow is: *create project in wizard → switch to terminal tab → one click → Claude Code is running.* No cd, no separate terminal window, no hunting for the right directory.

---

## New Project Wizard

CCC can scaffold a new project from scratch. The wizard flow:

1. **Name** — enter project name (used for folder name and file naming)
2. **Location** — pick or type a parent directory path
3. **Template** — choose a CLAUDE.md starter template (Web App, API, Script, Research, Blank)
4. **Group** — assign to an existing group or create a new one
5. **Create** — CCC creates the folder and scaffolds:

```
my-project/
├── CLAUDE.md                    ← pre-filled from selected template
├── MY-PROJECT_concept.md        ← blank template with section headers
├── MY-PROJECT_tasklist.md       ← skeleton: Todo / In Progress / Done
└── .ccc-project.json            ← CCC metadata (not committed, in .gitignore)
```

---

## Configuration

All configuration is stored in `projects.json` at the app root. This file is the portable project registry — it contains project names, paths, and groups, but not machine-specific absolute paths. Each user maps their own local paths on first setup.

### App-level settings (via Settings panel)
- **External editor**: app name or binary path (default: system default)
- **Default shell**: path to shell binary (default: `$SHELL`)
- **Theme**: Light / Dark / System
- **Core file naming pattern**: default pattern for concept and tasklist filenames

### Per-project settings
- Custom name for each of the three core files (overrides app-level pattern)
- Group membership
- Notes / description (optional)

---

## Staged Development Approach

### UI/UX First

Before any backend code is written, CCC is built as a **static UI shell** — hardcoded data, no real terminals, no WebSocket, no server logic. This is Stage 01 and it produces something you can look at, click through, and live in.

The rationale: the entire value proposition of CCC is the *feel* of the interface — the tree view, the tab colours, the split pane. If those feel wrong, no amount of backend work saves it. Validating the UI first means any structural changes happen before the plumbing exists, when they are cheap.

**Stage 01 is a Go/NoGo gate on the interface itself.** Only when the UI feels right does backend development begin.

### Stage Gate Process

All development proceeds in defined stages. Each stage has:
- A clear focus and a defined set of tasks
- A Go/NoGo decision at the end before Stage N+1 begins
- Claude Code never begins the next stage without an explicit Go from the developer

---

| Concern         | Technology                          |
|-----------------|-------------------------------------|
| Server          | Node.js + Express                   |
| Terminal        | node-pty (PTY) + xterm.js (frontend) |
| WebSocket       | ws library                          |
| Frontend        | Vanilla JS or lightweight framework |
| Markdown render | marked.js + sanitized HTML          |
| Persistence     | JSON files (projects.json, settings.json) |
| Distribution    | Git repository, npm start           |

No database. No cloud. No accounts. Runs on `localhost:PORT`.

---

## Environment Configuration

CCC is a local application. It runs on localhost and stays on localhost. No deployment, no virtual folders, no cloud.

The only configurable environment variable is the **port** — to prevent clashes with other tools running on the same machine:

```
PORT=3000
```

Defined once in a `.env` file at the project root. The `.env` file is in `.gitignore` — never committed. The repo ships with `.env.example`:

```
# CCC Environment Configuration
PORT=3000
```

**The port is never hardcoded anywhere in the codebase.** This is a standing instruction in CLAUDE.md so Claude Code always reads from the environment variable, not a literal value.

---

## Distribution & Portability

CCC is distributed as a Git repository. To use it:

```bash
git clone https://github.com/you/ccc
cd ccc
npm install
npm start
# open http://localhost:3000
```

Project paths in `projects.json` use a path mapping system so the file can be committed to Git without containing machine-specific absolute paths. Each user configures their own root path prefix on first launch.

---

## Maintenance & Resilience

### The Fragile Dependency

CCC's status detection — the feature that makes the whole colour-coded premise work — depends on parsing Claude Code's terminal output stream. This is an implicit contract with Anthropic: as long as Claude Code's output format stays consistent, CCC's parser works. When Anthropic ships a Claude Code update that changes that format, the parser breaks silently. Tabs stop updating. Status dots go grey. Users notice, but may not know why.

This is not an edge case. It is a *known, recurring maintenance event* that needs a managed process.

### The Parser Module

All status detection logic lives in a single, isolated module: `src/parser.js` (or equivalent). Nothing else in CCC touches raw output interpretation. This isolation means:

- The blast radius of a format change is contained to one file
- A fix is typically a small patch — update a pattern match, bump the version
- Contributors can find and fix it without understanding the rest of the codebase

The parser maps raw output patterns to one of five states:

```
WAITING_FOR_INPUT  →  🔴
RUNNING            →  🟡  
COMPLETED          →  🟢
ERROR              →  🟠
UNKNOWN            →  ⚫
```

### Confidence Monitoring

The parser tracks its own confidence. If it receives output it cannot map to any known pattern for more than a configurable threshold (default: 60 seconds of activity), it flags a degraded state internally and triggers the auto-issue mechanism.

### Automatic GitHub Issue on Degradation

When parser confidence degrades, CCC automatically files a GitHub issue — once, not repeatedly:

**Issue title:**
`[Auto] Status detection degraded — Claude Code output format may have changed`

**Issue body includes:**
- CCC version number
- Claude Code version (read from `claude --version`)
- A sanitised sample of the unrecognised output (no file contents, no code, just the terminal formatting tokens)
- Timestamp and platform (macOS version)
- A note inviting users to add their own Claude Code version and observations

**Duplicate prevention:**
Before filing, CCC checks the GitHub API for an open issue with the same title. If one exists, it adds a comment instead — or simply does nothing, letting the existing thread accumulate context.

This requires a one-time GitHub token in CCC's settings (optional — users who don't configure it simply don't get auto-filing, but the degraded state is still shown in the UI with a manual link to the issues page).

### The Community Effect

The auto-filed issue becomes a focal point. Users who notice broken status dots will search GitHub, find the issue, and contribute their own observations — Claude Code version, platform, what they're seeing. By the time the maintainer sits down to fix it, the new output format is often already documented in the comments.

### Versioning Contract

CCC follows semantic versioning with a clear convention:

| Change type | Version bump | Example |
|---|---|---|
| Parser fix for Claude Code format change | Patch | v1.0.0 → v1.0.1 |
| New CCC feature | Minor | v1.0.0 → v1.1.0 |
| Breaking change to config/API | Major | v1.0.0 → v2.0.0 |

Parser fixes are always patch releases — small, fast, low-risk. The goal is that a format change results in a GitHub issue on day one, a fix within days, and a patch release that users can pull with `git pull && npm install`.

### Resilience in the UI

While the parser is in a degraded state, CCC does not crash or show errors. It falls back gracefully:

- Status dots show ⚫ (unknown) rather than stale incorrect colours
- A subtle warning banner appears: *"Status detection is degraded. [View issue ↗]"*
- The terminal remains fully interactive — nothing about the actual Claude Code session is affected

The user can keep working. They just lose the status colours temporarily.

---

## Project Memory

### The Problem Within the Problem

CCC solves terminal sprawl, but there is a deeper pain: every Claude Code session starts from zero. Decisions made, approaches tried, errors hit, solutions found — all lost the moment the terminal closes. The developer is forced to carry context manually (via SHP) or repeat themselves. CCC should give Claude Code the memory that the tool itself lacks.

### The Solution: File-Based SHP Storage

CCC captures an end-of-day Session Handover Pack per project and stores it as a dated Markdown file. When a new session starts, CCC serves the most recent SHP to Claude Code automatically. No manual pasting, no lost context.

#### Storage Structure

SHPs are stored per project inside `docs/shp/`:

```
CCC/
└── docs/
    ├── v1.0/
    │   ├── CCC_concept.md
    │   └── CCC_tasklist.md
    └── shp/
        ├── 2026-02-25.md
        ├── 2026-02-26.md
        └── 2026-02-27.md
```

Each SHP file is a standard Markdown document — human-readable, Git-friendly, openable in CotEditor or any editor.

#### Slash Commands

Three global slash commands power the workflow. These belong in `~/.claude/commands/` (global, not per-project) because every project benefits from the same lifecycle:

| Command | When | What it does |
|---------|------|-------------|
| `/start-project` | First session on a new project | Claude Code reads CLAUDE.md, concept doc, tasklist. Asks comprehension questions. Waits for instruction. |
| `/continue` | Every returning session | CCC reads the most recent SHP from `docs/shp/` and feeds it to Claude Code. Picks up where yesterday left off. |
| `/eod` | End of project day | Claude Code writes the SHP — what was done, decided, what's open, what's next. CCC saves it as a dated file in `docs/shp/`. |

#### The Daily Workflow

```
Day 1:  /start-project → work → /eod
Day 2:  /continue → work → /eod
Day 3:  /continue → work → /eod
```

#### CCC Dependency

`/continue` and `/eod` require CCC to be running — CCC manages the SHP storage and retrieval. `/start-project` works independently (file reading only). This dependency is by design: CCC is the infrastructure that gives Claude Code memory.

#### Why File-Based (v1.0) and Not SQLite

File-based SHP storage is sufficient for v1.0: one Markdown file per day, human-readable, Git-friendly, no new dependencies. SQLite becomes the upgrade path in v2.0 when search across SHPs and richer context layering justify it. See `docs/CCC_Roadmap.md` for the version plan.

---

## Platform Target

v1.0 targets **macOS** as the development and testing platform. Cross-platform support (Linux, Windows) is not a v1.0 goal but is explicitly not excluded.

Design choices must not close the door on future cross-platform support:
- No platform-specific APIs (e.g., macOS-only system calls)
- No hardcoded paths (e.g., `/Users/`, `~/Library/`)
- No assumptions about the default shell being zsh
- Use `path.join()` for all filesystem path construction
- No filesystem symlinks (fragile across platforms — see Project Versioning)

The underlying tech stack (Node.js, Express, xterm.js, node-pty) is inherently cross-platform. `node-pty` requires platform-specific build tools (Xcode CLI on macOS, build-essential on Linux, Visual Studio Build Tools on Windows) but compiles on all three.

Cross-platform support is a candidate for a future version if demand warrants it after the Promotion Tour.

---

## Out of Scope (for v1)

- Cloud sync or multi-machine support
- Multiple users / authentication
- Built-in text editor (read + external edit is sufficient)
- Git integration beyond what Claude Code handles
- Mobile / tablet support
- Cross-platform support (Linux, Windows) — see Platform Target

---

## Future Ideas (post-v1)

For the full version plan including v1.1 (Promotion Tour) and v2.0 (Advanced Project Memory with SQLite), see `docs/CCC_Roadmap.md`.

Unassigned ideas:

- Menu bar icon showing global status (how many projects need attention)
- Desktop notifications when a project turns red
- Session logs / history per project
- Claude Code token usage display
- Keyboard shortcuts for switching between projects
- Quick-reply bar for common Claude Code responses (y/n/yes to all)
- Surface available `.claude/commands/` per project in the CCC UI for one-click invocation

---

*This document is the starting point. CCC will eat its own dog food — once built, this concept doc will live inside a CCC project, managed by CCC.*
