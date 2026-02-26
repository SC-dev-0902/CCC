# Session Handover Pack — CCC

## Project
**CCC — Claude Command Center**
**Version:** 1.0
**Current Stage:** 10 — Project Memory (SHP Storage) — all tasks complete, awaiting Go/NoGo

---

## What CCC Is

A local web application (Node.js + Express + xterm.js) that replaces terminal sprawl with a single dashboard for managing multiple Claude Code sessions. Tree view on the left, tabbed terminals on the right, live colour-coded status dots per project. Runs on `localhost:PORT`, no database, no cloud, no accounts.

---

## What Was Done This Session

- Implemented Stage 10 — Project Memory (SHP Storage)
- Initially built a multi-file SHP approach (`docs/shp/` folder, `GET /api/projects/:id/shps` endpoint, expandable SHP section in tree view)
- After `/reload-docs` revealed concept doc had been updated to single-file model, flagged the drift
- Refactored to single-file model per concept doc:
  - Removed `GET /api/projects/:id/shps` endpoint from server.js
  - Removed `projectSHPs` Map and `expandedSHPHeaders` Set from app.js
  - Removed `loadProjectSHPs()` function from app.js
  - Removed expandable SHP folder section from tree view
  - Removed `.tree-shp-header` and `.tree-shp-children` CSS styles
  - Added single SHP file entry in tree view (after CLAUDE.md) using existing `.tree-file` class
  - Updated `/eod` slash command: writes `docs/{ProjectFolderName}_shp.md`, always overwrites
  - Updated `/continue` slash command: reads `docs/{ProjectFolderName}_shp.md` directly
  - Updated `/start-project` slash command: added step 5 to read SHP if it exists
  - Updated `/reload-docs` slash command: fixed step 5 to reference `docs/{ProjectFolderName}_shp.md`
- Created this SHP file as `docs/CCC_shp.md`

## Decisions Made

- **Single-file SHP model chosen** — one file per project (`docs/{ProjectName}_shp.md`), overwritten at every `/eod`, Git captures history. Rejected: multi-file dated approach (`docs/shp/YYYY-MM-DD.md`) — adds complexity without benefit since Git already provides history.
- **SHP is project-level, not per-version** — context accumulates across all versions, more useful for Claude Code memory.
- **No new API endpoint needed** — existing `GET /api/file/:projectId?filePath=` handles reading the SHP file. Tree view entry just calls `openFileTab()`.
- **SHP rendered as plain file entry** — not an expandable section. Simple `📄 {ProjectName}_shp.md` in tree view, same as CLAUDE.md. Clicked to open in read panel.

---

## Project Timeline

### Day 1 — 2026-02-24

**Stages 01 + 02** (commit `09aadcd`)
- Built the full UI shell and project persistence layer from scratch
- Split-pane layout: sidebar (tree view with groups) + main panel (tab bar + content)
- Five status dot colours: red (waiting), yellow (running), green (completed), orange (error), grey (unknown)
- Express server with full CRUD API for projects and groups
- `projects.json` + `settings.json` persistence
- Drag & drop reordering across groups

### Day 2 — 2026-02-25

**Stage 03 — Terminal Sessions** (commit `99a8e65`)
- Integrated node-pty + xterm.js + ws for real PTY sessions
- Two session types: "Start Claude Code" (runs `claude` CLI) and "Open Shell" (plain zsh)
- One session per project at a time — starting one replaces the other
- Sessions persist in background when switching tabs
- Key fix: `@xterm/addon-fit` UMD export requires `new FitAddon.FitAddon()` not `new FitAddon()`
- Key fix: `node-pty@1.2.0-beta.11` required for Node.js v25

**Stage 04 — Status Detection Parser** (commit `d7c74f1`)
- `src/parser.js` — isolated state machine, single responsibility
- Detects five states from raw PTY output via pattern matching
- Degraded mode after 60s unrecognised output: all dots grey, warning banner
- Optional auto-issue filing to Forgejo when degraded (requires GitHub token)

**Stage 05 — Read Panel** (bundled with Stage 06)
- Clicking core files opens rendered Markdown preview via `marked.js`
- "Open in Editor" launches configured external editor
- Read panel is read-only, coexists with terminal per tab

**Stage 06 — Project Versioning** (commit `fa14b5f`)
- `activeVersion` field in `projects.json`
- Versioned folder structure: `docs/vX.Y/` with concept + tasklist
- Patch versions nest inside parent: `docs/vX.Y/vX.Y.Z/`
- Tree view: expandable Versions section with active version indicator
- Migration from flat `docs/` to versioned structure

**Stage 07 — New Project Wizard** (commit `a0beeef`)
- Modal: Name → Location → Template → Group → Create
- Five templates: Web App, API, Script, Research, Blank
- Scaffolds: CLAUDE.md, concept doc, tasklist, slash commands, `.ccc-project.json`

**Post-Stage-07 fixes** (commit `40c1ce9`)
- API hardening, loading overlay, group pruning, disk delete option on project removal

### Day 3 — 2026-02-26

