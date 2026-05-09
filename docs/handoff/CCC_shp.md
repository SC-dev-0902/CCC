# Session Handover Pack - CCC
*Generated: 2026-05-09 (EOD, after Stage 05b GO) | Version: v1.1.0 (dev) + v1.0.7 (local) | Stage 05b complete | Build 79 (code commit `bfc8c1a`) | Forgejo + GitHub at next closure commit*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Two live versions, two environments:**
  - **v1.1.0 (dev):** runs on **Dev-Web only** at `http://kkh01vdweb01.mcsfam.local/CCC/` via Apache reverse proxy onto `127.0.0.1:3000`. MariaDB-backed, Next.js client. Active development line.
  - **v1.0.7 (production-stable, local):** runs on **Mac only** at `http://localhost:3000`. JSON-file-backed, vanilla `public/` frontend. Lives in a parallel git worktree at `/Users/steinhoferm/SC-Development/CCC-v1.0` pinned to tag `v1.0.7`. **v1.0 was never intended to run on Dev-Web.**
- **Active version in projects DB (v1.1):** `"1.1"`.
- **Stage:** Stage 05b **GO** 2026-05-09 (commit `bfc8c1a`). Second sub-stage of Stage 05 (Authentication & Multi-User).
- **App is now fully functional with auth.** Sign in at `/CCC/login` with `phet` / `test1234` (admin). Unauthenticated visits redirect to login; sessions persist 24h via MariaDB-backed cookies.

---

## What Was Done This Session (2026-05-09 - 05b portion)

### Stage 05b GO - Login UI

The kickoff (`docs/handoff/stage05b-prompt.md`) defined 8 tasks plus pre-flight. All shipped. 8/8 acceptance criteria pass; 30/30 test bullets ticked at `/tested`.

**Pre-flight (3 steps):**
- `npm install bcrypt` (`bcrypt@^6.0.0`). 3 packages added; existing high-severity audit warning persists (transitive).
- DB schema verified: `users` table has id, username, password_hash, role, created_at, last_login.
- `phet` admin seeded with bcrypt-hashed `test1234` (id `81f9709d-dfb0-4b65-b8f9-50768c2552e9`).

**Tasks 1-8:**
1. **Browser-route auth guard** in `server.js` (between cache-control and `express.static`). Exempts `/_next/`, `/api/`, `/login`, `/setup`, and common asset extensions. Redirects all other unauth pages.
2. **POST /login** in `server.js`: `bcrypt.compare` against `users.password_hash`; sets `req.session.userId` on success; identical 401 `{error:"invalid_credentials"}` for wrong-user vs wrong-pass; 400 same body for empty fields; 500 `server_error` on DB failure.
3. **POST /logout** in `server.js`: `req.session.destroy()`, returns `{ok:true}`.
4. **GET /api/me** in `server.js`: returns `{id, username, role}` for `req.session.userId` (route is automatically gated by the existing `/api/*` `requireAuth` mount); 404 if user row vanished.
5. **`auth-card.tsx` SignInCard rewired:** real fetch to `${basePath}/login`, form-wrapped (Enter-key submits), error state, loading state ("Signing in..." + disabled), removed `withError` prop and `wrongpass` default. `CreateAdminCard` and `Field` left untouched (05c).
6. **`app-shell.tsx` UserBadge:** file-private component below `AppShell`. On mount fetches `/api/me`; on 401 or network error, redirects to login. Sidebar wrapped in flex-col with TreeviewShell (flex-1) above and UserBadge (shrink-0, top border) below. LogOut icon button (lucide `LogOut size={14}`) POSTs `/logout` then redirects to `/CCC/login`.
7. **Build + restart:** `pnpm build` clean (7 routes prerendered, 0 TS errors); restart via `/tmp/ccc-restart.sh`. Server PID 3046 with new env (`NEXT_PUBLIC_BASE_PATH=/CCC`).
8. **Test file** `docs/v1.1/CCC_test_stage05b.md` written verbatim per kickoff. 30/30 ticked at `/tested`.

### Decisions made this session

