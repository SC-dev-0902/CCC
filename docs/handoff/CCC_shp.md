# Session Handover Pack — CCC
*Generated: 2026-03-10 | Version: v1.0.3 | Commit: 5b5cbb4*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Version:** v1.0.4 (shipped) — v1.0.5 now active
- **Active version in projects.json:** 1.0
- **Stage:** v1.0.5 in progress
- **Status:** v1.0.4 shipped. v1.0.5 project created in CCC.

---

## What Was Done This Session

### v1.0.3 — Usage Status Bar Fix

**Root cause investigation:**
- JSONL entries contain `cache_creation_input_tokens` and `cache_read_input_tokens` — CCC only counted `input_tokens + output_tokens`
- CCC was showing <1% of actual token usage across all projects
- Anthropic confirms: cache reads don't count toward limits, cache creation does
- Usage pool is shared across Claude Desktop + Claude Code — CCC can only see CLI sessions
- Epoch walker reset timer algorithm was wrong — replaced with rolling window

**Backend fixes (`src/usage.js`, `server.js`):**
- Token counting: `input_tokens + cache_creation_input_tokens + output_tokens` (cache_read excluded)
- Same fix applied to `scanWeeklyUsage()`
- Epoch walker replaced with rolling-window reset: `oldest_entry_in_window + 5h - now`
- Safety buffers: +5pp on percentages, -30min on reset timer (CCC only sees CLI, shared pool invisible)
- `scanUsage()` now accepts `tokenBudget` parameter (user-configurable, not hardcoded)
- `PLAN_LIMITS` stripped of token values — only message limits remain per plan
- File collection window reduced from 11h to 6h (no longer need two windows for epoch walker)

**Frontend fixes (`app.js`, `index.html`, `styles.css`):**
- Reset countdown ticks every 1s (was 60s), format: `Xh Ym Zs`
- `formatResetLabel(ms)` shows seconds at all ranges; returns "resetting…" when expired
- "Last updated" indicator: `updated Xs ago` / `updated Xm ago`, ticks every second
- Pulse animation: 0.4s opacity flash on `usageBarInner` each data refresh
- Staleness detection: session-aware (only triggers with active `terminalInstances`), dims bar at 0.75 opacity after 60s, amber on "updated" text
- Single unified 1s timer (`usageTickTimer`) for countdown + updated + staleness
- Status bar labelled "5h CLI" to clarify local-only usage

**Settings changes:**
- Added `tokenBudget5h` field (default 1,000,000) — 5h window token budget
- Updated `weeklyTokenBudget` default from 6,500,000 to 20,000,000 (cache-inclusive)
- Plan selector retained for message limits only

**Changelog:** Added v1.0.2 and v1.0.3 entries.

---

## Decisions Made

