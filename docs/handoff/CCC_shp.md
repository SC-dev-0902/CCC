# Session Handover Pack — CCC
*Generated: 2026-03-06*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Version:** v1.0.1 (shipped, post-patch fixes applied)
- **Stage:** v1.0.1 complete — all stages passed. Post-ship bug fixes committed.
- **Status:** Bug fix commit pushed to GitHub. Forgejo pending (server offline).
- **Build:** 26 (total commit count via `git rev-list --count HEAD`)

---

## What Was Done This Session

### Bug fixes (commit `f6a36d3`)

1. **Status bar not refreshing** — added `fetchUsage()` on page init + 30s `setInterval` polling as client-side fallback. Removed server-side dedup that suppressed WebSocket broadcasts when data hadn't changed.
2. **Usage calculation rewrite** — rolling window for token/message counting (last 5h from now), epoch-based reset timer (walk forward through 5h windows to find active one). File collection widened to 11h (two full windows + buffer) to prevent missing epoch boundary entries.
3. **Plan limits corrected** — Pro: 45K, Max5: 220K, Max20: 550K tokens per 5h window (were drastically underestimated). Weekly budget: 6.5M tokens / 45K messages (was 500K/5K).
4. **Safety buffer** — +5 percentage points on token/message usage, -5 minutes on reset timer. Compensates for web/API usage CCC can't see.
5. **Live reset countdown** — client-side `tickResetCountdown()` every 60s between server fetches. Stores `usageResetTime` from server, counts down locally.
6. **Test files not showing in tree view** — version data now refreshes from server when expanding version rows (chevron) and Testing section headers. Previously cached stale data after first load.
7. **Check All missing on test files** — was h3-only, now works on h2 and h3 headings. LedgerNest/SC-Web use h2 sections.
8. **Tab active indicator inverted** — removed `border-bottom: 1px solid var(--border)` from `.tab-bar` that appeared on all tabs. Only `.tab.active::after` blue line remains.
9. **Test file location** — updated global `~/.claude/CLAUDE.md` (lines 132, 139) and `~/.claude/commands/tested.md` to reference `docs/vX.Y/` version folders instead of flat `docs/`.

### Documentation

10. **User manual updated** — Section 10 (Usage Status Bar): documented rolling window, epoch reset, safety buffer, and the Anthropic limitation.
11. **Global CLAUDE.md** — added context degradation rule: Claude proactively flags when session is heavy and recommends `/eod`.

---

## Decisions Made

- **Rolling window for tokens, epoch for reset** — hybrid approach. Tokens count everything in last 5h (matches Claude.ai %). Reset uses epoch windows (first message after previous window expired) — matches Claude.ai reset timer within ~4min.
- **Safety buffer (+5pp, -5min)** — Anthropic provides no usage API. CCC can't see web/API usage. Buffer makes all numbers pessimistic so user doesn't get surprised.
- **11h file collection** — needed two full 5h windows of JSONL data so epoch walker finds correct boundary. 6h (original) missed entries, causing wrong epoch start.
- **No rate limit message parsing** — claude-monitor parses "wait X minutes" from PTY output, but that only works AFTER hitting the limit. Not useful for proactive planning.
- **Plan limits from real-world calibration** — reverse-engineered from comparing CCC % to Claude.ai % on the same data. Max5 token limit: 220K (was 88K).
- **Cache-buster on fetchUsage** — appends `?_=timestamp` to prevent browser caching stale API responses.

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
| `a30a71d` | **v1.0.0 shipped** | 2026-02-27 |
| `9661d1f` | Post-ship polish: warning banners, eval normalization | 2026-03-01 |
| `0a9f1ce` | **v1.0.1 shipped** — import fixes, SHP safety, usage status bar | 2026-03-06 |
| `f6a36d3` | Fix status bar, test file display, tab indicator, usage calc | 2026-03-06 |

Tags: `v1.0.0` on `a30a71d`, `v1.0.1` on `0a9f1ce`.

---

## Architecture & File Map

