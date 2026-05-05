# CCC v1.1 - Stage 03c Kickoff Prompt: projects.js Rewrite

## Context

Stage 03b is complete. MariaDB is seeded with 17 projects, 51 core_files rows, and 6 settings rows on Dev-DB (172.16.12.11). CCC still reads from data/projects.json and data/settings.json. Stage 03c cuts over src/projects.js to use MariaDB exclusively. data/projects.json and data/settings.json are not deleted - they remain as backups.

Read these files before starting:
- `src/projects.js` (the file you are rewriting)
- `src/db.js` (the DB layer you will use)
- `data/projects.json` (so you know the exact data shape that currently flows through the app)

---

## Scope

**You are touching exactly two files:**

1. `src/projects.js` - full rewrite to DB
2. `server.js` - mechanical async updates only (see section below)

No other files. No new files. No changes to public/, src/sessions.js, src/versions.js, src/parser.js, src/usage.js, or any other file.

---

## No Free-Styling

This is a v1.1 stage. Implement exactly what this prompt specifies. If something is ambiguous or missing, stop and ask. Do not fill gaps with assumptions.

---

## DB Interface (src/db.js)

```js
const db = require('./db');

// Returns array of row objects. Params are positional (?).
await db.query(sql, params)

// Returns single row object or null.
await db.queryOne(sql, params)

// Runs callback inside a single transaction. conn has the same .query() and .queryOne() interface.
// Auto commit on success, auto rollback on throw.
await db.transaction(async (conn) => {
  await conn.query(sql, params);
});
```

`dotenv.config({ override: true })` is already called in db.js. Do not call it again in projects.js.

---

## Schema Reference

**Table: projects**
| Column | Type | Notes |
|--------|------|-------|
| id | CHAR(36) | UUID PK |
| name | VARCHAR | |
| path | VARCHAR | relative or absolute |
| parent_id | CHAR(36) | nullable FK -> projects.id |
| group_name | VARCHAR | maps to JSON `group` field |
| sort_order | INT | maps to JSON `order` field |
| type | VARCHAR | defaults 'code' |
| active_version | VARCHAR | maps to JSON `activeVersion` field |
| evaluated | TINYINT(1) | |
| lock_user_id | CHAR(36) | nullable |
| lock_session_id | CHAR(36) | nullable |
| created_at | DATETIME | |
| updated_at | DATETIME | |

**Table: project_core_files**
| Column | Type | Notes |
|--------|------|-------|
| project_id | CHAR(36) | FK -> projects.id CASCADE |
| file_type | VARCHAR | 'claude', 'concept', or 'tasklist' |
| file_path | VARCHAR | |

PK is (project_id, file_type).

**Table: settings**
| Column | Type | Notes |
|--------|------|-------|
| key | VARCHAR | PK |
| value | TEXT | |

---

## Column Name Mapping

JSON field -> DB column:
- `group` -> `group_name`
- `order` -> `sort_order`
- `activeVersion` -> `active_version`

All other field names are identical between JSON and DB.

---

## Return Shape Contract

`getAllProjects()` must return an object with this exact shape (same as current):

```json
{
  "groups": [
    { "name": "Active", "order": 0 },
    { "name": "Parked", "order": 1 }
  ],
  "projects": [
    {
      "id": "uuid-string",
      "name": "ProjectName",
      "path": "relative/or/absolute/path",
      "group": "Active",
      "order": 0,
      "coreFiles": {
        "claude": "CLAUDE.md",
        "concept": "docs/v1.0/ProjectName_concept_v1.0.md",
        "tasklist": "docs/v1.0/ProjectName_tasklist_v1.0.md"
      },
      "type": "code",
      "evaluated": true,
      "activeVersion": "1.0"
    }
  ]
}
```

Individual project objects returned by `addProject()` and `updateProject()` must also use camelCase field names (`group`, `order`, `activeVersion`, `coreFiles`) - not the raw DB column names.

---

## Groups Reconstruction

There is no groups table in the DB. Groups are derived from the data:

1. Query `SELECT DISTINCT group_name FROM projects ORDER BY MIN(sort_order)` (or equivalent)
2. Build the groups array:
   - `Active` is always order 0
   - `Parked` is always order 1
   - Any other group names found in the DB get order 2, 3, 4... in the order they appear
   - Protected groups (Active, Parked) always appear in the array even if no projects are currently in them
3. This logic lives in a private helper function `buildGroupsArray(rows)` that takes the distinct group names as input

---

## Function Specifications

### getAllProjects() - async

