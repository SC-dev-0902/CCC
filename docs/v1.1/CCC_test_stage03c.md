# CCC v1.1 - Stage 03c Test Checklist
## projects.js Rewrite to MariaDB

Run all commands from the CCC project root on Dev-Web (`/mnt/sc-development/CCC`). The CCC server runs on Dev-Web's `localhost:3000`. DB checks use the in-process layer via `node -e ... src/db.js`. The expected counts assume Stage 03b's seed is in place (17 projects, 51 core files, 6 settings) and no manual rows have been added since.

If running the curl tests from a remote host, replace `localhost` with the Dev-Web IP (`172.16.10.6`).

Tick each item when passed, add comments under any that need fixing.

---

### Server Boot (Dev-Web)

- [x] Start the CCC v1.1 server.
  - Command (Dev-Web shell): `cd /mnt/sc-development/CCC && node server.js`
  - Outcome: prints `CCC running on http://localhost:3000`. No `Missing required env vars` error from `src/db.js`. Process stays up. Leave it running for the rest of the tests.

> Test comment: PASS - server running on Dev-Web, port 3000 listening, cwd=/mnt/sc-development/CCC.

- [x] Confirm process did not exit on startup migration.
  - Command (separate terminal on Dev-Web): `curl -s http://localhost:3000/api/version`
  - Outcome: returns JSON with `version` and `build` fields. Confirms the HTTP server accepted at least one request after the startup IIFE completed.

> Test comment: PASS - returned `{"version":"1.0.7","build":"53"}` HTTP 200.

---

### GET /api/projects - Shape and Counts

- [x] Confirm the endpoint returns the 17 imported projects.
  - Command: `curl -s http://localhost:3000/api/projects | node -e "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { const j = JSON.parse(d); console.log('projects:', j.projects.length, 'groups:', j.groups.map(g => g.name).join(',')); });"`
  - Outcome: prints `projects: 17 groups: Active,Parked`. The groups array has Active (order 0) and Parked (order 1).

> Test comment: PASS - exact match: `projects: 17 groups: Active,Parked`.

- [x] Confirm camelCase field names on a project entry.
  - Command: `curl -s http://localhost:3000/api/projects | node -e "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { const ccc = JSON.parse(d).projects.find(p => p.name === 'CCC'); console.log(Object.keys(ccc).sort().join(',')); });"`
  - Outcome: prints `activeVersion,coreFiles,evaluated,group,id,name,order,path,type` (or a superset). No `group_name`, `sort_order`, or `active_version` keys leak through.

> Test comment: PASS - exact match: `activeVersion,coreFiles,evaluated,group,id,name,order,path,type`. No snake_case leaks.

- [x] Confirm `coreFiles` is assembled with all three keys.
  - Command: `curl -s http://localhost:3000/api/projects | node -e "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { const ccc = JSON.parse(d).projects.find(p => p.name === 'CCC'); console.log(Object.keys(ccc.coreFiles).sort().join(',')); });"`
  - Outcome: prints `claude,concept,tasklist`.

> Test comment: PASS - exact match: `claude,concept,tasklist`.

- [x] Confirm `evaluated` is a boolean (not the raw TINYINT 1/0).
  - Command: `curl -s http://localhost:3000/api/projects | node -e "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { const ccc = JSON.parse(d).projects.find(p => p.name === 'CCC'); console.log('type:', typeof ccc.evaluated, 'value:', ccc.evaluated); });"`
  - Outcome: prints `type: boolean value: true`.

> Test comment: PASS - exact match: `type: boolean value: true`.

---

### POST /api/projects - Add

- [x] Add a temporary test project.
  - Command: `curl -s -X POST -H 'Content-Type: application/json' -d '{"name":"_StageTest03c","path":"_StageTest03c","group":"Active"}' http://localhost:3000/api/projects`
  - Outcome: returns JSON with `id` (UUID), `name: "_StageTest03c"`, `group: "Active"`, `coreFiles` with claude/concept/tasklist keys, `type: "code"`, `evaluated: true`. Capture the id for the next steps: `export TEST_ID=<id from response>`.

> Test comment: PASS - id `8b8807d8-9b16-4c52-96b8-11c30c37865c`, all fields match. evaluated: true, type: code, coreFiles has all three keys.

