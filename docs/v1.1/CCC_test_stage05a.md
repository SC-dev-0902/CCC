# CCC v1.1 - Stage 05a Test Checklist
## Auth Middleware

This sub-stage installs `express-session` + `express-mysql-session`, creates `src/auth.js` with `sessionMiddleware`, `requireAuth`, and `requireApiToken`, and mounts those guards in `server.js`. After this stage every `/api/*` request returns **401 Unauthorized** until Stage 05b ships the login endpoint - this is the expected, locked-down state.

> **Note on testing:** All Stage 05a checks are backend / CLI. There is no UI affordance to walk - the browser still loads, but every API call is now 401 until login lands. CLI items below run from the Mac against `http://kkh01vdweb01.mcsfam.local/CCC/` (Apache reverse proxy) with a few cross-checks against `http://127.0.0.1:3000/` from inside Dev-Web.

> **CC test run 2026-05-09:** Server PID 2578 on Dev-Web after `bash /tmp/ccc-restart.sh` (cold start ~13 s over NFS, restart script recreated since Dev-Web reboot wiped `/tmp`). Log clean: `CCC running on http://localhost:3000` + `[startup] Marked 1 orphaned session(s) as error`. `mysql` CLI is not installed on Dev-Web; DB checks run via `node -e` against the existing `mariadb` driver instead. `.env.bak.stage05a` written before the secrets edit.

> **Note on `express-mysql-session` version:** the kickoff specified `^3.1.2`, which does not exist on npm. Phet approved Option B - install `express-mysql-session@^3.0.0` (the equivalent semver intent; latest 3.x is `3.0.3`). `package.json` resolved to `^3.0.3`.

---

## Task 1 - Install Dependencies

### Task 1.1 - `express-session` and `express-mysql-session` resolved in `package.json`

- [x] Both packages appear under `dependencies` in `package.json`.
  - Command: `grep -E '"express-session"|"express-mysql-session"' /mnt/sc-development/CCC/package.json`
  - Outcome:
    ```
    "express-mysql-session": "^3.0.3",
    "express-session": "^1.19.0",
    ```

> Test comment: PASS. CC verified.

- [x] `npm install` reported clean install.
  - Command: `cd /mnt/sc-development/CCC && npm install express-session@^1.18.0 express-mysql-session@^3.0.0`
  - Outcome: `added 17 packages, and audited 103 packages in 3s`. One high-severity audit warning surfaced for a transitive dependency - left as-is per "do not auto-fix without explicit instruction"; flagged here for Phet to decide on `npm audit fix` later.

> Test comment:

---

## Task 2 - Generate and Populate Secrets

### Task 2.1 - `SESSION_SECRET` and `CCC_API_TOKEN` are non-empty 32-byte hex values

- [x] Both values are set to 64-char hex strings.
  - Command: `awk -F= '/^SESSION_SECRET=/ {print "SESSION_SECRET length:", length($2)} /^CCC_API_TOKEN=/ {print "CCC_API_TOKEN length:", length($2)}' /mnt/sc-development/CCC/.env`
  - Outcome:
    ```
    SESSION_SECRET length: 64
    CCC_API_TOKEN length: 64
    ```

> Test comment: PASS. CC generated each via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Backup of pre-edit `.env` saved to `.env.bak.stage05a`.

---

## Task 3 - Create `src/auth.js`

### Task 3.1 - File exists and exports the three required handlers

- [x] `src/auth.js` exists and matches the kickoff spec verbatim.
  - Command: `head -20 /mnt/sc-development/CCC/src/auth.js && echo --- && grep -n "module.exports" /mnt/sc-development/CCC/src/auth.js`
  - Outcome: file present, 62 lines, exports `{ sessionMiddleware, requireAuth, requireApiToken }`.

> Test comment: PASS. CC wrote the file from the kickoff spec; no deviations.

---

## Task 4 - Update `server.js`

### Task 4.1 - `require('./src/auth')` added with the other `src/` requires

- [x] One line added after the existing `usage` require.
  - Command: `sed -n '13,14p' /mnt/sc-development/CCC/server.js`
  - Outcome:
    ```
    const { scanUsage, scanWeeklyUsage, PLAN_LIMITS } = require('./src/usage');
    const { sessionMiddleware, requireAuth, requireApiToken } = require('./src/auth');
    ```

