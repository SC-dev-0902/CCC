# Session Handover Pack — CCC

## Project
**CCC — Claude Command Center**
**Version:** 1.0
**Current Stage:** 16 — User Manual — **Near Complete** (screenshots captured, manual written, HEP passed, PDF generated)
**Active bug:** Parser status dots stuck on grey — debug logging added, awaiting diagnostic data

---

## What Was Done This Session

### Handover from Claude.ai — Global Tooling Updates
- **`~/.claude/CLAUDE.md`** bumped to v0.6 — added `/evaluate-import` to slash commands table, added v0.6 change note
- **`~/.claude/commands/start-project.md`** updated — tasklist auto-generation from concept doc when missing, `/evaluate-import` pre-check
- **`~/.claude/commands/evaluate-import.md`** created — reads existing code/docs, interviews developer, generates CCC-compliant concept doc, CLAUDE.md, and tasklist
- **`~/.claude/commands/create-tasklist.md`** created — manual trigger to generate stage-gated tasklist from concept doc
- All 7 global commands now installed: start-project, continue, eod, tested, reload-docs, create-tasklist, evaluate-import

### Import Flow Revised — No Hard Gate
**server.js:**
- Removed hard gate in `/api/scan-project` that returned `valid: false` when no concept doc found
- Scan now always returns `valid: true` for valid directories — `detected.concept.found` indicates whether concept doc exists
- `/api/projects/:id/versions` auto-clears `evaluated` flag when concept doc detected (checks version files and flat docs)
- Version scan response now includes `evaluated` field

**src/projects.js:**
- Added `evaluated` to allowed fields in `updateProject()` (alongside name, group, coreFiles, activeVersion)

**public/app.js:**
- Import Phase 2 now handles missing concept doc — shows `/evaluate-import` notice instead of blocking
- Info notices updated: no concept → "Run `/evaluate-import`"; concept but no CLAUDE.md → "Generated at `/start-project`"; concept but no tasklist → same
- Import submit sets `evaluated: false` on projects missing concept doc via `PUT /api/projects/:id`
- `loadProjectVersions()` syncs `evaluated` status from version scan response back to project object
- `renderSessionContent()` shows orange `evaluate-notice` banner for unevaluated projects above the session start prompt

**public/styles.css:**
- Added `.evaluate-notice` — orange background, black text, rounded, max-width 480px, centered
- Added `.evaluate-notice code` — monospace with subtle background

### Documentation & Licence
- **`LICENSE`** — Elastic License 2.0 file added to repo root
- **`CLAUDE.md`** — Added LICENSE to project structure tree, updated slash commands section from "Three" to "Six" with all command descriptions
- **`docs/v1.0/CCC_tasklist.md`** — Stage 08 updated (removed hard gate task, added 5 new tasks for revised import flow). Parser section renamed to "Post-Go parser hardening"

### Parser Debug Investigation
- Status dots stuck on grey reported by Phet — parser not recognising Claude Code output
- Claude Code version: 2.1.63 (patterns were written for v2.1.x — should match)
- Added always-on debug logging to `src/parser.js` — writes to `parser-debug.log` at project root
- Debug logs every `feed()` call with stripped text (first 200 chars), detected state, and current state
- Logs state transitions explicitly
- **CCC restart required** for debug logging to take effect — then open a Claude session, interact, read the log

## Decisions Made

- **Import flow: no hard gate** — CCC accepts any directory. Unevaluated imports get `evaluated: false` flag. UI shows notice. Auto-cleared when concept doc appears.
- **`/evaluate-import` is mandatory** for non-CCC projects before `/start-project`
- **Sequence:** Import → `/evaluate-import` → review docs → `/start-project` → work
- **Licence: Elastic License 2.0** — decided, file in repo
- **Parser debug approach** — always-on file logging to `parser-debug.log`, read after CCC restart + brief interaction
- **CCC must not be developed via CCC** — development continues in normal CC terminal

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
- Two-phase import: scan directory → confirm detected files

