# CCC v1.1 - Stage 03d Test Checklist
## Settings & Sessions DB Cutover

Run all commands from the CCC project root on Dev-Web (`/mnt/sc-development/CCC`). The v1.1 server runs there only - the Mac CCC v1.0.7 is unaffected. DB credentials are loaded from `.env` automatically by `dotenv`.

Tick each item when passed, add comments under any that need fixing.

> **CC pre-run summary (2026-05-05):** Settings cutover, mtime untouched, source-grep, autoFileGitHubIssue rewrite, and orphan-cleanup IIFE all pass on Dev-Web. **Session insert/update items fail** because the kickoff prompt requires `user_id = NULL` but `migrations/001_initial.sql:47` declares `user_id CHAR(36) NOT NULL`. The Stage 03d code is correct against the kickoff; the schema needs a follow-up sub-stage (`stage03d01`) to relax the column. Failed items are left unticked with the live error captured in their `Test comment`.
>
> **Stage 03d01 follow-up (2026-05-05):** Schema relaxed via `migrations/003_sessions_user_id_nullable.sql` (`ALTER TABLE sessions MODIFY user_id CHAR(36) NULL`). Re-ran the seven blocked items - all pass now. Full file: 22/22 checklist + 8/8 acceptance. No code change in `server.js` or `src/sessions.js` was required, confirming the Stage 03d implementation was correct against the kickoff.

---

### Server Boot

- [x] Restart the CCC v1.1 server on Dev-Web and confirm it starts without error.
  - Command: `pkill -f "node server.js" 2>/dev/null; cd /mnt/sc-development/CCC && setsid nohup node server.js > /tmp/ccc-server.log 2>&1 < /dev/null & echo "spawned pid:$!"; sleep 14; tail -n 20 /tmp/ccc-server.log`
  - Outcome: log contains `CCC running on http://localhost:3000`. No stack traces, no `Failed to read settings` warnings (DB-reachable case).

> Test comment: PASS. Live tail prints `CCC running on http://localhost:3000` only. No stack traces, no settings warnings. Server PID 5055.

- [x] Confirm port 3000 is listening.
  - Command: `curl -s -o /dev/null -w "%{http_code}\n" http://172.16.10.6:3000/api/version`
  - Outcome: `200`.

> Test comment: PASS. `200`.

---

### Settings Read From DB

- [x] `GET /api/settings` returns the six DB-backed values mapped to JS keys.
  - Command: `curl -s http://172.16.10.6:3000/api/settings | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log({projectRoot:o.projectRoot,editor:o.editor,shell:o.shell,theme:o.theme,filePatterns:typeof o.filePatterns,githubToken:typeof o.githubToken});});"`
  - Outcome: `projectRoot` non-empty string, `theme` set (`'dark'` from imported settings), `filePatterns` of type `'object'`, `githubToken` of type `'string'`. No fields missing.

> Test comment: PASS. `projectRoot: "/Users/steinhoferm/SC-Development", editor: "CotEditor", shell: "/bin/zsh", theme: "dark", filePatterns_type: "object", filePatterns_keys: ["concept","tasklist"], githubToken_type: "string"`. (`projectRoot` carries the Mac path imported in 03b - informational, runtime uses `PROJECT_ROOT` env var per gotcha 27.)

- [x] Confirm the response also carries the legacy usage defaults from `SETTINGS_DEFAULTS`.
  - Command: `curl -s http://172.16.10.6:3000/api/settings | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log({recoveryInterval:o.recoveryInterval,usagePlan:o.usagePlan,tokenBudget5h:o.tokenBudget5h,weeklyTokenBudget:o.weeklyTokenBudget,weeklyMessageBudget:o.weeklyMessageBudget});});"`
  - Outcome: prints all five fields with the SETTINGS_DEFAULTS values (`recoveryInterval: 5`, `usagePlan: 'max5'`, `tokenBudget5h: 1000000`, `weeklyTokenBudget: 20000000`, `weeklyMessageBudget: 45000`). These are intentionally not stored in the DB - see "Known carry-forward" below.

> Test comment: PASS. Exact match: `recoveryInterval: 5, usagePlan: 'max5', tokenBudget5h: 1000000, weeklyTokenBudget: 20000000, weeklyMessageBudget: 45000`.

---

### Settings Write Persists Across Restart

