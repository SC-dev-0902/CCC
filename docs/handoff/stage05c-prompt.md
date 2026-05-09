# Stage 05c — User Management
*CCC v1.1 | Kickoff prompt | Created: 2026-05-09*

---

## Context

You are working on CCC v1.1 on Dev-Web (`kkh01vdweb01`). The app runs at `http://kkh01vdweb01.mcsfam.local/CCC/` via Apache reverse proxy to `127.0.0.1:3000`. Source lives at `/mnt/sc-development/CCC/`. All changes are made directly on Dev-Web via NFS mount — no SSH, no rsync, no deploy step.

Stage 05a shipped auth middleware (`src/auth.js`, session + requireAuth + requireApiToken). Stage 05b shipped login UI (POST /login, POST /logout, GET /api/me, SignInCard, UserBadge, browser-route auth guard). bcrypt is installed. A test user `phet/test1234` exists in the `users` table with role `admin`.

The `users` table schema:
```
id            CHAR(36) PK (UUID)
username      VARCHAR(100) NOT NULL UNIQUE
password_hash VARCHAR(255) NOT NULL
role          ENUM('admin', 'developer') DEFAULT 'developer'
created_at    DATETIME DEFAULT NOW()
last_login    DATETIME NULL
```

The `/setup` page currently serves the project-root wizard (Stage 04d). This stage repurposes it as a multi-step first-run wizard. The existing `ProjectRootCard` component is preserved and reused as Step 2.

Key mount order in `server.js` (lines 22-61):
- Line 22: `app.use(sessionMiddleware)`
- Lines 25-28: `app.use('/api', ...)` — requireAuth guard with `/v1` bypass
- Line 32: `app.use('/api/v1', requireApiToken)`
- Line 39-53: browser-route auth guard (async, redirects unauthenticated page requests to /login)
- Line 58: `app.get('/login', ...)` — explicit handler to bypass express.static 301 quirk
- Line 61: `app.use(express.static(...))`

---

## Autonomy Rule

The kickoff prompt is the approved plan. Execute all tasks without asking for permission. Do not ask "shall I proceed?", "can I start on Task N?", or any variation. Only stop if you encounter genuine ambiguity the prompt does not resolve — ask about that specific point, then continue.

---

## What NOT to Build

- No password change / reset flow (future stage)
- No per-user project permissions (v1.2+)
- No audit log (v1.2+)
- No self-registration flow
- No WS auth gating (belongs to Stage 05b carry-forward, not this stage)

---

## Tasks

### Task 1 — `requireAdmin` middleware in `src/auth.js`

Add a new exported function `requireAdmin(req, res, next)` to `src/auth.js`.

Behaviour:
- Queries `SELECT role FROM users WHERE id = ?` with `req.session.userId`
- If no row found or `role !== 'admin'`: return `res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required' })`
- Otherwise: call `next()`

Add `requireAdmin` to the `module.exports` at the bottom of `src/auth.js`.

---

### Task 2 — Unauthenticated setup endpoints

These two routes must bypass `requireAuth`. Update the `/api` auth guard (lines 25-28 in `server.js`) to add a bypass for setup paths:

```
if (req.path.startsWith('/v1')) return next();
if (req.path === '/setup-status' || req.path === '/setup') return next();
return requireAuth(req, res, next);
```

Then add the two route handlers. Place them near the login/logout routes (around line 315+), clearly marked as Stage 05c:

**`GET /api/setup-status`** (no auth)
- Queries `SELECT COUNT(*) AS cnt FROM users`
- Reads the `projectRoot` setting from DB (key: `project_root`)
- Returns `{ needsAdmin: bool, needsProjectRoot: bool }`
  - `needsAdmin`: `cnt === 0`
  - `needsProjectRoot`: projectRoot is null, empty string, or the setting row does not exist

**`POST /api/setup`** (no auth)
- Body: `{ username, password }`
- Validate: username non-empty, password >= 8 characters
- Reject with 409 if `SELECT COUNT(*) FROM users` > 0 (setup already done)
- Hash password with `bcrypt.hash(password, 12)`
- Insert: `INSERT INTO users (id, username, password_hash, role) VALUES (UUID(), ?, ?, 'admin')`
- Return `{ ok: true }` on success
- Return 400 with `{ error: 'VALIDATION', message: '...' }` on validation failure
- Return 500 with `{ error: 'server_error' }` on DB error

---

### Task 3 — Explicit `app.get('/setup')` handler

Add this line immediately after the existing `/login` explicit handler (after line 58), before `express.static`:

```javascript
app.get('/setup', (req, res) => res.sendFile(path.join(__dirname, 'client', 'out', 'setup.html')));
```

Same pattern as the `/login` fix from Stage 05b. Without this, `express.static` issues a 301 from `/setup` to `/setup/`, which loses the basePath when Apache follows the redirect.

---

### Task 4 — First-run redirect in browser-route auth guard

Update the browser-route auth guard (lines 39-53 in `server.js`) to redirect to `/setup` instead of `/login` when no users exist.

The guard is currently synchronous in its redirect logic. Make the redirect branch async:

