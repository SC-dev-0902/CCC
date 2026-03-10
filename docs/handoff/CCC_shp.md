# Session Handover Pack — CCC
*Generated: 2026-03-08 | Version: v1.0.2 | Commit: fca4a1a*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Version:** v1.0.2 (tagged, shipped)
- **Active version in projects.json:** 1.0
- **Stage:** v1.0.2 complete — all 4 stages GO
- **Status:** Pushed to GitHub. Forgejo pending (offline): `git push origin main --tags`

---

## What Was Done This Session

### v1.0.2 — Workspace Compatibility + Documentation Model

**Stage 01: Scaffolding Updates**
- New Project Wizard: versioned filenames (`{Name}_concept_v{X.Y}.md`), topic folders, PROJECT_MAP.md
- Import Wizard: non-destructive topic folder scaffolding, PROJECT_MAP.md if missing
- New Version action: versioned filenames for concept + tasklist
- `scanVersionFiles()`: detects both old-style and new-style filenames
- Active version delete with auto-fallback (patch→parent, minor/major→previous, last version blocked)
- Tasklist stage progress badge `[x/y]` via `countCompletedStages()`

**Stage 02: Path Migration**
- Recovery auto-save: `docs/handoff/${name}_recovery.md` (was `docs/${name}_recovery.txt`)
- Auto-inject `/continue`: checks new paths first, falls back to old paths
- Updated `~/.claude/commands/continue.md` to check `docs/handoff/` first

**Stage 03: CCC Self-Migration**
- Created topic folders for CCC: discussion/, architecture/, spec/, adr/, context/, handoff/
- Moved `docs/CCC_shp.md` → `docs/handoff/CCC_shp.md`
- Updated CLAUDE.md: filename convention (forward-only), project structure, SHP paths
- Created PROJECT_MAP.md
- Startup migration: creates topic folders + backfills `evaluated` for all registered projects

**Stage 04: Settings, Verification & Ship**
- Settings defaults: versioned filename patterns with `{VERSION}` placeholder
- Wizard location defaults to `{projectRoot}/Projects`
- Scaffold wizard sets `evaluated: true`
- All 11 project paths verified OK
- Import test deferred (no project available)

**Post-patch:**
- Version bumped to 1.0.2 in package.json
- USER_MANUAL.md + PDF updated (new `tools/manual-pdf.js`)
- Fixed coreFiles: LedgerNest underscore prefix, CCC concept filename

---

## Decisions Made

