# Stage 05a Kickoff Prompt - Auth Middleware
**CCC v1.1.0 | Sub-Stage 05a of Stage 05 (Authentication and Multi-User)**

---

## Context

Stage 04 is complete. CCC runs on Dev-Web with MariaDB backend, Next.js client, and nested
project structure. All API routes are currently unprotected. Stage 05 adds login, session
management, and multi-user support across three sub-stages. Stage 05a is the foundation:
install auth dependencies, create the auth middleware module, and protect all existing API routes.

**After this sub-stage ships, the app is temporarily locked** - all API calls return 401.
This is correct and expected. Stage 05b immediately follows with the login endpoint.

Read before starting:
- `CLAUDE.md` (project root)
- `docs/handoff/CCC_shp.md`
- `docs/v1.1/CCC_tasklist_v1.1.0.md` - Stage 05a tasks only

---

## Scope - What to Build

5 tasks. Nothing more.

```
🔴 Task 1 - Install dependencies
🔴 Task 2 - Generate and populate secrets in .env
🔴 Task 3 - Create src/auth.js
🔴 Task 4 - Update server.js
🔴 Task 5 - Generate test file: docs/v1.1/CCC_test_stage05a.md
```

---

## What NOT to Build

- No login or logout routes (Stage 05b)
- No user creation or management (Stage 05c)
- No first-run detection or setup flow changes (Stage 05c)
- No DB schema changes (users table already exists from Stage 03)
- No frontend changes of any kind

---

## Non-Negotiable Rules

- **No em dash** - use " - " (hyphen with spaces) everywhere, including inline comments
- **No hardcoded credentials** - read all DB and auth values from process.env
- **dotenv** - auth.js is a module, not an entry point. dotenv is already loaded by server.js
  before auth.js is required. Do NOT call dotenv.config() in auth.js.
- **Progress reporting** - print the full task list at start (all 🔴), update each line as work
  proceeds. Reprint the full current task list as a footer after every response.
- **Commands run on Dev-Web [kkh01vdweb01]** - no SSH wrapping in commands

---

## Task 1 - Install Dependencies

[kkh01vdweb01]

```bash
cd /mnt/sc-development/CCC
npm install express-session@^1.18.0 express-mysql-session@^3.1.2
```

Verify both appear in `dependencies` in `package.json` after install.

---

## Task 2 - Generate and Populate Secrets

`SESSION_SECRET` and `CCC_API_TOKEN` in `.env` are both currently empty strings.
Generate a 32-byte hex value for each:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run the command twice - one value for `SESSION_SECRET`, one for `CCC_API_TOKEN`.
Write both values into `/mnt/sc-development/CCC/.env`. Both must be non-empty after this task.

---

## Task 3 - Create src/auth.js

New file. Implement exactly as specified. No deviations.

```javascript
'use strict';

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

// Session store - uses auth_sessions table (separate from CCC PTY sessions table)
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000,
  createDatabaseTable: true,
  schema: {
    tableName: 'auth_sessions'
  }
});

// Session middleware - mounted globally in server.js
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 86400000
  }
});

// requireAuth - protects browser UI routes (/api/*)
// Returns 401 JSON for unauthenticated requests.
// The frontend handles the redirect to /login.
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
}

// requireApiToken - protects PatchPilot API routes (/api/v1/*)
// Checks Authorization: Bearer <token> header against CCC_API_TOKEN env var.
function requireApiToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Bearer token required' });
  }
  const token = authHeader.slice(7);
  if (!process.env.CCC_API_TOKEN || token !== process.env.CCC_API_TOKEN) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token' });
  }
  return next();
}

module.exports = { sessionMiddleware, requireAuth, requireApiToken };
```

---

## Task 4 - Update server.js

Three additions only. Do not touch any existing route handlers, static serving, or WebSocket setup.

**4a - Add require near the top of the file, with the other src/ requires:**

```javascript
const { sessionMiddleware, requireAuth, requireApiToken } = require('./src/auth');
```

**4b - Mount session middleware globally, after app.use(express.json()) and before all route
handlers:**

