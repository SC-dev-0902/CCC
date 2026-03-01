# Session Handover Pack — CCC
*Generated: 2026-03-01*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Version:** v1.0.0 (shipped)
- **Stage:** All 16 stages complete, all Go/NoGo gates passed
- **Status:** Post-ship polish complete. Future fixes via official patch process.
- **Build:** 24 (total commit count via `git rev-list --count HEAD`)

---

## What Was Done This Session

1. **Warning banner OK button** — replaced `×` close button with an "OK" confirmation button on `showWarning()` banners; removed auto-close timer. Warning must be explicitly acknowledged.
2. **Committed and pushed** — all accumulated post-ship polish changes (`9661d1f`), pushed to both Forgejo and GitHub.
3. **PDF regenerated** — `docs/USER_MANUAL.pdf` updated with all manual changes.

### Previous session (carried over — same uncommitted batch):
4. **Import wizard always sets `evaluated: false`** — removed conditional `needsEvaluation`, all imports start unevaluated.
5. **Evaluated flag normalization** — server auto-clear changed from `=== false` to `!== true`, normalizing legacy imports with `undefined` evaluated field.
6. **Template marker check** — auto-clear reads concept doc content; if `<!-- CCC_TEMPLATE:` marker present, doc is still blank template, flag stays `false`.
7. **Parked project session guard** — Parked + evaluated projects cannot start sessions (banner: "Move to Active"). Parked + unevaluated CAN start sessions (needed for `/evaluate-import`).
8. **Block unevaluated from Active group** — edit modal, drag-and-drop, and import wizard all prevent unevaluated projects from entering the Active group.
9. **Always-visible Testing section** — removed conditional; Testing sub-header always rendered under version nodes, shows "No test files yet" when empty.
10. **`showWarning()` function** — centered orange banner with OK button, distinct from `showToast()`.
11. **USER_MANUAL.md updates** — import scaffolding, traffic light dots, Active group rules, testing section, concept template recommendation.

---

## Decisions Made

- **All imports start unevaluated** — no conditional check. Auto-clear handles projects with real docs.
- **`evaluated !== true` instead of `=== false`** — catches `undefined` (legacy imports), `false` (new imports), and any other non-true value.
- **Parked + unevaluated = can start sessions** — resolves catch-22 where user couldn't evaluate (needs session) and couldn't activate (needs evaluation).
- **Warning vs Toast** — warnings are centered, orange, require OK confirmation. Toasts are subtle corner notifications for info.
- **Import always goes to non-Active group** — Active excluded from import wizard group dropdown.
- **Future fixes go through official patch process** — no more ad-hoc post-ship changes.

---

## Full Project Timeline

| Commit | Description | Date |
|--------|-------------|------|
| `09aadcd` | Stage 01 + 02 — static UI shell with project persistence | — |
| `99a8e65` | Stage 03 — terminal sessions with PTY + xterm.js | — |
| `d7c74f1` | Stage 04 — status detection parser module | — |
| `fa14b5f` | Stage 06 — project versioning with tree view | — |
| `a0beeef` | Stage 07 — new project wizard with template scaffolding | — |
| `40c1ce9` | Post-07 fixes — API hardening, loading overlay, group pruning | — |
| `581d9b5` | Stage 08 — import existing projects | — |
| `774d9f3` | Stage 09 — settings panel with persistence | — |
| `1176bd0` | Stage 10 — project memory with SHP and slash commands | — |
| `3dcecdd` | Stage 11 — resilience and polish for daily use | — |
| `955643f` | Stage 12 — session-version binding, test runner | — |
| `90d300b` | Post-12 fixes — parser hardening, test runner crash fix | — |
| `3229ecf` | Stage 14 — housekeeping, audits, UI polish | — |
| `56e69b1` | Post-14 — README feature list, tree view touch targets | — |
| `ec2cc53` | Stage 16 — user manual, screenshots, PDF | — |
| `c080ae0` | Post-16 — parser fix, import flow, licence, starter scripts | — |
| `1041d8e` | Final README review, Stage 16 Go recorded | — |
| `d081619` | Create bug_report.yml | — |
| `a30a71d` | Stage 15 Go — v1.0.0 shipped | — |
| `1cccf92` | EOD — final v1.0.0 SHP | — |
| `4a88a41` | Fix import wizard scaffolding, traffic light dots, build number | — |
| `403056b` | Parked session guard, always-visible Testing, import eval fix | — |
| `296d295` | Fix evaluated flag normalization, block unevaluated from Active | — |
| `9661d1f` | Post-ship polish: warning banners, eval normalization, testing | 2026-03-01 |

Tag `v1.0.0` exists on `a30a71d`.

---

## Architecture & File Map

