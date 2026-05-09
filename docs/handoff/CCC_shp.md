# Session Handover Pack - CCC
*Generated: 2026-05-09 (EOD, after Stage 05a GO) | Version: v1.1.0 (dev) + v1.0.7 (local) | Stage 05a complete | Build 77 | Forgejo + GitHub at `cece37b` (code commit; SHP/tasklist commit follows)*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Two live versions, two environments:**
  - **v1.1.0 (dev):** runs on **Dev-Web only** at `http://kkh01vdweb01.mcsfam.local/CCC/` via Apache reverse proxy onto `127.0.0.1:3000`. MariaDB-backed, Next.js client. Active development line.
  - **v1.0.7 (production-stable, local):** runs on **Mac only** at `http://localhost:3000`. JSON-file-backed, vanilla `public/` frontend. Lives in a parallel git worktree at `/Users/steinhoferm/SC-Development/CCC-v1.0` pinned to tag `v1.0.7`. **v1.0 was never intended to run on Dev-Web.**
- **Active version in projects DB (v1.1):** `"1.1"`.
- **Stage:** Stage 05a **GO** 2026-05-09 (commit `cece37b`). First sub-stage of Stage 05 (Authentication & Multi-User).
- **App is intentionally locked.** Every `/api/*` request returns 401 until Stage 05b ships the login endpoint. This is correct and expected.

---

## What Was Done This Session (2026-05-09)

### Stage 05a GO - Auth Middleware

The kickoff (`docs/handoff/stage05a-prompt.md`) defined 5 tasks. All shipped. 13/13 acceptance criteria pass.

1. **Task 1 - Install dependencies.** `express-session@^1.19.0` + `express-mysql-session@^3.0.3`. Note: kickoff specified `express-mysql-session@^3.1.2`, which does not exist on npm. Phet approved Option B - installed `^3.0.0` (latest 3.x is `3.0.3`). One high-severity npm audit warning surfaced for a transitive dep - left for follow-up.
2. **Task 2 - Generate and populate secrets.** `SESSION_SECRET` and `CCC_API_TOKEN` in `/mnt/sc-development/CCC/.env` populated with two fresh 32-byte hex values via `node -e "...randomBytes(32).toString('hex')"`. Pre-edit backup at `/mnt/sc-development/CCC/.env.bak.stage05a` (kept on disk; not committed).
3. **Task 3 - Create `src/auth.js`.** New file (62 lines). Verbatim per kickoff. Exports `sessionMiddleware` (express-session with MySQLStore on `auth_sessions` table, 24h cookie, httpOnly, sameSite=lax), `requireAuth` (returns 401 JSON if no `req.session.userId`), `requireApiToken` (Bearer token check against `process.env.CCC_API_TOKEN`).
4. **Task 4 - Update `server.js`.** Three additions:
   - `const { sessionMiddleware, requireAuth, requireApiToken } = require('./src/auth');` (line 14, with the other `src/` requires).
   - `app.use(sessionMiddleware);` (line 21, immediately after `app.use(express.json())`).
   - Two scoped guards (lines 23-31): `app.use('/api', ...)` runs `requireAuth` with a `req.path.startsWith('/v1')` bypass; `app.use('/api/v1', requireApiToken)` enforces bearer for the (still empty) `/api/v1/*` namespace. Cache-control middleware and `express.static` follow on lines 33-38, untouched. First route handler is at line 117.
5. **Task 5 - Generate test file.** `docs/v1.1/CCC_test_stage05a.md` written, all CLI items pre-verified. `auth_sessions` table auto-created (`createDatabaseTable: true`). Apache + direct-port curls both confirm the lock.

### Recovery operations carried out during the session

- **`/tmp/ccc-restart.sh` recreated.** Wiped by a Dev-Web reboot. Inlined fresh from the gotcha pattern (kill `node server.js` by `/proc/$p/cmdline` filter, not pkill, to avoid self-kill). Permissions `-rwxr-xr-x` at `/tmp/ccc-restart.sh`.
- **mysql CLI absent on Dev-Web.** All DB checks ran via `node -e` against the existing `mariadb` driver. Either install `mariadb-client` / `default-mysql-client`, or treat the node pattern as canonical going forward. Test file shows the exact node-e snippet.
- **`/etc/hosts` quirk.** On Dev-Web, `kkh01vdweb01.mcsfam.local` resolves to `127.0.1.1`, but Apache binds `172.16.10.6:80`. Curl from Dev-Web to its own FQDN fails with `connection refused`. Fix: run Apache curls from the Mac (DNS resolves to the SRV-LAN IP). Tested `127.0.0.1:3000` directly from Dev-Web for the express-level check.