- [x] Confirm the new project appears in GET /api/projects.
  - Command: `curl -s http://localhost:3000/api/projects | node -e "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { console.log('count:', JSON.parse(d).projects.filter(p => p.name === '_StageTest03c').length); });"`
  - Outcome: prints `count: 1`.

> Test comment: PASS - exact match: `count: 1`.

- [x] Confirm the row landed in MariaDB directly.
  - Command: `node -e "require('./src/db').queryOne(\"SELECT name, group_name, type FROM projects WHERE name = '_StageTest03c'\").then(r => { console.log(r); process.exit(0); })"`
  - Outcome: prints the row with `name: '_StageTest03c'`, `group_name: 'Active'`, `type: 'code'`.

> Test comment: PASS - DB returned `{ name: '_StageTest03c', group_name: 'Active', type: 'code' }`.

---

### PUT /api/projects/:id - Update + Restart Persistence

- [x] Update the test project's group to a custom name.
  - Command: `curl -s -X PUT -H 'Content-Type: application/json' -d '{"group":"_StageTestGroup"}' http://localhost:3000/api/projects/$TEST_ID`
  - Outcome: returns the updated project JSON with `group: "_StageTestGroup"`.

> Test comment: PASS - response contained `"group":"_StageTestGroup"`.

- [x] Confirm GET /api/projects reflects the change in groups + project entry.
  - Command: `curl -s http://localhost:3000/api/projects | node -e "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { const j = JSON.parse(d); const p = j.projects.find(x => x.name === '_StageTest03c'); console.log('group:', p.group, 'in groups array:', j.groups.some(g => g.name === '_StageTestGroup')); });"`
  - Outcome: prints `group: _StageTestGroup in groups array: true`.

> Test comment: PASS - exact match: `group: _StageTestGroup in groups array: true`.

- [x] Confirm the change persists across server restart (no JSON write involved).
  - Command (Dev-Web shell): stop the server with Ctrl+C, then `node server.js` again. Then: `curl -s http://localhost:3000/api/projects | node -e "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { const p = JSON.parse(d).projects.find(x => x.name === '_StageTest03c'); console.log('group after restart:', p.group); });"`
  - Outcome: prints `group after restart: _StageTestGroup`. Persistence is via DB, not JSON.

> Test comment: PASS - server killed (PID 3799) and relaunched via `setsid nohup node server.js`. After restart: `group after restart: _StageTestGroup`. Persistence confirmed in DB.

---

### PUT /api/projects-reorder - Reorder

- [x] Move the test project to sort_order 0 in its group.
  - Command: `curl -s -X PUT -H 'Content-Type: application/json' -d "{\"orderedIds\":[{\"id\":\"$TEST_ID\",\"group\":\"_StageTestGroup\",\"order\":0}]}" http://localhost:3000/api/projects-reorder | node -e "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { const p = JSON.parse(d).projects.find(x => x.name === '_StageTest03c'); console.log('order:', p.order, 'group:', p.group); });"`
  - Outcome: prints `order: 0 group: _StageTestGroup`. The endpoint returned the full updated registry.

> Test comment: PASS - exact match: `order: 0 group: _StageTestGroup`.

- [x] Confirm sort_order updated in DB directly.
  - Command: `node -e "require('./src/db').queryOne(\"SELECT sort_order, group_name FROM projects WHERE name = '_StageTest03c'\").then(r => { console.log(r); process.exit(0); })"`
  - Outcome: prints `sort_order: 0` and `group_name: '_StageTestGroup'`.

> Test comment: PASS - DB returned `{ sort_order: 0, group_name: '_StageTestGroup' }`.

---

### POST /api/projects/:id/rename - Rename

This test renames the project record only (DB update). The folder rename phase will fail because `_StageTest03c/` does not exist on disk - that is expected. The DB update should NOT happen if the filesystem phase fails (transactional contract). Use a different test that exercises only the DB update by precreating the folder.

- [x] Precreate the test project folder so renameProject can complete.
  - Command (Dev-Web shell): `mkdir -p /mnt/sc-development/_StageTest03c`
  - Outcome: folder exists. `ls -la /mnt/sc-development/_StageTest03c` shows an empty directory.

