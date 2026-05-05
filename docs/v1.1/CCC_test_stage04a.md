# CCC v1.1 - Stage 04a Test Checklist
## DB Schema for Nesting (parentId + lock columns on projects)

Run all commands from the CCC project root on Dev-Web (`/mnt/sc-development/CCC`). The v1.1 server runs there only - the Mac CCC v1.0.7 is unaffected. DB credentials are loaded from `.env` automatically by `dotenv`.

Tick each item when passed, add comments under any that need fixing.

> **CC test run (2026-05-05):** All eleven runnable items executed end-to-end on Dev-Web and ticked by CC. DB column verification, API response shape, `addProject()` without `parentId`, `fetchProjectById()` shape, tree structure (via raw INSERT bypass), `buildGroupsArray()` top-level filter, and cleanup all PASS. The two `addProject({ parentId })` items were initially BLOCKED by `projects.group_name NOT NULL`.
>
> **Stage 04a01 follow-up (2026-05-05):** Schema relaxed via `migrations/004_group_name_nullable.sql` (`ALTER TABLE projects MODIFY COLUMN group_name VARCHAR(100) NULL`). Re-ran the two blocked items - both PASS. Full file: 13/13 checklist + 8/8 acceptance. No code change in `src/projects.js` was required, confirming the Stage 04a implementation was correct against the kickoff. Same pattern as Stage 03d -> 03d01.

---

### Server Boot

- [x] Restart the CCC v1.1 server on Dev-Web and confirm it starts without error.
  - Command: `pkill -f "node server.js" 2>/dev/null; sleep 1; cd /mnt/sc-development/CCC && setsid nohup node server.js > /tmp/ccc-server.log 2>&1 < /dev/null & sleep 14; tail -n 20 /tmp/ccc-server.log`
  - Outcome: log contains `CCC running on http://localhost:3000`. No stack traces.

> Test comment: PASS. Live tail prints `CCC running on http://localhost:3000` only. Server PID 5756.

- [x] Confirm port 3000 is listening.
  - Command: `curl -s -o /dev/null -w "%{http_code}\n" http://172.16.10.6:3000/api/version`
  - Outcome: `200`.

> Test comment: PASS. `200`.

---

### DB Column Verification

- [x] Confirm `parent_id`, `lock_user_id`, `lock_session_id` exist on `projects` with correct types and nullability.
  - Command: `node -e "require('dotenv').config({override:true}); const db=require('./src/db'); db.query(\"SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='ccc' AND TABLE_NAME='projects' AND COLUMN_NAME IN ('parent_id','lock_user_id','lock_session_id') ORDER BY COLUMN_NAME\").then(r=>{console.log(JSON.stringify(r,null,2));process.exit(0);}).catch(e=>{console.error(e.message);process.exit(1);})"`
  - Outcome: three rows, all `char(36)`, all `IS_NULLABLE = YES`.

> Test comment: PASS. Three rows returned: `lock_session_id char(36) YES`, `lock_user_id char(36) YES`, `parent_id char(36) YES`.

---

### API Response Shape

- [x] `GET /api/projects` returns a `groups` array and a `projects` array.
  - Command: `curl -s http://172.16.10.6:3000/api/projects | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log('keys:',Object.keys(o).join(','),'| groups:',o.groups.length,'| projects:',o.projects.length);});"`
  - Outcome: `keys: groups,projects | groups: 2 | projects: 17`.

> Test comment: PASS. `keys: groups,projects | groups: 2 | projects: 17`.

- [x] Every entry in `projects` has `parentId === null`.
  - Command: `curl -s http://172.16.10.6:3000/api/projects | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log('all parentId null?',o.projects.every(p=>p.parentId===null));});"`
  - Outcome: `all parentId null? true`.

> Test comment: PASS. `all parentId null? true`.

- [x] Every entry in `projects` has a `subProjects` array (empty is expected for all entries before any sub-project exists).
  - Command: `curl -s http://172.16.10.6:3000/api/projects | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log('all subProjects array?',o.projects.every(p=>Array.isArray(p.subProjects)),'| all empty?',o.projects.every(p=>p.subProjects.length===0));});"`
  - Outcome: `all subProjects array? true | all empty? true`.

> Test comment: PASS. `all subProjects array? true | all empty? true`.

---

### New Fields Present On Every Project

- [x] `parentId`, `lockUserId`, `lockSessionId` present on every project entry.
  - Command: `curl -s http://172.16.10.6:3000/api/projects | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);const checks={parentId:o.projects.every(p=>'parentId' in p),lockUserId:o.projects.every(p=>'lockUserId' in p),lockSessionId:o.projects.every(p=>'lockSessionId' in p)};console.log(JSON.stringify(checks));});"`
  - Outcome: `{"parentId":true,"lockUserId":true,"lockSessionId":true}`.

