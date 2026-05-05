# Stage 03d01 — sessions.user_id Schema Fix
*CCC v1.1 | Fix sub-stage of Stage 03d*
*Read and execute this file in full. No deviation.*

---

## Context

Stage 03d built the sessions DB integration correctly per its kickoff prompt.
During smoke testing, session row inserts fail with:

  Column 'user_id' cannot be null

Root cause: `migrations/001_initial.sql` defines `user_id CHAR(36) NOT NULL` on the `sessions` table.
Stage 03d was designed with `user_id = NULL` intentionally (auth is Stage 05).
The kickoff prompt and the schema disagree. This sub-stage resolves the schema.

No changes to `server.js` or `src/sessions.js` are needed.

---

## Task 1 - New migration: relax user_id to nullable

Create `migrations/003_sessions_user_id_nullable.sql`:

```sql
-- Stage 03d01: relax sessions.user_id to nullable (auth wired in Stage 05)
ALTER TABLE sessions MODIFY user_id CHAR(36) NULL;
```

Run it against Dev-DB:

```
node migrations/run.js
```

Verify clean output (exit 0). Verify the column is now nullable:

```sql
SELECT IS_NULLABLE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'ccc' AND TABLE_NAME = 'sessions' AND COLUMN_NAME = 'user_id';
-- Expected: YES
```

---

## Task 2 - Update 001_initial.sql to match live schema

Edit `migrations/001_initial.sql` line that defines `user_id` on the `sessions` table.
Change:

```sql
`user_id` CHAR(36) NOT NULL,
```

To:

```sql
`user_id` CHAR(36) NULL,
```

This ensures a fresh `node migrations/run.js` on a clean DB produces a schema that matches live.

---

## Task 3 - Re-run blocked test items

Open `docs/v1.1/CCC_test_stage03d.md`. Re-run all items that were marked BLOCKED due to the schema error. Tick each one that now passes. Update the test file accordingly.

The items to re-run are the four blocked checklist items and three blocked acceptance criteria lines identified in the Stage 03d summary.

Restart the server before re-running (`npm start` from project root on Dev-Web - confirm the server is already running as PID 5055 or restart as needed).

Expected outcome after fix: all 22 checklist items PASS, all 8 acceptance criteria PASS.

---

## Task 4 - Commit

Commit message:

```
Stage 03d01 complete - sessions.user_id nullable
```

---

## Acceptance criteria

- `migrations/003_sessions_user_id_nullable.sql` exists and runs cleanly
- `migrations/001_initial.sql` `sessions.user_id` is `NULL` (not `NOT NULL`)
- All 22 items in `CCC_test_stage03d.md` pass
- All 8 acceptance criteria in `CCC_test_stage03d.md` pass
- Session row is inserted with every `createSession()` call, `user_id = NULL`
- No changes to `server.js` or `src/sessions.js`

---

*No em dash. No hardcoded credentials.*