| File | Purpose |
|------|---------|
| `server.js` | Express entry point. All REST endpoints, WebSocket upgrade, PTY lifecycle, scaffolding, usage API + 30s broadcast (no dedup). Default weekly budgets: 6.5M tokens, 45K messages. |
| `src/parser.js` | **Sacred.** All Claude Code output parsing. 5-state machine. `startDegradeMonitor()` disabled. |
| `src/sessions.js` | PTY session management. Env sanitization (clears `CLAUDECODE` + `CLAUDE_CODE_ENTRYPOINT`). |
| `src/projects.js` | Project registry CRUD. JSON persistence. `updateProject` allows: name, group, coreFiles, activeVersion, evaluated. |
| `src/versions.js` | Version management. `scanVersionFiles()` → `{ files[], testFiles[] }`. Test file pattern: `{name}_test_stage\d+\.md`. |
| `src/usage.js` | JSONL scanner. Rolling window for tokens (last 5h). Epoch-based reset timer. +5pp/−5min safety buffer. File collection: 11h window. Plan limits: Pro=45K, Max5=220K, Max20=550K. |
| `public/app.js` | Frontend SPA. Tree view, tabs, terminals, read panel, settings, wizards, test runner, usage bar with live countdown. |
| `public/styles.css` | Dark/light themes via CSS variables. Tab bar: no border-bottom (active tab uses `::after` blue line only). |
| `public/index.html` | Shell HTML. Vendor libs (xterm, marked). Usage bar markup. |
| `data/projects.json` | Project registry. Committed (no absolute paths). |
| `data/settings.json` | User settings. Gitignored. Includes `usagePlan`, `weeklyTokenBudget`, `weeklyMessageBudget`. |
| `docs/USER_MANUAL.md` | Full user manual. Section 10 = Usage Status Bar + safety buffer docs. |
| `tools/screenshot.js` | Playwright screenshot automation. |
| `tools/` | Platform installers (macOS/Linux/Windows), build-release.sh. |

---

## API Endpoint Inventory

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects` | List all projects + groups |
| POST | `/api/projects` | Create a new project |
| PUT | `/api/projects/:id` | Update project fields |
| DELETE | `/api/projects/:id` | Remove project (optional disk delete) |
| PUT | `/api/projects-reorder` | Reorder projects within/between groups |
| POST | `/api/groups` | Create a new group |
| DELETE | `/api/groups/:name` | Delete a group |
| GET | `/api/browse` | Browse filesystem directories |
| GET | `/api/settings` | Read settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/file/:projectId` | Read a file from a project |
| PUT | `/api/file/:projectId` | Write a file to a project |
| POST | `/api/open-editor` | Open file in external editor |
| GET | `/api/projects/:id/versions` | List versions |
| POST | `/api/projects/:id/versions` | Create version (major/minor/patch) |
| PUT | `/api/projects/:id/active-version` | Set active version |
| DELETE | `/api/projects/:id/versions/:version` | Delete version (not active) |
| POST | `/api/projects/:id/versions/:version/complete` | Git tag a version |
| POST | `/api/projects/:id/migrate-versions` | Migrate flat docs → versioned |
| POST | `/api/scaffold-project` | Scaffold new project |
| POST | `/api/scaffold-import` | Scaffold CCC structure into import |
| GET | `/api/preflight` | Check Claude Code CLI available |
| GET | `/api/version` | CCC version + build number |
| POST | `/api/scan-project` | Scan directory for existing files |
| POST | `/api/sessions/:projectId` | Create PTY session |
| GET | `/api/sessions/:projectId` | Get session status |
| GET | `/api/sessions` | List all active sessions |
| GET | `/api/usage` | Current usage (5h + 7d), cache-bust with `?_=timestamp` |

WebSocket: `ws://host:port/ws?projectId=X` — terminal I/O, status updates, usage broadcasts every 30s.

---

## Frontend State Model

### Global State
- `groups`, `projectsList`, `openTabs`, `activeTab`, `settings`, `suppressRender`

### Maps and Sets
- `terminalInstances` — `Map<projectId, { terminal, fitAddon, ws, container, state, claudeStatus, degraded, pendingContinue }>`
- `projectVersions` — `Map<projectId, versionData>` (lazy-loaded, refreshed on expand)
- `expandedProjects`, `collapsedGroups`, `expandedVersions`, `expandedVersionHeaders`, `expandedTestingSections` — Sets
- `readPanelTimers` — `Map<tabId, intervalId>`