- **Cache reads excluded from counting**: Anthropic help center confirms "cached content doesn't count against your limits when reused"
- **Cache creation included**: These are the dominant token type (~97-99% of real usage) and DO count toward limits
- **Token budget configurable, not hardcoded**: Can't determine Anthropic's exact limit since it's undocumented; user calibrates against Claude Desktop
- **30min timer safety buffer**: 5% of 5h was insufficient (coworker on Desktop starts the shared window before CLI activity); 30min covers typical gap
- **5pp percentage safety buffer**: Compensates for invisible Desktop/web usage on shared pool
- **Session-aware staleness**: Only dims when `terminalInstances` has active sessions; no dimming when idle (coworker's fix)
- **Stale opacity 0.75**: 0.45 was unreadable (coworker's fix)
- **Default weekly budget 20M**: Calibrated against Desktop's 25% at ~5M weekly CLI tokens

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
| `5b5cbb4` | **v1.0.3** — usage bar fix: cache tokens, timer, refresh | 2026-03-10 |

Tags: `v1.0.0` on `a30a71d`, `v1.0.1` on `0a9f1ce`, `v1.0.2` on `5ed00f7`, `v1.0.3` on `5b5cbb4`.

---

## Architecture & File Map

| File | Purpose |
|---|---|
| `server.js` | Express entry point. All REST endpoints, WebSocket, PTY lifecycle, scaffolding, startup migration. Passes `tokenBudget5h` to usage scanner. |
| `src/parser.js` | **Sacred.** Claude Code output → 5-state machine. `startDegradeMonitor()` disabled. |
| `src/sessions.js` | PTY session management. Env sanitization (clears `CLAUDECODE` + `CLAUDE_CODE_ENTRYPOINT`). |
| `src/projects.js` | Project registry CRUD. JSON persistence. `resolveProjectPath()` uses `settings.projectRoot`. |
| `src/versions.js` | Version management. `scanVersionFiles()` returns files + testFiles + stage counts for tasklists. |
| `src/usage.js` | JSONL scanner. Counts `input_tokens + cache_creation_input_tokens + output_tokens`. Rolling 5h window. +5pp/−30min safety buffers. Token budget from Settings. |
| `public/app.js` | Frontend SPA. Tree view, tabs, terminals, read panel, settings, wizards, test runner, usage bar with 1s tick timer, staleness detection, recovery auto-save. |
| `public/styles.css` | Dark/light themes via CSS variables. Usage bar pulse animation, staleness styles. |
| `public/index.html` | Shell HTML. Vendor libs (xterm, marked). Status bar with "5h CLI" label and "last updated" element. |
| `data/projects.json` | Project registry. Committed. Relative paths to `settings.projectRoot`. |
| `data/settings.json` | User settings. Gitignored. Now includes `tokenBudget5h`. |
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
| GET | `/api/usage` | Current usage stats (passes tokenBudget5h to scanner) |
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
- `usageResetTime` — ISO string for countdown target
- `usageTickTimer` — single 1s setInterval for countdown + "last updated" + staleness
- `usageLastRefreshMs` — Date.now() of last successful data refresh
- Tab IDs: `projectId::session` (session), `projectId:filePath` (file)

---

## Key Technical Details

**Status model:** 5 states — WAITING_FOR_INPUT (red), RUNNING (yellow), COMPLETED (green), ERROR (orange), UNKNOWN (grey).

**Path resolution:** `projects.resolveProjectPath()` joins `settings.projectRoot` + relative path. File API validates `isPathWithin()`.

**Version model:** `docs/vX.Y/` for major/minor, `docs/vX.Y/vX.Y.Z/` for patches. Filenames: `{Name}_concept_v{X.Y}.md` (forward-only). Active tracked in `projects.json`.

**SHP/Recovery paths:** `docs/handoff/{Name}_shp.md` and `docs/handoff/{Name}_recovery.md`. Auto-inject + `/continue` check new paths first, fall back to old `docs/` paths.

**Startup migration:** Creates topic folders for all registered projects. Backfills `evaluated: true` for projects missing the flag.

**Usage scanner (v1.0.3):**
- Tokens: `input_tokens + cache_creation_input_tokens + output_tokens` (cache_read excluded per Anthropic docs)
- Rolling 5h window from `now`. File collection: 6h window (5h + 1h buffer).
- Reset timer: `oldest_entry_in_window.ts + 5h - now - 30min`
- Safety: +5pp on percentages, -30min on timer
- Token budget from `settings.tokenBudget5h` (default 1M), message limits from `PLAN_LIMITS[plan]`
- Weekly: same cache-inclusive counting, default budget 20M
- Dedup: `message_id:request_id` key, first occurrence only

**Staleness:** Session-aware — only triggers when `terminalInstances` has an active session. >60s without data refresh → bar dims (0.75 opacity), "updated" text turns amber. Clears immediately on fresh data.

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
10. **Usage tokens** — `input_tokens + cache_creation_input_tokens + output_tokens` only, cache_read excluded
11. **Usage shared pool** — CCC sees CLI only; Desktop/web usage invisible. Safety buffers compensate.
12. **Usage file collection** — 6h window (5h + 1h buffer)
13. **Push to both remotes** — origin (Forgejo) + github (GitHub)
14. **Test files in version folders** — `docs/vX.Y/{Name}_test_stageXX.md`
15. **Default budgets changed in v1.0.3** — tokenBudget5h=1M, weeklyTokenBudget=20M (cache-inclusive)

---

## Open Items

- Forgejo push pending: `git push origin main --tags`
- Import wizard test deferred (no project available)
- Onboarding screenshot missing from PDF (not capturable once set up)
- Colour threshold tests deferred (amber 80%, red 95%) — will trigger naturally at higher usage

## v1.0.5 Roadmap

- **Usage bar label is misleading** — "5h CLI" implies a personal session AND implies a full 5 hours. Both are wrong. (1) It's Anthropic's shared rate limit window, not the user's session. (2) The window runs out well before 5 hours because Chat/Desktop consumption is invisible to CCC - confirmed by Phet running a stopwatch alongside. The "+5pp/-30min" safety buffers are not enough. Display should communicate clearly: this is Anthropic's window, CLI only, actual headroom is lower than shown. Suggested label: "Rate limit: X% (CLI only - actual limit may be lower)".
- **Version dot tooltip** — The colored dot in front of the version number should show a tooltip on hover explaining what the color means (e.g. what green/amber/red/grey indicates for that project's status). CSS `title` attribute or a custom hover tooltip - CC's choice, must be consistent with the existing CCC design language.

---

## Next Actions

1. Push to Forgejo when back online
2. Roadmap review — v1.1 scope TBD