### Decisions made this session

1. **Option B on `express-mysql-session` version.** `^3.1.2` doesn't exist; installed `^3.0.0` (resolved to `3.0.3`). Equivalent semver intent. Kickoff is now slightly out of sync with reality - flagged in test file for any re-run.
2. **Auth guards mounted before existing cache-control + static middleware.** Most literal kickoff reading: "after `app.use(express.json())`" + "immediately after sessionMiddleware". Functionally equivalent to placing them after static (auth is `/api`-scoped), but the literal reading was honored. Static still works because the auth guard never matches non-`/api` paths.
3. **`/CCC/login` 301 quirk treated as pre-existing, not a Stage 05a regression.** Express's `static` redirects `/CCC/login` to `/login/` (loses basePath), Apache 404s on `/login/`, and `/CCC/login.html` returns 200. Stage 05b will add a real `/login` page; the 301 was there before Stage 05a touched anything. Acceptance criterion #10 ("not blocked by auth") holds because 301 != 401.
4. **Selective `git add`.** Skipped `client/app/globals.css` (SMB-locked carry-forward), `docs/handoff/CCC_recovery.md` (legacy auto-tracked), `.env.bak.stage05a` (transient backup; `.gitignore` only has `.env`, not `.env.bak*` - left out by name, not by pattern).
5. **Single code commit covering 05a closure.** Followed by a second `Stage 05a GO ... + tasklist + SHP` commit per the global two-commit pattern. Kickoff prompt + test file both went into the code commit (matches stage 04e/04e01 precedent).

---

## Full Project Timeline (recent)

| Hash | Description | Date |
|---|---|---|
| `4fee6d0` | SHP update - Stage 03 complete | 2026-05-05 |
| `3f924ea` | Stage 04a complete - DB schema for nesting | 2026-05-05 |
| `d9203d7` | Stage 04a01 complete - group_name nullable | 2026-05-05 |
| `e8809cd` | Stage 04b complete - filesystem scanner update | 2026-05-05 |
| `b4c4a70` | Stage 04bN complete - Next.js client wiring | 2026-05-05 |
| `565363f` | Stage 04bN GO + 04b backend ticked | 2026-05-06 |
| `6e4a0ec` | Stage 04b01 complete - scan guard + dev-projects + grouped test files | 2026-05-06 |
| `68f13f9` | Stage 04c complete - parent/sub-project rendering + drag-drop | 2026-05-06 |
| `a15d208` | Stage 04c GO + tasklist + SHP | 2026-05-06 |
| `73786cc` | Stage 04d complete - First-Run Setup + Migration-via-Drag | 2026-05-06 |
| `f1a5860` | Stage 04d GO + tasklist + SHP | 2026-05-06 |
| `0a2c320` | Stage 04e + 04e01 complete - Multi-Session Tab Bar + Import Wizard | 2026-05-07 |
| `9ca3a93` | Stage 04e + 04e01 GO + tasklist + SHP | 2026-05-07 |
| `cece37b` | **Stage 05a complete - Auth Middleware** | 2026-05-09 |

Tags: `v1.0.0` -> `v1.0.7`. v1.1.0 not yet tagged (deferred to end of v1.1 cycle).

---

## Git State

**Forgejo (`origin`)**: `http://mcs-git.mcsfam.local:3000/Phet/CCC.git` - HEAD `cece37b` (will be at SHP/tasklist commit after this /eod).
**GitHub (`github`)**: `https://github.com/SC-dev-0902/CCC.git` - HEAD `cece37b` (will be at SHP/tasklist commit after this /eod).

**Worktrees:**
```
/Users/steinhoferm/SC-Development/CCC       cece37b [main]
/Users/steinhoferm/SC-Development/CCC-v1.0  138a565 (detached HEAD = v1.0.7)
```

**Uncommitted in v1.1 tree at end of session (will be in next commit, the SHP/tasklist commit):**
```
 M client/app/globals.css           <- SMB lock since 2026-05-06; carry forward
 M docs/handoff/CCC_recovery.md     <- legacy auto-tracked; pending git rm --cached
 M docs/handoff/CCC_shp.md          <- this file (will be staged + committed)
 M docs/v1.1/CCC_tasklist_v1.1.0.md <- 05a ticked + GO line
?? .env.bak.stage05a                <- pre-edit backup; left on disk, not committed
```

