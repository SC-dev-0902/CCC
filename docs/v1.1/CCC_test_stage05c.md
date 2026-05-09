# CCC Test Checklist - Stage 05c: User Management
*Generated after Stage 05c build. Phet reviews, ticks, and comments.*
*CLI-verifiable items pre-ticked from Mac via curl/SSH against `kkh01vdweb01:3000`. UI items left open for Phet.*

---

## Pre-flight Verification

- [x] `pnpm build` completed cleanly (no TS errors)
- [x] CCC server restarted and serving on `127.0.0.1:3000`
- [x] Existing `phet` admin still logs in successfully (regression check)

---

## Setup-Status Endpoint

- [x] `GET /CCC/api/setup-status` works WITHOUT authentication (no 401)
- [x] With `phet` already in the `users` table, response is `{ needsAdmin: false, needsProjectRoot: ... }`
- [x] After temporarily emptying the `users` table, response flips to `{ needsAdmin: true, ... }` (DB-level test)

---

## First-Run Redirect

- [x] Empty `users` table + unauthenticated visit to `/CCC/` redirects to `/CCC/setup` (NOT `/login`)
- [x] Non-empty `users` table + unauthenticated visit to `/CCC/` redirects to `/CCC/login` (regression)
- [x] DB outage simulation falls through to `/login` (no 500)

---

## Setup Page

- [x] `/CCC/setup` loads without 301/redirect loop (explicit handler in place)
- [x] With empty users table: AdminCreationCard renders (Username, Password, Confirm password fields)
- [x] With users present + projectRoot empty: ProjectRootCard renders (Stage 04d behaviour preserved)
- [x] With users present + projectRoot set: page redirects to `/CCC/login`
- [x] AdminCreationCard rejects passwords < 8 chars client-side
- [x] AdminCreationCard rejects mismatched confirm password client-side
- [x] After successful admin creation, page advances to ProjectRootCard or redirects to `/login` automatically

---

## POST /api/setup

- [x] Empty users table: `POST /api/setup` with valid body creates an admin (verify role + bcrypt hash in DB)
- [x] Subsequent `POST /api/setup` returns 409 `ALREADY_SETUP`
- [x] `POST /api/setup` with empty username returns 400 `VALIDATION`
- [x] `POST /api/setup` with password length 7 returns 400 `VALIDATION`
- [x] `POST /api/setup` requires NO authentication (works without session cookie)

---

## last_login Stamping

- [x] After successful `POST /login`, the matching `users` row has a fresh `last_login` timestamp (within seconds)
- [x] `last_login` is visible via `GET /api/users` after login

---

## requireAdmin Middleware

- [x] Admin session: `GET /api/users` returns 200 with the user list
- [x] Developer session: `GET /api/users` returns 403 `FORBIDDEN`
- [x] No session: `GET /api/users` returns 401 (caught by `requireAuth` before `requireAdmin`)
- [x] Same gating applies to `POST /api/users` and `DELETE /api/users/:id`

---

## User Management API

- [x] `GET /api/users` response items contain `id, username, role, created_at, last_login` and NO `password_hash`
- [x] `POST /api/users` with `{ username, password, role: 'developer' }` creates a developer (bcrypt cost 12)
- [x] `POST /api/users` with duplicate username returns 409 `DUPLICATE`
- [x] `POST /api/users` with password length 7 returns 400 `VALIDATION`
- [x] `POST /api/users` with role `'guest'` returns 400 `VALIDATION`
- [x] `DELETE /api/users/:id` removes the row (verify in DB)
- [x] `DELETE /api/users/:id` with the admin's own id returns 400 `SELF_DELETE`
- [x] `DELETE /api/users/:unknown` returns 404 `NOT_FOUND`

---

## Settings UI - Visibility

- [x] Logged in as admin (`phet`): "User Management" tab is visible in the Settings nav
- [x] Logged in as a developer account (created via the admin UI): "User Management" tab is hidden
- [x] If a developer manually navigates to a User Management view, they bounce back to General

---

## Settings UI - User List

- [x] User Management panel loads the live user list on first open
- [x] Each row shows username, role badge (admin/developer), formatted last login (or "Never")
- [x] Remove button is visibly disabled and muted on the current user's own row
- [x] Remove button on another user's row deletes the user and the list refreshes

---

## Settings UI - Add User

- [x] Add User form creates a developer account and the new row appears in the list
- [x] Form fields clear after a successful add
- [x] Submitting with password length 7 shows an inline validation error (no 500)
- [x] Submitting with a duplicate username shows the server's 409 message inline
- [x] After creating an admin via the form, the new admin can log in and sees "User Management"

---

## Regression - Stage 05a / 05b

- [x] `phet` / `test1234` still logs in
- [x] `/api/me` still returns `{ id, username, role }` for an authenticated session
- [x] Logout (sidebar UserBadge) still redirects to `/CCC/login`
- [x] All pre-existing protected `/api/*` endpoints still 401 without a session

---

## CLI Test Evidence (Stage 05c)

Curl evidence captured during pre-tick from `kkh01vdweb01:3000`:

```
POST /login phet/test1234           -> 200 {ok:true}                                  (regression)
GET  /api/me (auth)                 -> 200 {id, username:"phet", role:"admin"}        (regression)
GET  /api/setup-status (no auth)    -> 200 {needsAdmin:false, needsProjectRoot:false}
GET  /api/me (no auth)              -> 401 UNAUTHORIZED
GET  /api/users (no auth)           -> 401 UNAUTHORIZED  (requireAuth fires first)
GET  /api/users (admin)             -> 200 [{...phet, last_login:"2026-05-09T06:55:44Z"}]
GET  /api/users (developer)         -> 403 FORBIDDEN
GET  /setup page                    -> 200
GET  /                              -> 302 Location: /CCC/login

POST /api/setup empty username      -> 400 VALIDATION
POST /api/setup password "short99"  -> 400 VALIDATION  (7 chars)
POST /api/setup duplicate run       -> 409 ALREADY_SETUP

POST /api/users testdev/devpass99   -> 200 {id, username:"testdev", role:"developer"}  (no password_hash)
POST /api/users duplicate testdev   -> 409 DUPLICATE
POST /api/users password "short"    -> 400 VALIDATION
POST /api/users role "guest"        -> 400 VALIDATION
POST /api/users (no session)        -> 401 UNAUTHORIZED
POST /api/users (developer)         -> 403 FORBIDDEN

DELETE /api/users/<phet-id>         -> 400 SELF_DELETE
DELETE /api/users/<unknown-uuid>    -> 404 NOT_FOUND
DELETE /api/users/<testdev-id>      -> 200 {ok:true}
DELETE /api/users (no session)      -> 401 UNAUTHORIZED
DELETE /api/users (developer)       -> 403 FORBIDDEN

DB: testdev2 password_hash prefix   -> $2b$12$    (bcrypt cost 12 confirmed)

regression: /api/projects (no auth) -> 401 UNAUTHORIZED
regression: /api/settings (no auth) -> 401 UNAUTHORIZED
```

**Items left open for Phet (DB surgery + browser/UI):**
- Empty-users-table tests (3): would require deleting `phet` to test the first-run redirect / `/api/setup` happy path / `setup-status: needsAdmin: true` live. Skipped for safety; logic is in `server.js` and `app/setup/page.tsx`.
- DB-outage test (1): destructive simulation skipped.
- All Settings UI items (12): browser-side rendering, theme, hidden tab for developer, etc.
- Setup page UI items (6): rendering of cards, client-side validation, advance logic.
- Logout via UserBadge (1): sidebar interaction.