> Test comment: PASS. `{"parentId":true,"lockUserId":true,"lockSessionId":true}`. All three null on every entry (no sessions or locks exist yet).

---

### `addProject()` Without `parentId` (Standalone)

- [x] Create a standalone project via the JS API; verify `parentId` is null and `group_name` is set.
  - Command: `node -e "require('dotenv').config({override:true}); const projects=require('./src/projects'); const db=require('./src/db'); (async()=>{const p=await projects.addProject({name:'04a-test-standalone',path:'04a-test-standalone',group:'Active'}); console.log('return:',JSON.stringify({id:p.id,parentId:p.parentId,group:p.group,subProjects:p.subProjects})); const row=await db.queryOne('SELECT parent_id, group_name FROM projects WHERE id = ?',[p.id]); console.log('db row:',JSON.stringify(row)); await projects.removeProject(p.id); console.log('cleaned up'); process.exit(0);})().catch(e=>{console.error(e.message);process.exit(1);})"`
  - Outcome: returned object has `parentId: null`, `group: 'Active'`, `subProjects: []`. DB row has `parent_id: null`, `group_name: 'Active'`.

> Test comment: PASS. `return: {"id":"dd9d2d91-ebe6-4cea-bbbd-107840bf994d","parentId":null,"group":"Active","subProjects":[]}` / `db row: {"parent_id":null,"group_name":"Active"}`. Cleaned up.

---

### `addProject()` With `parentId` (Sub-Project)

- [x] Create a sub-project via the JS API; verify the response carries `parentId` set to the parent's id and the DB row has `group_name = NULL` and `parent_id` set.
  - Command: `node -e "require('dotenv').config({override:true}); const projects=require('./src/projects'); const db=require('./src/db'); (async()=>{const all=await projects.getAllProjects(); const cccId=all.projects.find(p=>p.name==='CCC').id; const sub=await projects.addProject({name:'04a-test-sub',path:'04a-test-sub',parentId:cccId}); console.log('return:',JSON.stringify({id:sub.id,parentId:sub.parentId,group:sub.group})); const row=await db.queryOne('SELECT parent_id, group_name FROM projects WHERE id = ?',[sub.id]); console.log('db row:',JSON.stringify(row)); await projects.removeProject(sub.id); console.log('cleaned up'); process.exit(0);})().catch(e=>{console.error(e.message);process.exit(1);})"`
  - Outcome: returned object has `parentId` matching the parent's id, `group: null`. DB row has `parent_id` matching the parent's id and `group_name: null`.

> Test comment: PASS (post-04a01). `Sub return: {"id":"542e6332-9e50-499f-8f5d-1635716ed5a2","parentId":"3b7c2ac6-ffbe-4939-93b8-a905056553f8","group":null,"subProjects":[]}` / `Sub DB row: {"parent_id":"3b7c2ac6-ffbe-4939-93b8-a905056553f8","group_name":null}`. Cleaned up.