```javascript
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

  // First-run check: if no users exist, redirect to /setup instead of /login
  try {
    const row = await db.queryOne('SELECT COUNT(*) AS cnt FROM users');
    if (row && row.cnt === 0) {
      return res.redirect((process.env.NEXT_PUBLIC_BASE_PATH || '') + '/setup');
    }
  } catch (e) {
    // DB unavailable - fall through to /login redirect
  }
  return res.redirect((process.env.NEXT_PUBLIC_BASE_PATH || '') + '/login');
});
```

`db` is already required at the top of `server.js`. No new imports needed.

---

### Task 5 — Update `last_login` on successful login

In the `POST /login` route (around line 315), immediately after `req.session.userId = user.id`, add:

```javascript
await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
```

The existing login handler is already `async`, so no wrapping changes needed.

---

### Task 6 — User management API routes

Import `requireAdmin` at the top of `server.js` where `requireAuth` and `requireApiToken` are already destructured:

```javascript
const { sessionMiddleware, requireAuth, requireApiToken, requireAdmin } = require('./src/auth');
```

Add the following three routes near the other auth routes (after `/api/me`), clearly marked as Stage 05c:

**`GET /api/users`** — list all users (admin only)
- Middleware: `requireAdmin`
- Query: `SELECT id, username, role, created_at, last_login FROM users ORDER BY created_at ASC`
- Returns array of user objects (no `password_hash`)

**`POST /api/users`** — create user (admin only)
- Middleware: `requireAdmin`
- Body: `{ username, password, role }`
- Validate: username non-empty, password >= 8 chars, role must be `'admin'` or `'developer'`
- Reject 409 if username already exists (catch duplicate key error from MariaDB, errno 1062)
- Hash with `bcrypt.hash(password, 12)`
- Insert: `INSERT INTO users (id, username, password_hash, role) VALUES (UUID(), ?, ?, ?)`
- Return created user: `{ id, username, role, created_at }` (no password_hash)

**`DELETE /api/users/:id`** — delete user (admin only)
- Middleware: `requireAdmin`
- Block self-delete: if `req.params.id === req.session.userId`, return 400 `{ error: 'SELF_DELETE', message: 'Cannot delete your own account' }`
- Delete: `DELETE FROM users WHERE id = ?`
- If no row deleted: return 404 `{ error: 'NOT_FOUND' }`
- Return `{ ok: true }` on success

---

### Task 7 — Frontend: `/setup` page rewrite (SetupWizard)

File: `client/app/setup/page.tsx`

Rewrite this file. The existing `ProjectRootCard` component and its logic (browse, save, state) must be preserved verbatim and used as Step 2 of the wizard. The new outer structure is a `SetupWizard` component.

**SetupWizard behaviour:**
1. On mount: fetch `GET /api/setup-status` (no auth required, this page is public)
2. While loading: show a minimal loading state (spinner or "Checking..." text)
3. Based on result:
   - `needsAdmin === true`: render `AdminCreationCard` (step 1)
   - `needsAdmin === false && needsProjectRoot === true`: render `ProjectRootCard` (step 2)
   - Both false: `router.push('/login')` (setup complete, go to login)
4. After `AdminCreationCard` succeeds: re-fetch `/api/setup-status` and advance (render ProjectRootCard if needsProjectRoot, else redirect to `/login`)
5. State: `type Step = 'loading' | 'admin' | 'project-root' | 'done'`

**`AdminCreationCard` component:**
- Fields: username (text input), password (password input), confirm password (password input)
- Submit button: "Create Admin Account"
- Client-side validation before submit: username non-empty, password >= 8 chars, passwords match
- On submit: `POST /api/setup` with `{ username, password }`
- Loading state on button during submit
- Error display: server errors shown below the form (use the error message from the response body)
- On success: call the `onDone` callback passed as a prop
- Style: match the existing `SignInCard` style from `client/components/auth-card.tsx` (same card width, border, padding, input style, button style, no bubbly corners)

**Page shell** (header + footer): keep the same shell as the current setup page. Header text: "Claude Command Center - Setup". Footer text varies by step:
- Admin step: "Create your admin account. You can add developer accounts later under Settings."
- Project root step: "Set this once. You can change it later under Settings." (unchanged from current)

The `BASE_PATH` derivation for fetch calls: use `API_BASE` from `@/lib/api` (same as every other component).

---

### Task 8 — Frontend: Settings `UserManagementPanel` wire-up

File: `client/components/settings-shell.tsx`

**A. Fetch current user in `SettingsShell`**

Add state: `const [currentUser, setCurrentUser] = useState<{ id: string; username: string; role: string } | null>(null)`

On mount (new `useEffect`): fetch `GET /api/me` and set `currentUser`. On error: leave null (non-admin fallback).

**B. Hide "User Management" from non-admins**

Change `SECTIONS` from a static const to a derived value:

```typescript
const sections = currentUser?.role === 'admin'
  ? (["General", "Integrations", "User Management", "Migration Tool"] as const)
  : (["General", "Integrations", "Migration Tool"] as const)
```