1. **Option A redirect fix (Phet-approved deviation).** The kickoff Task 1 specified `res.redirect('/login')`, which 404s at Apache (only /CCC/* is proxied). After surfacing the contradiction (kickoff code vs AC #1 wording), Phet approved patching to `res.redirect((process.env.NEXT_PUBLIC_BASE_PATH || '') + '/login')` and adding an explicit `app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'client', 'out', 'login.html')))` before `express.static` to bypass the static 301 quirk. Both deviations applied to `server.js`.
2. **`NEXT_PUBLIC_BASE_PATH=/CCC` added to `.env`** (Dev-Web only, gitignored). Required for the Option A redirect to actually emit the basePath; without it, the env-var fallback returns `''` and reproduces the bug.
3. **Test file ticks:** 17 boxes auto-ticked by CLI verification (curl + DB queries from Mac); 13 ticked by Phet's browser/DOM check at `/tested`. Two items I'd flagged as failing/partial (B3 `/CCC/setup` 301, F4 logout-no-session 302) were ticked by Phet, accepted as out-of-scope/acceptable for 05b.

### Recovery operations carried out during the session

- `/tmp/ccc-restart.sh` was still present from 05a session (no Dev-Web reboot). Two restarts (initial 05b build + Option A patch).
- Stale `CCC_recovery.md` deleted at session start (older than SHP per `/continue` protocol). Auto-regenerated mid-session per gotcha #16; left in working tree, skipped in commit.

---

## Full Project Timeline (recent)

| Hash | Description | Date |
|---|---|---|
| `565363f` | Stage 04bN GO + 04b backend ticked | 2026-05-06 |
| `6e4a0ec` | Stage 04b01 complete - scan guard + dev-projects + grouped test files | 2026-05-06 |
| `68f13f9` | Stage 04c complete - parent/sub-project rendering + drag-drop | 2026-05-06 |
| `a15d208` | Stage 04c GO + tasklist + SHP | 2026-05-06 |
| `73786cc` | Stage 04d complete - First-Run Setup + Migration-via-Drag | 2026-05-06 |
| `f1a5860` | Stage 04d GO + tasklist + SHP | 2026-05-06 |
| `0a2c320` | Stage 04e + 04e01 complete - Multi-Session Tab Bar + Import Wizard | 2026-05-07 |
| `9ca3a93` | Stage 04e + 04e01 GO + tasklist + SHP | 2026-05-07 |
| `cece37b` | Stage 05a complete - Auth Middleware | 2026-05-09 |
| `7a73b8d` | Stage 05a GO + tasklist + SHP | 2026-05-09 |
| `bfc8c1a` | **Stage 05b complete - Login UI** | 2026-05-09 |
| (next) | Stage 05b GO + tasklist + SHP | 2026-05-09 |

Tags: `v1.0.0` -> `v1.0.7`. v1.1.0 not yet tagged (deferred to end of v1.1 cycle).

---

## Git State

**Forgejo (`origin`)**: `http://mcs-git.mcsfam.local:3000/Phet/CCC.git` - HEAD `bfc8c1a` (will be at SHP/tasklist commit after this /eod).
**GitHub (`github`)**: `https://github.com/SC-dev-0902/CCC.git` - HEAD `bfc8c1a` (will be at SHP/tasklist commit after this /eod).

**Worktrees:**
```
/Users/steinhoferm/SC-Development/CCC       bfc8c1a [main]
/Users/steinhoferm/SC-Development/CCC-v1.0  138a565 (detached HEAD = v1.0.7)
```

**Uncommitted in v1.1 tree at end of session (will be in next commit, the SHP/tasklist commit):**
```
 M client/app/globals.css           <- SMB lock since 2026-05-06; carry forward
 M docs/handoff/CCC_recovery.md     <- legacy auto-tracked; pending git rm --cached
 M docs/handoff/CCC_shp.md          <- this file (will be staged + committed)
 M docs/v1.1/CCC_tasklist_v1.1.0.md <- 05b ticked + GO line
?? .env.bak.stage05a                <- pre-edit 05a backup; left on disk, not committed
```

A second `Stage 05b GO 2026-05-09 + tasklist ticks + SHP` commit closes the session.

---

## Architecture & File Map

### v1.1 (this directory: `/Users/steinhoferm/SC-Development/CCC`)

| Area | File / Path | Purpose |
|---|---|---|
| **Backend (Express)** | | |
| Server entry | `server.js` | **05b changes:** `require('bcrypt')`. Browser-route auth guard between cache-control and `express.static` (uses `NEXT_PUBLIC_BASE_PATH` for redirect target). Explicit `app.get('/login', ...)` handler before `express.static` to bypass static 301 quirk. Auth route block: `POST /login`, `POST /logout`, `GET /api/me` placed before `/api/settings`. |
| Auth | `src/auth.js` | (05a) `sessionMiddleware` + `requireAuth` + `requireApiToken`. Unchanged in 05b. |
| DB layer | `src/db.js` | Lazy MariaDB pool, `query/queryOne/transaction` helpers |
| Project CRUD | `src/projects.js` | `getAllProjects`, `addProject`, `updateProject`, `removeProject`, `reorderProjects`, `addGroup`, `removeGroup`, `resolveProjectPath`, `renameProject` |
| Sessions (PTY) | `src/sessions.js` | `node-pty` lifecycle, `claudeStatus` parsing wired to parser |
| Status parser (sacred) | `src/parser.js` | All Claude Code output -> 5 statuses |
| Version scanner | `src/versions.js` | Defensive guard refuses `scanVersions(PROJECT_ROOT)` since 04b01 |
| Token usage | `src/usage.js` | Reads `~/.claude/projects/`, NOT PROJECT_ROOT |
| Migrations | `migrations/001_initial.sql`, `003_sessions_user_id_nullable.sql`, `004_group_name_nullable.sql`, `002_import.js` | |
| **Frontend (Next.js)** | | |
| Source root | `client/` | |
| Static export | `client/out/` (regenerated by `pnpm build` on Dev-Web) | |
| Pages | `client/app/page.tsx`, `client/app/settings/page.tsx`, `client/app/login/page.tsx`, `client/app/setup/page.tsx`, `client/app/import/page.tsx` | |
| Layout | `client/app/layout.tsx` | System fonts; no Google CDN; no @vercel/analytics |
| Globals | `client/app/globals.css` | System fonts + design tokens. **SMB-locked since 2026-05-06.** |
| App shell | `client/components/app-shell.tsx` | **05b changes:** `LogOut` icon imported; `API_BASE` imported from `@/lib/api`; `<aside>` wraps `TreeviewShell` (flex-1) above `UserBadge` (shrink-0, top border) in flex-col. New file-private `UserBadge` component at end. |
| Auth cards | `client/components/auth-card.tsx` | **05b changes:** `SignInCard` rewritten - real fetch POST to `${basePath}/login`, form-wrapped, error+loading state, "Signing in..." + disabled button. `withError` prop and `wrongpass` default removed. `CreateAdminCard` + `Field` unchanged (05c). |
| Treeview | `client/components/treeview-shell.tsx` | Active/Parked groups collapsible; TBM removed. |
| Dashboard | `client/components/dashboard-main.tsx` | Multi-terminal slot rendering with `display: flex/none` toggle. |
| Terminal | `client/components/terminal-panel.tsx` | xterm.js via dynamic import. |
| File reader | `client/components/file-reader-panel.tsx` | `marked` for `.md`, `<pre>` fallback |
| Settings | `client/components/settings-shell.tsx` | `GET/PUT /api/settings`, theme via `useTheme()` |
| API client | `client/lib/api.ts` | `API_BASE = process.env.NEXT_PUBLIC_BASE_PATH \|\| ""` |
| WebSocket pool | `client/lib/ws.ts` | Per-project sockets keyed on `projectId`, `*`-wildcard subscription |
| Theme context | `client/components/theme-context.tsx` | `tokens(theme)`. **No `bgPanel`** - use `bgCard`. |
| Build config | `client/next.config.mjs` | `output: 'export'`, `basePath: process.env.NEXT_PUBLIC_BASE_PATH \|\| ''` |
| **Apache (Dev-Web only, not in repo)** | | |
| Reverse proxy | `/etc/apache2/conf-available/CCC.conf` | `ProxyPass /CCC/ -> 127.0.0.1:3000/`, `ProxyPass /CCC/ws -> ws://127.0.0.1:3000/ws` |
| **Docs** | | |
| Stage kickoff (05b) | `docs/handoff/stage05b-prompt.md` | |
| Test file (05b) | `docs/v1.1/CCC_test_stage05b.md` | 30/30 ticked |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` | 05a + 05b ticked, GO lines |
| v1.1 concept doc | `docs/v1.1/CCC_concept_v1.1.0.md` | |

### v1.0 (worktree: `/Users/steinhoferm/SC-Development/CCC-v1.0`)

`package.json` v1.0.7. Vanilla `public/index.html` + `app.js` + `styles.css`. Mac launcher: `~/Desktop/CCC Starter.command`. Untouched this session.

---

## API Endpoint Inventory

**After 05b, the auth wall is functional:** unauthenticated browser visits to any non-exempt page redirect to `/CCC/login`. `/api/*` routes return 401 JSON until logged in. `/api/v1/*` (still empty, established for Stage 09) requires bearer token. `POST /login`, `POST /logout`, `/login` (page) are the only auth-bypassed paths. WS not yet gated.

**New in 05b (3 routes):**

| Method | Path | Purpose |
|---|---|---|
| POST | `/login` | bcrypt.compare against `users.password_hash`; sets `req.session.userId`; 200 `{ok:true}` on success; 401 `{error:"invalid_credentials"}` for wrong-user OR wrong-pass (identical body); 400 same body for empty fields. |
| POST | `/logout` | `req.session.destroy()`; returns `{ok:true}`. (No-session POST is intercepted by browser-route auth guard and 302s to /login - functionally idempotent, accepted at /tested.) |
| GET | `/api/me` | Returns `{id, username, role}` from `req.session.userId`; 404 if user row vanished. Gated by existing `/api/*` `requireAuth` (returns 401 unauth). |

(All other endpoints unchanged from 05a inventory.)

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
| POST | `/api/projects/:id/migrate-versions` | Migrate from flat to versioned layout |
| POST | `/api/projects/:id/evaluated` | Set the evaluated flag |
| GET | `/api/projects/:id/test-file-path` | Resolve a test file's actual path |
| GET | `/api/projects/:id/progress` | Tasklist scan: `{completed, total}` |
| GET | `/api/groups` | Lightweight group names list |
| POST | `/api/groups` | Add group |
| DELETE | `/api/groups/:name` | Remove group |
| GET | `/api/browse` | List subdirectories |
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
| POST | `/api/import/start` | Import wizard - validates source/dest, INSERTs row, starts CC session |
| POST | `/api/import/kickoff` | Import wizard - writes the import prompt into the session |
| `/api/v1/*` | (none yet) | Bearer token gate established for Stage 09. |

WebSocket: `ws://host${BASE_PATH}/ws?projectId=<id>`. WS not gated by auth (deferred from 05b).

---

## Frontend State Model (v1.1)

**New in 05b:** `UserBadge` (file-private in `app-shell.tsx`):
- `user: {id, username, role} | null` - fetched from `/api/me` on mount.
- `loading: boolean` - true until /api/me resolves; renders skeleton (28px tall, `bgInput`, opacity 0.5).
- On 401 or network error: `window.location.href = basePath + '/login'`.
- LogOut click: best-effort `POST /logout` then redirect to `/login` regardless of POST result.

`SignInCard` (`auth-card.tsx`):
- `username, password: string` - controlled inputs.
- `error: boolean` - true on non-200 or network error; renders "Invalid credentials. Please try again."
- `loading: boolean` - true during fetch; button shows "Signing in..." + disabled.
- `handleSubmit`: form `onSubmit` (Enter key works); fetches `${basePath}/login`; on 200 redirects to `${basePath}/`; on non-200 sets `error=true`.

Other state model unchanged from prior SHP.

---

## Database Snapshot (Dev-DB `ccc` on `kkh01vddb01`, MariaDB 10.11.14)

| Table | Rows | Key shape |
|---|---|---|
| `projects` | 30 (21 live + 9 leftover TBM rows filtered out by API) | `parent_id` / `lock_user_id` / `lock_session_id` nullable; `group_name` nullable post-04a01. |
| `project_core_files` | ~58 | (project_id, file_type) PK; CASCADE on project_id |
| `sessions` | varies | `user_id` nullable post-03d01 |
| `settings` | 6 | `project_root` = `/mnt/sc-development`; `file_patterns` JSON = v1.1 layout |
| **`users`** | **1** | **05b seeded** `phet` / role `admin` / id `81f9709d-dfb0-4b65-b8f9-50768c2552e9` / bcrypt-12 hash of `test1234`. Stage 05c will add admin UI. |
| `auth_sessions` | varies (typically 1+ per active session) | `session_id varchar(128)`, `expires int unsigned`, `data mediumtext`. **05b verified row lifecycle:** created on POST /login, destroyed immediately on POST /logout (count drops by 1). |
| `project_integrations` | 0 | (Stage 09+) |

---

## Stage 05 Sub-Stage Progression

| Sub-stage | Title | Status | Closure commit |
|---|---|---|---|
| 05a | Auth Middleware | GO 2026-05-09 | `cece37b` + `7a73b8d` |
| **05b** | **Login UI** | **GO 2026-05-09** | **`bfc8c1a`** + the SHP/tasklist follow-up |
| 05c | User Management | NOT STARTED | - |

**Stage 05 main Go/NoGo gate** is NOT YET UP - opens after 05c.

---

## Key Technical Details

### Browser-route auth guard + explicit /login handler (`server.js`)

```javascript
// Mount order: express.json -> sessionMiddleware -> /api guard -> /api/v1 guard
//   -> cache-control -> THIS BLOCK -> express.static -> routes

app.use((req, res, next) => {
  if (req.session && req.session.userId) return next();
  const p = req.path;
  if (
    p.startsWith('/_next/') ||
    p.startsWith('/api/') ||
    p === '/login' ||
    p === '/setup' ||
    /\.(js|css|json|ico|png|txt|map)$/.test(p)
  ) return next();
  return res.redirect((process.env.NEXT_PUBLIC_BASE_PATH || '') + '/login');
});

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'client', 'out', 'login.html')));
```

**Why explicit `/login` handler:** without it, `express.static` 301s `/login` -> `/login/`. The Location header is host-absolute; basePath is dropped at the browser; Apache 404s. The handler bypasses the static redirect entirely.

**Why basePath in redirect:** `process.env.NEXT_PUBLIC_BASE_PATH` is read at runtime on the server (loaded from `.env`). For Dev-Web it's `/CCC`, so redirects emit `Location: /CCC/login`.

### Auth routes (`server.js`, before `/api/settings`)

```javascript
app.post('/login', async (req, res) => {
  // username/password from req.body. queryOne users where username=?.
  // bcrypt.compare. On match: req.session.userId = user.id; 200 {ok:true}.
  // Identical 401 {error:"invalid_credentials"} for wrong user OR wrong pass.
  // 400 same body for empty fields. 500 server_error on DB failure.
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', async (req, res) => {
  // queryOne users by req.session.userId. Returns {id, username, role}.
  // 404 if user row vanished. Gated by /api/* requireAuth.
});
```

### Login flow (verified end-to-end)

```
unauth GET /CCC/      -> 302 /CCC/login
unauth GET /CCC/login -> 200 (login.html via explicit handler)
POST /CCC/login phet/test1234 -> 200 {ok:true} + Set-Cookie connect.sid
GET /CCC/api/me with cookie    -> 200 {id, username:"phet", role:"admin"}
POST /CCC/logout with cookie   -> 200 {ok:true} (req.session.destroy)
GET /CCC/ post-logout          -> 302 /CCC/login
```

### Restart on Dev-Web

```bash
bash /tmp/ccc-restart.sh
```

Recreate inline if Dev-Web reboots wipe `/tmp` again - snippet in 05a SHP.

### sshpass to Dev-Web (current pattern, unchanged)

Same as 05a - read `SSH-USER_ID` and `SSH_USER_Password` from `.env`, ssh with `-o PreferredAuthentications=password -o PubkeyAuthentication=no` + stdin from `/dev/null`.

### DB query without mysql CLI (Dev-Web has only node + mariadb driver)

Same `node -e` pattern as 05a SHP.

---

## Dependencies (v1.1)

### Root `package.json`

| Package | Version | Notes |
|---|---|---|
| `express` | ^4.18 | HTTP server |
| `ws` | ^8.x | WebSocket server |
| `node-pty` | `1.2.0-beta.11` | Required for Node.js v25 compatibility |
| `mariadb` | ^3.x | DB driver |
| `dotenv` | ^16.x | Used with `{override: true}` everywhere |
| `marked` | ^11.x | Markdown render |
| `express-session` | ^1.19.0 | (05a) Session middleware |
| `express-mysql-session` | ^3.0.3 | (05a) MariaDB-backed session store |
| **`bcrypt`** | **^6.0.0** | **05b (NEW).** Password hashing. Cost 12. |
| `playwright` / `playwright-core` | dev | repro tools |

### `client/package.json`

| Package | Version | Notes |
|---|---|---|
| `next` | 16.2.4 | Output: 'export' |
| `react` / `react-dom` | ^19 | |
| `@dnd-kit/core` | ^6.3.1 | |
| `@dnd-kit/sortable` | ^10.0.0 | |
| `@xterm/xterm`, `@xterm/addon-fit` | ^6.0, ^0.11 | UMD constructor: `new FitAddon.FitAddon()` |
| `lucide-react` | ^0.564.0 | Icons (chevrons, FolderInput, **LogOut** added 05b, etc.) |
| `marked` | ^18.0.3 | Markdown render in client |

Build tooling: `pnpm` v10.33.3 (Dev-Web prereq).

---

## Known Gotchas (cumulative, post-05b)

1. ~~Auth lock is intentional after 05a~~ - **Resolved by 05b.** Sign in at `/CCC/login` with `phet` / `test1234`.
2. **Express `static` 301 quirk for `/CCC/setup`.** Same shape as the `/CCC/login` bug 05b fixed: `express.static` 301s `/setup` -> `/setup/` (host-absolute, basePath dropped, Apache 404). Auth guard correctly exempts /setup but the path is currently unreachable. **Stage 05c will need an explicit `app.get('/setup', ...)` handler before `express.static`** (mirror the /login fix).
3. **`POST /logout` no-session path** triggers the browser-route auth guard (intercepts before route handler) and 302s to `/login` instead of returning `{ok:true}`. Functionally idempotent. One-line fix if you want a JSON response: add `p === '/logout'` to the guard exemption list. Phet ticked the test bullet at /tested anyway.
4. **`NEXT_PUBLIC_BASE_PATH=/CCC` MUST be in `.env` on Dev-Web.** Without it, `process.env.NEXT_PUBLIC_BASE_PATH || ''` falls back to empty and the redirect lands at host root `/login` -> Apache 404. `.env` is gitignored; this is a per-environment config requirement. Document in any future deploy guide.
5. `mysql` CLI is not on Dev-Web. Use `node -e` against the `mariadb` driver.
6. `/etc/hosts` on Dev-Web maps the FQDN to `127.0.1.1` but Apache binds the SRV-LAN IP. Curl from Dev-Web to its own FQDN fails; use the Mac (DNS resolves correctly) or `127.0.0.1:3000` directly inside.
7. `/tmp/ccc-restart.sh` is wiped on Dev-Web reboot.
8. `.env.bak.stage05a` not gitignored. Pre-edit backup left on Dev-Web disk; not committed (selective `git add` excluded by name).
9. TabBar location matters. Inside `<main>`, not above the sidebar+main split.
10. 04d migration code is gone. Use `/import` for onboarding.
11. 9 leftover TBM rows in `projects` table. Filtered from API.
12. Auto-register fires on every `/api/projects` call. Move to event-driven if list grows.
13. Import button is in the AppHeader top-right.
14. Active/Parked group headers are clickable to collapse (per-group state, not persisted).
15. `client/app/globals.css` SMB-locked since 2026-05-06.
16. `docs/handoff/CCC_recovery.md` legacy auto-tracked - regenerates mid-session. `git rm --cached` + `.gitignore` pending.
17. `.env` value quoting (gotcha from prior SHPs). `source .env` errors on `&&` lines.
18. v1.1 testing on Dev-Web only. v1.0 testing on Mac at `localhost:3000`.
19. Browser caching is sticky. **Cmd+Shift+R required** after every preview build / server restart with frontend changes.
20. Apache config not in repo - lives on Dev-Web only.
21. **GitHub push from CC works** via inline token URL (`.env GITHUB_TOKEN`).
22. `sshpass` to Dev-Web: `-o PreferredAuthentications=password -o PubkeyAuthentication=no` + stdin redirect from `/dev/null`.
23. `dotenv` default does NOT override existing `process.env`. All v1.1 env-loading entry points use `dotenv.config({ override: true })`. **`src/auth.js` does NOT call `dotenv.config()`** - module loaded after server.js has configured dotenv.
24. `pkill -f "node server.js"` from an SSH bash shell self-kills the parent. Use `pgrep -x node` + `/proc/$p/cmdline` filter.
25. API field shape is camelCase (`subProjects`, `parentId`, etc.) since 04a.
26. Field name on versions endpoint is `testFiles`, not `tests`. Each entry includes `stagePath` (post-04b).
27. Scanner regex matches `^${projectName}_test_stage\d+[a-z]*\d*\.md$`.
28. `/api/projects/scan` does not exist. Real route: `POST /api/scan-project`.
29. **Workflow: commits go on completion + GO.** Two commits per sub-stage closure (code + GO/SHP/tasklist).
30. v1.0 lives in a parallel worktree. Two worktrees share `.git`. Independent `node_modules`, `.env`, `data/`.
31. **Frontend basePath (v1.1).** Client-side `BASE_PATH` derived at runtime from `window.location.pathname`. **Server side** uses `process.env.NEXT_PUBLIC_BASE_PATH` (loaded from `.env`).
32. Proxmox VM `cpu: host` required - Bun runtime JIT segfaults on `kvm64`.
33. `pnpm` is a Dev-Web dependency - `npm install -g pnpm` if missing.
34. Phet's tick state is authoritative. Once Phet ticks, treat it as Phet's call.
35. Bug discovery protocol: bug blocks current task -> fix on the spot; bug spotted incidentally -> report to Phet, decide together.
36. `express-mysql-session@^3.1.2` does not exist on npm. Use `^3.0.0` (latest 3.x is `3.0.3`).
37. **One npm audit warning (high)** from the express-mysql-session install. Transitive. `npm audit fix` evaluation pending.
38. **05b kickoff Task 1 had an inherent contradiction:** specified `res.redirect('/login')` but ACs required `/CCC/login`. Fixed under "Option A" with Phet's approval. Future kickoffs that touch redirect targets should derive from `process.env.NEXT_PUBLIC_BASE_PATH` rather than hardcoding bare paths.
39. **`express.static` 301 on missing trailing slashes** is a recurring pattern. Any Next.js page route under basePath that the auth guard exempts (`/login`, `/setup`, future `/forgot-password`, etc.) needs an explicit `app.get(...)` handler before `express.static`, otherwise it 301s with the basePath dropped.

---

## Open Items / Carry-Forwards

- **Stage 05c - User Management.** First-run detection (empty `users` table -> redirect to setup), `/setup` admin creation (and the static-redirect fix per gotcha #2/#39), settings panel "Manage Users" section, `POST /api/users`, `DELETE /api/users/:id`, bcrypt cost 12, `last_login` updates.
- **Stage 05 main Go/NoGo gate** opens once 05c ships.
- `client/app/globals.css` still SMB-locked. Verify and commit (or revert) once readable.
- `docs/handoff/CCC_recovery.md` legacy-tracked auto-regenerating file. `git rm --cached` + add to `.gitignore` pending.
- `.env.bak.stage05a` on Dev-Web - delete after Stage 05b ships clean, or `git add .gitignore` to add `.env.bak*` pattern.
- High-severity npm audit warning (transitive, since 05a). Run `npm audit fix` if safe.
- `mysql` CLI on Dev-Web. Optional: `apt-get install mariadb-client`.
- `.env` value quoting. `source .env` errors on `&&` lines.
- 9 leftover TBM rows in DB. Phet decides their fate.
- **Forgejo deploy via `deploy.sh`** (global rule, active 2026-04-25). Currently direct rsync/build on Dev-Web.
- WS auth gating (deferred from 05b - tie WS upgrade to session cookie).
- v1.1.0 not yet tagged. Tag at end of v1.1 cycle.
- **Optional:** add `p === '/logout'` to the auth guard exemption list if you want `POST /logout` no-session to return `{ok:true}` instead of 302.

---

## Next Actions (next session)

1. **Stage 05c kickoff prompt drafting** in Cowork (User Management: first-run detect, /setup admin create, settings users panel, POST/DELETE /api/users, last_login updates).
2. **Within 05c kickoff:** include the `/setup` static-redirect fix mirroring 05b's `/login` handler.
3. **CC executes Stage 05c** when kickoff lands at `docs/handoff/stage05c-prompt.md`.
4. **After 05c GO:** Stage 05 main Go/NoGo gate.
5. **Optional cleanup any session:**
   - Re-read `client/app/globals.css` after SMB unlocks.
   - `docs/handoff/CCC_recovery.md` `git rm --cached` + `.gitignore`.
   - `.env.bak.stage05a` cleanup decision.
   - `npm audit fix` evaluation.

---

*End of SHP. Build 79 (`bfc8c1a`) on Forgejo + GitHub. v1.1 Stage 05b GO 2026-05-09. Auth wall live; phet/test1234 admin seeded; user badge in sidebar footer. v1.0 worktree at `CCC-v1.0` untouched. Run `/continue` to resume.*