**Stage 09 — Settings Panel** (commit `774d9f3`)
- Editor, shell, theme, file patterns, GitHub token — all persisted to `settings.json`

**Stage 10 — Project Memory** (commit `1176bd0`)
- Single-file SHP: `docs/{ProjectName}_shp.md`, global slash commands

**Stage 11 — Resilience & Polish** (commit `3dcecdd`)
- First-run onboarding, port conflict handling, invalid path protection, session crash recovery, read panel auto-refresh, README, `.env.example`

**Stage 12 — Session-Version Binding & Interactive Test Runner** (commit `955643f`)
- Session entry point moved to version node, test files relocated into version folders, interactive test runner with checkboxes and comments, version delete, sidebar refresh

### Day 4 — 2026-02-27

**Post-Stage 12 fixes** (commit `90d300b`)
- Parser hardening, test runner crash fix, retroactive test files

**Stage 13 — Cross-Platform Support** (Go — macOS verified, Linux/Windows deferred)
- Platform-aware shell, PTY, editor, path handling
- OS-specific installers: `tools/macos/`, `tools/linux/`, `tools/windows/`
- Release build script: `tools/build-release.sh`

**Stage 14 — Housekeeping** (commit `3229ecf`, Go)
- Test progress badges, sidebar persistence, codebase audit, CHANGELOG.md, doc fixes

**Post-Stage 14** (commit `56e69b1`)
- iPad touch targets, README feature list update

**Stage 15 — v1.0 Release** (Conditional Go — paused on GitHub + tag)

**Stage 16 — User Manual** (In Progress)
- Screenshots captured, manual written, PDF generated, HEP passed

### Day 5 — 2026-02-28

**Handover from Claude.ai** — global tooling updates, import flow revised, licence added
- 7 global slash commands installed
- Import flow: no hard gate, `evaluated` flag, UI notice, auto-clear
- ELv2 licence file added
- Parser debug logging added (status dots stuck on grey)

---

## Architecture & File Map

