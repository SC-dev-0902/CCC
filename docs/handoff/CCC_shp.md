# Session Handover Pack - CCC
*Generated: 2026-05-05 | Version: v1.1.0 (Sub-Stage 03c complete) | Sub-Stage 03d next | Build 54*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Version:** v1.1.0 - sub-stages 03a + 03b + 03c complete on 2026-05-05. Stage 03 main Go/NoGo gate is at the end of 03d (covers schema, import, projects.js rewrite, settings/sessions DB).
- **Active version in projects.json:** "1.1".
- **Stage:** v1.1 Sub-Stage 03c **GO** (closure commit `5408c93`). Next: Cowork drafts Stage 03d kickoff prompt (`settings.json` + `src/sessions.js` cutover, orphaned-session cleanup on restart).
- **Status:** CCC v1.1 server is now live on Dev-Web (`http://172.16.10.6:3000`, PID 4180), reading projects exclusively from MariaDB on Dev-DB (`172.16.12.11`). The Mac CCC v1.0.7 (`localhost:3000`) is unchanged and still uses `data/projects.json`. `data/projects.json` and `data/settings.json` remain on disk as backups - not deleted, not written to by the v1.1 server.

---

## What Was Done This Session (Sub-Stage 03c)

### Files added (new this session)

- `docs/handoff/stage03c-prompt.md` - Cowork-authored kickoff prompt (committed during 03c closure).
- `docs/v1.1/CCC_test_stage03c.md` - 11 sections, 29 actionable items, full v1.0 sectioned format. All 29 items ticked PASS this session via the CLI test run on Dev-Web. Includes one item where the verbatim grep initially matched a JSDoc comment - now clean after the JSDoc trim (see "Decisions Made" below).

### Files changed

- `src/projects.js` - **full rewrite**. All CRUD now flows through `src/db.js`. Public interface (function names, return shapes) unchanged so `server.js` callers don't care. JSON I/O eliminated entirely. JSDoc above `renameProject` trimmed to drop a historical `writeData()` reference (so the Section-10 verbatim grep returns clean).
- `server.js` - mechanical async/await updates across all project routes. No new endpoints, no behaviour changes from the client's perspective.
- `docs/v1.1/CCC_tasklist_v1.1.0.md` - all seven Sub-Stage 03c items ticked.

### Commits this session

| Hash | Message | Notes |
|---|---|---|
| `5408c93` | `Stage 03c complete - projects.js rewritten to MariaDB` | Single closure commit covering the rewrite, async server.js, test file, ticked tasklist, and kickoff prompt. Pushed to both Forgejo (`origin`) and GitHub. |

A separate `/eod` SHP commit will follow this file write.

### Test results (29/29 PASS)

Run on Dev-Web (`/mnt/sc-development/CCC`) against Dev-DB (`172.16.12.11`). Server PID 3799 (initial) -> 4180 (after the explicit restart-persistence test).

| Section | Items | Result |
|---|---|---|
| 1. Server Boot | 2 | PASS - port 3000 listening, `/api/version` returns 200 |
| 2. GET /api/projects shape | 4 | PASS - 17 projects, groups Active+Parked, camelCase keys, coreFiles 3 keys, evaluated boolean |
| 3. POST add | 3 | PASS - new id `8b8807d8-...`, GET shows it, DB row exists |
| 4. PUT update + restart persistence | 3 | PASS - `_StageTestGroup` survived a real server kill+restart |
| 5. PUT reorder | 2 | PASS - sort_order=0 in DB and API response |
| 6. POST rename | 4 | PASS - mkdir, rename, DB updated, cleanup verified |
| 7. GET versions for CCC | 1 | PASS - `activeVersion: 1.1, versions: 1.0,1.1` (PROJECT_ROOT used) |
| 8. POST start session | 2 | PASS - shell session active, cleared on restart |
| 9. DELETE + cascade + group cleanup | 4 | PASS - row gone, core_files=0, group removed |
| 10. data/projects.json untouched | 3 | PASS - file mtime predates server start; no diff from API tests; verbatim grep clean after JSDoc trim |
| 11. Final counts | 1 | PASS - `projects: 17 core_files: 51 settings: 6` (matches Stage 03b seed) |

