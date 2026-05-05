# Stage 04a — DB Schema for Nesting
*CCC v1.1.0 | Sub-Stage 04a | Follows Stage 03 GO (full MariaDB cutover complete)*

---

## Non-Negotiable Rules

- **No free-styling.** Implement exactly what this prompt specifies. If something is ambiguous, stop and ask.
- **No SSH commands.** CC runs directly on Dev-Web. Commands run in the terminal as-is.
- **No deploy step.** Dev-Web has the NFS share mounted at `/mnt/sc-development`. File edits are live immediately.
- **Server restart required before testing.** Any server-side change requires restarting the CCC v1.1 server before tests are run.
- **No em dash.** Use a hyphen with spaces ( - ) instead. Applies to all output including comments and test files.

---

## Context

The `projects` table already has `parent_id`, `lock_user_id`, and `lock_session_id` columns. They were defined in `migrations/001_initial.sql` during Stage 03a and are live in the DB. **No new migration is needed.**

Stage 04a is entirely a `src/projects.js` update. The goal is to make `getAllProjects()` return a tree structure and `addProject()` accept an optional `parentId`.

### Three-level project model

| Case | `parent_id` | `group_name` | Description |
|------|-------------|--------------|-------------|
| Container | NULL | Active / Parked / custom | Organisational wrapper (e.g. LeadSieve). No CC session, no SHP. Can be moved between groups. |
| Sub-project | container's id | NULL | Real project (e.g. leadsieve-service). Permanently bound to its container. Cannot be moved to another container or group. |
| Standalone | NULL | Active / Parked / custom | Classic single project (e.g. CCC). Behaves exactly as v1.0 projects did. |

---

## Task 1 — Verify DB columns exist

Before writing any code, run this query on Dev-DB and confirm all three columns are present:

```sql
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'ccc' AND TABLE_NAME = 'projects'
  AND COLUMN_NAME IN ('parent_id', 'lock_user_id', 'lock_session_id')
ORDER BY COLUMN_NAME;
```

Expected: three rows returned. If any column is missing, stop and report - do not proceed.

---

## Task 2 — Update `src/projects.js`

### 2a. Update SQL queries to include new columns

Both `getAllProjects` and `fetchProjectById` SELECT statements must add these three fields:

```
p.parent_id, p.lock_user_id, p.lock_session_id
```

### 2b. Update `rowsToProject()` helper

Add the following fields to the returned object:

```js
parentId:      r.parent_id       || null,
lockUserId:    r.lock_user_id    || null,
lockSessionId: r.lock_session_id || null,
subProjects:   []
```

`subProjects` is always initialised to `[]` here. The tree builder populates it.

### 2c. Update `getAllProjects()` - build tree structure

After assembling the flat project list, split and nest as follows:

1. Separate top-level entries (`parentId === null`) from sub-projects (`parentId !== null`).
2. Build a Map of top-level entries keyed by `id`.
3. For each sub-project: find its parent in the Map and push it into `parent.subProjects`. If the parent is not found (orphaned row), treat the sub-project as top-level.
4. The returned `projects` array contains **only top-level entries** (containers and standalones). Sub-projects appear exclusively inside their parent's `subProjects` array.

Return shape is unchanged at the outer level: `{ groups, projects }`.

### 2d. Update `buildGroupsArray()`

The current query scans all projects for group names. After this change it must only scan top-level rows:

```sql
SELECT group_name FROM projects WHERE parent_id IS NULL
GROUP BY group_name ORDER BY MIN(sort_order) ASC
```

Sub-projects have `group_name = NULL` and must not pollute the groups list.

### 2e. Update `addProject()`

Accept an optional `parentId` parameter in the input object.

**If `parentId` is provided (sub-project):**
- Set `group_name = NULL` in the INSERT.
- Derive `sort_order` by counting existing sub-projects with the same `parent_id`:
  ```sql
  SELECT COUNT(*) AS c FROM projects WHERE parent_id = ?
  ```
- Include `parent_id` in the INSERT.

**If `parentId` is null (container or standalone):**
- Behaviour unchanged: use the provided `group` for `group_name`, derive `sort_order` by counting siblings in the same group.

### 2f. Update `fetchProjectById()`

The SQL already needs `p.parent_id, p.lock_user_id, p.lock_session_id` added (done in Task 2a). The returned shape already gets the new fields via the updated `rowsToProject()` (done in Task 2b). No additional logic needed.

### 2g. No other function changes

Do NOT modify:
- `updateProject()` - no `parentId` support; sub-projects are permanently bound to their container
- `removeProject()` - CASCADE handles children automatically
- `reorderProjects()` - no change; sub-project ordering is out of scope for this sub-stage
- `renameProject()` - no change
- `resolveProjectPath()` - no change

---

## Task 3 — Verify `GET /api/projects` response shape

Restart the CCC v1.1 server, then call `GET /api/projects` and confirm:

1. The response contains `groups` and `projects` arrays.
2. Every entry in `projects` has `parentId: null`.
3. Every entry in `projects` has a `subProjects` array (may be empty for containers with no sub-projects yet and for standalones like CCC).
4. No sub-project IDs appear at the top level of `projects`.
5. `lockUserId` and `lockSessionId` are present on every project entry (null values are expected - no sessions or locks exist yet).

At this point all projects in the DB have `parent_id = NULL`, so `subProjects` will be empty for all entries. That is correct - no fixture data is needed.

---

## Task 4 — Generate test file

Generate `docs/v1.1/CCC_test_stage04a.md`.

The test file must cover:

1. **DB column verification** - all three columns exist with correct types and nullability.
2. **API response shape** - `GET /api/projects` returns `groups` and `projects`; every top-level entry has `parentId: null` and `subProjects: []`.
3. **New fields present** - `parentId`, `lockUserId`, `lockSessionId` present on every project in the response.
4. **`addProject()` with `parentId`** - POST a new sub-project with a valid `parentId`; verify the response includes `parentId` set to the parent's id and `group_name` is null in the DB.
5. **`addProject()` without `parentId`** - POST a new standalone; verify `parentId` is null in the response and `group_name` is set.
6. **Tree structure** - after adding the sub-project in step 4, call `GET /api/projects` and verify the sub-project appears inside its parent's `subProjects` array, NOT at the top level.
7. **`fetchProjectById()` shape** - GET a single project and confirm new fields are present.
8. **Cleanup** - delete both test projects added in steps 4 and 5.

---

## Acceptance Criteria

- [ ] `GET /api/projects` returns a tree: top-level entries only in `projects`, sub-projects nested in `subProjects[]`.
- [ ] `parentId`, `lockUserId`, `lockSessionId` present on every project object.
- [ ] `addProject({ parentId })` creates a sub-project with `group_name = NULL` in the DB.
- [ ] `addProject({})` (no parentId) creates a top-level entry with `group_name` set as before.
- [ ] All existing v1.0 projects continue to appear correctly (standalones with `subProjects: []`).
- [ ] `buildGroupsArray()` only reflects top-level rows (no NULL group_name entries in the groups list).
- [ ] Test file generated at `docs/v1.1/CCC_test_stage04a.md`.
- [ ] No changes to `server.js`, `updateProject()`, `removeProject()`, `reorderProjects()`, or `renameProject()`.

---

## When done

Report what was changed and present the acceptance criteria results. Then wait for testing.
