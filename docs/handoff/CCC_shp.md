# Session Handover Pack - CCC
*Generated: 2026-05-05 | Version: v1.1.0 (Stage 03 complete) | Stage 04 next | Build 57*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Version:** v1.1.0 - Sub-stages 03a, 03b, 03c, 03d, and 03d01 complete on 2026-05-05. **Stage 03 main Go/NoGo gate: GO.** All v1.0 CRUD now flows through MariaDB.
- **Active version in projects.json:** "1.1".
- **Stage:** v1.1 Sub-Stage 03d **GO** (closure commit `453ab48`), Sub-Stage 03d01 **GO** (closure commit `0a48e6b`). Stage 03 main Go/NoGo gate cleared. Next: Cowork drafts Stage 04 kickoff prompt (Nested Project Structure - `parent_id` on projects).
- **Status:** CCC v1.1 server is live on Dev-Web (`http://172.16.10.6:3000`, current PID 5399), reading projects, settings, and sessions exclusively from MariaDB on Dev-DB (`172.16.12.11`). The Mac CCC v1.0.7 (`localhost:3000`) is unchanged and still uses `data/projects.json` + `data/settings.json` for fallback. Both `data/projects.json` and `data/settings.json` are intact on disk (mtime unchanged across all 03d testing) - they are no longer consulted at runtime.

---

## What Was Done This Session (Sub-Stages 03d + 03d01)

### Stage 03d - Settings & Sessions DB cutover

#### Files added
- `docs/handoff/stage03d-prompt.md` - Cowork-authored kickoff prompt.
- `docs/v1.1/CCC_test_stage03d.md` - test file with full verification: 22/22 checklist + 8/8 acceptance, generated and re-run after the 03d01 fix.

#### Files changed
- `server.js` - replaced sync `readSettings()` + inline `fs.writeFileSync` with async `readSettingsFromDB()` + `writeSettingsToDB(updates)`. New `SETTINGS_DB_KEYS` table maps the six DB-backed columns (`project_root`, `editor`, `shell`, `theme`, `file_patterns`, `github_token`) to their JS-side keys (`projectRoot`, `editor`, `shell`, `theme`, `filePatterns`, `githubToken`). `filePatterns` is JSON-stringified on write, parsed on read with try/catch fallback. All seven call-sites updated: GET/PUT `/api/settings`, POST `/api/open-editor`, POST `/api/scan-project`, POST `/api/scaffold-project`, GET `/api/usage`, the `setInterval` usage broadcast. Required `const db = require('./src/db')` at the top. Added `cleanupOrphanedSessions` IIFE before `server.listen()` - runs `UPDATE sessions SET status = 'error', ended_at = NOW() WHERE status = 'active'` on every cold start.
- `src/sessions.js` - require `crypto` + `db`. `createSession()` generates `crypto.randomUUID()`, attaches as `session.dbSessionId`, and fires `INSERT INTO sessions (id, project_id, user_id, status, started_at) VALUES (?, ?, NULL, 'active', NOW())` fire-and-forget with `.catch()` warning. `ptyProcess.onExit` runs `UPDATE sessions SET status = 'exited', ended_at = NOW() WHERE id = ?`. `destroySession()` runs `UPDATE ... status = 'error'` before killing the PTY. `autoFileGitHubIssue()` now reads `github_token` from the `settings` table via `db.queryOne`, with `process.env.GITHUB_TOKEN` as fallback when DB is unreachable. `fs` and `path` requires retained because `package.json` is still read for the version string.

### Stage 03d01 - sessions.user_id nullable (schema fix)

#### Files added
- `migrations/003_sessions_user_id_nullable.sql` - `ALTER TABLE sessions MODIFY user_id CHAR(36) NULL;`. Ran cleanly against Dev-DB; `information_schema.COLUMNS.IS_NULLABLE` for `sessions.user_id` is now `YES`.
- `docs/handoff/stage03d01-prompt.md` - Cowork-authored fix kickoff prompt.

