# Session Handover Pack - CCC
*Generated: 2026-05-09 (EOD, after Stage 05c GO) | Version: v1.1.0 (dev) + v1.0.7 (local) | Stage 05c complete | Build 81 (code commit `184c345`) | GO/SHP commit follows*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Two live versions, two environments:**
  - **v1.1.0 (dev):** runs on **Dev-Web only** at `http://kkh01vdweb01.mcsfam.local/CCC/` via Apache reverse proxy onto `127.0.0.1:3000`. MariaDB-backed, Next.js client. Active development line.
  - **v1.0.7 (production-stable, local):** runs on **Mac only** at `http://localhost:3000`. JSON-file-backed, vanilla `public/` frontend. Lives in a parallel git worktree at `/Users/steinhoferm/SC-Development/CCC-v1.0` pinned to tag `v1.0.7`. **v1.0 was never intended to run on Dev-Web.**
- **Active version in projects DB (v1.1):** `"1.1"`.
- **Stage:** Stage 05c **GO** 2026-05-09 (commit `184c345`). Third (and final) sub-stage of Stage 05 (Authentication & Multi-User). **Stage 05 main Go/NoGo gate is NOW OPEN.**
- **App is now fully functional with first-run setup, login, and admin-only user management.** First visit on a fresh install → `/CCC/setup` (admin creation + project root). Returning users → `/CCC/login`. Admin sees Settings → "User Management" with live add/remove + role badge + last_login.

---

## What Was Done This Session (2026-05-09 - 05c portion)

### Stage 05c GO - User Management

The kickoff (`docs/handoff/stage05c-prompt.md`) defined 9 tasks. All shipped. 10/10 acceptance criteria pass; 51/51 test bullets ticked at `/tested`.

