# CCC v1.1 - Stage 03a Test Checklist
## MariaDB Schema & Migration Runner

Run all commands from the CCC project root (`/Users/steinhoferm/SC-Development/CCC` on Mac, or the equivalent on Dev-Web). DB credentials are loaded from `.env` automatically by `dotenv`.

Tick each item when passed, add comments under any that need fixing.

---

### Migration Files Present

- [ ] Confirm the `migrations/` folder exists at the CCC project root.
  - Command: `ls -la migrations/`
  - Outcome: directory exists; contains `001_initial.sql` and `run.js`.

> Test comment:

- [ ] Confirm `src/db.js` exists.
  - Command: `ls -la src/db.js`
  - Outcome: file present, non-empty.

> Test comment:

- [ ] Confirm `mariadb` is listed in `package.json` dependencies.
  - Command: `grep '"mariadb"' package.json`
  - Outcome: one matching line, version `^3.4.0` or compatible.

> Test comment:

- [ ] Confirm the `mariadb` package is installed under `node_modules/`.
  - Command: `node -e "console.log(require('mariadb/package.json').version)"`
  - Outcome: prints a version string (e.g. `3.5.2`). No error.

> Test comment:

---

### Migration Execution

- [ ] Run the migration runner from the CCC project root.
  - Command: `node migrations/run.js`
  - Outcome: prints `Running 001_initial.sql...`, then a list of all 6 tables (`project_core_files`, `project_integrations`, `projects`, `sessions`, `settings`, `users`), then `Migration complete.`. Exit code 0.

> Test comment:

- [ ] Confirm exit code is 0.
  - Command: `node migrations/run.js; echo "exit:$?"`
  - Outcome: last line reads `exit:0`.

> Test comment:

---

### Idempotency

- [ ] Re-run the migration without dropping or modifying any table.
  - Command: `node migrations/run.js; echo "exit:$?"`
  - Outcome: same output as first run, no errors, `exit:0`. The `IF NOT EXISTS` guards make every CREATE TABLE a no-op when the table already exists.

> Test comment:

- [ ] Confirm no duplicate or extra tables were created.
  - Command: `node -e "require('./src/db').query('SHOW TABLES').then(r => { console.log(r.map(x => Object.values(x)[0]).sort()); process.exit(0); })"`
  - Outcome: prints exactly `[ 'project_core_files', 'project_integrations', 'projects', 'sessions', 'settings', 'users' ]`.

> Test comment:

---

### Table Structure - users

- [ ] Inspect the `users` table layout.
  - Command: `node -e "require('./src/db').query('DESCRIBE users').then(r => { console.table(r); process.exit(0); })"`
  - Outcome: 6 columns in this order: `id` (char(36), PRI, NOT NULL), `username` (varchar(100), UNI, NOT NULL), `password_hash` (varchar(255), NOT NULL), `role` (enum 'admin','developer', default 'developer'), `created_at` (datetime, default `current_timestamp()`), `last_login` (datetime, nullable).

> Test comment:

- [ ] Confirm primary key is `id` and there is a UNIQUE index on `username`.
  - Command: `node -e "require('./src/db').query('SHOW INDEXES FROM users').then(r => { console.table(r); process.exit(0); })"`
  - Outcome: rows show `PRIMARY` on `id` and `uq_username` on `username` with `Non_unique = 0`.

> Test comment:

---

### Table Structure - projects

- [ ] Inspect the `projects` table layout.
  - Command: `node -e "require('./src/db').query('DESCRIBE projects').then(r => { console.table(r); process.exit(0); })"`
  - Outcome: 13 columns - `id` (PK), `name`, `path`, `parent_id` (nullable), `group_name`, `sort_order` (int, default 0), `type` (enum 'code','config', default 'code'), `active_version` (varchar(20), nullable), `evaluated` (boolean, default 0), `lock_user_id` (nullable), `lock_session_id` (nullable), `created_at` (datetime, default `current_timestamp()`), `updated_at` (datetime, nullable, ON UPDATE `current_timestamp()`).

> Test comment:

- [ ] Confirm self-referencing FK on `parent_id` and FK to `users.id` on `lock_user_id`. Confirm there is **no** FK on `lock_session_id`.
  - Command: `node -e "require('./src/db').query(\"SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND REFERENCED_TABLE_NAME IS NOT NULL\").then(r => { console.table(r); process.exit(0); })"`
  - Outcome: exactly two rows - `fk_projects_parent` -> `projects.id` (`parent_id`), and `fk_projects_lock_user` -> `users.id` (`lock_user_id`). `lock_session_id` does not appear.