#### Files changed
- `migrations/001_initial.sql` - line 47: `\`user_id\` CHAR(36) NOT NULL` -> `\`user_id\` CHAR(36) NULL`. Fresh provisions now match live schema.
- `docs/v1.1/CCC_test_stage03d.md` - flipped the seven previously-blocked items from `[ ]` to `[x]` with the live re-run results, and rewrote the "Schema-Fix Required" section to "Schema-Fix Sub-Stage DONE".
- `docs/v1.1/CCC_tasklist_v1.1.0.md` - all four Sub-Stage 03d items ticked, new Sub-Stage 03d01 sub-section added with three ticked items.

### Commits this session

| Hash | Message | Notes |
|---|---|---|
| `453ab48` | `Stage 03d complete - settings and sessions DB cutover` | server.js + src/sessions.js + stage03d-prompt.md. Code lands first; verification artifacts go in 03d01 commit because the test file documents both stages. |
| `0a48e6b` | `Stage 03d01 complete - sessions.user_id nullable` | Migration 003 + 001 alignment + full test file with verification + tasklist updates + stage03d01-prompt.md. |

A separate `/eod` SHP commit will follow this file write.

Pushed to **both** Forgejo (`origin`) and GitHub (`github`). Both remotes at `0a48e6b`. v1.1.0 still not tagged.

### Test results (22/22 checklist + 8/8 acceptance)

Run on Dev-Web (`/mnt/sc-development/CCC`) against Dev-DB (`172.16.12.11`). Server lifecycle PIDs: 4724 (initial 03d run) -> 5055 (test cycle) -> 5143 (post 03d01 migration) -> 5399 (final cold-restart for orphan cleanup verification).

| Section | Items | Result |
|---|---|---|
| Server Boot | 2 | PASS - port 3000 listening, `/api/version` 200 |
| Settings Read From DB | 2 | PASS - 6 DB-backed values + 5 SETTINGS_DEFAULTS legacy fields |
| Settings Persistence | 4 | PASS - PUT theme=light -> DB row -> restart -> still light -> reset to dark |
| `data/settings.json` Untouched | 3 | PASS - mtime `1777871094` before == after; source-grep clean |
| `readSettings()` Removed | 1 | PASS - grep clean |
| Sessions Insert On Create | 3 | PASS - row `92c10db2-...` with `status: 'active'`, `user_id: null` |
| Sessions Update On Exit / Destroy | 2 | PASS - prior row updated to `'exited'` (race; see decision below) |
| Orphan Cleanup On Restart | 4 | PASS - cold-killed row updated by IIFE; log line `[startup] Marked 1 orphaned session(s) as error` |
| `autoFileGitHubIssue` From DB | 2 | PASS - no `settings.json` refs, github_token grep present |
| Acceptance Criteria | 8 | PASS - all eight criteria green |

---

## Decisions Made