```
SELECT p.*, pcf.file_type, pcf.file_path
FROM projects p
LEFT JOIN project_core_files pcf ON p.id = pcf.project_id
ORDER BY p.sort_order ASC
```

Group rows by project id. For each project, assemble `coreFiles` from the joined pcf rows:
```js
coreFiles: {
  claude: row where file_type = 'claude' -> file_path (or 'CLAUDE.md' if missing),
  concept: row where file_type = 'concept' -> file_path (or '' if missing),
  tasklist: row where file_type = 'tasklist' -> file_path (or '' if missing)
}
```

Map column names back to JSON field names (`group_name` -> `group`, `sort_order` -> `order`, `active_version` -> `activeVersion`). Cast `evaluated` to boolean.

Build and prepend the groups array using `buildGroupsArray()`.

Return `{ groups, projects }`.

---

### addProject({ name, path, group, coreFiles, type, evaluated }) - async

Inside a `db.transaction()`:
1. Generate `id = crypto.randomUUID()`
2. Determine `sort_order`: `SELECT COUNT(*) FROM projects WHERE group_name = ?` - use count as the order (append to end of group)
3. `INSERT INTO projects (id, name, path, group_name, sort_order, type, evaluated) VALUES (...)`
   - `type` defaults to `'code'` if not provided
   - `evaluated` defaults to `true` if not provided
4. For each key in `coreFiles` (claude, concept, tasklist): `INSERT INTO project_core_files (project_id, file_type, file_path) VALUES (...)`
   - Default coreFiles if not provided: `{ claude: 'CLAUDE.md', concept: '', tasklist: '' }`
   - Skip INSERT for empty string file_path values (or insert them - either is fine, keep consistent)

Return the project object in the same shape as a project entry from `getAllProjects()`.

---

### updateProject(id, updates) - async

`updates` may contain any combination of: `name`, `group`, `coreFiles`, `activeVersion`, `evaluated`, `type`.

Map camelCase back to DB columns:
- `group` -> `group_name`
- `activeVersion` -> `active_version`

Build a SET clause dynamically from the allowed keys that are present in `updates`. If no allowed keys are present, return null (project not found equivalent).

If `updates.coreFiles` is present: upsert each key via `INSERT INTO project_core_files ... ON DUPLICATE KEY UPDATE file_path = VALUES(file_path)`.

If the group changed: do NOT call pruneEmptyGroups (no groups table to prune). Group membership is derived from projects rows, so moving a project to a new group_name is sufficient.

Return the updated project object in the same shape as getAllProjects() returns for a single project. Fetch the updated row after the UPDATE to return accurate data.

If `id` not found: return `null`.

---

### removeProject(id) - async

`DELETE FROM projects WHERE id = ?`

project_core_files rows are deleted automatically via CASCADE.

Return `true` if a row was deleted (`affectedRows > 0`), `false` if not found.

---

### reorderProjects(orderedIds) - async

`orderedIds` is an array of `{ id, group, order }` objects.

Inside a `db.transaction()`:
```
UPDATE projects SET group_name = ?, sort_order = ? WHERE id = ?
```
for each entry.

Return the result of `await getAllProjects()` after the updates.

---

### addGroup(name) - async

Query whether any project already has this group_name:
```
SELECT COUNT(*) FROM projects WHERE group_name = ?
```
If count > 0: return `null` (group already exists - server.js maps this to 409).

If count = 0: we cannot create an empty group without a groups table. Insert a settings row to record the extra group name:
```
INSERT INTO settings (`key`, value) VALUES ('extra_group_<name>', name)
ON DUPLICATE KEY UPDATE value = VALUES(value)
```

Return the current groups array (from `buildGroupsArray()` plus this new entry).

Note: empty groups persisted via settings are included in `buildGroupsArray()`. Add logic to also read `extra_group_%` settings keys and include them. Assign them order 2+ after Active and Parked.

---

### removeGroup(name) - async

```
SELECT COUNT(*) FROM projects WHERE group_name = ?
```
If count > 0: return `{ error: 'Group still has projects' }`.

If count = 0: delete the extra_group settings entry if present, then return the current groups array.

---

### resolveProjectPath(projectPath) - async

Priority order:
1. If `path.isAbsolute(projectPath)`: return as-is (synchronously, no DB call needed)
2. Try `process.env.PROJECT_ROOT` first (runtime env var from .env - correct for current machine)
3. If not set: try `SELECT value FROM settings WHERE key = 'project_root'`
4. If neither: return `projectPath` as-is

This function must remain `async` for consistency even though the absolute-path case is synchronous.

