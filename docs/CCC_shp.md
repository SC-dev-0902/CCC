# Session Handover Pack — CCC

## Project
**CCC — Claude Command Center**
**Version:** 1.0
**Current Stage:** 12 — Session-Version Binding & Interactive Test Runner — **Go** (Stage 13 next)

---

## What CCC Is

A local web application (Node.js + Express + xterm.js) that replaces terminal sprawl with a single dashboard for managing multiple Claude Code sessions. Tree view on the left, tabbed terminals on the right, live colour-coded status dots per project. Runs on `localhost:PORT`, no database, no cloud, no accounts.

---

## What Was Done This Session

### Stage 12 — Three waves implemented:

**Wave 1 — Session-Version Binding**
- Project row click changed from opening tab to expand/collapse only
- Created `openSessionTab(projectId)` using `projectId::session` tab ID scheme (double colon avoids collision with file tabs using single colon)
- Active version row click opens session tab; non-active version click sets version active then opens session tab
- Extracted `renderSessionContent()` helper for session/terminal rendering
- Session exit now disposes terminal and returns to "no active session" prompt (not restart bar)
- Status dot moved from project row to active version row
- Updated `getTabInfo()` and `renderTabContent()` for `::session` tab ID format
- Updated window resize handler for new tab ID format

**Wave 2 — Test File Relocation**
- `scanVersionFiles()` now returns `{ files[], testFiles[] }` (separated by `_test_stage\d+\.md` regex)
- `scanVersions()` renamed top-level `testFiles` to `flatTestFiles` for backward compat
- Test files render under collapsible "Testing" sub-header inside each version node
- Added `expandedTestingSections` Set for Testing sub-header expand state
- Moved `docs/CCC_test_stage11.md` into `docs/v1.0/CCC_test_stage11.md`