- **Schema/kickoff conflict resolved with a fix sub-stage, not an in-prompt amendment.** Stage 03d's kickoff prompt prescribed `INSERT ... user_id ... VALUES (?, ?, NULL, ...)`, but `migrations/001_initial.sql:47` (a Stage 03a artifact) declared `user_id CHAR(36) NOT NULL`. Per CCC's stage immutability rule, the prompt was not modified; instead, Cowork drafted `stage03d01-prompt.md` for a schema-only fix and CC executed it. This preserves the contract trail: Stage 03d code is correct against Stage 03d kickoff, and Stage 03d01 closes the schema/kickoff gap with no code change.
- **Race between `destroySession` (UPDATE -> 'error') and `pty.onExit` (UPDATE -> 'exited').** Both fire-and-forget UPDATEs run when starting a second session for the same project; whichever lands second wins. In the test run `'exited'` won. Per the Stage 03d kickoff acceptance criterion ("normal or forced ... final status and `ended_at`"), either is acceptable, but the semantic distinction between graceful exit and forced kill is not currently preserved on this path. Cold-kill (orphan) cases still cleanly land on `'error'` because neither `destroy` nor `onExit` had a chance to run. Flagged as a Stage 05/06 audit-trail improvement candidate, not a 03d defect.
- **Frontend usage-settings drop-on-write is a known carry-forward.** `public/app.js` writes five legacy fields (`recoveryInterval`, `usagePlan`, `tokenBudget5h`, `weeklyTokenBudget`, `weeklyMessageBudget`) back via `PUT /api/settings`. The new `writeSettingsToDB` allow-list silently drops them. Reads still serve the `SETTINGS_DEFAULTS` values, so the UI renders correctly, but user edits to those five inputs no longer round-trip. Stage 15 (`usage.js` cleanup) removes them entirely; the test file documents the carry-forward. No fix this stage.
- **Test file split across the two commits.** The test file documents the verification of both Stage 03d and Stage 03d01 in a single chronological narrative. Rather than split it, the file landed entirely in the Stage 03d01 commit. Code-only changes went in the Stage 03d commit. This keeps each commit's diff coherent at the cost of a small forward-reference inside the test file.
- **`data/projects.json` and `docs/handoff/CCC_recovery.md` left unstaged again.** Same precedent as 03a / 03b / 03c. Both pre-existing M from earlier sessions, not 03d work. Recovery file is the legacy-tracked artifact (gotcha 12); projects.json is the format-normalisation diff from the v1.0.7 Mac CCC. Cleanup pending.

---

## Full Project Timeline

| Commit | Description | Date |
|---|---|---|
| ... v1.0.0 - v1.0.7 ... | (see prior SHPs) | 2026-02-27 to 2026-04-24 |
| `ab9bee7` | v1.1.0 Stage 00a+00b - TrueNAS share mounted | 2026-05-04 |
| `5f5d03f` | v1.1.0 Stage 01f - wired design preview live | 2026-05-04 |
| `fd0265b` | v1.1.0 Stage 02a - parent/sub hierarchy | 2026-05-04 |
| `3749432` | v1.1.0 Stage 02b - locking badge + Start Session | 2026-05-05 |
| `a98d2a8` | v1.1.0 Stage 02c - top menu diodes | 2026-05-05 |
| `9d645b9` | Stage 02d complete - treeview search/filter polish | 2026-05-05 |
| `5a53802` | Stage 02 complete - UI Shell (main gate GO) | 2026-05-05 |
| `2225181` | v1.1.0 Stage 03a - MariaDB schema and migration runner | 2026-05-05 |
| `5c679b3` | Stage 03b complete - JSON import script (closure) | 2026-05-05 |
| `5408c93` | Stage 03c complete - projects.js rewritten to MariaDB | 2026-05-05 |
| `453ab48` | **Stage 03d complete - settings and sessions DB cutover** | 2026-05-05 |
| `0a48e6b` | **Stage 03d01 complete - sessions.user_id nullable** | 2026-05-05 |

(SHP-update commits between stages omitted for brevity - see `git log` for full chronological history.)

Pushed to **both** Forgejo (`origin`) and GitHub (`github`). Both remotes at `0a48e6b`.

Tags: `v1.0.0` -> `v1.0.7`. v1.1.0 still not tagged - tag deferred per the SHP plan; Stage 04 (Nested Project Structure) lands first.

---

## Architecture & File Map (v1.1 active surface, post-03d01)

