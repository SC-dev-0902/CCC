# Stage 03d — Settings & Sessions DB
*CCC v1.1 | Sub-stage of Stage 03 (MariaDB Schema & Data Migration)*
*Read and execute this file in full. No deviation.*

---

## Context

Stage 03a created the MariaDB schema and migration runner.
Stage 03b imported the JSON data into the DB.
Stage 03c rewrote `src/projects.js` to use MariaDB.

Stage 03d completes the DB cutover:
- Settings read/write switches from `data/settings.json` to the `settings` table.
- CC sessions write start/end records to the `sessions` table.
- On server restart, orphaned active sessions are marked as error.

After this stage, CCC no longer reads or writes `data/settings.json` or `data/sessions` at runtime. The JSON file remains on disk as a backup - do not delete or modify it.

---

## What NOT to build

- Multi-user locking (Stage 06)
- Authentication / user_id population (Stage 05) - `user_id` column stays NULL for all sessions this stage
- Any new API endpoints
- Any frontend changes
- Any changes to `src/parser.js` - it is sacred and untouched

---

## Files in scope

- `server.js` - replace sync settings helpers with async DB versions; update orphan cleanup on startup
- `src/sessions.js` - insert/update session rows on create/exit/destroy; read github_token from DB

No other files are modified in this stage.

---

## Task 1 - Two environment decisions (read environment, decide, document)

Before writing any code, answer both questions by inspecting the environment:

**Decision A - UUID generation**

Check the Node.js version on this machine (`node --version`). If it is 14.17.0 or higher, use `crypto.randomUUID()` (built-in, no dependency). If lower, add the `uuid` package and use `uuidv4()`. Document which you used and why at the top of the sessions.js changes in a comment.

**Decision B - Usage settings fields in GET /api/settings response**

Read the current `GET /api/settings` handler and the `SETTINGS_DEFAULTS` object in `server.js`. Identify which fields in `SETTINGS_DEFAULTS` are NOT in the `settings` DB table (i.e., usage-related fields: `recoveryInterval`, `usagePlan`, `tokenBudget5h`, `weeklyTokenBudget`, `weeklyMessageBudget`). These fields are removed in Stage 15 (usage.js cleanup). For now: the DB-backed `readSettingsFromDB()` merges DB values over `SETTINGS_DEFAULTS`, so these fields will always return their default values to the frontend. This is correct and no special handling is needed. Confirm this is the case by checking the frontend (`public/app.js`) to see whether it actively uses any of these fields. If it does, note it in the test file as a known carry-forward - do not fix it this stage.

---

## Task 2 - Settings DB helpers (`server.js`)

Replace the sync `readSettings()` function and the inline `fs.writeFileSync` in the settings PUT handler with async DB equivalents. The `data/settings.json` file is NOT touched by either helper after this change.

### Key mapping (DB column name <-> JS object key)

| DB `settings.key` | JS object key | Notes |
|---|---|---|
| `project_root` | `projectRoot` | plain string |
| `editor` | `editor` | plain string |
| `shell` | `shell` | plain string |
| `theme` | `theme` | plain string |
| `file_patterns` | `filePatterns` | JSON-stringified on write, JSON-parsed on read |
| `github_token` | `githubToken` | plain string |

### `readSettingsFromDB()` - async

```
1. SELECT key, value FROM settings
2. Build result object starting from a deep copy of SETTINGS_DEFAULTS
3. For each DB row:
   - Map DB key to JS key using the table above
   - For file_patterns: JSON.parse(row.value) - wrap in try/catch, fall back to default on parse error
   - For all others: set result[jsKey] = row.value
4. Return result object
```

If the DB is unreachable, catch the error, log a warning, and return a deep copy of `SETTINGS_DEFAULTS`. The server must not crash on a settings read failure.

### `writeSettingsToDB(updates)` - async

```
1. Receive updates object (subset of JS keys)
2. For each JS key in the allowed list ['projectRoot', 'editor', 'shell', 'theme', 'filePatterns', 'githubToken']:
   - If updates[jsKey] is undefined, skip
   - Map JS key to DB key using the table above
   - For filePatterns: JSON.stringify the value
   - Upsert: INSERT INTO settings (key, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)
3. Return the full settings object by calling readSettingsFromDB()
```

If the DB is unreachable, log a warning and return the passed updates merged over SETTINGS_DEFAULTS.

### Update all callers

Every place in `server.js` that calls `readSettings()` must be updated to `await readSettingsFromDB()`. The function signature changes from sync to async, so the containing handler must be async if it isn't already.

Known call sites (verify against actual file - there may be more):
- `GET /api/settings` handler
- `PUT /api/settings` handler
- `POST /api/open-editor` handler
- `POST /api/scan-project` handler
- `POST /api/scaffold-project` handler
- `GET /api/usage` handler
- `setInterval` usage broadcast (inside the async callback)
- `startupMigration` IIFE

