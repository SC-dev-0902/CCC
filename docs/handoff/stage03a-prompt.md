# Stage 03a Kickoff Prompt — Schema & Migration Runner
*CCC v1.1 | First backend stage | No server.js changes*

---

## Context

Stage 02 is GO. The UI shell is complete. Stage 03 moves to the backend — replacing flat JSON storage with MariaDB.

Stage 03a is the foundation: create the database schema and the tools needed to apply it. Nothing in the running CCC server changes yet. `server.js`, `src/projects.js`, `src/sessions.js`, and all `public/` files are untouched. This stage only adds new files.

The MariaDB database (`ccc`) and user (`ccc`) already exist on Dev-DB. All connection details are in `.env` at the CCC project root. Read `.env` before asking for any credentials.

---

## What NOT to build

- No changes to `server.js`
- No changes to any existing `src/` files
- No changes to `public/`
- No seed/import script — that is Stage 03b
- No wiring of `src/db.js` into the server — that comes in Stage 03c
- No authentication, no sessions logic, no API changes

---

## Tasks

### Task 1 — Add mariadb dependency

Add `mariadb` to `package.json` dependencies and run `npm install`.

---

### Task 2 — Write migrations/001_initial.sql

Create the `migrations/` folder at the CCC project root. Write `migrations/001_initial.sql` with the following exact schema. Table creation order matters — FK dependencies must be satisfied.

```sql
-- CCC v1.1 - Initial schema
-- All tables use IF NOT EXISTS so this file is safe to re-run

CREATE TABLE IF NOT EXISTS `users` (
  `id`            CHAR(36)      NOT NULL,
  `username`      VARCHAR(100)  NOT NULL,
  `password_hash` VARCHAR(255)  NOT NULL,
  `role`          ENUM('admin', 'developer') NOT NULL DEFAULT 'developer',
  `created_at`    DATETIME      NOT NULL DEFAULT NOW(),
  `last_login`    DATETIME      NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `projects` (
  `id`              CHAR(36)      NOT NULL,
  `name`            VARCHAR(255)  NOT NULL,
  `path`            VARCHAR(512)  NOT NULL,
  `parent_id`       CHAR(36)      NULL,
  `group_name`      VARCHAR(100)  NOT NULL,
  `sort_order`      INT           NOT NULL DEFAULT 0,
  `type`            ENUM('code', 'config') NOT NULL DEFAULT 'code',
  `active_version`  VARCHAR(20)   NULL,
  `evaluated`       BOOLEAN       NOT NULL DEFAULT FALSE,
  `lock_user_id`    CHAR(36)      NULL,
  `lock_session_id` CHAR(36)      NULL,
  `created_at`      DATETIME      NOT NULL DEFAULT NOW(),
  `updated_at`      DATETIME      NULL ON UPDATE NOW(),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_projects_parent`    FOREIGN KEY (`parent_id`)    REFERENCES `projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_projects_lock_user` FOREIGN KEY (`lock_user_id`) REFERENCES `users`    (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Note: lock_session_id has no formal FK — avoids circular dependency with sessions table.

CREATE TABLE IF NOT EXISTS `project_core_files` (
  `project_id` CHAR(36)                              NOT NULL,
  `file_type`  ENUM('claude', 'concept', 'tasklist') NOT NULL,
  `file_path`  VARCHAR(512)                          NOT NULL,
  PRIMARY KEY (`project_id`, `file_type`),
  CONSTRAINT `fk_pcf_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id`         CHAR(36)                          NOT NULL,
  `project_id` CHAR(36)                          NOT NULL,
  `user_id`    CHAR(36)                          NOT NULL,
  `status`     ENUM('active', 'exited', 'error') NOT NULL DEFAULT 'active',
  `started_at` DATETIME                          NOT NULL DEFAULT NOW(),
  `ended_at`   DATETIME                          NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sessions_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sessions_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`    (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `settings` (
  `key`   VARCHAR(100) NOT NULL,
  `value` TEXT         NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `project_integrations` (
  `project_id`  CHAR(36)    NOT NULL,
  `integration` VARCHAR(50) NOT NULL,
  `config`      JSON        NULL,
  `enabled`     BOOLEAN     NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`project_id`, `integration`),
  CONSTRAINT `fk_pi_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### Task 3 — Write migrations/run.js

Write `migrations/run.js`. This is the migration runner used by `deploy.sh` on every deploy — it must be safe to run multiple times. Read credentials from `.env` at the CCC project root.

The runner must:
- Validate all `DB_*` env vars are present — exit 1 with a clear message if any are missing
- Read all `*.sql` files in `migrations/` in sorted order
- Execute each file against the database (`multipleStatements: true`)
- After all files run, print a table list via `SHOW TABLES` to confirm success
- Exit 0 on success, exit 1 on any error

---

### Task 4 — Write src/db.js

Write `src/db.js`. The connection pool must be lazy — created on first call, not on `require()`. This ensures the server can start even before the DB is configured.

Export three functions:
- `query(sql, params)` — get connection, run query, release
- `queryOne(sql, params)` — same as query, returns `rows[0] || null`
- `transaction(fn)` — get connection, begin, call `fn(conn)`, commit on success, rollback on error, always release

---

### Task 5 — Run migration

Run the migration runner from the CCC project root:

```
node migrations/run.js
```

Expected: all 6 tables listed, "Migration complete." at end. If it fails, report the error and stop — do not proceed to the test file.

---

### Task 6 — Generate test file

Write `docs/v1.1/CCC_test_stage03a.md` in the v1.0 sectioned format (same as `CCC_test_stage02d.md`).

Sections:
1. **Migration Files Present** — `migrations/` folder, `001_initial.sql`, `run.js`, `src/db.js` all exist; `mariadb` in `package.json`
2. **Migration Execution** — `node migrations/run.js` exits 0; all 6 tables listed in output
3. **Idempotency** — second run exits 0 without error
4. **Table Structure — users** — columns, PK, UNIQUE username
5. **Table Structure — projects** — all columns, self-FK on `parent_id`, FK to users on `lock_user_id`, no FK on `lock_session_id`
6. **Table Structure — remaining tables** — `project_core_files`, `sessions`, `settings`, `project_integrations` — PKs, FKs, CASCADE behaviour
7. **db.js Interface** — exports `query`, `queryOne`, `transaction`; no connection on require

---

### Task 7 — Update tasklist and commit

Check off all four Stage 03a items in `docs/v1.1/CCC_tasklist_v1.1.0.md`.

Commit and push:
```
git add .
git commit -m "v1.1.0 Stage 03a - MariaDB schema and migration runner"
git push
```

---

## Acceptance criteria

- `migrations/001_initial.sql`, `migrations/run.js`, `src/db.js` present and match the spec above
- `mariadb` in `package.json` dependencies
- `node migrations/run.js` exits 0, all 6 tables confirmed present
- Second run exits 0 (idempotent)
- `src/db.js` exports `query`, `queryOne`, `transaction` with lazy pool
- Test file at `docs/v1.1/CCC_test_stage03a.md`, 7 sections, v1.0 sectioned format
- Stage 03a tasks checked off in tasklist
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