**Wave 3 — Interactive Test Runner**
- `PUT /api/file/:projectId` endpoint with path traversal protection for file write-back
- `isTestFile()` helper detects `_test_stage\d+\.md` pattern
- `renderTestRunner()` renders interactive panel: checkboxes, comment textareas, progress counter, Save button
- `parseTestFile()` parses markdown: headings, checkbox lines (`- [x]`/`- [ ]`), bold labels, `  > ` comment lines
- `reconstructTestFile()` rebuilds markdown from parsed structure
- Manual Save button only (auto-save removed per Phet's preference)
- `DELETE /api/projects/:id/versions/:version` endpoint with active-version protection and FS deletion
- Remove button on non-active version rows with confirmation modal
- Sidebar refresh button (↻) that clears `projectVersions` cache and reloads tree

## Decisions Made

- **Tab ID scheme**: `projectId::session` (double colon) for session tabs vs `projectId:filePath` (single colon) for file tabs — prevents ambiguity
- **Session still project-scoped on backend** — one session per project, cwd is project root. Version node is purely a UI entry point.
- **Session exit shows prompt, not restart bar** — cleaner UX, user explicitly chooses what to start next
- **Non-active version click sets active + opens tab** — two-step convenience for switching versions
- **Test file detection by naming convention** (`_test_stage\d+\.md`) — no flag needed
- **Manual Save only for test runner** — auto-save removed after user feedback; Save button is sufficient
- **Sidebar refresh button** — clears cached `projectVersions` and re-fetches from disk; not auto-refresh
- **Version delete includes FS deletion** — `fs.rmSync(absFolder, { recursive: true })` with path-traversal protection; active version cannot be deleted

---

## Project Timeline

### Day 1 — 2026-02-24

**Stages 01 + 02** (commit `09aadcd`)
- Full UI shell: split-pane layout, sidebar tree view, tab bar, project persistence
- Express server with CRUD API for projects and groups, drag & drop reordering

### Day 2 — 2026-02-25

**Stage 03 — Terminal Sessions** (commit `99a8e65`)
- node-pty + xterm.js + ws integration, two session types (claude / shell)

**Stage 04 — Status Detection Parser** (commit `d7c74f1`)
- Isolated `src/parser.js` state machine, five states, degraded mode

**Stage 05 — Read Panel** (bundled with Stage 06)
- Markdown preview via marked.js, "Open in Editor" button

**Stage 06 — Project Versioning** (commit `fa14b5f`)
- `docs/vX.Y/` folder structure, patch nesting, migration from flat docs

**Stage 07 — New Project Wizard** (commit `a0beeef`)
- Modal wizard: Name → Location → Template → Group → Create, five templates

**Post-Stage-07 fixes** (commit `40c1ce9`)
- API hardening, loading overlay, group pruning, disk delete option

### Day 3 — 2026-02-26

**Stage 08 — Import Existing Projects** (commit `581d9b5`)
- Two-phase import: scan directory → confirm detected files, hard gate on missing concept doc

**Stage 09 — Settings Panel** (commit `774d9f3`)
- Editor, shell, theme, file patterns, GitHub token — all persisted to `settings.json`

**Stage 10 — Project Memory** (commit `1176bd0`)
- Single-file SHP: `docs/{ProjectName}_shp.md`, global slash commands

**Stage 11 — Resilience & Polish** (commit `3dcecdd`)
- First-run onboarding, port conflict handling, invalid path protection, session crash recovery, read panel auto-refresh, README, `.env.example`

**Stage 12 — Session-Version Binding & Interactive Test Runner** (this session, not yet committed)
- Session entry point moved to version node, test files relocated into version folders, interactive test runner with checkboxes and comments, version delete, sidebar refresh

---

## Architecture & File Map

```
CCC/
├── CLAUDE.md                  ← project contract (derived from active version's concept doc)
├── server.js                  ← Express entry point, all HTTP + WebSocket routes (1073 lines)
├── src/
│   ├── parser.js              ← SACRED: all Claude Code output parsing (342 lines)
│   ├── sessions.js            ← PTY lifecycle, WebSocket clients, parser integration (314 lines)
│   ├── projects.js            ← projects.json CRUD, path resolution, group management (173 lines)
│   └── versions.js            ← version scanning, creation, migration, git tagging (255 lines)
├── public/
│   ├── index.html             ← Minimal skeleton: sidebar, resize handle, main panel (53 lines)
│   ├── app.js                 ← All state, rendering, modals, terminals, test runner (2639 lines)
│   └── styles.css             ← CSS custom properties, dark/light themes (1724 lines)
├── data/
│   ├── projects.json          ← Project registry (committed)
│   └── settings.json          ← User settings (gitignored)
├── docs/
│   ├── CCC_shp.md             ← Session Handover Pack (this file)
│   ├── CCC_Roadmap.md         ← Roadmap (if exists)
│   └── v1.0/
│       ├── CCC_concept.md
│       ├── CCC_tasklist.md
│       └── CCC_test_stage11.md  ← Test files now live inside version folders
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
| PUT | `/api/file/:projectId` | Write file content `{ filePath, content }` (path-traversal protected) — used by test runner |
| POST | `/api/open-editor` | Launch external editor with file path |
| GET | `/api/browse?path=` | List subdirectories for browser modal |

### Versions
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/versions` | Scan version structure (includes `testFiles[]` per version) |
| POST | `/api/projects/:id/versions` | Create new version (scaffolds folder + docs) |
| PUT | `/api/projects/:id/active-version` | Set active version |
| DELETE | `/api/projects/:id/versions/:version` | Delete version (FS + prevents active version delete) |
| POST | `/api/projects/:id/versions/:version/complete` | Git tag |
| POST | `/api/projects/:id/migrate-versions` | Migrate flat docs to versioned |

### Settings & System
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/settings` | Read settings |
| PUT | `/api/settings` | Update settings (whitelisted keys only) |
| GET | `/api/version` | App version + build number |
| GET | `/api/preflight` | Check if `claude` CLI is installed |
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
groups[]                       — group objects {name, order}
projectsList[]                 — project objects from API
openTabs[]                     — tab IDs: "projectId::session" | "projectId:filePath" | "settings"
activeTab                      — currently displayed tab ID
expandedProjects (Set)         — which projects are expanded in tree
collapsedGroups (Set)          — which groups are collapsed
settings {}                    — loaded from /api/settings
suppressRender                 — flag to prevent render() during batch operations
dragState                      — {projectId} during drag operations

terminalInstances (Map)        — projectId → {terminal, fitAddon, ws, container, state, claudeStatus, degraded}
projectVersions (Map)          — projectId → {activeVersion, versions[], hasFlatDocs, flatTestFiles[]}
expandedVersionHeaders (Set)   — which projects have Versions section expanded
expandedVersions (Set)         — "projectId:version" strings for expanded version rows
expandedTestingSections (Set)  — "projectId:version" strings for expanded Testing sub-headers
readPanelTimers (Map)          — tabId → intervalId for auto-refresh
```

**Tab ID scheme:**
- `"projectId::session"` — session/terminal tab (double colon)
- `"projectId:filePath"` — file read panel or test runner tab (single colon)
- `"settings"` — settings panel

**Rendering pipeline:** `render()` → `renderTreeView()` + `renderTabBar()` + `renderTabContent()`

**Terminal lifecycle:** `startSession()` → `createTerminal()` → `connectTerminal()` (WebSocket) → `showTerminal()`

**Session exit lifecycle:** WebSocket `exit` message → `instance.state = 'exited'` → `renderTabContent()` → `renderSessionContent()` disposes terminal → shows "no active session" prompt

**Test runner pipeline:** `isTestFile()` check → `renderTestRunner()` → `parseTestFile()` → `renderTestItems()` → on Save: `reconstructTestFile()` → `PUT /api/file/:projectId`

**Modal pattern:** `showModal(title, bodyHtml, onSubmit)` — one modal at a time, overlay click dismisses

---

## Parser State Machine (src/parser.js)

Detection priority (checked in order):
1. **WAITING_FOR_INPUT** — permission prompts (`Claude wants to`, `[y]/[n]`, `(y/n)`)
2. **RUNNING** — `(thinking)`, thinking verbs (`· Verbing…`), spinner chars, tool use indicators
3. **COMPLETED** — BEL char after RUNNING, input prompt `❯`, or RUNNING timeout (3s no activity)
4. **ERROR** — error patterns (`Error:`, `Permission denied`, `rate limit`) only when NOT currently RUNNING
5. **UNKNOWN** — no session or unrecognised

**Degradation:** 60s unrecognised output → `onDegraded` callback → all dots grey + warning banner. Terminal still works.

**Running state debounce:** Persists for 2 seconds after last indicator.

---

## Path Resolution

Project paths in `projects.json` are **relative** to `settings.projectRoot`. Resolution chain:
1. `projects.resolveProjectPath(project.path)` called for all file operations
2. If path is absolute → use as-is
3. If relative → `path.join(settings.projectRoot, project.path)`

Current: `projectRoot = "/Users/steinhoferm/SC-Development"`, CCC path = `"CCC"` → resolves to `/Users/steinhoferm/SC-Development/CCC`

---

## Version Model

- **Major/Minor** (X.Y): Own folder `docs/vX.Y/` with concept + tasklist + test files
- **Patch** (X.Y.Z): Nested in parent `docs/vX.Y/vX.Y.Z/`, inherits concept, gets own tasklist + test files
- Active version tracked in `projects.json` `activeVersion` field, not filesystem
- Version completion → Git tag prompt
- Version deletion: `DELETE /api/projects/:id/versions/:version` — removes folder from FS, prevents deleting active version
- Migration: moves flat `docs/` files into `docs/vX.Y/` structure
- Test files: `{ProjectName}_test_stageXX.md` now live inside version folders (not flat `docs/`)
- `scanVersionFiles()` returns `{ files[], testFiles[] }` — test files separated by regex

---

## Test Runner Model

**Detection:** `isTestFile(fileName)` matches `/_test_stage\d+\.md$/`

**Parse structure:** `parseTestFile(lines)` produces `{ items: [...] }` where each item is:
- `{ type: 'heading', level, text }` — `#` through `######`
- `{ type: 'checkbox', text, checked, comment, boldLabel, indent }` — `- [x]` or `- [ ]` lines
- `{ type: 'line', text }` — everything else

**Comment format:** Inline after checkbox as `  > comment text` — human-readable, Git-friendly.

**Reconstruct:** `reconstructTestFile(parsed)` rebuilds full markdown. Checkboxes get `  > ` comment lines appended when comment is non-empty.

**Save:** Manual only via Save button → `PUT /api/file/:projectId` with `{ filePath, content }`.

---

## Key Decisions & Conventions

- **Parser is sacred** — only `src/parser.js` touches raw output interpretation
- **Never hardcode port** — always `process.env.PORT`
- **Never modify imported project files** — CCC is read-only on filesystem except its own data files and test file write-back
- **No platform-specific paths** — `path.join()` everywhere, no hardcoded `/Users/`
- **Single-file SHP** — `docs/{ProjectName}_shp.md`, always overwritten at `/eod`, Git is the history
- **SHP is project-level, not per-version** — context accumulates across all versions
- **Protected groups** — "Active" and "Parked" never auto-pruned
- **One session per project** — starting Claude Code replaces open shell and vice versa
- **CLAUDECODE env var removed** from child process env to allow nested Claude Code sessions
- **Session entry via version node** — project row is expand/collapse only; active version row opens session tab
- **Test files in version folders** — `docs/vX.Y/{ProjectName}_test_stageXX.md` (not flat `docs/`)
- **Manual save for test runner** — no auto-save; explicit Save button

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
4. Build number extracted from `git log --grep=^Stage` at startup — only updates on restart
5. File API has path traversal protection — resolved path must start with project directory
6. `open -a "EditorName"` is macOS-specific (future cross-platform consideration)
7. Settings update whitelists keys: `['projectRoot', 'editor', 'shell', 'theme', 'filePatterns', 'githubToken']`
8. `scanVersionFiles()` field rename: top-level is `flatTestFiles` (not `testFiles`) — per-version data uses `testFiles`
9. Tab ID scheme: `::session` (double colon) vs `:filePath` (single colon) — must not confuse the two
10. `renderTestRunner` references `scheduleAutoSave` in `renderTestItems()` call but auto-save was removed — the parameter is ignored (dead reference, harmless)

---

## Global Slash Commands

Four global commands at `~/.claude/commands/`:
| Command | File | Purpose |
|---------|------|---------|
| `/start-project` | `start-project.md` | First session: reads all docs + SHP if exists, asks comprehension questions |
| `/continue` | `continue.md` | Reads `docs/{ProjectFolderName}_shp.md`, restores context |
| `/eod` | `eod.md` | Writes complete SHP to `docs/{ProjectFolderName}_shp.md`, always overwrites |
| `/reload-docs` | `reload-docs.md` | Re-reads all project docs after external changes |
| `/tested` | `tested.md` | Processes test file comments, presents Go/NoGo gate |

---

## Git Remote
- Forgejo: `http://mcs-git.mcsfam.local:3000/Phet/CCC`
- Push after every stage Go decision
- Last push: Stage 11 (commit `3dcecdd`)

---

## Open Items
- None — Stage 12 Go received, ready to commit and push

## Next Actions
1. Commit Stage 12 and push to Forgejo
2. Begin Stage 13 planning (next session)
