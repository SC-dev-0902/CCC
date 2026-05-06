# Stage 04b01 Kickoff Prompt — Scan Fix + Dev-Projects Import + Grouped Test Files

## Non-Negotiable Rules
- No free-styling. Implement exactly what is specified here.
- No em dash (—). Use hyphen with spaces ( - ) instead.
- No code in chat. Write to files.
- No deploy step. CC runs on Dev-Web where `/mnt/sc-development` is NFS-mounted.
- Commit to Forgejo on completion.

---

## Context

This sub-stage has three tasks in order:

1. **Fix the SC-Development root scan** — something in the codebase is crawling `/mnt/sc-development` on load. Find it and kill it.
2. **Import ccc-dev-projects** — three dummy test projects have been created at `/mnt/sc-development/ccc-dev-projects/`. Import them to the DB so they appear in the treeview.
3. **Grouped test files in Next.js treeview** — update the Testing section in `client/components/treeview-shell.tsx` to group test files by stage using the `stagePath` field.

---

## Task 1 — Fix the SC-Development Root Scan

The CCC server is crawling `/mnt/sc-development` on load. `PROJECT_ROOT` (`/mnt/sc-development`) must never be passed to any filesystem scanner.

### 1a. Find the call site

Search the entire codebase for anything that passes `PROJECT_ROOT` (or the resolved value of `process.env.PROJECT_ROOT`) to a filesystem read function (`fs.readdirSync`, `fs.readdir`, `scanVersions`, `scanVersionFiles`, or similar). Check:

- `server.js` — any route, startup function, or interval that scans the project root
- `src/versions.js` — any call that uses PROJECT_ROOT as `projectAbsPath`
- `client/` — any frontend call that triggers a root-level scan on page load
- Any `setInterval` or startup IIFE that scans for "new projects"

### 1b. Fix the call site

Remove or disable the code that triggers the root scan. If it is a planned future feature (e.g., the Stage 11 "New Projects" unregistered directory scanner), stub it out with a `// TODO Stage 11` comment and return an empty result instead of scanning.

### 1c. Add a hard guard in `src/versions.js`

At the top of `scanVersions()`, add:

```js
const projectRoot = process.env.PROJECT_ROOT
  ? require('path').resolve(process.env.PROJECT_ROOT)
  : null

if (projectRoot && require('path').resolve(projectAbsPath) === projectRoot) {
  console.error('[versions] scanVersions called with PROJECT_ROOT — refusing to scan. Fix the call site.')
  return { versions: [], hasFlatDocs: false }
}
```

This is a safety net. The root cause must also be fixed in 1b — the guard is a backstop, not the fix.

---

## Task 2 — Import ccc-dev-projects to DB

Three dummy projects have been created at `/mnt/sc-development/ccc-dev-projects/`:

| Folder | Group | Type | Notes |
|--------|-------|------|-------|
| `Alpha` | Active | code | v1.0 flat structure |
| `Bravo` | Parked | code | v1.0 flat structure |
| `Charlie` | Active | code | v1.1 structure with test files |

Import them using the existing `createProject()` function from `src/projects.js` (or direct DB INSERT — whichever is cleaner). Use a one-off Node.js script run directly on Dev-Web:

```
node -e "
const { createProject } = require('./src/projects');
(async () => {
  await createProject({ name: 'Alpha',   path: 'ccc-dev-projects/Alpha',   group: 'Active', type: 'code', evaluated: true });
  await createProject({ name: 'Bravo',   path: 'ccc-dev-projects/Bravo',   group: 'Parked', type: 'code', evaluated: true });
  await createProject({ name: 'Charlie', path: 'ccc-dev-projects/Charlie', group: 'Active', type: 'code', evaluated: true });
  console.log('done');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
" 
```

Run from `/mnt/sc-development/CCC`.

Verify all three appear in `GET /api/projects` response after import.

---

## Task 3 — Grouped Test Files in Next.js Treeview

**Prerequisite:** Tasks 1 and 2 complete. Charlie provides the real test data: `v1.0/docs/testfiles/` with `stage01/`, `stage01/stage01a/`, and `stage02/` folders.

### API shape

`GET /api/projects/:id/versions` returns a `testFiles` array on each version. After Stage 04b, each entry includes:

```json
{
  "name": "Charlie_test_stage01.md",
  "checked": 2,
  "total": 5,
  "stagePath": "stage01"
}
```

`stagePath` values:
- Single segment (e.g., `"stage01"`) — main stage test file
- Two segments (e.g., `"stage01/stage01a"`) — sub-stage test file, nested under parent stage
- Missing or empty — ungrouped fallback

### Required rendering

**Current:** test files render as a flat list under the Testing collapsible sub-header.

**Required:** grouped by stage:

```
Testing
  stage01
    Charlie_test_stage01.md  [2/5]
    stage01a
      Charlie_test_stage01a.md  [1/3]
  stage02
    Charlie_test_stage02.md  [0/4]
```

### Implementation rules

Build a nested tree from the `testFiles[]` array before rendering:

- Files with no `stagePath` go into an "Ungrouped" section at the bottom (defensive fallback)
- Single-segment `stagePath` — file belongs directly under that stage group
- Two-segment `stagePath` (e.g., `"stage01/stage01a"`) — file belongs under the sub-stage folder, which nests inside its parent stage group
- Limit depth to two levels (stage - sub-stage). No deeper nesting is currently produced by the scanner.

Stage group headers and sub-stage folder headers are non-clickable labels. Stage groups default to collapsed; expanding shows files and any sub-stage folders. Sub-stage folders have no separate toggle — they are always visible when their parent stage group is expanded.

Test file click behaviour is unchanged — opens the test runner panel.

No changes to the test runner panel, the Testing sub-header toggle, or any other part of the treeview.

---

## Acceptance Criteria

1. `/mnt/sc-development` is never traversed on page load or any API call — confirmed by absence of root directory entries appearing in logs or treeview
2. The guard in `scanVersions()` is in place and logs an error if called with PROJECT_ROOT
3. Alpha, Bravo, and Charlie appear in the treeview (Alpha + Charlie in Active, Bravo in Parked)
4. Charlie's version `v1.0` is visible when the project is expanded
5. Under Charlie v1.0 Testing section: `stage01` group contains `Charlie_test_stage01.md` and a `stage01a` sub-group containing `Charlie_test_stage01a.md`; `stage02` group contains `Charlie_test_stage02.md`
6. Stage group headers are non-clickable labels
7. Test file progress counts (`[checked/total]`) are correct
8. Test file click opens the test runner panel (unchanged)
9. Alpha and Bravo show no test files (their v1.0 flat structure has none) — no crash, just empty Testing section or no Testing section
10. No regressions in the rest of the treeview

Report acceptance criteria results when complete.