---

## Decisions Made

- **Mac and Dev-Web share one filesystem.** Confirmed this session: Dev-Web `/mnt/sc-development` is NFS-mounted from `172.16.100.17:/mnt/usr_datapool_vol001/sc-development` (TrueNAS). Mac mounts the same share via SMB at `/Users/steinhoferm/SC-Development`. Edits made on the Mac are visible on Dev-Web with no rsync. Confirmed by editing `src/projects.js` on the Mac and immediately re-running the verbatim grep on Dev-Web - returned clean. Implication: development workflow can stay Mac-side; deploys need no copy step for code-only changes.
- **GitHub push works from CC via the .env token.** Pattern: `git push "https://SC-dev-0902:${GITHUB_TOKEN}@github.com/SC-dev-0902/CCC.git" main` with `GITHUB_TOKEN` sourced from `.env`. The macOS keychain still holds a stale password and refuses; the inline token URL bypasses keychain entirely. This unblocks the long-standing "GitHub push pending" backlog. Stage 03c push covered everything from `138a565` to `5408c93` in one go.
- **JSDoc historical reference removed mid-test.** Section 10's verbatim grep matched a comment line in `src/projects.js:277` (`* Persistence at the end goes to the DB instead of writeData().`). Phet authorised the trim - removed the third comment line, kept the function summary. This makes the test command pass literally, removes a stale reference, and changes no behaviour. Recorded as a sub-stage-internal cleanup.
- **`data/projects.json` and `docs/handoff/CCC_recovery.md` left unstaged again.** Both are pre-existing M from earlier sessions, not Stage 03c work. Same precedent as 03a + 03b. The `projects.json` diff is `"activeVersion": "1.1.0" -> "1.1"` (format normalisation by the v1.0.7 Mac CCC); the recovery file is the legacy terminal-snapshot artifact (gotcha 11). Both still need separate cleanup passes.
- **Stage 03c closure commit only - no separate work commit.** Stages 03a + 03b each had a kickoff-prescribed work commit followed by a `/go` closure commit (the SHPs flagged that as a duplication). For 03c, the kickoff didn't prescribe a work commit, so a single canonical closure commit (`Stage 03c complete - ...`) carries everything. Cleaner pattern; future stages should follow.
- **CCC v1.1 server now runs on Dev-Web only.** The `.env` has `PROJECT_ROOT=/mnt/sc-development`, which exists only on Dev-Web. The Mac CCC v1.0.7 instance keeps running unchanged on `localhost:3000` for fallback / day-to-day use during the v1.1 build-out.

---

## Full Project Timeline

| Commit | Description | Date |
|---|---|---|
| ... v1.0.0 - v1.0.7 ... | (see prior SHPs) | 2026-02-27 to 2026-04-24 |
| `ab9bee7` | v1.1.0 Stage 00a+00b - TrueNAS share mounted | 2026-05-04 |
| `5f5d03f` | v1.1.0 Stage 01f - wired design preview live | 2026-05-04 |
| `fd0265b` | v1.1.0 Stage 02a - parent/sub hierarchy | 2026-05-04 |
| `a7292ed` | SHP update - Stage 02a GO | 2026-05-04 |
| `3749432` | v1.1.0 Stage 02b - locking badge + Start Session | 2026-05-05 |
| `fdbc231` | SHP update - Stage 02b GO | 2026-05-05 |
| `a98d2a8` | v1.1.0 Stage 02c - top menu diodes | 2026-05-05 |
| `1389e28` | SHP update - Stage 02c GO | 2026-05-05 |
| `9d645b9` | Stage 02d complete - treeview search/filter polish | 2026-05-05 |
| `5a53802` | Stage 02 complete - UI Shell (main gate GO) | 2026-05-05 |
| `722efa9` | SHP update - Stage 02 GO, Stage 03 next | 2026-05-05 |
| `2225181` | v1.1.0 Stage 03a - MariaDB schema and migration runner | 2026-05-05 |
| `4e74a7c` | SHP update - Stage 03a complete, /tested + Stage 03b next | 2026-05-05 |
| `a618b19` | v1.1.0 Stage 03b - JSON import script (work) | 2026-05-05 |
| `5c679b3` | Stage 03b complete - JSON import script (closure) | 2026-05-05 |
| `68467c7` | SHP update - Stage 03b complete, Stage 03c next | 2026-05-05 |
| `5408c93` | **Stage 03c complete - projects.js rewritten to MariaDB** | 2026-05-05 |