```
CCC/
├── CLAUDE.md                  ← project contract (derived from active version's concept doc)
├── LICENSE                    ← Elastic License 2.0
├── CHANGELOG.md               ← public-facing changelog (v1.0.0)
├── README.md                  ← install + run instructions, feature list
├── parser-debug.log           ← TEMPORARY: parser debug output (remove after fix)
├── server.js                  ← Express entry point, all HTTP + WebSocket routes
├── src/
│   ├── parser.js              ← SACRED: all Claude Code output parsing (+ temporary debug logging)
│   ├── sessions.js            ← PTY lifecycle, WebSocket clients, parser integration
│   ├── projects.js            ← projects.json CRUD, path resolution, group management
│   └── versions.js            ← version scanning, creation, migration, test checkbox counting
├── public/
│   ├── index.html             ← Minimal skeleton: sidebar, resize handle, main panel
│   ├── app.js                 ← All state, rendering, modals, terminals, test runner
│   └── styles.css             ← CSS custom properties, dark/light themes
├── data/
│   ├── projects.json          ← Project registry (committed)
│   └── settings.json          ← User settings (gitignored)
├── tools/
│   ├── macos/install_CCC.sh   ← Installer (macOS)
│   ├── linux/install_CCC.sh   ← Installer (Linux)
│   ├── windows/install_CCC.ps1 ← Installer (Windows)
│   ├── build-release.sh       ← Builds OS-specific release archives
│   ├── screenshot.js          ← Playwright screenshot automation (17 shots)
│   └── manual-to-pdf.js       ← Markdown→PDF via marked + Playwright
├── docs/
│   ├── CCC_shp.md             ← Session Handover Pack (this file)
│   ├── CCC_Roadmap.md         ← Version roadmap
│   ├── USER_MANUAL.md         ← User manual (Stage 16)
│   ├── USER_MANUAL.pdf        ← PDF export of manual
│   ├── screenshots/           ← Playwright-captured screenshots (16 files)
│   └── v1.0/
│       ├── CCC_concept.md
│       ├── CCC_tasklist.md
│       └── CCC_test_stage*.md ← Test files (stages 01–14)
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
| PUT | `/api/projects/:id` | Update project fields (name, group, coreFiles, activeVersion, evaluated) |
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
| GET | `/api/projects/:id/versions` | Scan version structure (includes `testFiles[]` as objects with `{name, checked, total}`, `evaluated` field, auto-clears evaluated flag when concept doc found) |
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
| POST | `/api/scan-project` | Import scan backend (no hard gate — returns `valid: true` for any valid directory) |

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
projectsList[]                 — project objects from API (includes .evaluated field)
openTabs[]                     — tab IDs: "projectId::session" | "projectId:filePath" | "settings"
activeTab                      — currently displayed tab ID
expandedProjects (Set)         — which projects are expanded in tree
collapsedGroups (Set)          — which groups are collapsed
settings {}                    — loaded from /api/settings

terminalInstances (Map)        — projectId → {terminal, fitAddon, ws, container, state, claudeStatus, degraded}
projectVersions (Map)          — projectId → {activeVersion, versions[], hasFlatDocs, flatTestFiles[], evaluated}
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

**Import flow (new):**
- `scanResult.detected.concept.found` determines if project needs evaluation
- `needsEvaluation` flag set during import → `PUT /api/projects/:id { evaluated: false }`
- `loadProjectVersions()` syncs `evaluated` from version scan response to project object
- `renderSessionContent()` shows orange `.evaluate-notice` banner when `project.evaluated === false`

**Test file progress:** `countTestCheckboxes(filePath)` in `versions.js` returns `{ checked, total }` — displayed as `[x/y]` badge in tree view via `.test-progress-badge` class

**Sidebar persistence:** `initResize()` saves width to `localStorage('ccc-sidebar-width')` on mouseup, restores on init

---

## Parser State Machine (src/parser.js)

Detection priority (checked in order):
1. **WAITING_FOR_INPUT** — permission prompts (`Claude wants to`, `[y]/[n]`, `(y/n)`, `Do you want to`, `❯ \d` selection list, `Esc to cancel`)
2. **RUNNING** — `(thinking)`, thinking verbs (`· Verbing…`), spinner chars (`✢✳✶✻✽⏺⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`), tool use (`⏺.*file|ctrl+o`)
3. **COMPLETED** — BEL char after RUNNING, input prompt `❯`, or RUNNING timeout (3s no activity)
4. **ERROR** — error patterns (`Error:`, `Permission denied`, `rate limit`) only when NOT currently RUNNING
5. **UNKNOWN** — no session or unrecognised

**Degradation:** Disabled in v1.0 (false positives on idle silence). Redesign deferred to v1.1.

**Running state debounce:** Persists for 2 seconds after last indicator.

**Filters (before detection):**
- Empty chunks (pure ANSI) → skipped
- Horizontal rules (`─────`) → skipped
- `? for shortcuts` → skipped
- `/ide for ...` → skipped

**ACTIVE BUG:** Status dots stuck on grey. Debug logging added — writes to `parser-debug.log`. Logs every `feed()` call with stripped text and detection result. **Next session must read this log after CCC restart + brief interaction to diagnose.**

**Debug logging location in code:** Top of `parser.js`, always-on `_debugLogStream` writing to `parser-debug.log`. Two log points: one in `feed()` after `_detect()`, one on state change.

---

## Path Resolution

Project paths in `projects.json` are **relative** to `settings.projectRoot`. Resolution chain:
1. `projects.resolveProjectPath(project.path)` called for all file operations
2. If path is absolute → use as-is
3. If relative → `path.join(settings.projectRoot, project.path)`

---

## Version Model

- **Major/Minor** (X.Y): Own folder `docs/vX.Y/` with concept + tasklist + test files
- **Patch** (X.Y.Z): Nested in parent `docs/vX.Y/vX.Y.Z/`, inherits concept, gets own tasklist + test files
- Active version tracked in `projects.json` `activeVersion` field, not filesystem
- Version completion → Git tag prompt
- Version deletion: `DELETE /api/projects/:id/versions/:version` — removes folder from FS, prevents deleting active version
- Test files: `{ProjectName}_test_stageXX.md` live inside version folders
- `scanVersionFiles()` returns `{ files[], testFiles[] }` — testFiles are objects `{ name, checked, total }`
- `scanVersions()` top-level uses `flatTestFiles` (same object format)

---

## Key Decisions & Conventions

- **Parser is sacred** — only `src/parser.js` touches raw output interpretation
- **Never hardcode port** — always `process.env.PORT`
- **Never modify imported project files** — CCC is read-only on filesystem except its own data files and test file write-back
- **No platform-specific paths** — `path.join()` everywhere
- **Single-file SHP** — `docs/{ProjectName}_shp.md`, always overwritten at `/eod`, Git is the history
- **Protected groups** — "Active" and "Parked" never auto-pruned
- **One session per project** — starting Claude Code replaces open shell and vice versa
- **Session entry via version node** — project row is expand/collapse only; active version row opens session tab
- **Test files in version folders** — `docs/vX.Y/{ProjectName}_test_stageXX.md`
- **Manual save for test runner** — no auto-save; explicit Save button
- **Manual language is humanized** — not robotic, per Phet's explicit instruction
- **Import accepts any directory** — no hard gate; unevaluated imports flagged with `evaluated: false`
- **`/evaluate-import` mandatory** for non-CCC projects before `/start-project`
- **CCC must not be developed via CCC** — normal CC terminal only
- **Changelog/roadmap never auto-updated** — always ask Phet first
- **Licence: Elastic License 2.0** — file at repo root

---

## Dependencies (package.json v1.0.0)

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.21.2 | HTTP server |
| ws | ^8.19.0 | WebSocket |
| node-pty | ^1.2.0-beta.11 | PTY spawning (beta required for Node v25) |
| @xterm/xterm | ^6.0.0 | Terminal emulator |
| @xterm/addon-fit | ^0.11.0 | Auto-fit terminal |
| marked | ^17.0.3 | Markdown parser |
| dotenv | ^16.4.7 | .env loading |

**Dev dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| playwright | ^1.58.2 | Screenshot automation + PDF generation |

---

## Known Gotchas

1. `node-pty@1.2.0-beta.11` — stable 1.0.0 doesn't compile on Node.js v25
2. `FitAddon` UMD export — constructor is `new FitAddon.FitAddon()`, not `new FitAddon()`
3. Server must be restarted for code changes — no hot-reload
4. Build number extracted from `git log --grep=^Stage` at startup — only updates on restart
5. File API has path traversal protection — resolved path must start with project directory
6. Settings update whitelists keys: `['projectRoot', 'editor', 'shell', 'theme', 'filePatterns', 'githubToken']`
7. Tab ID scheme: `::session` (double colon) vs `:filePath` (single colon) — must not confuse the two
8. Import modal uses `id="importModal"` (not `id="modal"`) — affects programmatic close
9. Playwright selectors: `.tree-file` (not `.tree-file-link`), `.tree-testing-file` (not `.tree-test-file`), `.add-version-btn` (not `.new-version-btn`)
10. Screenshot 01-onboarding cannot be captured when Claude CLI is installed — skip is expected
11. `updateProject()` allowed fields: `name`, `group`, `coreFiles`, `activeVersion`, `evaluated`
12. **Parser debug logging is active** — `parser-debug.log` grows on every PTY chunk. Remove after fixing parser.
13. `CLAUDE_CODE_ENTRYPOINT=cli` env var is NOT cleared when spawning sessions — may affect Claude Code nesting detection

---

## Global Slash Commands

Seven global commands at `~/.claude/commands/`:
| Command | File | Purpose |
|---------|------|---------|
| `/start-project` | `start-project.md` | First session: reads all docs, generates tasklist if missing, asks comprehension questions. Pre-check: requires concept doc (run `/evaluate-import` first if missing). |
| `/continue` | `continue.md` | Reads `docs/{ProjectFolderName}_shp.md`, restores context |
| `/eod` | `eod.md` | Writes complete SHP to `docs/{ProjectFolderName}_shp.md`, always overwrites |
| `/reload-docs` | `reload-docs.md` | Re-reads all project docs after external changes |
| `/tested` | `tested.md` | Processes test file comments, presents Go/NoGo gate |
| `/create-tasklist` | `create-tasklist.md` | Manual trigger: reads concept doc, generates stage-gated tasklist |
| `/evaluate-import` | `evaluate-import.md` | For non-CCC imports: reads code/docs, interviews developer, generates concept doc + CLAUDE.md + tasklist |

---

## Git Remote
- Forgejo: `http://mcs-git.mcsfam.local:3000/Phet/CCC`
- Push after every stage Go decision
- Last push: Stage 14 + post-fixes (commit `56e69b1`)
- **Uncommitted changes:** import flow revision, licence file, parser debug logging, global tooling updates