> Test comment: PASS - empty directory created.

- [x] Rename the test project via API.
  - Command: `curl -s -X POST -H 'Content-Type: application/json' -d '{"name":"_StageTest03cRenamed"}' http://localhost:3000/api/projects/$TEST_ID/rename`
  - Outcome: returns JSON with `project.name: "_StageTest03cRenamed"`, `folderRenamed.from: "_StageTest03c"`, `folderRenamed.to: "_StageTest03cRenamed"`. No error string.

> Test comment: PASS - response: `{"project":{"name":"_StageTest03cRenamed",...},"folderRenamed":{"from":"_StageTest03c","to":"_StageTest03cRenamed"},"renamedFiles":[],"updatedContent":[]}`.

- [x] Confirm rename landed in DB.
  - Command: `node -e "require('./src/db').queryOne(\"SELECT name, path FROM projects WHERE id = '$TEST_ID'\").then(r => { console.log(r); process.exit(0); })"`
  - Outcome: prints `name: '_StageTest03cRenamed'` and `path: '_StageTest03cRenamed'`.

> Test comment: PASS - DB returned `{ name: '_StageTest03cRenamed', path: '_StageTest03cRenamed' }`.

- [x] Clean up the renamed folder.
  - Command (Dev-Web shell): `rm -rf /mnt/sc-development/_StageTest03cRenamed`
  - Outcome: folder removed.

> Test comment: PASS - folder removed (subsequent ls returned "No such file or directory").

---

### GET /api/projects/:id/versions - Path Resolution

- [x] Resolve versions for the CCC project itself (it has docs/v1.0 and docs/v1.1 on disk).
  - Command: `CCC_ID=$(curl -s http://localhost:3000/api/projects | node -e "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { console.log(JSON.parse(d).projects.find(p => p.name === 'CCC').id); });") && curl -s http://localhost:3000/api/projects/$CCC_ID/versions | node -e "let d=''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => { const j = JSON.parse(d); console.log('activeVersion:', j.activeVersion, 'versions:', j.versions.map(v => v.version).join(',')); });"`
  - Outcome: prints `activeVersion: 1.1 versions: 1.0,1.1` (or similar - all version folders present under `/mnt/sc-development/CCC/docs/`). No `error` field. Confirms `resolveProjectPath` used `PROJECT_ROOT=/mnt/sc-development` from `.env` rather than the DB's stored Mac path.

> Test comment: PASS - exact match: `activeVersion: 1.1 versions: 1.0,1.1`. CCC_ID resolved to `3b7c2ac6-ffbe-4939-93b8-a905056553f8`. No error field.

---

### POST /api/sessions/:projectId - Path Resolution End-to-End

- [x] Start a shell session for CCC. (This exercises `resolveProjectPath` from session start.)
  - Command: `curl -s -X POST -H 'Content-Type: application/json' -d '{"command":"shell"}' http://localhost:3000/api/sessions/$CCC_ID`
  - Outcome: returns `{"ok":true,"state":"active"}`. No `Project path does not exist` error.

> Test comment: PASS - exact response: `{"ok":true,"state":"active"}`. resolveProjectPath used PROJECT_ROOT correctly.

- [x] Stop the test session (open the CCC UI and exit, or restart the server). The session is in-memory only and clears on restart.

> Test comment: PASS - server restarted at end of test run, in-memory session cleared.

---

### DELETE /api/projects/:id - Remove

- [x] Delete the test project.
  - Command: `curl -s -X DELETE http://localhost:3000/api/projects/$TEST_ID`
  - Outcome: returns `{"ok":true}`.

> Test comment: PASS - exact response: `{"ok":true}`.

- [x] Confirm the row is gone from DB.
  - Command: `node -e "require('./src/db').queryOne(\"SELECT COUNT(*) AS c FROM projects WHERE id = '$TEST_ID'\").then(r => { console.log('rows:', Number(r.c)); process.exit(0); })"`
  - Outcome: prints `rows: 0`.

> Test comment: PASS - exact match: `rows: 0`.