Pushed to **both** Forgejo (`origin`) and GitHub (`github`). The long-standing GitHub-push backlog is now cleared. v1.1.0 not yet tagged.

Tags: `v1.0.0` -> `v1.0.7`. v1.1.0 will be tagged after Stage 03 main Go/NoGo (end of 03d).

---

## Architecture & File Map (v1.1 active surface, post-03c)

| Area | File / Path |
|---|---|
| **Backend - DB layer (Stage 03a)** | |
| MariaDB schema | `migrations/001_initial.sql` |
| Schema migration runner | `migrations/run.js` |
| DB layer (lazy pool, query/queryOne/transaction) | `src/db.js` |
| **Backend - Data import (Stage 03b)** | |
| JSON -> DB import script | `migrations/002_import.js` |
| **Backend - Project registry (NEW Stage 03c)** | |
| Project CRUD (DB-backed) | `src/projects.js` |
| HTTP server (async project routes) | `server.js` |
| **Backend - unchanged** | |
| Status parser | `src/parser.js` |
| PTY session manager | `src/sessions.js` |
| Version scanner | `src/versions.js` |
| Token usage status bar | `src/usage.js` |
| **Frontend (unchanged from Stage 02)** | |
| Design preview source (Next.js 16) | `docs/v1.1/design/stage01a-dark-light/` |
| Static build output | `docs/v1.1/design/preview/` |
| Apache alias config (Dev-Web only) | `/etc/apache2/conf-available/CCC-design-preview-alias.conf` |
| **Docs** | |
| Stage kickoff prompts (02a-03c) | `docs/handoff/stage02{a,b,c,d}-prompt.md`, `docs/handoff/stage03{a,b,c}-prompt.md` |
| Stage test files (02a-03c) | `docs/v1.1/CCC_test_stage02{a,b,c,d}.md`, `docs/v1.1/CCC_test_stage03{a,b,c}.md` |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` |
| v1.1 concept doc | `docs/v1.1/CCC_concept_v1.1.0.md` |

The two unchanged backend files (`src/sessions.js`, `src/versions.js`) still call into `src/projects.js` and now transparently see DB data instead of JSON data.

---

## API Endpoint Inventory (current - server.js post-03c)

All endpoints live in `server.js`. Stage 03c made all project-route handlers `async` and replaced sync `getProjects()/saveProjects()` calls with `await fetchProjects()/createProject()/updateProject()/...` from `src/projects.js`. No new routes, no removed routes.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Serve `public/index.html` |
| GET | `/api/version` | `{version, build}` for sanity/uptime |
| GET | `/api/projects` | List projects + groups (DB-backed) |
| POST | `/api/projects` | Register a new project (DB INSERT + core_files INSERT) |
| PUT | `/api/projects/:id` | Update project (name, group, coreFiles, activeVersion, evaluated) |
| PUT | `/api/projects-reorder` | Bulk update sort_order + group_name |
| POST | `/api/projects/:id/rename` | Rename project (DB UPDATE + folder rename + propagate to coreFiles paths) |
| DELETE | `/api/projects/:id` | Remove a project (CASCADE clears project_core_files) |
| DELETE | `/api/projects/:id/versions/:version` | Delete a specific version (active deletable with auto-fallback) |
| GET | `/api/projects/:id/versions` | List versions per `scanVersionFiles` |
| GET | `/api/projects/:id/files` | Tree of project's coreFiles |
| GET | `/api/file/:projectId` | Read a single file |
| PUT | `/api/file/:projectId` | Write a single file |
| GET | `/api/settings` | Read global settings (still settings.json - 03d cuts over) |
| PUT | `/api/settings` | Update global settings (still settings.json - 03d cuts over) |
| DELETE | `/api/groups/:name` | Remove a group from settings |
| POST | `/api/sessions/:projectId` | Start a PTY session |
| WS | `/ws` | xterm.js websocket - PTY session multiplexer |
| GET | `/design-preview/...` | Express static fallback (redundant in prod) |

---

## Database Schema & Seed (post-03c, unchanged from 03b)

Database: `ccc` on Dev-DB (`172.16.12.11:3306`, MariaDB 10.11.14). User: `ccc`.

| Table | Rows | Columns (key fields only) | FKs |
|---|---|---|---|
| `users` | 0 | id (PK CHAR(36)), username (UNIQUE), password_hash, role, created_at, last_login | - |
| `projects` | **17** | id (PK), name, path, parent_id, group_name, sort_order, type, active_version, evaluated, lock_user_id, lock_session_id, created_at, updated_at | parent_id, lock_user_id (SET NULL); **lock_session_id intentionally has no FK** |
| `project_core_files` | **51** | (project_id, file_type) PK; file_path | project_id (CASCADE) |
| `sessions` | 0 | id (PK), project_id, user_id, status, started_at, ended_at | project_id, user_id (CASCADE) |
| `settings` | **6** | key (PK), value | - |
| `project_integrations` | 0 | (project_id, integration) PK; config (JSON), enabled | project_id (CASCADE) |

Stage 03c verified all 17 projects, 51 core_files, and 6 settings rows survive the full CRUD cycle (add -> update -> reorder -> rename -> delete) with no leakage.

### `src/projects.js` interface (post-03c, all async)

| Function | Signature | Notes |
|---|---|---|
| `fetchProjects()` | `() => { projects: [...], groups: [...] }` | LEFT JOIN projects + project_core_files. camelCase output. |
| `fetchProjectById(id)` | `(id) => Project \| null` | Single-project variant. |
| `createProject(input)` | `({name, path, group, type?, evaluated?}) => Project` | INSERT projects + INSERT 3 core_files (claude/concept/tasklist). Defaults: `type='code'`, `evaluated=true`. |
| `updateProject(id, updates)` | `(id, {name?, group?, coreFiles?, activeVersion?, evaluated?}) => Project` | UPDATE projects, upsert core_files when `coreFiles` provided. |
| `removeProject(id)` | `(id) => {ok:true}` | DELETE; CASCADE handles core_files. |
| `reorderProjects(orderedIds)` | `([{id, group, order}]) => {projects, groups}` | Bulk UPDATE sort_order + group_name. Returns full registry. |
| `renameProject(id, newName)` | `(id, newName) => {project, folderRenamed, renamedFiles, updatedContent}` | DB rename + filesystem folder rename + content propagation. Filesystem phase first (fail-fast); DB update only on success. |
| `resolveProjectPath(project)` | `(project) => absPath` | Joins `PROJECT_ROOT` from `.env` with `project.path`. Used by sessions + versions. |
| `addGroup(name)` / `removeGroup(name)` | settings-table read/write for the groups list | Still touches settings.json indirectly via `src/usage.js` until 03d. |

camelCase output is the contract: `group_name`, `sort_order`, `active_version` from the DB are mapped to `group`, `order`, `activeVersion` before leaving the module. No snake_case leaks - verified in test Section 2.

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
- `ProjectRow.expanded` - local state, default per project id
- `ProjectRow.forceExpand` - filter override, never mutates `expanded`
- `ProjectRow` progress-bar guard: `!hasChildren && project.stageProgress`
- `SubProjectRow.expanded` independent of filter
- `StartSessionButton.hover`

Sidebar render order: header -> search -> NEW (only if matches) -> ACTIVE (always shows header; "no match" if filtered empty) -> PARKED (always shows header; "empty" if no data) -> legend.

---

## Key Technical Details

### `src/projects.js` rewrite shape (NEW Stage 03c)

- All public functions are `async`. Internal helpers (`mapProjectRow`, `assembleCoreFiles`) are sync and return shaped objects from raw DB rows.
- `fetchProjects` does a single LEFT JOIN, then groups core_files by `project_id` in JS. `coreFiles` always has all three keys (claude/concept/tasklist) - missing rows are filled with empty strings.
- `createProject` runs as a `transaction()`: INSERT projects, then INSERT 3 core_files. Rolls back if either fails.
- `updateProject` is selective: only sets columns that appear in the `updates` payload. coreFiles upsert is its own transaction.
- `removeProject` relies on the schema's `ON DELETE CASCADE` for `project_core_files` - no manual delete loop.
- `reorderProjects` is one transaction with N UPDATEs - keeps move/regroup atomic from the API caller's perspective.
- `renameProject` is filesystem-first (move folder, rewrite CLAUDE.md / coreFiles paths), then DB UPDATE. If filesystem fails, DB stays untouched. Documented in the test file: "DB update should NOT happen if the filesystem phase fails (transactional contract)."

### Lazy DB pool (unchanged)

`src/db.js` builds the pool on first call, not on `require()`. This lets `server.js` start before the DB is reachable. Once needed, the pool builds with `connectionLimit: 10`.

### Why `lock_session_id` has no FK (unchanged)

`projects.lock_session_id` -> `sessions.id` would create a circular dependency: sessions has a FK to projects. Application code is responsible for ensuring the column references a real session.

### Idempotent import logic (Stage 03b, still relevant for fresh seeds)

- Projects + core files: `INSERT IGNORE`. `affectedRows = 0` -> already existed -> increment `skipped`.
- Settings: `INSERT ... ON DUPLICATE KEY UPDATE value = VALUES(value)`. Always counted - `Settings rows written: 6` is per-attempt, not net new rows.

### `dotenv override: true` everywhere (unchanged)

All env-loading entry points (`migrations/run.js`, `src/db.js`, `migrations/002_import.js`, and now `src/projects.js` indirectly via `src/db.js`) use `dotenv.config({ override: true })` so `.env` wins over stale shell vars.

### Path resolution chain

1. `src/projects.js` reads `project.path` from DB (relative).
2. `resolveProjectPath(project)` does `path.join(PROJECT_ROOT, project.path)` where `PROJECT_ROOT` is the env var from `.env`.
3. On Dev-Web: `PROJECT_ROOT=/mnt/sc-development`. So a project with `path='CCC'` resolves to `/mnt/sc-development/CCC`.
4. On Mac (v1.0.7 server): `PROJECT_ROOT` not set; legacy code falls back to `settings.projectRoot` from `data/settings.json` (`/Users/steinhoferm/SC-Development`).
5. The DB's `project_root` settings row is informational only (left over from import) - runtime always uses the env var.

### Container vs single-project rendering rule (unchanged)

`Project` with `subProjects` -> container, no progress bar at parent. `Project` without `subProjects` -> single-project mode, bar at parent (e.g. CCC). Code guard: `!hasChildren && project.stageProgress`.

### Filter expand/collapse contract (unchanged)

`forceExpand` overrides via `effectiveExpanded`, never mutates `expanded`. After Escape, expand state restores to whatever was set locally before the filter.

### Version model (unchanged)

`activeVersion` field in `projects.json` (and now in DB column `active_version`) is the only pointer. `docs/vX.Y/` for major.minor; `docs/vX.Y/vX.Y.Z/` for patches. No filesystem symlinks.

### Test file naming regex (unchanged)

`/_test_stage\d+[a-z]*\d*\.md$/` - supports `_test_stage11.md`, `_test_stage11a.md`, `_test_stage07ac.md`, `_test_stage11a01.md`, `_test_stage07ac01.md`. Anything else is invisible to CCC.

### Status model (parser, unchanged)

Five states: WAITING_FOR_INPUT (red `#9B2335`), RUNNING (yellow `#B7791F`), COMPLETED (green `#276749`), ERROR (orange `#7A1828`), UNKNOWN (grey `#A0AEC0`). PTY env must clear both `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT`.

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