| File | Lines | Purpose |
|------|-------|---------|
| `server.js` | 1320 | Express server entry point. All API endpoints, WebSocket upgrade, PTY lifecycle, scaffolding, template generators, build number, preflight check. |
| `src/parser.js` | 363 | **Sacred.** All Claude Code output parsing. Status detection state machine: pattern matching → 5 states. Degradation monitor. |
| `src/sessions.js` | 326 | PTY session management. Spawn, resize, write, destroy. Session registry keyed by `projectId`. Env sanitization (clears `CLAUDECODE` + `CLAUDE_CODE_ENTRYPOINT`). |
| `src/projects.js` | 172 | Project registry CRUD. JSON persistence to `data/projects.json`. `updateProject` allows: name, group, coreFiles, activeVersion, evaluated. |
| `src/versions.js` | 282 | Version management. `scanVersionFiles()` returns `{ files[], testFiles[] }`. Version create/delete. Flat-to-versioned migration. |
| `public/app.js` | 2773 | Entire frontend SPA. Tree view, tab bar, terminal management, read panel, settings, wizards, test runner, drag-and-drop. |
| `public/styles.css` | 1805 | All styling. Dark/light themes via CSS variables. |
| `public/index.html` | — | Shell HTML. Loads vendor libs (xterm, marked) + app.js/styles.css. |
| `data/projects.json` | — | Project registry. Groups + projects array. Committed (no absolute paths). |
| `data/settings.json` | — | User settings. Gitignored. |
| `docs/USER_MANUAL.md` | 516 | Full user manual with screenshot references. |
| `docs/CCC_Roadmap.md` | — | Version plan: v1.0, v1.1, v2.0. |
| `tools/` | — | Platform installers (macOS/Linux/Windows), build-release.sh, screenshot.js (Playwright). |

---

## API Endpoint Inventory

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects` | List all projects + groups |
| POST | `/api/projects` | Create a new project |
| PUT | `/api/projects/:id` | Update project (name, group, coreFiles, activeVersion, evaluated) |
| DELETE | `/api/projects/:id` | Remove project (optional disk delete) |
| PUT | `/api/projects-reorder` | Reorder projects within/between groups |
| POST | `/api/groups` | Create a new group |
| DELETE | `/api/groups/:name` | Delete a group (moves projects to default) |
| GET | `/api/browse` | Browse filesystem directories |
| GET | `/api/settings` | Read settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/file/:projectId` | Read a file from a project (query: `?path=relative/path`) |
| PUT | `/api/file/:projectId` | Write a file to a project |
| POST | `/api/open-editor` | Open file in external editor |
| GET | `/api/projects/:id/versions` | List versions for a project (+ auto-clear evaluated flag) |
| POST | `/api/projects/:id/versions` | Create a new version (major/minor/patch) |
| PUT | `/api/projects/:id/active-version` | Set active version |
| DELETE | `/api/projects/:id/versions/:version` | Delete a version (not active) |
| POST | `/api/projects/:id/versions/:version/complete` | Complete a version (git tag) |
| POST | `/api/projects/:id/migrate-versions` | Migrate flat docs → versioned structure |
| POST | `/api/scaffold-project` | Scaffold new project (wizard) |
| POST | `/api/scaffold-import` | Scaffold CCC structure into imported project |
| GET | `/api/preflight` | Check if Claude Code CLI is available |
| GET | `/api/version` | CCC version + build number |
| POST | `/api/scan-project` | Scan a directory for existing project files |
| POST | `/api/sessions/:projectId` | Create a PTY session |
| GET | `/api/sessions/:projectId` | Get session status |
| GET | `/api/sessions` | List all active sessions |

WebSocket: `ws://host:port` — terminal I/O, status updates, resize events.

---

## Frontend State Model

### Global State Variables
- `groups` — array of `{ name, order }`, sorted by order
- `projectsList` — array of project objects from API
- `openTabs` — array of `{ id, projectId, type, filePath?, label }` — `type` is `'session'` or `'file'`
- `activeTab` — string tab ID or null
- `settings` — object from `/api/settings`
- `suppressRender` — boolean, prevents cascading re-renders during batch updates

### Maps and Sets
- `terminalInstances` — `Map<projectId, { terminal, fitAddon, ws, container, state, claudeStatus, degraded }>`
- `projectVersions` — `Map<projectId, { activeVersion, versions[], hasFlatDocs }>`
- `expandedProjects` — `Set<projectId>` — which projects are expanded in tree
- `collapsedGroups` — `Set<groupName>` — which groups are collapsed
- `expandedVersions` — `Set<"projectId:version">` — which version rows are expanded
- `expandedVersionHeaders` — `Set<projectId>` — which Versions headers are expanded
- `expandedTestingSections` — `Set<"projectId:version">` — which Testing sub-headers are expanded
- `readPanelTimers` — `Map<tabId, intervalId>` — auto-refresh timers for read panels
- `dragState` — `{ projectId, sourceGroup }` or null

### Tab ID Scheme
- Session tabs: `projectId::session` (double colon)
- File tabs: `projectId:filePath` (single colon)

### Rendering Pipeline
`loadProjects()` → `renderTreeView()` + `renderTabs()` → `showTab(tabId)` → `renderSessionContent()` or `renderReadPanel()` or `renderTestRunner()`