- **Versioned filenames forward-only**: new files get `_v{X.Y}` suffix, existing files never renamed
- **Topic folders for ALL projects at startup**: not just new/imported — startup migration ensures it
- **`evaluated` backfill**: undefined → true at startup (except genuine unevaluated imports)
- **Wizard defaults to Projects/**: `{projectRoot}/Projects` instead of `{projectRoot}`
- **Active version delete allowed**: auto-fallback logic, last version cannot be deleted
- **`/continue` slash command updated**: checks `docs/handoff/` first with old-path fallback

---

## Full Project Timeline

| Commit | Description | Date |
|---|---|---|
| `09aadcd` | Stage 01+02 — static UI shell | — |
| `99a8e65` | Stage 03 — terminal sessions | — |
| `d7c74f1` | Stage 04 — status detection parser | — |
| `fa14b5f` | Stage 06 — project versioning | — |
| `a0beeef` | Stage 07 — new project wizard | — |
| `581d9b5` | Stage 08 — import existing projects | — |
| `774d9f3` | Stage 09 — settings panel | — |
| `1176bd0` | Stage 10 — project memory / SHP | — |
| `3dcecdd` | Stage 11 — resilience and polish | — |
| `955643f` | Stage 12 — test runner | — |
| `3229ecf` | Stage 14 — housekeeping, audits | — |
| `ec2cc53` | Stage 16 — user manual, screenshots | — |
| `a30a71d` | **v1.0.0 shipped** | 2026-02-27 |
| `0a9f1ce` | **v1.0.1** — import fixes, usage bar | 2026-03-06 |
| `f6a36d3` | Fix status bar, test files, tabs | 2026-03-06 |
| `01b8368` | **v1.0.2** — workspace compat, doc model | 2026-03-08 |
| `2a76917` | Version bump, manual update | 2026-03-08 |
| `5ed00f7` | PDF regenerated, manual-pdf.js | 2026-03-08 |
| `fca4a1a` | Fix coreFiles paths | 2026-03-08 |

Tags: `v1.0.0` on `a30a71d`, `v1.0.1` on `0a9f1ce`, `v1.0.2` on `5ed00f7`.

---

## Architecture & File Map

| File | Purpose |
|---|---|
| `server.js` | Express entry point. All REST endpoints, WebSocket, PTY lifecycle, scaffolding, startup migration. |
| `src/parser.js` | **Sacred.** Claude Code output → 5-state machine. `startDegradeMonitor()` disabled. |
| `src/sessions.js` | PTY session management. Env sanitization (clears `CLAUDECODE` + `CLAUDE_CODE_ENTRYPOINT`). |
| `src/projects.js` | Project registry CRUD. JSON persistence. `resolveProjectPath()` uses `settings.projectRoot`. |
| `src/versions.js` | Version management. `scanVersionFiles()` returns files + testFiles + stage counts for tasklists. `countCompletedStages()` for badge. |
| `src/usage.js` | JSONL scanner. Rolling 5h window for tokens, epoch-based reset timer. +5pp/−5min safety buffer. |
| `public/app.js` | Frontend SPA. Tree view, tabs, terminals, read panel, settings, wizards, test runner, usage bar, recovery auto-save. |
| `public/styles.css` | Dark/light themes via CSS variables. |
| `public/index.html` | Shell HTML. Vendor libs (xterm, marked). |
| `data/projects.json` | Project registry. Committed. Relative paths to `settings.projectRoot`. |
| `data/settings.json` | User settings. Gitignored. |
| `tools/screenshot.js` | Playwright screenshot automation. |
| `tools/manual-pdf.js` | Playwright PDF generation with embedded screenshots. |
| `tools/build-release.sh` | OS-specific release archives. |
| `tools/*/install_CCC.*` | Platform installers (macOS, Linux, Windows). |

---

## API Endpoint Inventory

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/projects` | List all projects + groups |
| POST | `/api/projects` | Register a project |
| PUT | `/api/projects/:id` | Update project (name, group, coreFiles, activeVersion, evaluated) |
| DELETE | `/api/projects/:id` | Remove project |
| PUT | `/api/projects/reorder` | Reorder projects within/between groups |
| POST | `/api/groups` | Create group |
| DELETE | `/api/groups/:name` | Delete group |
| GET | `/api/projects/:id/versions` | Scan version tree |
| POST | `/api/projects/:id/versions` | Create new version |
| DELETE | `/api/projects/:id/versions/:version` | Delete version (active fallback) |
| POST | `/api/projects/:id/versions/:version/tag` | Git tag a version |
| GET | `/api/file/:projectId` | Read file |
| PUT | `/api/file/:projectId` | Write file (auto-creates parent dirs) |
| POST | `/api/sessions` | Create PTY session |
| POST | `/api/sessions/:id/write` | Write to PTY |
| POST | `/api/sessions/:id/resize` | Resize PTY |
| DELETE | `/api/sessions/:id` | Kill PTY session |
| GET | `/api/settings` | Read settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/version` | App version + build number |
| GET | `/api/scan-directory` | Scan filesystem directory |
| POST | `/api/scaffold-project` | New Project Wizard |
| POST | `/api/scaffold-import` | Import existing project |
| GET | `/api/editor/open/:projectId` | Open file in external editor |
| GET | `/api/usage` | Current usage stats |
| WS | `/` | Terminal I/O, status updates, usage broadcasts (30s) |

---

## Frontend State Model

- `projectData` — full registry (groups + projects)
- `terminalInstances` — Map<tabId, { terminal, fitAddon, state, projectId }>
- `activeTabId` — currently visible tab
- `openTabs` — ordered tab ID array
- `expandedProjects`, `expandedVersions`, `expandedTestingSections` — Sets
- `projectVersions` — Map<projectId, versionData> (lazy-loaded, refreshed on expand)
- `recoveryTimer` — setInterval for recovery auto-save to `docs/handoff/`
- Tab IDs: `projectId::session` (session), `projectId:filePath` (file)

---

## Key Technical Details

**Status model:** 5 states — WAITING_FOR_INPUT (red), RUNNING (yellow), COMPLETED (green), ERROR (orange), UNKNOWN (grey).

**Path resolution:** `projects.resolveProjectPath()` joins `settings.projectRoot` + relative path. File API validates `isPathWithin()`.

**Version model:** `docs/vX.Y/` for major/minor, `docs/vX.Y/vX.Y.Z/` for patches. Filenames: `{Name}_concept_v{X.Y}.md` (forward-only). Active tracked in `projects.json`.

**SHP/Recovery paths:** `docs/handoff/{Name}_shp.md` and `docs/handoff/{Name}_recovery.md`. Auto-inject + `/continue` check new paths first, fall back to old `docs/` paths.

**Startup migration:** Creates topic folders for all registered projects. Backfills `evaluated: true` for projects missing the flag.

**Usage scanner:** Rolling 5h window for tokens, epoch-based reset timer, +5pp/−5min safety buffer. Plan limits: Pro=45K, Max5=220K, Max20=550K.

---

## Dependencies

| Package | Version | Notes |
|---|---|---|
| express | ^4.21.2 | HTTP server |
| node-pty | ^1.2.0-beta.11 | Beta required for Node.js v25 |
| @xterm/xterm | ^6.0.0 | Terminal emulator |
| @xterm/addon-fit | ^0.11.0 | UMD: `new FitAddon.FitAddon()` |
| ws | ^8.19.0 | WebSocket server |
| marked | ^17.0.3 | Markdown rendering |
| dotenv | ^16.4.7 | Environment variables |
| playwright | ^1.58.2 | Dev only — screenshots + PDF |

---

## Known Gotchas

1. **PTY env leak** — must clear `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT`
2. **FitAddon UMD** — `new FitAddon.FitAddon()` (double reference)
3. **`node-pty` beta** — `^1.2.0-beta.11` for Node.js v25
4. **`startDegradeMonitor()` disabled** — false positives after 60s streaming
5. **`evaluated` undefined vs false** — guards use `!== true` and `!== false` differently
6. **Browser cache after restart** — Cmd+Shift+R needed after server restart
7. **Settings need browser refresh** — recovery interval, theme don't hot-reload
8. **CCC cannot be developed via CCC** — restart kills your own session
9. **`data/settings.json` gitignored** — persisted values override defaults
10. **Usage tokens** — `input_tokens + output_tokens` only, no cache tokens
11. **Usage file collection** — must be 11h window for epoch walker
12. **Push to both remotes** — origin (Forgejo) + github (GitHub)
13. **Test files in version folders** — `docs/vX.Y/{Name}_test_stageXX.md`

---

## Open Items

- Forgejo push pending: `git push origin main --tags`
- Import wizard test deferred (no project available)
- Onboarding screenshot missing from PDF (not capturable once set up)
- Changelog update for v1.0.2 (ask Phet first)

---

## Next Actions

1. Push to Forgejo when back online
2. Changelog update for v1.0.2 (ask Phet)
3. Roadmap review — v1.1 scope TBD