Next.js preview app (`docs/v1.1/design/stage01a-dark-light/`): unchanged.
- `next@16.2.4` (Turbopack, static export), `react@19`, `lucide-react`, `tailwindcss`, shadcn/ui subset.

Dev-Web build dir: `/tmp/stage01a-build/`. Re-run `npm install` if `next: not found`.

---

## Apache & Deployment

### v1.1 design preview (live, unchanged)
- URL: `http://172.16.10.6/CCC/design-preview/`
- Apache `Alias` -> `/mnt/sc-development/CCC/docs/v1.1/design/preview/`
- Updates: rebuild on Dev-Web `/tmp/stage01a-build/`, rsync `out/` -> `preview/`. No reload required.

### CCC server v1.1 on Dev-Web (NEW - active)
- URL: `http://172.16.10.6:3000` (also `http://kkh01vdweb01.mcsfam.local:3000`).
- Started manually as `setsid nohup node server.js > /tmp/ccc-server.log 2>&1 < /dev/null &` from `/mnt/sc-development/CCC`.
- Current PID: 4180 (post the test-restart). The cwd is `/mnt/sc-development/CCC`.
- Uses `PROJECT_ROOT=/mnt/sc-development` and DB at `172.16.12.11`. Both from `.env`.
- Startup over NFS takes ~13s; the launcher's 15s curl timeout is right at the edge - be patient.
- No `deploy.sh` integration yet for the v1.1 server. Stage 03d or later will wire Forgejo-driven deploys per the global rule.

