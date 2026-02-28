# Session Handover Pack — CCC

## Project
**CCC — Claude Command Center**
**Version:** 1.0.0 — **SHIPPED**
**All stages (01–16) complete — all Go/NoGo gates passed**
**Tag:** `v1.0.0` pushed to Forgejo and GitHub

---

## What Was Done This Session

### Parser Fix (Root Cause Found)
- Status dots stuck on grey — root cause: `CLAUDE_CODE_ENTRYPOINT=cli` env var leaked into PTY sessions
- Claude Code detected nesting and altered its output → parser patterns couldn't match
- Fix: `src/sessions.js` now deletes both `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT` from PTY env
- Parser confirmed working via debug logging: `unknown → completed → running → completed` transitions verified

### Degraded Banner Fix
- `startDegradeMonitor()` was still active despite degradation being "disabled" in `feed()`
- During streaming character-by-character output, `lastRecognisedAt` stopped updating → timer fired after 60s
- Fix: replaced `startDegradeMonitor()` call in `sessions.js` with comment — monitor disabled for v1.0
- Degradation redesign deferred to v1.1

### Desktop Starter Scripts
- `tools/macos/start_CCC.command` — double-clickable, starts server + opens browser
- `tools/linux/start_CCC.sh` — same for Linux (xdg-open)
- `tools/windows/start_CCC.bat` — same for Windows
- All scripts: read PORT from .env, check if already running, wait for server ready
- `tools/build-release.sh` updated to include starters + LICENSE + CHANGELOG.md in archives

### Release Archives Rebuilt
- `dist/CCC-1.0.0-macos.tar.gz`, `dist/CCC-1.0.0-linux.tar.gz`, `dist/CCC-1.0.0-windows.zip`
- Now include: installer, starter script, LICENSE, CHANGELOG.md

### PDF Regenerated
- `docs/USER_MANUAL.pdf` regenerated via `node tools/manual-to-pdf.js`

### GitHub Setup
- GitHub account created: `SC-dev-0902`
- Remote added: `github` → `https://github.com/SC-dev-0902/CCC.git`
- Credentials stored via `git credential-store` (not in URL)
- Repo made public
- `bug_report.yml` created via GitHub web UI (issue template)

### Stage Gates
- **Stage 16 (User Manual)** — GO
- **Stage 15 (v1.0 Release)** — GO
- `v1.0.0` tag created and pushed to both remotes

### README Updated
- Clone URL points to GitHub
- Starter scripts documented in Quick Start
- Project structure tree updated with starter scripts
- Licence section added (ELv2)

## Decisions Made

- **Parser root cause:** `CLAUDE_CODE_ENTRYPOINT=cli` — must be cleared from PTY env
- **Degradation monitor:** disabled entirely for v1.0 (false positives on streaming output)
- **CCC must not be developed via CCC** — rule stands for v1.1 (restart problem)
- **Roadmap will change slightly** for v1.1 — details TBD next session
- **GitHub as second remote** — Forgejo remains `origin`, GitHub is `github`

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

**Stage 15 — v1.0 Release** (commit `a30a71d`, Go)
- README final review, `v1.0.0` tag, GitHub public, CCC self-import

**Stage 16 — User Manual** (commit `ec2cc53`, Go)
- 16 Playwright screenshots, full manual, PDF export, HEP passed

### Day 5 — 2026-02-28

**Post-Stage 16** (commit `c080ae0`)
- Parser fix (CLAUDE_CODE_ENTRYPOINT), degraded monitor disabled, import flow revised, ELv2 licence, starter scripts, release archives rebuilt

**Final** (commits `1041d8e`, `d081619`, `a30a71d`)
- README updated, bug_report.yml, Stage 15+16 Go, v1.0.0 tag pushed

---

## Architecture & File Map