### Key Functions
- `getProjectStatus(projectId)` — returns status object with `color` and `label`; checks `evaluated === false` → orange, then session state
- `showToast(message)` — subtle corner notification, auto-closes after 3s
- `showWarning(message)` — centered orange banner, requires OK click to dismiss
- `renderPhase1()` / `renderPhase2()` — import wizard phases
- `startSession(projectId, mode)` — mode is `'claude'` or `'shell'`; guards against Parked+evaluated
- `handleDrop(e)` — drag-and-drop with unevaluated→Active guard

---

## Key Technical Details

### Parser State Machine (`src/parser.js`)
- Reads PTY output stream, matches against regex patterns
- 5 states: `WAITING_FOR_INPUT` (red), `RUNNING` (yellow), `COMPLETED` (green), `ERROR` (orange), `UNKNOWN` (grey)
- Degradation: if unrecognised output persists >60s of activity, enters degraded state (all grey, warning banner)
- `startDegradeMonitor()` must NOT be called — causes false positives on streaming character output

### Evaluated Flag Lifecycle
- `undefined` (legacy) → normalized to `true` or `false` on first version load
- `false` (needs evaluation) → set on import, or when template marker found, or when no concept doc
- `true` (evaluated) → set when real concept doc found (no template marker)
- Template marker: `<!-- CCC_TEMPLATE: Run /evaluate-import to populate this document -->`
- Auto-clear runs in `GET /api/projects/:id/versions` — checks concept doc content

### Traffic Light Dots
- Active version dot: green when `evaluated !== false`, orange when `evaluated === false`
- Session dots: standard 5-state parser colours
- Tab dots: mirror session state

### Path Resolution
- `settings.projectRoot` — base directory for all project paths
- Project paths in `projects.json` are relative to `projectRoot`
- `resolveProjectPath(project)` → `path.join(projectRoot, project.path)`
- All file operations use `path.join()` — no hardcoded separators

### Version Model
- Versions live in `docs/vX.Y/` folders
- Patches nest: `docs/v1.1/v1.1.1/`
- Active version tracked in `projects.json` `activeVersion` field
- `scanVersionFiles()` returns `{ files[], testFiles[] }` per version
- Version create scaffolds concept + tasklist templates
- Version delete: blocked for active version, removes folder from disk

### Import Scaffolding
- `POST /api/scaffold-import` — creates `docs/vX.Y/`, CLAUDE.md, `.claude/commands/`, `.ccc-project.json`
- Only scaffolds files that don't already exist (per-file checks)
- Version string parsing: `1.0.0` → folder `v1.0`
- All imports start unevaluated, go to non-Active group
- Active group excluded from import wizard dropdown

### Build Number
- `git rev-list --count HEAD` — total commit count, increments with every commit
- No dependency on commit message format

---

## Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| express | ^4.21.2 | HTTP server |
| node-pty | ^1.2.0-beta.11 | **Beta required** for Node.js v25 compatibility |
| ws | ^8.19.0 | WebSocket server |
| @xterm/xterm | ^6.0.0 | Terminal emulator |
| @xterm/addon-fit | ^0.11.0 | Auto-fit terminal to container. **UMD export:** `new FitAddon.FitAddon()` not `new FitAddon()` |
| marked | ^17.0.3 | Markdown rendering |
| dotenv | ^16.4.7 | Environment variable loading |
| playwright | ^1.58.2 | **Dev only.** Screenshot capture for manual. |

---

## Known Gotchas

1. **PTY env leak** — must clear both `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT` env vars when spawning PTY, or Claude Code detects nesting and alters output format.
2. **FitAddon UMD constructor** — `new FitAddon.FitAddon()` (double), not `new FitAddon()`.
3. **`node-pty` beta** — must use `^1.2.0-beta.11` for Node.js v25. Stable releases don't compile.
4. **`startDegradeMonitor()` disabled** — calling it causes false positives on streaming character output after 60s.
5. **`evaluated: undefined` vs `false`** — JS strict equality means `undefined === false` is `false`. Server normalization handles this, but client code must use `!== true` or `=== false` carefully.
6. **Template marker** — auto-clear checks concept doc content for `<!-- CCC_TEMPLATE:`. If marker present, doc is still blank. Removing the marker manually triggers auto-clear on next version load.
7. **Drag-and-drop re-render** — when a drag is blocked (e.g., unevaluated → Active), must call `renderTreeView()` before returning, or DOM shows the move visually even though it was rejected.
8. **CCC must not be developed via CCC** — restart problem. Use normal Claude Code terminal.
9. **Git remotes** — push to both `origin` (Forgejo) and `github` (GitHub).

---

## Open Items

- None blocking. All v1.0.0 work is complete and shipped.
- Future fixes go through the official bug fix/patch process (v1.0.1+).

---

## Next Actions

1. **Start with concept doc** — read `docs/v1.0/CCC_concept.md` and `docs/CCC_Roadmap.md` to understand scope of next version.
2. **Any new bugs** → create patch version (v1.0.1) via official process: concept doc seeded from v1.0, own tasklist, stage gates.
3. **v1.1 scope** — roadmap will change slightly; details TBD with Phet.
4. **Changelog** — do not auto-update. Ask Phet before any changelog/roadmap changes.