Update the nav render and section content render to use `sections` instead of `SECTIONS`. If the user navigates away from User Management (e.g., role changes), reset `section` to `"General"`.

Pass `currentUser` to `UserManagementPanel` as a prop: `<UserManagementPanel theme={theme} currentUser={currentUser} />`

**C. Wire `UserManagementPanel`**

Replace the dummy-data placeholder with real API calls.

Props: `{ theme, currentUser: { id, username, role } | null }`

State:
- `users`: fetched list from `GET /api/users`
- `loading`: boolean
- `error`: string | null
- `addForm`: `{ username: string; password: string; role: 'admin' | 'developer' }` (default role: 'developer')
- `addError`: string | null
- `addBusy`: boolean
- `deleteBusy`: `string | null` (stores the id being deleted)

On mount: fetch `GET /api/users`, populate `users`.

**User list:** table-style layout consistent with the rest of Settings. Columns: username, role badge, last login (formatted as date or "Never"), delete button. Delete button: disabled and visually muted if `u.id === currentUser?.id`. On click: `DELETE /api/users/:id`, then re-fetch the user list. No confirmation dialog — the button is labeled "Remove" and is deliberately compact.

**Add user form:** shown below the user list. Fields: username (text), password (password), role (select: Developer / Admin). Submit button: "Add User". On submit: `POST /api/users`, then re-fetch the list and clear the form. Inline error below the form on failure.

**Remove the `USERS` import** from `@/lib/dummy-data` once it's no longer used in this file. If `INTEGRATIONS` or `MIGRATION_FAMILIES` are still used elsewhere in the file, keep those imports.

**Style rules:** no new design patterns. Match the existing input, button, and row styles already present in `GeneralPanel` and the rest of `settings-shell.tsx`. Sharp corners. No bubbly UI.

---

### Task 9 — Generate test file

Generate `docs/v1.1/CCC_test_stage05c.md`.

Test areas to cover:

**Setup flow:**
- [ ] `GET /api/setup-status` returns correct `needsAdmin` and `needsProjectRoot` values
- [ ] `POST /api/setup` creates admin when users table is empty
- [ ] `POST /api/setup` rejects with 409 when users already exist
- [ ] `POST /api/setup` rejects with 400 if password < 8 chars or username empty
- [ ] `/setup` page loads without auth (no 401/redirect)
- [ ] `/setup` shows AdminCreationCard when users table is empty
- [ ] `/setup` shows ProjectRootCard when admin exists but projectRoot not set
- [ ] `/setup` redirects to `/login` when both admin and projectRoot are set
- [ ] After creating admin via setup form, page advances to ProjectRootCard (or redirects)
- [ ] Unauthenticated page request redirects to `/setup` when users table is empty
- [ ] Unauthenticated page request redirects to `/login` when users exist

**Auth & login:**
- [ ] `last_login` is updated in the `users` table after successful login (verify via `GET /api/users`)

**requireAdmin:**
- [ ] Admin user can access `GET /api/users`
- [ ] Developer user gets 403 from `GET /api/users`
- [ ] Unauthenticated request to `GET /api/users` gets 401 (not 403)

**User management API:**
- [ ] `GET /api/users` returns users without `password_hash`
- [ ] `POST /api/users` creates a developer account (verify role and bcrypt hash in DB)
- [ ] `POST /api/users` rejects duplicate username with 409
- [ ] `DELETE /api/users/:id` removes a user (verify row gone from DB)
- [ ] `DELETE /api/users/:id` with own ID returns 400 SELF_DELETE
- [ ] `DELETE /api/users/:id` with unknown ID returns 404

**Settings UI:**
- [ ] Admin sees "User Management" in Settings nav
- [ ] Developer role does not see "User Management" in Settings nav
- [ ] User list loads and displays username, role, last login
- [ ] Add user form: creates user and updates list
- [ ] Delete button is disabled/muted for current user row
- [ ] Delete button removes user and updates list

---

## Acceptance Criteria

1. A fresh install (empty users table) redirects unauthenticated page requests to `/setup`, not `/login`
2. `/setup` AdminCreationCard creates the first admin; page then advances to ProjectRootCard if projectRoot is unset, or redirects to `/login` if already set
3. `/setup` ProjectRootCard behaviour is unchanged from Stage 04d
4. After admin creation, `POST /api/setup` returns 409 on any subsequent call (prevents re-setup)
5. `last_login` is populated in the DB after every successful login
6. Admin can create and delete developer accounts via `POST /api/users` and `DELETE /api/users/:id`
7. Developers cannot access user management API endpoints (403) or see the Settings section
8. Self-delete is blocked at API level (400 SELF_DELETE) and UI level (button disabled)
9. All passwords stored as bcrypt hashes with cost 12
10. Test file generated at `docs/v1.1/CCC_test_stage05c.md`

---

## After Completion

Report what was built and present the acceptance criteria results. Then wait for Phet to test.

Do not commit. Do not push. Phet runs `/tested` after reviewing the test file, then `/go` after the Go/NoGo gate.

---

*End of Stage 05c kickoff prompt*