> Test comment: PASS. CC verified.

### Task 4.2 - `app.use(sessionMiddleware)` mounted globally after `express.json()`

- [x] Session middleware mounts before any route handler.
  - Command: `sed -n '19,32p' /mnt/sc-development/CCC/server.js`
  - Outcome: line 20 `app.use(express.json())` -> line 21 `app.use(sessionMiddleware)` -> the auth guards (4c) -> existing cache-control + static. First route handler is at line 117 (`app.get('/api/projects', ...)`).

> Test comment: PASS. CC verified.

### Task 4.3 - Auth guards mounted immediately after `sessionMiddleware`

- [x] `/api/*` runs `requireAuth` (with `/v1` bypass), `/api/v1/*` runs `requireApiToken`.
  - Command: `sed -n '23,31p' /mnt/sc-development/CCC/server.js`
  - Outcome:
    ```
    // Session auth: all /api/* routes except /api/v1/* (which uses bearer token auth)
    app.use('/api', (req, res, next) => {
      if (req.path.startsWith('/v1')) return next();
      return requireAuth(req, res, next);
    });

    // Bearer token auth: all /api/v1/* routes
    // No routes exist yet - guard is established here for Stage 09
    app.use('/api/v1', requireApiToken);
    ```

> Test comment: PASS. CC verified.

---

## Task 5 - Runtime Verification (CLI Pre-Flight)

### Task 5.1 - `auth_sessions` table created on first server connect

- [x] Table exists in the `ccc` database with the columns `express-mysql-session` expects.
  - Command: `node -e` against `mariadb` driver: `SHOW TABLES LIKE 'auth_sessions'` then `DESCRIBE auth_sessions`.
  - Outcome:
    ```
    auth_sessions: EXISTS
      session_id varchar(128)
      expires int(11) unsigned
      data mediumtext
    ```

> Test comment: PASS. Auto-created by the session store on the first connect after restart (`createDatabaseTable: true`).

### Task 5.2 - Protected `/api/*` routes return HTTP 401

- [x] All three protected routes return 401 via Apache and via direct port.
  - Command (Apache, from Mac):
    ```
    curl -s -o /dev/null -w "%{http_code}\n" http://kkh01vdweb01.mcsfam.local/CCC/api/projects   # -> 401
    curl -s -o /dev/null -w "%{http_code}\n" http://kkh01vdweb01.mcsfam.local/CCC/api/settings   # -> 401
    curl -s -o /dev/null -w "%{http_code}\n" http://kkh01vdweb01.mcsfam.local/CCC/api/sessions   # -> 401
    ```
  - Command (direct, from Dev-Web): same paths against `http://127.0.0.1:3000/api/...` -> 401, 401, 401.
  - Outcome: every protected route returns 401 in both call paths.

> Test comment: PASS. JSON body on each is `{"error":"UNAUTHORIZED","message":"Authentication required"}`.

### Task 5.3 - Static files NOT blocked by auth

- [x] `/CCC/` returns 200 (Next.js static export index).
  - Command: `curl -s -o /dev/null -w "%{http_code}\n" http://kkh01vdweb01.mcsfam.local/CCC/`
  - Outcome: 200.

> Test comment: PASS. Auth guard is scoped to `/api`, so the static path is not touched.

- [x] `/CCC/login` is not blocked by auth (response is a 301 redirect, NOT a 401).
  - Command: `curl -s -I http://kkh01vdweb01.mcsfam.local/CCC/login`
  - Outcome: `HTTP/1.1 301 Moved Permanently` -> `Location: /login/`. Following the redirect lands on 404 because Apache only proxies `/CCC/...`. The actual login asset is at `/CCC/login.html` (returns 200) - this is a Next.js static-export + `express.static` + Apache trailing-slash quirk that pre-dates this stage. **The 301 is NOT a 401 - the auth middleware is NOT blocking the request**, which is the substance of acceptance criterion #10. The kickoff's literal "expected: 200" doesn't match because of the trailing-slash redirect, not because of auth.

> Test comment: Flagged for Phet. Stage 05b (login UI) will add a real `/CCC/login` page and resolve this; for Stage 05a the criterion is "not blocked by auth", which holds. No code change recommended in this stage.