### Usage Bar State
- `usageResetTime` — ISO string from server, used for client-side countdown
- `usageCountdownTimer` — `setInterval` (60s) for `tickResetCountdown()`
- `fetchUsage()` polls every 30s via `setInterval` in `initApp()`

### Tab ID Scheme
- Session: `projectId::session` (double colon)
- File: `projectId:filePath` (single colon)

### Rendering Pipeline
`render()` → `renderTreeView()` + `renderTabBar()` + `renderTabContent()`

---

## Key Technical Details

### Usage Scanner (`src/usage.js`)
- **File collection:** all JSONL in `~/.claude/projects/` with mtime < 11h (two 5h windows + 1h buffer)
- **Token counting:** rolling window (last 5h from now). `input_tokens + output_tokens` only. Deduplicated by `messageId:requestId` (first wins).
- **Reset timer:** epoch-based. Walk entries chronologically; each 5h window starts from first entry after previous window expired. Find window containing `now`.
- **Safety buffer:** `SAFETY_BUFFER = 5` added to token% and message%. Reset time reduced by 5 minutes.
- **Plan limits:** Pro=45K, Max5=220K, Max20=550K tokens per 5h window
- **Weekly:** 7-day scan, defaults 6.5M tokens / 45K messages
- **Limitation:** CCC only sees Claude Code JSONL data. Web/API usage invisible. ~4min reset offset expected.

### Parser (`src/parser.js`)
- 5 states: WAITING_FOR_INPUT (red), RUNNING (yellow), COMPLETED (green), ERROR (orange), UNKNOWN (grey)
- `startDegradeMonitor()` disabled — false positives on streaming

### Version Data Refresh
- Lazy-loaded into `projectVersions` Map on first expand
- Now refreshes on: version row chevron expand, Testing section expand, sidebar refresh button
- Prevents stale test file counts

---

## Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| express | ^4.21.2 | HTTP server |
| node-pty | ^1.2.0-beta.11 | **Beta required** for Node.js v25 |
| ws | ^8.19.0 | WebSocket server |
| @xterm/xterm | ^6.0.0 | Terminal emulator |
| @xterm/addon-fit | ^0.11.0 | UMD: `new FitAddon.FitAddon()` |
| marked | ^17.0.3 | Markdown rendering |
| dotenv | ^16.4.7 | Environment variables |
| playwright | ^1.58.2 | **Dev only.** Screenshots. |

---

## Known Gotchas

1. **PTY env leak** — must clear both `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT` when spawning PTY
2. **FitAddon UMD constructor** — `new FitAddon.FitAddon()` (double)
3. **`node-pty` beta** — `^1.2.0-beta.11` required for Node.js v25
4. **`startDegradeMonitor()` disabled** — false positives after 60s streaming
5. **`evaluated: undefined` vs `false`** — use `!== true` or `=== false` carefully
6. **beforeunload suppressed on macOS** — Safari/Edge. Recovery auto-save is safety net.
7. **Usage tokens** — `input_tokens + output_tokens` ONLY. No cache tokens.
8. **Usage dedup** — first occurrence wins (streaming messages have cumulative counts)
9. **Usage file collection** — must be 11h (not 6h) or epoch walker misses boundary entries
10. **Usage accuracy** — ~4min reset offset and ~1-5% token offset vs Claude.ai (web usage invisible)
11. **CCC must not be developed via CCC** — restart problem
12. **Git remotes** — push to both `origin` (Forgejo) and `github` (GitHub)
13. **Test files go in version folders** — `docs/vX.Y/{Name}_test_stageXX.md`, not flat `docs/`

---

## Open Items

- **Forgejo push pending** — server offline. Run: `git push origin main`
- v1.1 scope TBD with Phet

---

## Next Actions

1. **Push to Forgejo** when server is available: `git push origin main`
2. **Start with roadmap** — read `docs/CCC_Roadmap.md` for v1.1 scope
3. **Any new bugs** → create patch version (v1.0.2) via official process
4. **Changelog/roadmap** — never auto-update, always ask Phet first