**Stage 08 — Import Existing Projects** (commit `581d9b5`)
- Two-phase import modal: scan directory → confirm detected files
- Hard gate: blocks import if `*_concept.md` is absent
- Non-destructive: no filesystem writes to imported project

**Stage 09 — Settings Panel** (commit `774d9f3`)
- External editor, shell, theme (light/dark/system), file patterns, GitHub token
- All settings persist to `settings.json`, theme switching immediate

**Stage 10 — Project Memory (SHP Storage)** (current session, not yet committed)
- Single SHP file per project: `docs/{ProjectName}_shp.md`
- SHP file entry in tree view (clickable, opens in read panel)
- Global slash commands `/start-project`, `/continue`, `/eod` updated for single-file model
- No new API endpoint — uses existing file read endpoint

---

## Architecture & File Map

```
CCC/
├── CLAUDE.md                  ← project contract (derived from active version's concept doc)
├── server.js                  ← Express entry point, all HTTP + WebSocket routes
├── src/
│   ├── parser.js              ← SACRED: all Claude Code output parsing lives here only
│   ├── sessions.js            ← PTY lifecycle, WebSocket client management, parser integration
│   ├── projects.js            ← projects.json CRUD, path resolution, group management
│   └── versions.js            ← version scanning, creation, migration, git tagging
├── public/
│   ├── index.html             ← Minimal skeleton: sidebar, resize handle, main panel
│   ├── app.js                 ← ~2200 lines vanilla JS: all state, rendering, modals, terminals
│   └── styles.css             ← CSS custom properties, dark/light themes, all component styles
├── data/
│   ├── projects.json          ← Project registry (committed)
│   └── settings.json          ← User settings (gitignored)
├── docs/
│   ├── CCC_shp.md             ← Session Handover Pack (this file, single file, Git is history)
│   ├── v1.0/
│   │   ├── CCC_concept.md     ← v1.0 concept
│   │   └── CCC_tasklist.md    ← v1.0 tasklist
│   └── v1.1/
│       ├── CCC_concept.md     ← v1.1 concept (if exists)
│       └── CCC_tasklist.md    ← v1.1 tasklist (if exists)
├── .env                       ← Local only (PORT, CLAUDE_REFERRAL_URL)
└── .env.example               ← Committed template
```

---

## API Endpoint Inventory

### Projects
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects` | All projects + groups |
| POST | `/api/projects` | Create project (name, path, group, coreFiles) |
| PUT | `/api/projects/:id` | Update project fields |
| DELETE | `/api/projects/:id?deleteFiles=true` | Remove (optional disk delete) |
| PUT | `/api/projects-reorder` | Drag & drop reorder |

### Groups
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/groups` | Create group |
| DELETE | `/api/groups/:name` | Remove group (must be empty) |

### Files & Editor
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/file/:projectId?filePath=` | Read file content (path-traversal protected) |
| POST | `/api/open-editor` | Launch external editor with file path |
| GET | `/api/browse?path=` | List subdirectories for browser modal |

### Versions
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/versions` | Scan version structure |
| POST | `/api/projects/:id/versions` | Create new version (scaffolds folder + docs) |
| PUT | `/api/projects/:id/active-version` | Set active version |
| POST | `/api/projects/:id/versions/:version/complete` | Git tag |
| POST | `/api/projects/:id/migrate-versions` | Migrate flat docs to versioned |

### Settings & System
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/settings` | Read settings |
| PUT | `/api/settings` | Update settings (whitelisted keys only) |
| GET | `/api/version` | App version + build number |
| POST | `/api/scaffold-project` | New project wizard backend |
| POST | `/api/scan-project` | Import scan backend |

### Sessions
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/sessions/:projectId` | Start session (command: 'claude' or 'shell') |
| GET | `/api/sessions/:projectId` | Get session state |
| GET | `/api/sessions` | All session states |

### WebSocket (`/ws?projectId=...`)
- Client→Server: `{ type: 'input', data }`, `{ type: 'resize', cols, rows }`
- Server→Client: `{ type: 'output', data }`, `{ type: 'state', state }`, `{ type: 'claudeStatus', status }`, `{ type: 'degraded', info }`, `{ type: 'exit', exitCode }`

---

## Frontend State Model (app.js)

```
groups[]                    — group objects {name, order}
projectsList[]              — project objects from API
openTabs[]                  — tab IDs: projectId | "projectId:filePath" | "settings"
activeTab                   — currently displayed tab ID
expandedProjects (Set)      — which projects are expanded in tree
collapsedGroups (Set)       — which groups are collapsed
settings {}                 — loaded from /api/settings
suppressRender              — flag to prevent render() during batch operations

terminalInstances (Map)     — projectId → {terminal, fitAddon, ws, container, state, claudeStatus, degraded}
projectVersions (Map)       — projectId → {activeVersion, versions[], hasFlatDocs}
expandedVersionHeaders (Set)— which projects have Versions section expanded
expandedVersions (Set)      — "projectId:version" strings for expanded version rows
```

**Rendering pipeline:** `render()` → `renderTreeView()` + `renderTabBar()` + `renderTabContent()`

**Terminal lifecycle:** `startSession()` → `createTerminal()` → `connectTerminal()` (WebSocket) → `showTerminal()`

