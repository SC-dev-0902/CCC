# CCC Test Checklist - Stage 05b: Login UI
*Generated after Stage 05b build. Phet reviews, ticks, and comments.*

---

## Pre-flight Verification

- [x] `npm install bcrypt` completed without errors
- [x] `require('bcrypt')` resolves cleanly (no missing native bindings)
- [x] Test user `phet` exists in `users` table with role `admin`
- [x] `GET /api/me` returns 401 with no session (curl or browser devtools)

---

## Browser-Route Auth Guard

- [x] Opening `http://kkh01vdweb01.mcsfam.local/CCC/` with no session redirects to `/CCC/login`
- [x] `/CCC/login` loads without redirect loop
- [x] `/CCC/setup` loads without redirect loop (no session required)
- [x] `/_next/` static assets load without redirect (check Network tab)

---

## Login Form

- [x] Login page renders correctly (username field, password field, Sign in button)
- [x] Correct credentials (`phet` / `test1234`) log in and land on the dashboard
- [x] Wrong password shows "Invalid credentials. Please try again." - no hint which field is wrong
- [x] Wrong username shows the same generic error message
- [x] Empty username field shows error (no 500, no blank screen)
- [x] Empty password field shows error
- [x] Enter key in password field submits the form (not just button click)
- [x] Sign in button shows "Signing in..." while the request is in flight
- [x] Sign in button is disabled while loading (no double-submit)

---

## Session

- [x] After login, `GET /api/projects` returns data (not 401)
- [x] After login, `GET /api/me` returns `{ id, username: "phet", role: "admin" }`
- [x] Session persists across page refresh (F5 does not log out)
- [x] `auth_sessions` table in MariaDB contains a row after login

---

## Sidebar User Badge

- [x] User badge visible at the bottom of the sidebar after login
- [x] Badge shows username (`phet`) and role (`ADMIN`)
- [x] LogOut icon button is visible to the right of the username
- [x] Badge uses sidebar palette (no jarring colour mismatch)
- [x] Badge renders in both light and dark themes

---

## Logout

- [x] Clicking the LogOut button in the user badge redirects to `/CCC/login`
- [x] After logout, navigating to `/CCC/` redirects back to `/CCC/login`
- [x] After logout, `GET /api/me` returns 401
- [x] `auth_sessions` table row is removed (or expired) after logout

---

## Security Spot-Check

- [x] `POST /login` with `{}` body returns 400 (not 500)
- [x] `POST /login` with correct username + wrong password returns 401 (not user-not-found hint)
- [x] `POST /login` with nonexistent username returns 401 (same response as wrong password)
- [x] `POST /logout` with no session returns `{ ok: true }` (idempotent, no crash)
