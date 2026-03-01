# Session Handover Pack — CCC
*Generated: 2026-03-01*

## Project
**CCC — Claude Command Center**
**Version:** 1.0.0 — **SHIPPED**
**Build:** 21 (total git commits)
**All stages (01–16) complete — all Go/NoGo gates passed**
**Tag:** `v1.0.0` pushed to Forgejo and GitHub
**Last commit:** `4a88a41` — Fix import wizard scaffolding, traffic light dots, build number

---

## What Was Done This Session

### Import Wizard — Bug Fixes (#1 & #2)
- **Bug #2 fixed:** Imported projects now get full CCC folder structure scaffolded into them. New `POST /api/scaffold-import` endpoint creates `docs/vX.Y/`, `CLAUDE.md`, `.claude/commands/`, `.ccc-project.json` — only for files that don't already exist (additive only, never overwrites).
- Three new template generators: `generateImportClaudeMd()`, `generateImportConceptMd()`, `generateImportTasklistMd()` — version-parameterised, concept doc includes `<!-- CCC_TEMPLATE: -->` marker.
- Version field added to Import Wizard Phase 2 (defaults to `1.0.0`, validates `X.Y` or `X.Y.Z` format). Version determines the `docs/vX.Y/` folder name.
- **Bug #1 fixed:** Evaluate-import notice now persists correctly. Auto-clear logic in `GET /api/projects/:id/versions` reads concept doc content and checks for template marker — only clears `evaluated: false` when marker is absent (real content replaces template).
- **CSS fix:** `.evaluate-notice` background was `var(--status-orange)` (undefined variable, invisible) → changed to `var(--status-error)` (actual orange `#db6d28`).
- Scaffold per-file checks: changed from folder-level `vFolderHasFiles` to individual `!fs.existsSync()` per file, so partial scaffolds work correctly.

### Traffic Light Dots
- Active version dot changed from static blue to status-coloured: green = OK, orange = needs attention (unevaluated import), yellow = running, red = waiting.
- No-session default changed from grey (`unknown`) to green (`completed`).
- Removed separate `version-status-dot` span — `version-active-dot` now carries both "active" and "status" meaning via CSS class.
- `getProjectStatus()` checks `project.evaluated === false` first → returns `'error'` (orange).

### Build Number Fix
- Replaced `git log --grep=^Stage` with `git rev-list --count HEAD`. Build = total commit count, format-agnostic, always incrementing.
- Convention added to `~/.claude/CLAUDE.md` §1.6.

### Documentation & Cleanup
- Updated `CLAUDE.md` — replaced "never modify imported project files" with "import scaffolding is additive only" rule; added traffic light dot docs to Status Model.
- Updated `docs/v1.0/CCC_concept.md` — Import Rules section rewritten for scaffolding, template markers, version field.
- Updated `docs/USER_MANUAL.md` — import wizard (version field, scaffolding, orange banner), status dots (traffic light), active version (green/orange not blue).
- Regenerated `docs/USER_MANUAL.pdf` (1.1 MB).
- Removed LedgerNest test entry from `data/projects.json`.
- Pushed to both remotes (Forgejo + GitHub).

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Import scaffolds into existing projects | Overrides original "read-only on filesystem" rule. Without scaffolding, imported projects look nothing like wizard-created ones. |
| Template marker `<!-- CCC_TEMPLATE: -->` | Prevents auto-clear from defeating the evaluate-notice. Simple string check, no schema changes needed. |
| Traffic light dots (not static blue) | Blue had no semantic meaning. Humans think red=stop, orange=caution, green=OK. Active version dot now conveys status. |
| No-session = green (not grey) | Grey implied something wrong. No session + docs OK = project is fine = green. |
| Build = commit count | Stage-number extraction was fragile. `git rev-list --count HEAD` is simple and always incrementing. |
| Per-file scaffold checks | Folder-level check skipped all files if folder existed with even one file. Per-file check allows partial scaffolding. |
| Evaluated flag set LAST in import | Must be after scaffolding + coreFiles update so it's the final state — prevents auto-clear race. |

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

### Day 5 — 2026-02-28

**Stage 16 — User Manual** (commit `ec2cc53`, Go)
- 16 Playwright screenshots, full manual, PDF export, HEP passed

**Post-Stage 16** (commit `c080ae0`)
- Parser fix (CLAUDE_CODE_ENTRYPOINT), degraded monitor disabled, import flow revised, ELv2 licence, starter scripts, release archives rebuilt

**Final** (commits `1041d8e`, `d081619`, `a30a71d`, `1cccf92`)
- README updated, bug_report.yml, Stage 15+16 Go, v1.0.0 tag pushed, final SHP

### Day 6 — 2026-03-01

**Post-ship bug fixes** (commit `4a88a41`)
- Import wizard scaffolding, traffic light dots, build number fix, USER_MANUAL update + PDF, cleanup

---

## Architecture & File Map