```javascript
app.use(sessionMiddleware);
```

**4c - Mount auth guards immediately after sessionMiddleware, before the first route handler:**

```javascript
// Session auth: all /api/* routes except /api/v1/* (which uses bearer token auth)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/v1')) return next();
  return requireAuth(req, res, next);
});

// Bearer token auth: all /api/v1/* routes
// No routes exist yet - guard is established here for Stage 09
app.use('/api/v1', requireApiToken);
```

---

## Task 5 - Generate Test File

Pre-run all CLI items below. Report each result. Then generate
`docs/v1.1/CCC_test_stage05a.md` in the same format as prior CCC test files.

**CLI pre-flight:**

```bash
# Read credentials from .env (avoids shell issues with special chars in DB_PASSWORD)
DB_PASS=$(grep '^DB_PASSWORD=' /mnt/sc-development/CCC/.env | cut -d= -f2-)

# 1. Verify dependencies installed
grep -E '"express-session"|"express-mysql-session"' /mnt/sc-development/CCC/package.json

# 2. Verify secrets are non-empty
grep -E '^SESSION_SECRET=.+$' /mnt/sc-development/CCC/.env
grep -E '^CCC_API_TOKEN=.+$' /mnt/sc-development/CCC/.env

# 3. Restart server (session store creates auth_sessions table on first connect)
bash /tmp/ccc-restart.sh
sleep 15

# 4. Verify auth_sessions table was created
mysql -h 172.16.12.11 -u ccc -p"$DB_PASS" ccc -e "SHOW TABLES LIKE 'auth_sessions';"

# 5. Verify 401 on protected API routes
curl -s -o /dev/null -w "%{http_code}" http://kkh01vdweb01.mcsfam.local/CCC/api/projects
# expected: 401

curl -s -o /dev/null -w "%{http_code}" http://kkh01vdweb01.mcsfam.local/CCC/api/settings
# expected: 401

curl -s -o /dev/null -w "%{http_code}" http://kkh01vdweb01.mcsfam.local/CCC/api/sessions
# expected: 401

# 6. Verify static files are NOT blocked by auth
curl -s -o /dev/null -w "%{http_code}" http://kkh01vdweb01.mcsfam.local/CCC/
# expected: 200

curl -s -o /dev/null -w "%{http_code}" http://kkh01vdweb01.mcsfam.local/CCC/login
# expected: 200

# 7. Verify /api/v1/* requires bearer token
curl -s -o /dev/null -w "%{http_code}" \
  http://kkh01vdweb01.mcsfam.local/CCC/api/v1/probe
# expected: 401 (no Authorization header)

curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer wrong-token" \
  http://kkh01vdweb01.mcsfam.local/CCC/api/v1/probe
# expected: 401 (wrong token)

# 8. Verify no startup errors
tail -20 /tmp/ccc-server.log
```

Report all results before writing the test file.

---

## Acceptance Criteria

1. `express-session` and `express-mysql-session` present in `package.json` dependencies
2. `SESSION_SECRET` is non-empty in `.env`
3. `CCC_API_TOKEN` is non-empty in `.env`
4. `auth_sessions` table exists in MariaDB `ccc` database
5. `src/auth.js` created - exports `sessionMiddleware`, `requireAuth`, `requireApiToken`
6. `app.use(sessionMiddleware)` mounted globally in `server.js` before all route handlers
7. `GET /api/projects` returns HTTP 401 for unauthenticated requests
8. `GET /api/settings` returns HTTP 401 for unauthenticated requests
9. `GET /api/sessions` returns HTTP 401 for unauthenticated requests
10. Static files (`/CCC/`, `/CCC/login`) return HTTP 200 (not blocked by auth)
11. `GET /api/v1/*` returns HTTP 401 without a valid bearer token
12. Server restarts cleanly - no errors in `/tmp/ccc-server.log`
13. `docs/v1.1/CCC_test_stage05a.md` generated with all CLI items pre-verified

---

*Sub-Stage 05a of 3. Next: Stage 05b - Login UI.*