### Mac CCC v1.0.7 (production fallback, untouched)
- localhost:3000 on Mac, unchanged across the entire v1.1 stage cycle so far.

---

## Known Gotchas (cumulative for v1.1, with new ones from 03c)

1. **Test URL for design preview is `http://172.16.10.6/CCC/design-preview/`** (Apache), not port 3000.
2. **Test URL for the v1.1 server is `http://172.16.10.6:3000`** (Dev-Web only).
3. **Browser caching is sticky.** Cmd+Shift+R required after every preview build.
4. **Build on Dev-Web local `/tmp/`**, not on the share. ~2.5s rebuild after first install.
5. **`next.config.mjs` must set `basePath: '/CCC/design-preview'`.**
6. **`server.js /design-preview` Express route is redundant** in prod (Apache serves static).
7. **Apache config not in repo** - `/etc/apache2/conf-available/CCC-design-preview-alias.conf` lives on Dev-Web only.
8. **DNS:** `kkh01vdweb01.mcsfam.local` doesn't resolve from Mac. Use IP `172.16.10.6` or `.mng.` hostname.
9. **GitHub push from CC works via inline token URL.** Pattern: `git push "https://SC-dev-0902:${GITHUB_TOKEN}@github.com/SC-dev-0902/CCC.git" main`. macOS keychain has a stale password and refuses; the inline form bypasses keychain entirely. SUPERSEDES the older "GitHub push pending" gotcha - this is no longer a manual step.
10. **SSH key must be loaded into ssh-agent** at session start: `! ssh-add --apple-use-keychain ~/.ssh/id_ed25519`.
11. **`/tmp/stage01a-build/` not persistence-guaranteed.** If `next: not found`, run `npm install` once.
12. **`docs/handoff/CCC_recovery.md` is legacy-tracked.** Modifies mid-session even after deletion. Carry-forward: `git rm --cached` + `.gitignore`.
13. **Hover styles use `useState`, not Tailwind hover.** Theme tokens are dynamic.
14. **Click handlers on row-internal elements need `e.stopPropagation()`** so they don't toggle the row.
15. **Container vs single-project rendering rule.** `!hasChildren && project.stageProgress` in `ProjectRow`.
16. **Filter never mutates expand state.** `forceExpand` override only; local `expanded` survives.
17. **Distinct empty copy: ACTIVE = `no match`, PARKED = `empty`.** Don't unify.
18. **dotenv default does NOT override existing `process.env`.** Stale shell `DB_*` exports silently win. All CCC env-loading entry points use `dotenv.config({ override: true })` - keep the pattern.
19. **Provisioned DB user is `ccc`, not `ccc_app`.**
20. **MariaDB sees Mac connections from `hhq01vifw01.mng.mcsfam.local`** (NAT through firewall). The `ccc` user's GRANT must cover that host pattern.
21. **Forgejo macOS keychain entry stale.** Direct `git push origin` works from CC because the Forgejo repo URL has no auth; if a keychain prompt ever appears, refresh the entry once in a regular terminal.
22. **`lock_session_id` has no FK** (would create circular dep with sessions).
23. **`Settings rows written: N` always equals the number of source-file keys mapped.** `INSERT ... ON DUPLICATE KEY UPDATE` semantics.
24. **`forgejo_token` intentionally absent from `settings` table.** Real token in `.env`.
25. **`.env` has unquoted shell-special characters in at least one value.** `&&` in DB_PASSWORD/SSH_USER_Password fragments. When sourcing `.env` directly in shell, fragments leak as barewords. Quote all `.env` values (`KEY="value"`) to prevent this leak class. (Carried from 03b - still not done.)
26. **`/go` closure commit pattern.** Sub-stage closure: `Stage NNx complete - <brief>`. For 03c we used a single closure commit (no separate work commit). Cleaner; future stages should follow.
27. **(NEW) Mac and Dev-Web are the SAME filesystem.** Dev-Web `/mnt/sc-development` is NFS-mounted from TrueNAS; Mac `/Users/steinhoferm/SC-Development` is the same share via SMB. **Edits made on the Mac are immediately visible on Dev-Web with no rsync needed.** This is non-obvious and important for deployment thinking.
28. **(NEW) CCC v1.1 server only works on Dev-Web.** `PROJECT_ROOT=/mnt/sc-development` exists only there. Mac CCC v1.0.7 keeps running unchanged for fallback.
29. **(NEW) Restarting the v1.1 server takes ~13s over NFS.** Use `setsid nohup node server.js > /tmp/ccc-server.log 2>&1 < /dev/null &` to detach properly. The launcher's curl-readiness check should poll for `/api/version` rather than waiting a fixed time.
30. **(NEW) `data/projects.json` is no longer consulted at runtime.** It's still on disk (for now) as a backup, but the v1.1 server reads exclusively from MariaDB. Editing it has no effect on running CCC. The 03d settings cutover will leave `data/settings.json` in the same role.