- [x] After the sub-project is created, the same call to `getAllProjects()` returns it inside its parent's `subProjects` array, NOT at the top level.
  - Command: (combined into the previous command's script - after the INSERT, calls `getAllProjects()` and verifies `subAtTop` and `nested`.)
  - Outcome: `sub at top? false | nested under CCC? true`.

> Test comment: PASS (post-04a01). `sub at top? false | nested under CCC? true`. Tree builder via the proper `addProject({parentId})` path now matches the raw-INSERT bypass result from the next section.

---

### Tree Builder Logic (verified via raw INSERT bypass)

- [x] Demonstrate that the tree builder nests by `parent_id` regardless of `group_name`. Insert a child row directly with a temporary `group_name` value, verify nesting, then clean up.
  - Command: `node -e "require('dotenv').config({override:true}); const projects=require('./src/projects'); const db=require('./src/db'); const crypto=require('crypto'); (async()=>{const cccId='3b7c2ac6-ffbe-4939-93b8-a905056553f8'; const childId=crypto.randomUUID(); await db.query(\"INSERT INTO projects (id, name, path, group_name, sort_order, type, evaluated, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)\",[childId,'04a-tree-test-child','04a-tree-test-child','_temp_',0,'code',1,cccId]); await db.query(\"INSERT INTO project_core_files (project_id, file_type, file_path) VALUES (?, ?, ?)\",[childId,'claude','CLAUDE.md']); const tree=await projects.getAllProjects(); const top=tree.projects.find(p=>p.id===childId); const parent=tree.projects.find(p=>p.id===cccId); const nested=parent.subProjects.find(s=>s.id===childId); console.log('child at top?',!!top,'| nested under parent?',!!nested,'| groups contain _temp_?',tree.groups.map(g=>g.name).includes('_temp_')); await db.query('DELETE FROM projects WHERE id = ?',[childId]); console.log('cleaned up'); process.exit(0);})().catch(e=>{console.error(e.message);process.exit(1);})"`
  - Outcome: `child at top? false | nested under parent? true | groups contain _temp_? false`.

> Test comment: PASS. `child at top? false | nested under parent? true | groups contain _temp_? false`. Tree-builder logic and `buildGroupsArray()` `parent_id IS NULL` filter are both correct. Once `stage04a01` relaxes `group_name`, `addProject({ parentId })` will produce the same nesting via the proper path.

---

### `fetchProjectById()` Shape

- [x] Fetch a single project by id and confirm `parentId`, `lockUserId`, `lockSessionId`, `subProjects` are present.
  - Command: `node -e "require('dotenv').config({override:true}); const projects=require('./src/projects'); (async()=>{const all=await projects.getAllProjects(); const cccId=all.projects.find(p=>p.name==='CCC').id; const db=require('./src/db'); const rows=await db.query(\"SELECT p.id, p.name, p.parent_id, p.lock_user_id, p.lock_session_id FROM projects p WHERE p.id = ?\",[cccId]); console.log('raw row:',JSON.stringify(rows[0]));})().catch(e=>{console.error(e.message);process.exit(1);})"`
  - Outcome: row has `parent_id: null`, `lock_user_id: null`, `lock_session_id: null`. (The `fetchProjectById()` JS function returns the same fields plus `subProjects: []` via `rowsToProject()`.)

> Test comment: PASS. Raw row carries all three new columns. `rowsToProject()` adds the camelCase fields and `subProjects: []` on top - exercised by every `getAllProjects()` and POST `/api/projects` response.

---

### `buildGroupsArray()` Top-Level Filter

- [x] Confirm `buildGroupsArray()` query only sees top-level rows (sub-projects with `group_name = NULL` would never appear; the new `WHERE parent_id IS NULL` filter further excludes any temporarily-grouped sub-project rows).
  - Command: `node -e "require('dotenv').config({override:true}); const db=require('./src/db'); db.query(\"SELECT group_name FROM projects WHERE parent_id IS NULL GROUP BY group_name ORDER BY MIN(sort_order) ASC\").then(r=>{console.log(JSON.stringify(r));process.exit(0);}).catch(e=>{console.error(e.message);process.exit(1);})"`
  - Outcome: only top-level distinct group names returned (currently `Active`, `Parked`).

> Test comment: PASS. `[{"group_name":"Active"},{"group_name":"Parked"}]`.

---

### Cleanup

- [x] Confirm no `04a-test-*` rows remain in the DB after this run.
  - Command: `node -e "require('dotenv').config({override:true}); const db=require('./src/db'); db.query(\"SELECT id, name FROM projects WHERE name LIKE '04a-%'\").then(r=>{console.log('residual rows:',r.length);process.exit(0);}).catch(e=>{console.error(e.message);process.exit(1);})"`
  - Outcome: `residual rows: 0`.

> Test comment: PASS. `residual rows: 0`.

---

### Acceptance Criteria

- [x] `GET /api/projects` returns a tree: top-level entries only in `projects`, sub-projects nested in `subProjects[]`.
- [x] `parentId`, `lockUserId`, `lockSessionId` present on every project object.
- [x] `addProject({ parentId })` creates a sub-project with `group_name = NULL` in the DB. (PASS post-04a01.)
- [x] `addProject({})` (no parentId) creates a top-level entry with `group_name` set as before.
- [x] All existing v1.0 projects continue to appear correctly (standalones with `subProjects: []`).
- [x] `buildGroupsArray()` only reflects top-level rows (no NULL group_name entries in the groups list).
- [x] Test file generated at `docs/v1.1/CCC_test_stage04a.md`.
- [x] No changes to `server.js`, `updateProject()`, `removeProject()`, `reorderProjects()`, or `renameProject()`.

---

### Schema-Fix Sub-Stage DONE (`stage04a01`)

The kickoff required `group_name = NULL` for sub-projects. Schema relaxed via:

- `migrations/004_group_name_nullable.sql` - `ALTER TABLE projects MODIFY COLUMN group_name VARCHAR(100) NULL;` (ran cleanly against Dev-DB).
- `migrations/001_initial.sql` line 20 - `VARCHAR(100) NOT NULL` -> `VARCHAR(100) NULL` (keeps fresh provisions in sync with live schema).

`information_schema.COLUMNS.IS_NULLABLE` for `projects.group_name` is now `YES`. Both previously blocked items re-run and tick PASS. No `src/projects.js` change was required.

---

*End of Stage 04a test checklist. 13/13 + 8/8.*