| Area | File / Path |
|---|---|
| **Backend - DB layer (Stage 03a)** | |
| MariaDB schema | `migrations/001_initial.sql` (NOTE: `sessions.user_id` is `NULL` post 03d01) |
| Schema migration runner | `migrations/run.js` |
| DB layer (lazy pool, query/queryOne/transaction) | `src/db.js` |
| Schema migration: user_id nullable (Stage 03d01) | `migrations/003_sessions_user_id_nullable.sql` |
| **Backend - Data import (Stage 03b)** | |
| JSON -> DB import script | `migrations/002_import.js` |
| **Backend - Project registry (Stage 03c)** | |
| Project CRUD (DB-backed) | `src/projects.js` |
| **Backend - Settings & Sessions (Stage 03d)** | |
| Settings DB helpers + orphan cleanup IIFE | `server.js` |
| Sessions DB integration (insert/update/destroy) | `src/sessions.js` |
| **Backend - unchanged** | |
| Status parser (sacred) | `src/parser.js` |
| Version scanner | `src/versions.js` |
| Token usage status bar | `src/usage.js` |
| **Frontend (unchanged from Stage 02)** | |
| Design preview source (Next.js 16) | `docs/v1.1/design/stage01a-dark-light/` |
| Static build output | `docs/v1.1/design/preview/` |
| Apache alias config (Dev-Web only) | `/etc/apache2/conf-available/CCC-design-preview-alias.conf` |
| **Docs** | |
| Stage kickoff prompts (02-03) | `docs/handoff/stage02{a,b,c,d}-prompt.md`, `docs/handoff/stage03{a,b,c,d}-prompt.md`, `docs/handoff/stage03d01-prompt.md` |
| Stage test files (02-03) | `docs/v1.1/CCC_test_stage02{a,b,c,d}.md`, `docs/v1.1/CCC_test_stage03{a,b,c,d}.md` |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` |
| v1.1 concept doc | `docs/v1.1/CCC_concept_v1.1.0.md` |

---

## API Endpoint Inventory (current - server.js post-03d)

All endpoints live in `server.js`. Stage 03d converted GET/PUT `/api/settings`, POST `/api/open-editor`, POST `/api/scan-project`, POST `/api/scaffold-project`, GET `/api/usage`, and the `setInterval` usage broadcast to async + DB-backed settings reads. No new routes, no removed routes.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Serve `public/index.html` |
| GET | `/api/version` | `{version, build}` for sanity/uptime |
| GET | `/api/projects` | List projects + groups (DB-backed) |
| POST | `/api/projects` | Register a new project |
| PUT | `/api/projects/:id` | Update project |
| PUT | `/api/projects-reorder` | Bulk update sort_order + group_name |
| POST | `/api/projects/:id/rename` | Rename project (DB + filesystem) |
| DELETE | `/api/projects/:id` | Remove a project (CASCADE clears core_files) |
| DELETE | `/api/projects/:id/versions/:version` | Delete a specific version |
| GET | `/api/projects/:id/versions` | List versions per `scanVersionFiles` |
| GET | `/api/projects/:id/files` | Tree of project's coreFiles |
| GET | `/api/file/:projectId` | Read a single file |
| PUT | `/api/file/:projectId` | Write a single file |
| GET | `/api/settings` | **Read settings from DB** (post-03d) |
| PUT | `/api/settings` | **Write settings to DB** (post-03d) |
| DELETE | `/api/groups/:name` | Remove a group from settings |
| POST | `/api/sessions/:projectId` | Start a PTY session **+ DB row insert** (post-03d) |
| WS | `/ws` | xterm.js websocket - PTY session multiplexer |
| GET | `/design-preview/...` | Express static fallback (redundant in prod) |

---

## Database Schema & Seed (post-03d01)

Database: `ccc` on Dev-DB (`172.16.12.11:3306`, MariaDB 10.11.14). User: `ccc`.

| Table | Rows | Columns (key fields only) | FKs |
|---|---|---|---|
| `users` | 0 | id (PK CHAR(36)), username (UNIQUE), password_hash, role, created_at, last_login | - |
| `projects` | 17 | id (PK), name, path, parent_id, group_name, sort_order, type, active_version, evaluated, lock_user_id, lock_session_id, created_at, updated_at | parent_id, lock_user_id (SET NULL); lock_session_id intentionally has no FK |
| `project_core_files` | 51 | (project_id, file_type) PK; file_path | project_id (CASCADE) |
| `sessions` | varies | id (PK), project_id, **user_id (NULL post-03d01)**, status, started_at, ended_at | project_id (CASCADE), user_id (CASCADE; FK permits NULL targets) |
| `settings` | 6 | key (PK), value | - |
| `project_integrations` | 0 | (project_id, integration) PK; config (JSON), enabled | project_id (CASCADE) |

### `sessions` lifecycle (NEW, post-03d)

1. **Create** - `createSession()` generates a UUID via `crypto.randomUUID()`, INSERTs the row with `status='active'`, `user_id=NULL`, `started_at=NOW()`, `ended_at=NULL`.
2. **Normal exit (PTY closes)** - `ptyProcess.onExit` UPDATEs to `status='exited'`, `ended_at=NOW()`.
3. **Forced destroy (new session for same project)** - `destroySession()` UPDATEs to `status='error'`, then kills the PTY which fires `onExit` and may overwrite to `'exited'` (race - see decision above).
4. **Orphan cleanup (cold-kill / power loss / SIGKILL)** - on next server start, the IIFE before `server.listen()` runs `UPDATE sessions SET status='error', ended_at=NOW() WHERE status='active'` and logs `[startup] Marked N orphaned session(s) as error` if N > 0.

### `settings` table - JS <-> DB key mapping (post-03d)

| DB key | JS key | JSON-encoded |
|---|---|---|
| `project_root` | `projectRoot` | no |
| `editor` | `editor` | no |
| `shell` | `shell` | no |
| `theme` | `theme` | no |
| `file_patterns` | `filePatterns` | yes (JSON.stringify on write, JSON.parse on read with try/catch fallback) |
| `github_token` | `githubToken` | no |

The five legacy usage fields (`recoveryInterval`, `usagePlan`, `tokenBudget5h`, `weeklyTokenBudget`, `weeklyMessageBudget`) are NOT in the DB. They are served from `SETTINGS_DEFAULTS` on every read and silently dropped from PUTs by the allow-list. Stage 15 removes them entirely.

### `src/projects.js` interface (unchanged from 03c)

| Function | Signature |
|---|---|
| `fetchProjects()` | `() => { projects: [...], groups: [...] }` |
| `fetchProjectById(id)` | `(id) => Project \| null` |
| `createProject(input)` | `({name, path, group, type?, evaluated?}) => Project` |
| `updateProject(id, updates)` | `(id, {name?, group?, coreFiles?, activeVersion?, evaluated?}) => Project` |
| `removeProject(id)` | `(id) => {ok:true}` |
| `reorderProjects(orderedIds)` | `([{id, group, order}]) => {projects, groups}` |
| `renameProject(id, newName)` | `(id, newName) => {project, folderRenamed, renamedFiles, updatedContent}` |
| `resolveProjectPath(project)` | `(project) => absPath` |
| `addGroup(name)` / `removeGroup(name)` | settings-table read/write for the groups list |

### DB layer interface (`src/db.js`, unchanged)

- `await db.query(sql, params)` - returns array of row objects
- `await db.queryOne(sql, params)` - returns single object or null
- `await db.transaction(async (conn) => { ... })` - auto begin/commit/rollback/release
- Pool is lazy: built on first call. Survives DB unreachable at server start.
- `dotenv.config({ override: true })` so `.env` always wins over shell vars.

---

## Frontend State Model (preview app, unchanged this session)

`app-shell.tsx`:
- `Diode.hover` per diode -> tooltip
- `sidebarWidth: number` (200-600), localStorage `ccc-sidebar-width`, default 320
- `dragging: boolean`
- `theme: "dark" | "light"`

`treeview-shell.tsx`:
- `query: string` - filter input
- `filteredActive`, `filteredParked`, `filteredNew` - all `useMemo([query])`
- `ProjectRow.expanded` - local state
- `ProjectRow.forceExpand` - filter override, never mutates `expanded`
- `ProjectRow` progress-bar guard: `!hasChildren && project.stageProgress`

---

## Key Technical Details (NEW from 03d / 03d01)

### `readSettingsFromDB()` and `writeSettingsToDB(updates)`

Both async. Read starts from a deep copy of `SETTINGS_DEFAULTS`, then merges DB rows over it via the `SETTINGS_DB_KEYS` mapping table. Read failures (DB unreachable) log a warning and return defaults - server never crashes on a settings read failure. Write iterates the mapping, skips undefined keys, JSON-stringifies `filePatterns`, and upserts via `INSERT ... ON DUPLICATE KEY UPDATE`. Write failures log a warning and return `defaults <- updates` so the caller still gets the requested values back. **`data/settings.json` is never read or written by these functions.**

### `cleanupOrphanedSessions` IIFE

Sits immediately before `server.listen(PORT, ...)`. Single statement: `UPDATE sessions SET status = 'error', ended_at = NOW() WHERE status = 'active'`. Wrapped in try/catch. On affectedRows > 0 it logs `[startup] Marked N orphaned session(s) as error`. On affectedRows = 0 it stays silent. On DB unreachable it logs `[startup] Orphaned session cleanup failed (DB may be unreachable): <err>` and the server continues to start.

### `crypto.randomUUID()` (Decision A)

Node v22.22.2 on Dev-Web (and v24.14.0 on Mac); both >= 14.17.0 so the built-in is available. No `uuid` npm dependency added. Comment at the top of `src/sessions.js` documents the decision.

### `autoFileGitHubIssue()` token source

Pre-03d: `fs.readFileSync('data/settings.json')` and read `settings.githubToken`.
Post-03d: `db.queryOne("SELECT \`value\` FROM settings WHERE \`key\` = 'github_token'")`. Falls back to `process.env.GITHUB_TOKEN` if DB unreachable. Live GitHub call not exercised this stage - this stage does not trigger a degraded state.

### Path resolution chain (unchanged, recap)

1. `src/projects.js` reads `project.path` from DB (relative).
2. `resolveProjectPath(project)` does `path.join(PROJECT_ROOT, project.path)` where `PROJECT_ROOT` is the env var from `.env`.
3. On Dev-Web: `PROJECT_ROOT=/mnt/sc-development`. So a project with `path='CCC'` resolves to `/mnt/sc-development/CCC`.
4. The DB's `project_root` settings row (currently `/Users/steinhoferm/SC-Development`, the Mac value imported in 03b) is informational only - runtime always uses the env var.

### Status model (parser, unchanged)

Five states: WAITING_FOR_INPUT (red), RUNNING (yellow), COMPLETED (green), ERROR (orange), UNKNOWN (grey). PTY env must clear both `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT`.

### Test file naming regex (unchanged)

`/_test_stage\d+[a-z]*\d*\.md$/` - supports `_test_stage11.md`, `_test_stage11a.md`, `_test_stage07ac.md`, `_test_stage11a01.md`, `_test_stage07ac01.md`. Anything else is invisible to CCC.

---

## Dependencies

CCC server (Node):
- `express@^4.21.2`
- `node-pty@^1.2.0-beta.11` (Node v25 compat)
- `ws@^8.19.0`
- `marked@^17.0.3`
- `dotenv@^16.4.7`
- `mariadb@^3.4.0` (3.5.2 installed)
- `@xterm/addon-fit@^0.11.0`, `@xterm/xterm@^6.0.0` (vendored to `public/` for browser)
- Dev: `playwright@^1.58.2`

**No new dependencies in 03d / 03d01.** Decision A used the built-in `crypto.randomUUID()`.

Next.js preview app (`docs/v1.1/design/stage01a-dark-light/`): unchanged.

Dev-Web build dir: `/tmp/stage01a-build/`. Re-run `npm install` if `next: not found`.

---

## Apache & Deployment

### v1.1 design preview (live, unchanged)
- URL: `http://172.16.10.6/CCC/design-preview/`
- Apache `Alias` -> `/mnt/sc-development/CCC/docs/v1.1/design/preview/`