**Important:** `process.env.PROJECT_ROOT` takes precedence over the DB value because the DB stores the Mac path (`/Users/steinhoferm/SC-Development`) which is wrong on Dev-Web. The `.env` on each machine sets `PROJECT_ROOT` to the correct local path.

---

### renameProject(id, newName) - async

The filesystem operations in this function are unchanged (file renames, folder rename, CLAUDE.md content update). The only change is replacing `writeData(data)` calls with DB updates.

Specifically, replace the final `writeData(data)` call (Phase 8) with:
```js
await db.transaction(async (conn) => {
  await conn.query(
    'UPDATE projects SET name = ?, path = ? WHERE id = ?',
    [project.name, project.path, id]
  );
  // Update coreFiles paths if they changed
  for (const [fileType, filePath] of Object.entries(project.coreFiles)) {
    await conn.query(
      'INSERT INTO project_core_files (project_id, file_type, file_path) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE file_path = VALUES(file_path)',
      [id, fileType, filePath]
    );
  }
});
```

The function reads the current project from DB at the start (instead of from data). Use `db.queryOne` with a LEFT JOIN to get the project + coreFiles, then assemble the same `project` object the current code uses.

---

## server.js Changes (mechanical async only)

All projects.js functions are now async. server.js must await them. Make the minimum changes:

1. Every route callback that calls a `projects.*` function: add `async` keyword to the arrow function
2. Every `projects.*` call inside those callbacks: add `await`
3. `findProjectWithPath(projectId)` helper: make it `async function`, add `await` to its `getAllProjects()` call, and update all callers to `await findProjectWithPath(...)`
4. The `startupMigration` IIFE at the bottom: convert to `(async function startupMigration() { ... })()`; add `await` to all `projects.*` calls inside it
5. The inline usages of `projects.getAllProjects().projects.find(...)` in route handlers: these become `(await projects.getAllProjects()).projects.find(...)`

**What must NOT change in server.js:**
- Route paths, HTTP methods, request body shapes, response JSON shapes
- All non-projects logic (sessions, versions, settings readSettings(), file API, usage, WebSocket, etc.)
- Error response formats

---

## Progress Reporting

Report using this format only. One line per task, no prose:

- 🔴 Task N - [task name] - not started
- 🟡 Task N - [task name] - in progress
- ✅ Task N - [task name] - done
- ❌ Task N - [task name] - failed: [one-line reason]

Print the full task list at start (all 🔴). Update each line as work proceeds. After every response during execution, reprint the full current task list as a footer.

---

## Task List

Task 1 - projects.js rewrite: rewrite src/projects.js - all 8 exported functions as async, using db.js
Task 2 - server.js async updates: add async/await to all projects.* callsites in server.js
Task 3 - smoke test preparation: verify .env has DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, PROJECT_ROOT set correctly for Dev-Web
Task 4 - test file: generate docs/v1.1/CCC_test_stage03c.md
Task 5 - restart instruction: instruct Phet to restart CCC on Dev-Web before testing begins

---

## Testing (Dev-Web)

CCC v1.1 needs to run on Dev-Web for testing (it is not running there yet). Dev-Web has the NFS mount at /mnt/sc-development. The .env at /mnt/sc-development/CCC/.env must have all DB connection variables set.

After completing Tasks 1 and 2:
- Verify the .env at /mnt/sc-development/CCC/.env contains: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `PROJECT_ROOT`
- If any are missing, read /mnt/sc-development/CCC/.env.example to see the variable names, then STOP and inform Phet of what is missing (do not invent values)
- Do NOT start the server. Instruct Phet to start it: `cd /mnt/sc-development/CCC && node server.js`

---

## Test File

Before presenting the Go/NoGo gate, generate `docs/v1.1/CCC_test_stage03c.md`.

Test sections to cover:
1. Server starts without error (Dev-Web)
2. GET /api/projects - returns correct shape with 17 projects and groups array
3. POST /api/projects - adds a new project, appears in GET /api/projects
4. PUT /api/projects/:id - updates a project, change persists after restart
5. DELETE /api/projects/:id - removes the test project added in step 3
6. GET /api/projects/:id/versions - works (requires resolveProjectPath to return correct path)
7. PUT /api/projects-reorder - changes sort_order in DB
8. POST /api/projects/:id/rename - renames project, DB updated correctly
9. Session start - POST /api/sessions/:projectId works (project resolves to correct path)
10. data/projects.json untouched (backup intact)

Each item must include the exact command or curl to run it.

---

## Commit Message (for /go closure)

```
Stage 03c complete - projects.js rewrite to MariaDB
```

---

*End of Stage 03c kickoff prompt.*