Remove the old `readSettings()` function and the `data/settings.json` write path entirely from `server.js` once all callers are updated.

Require `src/db.js` at the top of `server.js` if not already present:
```js
const db = require('./src/db');
```

---

## Task 3 - Sessions DB integration (`src/sessions.js`)

### Require db

Add at the top:
```js
const db = require('./db');
const crypto = require('crypto');
```
(Or use the uuid package if Decision A above requires it.)

### `createSession()` changes

After spawning the PTY and building the `session` object, generate a DB session ID and insert a row:

```js
const dbSessionId = crypto.randomUUID(); // or uuidv4() per Decision A
session.dbSessionId = dbSessionId;

// Non-blocking - fire and forget with error logging
db.query(
  "INSERT INTO sessions (id, project_id, user_id, status, started_at) VALUES (?, ?, NULL, 'active', NOW())",
  [dbSessionId, projectId]
).catch(err => console.warn('[sessions] Failed to insert session row:', err.message));
```

`user_id` is NULL - authentication is Stage 05.

### `ptyProcess.onExit()` changes

After setting `session.state = 'exited'`, update the DB row:

```js
if (session.dbSessionId) {
  db.query(
    "UPDATE sessions SET status = 'exited', ended_at = NOW() WHERE id = ?",
    [session.dbSessionId]
  ).catch(err => console.warn('[sessions] Failed to update session row on exit:', err.message));
}
```

### `destroySession()` changes

Before `sessions.delete(projectId)`, update the DB row:

```js
if (session.dbSessionId) {
  db.query(
    "UPDATE sessions SET status = 'error', ended_at = NOW() WHERE id = ?",
    [session.dbSessionId]
  ).catch(err => console.warn('[sessions] Failed to update session row on destroy:', err.message));
}
```

### `autoFileGitHubIssue()` changes

Replace the `fs.readFileSync(settingsPath)` block with a DB read:

```js
let token;
try {
  const row = await db.queryOne("SELECT value FROM settings WHERE `key` = 'github_token'");
  token = (row && row.value) ? row.value : process.env.GITHUB_TOKEN;
} catch (e) {
  token = process.env.GITHUB_TOKEN;
}
if (!token) return;
```

Remove the `fs` and `path` requires from `sessions.js` if they are no longer used after this change. Check first - `path` may still be used elsewhere in the file. `fs` was only used for the settings read.

---

## Task 4 - Orphaned session cleanup on server startup (`server.js`)

Add an orphan cleanup step that runs once at startup, before `server.listen()`. It must be non-fatal.

Place it immediately before the `server.listen(PORT, ...)` call:

```js
// Orphaned session cleanup - mark any sessions that were active when the server last died
(async function cleanupOrphanedSessions() {
  try {
    const result = await db.query(
      "UPDATE sessions SET status = 'error', ended_at = NOW() WHERE status = 'active'"
    );
    if (result && result.affectedRows > 0) {
      console.log(`[startup] Marked ${result.affectedRows} orphaned session(s) as error`);
    }
  } catch (err) {
    console.warn('[startup] Orphaned session cleanup failed (DB may be unreachable):', err.message);
  }
})();
```

---

## Task 5 - Smoke test

Restart the CCC server (`npm start` from the CCC project root on this machine). Verify:

1. Server starts without error
2. `GET /api/settings` returns the correct values (projectRoot, editor, theme etc. matching what is in the DB)
3. `PUT /api/settings` with `{ "theme": "light" }` returns updated settings, and after a server restart `GET /api/settings` still returns `"theme": "light"` - confirming DB persistence
4. Start a CC session for any project. Verify a row appears in `sessions` table with `status = 'active'`
5. Close/kill that session. Verify the row is updated to `status = 'exited'` or `status = 'error'` with `ended_at` set
6. Restart the server while a session row is `active` (simulate by manually inserting one, or re-running). Verify the orphan cleanup fires and that row becomes `status = 'error'`

---

## Task 6 - Test file

Generate `docs/v1.1/CCC_test_stage03d.md` with a structured checklist covering all six verification points from Task 5, plus:
- Confirm `data/settings.json` was NOT modified during any of the above operations
- Confirm `autoFileGitHubIssue` now reads the token via DB (code review - check the function, no live GitHub call needed)

Use the same section format as `CCC_test_stage03b.md`.

---

## Commit message (on /go)

```
Stage 03d complete - settings and sessions DB cutover
```

---

## Acceptance criteria

- `readSettings()` no longer exists in `server.js`
- `data/settings.json` is not read or written by the server at runtime (the file still exists on disk)
- Settings changes persist across server restart (verified via DB)
- Every CC session creates a row in the `sessions` table
- Session end (normal or forced) updates that row with final status and `ended_at`
- Server restart marks orphaned active sessions as error
- No new npm dependencies added unless Decision A required the `uuid` package
- `src/parser.js` is unchanged

---

*No em dash. No hardcoded credentials. dotenv.config({ override: true }) already in server.js - do not change it.*
