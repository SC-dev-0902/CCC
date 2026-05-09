# Stage 05b — Login UI
*CCC v1.1 | Auth & Multi-User | Sub-stage 05b of 05*

---

## Context

Stage 05a shipped `src/auth.js` with session middleware, `requireAuth` (guards `/api/*`, returns 401 JSON), and `requireApiToken` (guards `/api/v1/*`). The `auth_sessions` table exists in MariaDB. The `users` table exists but is empty. The `/login` Next.js page exists with a non-functional `SignInCard` component (pure React state, no actual form submission).

This stage wires the login system end-to-end: POST /login, POST /logout, browser-route redirect guard, and the user badge in the sidebar footer.

---

## What NOT to Build

- No user creation UI (Stage 05c)
- No first-run admin setup (Stage 05c)
- No Settings panel user management (Stage 05c)
- No project locking badge (Stage 06c)
- No API-level 401 intercept in the frontend fetch client (keep the scope tight)

---

## Pre-flight

Run the following steps before writing any code. These are verification and setup steps.

**Step 1 - Install bcrypt:**
```
cd /mnt/sc-development/CCC && npm install bcrypt
```

**Step 2 - Verify users table schema:**
```
node -e "require('dotenv').config({ path: './.env', override: true }); const mariadb = require('mariadb'); const pool = mariadb.createPool({ host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT)||3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME }); pool.getConnection().then(c => c.query('DESCRIBE users')).then(r => { console.log(JSON.stringify(r, null, 2)); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });"
```

Expected columns: `id`, `username`, `password_hash`, `role`, `created_at`, `last_login`.

**Step 3 - Insert test admin user (phet / test1234):**
```
node -e "require('dotenv').config({ path: './.env', override: true }); const bcrypt = require('bcrypt'); const mariadb = require('mariadb'); const { randomUUID } = require('crypto'); const pool = mariadb.createPool({ host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT)||3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME }); (async () => { const hash = await bcrypt.hash('test1234', 12); const conn = await pool.getConnection(); await conn.query('INSERT IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)', [randomUUID(), 'phet', hash, 'admin']); console.log('Test user ready: phet / test1234'); conn.end(); process.exit(0); })().catch(e => { console.error(e.message); process.exit(1); });"
```

If the user already exists `INSERT IGNORE` skips silently - that is correct.

---

## Project Structure

Working directory on Dev-Web: `/mnt/sc-development/CCC`

Files to modify:
- `server.js` — browser-route auth guard + POST /login + POST /logout + GET /api/me
- `client/components/auth-card.tsx` — wire SignInCard with real fetch
- `client/components/app-shell.tsx` — add UserBadge component + sidebar footer

Files to create:
- `docs/v1.1/CCC_test_stage05b.md` — test checklist

Do not modify any other files.

---

## Task 1 — server.js: browser-route auth guard

Add the following middleware to `server.js` directly before the `app.use(express.static(...))` line.

The guard intercepts unauthenticated browser-facing requests and redirects to `/login`. It must NOT intercept:
- `/_next/` — Next.js static assets
- `/api/` — already handled by requireAuth (returns 401 JSON)
- `/login` — the login page itself (would cause a redirect loop)
- `/setup` — first-run setup page (Stage 05c; must remain reachable)
- Static file extensions: `.js`, `.css`, `.json`, `.ico`, `.png`, `.txt`, `.map`

```javascript
// Browser-route auth guard (Stage 05b)
// Redirects unauthenticated page requests to /login.
// Assets and explicitly excluded paths pass through unchanged.
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
  return res.redirect('/login');
});
```

Place this block immediately before the `app.use(express.static(...))` line. Do not move the express.static call.

---

## Task 2 — server.js: POST /login

Add the following route to `server.js`. Place it in the routes section, grouped near the auth-related logic (after the session/auth middleware block, before the settings routes).

- Read `username` and `password` from `req.body` (JSON body - express.json() is already mounted)
- Look up the user in `users` table by username
- Use `bcrypt.compare` to validate the password against `password_hash`
- On success: set `req.session.userId = user.id`, return `200 { ok: true }`
- On failure (user not found OR password mismatch): return `401 { error: 'invalid_credentials' }` — the same response for both cases; never reveal which field is wrong
- On missing body fields: return `400 { error: 'invalid_credentials' }` — same generic message

Add `const bcrypt = require('bcrypt');` and the `db` require at the top of `server.js` with the other requires. `db` is already required (`const db = require('./src/db')`). Check before adding a duplicate.

```javascript
// POST /login (Stage 05b)
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'invalid_credentials' });
  }
  try {
    const user = await db.queryOne(
      'SELECT id, password_hash FROM users WHERE username = ?',
      [username]
    );
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'invalid_credentials' });
    req.session.userId = user.id;
    return res.json({ ok: true });
  } catch (err) {
    console.error('[login] error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});
```

