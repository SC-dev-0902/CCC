# CCC v1.1 - Stage 03b Test Checklist
## JSON Import Script

Run all commands from the CCC project root (`/Users/steinhoferm/SC-Development/CCC` on Mac, or the equivalent on Dev-Web). DB credentials are loaded from `.env` automatically by `dotenv`. The expected counts assume Stage 03a's schema is in place and no manual rows have been added since.

Tick each item when passed, add comments under any that need fixing.

---

### Script Present

- [x] Confirm `migrations/002_import.js` exists at the CCC project root.
  - Command: `ls -la migrations/002_import.js`
  - Outcome: file present, non-empty.

> Test comment:

- [x] Confirm the script requires the shared DB layer.
  - Command: `grep "require('../src/db.js')" migrations/002_import.js`
  - Outcome: one matching line. The import wraps inserts in `transaction()` from `src/db.js`.

> Test comment:

---

### Import Execution

- [x] Run the import from the CCC project root.
  - Command: `node migrations/002_import.js`
  - Outcome: prints `Import complete.`, followed by three counts (`Projects inserted`, `Core files inserted`, `Settings rows written`). Exit code 0.

> Test comment:

- [x] Confirm exit code is 0.
  - Command: `node migrations/002_import.js; echo "exit:$?"`
  - Outcome: last line reads `exit:0`.

> Test comment:

---

### Projects Count

- [x] Confirm 17 project rows are present.
  - Command: `node -e "require('./src/db').queryOne('SELECT COUNT(*) AS c FROM projects').then(r => { console.log('projects:', Number(r.c)); process.exit(0); })"`
  - Outcome: prints `projects: 17`.

> Test comment:

- [x] Spot-check one project row by id.
  - Command: `node -e "require('./src/db').queryOne(\"SELECT id, name, group_name, type, active_version, evaluated FROM projects WHERE id = '3b7c2ac6-ffbe-4939-93b8-a905056553f8'\").then(r => { console.log(r); process.exit(0); })"`
  - Outcome: prints the CCC project row - `name: 'CCC'`, `group_name: 'Active'`, `type: 'code'`, `active_version: '1.1'`, `evaluated: 1`.

> Test comment:

---

### Core Files Count

- [x] Confirm 51 core file rows are present (17 projects x 3 file types).
  - Command: `node -e "require('./src/db').queryOne('SELECT COUNT(*) AS c FROM project_core_files').then(r => { console.log('core_files:', Number(r.c)); process.exit(0); })"`
  - Outcome: prints `core_files: 51`.

> Test comment:

- [x] Confirm each project has exactly three core file rows.
  - Command: `node -e "require('./src/db').query('SELECT project_id, COUNT(*) AS c FROM project_core_files GROUP BY project_id HAVING c <> 3').then(r => { console.log('rows with non-3 count:', r.length); process.exit(0); })"`
  - Outcome: prints `rows with non-3 count: 0`. Every project has all three of `claude`, `concept`, `tasklist`.

> Test comment:

---

### Settings Rows

- [x] Confirm all 6 expected setting keys are present.
  - Command: `node -e "require('./src/db').query('SELECT \`key\` FROM settings ORDER BY \`key\`').then(r => { console.log(r.map(x => x.key)); process.exit(0); })"`
  - Outcome: prints `[ 'editor', 'file_patterns', 'github_token', 'project_root', 'shell', 'theme' ]`.

> Test comment:

- [x] Confirm `file_patterns` value is valid JSON.
  - Command: `node -e "require('./src/db').queryOne(\"SELECT \`value\` FROM settings WHERE \`key\` = 'file_patterns'\").then(r => { const o = JSON.parse(r.value); console.log('keys:', Object.keys(o)); process.exit(0); })"`
  - Outcome: prints `keys: [ 'concept', 'tasklist' ]`. JSON parse does not throw.

> Test comment:

- [x] Confirm `forgejo_token` is NOT present (the source `settings.json` does not contain it).
  - Command: `node -e "require('./src/db').queryOne(\"SELECT COUNT(*) AS c FROM settings WHERE \`key\` = 'forgejo_token'\").then(r => { console.log('forgejo_token rows:', Number(r.c)); process.exit(0); })"`
  - Outcome: prints `forgejo_token rows: 0`.

> Test comment:

---

### Idempotency

- [x] Re-run the import script.
  - Command: `node migrations/002_import.js; echo "exit:$?"`
  - Outcome: prints `Import complete.` with `Projects inserted: 0  (skipped: 17)` and `Core files inserted: 0  (skipped: 51)`. Settings line still reads `Settings rows written: 6` because settings use `ON DUPLICATE KEY UPDATE` (this is expected and correct - no new rows are created). Exit code 0.

> Test comment:

- [x] Confirm row counts are unchanged after the second run.
  - Command: `node -e "(async () => { const db = require('./src/db'); const p = await db.queryOne('SELECT COUNT(*) AS c FROM projects'); const c = await db.queryOne('SELECT COUNT(*) AS c FROM project_core_files'); const s = await db.queryOne('SELECT COUNT(*) AS c FROM settings'); console.log('projects:', Number(p.c), 'core_files:', Number(c.c), 'settings:', Number(s.c)); process.exit(0); })()"`
  - Outcome: prints `projects: 17 core_files: 51 settings: 6`. No duplicate rows were inserted.

> Test comment:

---

### Backup Files Intact

- [x] Confirm `data/projects.json` is still present.
  - Command: `ls -la data/projects.json`
  - Outcome: file present, non-empty.

> Test comment:

- [x] Confirm `data/settings.json` is still present.
  - Command: `ls -la data/settings.json`
  - Outcome: file present, non-empty.

> Test comment:

- [x] Confirm the import script never wrote to either backup file.
  - Command: `grep -E "fs\.writeFile|fs\.appendFile|writeFileSync|appendFileSync" migrations/002_import.js || echo "no write calls"`
  - Outcome: prints `no write calls`. The script is read-only against the JSON files.

> Test comment:

---

### Note: project_root value

The imported `project_root` setting contains the Mac path (`/Users/steinhoferm/SC-Development`). This is expected. The Dev-Web runtime will use the `PROJECT_ROOT` env var from `.env` instead, so the DB value is informational at this stage and will not drive path resolution. No action needed here.

---

## Notes for the developer

- Server-side code (`server.js`, `src/projects.js`, `src/sessions.js`, etc.) was deliberately not touched in this stage. The JSON files remain authoritative for the running server until Stage 03c rewires `src/projects.js` to read from MariaDB.
- No CCC server restart is required for this stage. The import is verified entirely via direct DB queries.
- Stale `DB_*` env vars in your shell will be overridden by `.env` (the import script uses `dotenv.config({ override: true })`, same pattern as `migrations/run.js` and `src/db.js`).