---

## Open Items / Carry-Forwards

- **Stage 03d kickoff:** Cowork drafts kickoff prompt for `settings.json` + `src/sessions.js` cutover. Specific scope per the tasklist:
  - Settings read/write in `server.js` -> DB instead of `settings.json`.
  - `src/sessions.js` writes session start/end events to `sessions` table.
  - On server restart: mark all `sessions` with `status='active'` as `status='error'` (orphaned).
  - Verify settings persist across restart via DB.
- **Stage 03 main Go/NoGo gate** is at the end of 03d.
- **GitHub push backlog cleared.** No longer pending.
- **Forgejo keychain refresh** still nice-to-have, not urgent.
- **`.env` value quoting** still not done (gotcha 25).
- **Recovery file legacy-tracked** (gotcha 12). `git rm --cached` + `.gitignore`.
- **`data/projects.json`** unstaged `M` from previous session - format normalisation, harmless. Address in a cleanup commit.
- **Apache alias not version-controlled.** Capture in `deploy.sh` or infra doc later.
- **Manual run script for the v1.1 Dev-Web server** - still ad-hoc (`setsid nohup node server.js`). systemd unit or `deploy.sh` integration later.
- **v1.1.0 not yet tagged.** Tag after Stage 03 main Go.

---

## Next Actions

1. **Cowork drafts Stage 03d kickoff prompt** (`docs/handoff/stage03d-prompt.md`). Scope above.
2. CC starts Stage 03d when the kickoff prompt is delivered.
3. After Stage 03d Go: tag `v1.1.0-rc1` (or similar pre-release) and continue with Stage 04 (Nested Project Structure - `parent_id` on projects).
4. Optional cleanups (any session): `data/projects.json` and `docs/handoff/CCC_recovery.md` carry-forwards; `.env` value quoting.

---

*End of SHP. Build 54. Run `/continue` to resume.*