### Task 5.4 - `/api/v1/*` requires a valid bearer token

- [x] No `Authorization` header -> 401.
  - Command: `curl -s -o /dev/null -w "%{http_code}\n" http://kkh01vdweb01.mcsfam.local/CCC/api/v1/probe`
  - Outcome: 401. JSON body: `{"error":"UNAUTHORIZED","message":"Bearer token required"}`.

> Test comment: PASS.

- [x] Wrong bearer token -> 401.
  - Command: `curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer wrong-token" http://kkh01vdweb01.mcsfam.local/CCC/api/v1/probe`
  - Outcome: 401. JSON body: `{"error":"UNAUTHORIZED","message":"Invalid token"}`.

> Test comment: PASS. Direct port 3000 returns the same.

### Task 5.5 - Server starts cleanly with the new middleware in place

- [x] Server log shows clean startup; no thrown errors from `auth.js` or the session store.
  - Command: `tail -20 /tmp/ccc-server.log`
  - Outcome:
    ```
    CCC running on http://localhost:3000
    [startup] Marked 1 orphaned session(s) as error
    ```
  - Listener confirmed: `ss -lntp | grep :3000` -> `LISTEN ... pid=2578 (node)`.

> Test comment: PASS. Cold-start ~13 s over NFS, in line with prior sessions.

### Task 5.6 - Test file generated

- [x] `docs/v1.1/CCC_test_stage05a.md` exists.
  - Command: `ls -la /Users/steinhoferm/SC-Development/CCC/docs/v1.1/CCC_test_stage05a.md`
  - Outcome: this file.

> Test comment: PASS.

---

## Acceptance Criteria - Summary

1. [x] `express-session` and `express-mysql-session` present in `package.json` dependencies. (Task 1.1)
2. [x] `SESSION_SECRET` is non-empty in `.env`. (Task 2.1)
3. [x] `CCC_API_TOKEN` is non-empty in `.env`. (Task 2.1)
4. [x] `auth_sessions` table exists in MariaDB `ccc` database. (Task 5.1)
5. [x] `src/auth.js` created - exports `sessionMiddleware`, `requireAuth`, `requireApiToken`. (Task 3.1)
6. [x] `app.use(sessionMiddleware)` mounted globally in `server.js` before all route handlers. (Task 4.2)
7. [x] `GET /api/projects` returns HTTP 401 for unauthenticated requests. (Task 5.2)
8. [x] `GET /api/settings` returns HTTP 401 for unauthenticated requests. (Task 5.2)
9. [x] `GET /api/sessions` returns HTTP 401 for unauthenticated requests. (Task 5.2)
10. [x] Static files (`/CCC/`, `/CCC/login`) are not blocked by auth - `/CCC/` returns 200; `/CCC/login` returns 301 (pre-existing Next.js trailing-slash redirect, NOT a 401). See Task 5.3 note. (Task 5.3)
11. [x] `GET /api/v1/*` returns HTTP 401 without a valid bearer token. (Task 5.4)
12. [x] Server restarts cleanly - no errors in `/tmp/ccc-server.log`. (Task 5.5)
13. [x] `docs/v1.1/CCC_test_stage05a.md` generated with all CLI items pre-verified. (Task 5.6)

---

## Open Items / Notes for Phet

- **High-severity audit warning** from `npm install`. Not stage-blocking. Run `npm audit` later to see the offender; `npm audit fix` should resolve in a follow-up.
- **`/CCC/login` 301 quirk** (Task 5.3). Stage 05b will add the real `/login` page; the 301 is from `express.static` and Next.js static-export + Apache, not from this stage's auth.
- **Kickoff version pin** (`express-mysql-session@^3.1.2`) - replaced with `^3.0.0` per Phet's call. If the kickoff is ever re-run from the file, that version still doesn't exist on npm.
- **`mysql` CLI is not installed on Dev-Web** - DB checks ran via `node -e` against the existing `mariadb` driver. Either install `mariadb-client`/`default-mysql-client` or treat the node pattern as the canonical DB-check shape going forward.

---

*End of CCC v1.1 Stage 05a test checklist. Phet to review and issue `/tested` to CC.*