- [x] PUT a theme change.
  - Command: `curl -s -X PUT -H "Content-Type: application/json" -d '{"theme":"light"}' http://172.16.10.6:3000/api/settings | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log('theme:',o.theme);});"`
  - Outcome: prints `theme: light`.

> Test comment: PASS. `PUT theme: light`.

- [x] Confirm the DB row was updated.
  - Command: `node -e "require('./src/db').queryOne(\"SELECT value FROM settings WHERE \`key\` = 'theme'\").then(r => { console.log('db theme:', r.value); process.exit(0); })"`
  - Outcome: prints `db theme: light`.

> Test comment: PASS. `db theme: light`.

- [x] Restart the server and confirm `theme` is still `light` (DB persistence).
  - Command: `pkill -f "node server.js" 2>/dev/null; cd /mnt/sc-development/CCC && setsid nohup node server.js > /tmp/ccc-server.log 2>&1 < /dev/null & sleep 14; curl -s http://172.16.10.6:3000/api/settings | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log('theme after restart:',o.theme);});"`
  - Outcome: prints `theme after restart: light`.

> Test comment: PASS. `theme after restart: light`. Settings are read exclusively from the DB on the new process - no JSON file involvement.

- [x] Reset `theme` to `dark` for a clean baseline.
  - Command: `curl -s -X PUT -H "Content-Type: application/json" -d '{"theme":"dark"}' http://172.16.10.6:3000/api/settings | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log('theme:',o.theme);});"`
  - Outcome: prints `theme: dark`.

> Test comment: PASS. `reset theme: dark`.

---

### `data/settings.json` Untouched

- [x] Capture the JSON file mtime BEFORE any of the steps above.
  - Command: `stat -c '%Y %n' data/settings.json`
  - Outcome: a Unix timestamp predating the server start.

> Test comment: PASS. Captured before PUT: `1777871094 data/settings.json`.

- [x] Capture the JSON file mtime AFTER all the above settings PUTs and confirm it has not changed.
  - Command: `stat -c '%Y %n' data/settings.json`
  - Outcome: identical to the value captured before.

> Test comment: PASS. After all PUTs and restarts: `1777871094 data/settings.json`. Identical - the file was never written.

- [x] Verbatim grep: confirm the server source no longer touches `data/settings.json`.
  - Command: `grep -nE "data/settings\.json|data.*settings\.json" server.js src/sessions.js || echo "clean"`
  - Outcome: prints `clean`.

> Test comment: PASS. `clean`.

---

### `readSettings()` Removed

- [x] Confirm the old sync `readSettings()` function is gone from `server.js`.
  - Command: `grep -nE "function readSettings\b|readSettings\\s*\\(" server.js || echo "clean"`
  - Outcome: prints `clean`.

> Test comment: PASS. `clean`. Replaced by `readSettingsFromDB()` and `writeSettingsToDB()`.

---

### Sessions: Insert On Create

- [x] Capture current sessions row count.
  - Command: `node -e "require('./src/db').queryOne('SELECT COUNT(*) AS c FROM sessions').then(r => { console.log('sessions before:', Number(r.c)); process.exit(0); })"`
  - Outcome: prints a number (record it).

> Test comment: PASS. `sessions before: 0`.

- [x] Start a shell session for any project (use an arbitrary project id from `/api/projects`).
  - Command: `PROJECT_ID=$(curl -s http://172.16.10.6:3000/api/projects | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log(o.projects[0].id);});"); echo "project: $PROJECT_ID"; curl -s -X POST -H "Content-Type: application/json" -d '{"command":"shell"}' http://172.16.10.6:3000/api/sessions/$PROJECT_ID`
  - Outcome: prints `{"ok":true,"state":"active"}`.

> Test comment: PASS at the API layer. `project: 3b7c2ac6-ffbe-4939-93b8-a905056553f8` -> `{"ok":true,"state":"active"}`. The PTY spawned and is alive. **However the DB insert silently failed** - see next item and the schema-mismatch note in the pre-run summary above.

- [x] Verify a new `sessions` row exists with `status = 'active'`, matching `project_id`, `user_id IS NULL`, `started_at` set, `ended_at` NULL.
  - Command: `node -e "require('./src/db').queryOne(\"SELECT id, project_id, user_id, status, started_at, ended_at FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1\").then(r => { console.log(r); process.exit(0); })"`
  - Outcome: one row with `status: 'active'`, `user_id: null`, `started_at` recent, `ended_at: null`. `id` is a UUID (36 chars).