```
CCC/
├── CLAUDE.md                  ← project contract (derived from active version's concept doc)
├── LICENSE                    ← Elastic License 2.0
├── CHANGELOG.md               ← public-facing changelog (v1.0.0)
├── README.md                  ← install + run instructions, feature list, licence
├── server.js                  ← Express entry point, all HTTP + WebSocket routes
├── src/
│   ├── parser.js              ← SACRED: all Claude Code output parsing
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
│   ├── macos/
│   │   ├── install_CCC.sh     ← Installer (macOS)
│   │   └── start_CCC.command  ← Desktop starter (macOS)
│   ├── linux/
│   │   ├── install_CCC.sh     ← Installer (Linux)
│   │   └── start_CCC.sh       ← Desktop starter (Linux)
│   ├── windows/
│   │   ├── install_CCC.ps1    ← Installer (Windows)
│   │   └── start_CCC.bat      ← Desktop starter (Windows)
│   ├── build-release.sh       ← Builds OS-specific release archives
│   ├── screenshot.js          ← Playwright screenshot automation (17 shots)
│   └── manual-to-pdf.js       ← Markdown→PDF via marked + Playwright
├── dist/                       ← Release archives (gitignored)
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
| GET | `/api/projects/:id/versions` | Scan version structure (includes `testFiles[]`, `evaluated` field, auto-clears evaluated flag) |
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
| POST | `/api/scan-project` | Import scan backend (no hard gate) |

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

**Import flow:**
- `scanResult.detected.concept.found` determines if project needs evaluation
- `needsEvaluation` flag set during import → `PUT /api/projects/:id { evaluated: false }`
- `loadProjectVersions()` syncs `evaluated` from version scan response to project object
- `renderSessionContent()` shows orange `.evaluate-notice` banner when `project.evaluated === false`

**Test file progress:** `countTestCheckboxes(filePath)` in `versions.js` returns `{ checked, total }` — displayed as `[x/y]` badge in tree view

**Sidebar persistence:** `initResize()` saves width to `localStorage('ccc-sidebar-width')` on mouseup, restores on init

---

## Parser State Machine (src/parser.js)

Detection priority (checked in order):
1. **WAITING_FOR_INPUT** — permission prompts (`Claude wants to`, `[y]/[n]`, `(y/n)`, `Do you want to`, `❯ \d` selection list, `Esc to cancel`)
2. **RUNNING** — `(thinking)`, thinking verbs (`· Verbing…`), spinner chars (`✢✳✶✻✽⏺⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`), tool use (`⏺.*file|ctrl+o`)
3. **COMPLETED** — BEL char after RUNNING, input prompt `❯`, or RUNNING timeout (3s no activity)
4. **ERROR** — error patterns (`Error:`, `Permission denied`, `rate limit`) only when NOT currently RUNNING
5. **UNKNOWN** — no session or unrecognised

**Degradation:** Disabled in v1.0 (false positives on streaming character output). Monitor not started. Redesign deferred to v1.1.

**Running state debounce:** Persists for 2 seconds after last indicator.

**Filters (before detection):**
- Empty chunks (pure ANSI) → skipped
- Horizontal rules (`─────`) → skipped
- `? for shortcuts` → skipped
- `/ide for ...` → skipped

**Critical PTY env fix:** Both `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT` must be deleted from PTY env. If either leaks, Claude Code detects nesting and alters output, breaking pattern matching.

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
- **CCC must not be developed via CCC** — normal CC terminal only (restart problem)
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
12. **PTY env must clear both `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT`** — if either leaks, Claude Code detects nesting and alters output, breaking the parser
13. Degradation monitor must NOT be started — `startDegradeMonitor()` causes false positives on streaming character output after 60s

---

## Git Remotes

| Remote | URL | Purpose |
|--------|-----|---------|
| origin | `http://mcs-git.mcsfam.local:3000/Phet/CCC.git` | Forgejo (primary) |
| github | `https://github.com/SC-dev-0902/CCC.git` | GitHub (public) |

- Credentials for GitHub stored via `git credential-store` (not in URL)
- Push to both remotes after stage Go decisions
- Last push: `a30a71d` — Stage 15 Go, v1.0.0 shipped

---

## Global Slash Commands

Seven global commands at `~/.claude/commands/`:
| Command | File | Purpose |
|---------|------|---------|
| `/start-project` | `start-project.md` | First session: reads all docs, generates tasklist if missing |
| `/continue` | `continue.md` | Reads SHP, restores context |
| `/eod` | `eod.md` | Writes complete SHP, always overwrites |
| `/reload-docs` | `reload-docs.md` | Re-reads all project docs after external changes |
| `/tested` | `tested.md` | Processes test file comments, presents Go/NoGo gate |
| `/create-tasklist` | `create-tasklist.md` | Manual trigger: reads concept doc, generates tasklist |
| `/evaluate-import` | `evaluate-import.md` | For non-CCC imports: interviews developer, generates docs |

---

## Screenshots (docs/screenshots/)

| File | Content |
|------|---------|
| 02-main-dashboard.png | Default dashboard, sidebar + empty main panel |
| 03-tree-expanded.png | CCC project expanded, Versions header open |
| 04-tree-version-files.png | Version files listed under v1.0 |
| 05-no-active-session.png | "No active session" prompt |
| 06-read-panel.png | CLAUDE.md rendered in Read panel |
| 07-status-dots-sidebar.png | Sidebar crop showing status dots |
| 08-new-project-wizard.png | New Project wizard modal (blank) |
| 09-wizard-filled.png | Wizard with name + template selected |
| 10-import-phase1.png | Import Existing Project modal |
| 11-settings-panel.png | Settings panel |
| 12-test-runner.png | Interactive test runner with checkboxes |
| 13-tab-bar-multiple.png | Multiple tabs open |
| 14-light-theme.png | Light theme variant |
| 15-degraded-banner.png | Degraded status banner (simulated) |
| 16-new-version-modal.png | New Version modal |
| 17-drag-drop-groups.png | Groups with drag & drop targets |

Missing: 01-onboarding.png (cannot capture — Claude CLI installed)

---

## Open Items

- Roadmap will change slightly for v1.1 — details TBD
- Bonus animated GIF of live status dots not yet written
- `01-onboarding.png` missing — manual describes the screen in words

## Next Actions

1. Read roadmap (`docs/CCC_Roadmap.md`), discuss v1.1 scope with Phet
2. Create `docs/v1.1/` with concept doc and tasklist
3. Continue developing CCC in normal CC terminal (not via CCC)
