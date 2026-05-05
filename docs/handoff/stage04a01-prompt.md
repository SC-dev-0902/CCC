# Stage 04a01 — Schema Fix: group_name Nullable
*CCC v1.1.0 | Fix sub-stage for 04a | Mirrors the 03d01 pattern*

---

## Non-Negotiable Rules

- No free-styling. Implement exactly what this prompt specifies.
- No SSH commands. Run commands directly in the terminal.
- No deploy step. NFS mount - edits are live immediately.
- Server restart required before testing.
- No em dash.

---

## Problem

`projects.group_name` is declared `VARCHAR(100) NOT NULL` in the live DB and in `migrations/001_initial.sql`. Sub-projects require `group_name = NULL`. The INSERT fails with: `Column 'group_name' cannot be null`.

---

## Task 1 — Write migration

Create `migrations/004_group_name_nullable.sql`:

```sql
-- CCC v1.1 - Fix: projects.group_name must allow NULL for sub-projects
ALTER TABLE projects MODIFY COLUMN group_name VARCHAR(100) NULL;
```

---

## Task 2 — Update migrations/001_initial.sql

Change the `group_name` column declaration in the `projects` CREATE TABLE from:

```
`group_name` VARCHAR(100) NOT NULL,
```

to:

```
`group_name` VARCHAR(100) NULL,
```

This keeps fresh installs consistent with the live schema after the migration runs.

---

## Task 3 — Run the migration

```
node migrations/run.js
```

Confirm output shows migration 004 applied successfully.

---

## Task 4 — Re-run the two blocked test items

Restart the CCC v1.1 server, then re-run the two BLOCKED items from `docs/v1.1/CCC_test_stage04a.md`:

- Item: `addProject({ parentId })` creates a sub-project with `group_name = NULL` in the DB
- Item: Tree structure - sub-project appears in parent's `subProjects[]`, not at top level

Tick both items PASS in the test file.

---

## Acceptance Criteria

- [ ] Migration 004 runs without error.
- [ ] `projects.group_name` allows NULL in the live DB.
- [ ] `migrations/001_initial.sql` declares `group_name` as NULL.
- [ ] Both previously BLOCKED items in `CCC_test_stage04a.md` now PASS.
- [ ] All 13 checklist items + 8 acceptance criteria in the test file are ticked PASS.

---

## When done

Report results and confirm the full test file is 100% PASS. Then wait for /tested.