```
CCC/                           (6,973 lines total)
├── CLAUDE.md                  ← project contract (derived from active version's concept doc)
├── LICENSE                    ← Elastic License 2.0
├── CHANGELOG.md               ← public-facing changelog (v1.0.0)
├── README.md                  ← install + run instructions, feature list, licence
├── server.js                  (1,304 lines) Express entry point, all HTTP + WebSocket routes, template generators
├── src/
│   ├── parser.js              (363 lines)  SACRED: all Claude Code output parsing
│   ├── sessions.js            (326 lines)  PTY lifecycle, WebSocket clients, parser integration
│   ├── projects.js            (172 lines)  projects.json CRUD, path resolution, group management
│   └── versions.js            (282 lines)  version scanning, creation, migration, test checkbox counting
├── public/
│   ├── index.html             (53 lines)   Minimal skeleton: sidebar, resize handle, main panel
│   ├── app.js                 (2,716 lines) All state, rendering, modals, terminals, test runner
│   └── styles.css             (1,757 lines) CSS custom properties, dark/light themes
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
│   ├── v1.0/                  ← Active version
│   │   ├── CCC_concept.md
│   │   ├── CCC_tasklist.md
│   │   └── CCC_test_stage*.md ← Test files (stages 01–14)
│   └── v1.1/                  ← Next version (scaffolded, not started)
│       ├── CCC_concept.md
│       └── CCC_tasklist.md
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
| PUT | `/api/file/:projectId` | Write file content `{ filePath, content }` — used by test runner |
| POST | `/api/open-editor` | Launch external editor with file path |
| GET | `/api/browse?path=` | List subdirectories for browser modal |

### Versions
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/:id/versions` | Scan version structure (includes auto-clear of evaluated flag with template marker check) |
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
| GET | `/api/version` | App version + build number (`git rev-list --count HEAD`) |
| GET | `/api/preflight` | Check if `claude` CLI is installed |
| POST | `/api/scaffold-project` | New project wizard backend |
| POST | `/api/scaffold-import` | Import scaffolding backend (creates docs/vX.Y/, CLAUDE.md, .claude/commands/, .ccc-project.json) |
| POST | `/api/scan-project` | Import scan backend (detect CCC files) |

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

**Status resolution in `getProjectStatus()`:**
1. `project.evaluated === false` → `'error'` (orange dot)
2. No terminal instance → `'completed'` (green dot)
3. Session exited → `'completed'` (green dot)
4. Degraded → `'unknown'` (grey dot)
5. Parser state from terminal output → mapped to status string

**Import flow:**
1. Phase 1: scan directory → `POST /api/scan-project`
2. Phase 2: confirm name, version, group → `POST /api/projects` (register) → `POST /api/scaffold-import` (scaffold) → `PUT /api/projects/:id` (coreFiles) → `PUT /api/projects/:id/active-version` → `PUT /api/projects/:id` (evaluated: false, if needed — LAST)
3. `loadProjectVersions()` syncs `evaluated` from version scan response to project object
4. `renderSessionContent()` shows orange `.evaluate-notice` banner when `project.evaluated === false`

**Test file progress:** `countTestCheckboxes(filePath)` in `versions.js` returns `{ checked, total }` — displayed as `[x/y]` badge in tree view

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

**Critical PTY env fix:** Both `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT` must be deleted from PTY env. If either leaks, Claude Code detects nesting and alters output, breaking pattern matching.

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

## Dependencies (package.json v1.0.0)

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.21.2 | HTTP server |
| ws | ^8.19.0 | WebSocket |
| node-pty | ^1.2.0-beta.11 | PTY spawning (**beta required for Node v25**) |
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
3. **PTY env must clear both `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT`** — if either leaks, Claude Code detects nesting and alters output, breaking the parser
4. **`startDegradeMonitor()` must NOT be called** — causes false positives on streaming character output after 60s
5. **CSS variable names:** Orange state uses `--status-error` (not `--status-orange`). There is no `--status-orange` variable.
6. Server must be restarted for code changes — no hot-reload
7. Build number = `git rev-list --count HEAD` — only computed at server startup, only updates on restart
8. File API has path traversal protection — resolved path must start with project directory
9. Settings update whitelists keys: `['projectRoot', 'editor', 'shell', 'theme', 'filePatterns', 'githubToken']`
10. Tab ID scheme: `::session` (double colon) vs `:filePath` (single colon) — must not confuse the two
11. `updateProject()` allowed fields: `name`, `group`, `coreFiles`, `activeVersion`, `evaluated`
12. **Import evaluated flag must be set LAST** in the submit handler — after scaffolding and coreFiles update — otherwise auto-clear can race and clear it
13. **Template marker `<!-- CCC_TEMPLATE: -->`** in scaffolded concept docs prevents auto-clear from prematurely removing the evaluate-notice
14. Playwright selectors: `.tree-file` (not `.tree-file-link`), `.tree-testing-file` (not `.tree-test-file`), `.add-version-btn` (not `.new-version-btn`)
15. Screenshot 01-onboarding cannot be captured when Claude CLI is installed — skip is expected

---

## Git Remotes

| Remote | URL | Purpose |
|--------|-----|---------|
| origin | `http://mcs-git.mcsfam.local:3000/Phet/CCC.git` | Forgejo (primary) |
| github | `https://github.com/SC-dev-0902/CCC.git` | GitHub (public) |

- Credentials for GitHub stored via `git credential-store` (not in URL)
- Push to both remotes after stage Go decisions
- Last push: `4a88a41` — post-ship bug fixes (both remotes up to date)

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

## Open Items

- v1.1 scope: `docs/v1.1/` folder exists with concept doc and tasklist skeleton — scope not yet defined
- Linux/Windows testing: code is platform-aware but untested on non-macOS
- HEP applies to updated USER_MANUAL.md — human review before publish
- Bonus animated GIF of live status dots not yet written
- `01-onboarding.png` screenshot missing — manual describes the screen in words

## Next Actions

1. Review updated `docs/USER_MANUAL.md` text (HEP applies)
2. Define v1.1 scope and populate `docs/v1.1/CCC_concept.md`
3. When ready, run `/start-project` or `/continue` to begin v1.1 work
4. Continue developing CCC in normal CC terminal (not via CCC — restart problem)