A second `Stage 05a GO 2026-05-09 + tasklist ticks + SHP` commit closes the session.

---

## Architecture & File Map

### v1.1 (this directory: `/Users/steinhoferm/SC-Development/CCC`)

| Area | File / Path | Purpose |
|---|---|---|
| **Backend (Express)** | | |
| Server entry | `server.js` | Routes, WS server, static `client/out/` mount, startup IIFEs (orphan-session cleanup), 30s usage broadcaster. **05a:** new `require('./src/auth')` (line 14), `app.use(sessionMiddleware)` (line 21), `app.use('/api', requireAuth-with-/v1-bypass)` (lines 23-27), `app.use('/api/v1', requireApiToken)` (line 31). |
| **Auth (NEW, 05a)** | `src/auth.js` | Exports `sessionMiddleware` (express-session + MySQLStore on `auth_sessions`, 24h cookie, httpOnly, sameSite=lax), `requireAuth` (session-based gate, 401 JSON when unauthenticated), `requireApiToken` (Bearer token gate against `CCC_API_TOKEN`). 62 lines. |
| DB layer | `src/db.js` | Lazy MariaDB pool, `query/queryOne/transaction` helpers |
| Project CRUD | `src/projects.js` | `getAllProjects` (auto-register check + TBM filter), `addProject`, `updateProject`, `removeProject`, `reorderProjects`, `addGroup`, `removeGroup`, `resolveProjectPath`, `renameProject` |
| Sessions (PTY) | `src/sessions.js` | `node-pty` lifecycle, `claudeStatus` parsing wired to parser. Exposes `createSession`, `destroySession`, `writeToSession`, etc. |
| Status parser (sacred) | `src/parser.js` | All Claude Code output -> 5 statuses |
| Version scanner | `src/versions.js` | Post-04b layout, defensive guard refuses `scanVersions(PROJECT_ROOT)` since 04b01 |
| Token usage | `src/usage.js` | Reads `~/.claude/projects/`, NOT PROJECT_ROOT |
| Migrations | `migrations/001_initial.sql`, `003_sessions_user_id_nullable.sql`, `004_group_name_nullable.sql`, `002_import.js` | |
| **Frontend (Next.js)** | | |
| Source root | `client/` | |
| Static export | `client/out/` (regenerated by `pnpm build` on Dev-Web) | |
| Pages | `client/app/page.tsx`, `client/app/settings/page.tsx`, `client/app/login/page.tsx`, `client/app/setup/page.tsx`, `client/app/import/page.tsx` | After 05a, the browser still loads these but every `/api/*` call from them returns 401. UI changes for login land in 05b. |
| Layout | `client/app/layout.tsx` | System fonts; no Google CDN; no @vercel/analytics |
| Globals | `client/app/globals.css` | System fonts + design tokens. **SMB-locked since 2026-05-06.** |
| App shell | `client/components/app-shell.tsx` | TabBar inside `<main>` (per 04e01). Header gains FolderInput Import button. |
| Treeview | `client/components/treeview-shell.tsx` | Active/Parked groups collapsible; TBM removed. |
| Dashboard | `client/components/dashboard-main.tsx` | Multi-terminal slot rendering with `display: flex/none` toggle. |
| Terminal | `client/components/terminal-panel.tsx` | xterm.js via dynamic import. |
| File reader | `client/components/file-reader-panel.tsx` | `marked` for `.md`, `<pre>` fallback |
| Settings | `client/components/settings-shell.tsx` | `GET/PUT /api/settings`, theme via `useTheme()` |
| API client | `client/lib/api.ts` | `deleteSession` etc. |
| WebSocket pool | `client/lib/ws.ts` | Per-project sockets keyed on `projectId`, `*`-wildcard subscription |
| Theme context | `client/components/theme-context.tsx` | `tokens(theme)` for design tokens. **No `bgPanel`** - use `bgCard`. |
| Build config | `client/next.config.mjs` | `output: 'export'`, `basePath: process.env.NEXT_PUBLIC_BASE_PATH \|\| ''` |
| **Apache (Dev-Web only, not in repo)** | | |
| Reverse proxy | `/etc/apache2/conf-available/CCC.conf` | `ProxyPass /CCC/ -> 127.0.0.1:3000/`, `ProxyPass /CCC/ws -> ws://127.0.0.1:3000/ws` |
| **Docs** | | |
| Stage kickoff (05a) | `docs/handoff/stage05a-prompt.md` | |
| Test file (05a) | `docs/v1.1/CCC_test_stage05a.md` | |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` | 05a ticked, GO line |
| v1.1 concept doc | `docs/v1.1/CCC_concept_v1.1.0.md` | |

### v1.0 (worktree: `/Users/steinhoferm/SC-Development/CCC-v1.0`)

- `package.json` v1.0.7. Vanilla `public/index.html` + `app.js` + `styles.css`. Mac launcher: `~/Desktop/CCC Starter.command`. Untouched this session.

---

## API Endpoint Inventory

**After 05a, all `/api/*` routes are gated by session auth** (return 401 until login lands). **All `/api/v1/*` routes are gated by bearer auth** (returns 401 unless `Authorization: Bearer <CCC_API_TOKEN>` matches). Static serving is untouched.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/projects` | All projects, grouped (DB-only). Auto-register + TBM filter. |
| POST | `/api/projects` | Add a project; forwards `parentId`+`evaluated`; `group` optional when `parentId` set |
| PUT | `/api/projects/:id` | Update fields (name, group, coreFiles, activeVersion, evaluated, type) |
| POST | `/api/projects/:id/rename` | Rename project + propagate to all `{name}_*` files + folder |
| DELETE | `/api/projects/:id` | Remove project (`?deleteFiles=true` also removes the directory) |
| PUT | `/api/projects-reorder` | Drag-drop reorder; entries carry `parentId` |
| GET | `/api/projects/:id/versions` | Version scan + test files (per-version `testFiles[]` with `stagePath`) |
| POST | `/api/projects/:id/versions` | Create new version folder |
| PUT | `/api/projects/:id/active-version` | Set active version |
| DELETE | `/api/projects/:id/versions/:version` | Delete a version (auto-fallback if active) |
| POST | `/api/projects/:id/versions/:version/complete` | Mark version completed (Git tag prompt) |
| POST | `/api/projects/:id/migrate-versions` | Migrate from flat to versioned layout (NOT 04d migration) |
| POST | `/api/projects/:id/evaluated` | Set the evaluated flag |
| GET | `/api/projects/:id/test-file-path` | Resolve a test file's actual path |
| GET | `/api/projects/:id/progress` | Tasklist scan: `{completed, total}` |
| GET | `/api/groups` | Lightweight group names list (excludes "To Be Migrated"). |
| POST | `/api/groups` | Add group |
| DELETE | `/api/groups/:name` | Remove group |
| GET | `/api/browse` | List subdirectories. Returns `{current, parent, directories: [name strings]}` |
| GET | `/api/settings` | Settings from DB |
| PUT | `/api/settings` | Save partial settings |
| GET | `/api/file/:projectId?filePath=...` | Read a project file |
| PUT | `/api/file/:projectId` | Write a project file (test-runner saves) |
| POST | `/api/open-editor` | Open external editor |
| POST | `/api/scaffold-project` | New project wizard scaffolding |
| POST | `/api/scaffold-import` | Import scaffolding (additive only) |
| GET | `/api/preflight` | Claude install check + version + referral URL |
| GET | `/api/version` | `{version, build}` |
| POST | `/api/scan-project` | User-triggered project-dir scan |
| POST | `/api/sessions/:projectId` | Start a Claude Code or shell session |
| GET | `/api/sessions/:projectId` | Session state for one project |
| GET | `/api/sessions` | All session state |
| DELETE | `/api/sessions/:projectId` | Kill the PTY for a project. Idempotent. |
| GET | `/api/usage` | Token usage snapshot |
| POST | `/api/import/start` | Import wizard - validates source/dest, INSERTs row, starts CC session in source folder |
| POST | `/api/import/kickoff` | Import wizard - writes the import prompt into the named session |
| `/api/v1/*` | (none yet) | **Bearer token gate established for Stage 09.** Returns 401 unless `Authorization: Bearer <CCC_API_TOKEN>` matches. |

WebSocket: `ws://host${BASE_PATH}/ws?projectId=<id>`. WS not gated by auth in 05a (Stage 05b will add WS auth gating tied to session cookie).

---

## Frontend State Model (v1.1)

Unchanged from prior SHP. After 05a the UI still loads but every `/api/*` call returns 401, so the dashboard renders empty until 05b ships login. No frontend code was touched in this stage.

---

## Database Snapshot (Dev-DB `ccc` on `kkh01vddb01`, MariaDB 10.11.14)

| Table | Rows | Key shape |
|---|---|---|
| `projects` | 30 (21 live + 9 leftover TBM rows filtered out by API) | `parent_id` / `lock_user_id` / `lock_session_id` nullable; `group_name` nullable post-04a01. |
| `project_core_files` | ~58 | (project_id, file_type) PK; CASCADE on project_id |
| `sessions` | varies | `user_id` nullable post-03d01 |
| `settings` | 6 | `project_root` = `/mnt/sc-development`; `file_patterns` JSON = v1.1 layout |
| `users` | 0 | (Stage 05c will populate via first-run admin setup) |
| **`auth_sessions`** | **0** | **05a (NEW).** `session_id varchar(128)`, `expires int unsigned`, `data mediumtext`. Auto-created by express-mysql-session on first connect (`createDatabaseTable: true`). 24h expiration, 15-min sweep. Stage 05b populates on successful login. |
| `project_integrations` | 0 | (Stage 09+) |

---

## Stage 05 Sub-Stage Progression

| Sub-stage | Title | Status | Closure commit |
|---|---|---|---|
| **05a** | **Auth Middleware** | **GO 2026-05-09** | **`cece37b`** + the SHP/tasklist follow-up |
| 05b | Login UI | NOT STARTED | - |
| 05c | User Management | NOT STARTED | - |

**Stage 05 main Go/NoGo gate** is NOT YET UP - opens after 05c.

---

## Key Technical Details

### `src/auth.js` (the file, in essence)

```javascript
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const sessionStore = new MySQLStore({
  host, port, user, password, database,
  clearExpired: true,
  checkExpirationInterval: 900000,   // 15 min
  expiration: 86400000,              // 24 h
  createDatabaseTable: true,
  schema: { tableName: 'auth_sessions' }
});

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { secure: false, httpOnly: true, sameSite: 'lax', maxAge: 86400000 }
});

// Stage 05b will set req.session.userId on POST /login
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
}

function requireApiToken(req, res, next) {
  const h = req.headers['authorization'];
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ ... });
  const token = h.slice(7);
  if (!process.env.CCC_API_TOKEN || token !== process.env.CCC_API_TOKEN) return res.status(401).json({ ... });
  return next();
}
```

### Mount order in `server.js` (lines 19-38)

```
app.use(express.json());
app.use(sessionMiddleware);
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/v1')) return next();
  return requireAuth(req, res, next);
});
app.use('/api/v1', requireApiToken);
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(express.static(path.join(__dirname, 'client', 'out')));
// ... routes start at line 117
```

### Restart on Dev-Web (recreated this session)

```bash
bash /tmp/ccc-restart.sh
```

The script: `pgrep -x node` then filters by `/proc/$p/cmdline` containing `server.js` (avoids self-kill), kills with TERM, sleeps 2 s, force-kills survivors, then `nohup node server.js > /tmp/ccc-server.log 2>&1 &` from `/mnt/sc-development/CCC`. Recreate inline if Dev-Web reboots wipe `/tmp` again.

### sshpass to Dev-Web (current pattern, unchanged)

```bash
SSH_USER=$(grep '^SSH-USER_ID=' /Users/steinhoferm/SC-Development/CCC/.env | cut -d= -f2-)
SSH_PASS=$(grep '^SSH_USER_Password=' /Users/steinhoferm/SC-Development/CCC/.env | cut -d= -f2-)
sshpass -p "$SSH_PASS" ssh \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=10 \
  -o PreferredAuthentications=password \
  -o PubkeyAuthentication=no \
  "$SSH_USER@kkh01vdweb01.mng.mcsfam.local" '<command>' < /dev/null
```

### DB query without mysql CLI (Dev-Web has only node + mariadb driver)

```bash
cd /mnt/sc-development/CCC
node -e "
require('dotenv').config();
const m = require('mariadb');
(async () => {
  const c = await m.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  console.log(await c.query('<SQL here>'));
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
"
```

---

## Dependencies (v1.1)

### Root `package.json`

| Package | Version | Notes |
|---|---|---|
| `express` | ^4.18 | HTTP server |
| `ws` | ^8.x | WebSocket server |
| `node-pty` | `1.2.0-beta.11` | **Required for Node.js v25 compatibility** |
| `mariadb` | ^3.x | DB driver |
| `dotenv` | ^16.x | Used with `{override: true}` everywhere |
| `marked` | ^11.x | Markdown render |
| **`express-session`** | **^1.19.0** | **05a (NEW).** Session middleware. |
| **`express-mysql-session`** | **^3.0.3** | **05a (NEW).** MariaDB-backed session store. |
| `playwright` / `playwright-core` | dev | repro tools |

### `client/package.json`

| Package | Version | Notes |
|---|---|---|
| `next` | 16.2.4 | Output: 'export' |
| `react` / `react-dom` | ^19 | |
| `@dnd-kit/core` | ^6.3.1 | |
| `@dnd-kit/sortable` | ^10.0.0 | |
| `@xterm/xterm`, `@xterm/addon-fit` | ^6.0, ^0.11 | UMD constructor: `new FitAddon.FitAddon()` |
| `lucide-react` | ^0.564.0 | Icons (chevrons, FolderInput, etc.) |
| `marked` | ^18.0.3 | Markdown render in client |

Build tooling: `pnpm` v10.33.3 (Dev-Web prereq).

---

## Known Gotchas (cumulative, post-05a)

1. **Auth lock is intentional after 05a.** Until 05b ships login, every `/api/*` returns 401. The dashboard appears empty in browser. This is expected.
2. **`/CCC/login` 301 is pre-existing.** Express `static` redirects to `/login/` (loses basePath); Apache only proxies `/CCC/...`; the actual file is at `/CCC/login.html`. Stage 05b will add a real `/login` page.
3. **`mysql` CLI is not on Dev-Web.** Use `node -e` against the `mariadb` driver. Snippet in Key Technical Details.
4. **`/etc/hosts` on Dev-Web maps the FQDN to `127.0.1.1`**, but Apache binds the SRV-LAN IP. Curl from Dev-Web to its own FQDN fails; use the Mac (DNS resolves correctly) or `127.0.0.1:3000` directly inside.
5. **`/tmp/ccc-restart.sh` is wiped on Dev-Web reboot.** Recreate from the snippet.
6. **`.env.bak.stage05a` not gitignored.** `.gitignore` only lists `.env`. Backup is left on Dev-Web disk for rollback; not committed (selective `git add` excluded it). If recurring, add `.env.bak*` to `.gitignore`.
7. **TabBar location matters.** Inside `<main>`, not above the sidebar+main split. Matches v1.0.
8. **04d migration code is gone.** Use `/import` for onboarding.
9. **9 leftover TBM rows in `projects` table.** Filtered from API. To clear: `DELETE FROM projects WHERE group_name = 'To Be Migrated'`.
10. **Auto-register fires on every `/api/projects` call.** Move to event-driven if list grows.
11. **Import button is in the AppHeader top-right** (not in the sidebar).
12. **Active/Parked group headers are clickable to collapse.** Per-group state in TreeviewShell. Not persisted across reloads.
13. `client/app/globals.css` SMB-locked since 2026-05-06.
14. `docs/handoff/CCC_recovery.md` legacy auto-tracked - regenerates mid-session. `git rm --cached` + `.gitignore` pending.
15. `.env` value quoting (gotcha from prior SHPs). `source .env` errors on `&&` lines.
16. v1.1 testing on Dev-Web only. v1.0 testing on Mac at `localhost:3000`.
17. Browser caching is sticky. **Cmd+Shift+R required** after every preview build / server restart with frontend changes.
18. Apache config not in repo - lives on Dev-Web only.
19. **GitHub push from CC works** via inline token URL (`.env GITHUB_TOKEN`).
20. `sshpass` to Dev-Web: `-o PreferredAuthentications=password -o PubkeyAuthentication=no` + stdin redirect from `/dev/null`.
21. `dotenv` default does NOT override existing `process.env`. All v1.1 env-loading entry points use `dotenv.config({ override: true })`. **Note for 05a:** `src/auth.js` does NOT call `dotenv.config()` - it's a module loaded after server.js has already configured dotenv.
22. `pkill -f "node server.js"` from an SSH bash shell self-kills the parent. Use `pgrep -x node` + `/proc/$p/cmdline` filter.
23. **API field shape is camelCase** (`subProjects`, `parentId`, etc.) since 04a.
24. **Field name on versions endpoint is `testFiles`, not `tests`.** Each entry includes `stagePath` (post-04b).
25. **Scanner regex matches `^${projectName}_test_stage\d+[a-z]*\d*\.md$`.**
26. `/api/projects/scan` does not exist. Real route: `POST /api/scan-project`.
27. **Workflow: commits go on completion + GO.** Two commits per sub-stage closure (code + GO/SHP/tasklist).
28. **v1.0 lives in a parallel worktree.** Two worktrees share `.git`. Independent `node_modules`, `.env`, `data/`.
29. **Frontend basePath (v1.1).** `BASE_PATH` derived at runtime from `window.location.pathname`.
30. **Proxmox VM `cpu: host` required** - Bun runtime JIT segfaults on `kvm64`.
31. **`pnpm` is a Dev-Web dependency** - `npm install -g pnpm` if missing.
32. **Phet's tick state is authoritative.** Once Phet ticks, treat it as Phet's call.
33. **Bug discovery protocol** (auto-memory `feedback_fix_bugs_on_the_spot.md`): bug blocks current task -> fix on the spot; bug spotted incidentally -> report to Phet, decide together.
34. **`express-mysql-session@^3.1.2` does not exist on npm.** Use `^3.0.0` (latest 3.x is `3.0.3`). Kickoff text is wrong if re-run from disk.
35. **One npm audit warning (high)** from the express-mysql-session install. Transitive. Run `npm audit` to see it; `npm audit fix` left for follow-up.

---

## Open Items / Carry-Forwards

- **Stage 05b - Login UI.** Next sub-stage. Add `/login` page (Next.js), `POST /login` route (validates against `users` table, sets `req.session.userId`), `POST /logout` (destroys session), wire the 401 frontend handler to redirect to `/login`. Cowork drafts kickoff prompt.
- **Stage 05c - User Management.** First-run detection (empty `users` table -> redirect to setup), `/setup` admin creation, settings panel "Manage Users" section, `POST /api/users`, `DELETE /api/users/:id`, bcrypt cost 12, `last_login` updates.
- **Stage 05 main Go/NoGo gate** opens once 05c ships.
- **`client/app/globals.css`** still SMB-locked. Verify and commit (or revert) once readable.
- **`docs/handoff/CCC_recovery.md`** legacy-tracked auto-regenerating file. `git rm --cached` + add to `.gitignore` pending.
- **`.env.bak.stage05a`** on Dev-Web - delete after Stage 05b ships clean, or `git add .gitignore` to add `.env.bak*` pattern.
- **High-severity npm audit warning.** Run `npm audit` to surface, then `npm audit fix` if safe.
- **`mysql` CLI on Dev-Web.** Optional: `apt-get install mariadb-client` to get `mariadb`/`mysql` for ad-hoc DB checks.
- **`.env` value quoting.** `source .env` errors on `&&` lines.
- **9 leftover TBM rows in DB.** Phet decides their fate.
- **Forgejo deploy via `deploy.sh`** (global rule, active 2026-04-25). Currently direct rsync/build on Dev-Web.
- **WS auth gating** belongs to Stage 05b (tie WS upgrade to session cookie).
- **v1.1.0 not yet tagged.** Tag at end of v1.1 cycle.

---

## Next Actions (next session)

1. **Stage 05b kickoff prompt drafting** in Cowork (login UI: page, POST /login, POST /logout, frontend 401 handler).
2. **CC executes Stage 05b** when kickoff lands at `docs/handoff/stage05b-prompt.md`.
3. **After 05b GO:** Stage 05c (user management, first-run admin setup, bcrypt).
4. **Optional cleanup any session:**
   - Re-read `client/app/globals.css` after SMB unlocks.
   - `docs/handoff/CCC_recovery.md` `git rm --cached` + `.gitignore`.
   - `.env.bak.stage05a` cleanup decision.
   - `npm audit fix` evaluation.

---

*End of SHP. Build 77 (`cece37b`) on Forgejo + GitHub. v1.1 Stage 05a GO 2026-05-09. App is intentionally locked until Stage 05b ships login. v1.0 worktree at `CCC-v1.0` untouched. Run `/continue` to resume.*