**Tasks 1-9:**
1. **`requireAdmin` middleware** in `src/auth.js`. Queries `users.role` for `req.session.userId`; 403 unless `role === 'admin'`; 500 on DB error. Mounted AFTER `requireAuth` (the /api guard) so unauth requests still 401 first.
2. **Auth bypass for setup endpoints.** `/api` guard now bypasses `/setup-status` and `/setup` paths in addition to `/v1/*`.
3. **Public `GET /api/setup-status`** — returns `{ needsAdmin, needsProjectRoot }` based on `COUNT(*) FROM users` and the `project_root` settings row.
4. **Public `POST /api/setup`** — one-shot admin creation. Validates username non-empty + password >= 8 chars. 409 ALREADY_SETUP if `users` count > 0. bcrypt cost 12.
5. **Explicit `app.get('/setup', ...)` handler** before `express.static` (mirrors the 05b `/login` fix per gotcha #2/#39).
6. **Browser-route auth guard async + first-run branch.** When users table empty, redirects unauth visitors to `/CCC/setup` instead of `/CCC/login`. DB outage falls through to `/login`.
7. **`last_login` stamping** on successful `POST /login`. Best-effort; failure doesn't block login.
8. **User management API** — `GET /api/users` (list, no `password_hash`), `POST /api/users` (1062 → 409 DUPLICATE, validation 400, bcrypt cost 12), `DELETE /api/users/:id` (self-delete → 400 SELF_DELETE, unknown → 404). All admin-only via `requireAdmin`.
9. **Frontend `/setup` rewrite.** Multi-step `SetupWizard` fetches `/api/setup-status` on mount. Renders new `AdminCreationCard` (Step 1) or preserved-verbatim `ProjectRootCard` (Step 2). After admin create, refetches status and advances. Redirects to `/login` once both flags clear.
10. **Frontend Settings UI.** `SettingsShell` fetches `/api/me` on mount, derives sections list from role. `UserManagementPanel` rewritten with live API calls — table view (username + role badge + last login), Add User form (username/password/role select), self-row Remove disabled+muted. `USERS` import dropped from `dummy-data`.
11. **Test file** `docs/v1.1/CCC_test_stage05c.md` — 51 bullets across 13 sections + CLI test evidence block. All ticked at `/tested`.

### Two fixes applied during the test cycle (post-build, pre-GO)

1. **`client/.env` created with `NEXT_PUBLIC_BASE_PATH=/CCC`.** First `pnpm build` dropped the basePath because Next.js auto-loads `.env` from the **Next project directory** (`client/`), not the project root. Built HTML referenced `/_next/...` instead of `/CCC/_next/...`, so all assets 404'd through Apache → "totally disturbed" page. Now auto-loaded on every build. Gitignored via the existing `.env` pattern.
2. **Field label contrast bumped.** `textMuted` (#4A5568) on `bgCard` (#1B2021) was ~2.4:1 — fails WCAG AA. Switched local `Field` components in `setup/page.tsx`, `auth-card.tsx`, and `settings-shell.tsx` plus the UserManagementPanel column header row from `textMuted` → `textSecondary` (#A0AEC0, ~7.5:1 — passes AA).

### Decisions made this session

1. **Last-admin guard NOT implemented.** Out of scope per kickoff. Open hole: a second admin could delete the only other admin and lock everyone out. Logged as carry-forward.
2. **`client/.env` over baking `/CCC` into `next.config.mjs` default.** Per-environment config, gitignored, mirrors root `.env` pattern. Standard Next.js convention. Rejected baking `/CCC` as default because v1.0 (Mac, no basePath) and v1.1 (Dev-Web, `/CCC`) live in separate worktrees and shouldn't make assumptions about each other's mount path.
3. **Test file accepted with all 51 bullets ticked.** 4 of those required DB surgery (empty `users` table to walk first-run live) — Phet wiped and walked the flow end-to-end before GO.

---

## Full Project Timeline (recent)

| Hash | Description | Date |
|---|---|---|
| `0a2c320` | Stage 04e + 04e01 complete - Multi-Session Tab Bar + Import Wizard | 2026-05-07 |
| `9ca3a93` | Stage 04e + 04e01 GO + tasklist + SHP | 2026-05-07 |
| `cece37b` | Stage 05a complete - Auth Middleware | 2026-05-09 |
| `7a73b8d` | Stage 05a GO + tasklist + SHP | 2026-05-09 |
| `bfc8c1a` | Stage 05b complete - Login UI | 2026-05-09 |
| `3bc81b1` | Stage 05b GO + tasklist + SHP | 2026-05-09 |
| `184c345` | **Stage 05c complete - User Management** | 2026-05-09 |
| (next) | Stage 05c GO + tasklist + SHP | 2026-05-09 |

Tags: `v1.0.0` -> `v1.0.7`. v1.1.0 not yet tagged (deferred to end of v1.1 cycle).

---

## Git State

**Forgejo (`origin`)**: `http://mcs-git.mcsfam.local:3000/Phet/CCC.git` - HEAD `184c345` (will be at SHP/tasklist commit after this /eod).
**GitHub (`github`)**: `https://github.com/SC-dev-0902/CCC.git` - HEAD `184c345` (will be at SHP/tasklist commit after this /eod).

**Worktrees:**
```
/Users/steinhoferm/SC-Development/CCC       184c345 [main]
/Users/steinhoferm/SC-Development/CCC-v1.0  138a565 (detached HEAD = v1.0.7)
```

**Uncommitted in v1.1 tree at end of session (will be in next commit, the SHP/tasklist commit):**
```
 M client/app/globals.css           <- SMB lock since 2026-05-06; carry forward
 M docs/handoff/CCC_recovery.md     <- legacy auto-tracked; pending git rm --cached
 M docs/handoff/CCC_shp.md          <- this file (will be staged + committed)
 M docs/v1.1/CCC_tasklist_v1.1.0.md <- 05c ticked + GO line
?? .env.bak.stage05a                <- pre-edit 05a backup; left on disk, not committed
?? docs/handoff/stage05c-prompt.md  <- kickoff prompt; will be staged + committed
?? docs/v1.1/CCC_test_stage05c.md   <- test file (51/51 ticked); will be staged + committed
```

A second `Stage 05c GO 2026-05-09 + tasklist ticks + SHP` commit closes the session.

---

## Architecture & File Map

### v1.1 (this directory: `/Users/steinhoferm/SC-Development/CCC`)

| Area | File / Path | Purpose |
|---|---|---|
| **Backend (Express)** | | |
| Server entry | `server.js` | **05c changes:** `requireAdmin` destructured from `./src/auth`. `/api` guard bypasses `/setup-status` + `/setup`. Browser-route auth guard now async with first-run branch (empty users → `/setup`). Explicit `app.get('/setup', ...)` handler. `last_login` stamped after `req.session.userId = user.id` in POST /login. New routes: `GET /api/setup-status`, `POST /api/setup`, `GET/POST/DELETE /api/users`. |
| Auth | `src/auth.js` | **05c changes:** `require('./db')` added; new `requireAdmin` middleware exported. |
| DB layer | `src/db.js` | Lazy MariaDB pool, `query/queryOne/transaction` helpers. Unchanged. |
| Project CRUD | `src/projects.js` | Unchanged. |
| Sessions (PTY) | `src/sessions.js` | Unchanged. |
| Status parser (sacred) | `src/parser.js` | Unchanged. |
| Version scanner | `src/versions.js` | Unchanged. |
| Token usage | `src/usage.js` | Unchanged. |
| Migrations | `migrations/001_initial.sql`, `003_*`, `004_*`, `002_import.js` | Unchanged. |
| **Frontend (Next.js)** | | |
| Source root | `client/` | |
| Build env | `client/.env` (gitignored) | **05c (NEW):** `NEXT_PUBLIC_BASE_PATH=/CCC` so `pnpm build` injects basePath without inline env. |
| Static export | `client/out/` (regenerated by `pnpm build`) | |
| Pages | `client/app/page.tsx`, `settings/page.tsx`, `login/page.tsx`, `setup/page.tsx`, `import/page.tsx` | |
| Setup page | `client/app/setup/page.tsx` | **05c:** Rewritten as `SetupWizard` (`type Step = 'loading' \| 'admin' \| 'project-root' \| 'done'`). New `AdminCreationCard` component (controlled inputs, client-side validation, error+loading state, POST /api/setup). `ProjectRootCard` preserved verbatim from Stage 04d. Local `Field` component uses `textSecondary`. |
| Layout | `client/app/layout.tsx` | Unchanged. |
| Globals | `client/app/globals.css` | **SMB-locked since 2026-05-06.** Unchanged in 05c. |
| App shell | `client/components/app-shell.tsx` | Unchanged. |
| Auth cards | `client/components/auth-card.tsx` | **05c:** `Field` label color bumped to `textSecondary` for WCAG AA. SignInCard logic unchanged. CreateAdminCard component still present (unused — superseded by `AdminCreationCard` in setup/page.tsx). |
| Settings shell | `client/components/settings-shell.tsx` | **05c:** Sections list now derived from `currentUser.role` (admins only see "User Management"). Fetches `/api/me` on mount. New `UserManagementPanel` with live API calls. Field label color bumped to `textSecondary`. UserManagementPanel column header row bumped to `textSecondary`. `USERS` import dropped. |
| Treeview | `client/components/treeview-shell.tsx` | Unchanged. |
| Dashboard | `client/components/dashboard-main.tsx` | Unchanged. |
| Terminal | `client/components/terminal-panel.tsx` | Unchanged. |
| File reader | `client/components/file-reader-panel.tsx` | Unchanged. |
| API client | `client/lib/api.ts` | Unchanged. |
| WebSocket pool | `client/lib/ws.ts` | Unchanged. |
| Theme context | `client/components/theme-context.tsx` | Unchanged. Tokens: `textMuted: #4A5568` (dark), `textSecondary: #A0AEC0` (dark). 05c label fixes use textSecondary instead of textMuted. |
| Build config | `client/next.config.mjs` | `output: 'export'`, `basePath: process.env.NEXT_PUBLIC_BASE_PATH \|\| ''` — now reliably picks up basePath from `client/.env`. |
| **Apache (Dev-Web only, not in repo)** | | |
| Reverse proxy | `/etc/apache2/conf-available/CCC.conf` | `ProxyPass /CCC/ -> 127.0.0.1:3000/`, `ProxyPass /CCC/ws -> ws://127.0.0.1:3000/ws` |
| **Docs** | | |
| Stage kickoff (05c) | `docs/handoff/stage05c-prompt.md` | |
| Test file (05c) | `docs/v1.1/CCC_test_stage05c.md` | 51/51 ticked |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` | 05a + 05b + 05c ticked, GO lines |
| v1.1 concept doc | `docs/v1.1/CCC_concept_v1.1.0.md` | |

### v1.0 (worktree: `/Users/steinhoferm/SC-Development/CCC-v1.0`)

`package.json` v1.0.7. Vanilla `public/index.html` + `app.js` + `styles.css`. Mac launcher: `~/Desktop/CCC Starter.command`. Untouched this session.

---

## API Endpoint Inventory

**After 05c, the auth + first-run + user-management surface is complete:**
- Empty users table → unauth visit redirects to `/CCC/setup` (instead of `/CCC/login`)
- `POST /api/setup` (one-shot, public) creates first admin
- After admin exists, redirects to `/CCC/login`
- Admin can manage users via Settings panel
- Developers cannot access user management endpoints (403) or see the Settings tab
- WS still NOT gated by auth (carry-forward from 05b)

**New in 05c (5 routes):**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/setup-status` | Public. Returns `{ needsAdmin, needsProjectRoot }` from `COUNT(*) FROM users` and `settings.project_root`. |
| POST | `/api/setup` | Public, one-shot. Body `{ username, password }`. Creates first admin (bcrypt cost 12). 409 if users already exist. 400 on validation failure. |
| GET | `/api/users` | Admin-only. Returns list of users without `password_hash`. |
| POST | `/api/users` | Admin-only. Body `{ username, password, role }`. Creates user. 409 on duplicate (errno 1062). |
| DELETE | `/api/users/:id` | Admin-only. 400 SELF_DELETE if `id === req.session.userId`. 404 if no row. |

(All 05a + 05b endpoints unchanged. Full inventory in 05b SHP.)

---

## Frontend State Model (v1.1)

**New in 05c:**

`SetupWizard` (in `client/app/setup/page.tsx`):
- `step: 'loading' | 'admin' | 'project-root' | 'done'` — drives which card renders.
- `statusError: string | null` — surface for /api/setup-status fetch failure.
- `refreshStatus()` — fetches /api/setup-status; sets `step` based on `needsAdmin` then `needsProjectRoot`. If both false, `router.push('/login')`.
- `AdminCreationCard` props `{ theme, onDone }` — local form state for `username, password, confirm, error, loading`. On 200 from POST /api/setup → calls `onDone()` which triggers `refreshStatus()`.

`SettingsShell`:
- `currentUser: { id, username, role } | null` — fetched from `/api/me` on mount.
- `sections: ReadonlyArray<Section>` — derived from `currentUser?.role === 'admin'`. Includes "User Management" only for admins.
- Effect resets `section` to "General" if current section drops out of `sections` (e.g., role changes).

`UserManagementPanel`:
- `users: ApiUser[]` — fetched from `GET /api/users`.
- `loading, error` — list-load state.
- `addUsername, addPassword, addRole, addError, addBusy` — Add User form state.
- `deleteBusy: string | null` — id of the user currently being deleted.
- `currentUser` prop — drives self-row Remove button disabled state.

Other state model unchanged from prior SHP.

---

## Database Snapshot (Dev-DB `ccc` on `kkh01vddb01`, MariaDB 10.11.14)

| Table | Rows | Key shape |
|---|---|---|
| `projects` | 30 (21 live + 9 leftover TBM rows filtered out by API) | unchanged |
| `project_core_files` | ~58 | unchanged |
| `sessions` | varies | unchanged |
| `settings` | 6 | `project_root` set; `file_patterns` JSON = v1.1 layout |
| **`users`** | **varies (≥1 admin)** | **05c verified end-to-end:** create via POST /api/setup (first admin) and POST /api/users (subsequent users); delete via DELETE /api/users/:id; `last_login` stamped on every POST /login. Phet wiped + walked the first-run flow live during /tested. |
| `auth_sessions` | varies | unchanged from 05b |
| `project_integrations` | 0 | (Stage 09+) |

---

## Stage 05 Sub-Stage Progression

| Sub-stage | Title | Status | Closure commit |
|---|---|---|---|
| 05a | Auth Middleware | GO 2026-05-09 | `cece37b` + `7a73b8d` |
| 05b | Login UI | GO 2026-05-09 | `bfc8c1a` + `3bc81b1` |
| **05c** | **User Management** | **GO 2026-05-09** | **`184c345`** + the SHP/tasklist follow-up |

**Stage 05 main Go/NoGo gate is NOW OPEN.** Phet decides Go/NoGo for Stage 05 as a whole; gate question: "Does the login gate work? Can an admin create developer accounts? Do sessions persist correctly? Do unauthenticated requests redirect to login?" Answer (subject to Phet's call): all true.

---

## Key Technical Details

### Browser-route auth guard with first-run branch (`server.js`)

```javascript
// Mount order: express.json -> sessionMiddleware -> /api guard (with /setup-status + /setup bypass)
//   -> /api/v1 token guard -> cache-control -> THIS BLOCK -> express.static -> routes

app.use(async (req, res, next) => {
  if (req.session && req.session.userId) return next();
  const p = req.path;
  if (
    p.startsWith('/_next/') ||
    p.startsWith('/api/') ||
    p === '/login' ||
    p === '/setup' ||
    /\.(js|css|json|ico|png|txt|map)$/.test(p)
  ) return next();

  // Stage 05c: first-run branch
  try {
    const row = await db.queryOne('SELECT COUNT(*) AS cnt FROM users');
    if (row && Number(row.cnt) === 0) {
      return res.redirect((process.env.NEXT_PUBLIC_BASE_PATH || '') + '/setup');
    }
  } catch (e) { /* fall through to /login on DB error */ }
  return res.redirect((process.env.NEXT_PUBLIC_BASE_PATH || '') + '/login');
});

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'client', 'out', 'login.html')));
app.get('/setup', (req, res) => res.sendFile(path.join(__dirname, 'client', 'out', 'setup.html')));
```

### `requireAdmin` (`src/auth.js`)

```javascript
const db = require('./db');

async function requireAdmin(req, res, next) {
  try {
    const row = await db.queryOne(
      'SELECT role FROM users WHERE id = ?',
      [req.session && req.session.userId]
    );
    if (!row || row.role !== 'admin') {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required' });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}
```

Mounted **after** `requireAuth` so unauth requests still get 401 first.

### POST /api/setup (one-shot, public)

```javascript
app.post('/api/setup', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !String(username).trim() || !password || String(password).length < 8) {
    return res.status(400).json({ error: 'VALIDATION', ... });
  }
  const row = await db.queryOne('SELECT COUNT(*) AS cnt FROM users');
  if (row && Number(row.cnt) > 0) {
    return res.status(409).json({ error: 'ALREADY_SETUP', ... });
  }
  const hash = await bcrypt.hash(password, 12);
  await db.query('INSERT INTO users (id, username, password_hash, role) VALUES (UUID(), ?, ?, ?)',
                 [String(username).trim(), hash, 'admin']);
  return res.json({ ok: true });
});
```

### Build flow (Dev-Web, post-05c)

```bash
# Build (now picks up NEXT_PUBLIC_BASE_PATH from client/.env automatically)
cd /mnt/sc-development/CCC/client && pnpm build

# Restart
bash /tmp/ccc-restart.sh
```

`/tmp/ccc-restart.sh` survives across sessions (created during 05a) but is wiped on Dev-Web reboot. Re-create inline if needed (snippet in 05a SHP).

### Login flow (verified end-to-end including first-run)

```
empty users + unauth GET /CCC/   -> 302 /CCC/setup        (NEW in 05c)
GET /CCC/setup                    -> 200 (setup.html via explicit handler)
POST /CCC/api/setup phet/...      -> 200 {ok:true}        (creates admin + projectRoot still empty)
                                 -> wizard refetches /api/setup-status -> step: 'project-root'
ProjectRootCard save              -> /api/settings PUT, then router.push('/')
/CCC/                             -> 302 /CCC/login (now that admin exists)
POST /CCC/login                   -> 200, session cookie set, last_login stamped
/CCC/api/me                       -> 200 {id, username, role}
Settings -> User Management       -> GET /api/users (admin-only)
Add User                          -> POST /api/users
Remove User                       -> DELETE /api/users/:id (self-row blocked)
```

### sshpass to Dev-Web (current pattern, unchanged)

Read `SSH-USER_ID` and `SSH_USER_Password` from `.env` (gotcha #17 — `source .env` errors on `&&` lines, use `grep '^KEY=' .env | cut -d= -f2-`). SSH with `-o PreferredAuthentications=password -o PubkeyAuthentication=no` + stdin from `/dev/null`.

### DB query without mysql CLI (Dev-Web has only node + mariadb driver)

`cd /mnt/sc-development/CCC && node -e "..."` so the require resolves the project's `mariadb` install. `node -e` from `/root/` fails with MODULE_NOT_FOUND.

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
| `bcrypt` | ^6.0.0 | (05b) Password hashing. Cost 12. |
| `playwright` / `playwright-core` | dev | repro tools |

(No new root deps in 05c.)

### `client/package.json`

(No new client deps in 05c. Lucide already provides all icons used.)

| Package | Version | Notes |
|---|---|---|
| `next` | 16.2.4 | Output: 'export'; basePath from `client/.env` (NEW in 05c) |
| `react` / `react-dom` | ^19 | |
| `@dnd-kit/core` / `@dnd-kit/sortable` | ^6.3.1 / ^10.0.0 | |
| `@xterm/xterm`, `@xterm/addon-fit` | ^6.0, ^0.11 | UMD constructor: `new FitAddon.FitAddon()` |
| `lucide-react` | ^0.564.0 | Icons (LogOut from 05b, etc.) |
| `marked` | ^18.0.3 | Markdown render in client |

Build tooling: `pnpm` v10.33.3 (Dev-Web prereq).

---

## Known Gotchas (cumulative, post-05c)

1. **Auth wall is fully live** with first-run setup, login, logout, and admin-only user management. Sign in at `/CCC/login`. First-run visitors land at `/CCC/setup`.
2. **`express.static` 301 quirk for trailing slash redirects.** Any Next.js page route under basePath that the auth guard exempts (`/login`, `/setup`, future `/forgot-password`, etc.) needs an explicit `app.get(...)` handler before `express.static`, otherwise 301 drops the basePath at Apache. **05b fixed `/login`. 05c fixed `/setup`.** Pattern is established; replicate for any future exempt page.
3. **`POST /logout` no-session path** triggers the browser-route auth guard (intercepts before route handler) and 302s to `/login` instead of returning `{ok:true}`. Functionally idempotent. One-line fix if you want a JSON response: add `p === '/logout'` to the guard exemption list. Phet ticked the test bullet anyway in 05b.
4. **`NEXT_PUBLIC_BASE_PATH=/CCC` MUST be in BOTH `.env` files on Dev-Web:**
   - **Root `.env`** — used at runtime by `server.js` (loaded via `dotenv.config()`). Drives the redirect target in the auth guard.
   - **`client/.env`** (NEW in 05c) — used at build time by `next.config.mjs`. Drives the basePath baked into the static export.
   Both are gitignored. Without `client/.env`, `pnpm build` produces a broken bundle that ignores Apache's `/CCC/` prefix. Without root `.env`, redirects emit bare `/login` and Apache 404s.
5. `mysql` CLI is not on Dev-Web. Use `node -e` against the `mariadb` driver, AND run from `/mnt/sc-development/CCC/` (not `/root/`) so the require resolves.
6. `/etc/hosts` on Dev-Web maps the FQDN to `127.0.1.1` but Apache binds the SRV-LAN IP. Curl from Dev-Web to its own FQDN fails; use the Mac (DNS resolves correctly) or `127.0.0.1:3000` directly inside.
7. `/tmp/ccc-restart.sh` is wiped on Dev-Web reboot.
8. `.env.bak.stage05a` not gitignored. Pre-edit backup left on Dev-Web disk; not committed.
9. TabBar location matters. Inside `<main>`, not above the sidebar+main split.
10. 04d migration code is gone. Use `/import` for onboarding.
11. 9 leftover TBM rows in `projects` table. Filtered from API.
12. Auto-register fires on every `/api/projects` call. Move to event-driven if list grows.
13. Import button is in the AppHeader top-right.
14. Active/Parked group headers are clickable to collapse (per-group state, not persisted).
15. `client/app/globals.css` SMB-locked since 2026-05-06.
16. `docs/handoff/CCC_recovery.md` legacy auto-tracked - regenerates mid-session. `git rm --cached` + `.gitignore` pending.
17. `.env` value quoting. `source .env` errors on `&&` lines. Use `grep '^KEY=' .env | cut -d= -f2-` to read individual values reliably.
18. v1.1 testing on Dev-Web only. v1.0 testing on Mac at `localhost:3000`.
19. Browser caching is sticky. **Cmd+Shift+R required** after every preview build / server restart with frontend changes.
20. Apache config not in repo - lives on Dev-Web only.
21. **GitHub push from CC works** via inline token URL (`.env GITHUB_TOKEN`).
22. `sshpass` to Dev-Web: `-o PreferredAuthentications=password -o PubkeyAuthentication=no` + stdin redirect from `/dev/null`.
23. `dotenv` default does NOT override existing `process.env`. All v1.1 env-loading entry points use `dotenv.config({ override: true })`. **`src/auth.js` does NOT call `dotenv.config()`** - module loaded after server.js has configured dotenv.
24. `pkill -f "node server.js"` from an SSH bash shell self-kills the parent. Use `pgrep -x node` + `/proc/$p/cmdline` filter (encoded in `/tmp/ccc-restart.sh`).
25. API field shape is camelCase (`subProjects`, `parentId`, etc.) since 04a.
26. Field name on versions endpoint is `testFiles`, not `tests`. Each entry includes `stagePath` (post-04b).
27. Scanner regex matches `^${projectName}_test_stage\d+[a-z]*\d*\.md$`.
28. `/api/projects/scan` does not exist. Real route: `POST /api/scan-project`.
29. **Workflow: commits go on completion + GO.** Two commits per sub-stage closure (code + GO/SHP/tasklist).
30. v1.0 lives in a parallel worktree. Two worktrees share `.git`. Independent `node_modules`, `.env`, `data/`.
31. **Frontend basePath (v1.1).** Client-side `BASE_PATH` derived at runtime from `window.location.pathname` (in `app-shell.tsx`). **Server-side** uses `process.env.NEXT_PUBLIC_BASE_PATH` (loaded from root `.env`). **Build-side** uses `process.env.NEXT_PUBLIC_BASE_PATH` (loaded from `client/.env` — see gotcha #4).
32. Proxmox VM `cpu: host` required - Bun runtime JIT segfaults on `kvm64`.
33. `pnpm` is a Dev-Web dependency - `npm install -g pnpm` if missing.
34. Phet's tick state is authoritative. Once Phet ticks, treat it as Phet's call.
35. Bug discovery protocol: bug blocks current task -> fix on the spot; bug spotted incidentally -> report to Phet, decide together.
36. `express-mysql-session@^3.1.2` does not exist on npm. Use `^3.0.0` (latest 3.x is `3.0.3`).
37. **One npm audit warning (high)** from the express-mysql-session install. Transitive. `npm audit fix` evaluation pending.
38. **Hardcoded basePath in kickoff redirects is a smell.** 05b fixed at runtime via `process.env.NEXT_PUBLIC_BASE_PATH`. Future kickoffs touching redirect targets should derive from the env var rather than hardcoding bare paths.
39. **WCAG AA contrast for small text labels.** Token `textMuted` (#4A5568) on `bgCard` / `bgSidebar` (both #1B2021 in dark) is ~2.4:1 — fails AA. Use `textSecondary` (#A0AEC0, ~7.5:1) for any small uppercase label, table column header, or other readable text element on the dark card backgrounds. 05c fixed three Field components and one column header row. Additional spots may exist in older code; audit if reported.
40. **Last-admin guard NOT implemented.** A second admin can delete the only other admin and lock everyone out. Out of scope for 05c. One-line check (count admins where role='admin', refuse if dropping to zero) if you want it. AdminCreationCard's CreateAdminCard component in `auth-card.tsx` is now orphaned (superseded by AdminCreationCard inside `setup/page.tsx`). Could be removed; left in place to avoid scope creep.

---

## Open Items / Carry-Forwards

- **Stage 05 main Go/NoGo gate is NOW OPEN.** Phet's separate decision. Question: "Does the login gate work? Can an admin create developer accounts? Do sessions persist correctly? Do unauthenticated requests redirect to login?"
- **Stage 06 — CC Session Model (Option C + Locking).** Sub-stages 06a (Parent-Root Session Spawn), 06b (SHP Chain), 06c (Locking UI). Cowork drafts 06a kickoff prompt next.
- **Last-admin guard** (gotcha #40). One-line API check. Decide before or during a future stage.
- **WS auth gating** (deferred from 05b - tie WS upgrade to session cookie).
- **Orphaned `CreateAdminCard` in `auth-card.tsx`** — superseded by `AdminCreationCard` in `setup/page.tsx`. Remove or leave; not blocking.
- **`client/app/globals.css`** SMB lock - verify and commit (or revert) once readable.
- **`docs/handoff/CCC_recovery.md`** legacy-tracked auto-regenerating file. `git rm --cached` + add to `.gitignore` pending.
- **`.env.bak.stage05a`** on Dev-Web - delete or `.gitignore` `.env.bak*`.
- **High-severity npm audit warning** (transitive, since 05a). Run `npm audit fix` if safe.
- `mysql` CLI on Dev-Web. Optional: `apt-get install mariadb-client`.
- **Forgejo deploy via `deploy.sh`** (global rule, active 2026-04-25). Currently direct rsync/build on Dev-Web.
- v1.1.0 not yet tagged. Tag at end of v1.1 cycle.
- **Optional:** add `p === '/logout'` to the auth guard exemption list if you want `POST /logout` no-session to return `{ok:true}` instead of 302.

---

## Next Actions (next session)

1. **Stage 05 main Go/NoGo gate.** Phet decides. Memory + tasklist + SHP all align with GO. Cowork can verify on demand.
2. **Stage 06a kickoff prompt drafting** in Cowork (Parent-Root Session Spawn — CC sessions for sub-projects spawn PTY at parent project root, lock sub-project via `lock_user_id`/`lock_session_id` on `projects` row).
3. **CC executes Stage 06a** when kickoff lands at `docs/handoff/stage06a-prompt.md`.
4. **Optional cleanup any session:**
   - Re-read `client/app/globals.css` after SMB unlocks.
   - `docs/handoff/CCC_recovery.md` `git rm --cached` + `.gitignore`.
   - `.env.bak.stage05a` cleanup decision.
   - `npm audit fix` evaluation.
   - Last-admin guard if Phet wants it.
   - Orphaned `CreateAdminCard` removal.

---

*End of SHP. Build 81 (`184c345`) on Forgejo + GitHub. v1.1 Stage 05c GO 2026-05-09. First-run setup live; admin-only user management live; `last_login` stamped per login; bcrypt cost 12 throughout. Stage 05 main gate open. v1.0 worktree at `CCC-v1.0` untouched. Run `/continue` to resume.*