> Test comment:

- [ ] Confirm both FKs use `ON DELETE SET NULL`.
  - Command: `node -e "require('./src/db').query(\"SELECT CONSTRAINT_NAME, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'projects'\").then(r => { console.table(r); process.exit(0); })"`
  - Outcome: both `fk_projects_parent` and `fk_projects_lock_user` show `DELETE_RULE = SET NULL`.

> Test comment:

---

### Table Structure - remaining tables

- [ ] `project_core_files`: composite PK `(project_id, file_type)`, FK to projects with CASCADE delete.
  - Command: `node -e "require('./src/db').query(\"SELECT CONSTRAINT_NAME, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_core_files'\").then(r => { console.table(r); process.exit(0); })"`
  - Outcome: `fk_pcf_project` with `DELETE_RULE = CASCADE`. Then `node -e "require('./src/db').query('SHOW INDEXES FROM project_core_files').then(r => { console.table(r); process.exit(0); })"` shows `PRIMARY` covering both `project_id` and `file_type`.

> Test comment:

- [ ] `sessions`: PK `id`, FK `project_id` -> projects, FK `user_id` -> users, both CASCADE.
  - Command: `node -e "require('./src/db').query(\"SELECT CONSTRAINT_NAME, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'sessions'\").then(r => { console.table(r); process.exit(0); })"`
  - Outcome: two rows - `fk_sessions_project` and `fk_sessions_user`, both with `DELETE_RULE = CASCADE`.

> Test comment:

- [ ] `settings`: simple key/value table, PK is `key`, no FKs.
  - Command: `node -e "require('./src/db').query('DESCRIBE settings').then(r => { console.table(r); process.exit(0); })"`
  - Outcome: exactly two columns - `key` (varchar(100), PRI, NOT NULL) and `value` (text, nullable). No FKs.

> Test comment:

- [ ] `project_integrations`: composite PK `(project_id, integration)`, FK `project_id` -> projects with CASCADE.
  - Command: `node -e "require('./src/db').query(\"SELECT CONSTRAINT_NAME, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_integrations'\").then(r => { console.table(r); process.exit(0); })"`
  - Outcome: `fk_pi_project` with `DELETE_RULE = CASCADE`. Composite PK confirmed via `SHOW INDEXES FROM project_integrations` showing `PRIMARY` on `project_id` and `integration`.

> Test comment:

---

### db.js Interface

- [ ] `src/db.js` exports exactly `query`, `queryOne`, and `transaction`.
  - Command: `node -e "console.log(Object.keys(require('./src/db')).sort())"`
  - Outcome: prints `[ 'query', 'queryOne', 'transaction' ]`.

> Test comment:

- [ ] Requiring `src/db.js` does not open a connection (lazy pool).
  - Command: `node -e "const t = Date.now(); require('./src/db'); console.log('require ms:', Date.now() - t)"`
  - Outcome: prints something like `require ms: <small>` and exits immediately. No DB connection has been attempted yet. (If a connection were opened on require, the process would hang or surface a network error here.)

> Test comment:

- [ ] `query()` returns rows from a real query, then exits cleanly.
  - Command: `node -e "require('./src/db').query('SELECT 1 AS one').then(r => { console.log(r); process.exit(0); })"`
  - Outcome: prints `[ { one: 1n } ]` (BigInt is fine - mariadb driver default) and exits 0.

> Test comment:

- [ ] `queryOne()` returns a single row.
  - Command: `node -e "require('./src/db').queryOne('SELECT 1 AS one').then(r => { console.log(r); process.exit(0); })"`
  - Outcome: prints `{ one: 1n }`. No array wrapping.

> Test comment:

- [ ] `transaction()` commits a no-op transaction and releases the connection.
  - Command: `node -e "require('./src/db').transaction(async (c) => c.query('SELECT 1')).then(r => { console.log('ok', r); process.exit(0); })"`
  - Outcome: prints `ok` followed by the query result, exits 0. No errors, no hung process.

> Test comment:

---

## Notes for the developer

- Server-side code (`server.js`, `src/projects.js`, `src/sessions.js`, etc.) was deliberately not touched in this stage. The DB layer exists but is not yet wired into the server - that is Stage 03c.
- No CCC server restart is required for this stage. The migration is verified by running `node migrations/run.js` directly.
- Stale `DB_*` env vars in your shell will be overridden by `.env` (both `migrations/run.js` and `src/db.js` use `dotenv.config({ override: true })`).
