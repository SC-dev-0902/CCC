# Stage 03b Kickoff Prompt — JSON Import Script
*CCC v1.1 | Seed existing projects.json + settings.json into MariaDB*

---

## Context

Stage 03a is GO. The MariaDB schema is live on Dev-DB. All 6 tables exist. `src/db.js` is ready with `query()`, `queryOne()`, and `transaction()` helpers.

Stage 03b seeds the database from the existing flat JSON files. The running CCC server is still untouched — it continues reading from `data/projects.json` and `data/settings.json` as before. This stage only adds a new import script and runs it once.

All connection details are in `.env` at the CCC project root. Read `.env` before asking for any credentials.

---

## What NOT to build

- No changes to `server.js`
- No changes to any existing `src/` files
- No changes to `public/`
- Do NOT delete or modify `data/projects.json` or `data/settings.json` — they stay as backup
- No wiring of `src/db.js` into the running server — that is Stage 03c
- No authentication, no sessions logic, no API changes

---

## Tasks

### Task 1 — Write migrations/002_import.js

Create `migrations/002_import.js`. This is a standalone Node.js script that reads the existing JSON files and inserts their contents into MariaDB. It must be run from the CCC project root.

The script must:

1. Load `.env` from the CCC project root using `require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true })`
2. Resolve `data/projects.json` and `data/settings.json` relative to `__dirname + '/../data/'`
3. Use `require('../src/db.js')` — import the `transaction` helper
4. Run all inserts inside a single `transaction(async (conn) => { ... })` call
5. On completion, print a summary and call `process.exit(0)`
6. On any error, print the error and call `process.exit(1)`

**Projects import — inside the transaction:**

For each entry in `projects.json` → `projects` array:

```sql
INSERT IGNORE INTO projects
  (id, name, path, parent_id, group_name, sort_order, type, active_version, evaluated)
VALUES
  (?, ?, ?, NULL, ?, ?, ?, ?, ?)
```

Fields mapped from JSON:
- `id` -> `id`
- `name` -> `name`
- `path` -> `path`
- `group` -> `group_name`
- `order` -> `sort_order`
- `type` -> `type` (default to `'code'` if missing)
- `activeVersion` -> `active_version` (null if missing)
- `evaluated` -> `evaluated` (default to `false` if missing)
- `parent_id` = `NULL` for all (v1.0 is flat — no parent relationships)

After inserting each project, insert its `coreFiles` into `project_core_files`. Iterate over the keys `claude`, `concept`, `tasklist` — insert only if the key is present in the JSON:

```sql
INSERT IGNORE INTO project_core_files (project_id, file_type, file_path)
VALUES (?, ?, ?)
```

**Settings import — inside the same transaction:**

Map `settings.json` keys to the `settings` table. Use `ON DUPLICATE KEY UPDATE value = VALUES(value)` so re-runs are safe:

```sql
INSERT INTO settings (`key`, `value`) VALUES (?, ?)
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)
```

Key mapping:
- `projectRoot` -> key `project_root`
- `editor` -> key `editor`
- `shell` -> key `shell`
- `theme` -> key `theme`
- `filePatterns` -> key `file_patterns`, value = `JSON.stringify(settings.filePatterns)`
- `githubToken` -> key `github_token`
- `forgejoToken` -> key `forgejo_token` (only if present in settings.json)

**Summary output (after transaction commits):**

```
Import complete.
  Projects inserted: X  (skipped: Y)
  Core files inserted: X  (skipped: Y)
  Settings rows written: X
```

Track inserted vs skipped by checking the `affectedRows` returned by MariaDB for each INSERT IGNORE (affectedRows = 0 means the row already existed).

---

### Task 2 — Run the import on Dev-Web

Run from the CCC project root:

```
node migrations/002_import.js
```

Expected output: Import complete, with counts matching the JSON data (17 projects, all core files, 6 settings rows). If it fails, report the error and stop — do not proceed to the test file.

---

### Task 3 — Verify rows in DB

Run these queries on Dev-DB to confirm the import:

```sql
SELECT COUNT(*) AS project_count FROM projects;
SELECT COUNT(*) AS core_file_count FROM project_core_files;
SELECT `key`, LEFT(`value`, 60) AS value_preview FROM settings ORDER BY `key`;
```

Expected:
- `project_count` = 17
- `core_file_count` = 51 (17 projects x 3 core file types)
- Settings: 6 rows — `editor`, `file_patterns`, `github_token`, `project_root`, `shell`, `theme`

Report the actual output. If counts differ from expected, explain why before proceeding.

---

### Task 4 — Generate test file

Write `docs/v1.1/CCC_test_stage03b.md` in the v1.0 sectioned format (same as `CCC_test_stage03a.md`).

Sections:

1. **Script Present** — `migrations/002_import.js` exists
2. **Import Execution** — `node migrations/002_import.js` exits 0; summary output shown
3. **Projects Count** — `SELECT COUNT(*)` returns 17
4. **Core Files Count** — `SELECT COUNT(*)` returns 51
5. **Settings Rows** — all 6 expected keys present in settings table; `file_patterns` value is valid JSON
6. **Idempotency** — second run exits 0; counts unchanged; no duplicate rows
7. **Backup Files Intact** — `data/projects.json` and `data/settings.json` still present and unmodified
8. **Note: project_root value** — the imported `project_root` setting contains the Mac path (`/Users/steinhoferm/SC-Development`). This is expected — the Dev-Web runtime will use the `PROJECT_ROOT` env var from `.env` instead. No action needed here.

---

### Task 5 — Update tasklist and commit

Check off all five Stage 03b items in `docs/v1.1/CCC_tasklist_v1.1.0.md`.

Commit and push:
```
git add .
git commit -m "v1.1.0 Stage 03b - JSON import script"
git push
```

---

## Acceptance criteria

- `migrations/002_import.js` present and matches the spec above
- `node migrations/002_import.js` exits 0 with correct summary counts
- DB contains 17 project rows, 51 core file rows, 6 settings rows
- Second run exits 0 with no duplicate rows
- `data/projects.json` and `data/settings.json` present and unmodified
- Test file at `docs/v1.1/CCC_test_stage03b.md`, 8 sections, v1.0 sectioned format
- Stage 03b tasks checked off in tasklist
- Committed and pushed to Forgejo

---

## No-touch list

- `server.js`
- `src/projects.js`
- `src/sessions.js`
- `src/versions.js`
- `src/usage.js`
- `src/parser.js`
- `public/`
- `data/projects.json`
- `data/settings.json`
- `docs/v1.1/design/`
- `migrations/001_initial.sql`
- `migrations/run.js`