---

## Task 3 — server.js: POST /logout

Add immediately after the `/login` route.

```javascript
// POST /logout (Stage 05b)
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('[logout] session destroy error:', err.message);
    return res.json({ ok: true });
  });
});
```

---

## Task 4 — server.js: GET /api/me

Add in the API routes section. This route IS protected by `requireAuth` (all `/api/*` routes are guarded). Returns the current user's id, username, and role.

```javascript
// GET /api/me (Stage 05b) — returns current session user
app.get('/api/me', async (req, res) => {
  try {
    const user = await db.queryOne(
      'SELECT id, username, role FROM users WHERE id = ?',
      [req.session.userId]
    );
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
```

---

## Task 5 — client/components/auth-card.tsx: wire SignInCard

Replace the existing `SignInCard` function body with a real login implementation. Keep the visual structure (`Field`, button, error message, footer line) identical - change only the behaviour.

Changes:
- Remove the `withError` prop and the `setSubmitted` dev state entirely
- Remove the hardcoded `"wrongpass"` default on the password field
- Add `error: boolean` and `loading: boolean` state
- Wrap the form in `<form onSubmit={handleSubmit}>`
- `handleSubmit` does a JSON `fetch` to `POST ${process.env.NEXT_PUBLIC_BASE_PATH || ''}/login`
- On 200: `window.location.href = (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/'`
- On non-200 OR network error: set `error = true`
- Submit button: shows "Signing in..." text when `loading` is true; disabled when loading
- Error message: "Invalid credentials. Please try again." (same text as the existing scaffold, no change to the visual component - just wire it to real `error` state)
- Keep the `CreateAdminCard` component unchanged — it is used in Stage 05c

The `Field` helper component at the bottom of the file is unchanged.

---

## Task 6 — client/components/app-shell.tsx: UserBadge + sidebar footer

Add a `UserBadge` component inside `app-shell.tsx` (file-private, not exported). Place the component definition near the bottom of the file, above or below the `Diode` component.

The `UserBadge`:
- On mount, fetches `GET ${API_BASE}/api/me`
- On 401 or network error, redirects to login: `window.location.href = (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/login'`
- While loading: renders a single-line skeleton (a `div` with subdued background, matching the sidebar palette)
- Once loaded: renders a row with username (left, `font-medium text-[12px]`), role label (left, subdued, `text-[10px] uppercase tracking-wider`), and a `LogOut` icon button (right, `size={14}`)
- On LogOut click: `POST ${API_BASE}/logout`, then `window.location.href = (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/login'`
- Use `t.bgSidebar`, `t.border`, `t.textPrimary`, `t.textMuted`, `t.accent` for colours — no hardcoded hex

Wire the `UserBadge` into the `<aside>` in `AppShell`. The sidebar currently renders just `<TreeviewShell ...>`. Wrap both in a `flex flex-col h-full` div, put `<TreeviewShell>` in a `flex-1 overflow-hidden` wrapper, and put `<UserBadge>` below it with `shrink-0` and a top border (`style={{ borderTop: '1px solid ${t.border}' }}`). The badge area should be `px-3 py-2.5`.

The full sidebar structure:
```
<aside style={{ width: sidebarWidth }}>
  <div className="flex flex-col h-full overflow-hidden">
    <div className="flex-1 overflow-hidden">
      <TreeviewShell ... />
    </div>
    <div className="shrink-0 px-3 py-2.5" style={{ borderTop: `1px solid ${t.border}` }}>
      <UserBadge />
    </div>
  </div>
</aside>
```

The `useTheme` hook and `tokens` are already imported in `app-shell.tsx`. `API_BASE` is already imported from `client/lib/api.ts`.

---

## Task 7 — Build + restart

```
cd /mnt/sc-development/CCC/client && NEXT_PUBLIC_BASE_PATH=/CCC pnpm build
bash /tmp/ccc-restart.sh
```

If `ccc-restart.sh` is missing, recreate it:
```
node -e "require('dotenv').config({ path: '/mnt/sc-development/CCC/.env', override: true }); const { execSync } = require('child_process'); try { const pids = execSync('pgrep -a node').toString().split('\n').filter(l => l.includes('server.js')); pids.forEach(l => { const pid = l.trim().split(' ')[0]; if (pid) { try { process.kill(parseInt(pid), 'SIGTERM'); } catch {} } }); } catch {} setTimeout(() => { const s = require('child_process').spawn('node', ['/mnt/sc-development/CCC/server.js'], { detached: true, stdio: 'ignore', env: process.env }); s.unref(); console.log('Server started, PID', s.pid); process.exit(0); }, 1500);"
```