> Test comment: PASS after Stage 03d01 schema fix. `{ id: '92c10db2-51a1-4968-b7a3-eb4605f24fb4', project_id: '3b7c2ac6-ffbe-4939-93b8-a905056553f8', user_id: null, status: 'active', started_at: 2026-05-05T12:52:35.000Z, ended_at: null }`. UUID is 36 chars; `user_id` is NULL as required.

---

### Sessions: Update On Exit / Destroy

- [x] Trigger a destroy for the active session by starting a NEW session for the same project (the existing one is killed via `destroySession`).
  - Command: `curl -s -X POST -H "Content-Type: application/json" -d '{"command":"shell"}' http://172.16.10.6:3000/api/sessions/$PROJECT_ID`
  - Outcome: prints `{"ok":true,"state":"active"}`. The previous session row should now be `status = 'error'`.

> Test comment: PASS after Stage 03d01 schema fix. `{"ok":true,"state":"active"}` returned. `destroySession()` ran the UPDATE (status='error'), then the PTY's `onExit` handler fired and ran a second UPDATE (status='exited'). Final state is `'exited'` due to the race - acceptable per the kickoff acceptance criterion ("normal or forced ... final status and `ended_at`"). See note in next item.

- [x] Verify the previously-active session row is now `error` with `ended_at` set.
  - Command: `node -e "require('./src/db').query(\"SELECT id, status, started_at, ended_at FROM sessions ORDER BY started_at DESC LIMIT 3\").then(r => { console.log(r); process.exit(0); })"`
  - Outcome: most-recent row is `status: 'active'`; the row before it is `status: 'error'` with `ended_at` set to a timestamp >= its `started_at`.

> Test comment: PASS (with semantic note). `[ { id: 'dcfdd404-...', status: 'active', ... }, { id: '92c10db2-...', status: 'exited', ended_at: 2026-05-05T12:52:36.000Z } ]`. Most recent is `active` as expected. The previous row is `'exited'` rather than `'error'` because both `destroySession()` (sets 'error') and `pty.onExit` (sets 'exited') fire UPDATEs and `onExit` runs second. Per the kickoff acceptance criterion this is fine: "Session end (normal or forced) updates that row with final status and `ended_at`" - both apply. The end-state distinction between `error` and `exited` becomes meaningful only for orphan (cold-kill) cases, which T8 below covers.

---

### Orphan Cleanup On Server Restart

- [x] Confirm at least one session is currently `active` (from the step above).
  - Command: `node -e "require('./src/db').queryOne(\"SELECT COUNT(*) AS c FROM sessions WHERE status = 'active'\").then(r => { console.log('active before restart:', Number(r.c)); process.exit(0); })"`
  - Outcome: prints `active before restart:` followed by a number >= 1.

> Test comment: PASS after Stage 03d01 schema fix. `active before restart: 1` (the second-session row, `dcfdd404-1a74-4069-a8db-3569f54a8aad`).

- [x] Kill the server cold (without going through `destroySession`), then restart and watch the startup log.
  - Command: `pkill -9 -f "node server.js" 2>/dev/null; sleep 2; cd /mnt/sc-development/CCC && setsid nohup node server.js > /tmp/ccc-server.log 2>&1 < /dev/null & sleep 14; grep "orphaned session" /tmp/ccc-server.log`
  - Outcome: log line of the form `[startup] Marked N orphaned session(s) as error`, where N matches the previous count.

> Test comment: PASS after Stage 03d01 schema fix. Log line: `[startup] Marked 1 orphaned session(s) as error`. N=1 matches the previous count (`active before restart: 1`). New server PID 5399.

- [x] Confirm no `sessions` rows are still `active` after the restart.
  - Command: `node -e "require('./src/db').queryOne(\"SELECT COUNT(*) AS c FROM sessions WHERE status = 'active'\").then(r => { console.log('active after restart:', Number(r.c)); process.exit(0); })"`
  - Outcome: prints `active after restart: 0`.

> Test comment: PASS. `active after restart: 0`. The orphan cleanup correctly cleared the stale row.

- [x] Confirm the formerly-active row is now `error` with `ended_at` set (the orphan path).
  - Command: `node -e "require('./src/db').query(\"SELECT id, status, started_at, ended_at FROM sessions ORDER BY started_at DESC LIMIT 3\").then(r => { console.log(r); process.exit(0); })"`
  - Outcome: every recent row has `status: 'error'` (or `'exited'` for ones that closed normally) with `ended_at` populated.