### CCC server v1.1 on Dev-Web (active)
- URL: `http://172.16.10.6:3000` (also `http://kkh01vdweb01.mcsfam.local:3000`).
- Started manually as `setsid nohup node server.js > /tmp/ccc-server.log 2>&1 < /dev/null &` from `/mnt/sc-development/CCC`.
- **Current PID: 5399.** cwd `/mnt/sc-development/CCC`.
- Uses `PROJECT_ROOT=/mnt/sc-development` and DB at `172.16.12.11`. Both from `.env`.
- Startup over NFS takes ~13s; the launcher's 15s curl timeout is right at the edge - be patient.
- No `deploy.sh` integration yet for the v1.1 server. Stage 04 or later will wire Forgejo-driven deploys per the global rule.

### Mac CCC v1.0.7 (production fallback, untouched)
- localhost:3000 on Mac, unchanged across the entire v1.1 stage cycle.

---

## Known Gotchas (cumulative for v1.1, with new ones from 03d / 03d01)

1. Test URL for design preview is `http://172.16.10.6/CCC/design-preview/` (Apache), not port 3000.
2. Test URL for the v1.1 server is `http://172.16.10.6:3000` (Dev-Web only).
3. Browser caching is sticky. Cmd+Shift+R required after every preview build.
4. Build on Dev-Web local `/tmp/`, not on the share. ~2.5s rebuild after first install.
5. `next.config.mjs` must set `basePath: '/CCC/design-preview'`.
6. `server.js /design-preview` Express route is redundant in prod (Apache serves static).
7. Apache config not in repo - `/etc/apache2/conf-available/CCC-design-preview-alias.conf` lives on Dev-Web only.
8. DNS: `kkh01vdweb01.mcsfam.local` doesn't resolve from Mac. Use IP `172.16.10.6` or `.mng.` hostname.
9. **GitHub push from CC works via inline token URL.** Pattern: `git push "https://SC-dev-0902:${GITHUB_TOKEN}@github.com/SC-dev-0902/CCC.git" main`. macOS keychain has a stale password and refuses; the inline form bypasses keychain entirely.
10. SSH key must be loaded into ssh-agent at session start: `! ssh-add --apple-use-keychain ~/.ssh/id_ed25519`.
11. `/tmp/stage01a-build/` not persistence-guaranteed. If `next: not found`, run `npm install` once.
12. `docs/handoff/CCC_recovery.md` is legacy-tracked. Modifies mid-session. Carry-forward: `git rm --cached` + `.gitignore`.
13. Hover styles use `useState`, not Tailwind hover. Theme tokens are dynamic.
14. Click handlers on row-internal elements need `e.stopPropagation()`.
15. Container vs single-project rendering rule. `!hasChildren && project.stageProgress` in `ProjectRow`.
16. Filter never mutates expand state. `forceExpand` override only.
17. Distinct empty copy: ACTIVE = `no match`, PARKED = `empty`. Don't unify.
18. `dotenv` default does NOT override existing `process.env`. All CCC env-loading entry points use `dotenv.config({ override: true })`.
19. Provisioned DB user is `ccc`, not `ccc_app`.
20. MariaDB sees Mac connections from `hhq01vifw01.mng.mcsfam.local` (NAT through firewall). The `ccc` user's GRANT must cover that host pattern.
21. Forgejo macOS keychain entry stale. Direct `git push origin` works from CC because the Forgejo repo URL has no auth.
22. `lock_session_id` has no FK (would create circular dep with sessions).
23. `Settings rows written: N` always equals the number of source-file keys mapped. `INSERT ... ON DUPLICATE KEY UPDATE` semantics.
24. `forgejo_token` intentionally absent from `settings` table. Real token in `.env`.
25. **`.env` has unquoted shell-special characters in at least one value.** `&&` in DB_PASSWORD/SSH_USER_Password fragments. When `set -a; source .env` is used, those lines emit `command not found` warnings; the variables we need (e.g. `GITHUB_TOKEN`) are set before parsing reaches the bad lines, so commands keep working - but the warnings are noise. Quote all `.env` values (`KEY="value"`) to silence them. (Carried from 03b - still not done.)
26. Sub-stage closure pattern: `Stage NNx complete - <brief>`. For 03d we used a code-only commit (`Stage 03d complete - settings and sessions DB cutover`) followed by a fix sub-stage commit (`Stage 03d01 complete - sessions.user_id nullable`).
27. Mac and Dev-Web are the SAME filesystem. Dev-Web `/mnt/sc-development` is NFS-mounted from TrueNAS; Mac `/Users/steinhoferm/SC-Development` is the same share via SMB. Edits made on the Mac are immediately visible on Dev-Web with no rsync.
28. CCC v1.1 server only works on Dev-Web. `PROJECT_ROOT=/mnt/sc-development` exists only there.
29. Restarting the v1.1 server takes ~13s over NFS. Use `setsid nohup node server.js ... &` to detach properly. `pkill` from inside an SSH heredoc can race with the new `setsid nohup` - prefer two separate SSH calls (`ssh ... 'pkill ...'; ssh -f ... 'setsid nohup ...'`) when the start command depends on the kill having finished.
30. `data/projects.json` and `data/settings.json` are no longer consulted at runtime. They remain on disk as backups. Editing them has no effect on the running v1.1 server.
31. **(NEW) `sessions.user_id` is now `NULL` (post 03d01).** Stage 03a created the column as `NOT NULL`; 03d01 relaxed it because Stage 03d intentionally inserts with NULL until Stage 05 wires authentication. The FK `fk_sessions_user` permits NULL targets (no FK change was needed).
32. **(NEW) `destroySession` and `pty.onExit` race.** Both fire UPDATE statements when an active session is replaced; whichever lands second wins (`'exited'` in the test run). Acceptable per the kickoff acceptance criterion. Only matters for graceful-replace cases - cold-kill orphans always land on `'error'` cleanly.
33. **(NEW) `data/settings.json` mtime is the canonical "no JSON write" probe.** `1777871094` was the value before 03d testing; unchanged across all PUT, restart, and orphan-cleanup operations. Use `stat -c '%Y %n' data/settings.json` to confirm runtime cleanliness.