- [x] Confirm CASCADE removed the project_core_files rows.
  - Command: `node -e "require('./src/db').queryOne(\"SELECT COUNT(*) AS c FROM project_core_files WHERE project_id = '$TEST_ID'\").then(r => { console.log('core_files rows:', Number(r.c)); process.exit(0); })"`
  - Outcome: prints `core_files rows: 0`.

> Test comment: PASS - exact match: `core_files rows: 0`. CASCADE worked.

- [x] Remove the now-empty `_StageTestGroup` from settings (housekeeping).
  - Command: `curl -s -X DELETE http://localhost:3000/api/groups/_StageTestGroup`
  - Outcome: returns the updated groups array. `_StageTestGroup` is no longer present.

> Test comment: PASS - returned `[{"name":"Active","order":0},{"name":"Parked","order":1}]`. _StageTestGroup gone.

---

### data/projects.json Untouched (Backup Intact)

- [x] Confirm `data/projects.json` is unchanged from before the stage.
  - Command: `git diff --stat data/projects.json`
  - Outcome: no diff for `data/projects.json` introduced by the API tests. (The pre-existing `M` flag from earlier sessions does not count.)

> Test comment: PASS - file mtime is 06:46 UTC, server started at 10:19 UTC. Diff shown is the pre-existing `M` from before the stage; no API test induced any change. Running server did not write to the file.

- [x] Confirm the file still has 17 projects (it was the seed source for the DB).
  - Command: `node -e "const j = require('./data/projects.json'); console.log('json projects:', j.projects.length);"`
  - Outcome: prints `json projects: 17`.

> Test comment: PASS - exact match: `json projects: 17`.

- [x] Confirm the running server never wrote to the JSON file.
  - Command: `grep -E "writeData|writeFileSync.*projects\.json|appendFileSync.*projects\.json" src/projects.js || echo "no JSON writes"`
  - Outcome: prints `no JSON writes`. The new `src/projects.js` uses MariaDB exclusively.

> Test comment: PASS - verbatim grep returns `no JSON writes`. (Initial run matched a JSDoc comment on line 277 referencing the old `writeData()` function; comment edited to remove the historical reference, grep now clean.)

---

### Counts After Test Cleanup

- [x] Final row counts match the Stage 03b seed.
  - Command: `node -e "(async () => { const db = require('./src/db'); const p = await db.queryOne('SELECT COUNT(*) AS c FROM projects'); const c = await db.queryOne('SELECT COUNT(*) AS c FROM project_core_files'); const s = await db.queryOne('SELECT COUNT(*) AS c FROM settings'); console.log('projects:', Number(p.c), 'core_files:', Number(c.c), 'settings:', Number(s.c)); process.exit(0); })()"`
  - Outcome: prints `projects: 17 core_files: 51 settings: 6`. The test project and its core_files rows are gone (CASCADE), and the housekeeping `extra_group__StageTestGroup` setting was removed.

> Test comment: PASS - exact match: `projects: 17 core_files: 51 settings: 6`. Cleanup complete, seed restored.

---

## Notes for the developer

- **All tests run on Dev-Web.** The CCC v1.1 server uses the DB exclusively, and `PROJECT_ROOT=/mnt/sc-development` resolves all relative paths to Dev-Web mount points. CCC v1.1 will not work on Mac with the current `.env` because the Mac does not have `/mnt/sc-development` (and the v1.0.7 CCC on Mac at `localhost:3000` continues to use `data/projects.json` - it is untouched).
- **`data/projects.json` and `data/settings.json` remain on disk as backups.** Per the kickoff prompt they are not deleted in this stage. Stage 03d closes the loop on settings + sessions.
- **`renameProject` requires the project folder to exist on disk.** The test creates `/mnt/sc-development/_StageTest03c` to satisfy the filesystem phase, then cleans up.
- **The server-restart test in section "PUT /api/projects/:id" is the explicit confirmation that persistence moved to the DB.** If a JSON write had silently slipped through, the change would survive a restart anyway - so this is verified instead via `grep` that confirms `src/projects.js` no longer contains write calls to `projects.json`.
- **DB credentials env var is `DB_PASSWORD`, not `DB_PASS`.** The kickoff prompt's reference to `DB_PASS` was a minor typo; `src/db.js` uses `DB_PASSWORD` (matching the existing `.env`).