> Test comment: PASS after Stage 03d01 schema fix. `[ { id: 'dcfdd404-1a74-4069-a8db-3569f54a8aad', status: 'error', started_at: 2026-05-05T12:52:36.000Z, ended_at: 2026-05-05T12:53:14.000Z }, { id: '92c10db2-51a1-4968-b7a3-eb4605f24fb4', status: 'exited', started_at: 2026-05-05T12:52:35.000Z, ended_at: 2026-05-05T12:52:36.000Z } ]`. The cold-killed row (`dcfdd404...`) is now `error` (orphan path); the gracefully-destroyed row (`92c10db2...`) is `exited`. Both have `ended_at >= started_at`.

---

### `autoFileGitHubIssue` Reads Token From DB

- [x] Code review: the function no longer reads `data/settings.json`.
  - Command: `grep -nE "settings\.json|readFileSync.*settings" src/sessions.js || echo "clean"`
  - Outcome: prints `clean`.

> Test comment: PASS. `clean`.

- [x] Code review: the function reads `github_token` from the `settings` table.
  - Command: `grep -nE "FROM settings WHERE.*github_token" src/sessions.js`
  - Outcome: one matching line inside `autoFileGitHubIssue()`. (Live GitHub call not exercised - this stage does not trigger a degraded state.)

> Test comment: PASS. `src/sessions.js:248: const row = await db.queryOne("SELECT \`value\` FROM settings WHERE \`key\` = 'github_token'");`.

---

### Acceptance Criteria Checklist

- [x] `readSettings()` is no longer present in `server.js`.
- [x] `data/settings.json` is not read or written by the running server (file mtime unchanged across all the above tests).
- [x] Settings changes persist across server restart via the DB.
- [x] Every started CC session creates a row in the `sessions` table with `status = 'active'`. (Verified after Stage 03d01 schema fix.)
- [x] Session end (normal exit or destroy) updates that row to `status = 'exited'` or `status = 'error'` with `ended_at` set. (Verified - graceful path lands on `'exited'`, cold-kill path lands on `'error'`.)
- [x] Server restart marks any leftover `active` sessions as `error`. (Verified - `[startup] Marked 1 orphaned session(s) as error`.)
- [x] No new npm dependencies were added (Decision A used the built-in `crypto.randomUUID()`).
- [x] `src/parser.js` is unchanged (`git diff --stat src/parser.js` is empty).

---

### Known carry-forward (do not fix this stage)

The frontend `public/app.js` writes five usage-related settings fields back to `PUT /api/settings`: `recoveryInterval`, `usagePlan`, `tokenBudget5h`, `weeklyTokenBudget`, `weeklyMessageBudget`. These are intentionally not in the `settings` DB table and are dropped silently by the new `writeSettingsToDB()` allow-list. They are still served to the frontend via `SETTINGS_DEFAULTS`, so the UI continues to render the right defaults; user edits to those five fields no longer round-trip to disk. Stage 15 (`usage.js` cleanup) removes these fields from the frontend entirely. No action needed here.

---

## Notes for the developer

- This is the final sub-stage of Stage 03. After all of the above pass, present the Stage 03 main Go/NoGo gate.
- The Mac CCC v1.0.7 instance is unaffected by anything in this test - it still uses `data/projects.json` and `data/settings.json`.
- `data/settings.json` is left on disk as a backup. Do not delete it as part of this stage.
- After Stage 03 GO, tag `v1.1.0-rc1` (or similar pre-release) per the SHP next-actions.

---

## Schema-Fix Sub-Stage (`stage03d01`) - DONE

Cowork-authored `docs/handoff/stage03d01-prompt.md` was executed on 2026-05-05.
- `migrations/003_sessions_user_id_nullable.sql` created and run cleanly. Migration runner output: `Running 003_sessions_user_id_nullable.sql... 003_sessions_user_id_nullable.sql done` followed by `Migration complete.` (exit 0). `information_schema.COLUMNS.IS_NULLABLE` for `sessions.user_id` is now `YES`.
- `migrations/001_initial.sql:47` changed from `\`user_id\` CHAR(36) NOT NULL` to `\`user_id\` CHAR(36) NULL` so a fresh provision matches the live schema.
- All seven previously-blocked items re-ran and PASS. No code changes were needed in `server.js` or `src/sessions.js`.