---

## Open Items / Carry-Forwards

- **Stage 04 kickoff:** Cowork drafts kickoff prompt for **Sub-Stage 04a - DB Schema for Nesting**. Scope per the tasklist:
  - Add `parent_id` column to `projects` table (FK -> projects.id, nullable)
  - Add `lock_user_id` and `lock_session_id` columns
  - Migration for the column additions (`migrations/004_*`)
  - Update `src/projects.js`: tree-shaped `getAllProjects()`; `addProject` accepts `parent_id`
- **Stage 03 main Go/NoGo: GO** (closed by 03d01). Ready to proceed to Stage 04.
- **GitHub push backlog:** Cleared. Both remotes at `0a48e6b`.
- **Forgejo keychain refresh** still nice-to-have, not urgent.
- **`.env` value quoting** still not done (gotcha 25). Mildly noisy when sourcing.
- **Recovery file legacy-tracked** (gotcha 12). `git rm --cached` + `.gitignore` pending.
- **`data/projects.json`** unstaged `M` from previous session - format normalisation, harmless. Address in a cleanup commit.
- **Apache alias not version-controlled.** Capture in `deploy.sh` or infra doc later.
- **Manual run script for the v1.1 Dev-Web server** - still ad-hoc (`setsid nohup node server.js`). systemd unit or `deploy.sh` integration later.
- **v1.1.0 not yet tagged.** Tag deferred per the SHP plan; Stage 04 lands first.
- **Race-condition cleanup (gotcha 32)** - candidate for Stage 05/06 when audit-trail granularity matters.
- **`destroy` -> `error` semantic** is currently masked by `onExit` -> `'exited'`. If the distinction needs to be authoritative in v1.1 itself, a small follow-up fix-sub-stage could remove the `destroySession` UPDATE and rely on `onExit` for the row update, with `destroy` only signalling intent through a different column. Not urgent.

---

## Next Actions

1. **Cowork drafts Sub-Stage 04a kickoff prompt** (`docs/handoff/stage04a-prompt.md`). Scope above.
2. CC starts Sub-Stage 04a when the kickoff prompt is delivered.
3. After Sub-Stage 04a Go: continue with 04b/04c per the tasklist.
4. Optional cleanups (any session): `data/projects.json`, `docs/handoff/CCC_recovery.md`, `.env` value quoting.

---

*End of SHP. Build 57. Run `/continue` to resume.*