---

## Screenshots Captured (docs/screenshots/)

| File | Content |
|------|---------|
| 02-main-dashboard.png | Default dashboard, sidebar + empty main panel |
| 03-tree-expanded.png | CCC project expanded, Versions header open, v1.0 visible |
| 04-tree-version-files.png | Version files listed under v1.0 |
| 05-no-active-session.png | "No active session" prompt with Start/Shell buttons |
| 06-read-panel.png | CLAUDE.md rendered in Read panel |
| 07-status-dots-sidebar.png | Sidebar-only crop showing status dots |
| 08-new-project-wizard.png | New Project wizard modal (blank) |
| 09-wizard-filled.png | Wizard with name + Web App template selected |
| 10-import-phase1.png | Import Existing Project modal |
| 11-settings-panel.png | Settings panel with all fields visible |
| 12-test-runner.png | Interactive test runner with checkboxes |
| 13-tab-bar-multiple.png | Multiple tabs open simultaneously |
| 14-light-theme.png | Light theme variant |
| 15-degraded-banner.png | Degraded status banner (simulated) |
| 16-new-version-modal.png | New Version modal (Major/Minor/Patch) |
| 17-drag-drop-groups.png | Groups showing drag & drop targets |

Missing: 01-onboarding.png (cannot capture — Claude CLI installed)

---

## Open Items
- **Parser stuck on grey** — debug logging added, awaiting CCC restart + interaction to capture `parser-debug.log`
- `CLAUDE_CODE_ENTRYPOINT=cli` not cleared in PTY env — may be relevant to parser issue
- `01-onboarding.png` missing — manual text describes the screen in words
- Bonus: animated GIF of live status dots (Playwright extension — not yet written)
- Stage 15 completion: GitHub account setup, `v1.0.0` tag, make repo public
- Stage 16 Go/NoGo gate not yet presented

## Next Actions
1. **PRIORITY: Fix parser** — restart CCC, open a Claude session in CCC, interact briefly, read `parser-debug.log`, identify why patterns don't match, fix patterns, remove debug logging
2. Also check: clear `CLAUDE_CODE_ENTRYPOINT` in session env (gotcha #13) — may prevent Claude from starting properly
3. After parser fix: commit all uncommitted changes (import flow, licence, parser fix, global tooling)
4. Present Stage 16 Go/NoGo gate
5. Return to Stage 15 — GitHub account, `v1.0.0` tag, ship