---

## Task 8 — Generate test file

Create `docs/v1.1/CCC_test_stage05b.md` with the following content exactly:

```markdown
# CCC Test Checklist - Stage 05b: Login UI
*Generated after Stage 05b build. Phet reviews, ticks, and comments.*

---

## Pre-flight Verification

- [ ] `npm install bcrypt` completed without errors
- [ ] `require('bcrypt')` resolves cleanly (no missing native bindings)
- [ ] Test user `phet` exists in `users` table with role `admin`
- [ ] `GET /api/me` returns 401 with no session (curl or browser devtools)

---

## Browser-Route Auth Guard

- [ ] Opening `http://kkh01vdweb01.mcsfam.local/CCC/` with no session redirects to `/CCC/login`
- [ ] `/CCC/login` loads without redirect loop
- [ ] `/CCC/setup` loads without redirect loop (no session required)
- [ ] `/_next/` static assets load without redirect (check Network tab)

---

## Login Form

- [ ] Login page renders correctly (username field, password field, Sign in button)
- [ ] Correct credentials (`phet` / `test1234`) log in and land on the dashboard
- [ ] Wrong password shows "Invalid credentials. Please try again." - no hint which field is wrong
- [ ] Wrong username shows the same generic error message
- [ ] Empty username field shows error (no 500, no blank screen)
- [ ] Empty password field shows error
- [ ] Enter key in password field submits the form (not just button click)
- [ ] Sign in button shows "Signing in..." while the request is in flight
- [ ] Sign in button is disabled while loading (no double-submit)

---

## Session

- [ ] After login, `GET /api/projects` returns data (not 401)
- [ ] After login, `GET /api/me` returns `{ id, username: "phet", role: "admin" }`
- [ ] Session persists across page refresh (F5 does not log out)
- [ ] `auth_sessions` table in MariaDB contains a row after login

---

## Sidebar User Badge

- [ ] User badge visible at the bottom of the sidebar after login
- [ ] Badge shows username (`phet`) and role (`ADMIN`)
- [ ] LogOut icon button is visible to the right of the username
- [ ] Badge uses sidebar palette (no jarring colour mismatch)
- [ ] Badge renders in both light and dark themes

---

## Logout

- [ ] Clicking the LogOut button in the user badge redirects to `/CCC/login`
- [ ] After logout, navigating to `/CCC/` redirects back to `/CCC/login`
- [ ] After logout, `GET /api/me` returns 401
- [ ] `auth_sessions` table row is removed (or expired) after logout

---

## Security Spot-Check

- [ ] `POST /login` with `{}` body returns 400 (not 500)
- [ ] `POST /login` with correct username + wrong password returns 401 (not user-not-found hint)
- [ ] `POST /login` with nonexistent username returns 401 (same response as wrong password)
- [ ] `POST /logout` with no session returns `{ ok: true }` (idempotent, no crash)
```

---

## Acceptance Criteria

All of the following must be true before presenting the Go/NoGo gate:

1. Unauthenticated browser visit to `/CCC/` redirects to `/CCC/login`
2. Correct credentials create a session and land on the dashboard
3. Incorrect credentials show a generic error without revealing which field is wrong
4. `POST /logout` destroys the session; subsequent visit to `/CCC/` redirects to `/CCC/login`
5. User badge visible in sidebar footer: username, role, LogOut button
6. `GET /api/me` returns current user data for an authenticated session, 401 otherwise
7. `pnpm build` is clean (zero TypeScript errors, zero build warnings)
8. Test file `docs/v1.1/CCC_test_stage05b.md` exists

---

## Autonomy Rule

The kickoff prompt is the approved plan. Execute all tasks autonomously without asking permission for routine actions (installing packages, creating files, running builds, restarting the server). Stop and ask only if you encounter genuine ambiguity not covered by this prompt, a contradiction, or a decision that could reasonably go two different ways. Report what was built and present the acceptance criteria results when done, then wait for testing.

---

## Progress Reporting

Print the full task list at the start (all red). Update each line as work proceeds. Reprint the full list as a footer after every response.

- Task 1 - server.js browser-route auth guard
- Task 2 - server.js POST /login
- Task 3 - server.js POST /logout
- Task 4 - server.js GET /api/me
- Task 5 - auth-card.tsx SignInCard wired
- Task 6 - app-shell.tsx UserBadge + sidebar footer
- Task 7 - Build + restart
- Task 8 - Test file generated

Format:
- 🔴 Task N - [name] - not started
- 🟡 Task N - [name] - in progress
- ✅ Task N - [name] - done
- ❌ Task N - [name] - failed: [one-line reason]

Never use em dash (-). Use a regular hyphen with spaces ( - ) instead.