**Modal pattern:** `showModal(title, bodyHtml, onSubmit)` — one modal at a time, overlay click dismisses

**SHP in tree view:** Rendered at app.js lines 538-548 as a static `.tree-file` entry after CLAUDE.md. Calls `openFileTab(project.id, project.name, 'docs/' + project.name + '_shp.md')` on click.

---

## Parser State Machine (src/parser.js)

Detection priority (checked in order):
1. **WAITING_FOR_INPUT** — permission prompts (`Claude wants to`, `[y]/[n]`, `(y/n)`)
2. **RUNNING** — `(thinking)`, thinking verbs (`· Verbing…`), spinner chars, tool use indicators
3. **COMPLETED** — BEL char after RUNNING, input prompt `❯`, or RUNNING timeout (3s no activity)
4. **ERROR** — error patterns (`Error:`, `Permission denied`, `rate limit`) only when NOT currently RUNNING
5. **UNKNOWN** — no session or unrecognised

**Degradation:** 60s unrecognised output → `onDegraded` callback → all dots grey + warning banner. Terminal still works — only colours affected.

**Running state debounce:** Persists for 2 seconds after last indicator (prevents flicker).

---

## Path Resolution

Project paths in `projects.json` are **relative** to `settings.projectRoot`. Resolution chain:
1. `projects.resolveProjectPath(project.path)` called for all file operations
2. If path is absolute → use as-is
3. If relative → `path.join(settings.projectRoot, project.path)`

Current: `projectRoot = "/Users/steinhoferm/SC-Development"`, CCC path = `"CCC"` → resolves to `/Users/steinhoferm/SC-Development/CCC`

---

## Version Model

- **Major/Minor** (X.Y): Own folder `docs/vX.Y/` with concept + tasklist
- **Patch** (X.Y.Z): Nested in parent `docs/vX.Y/vX.Y.Z/`, inherits concept, gets own tasklist
- Active version tracked in `projects.json` `activeVersion` field, not filesystem
- Version completion → Git tag prompt
- Migration: moves flat `docs/` files into `docs/vX.Y/` structure

---

## Key Decisions & Conventions

- **Parser is sacred** — only `src/parser.js` touches raw output interpretation
- **Never hardcode port** — always `process.env.PORT`
- **Never modify imported project files** — CCC is read-only on filesystem except its own data files
- **No platform-specific paths** — `path.join()` everywhere, no hardcoded `/Users/`
- **Single-file SHP** — `docs/{ProjectName}_shp.md`, always overwritten at `/eod`, Git is the history
- **SHP is project-level, not per-version** — context accumulates across all versions
- **Protected groups** — "Active" and "Parked" never auto-pruned
- **One session per project** — starting Claude Code replaces open shell and vice versa
- **CLAUDECODE env var removed** from child process env to allow nested Claude Code sessions

---

## Dependencies (package.json v1.0.0)

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.21.2 | HTTP server |
| ws | ^8.19.0 | WebSocket |
| node-pty | ^1.2.0-beta.11 | PTY spawning (beta required for Node v25) |
| @xterm/xterm | ^6.0.0 | Terminal emulator |
| @xterm/addon-fit | ^0.11.0 | Auto-fit terminal |
| @xterm/addon-webgl | ^0.19.0 | GPU rendering |
| marked | ^17.0.3 | Markdown parser |
| dotenv | ^16.4.7 | .env loading |

---

## Known Gotchas

1. `node-pty@1.2.0-beta.11` — stable 1.0.0 doesn't compile on Node.js v25
2. `FitAddon` UMD export — constructor is `new FitAddon.FitAddon()`, not `new FitAddon()`
3. Server must be restarted for code changes — no hot-reload
4. Build number (`git rev-list --count HEAD`) only updates on server restart
5. File API has path traversal protection — resolved path must start with project directory
6. `open -a "EditorName"` is macOS-specific (future cross-platform consideration)
7. Settings update whitelists keys: `['projectRoot', 'editor', 'shell', 'theme', 'filePatterns', 'githubToken']`

---

## Global Slash Commands

Four global commands at `~/.claude/commands/`:
| Command | File | Purpose |
|---------|------|---------|
| `/start-project` | `start-project.md` | First session: reads all docs + SHP if exists, asks comprehension questions |
| `/continue` | `continue.md` | Reads `docs/{ProjectFolderName}_shp.md`, restores context |
| `/eod` | `eod.md` | Writes complete SHP to `docs/{ProjectFolderName}_shp.md`, always overwrites |
| `/reload-docs` | `reload-docs.md` | Re-reads all project docs after external changes |

---

## Git Remote
- Forgejo: `http://mcs-git.mcsfam.local:3000/Phet/CCC`
- Push after every stage Go decision
- Current: 8 local commits, last push was Stage 09

---

## Open Items
- Stage 10 Go/NoGo gate pending

## Next Actions
1. Stage 10 Go/NoGo decision from Phet
2. If Go → commit + push to Forgejo
3. Proceed to Stage 11 — Resilience & Polish (edge cases, error states, first-run onboarding, README, read panel auto-refresh)
