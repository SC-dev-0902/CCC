# Session Handover Pack - CCC
*Generated: 2026-05-05 | Version: v1.1.0 (Sub-Stage 03b complete) | Sub-Stage 03c next*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Version:** v1.1.0 - sub-stages 03a + 03b complete on 2026-05-05. Stage 03 main Go/NoGo gate is at the end of 03d (covers schema, import, projects.js rewrite, settings/sessions DB).
- **Active version in projects.json:** "1.1.0".
- **Stage:** v1.1 Sub-Stage 03b complete (closure commit `5c679b3`). Next: Cowork drafts Stage 03c kickoff prompt (`src/projects.js` rewrite to use MariaDB).
- **Status:** MariaDB schema is live on Dev-DB and seeded with the v1.0 JSON contents. The running CCC (still v1.0.7 on Mac localhost:3000) has NOT been switched over - it continues reading from `data/projects.json` and `data/settings.json` as before. The DB is a parallel store that nothing reads from yet. Stage 03c does the cutover.

---

## What Was Done This Session (Sub-Stage 03b)

### Files added (new this session)

- `migrations/002_import.js` - standalone import script, run from CCC project root. Reads `data/projects.json` and `data/settings.json` and seeds MariaDB inside a single `transaction()` from `src/db.js`. Idempotent (`INSERT IGNORE` for projects + core_files; `INSERT ... ON DUPLICATE KEY UPDATE` for settings). Tracks inserted-vs-skipped via `affectedRows`. Prints the canonical summary block on completion. `process.exit(0|1)` semantics.
- `docs/v1.1/CCC_test_stage03b.md` - 8 sections, 16 actionable items, v1.0 sectioned format (mirrors `CCC_test_stage03a.md`). All checks via `node -e ... src/db.js` snippets - no `mysql` CLI required. All 16 items ticked this session.
- `docs/handoff/stage03b-prompt.md` - kickoff prompt (Cowork-authored before this session, committed during 03b).

### Files changed

- `docs/v1.1/CCC_tasklist_v1.1.0.md` - all five Sub-Stage 03b items ticked.

### Commits this session

| Hash | Message | Notes |
|---|---|---|
| `a618b19` | `v1.1.0 Stage 03b - JSON import script` | Work commit. Followed the kickoff Task 5 message verbatim. Same canonical-format deviation as Stage 03a's work commit. Don't amend. |
| `5c679b3` | `Stage 03b complete - JSON import script` | /go closure commit. Carries the ticked test file. Canonical format applied here. |

Both pushed to Forgejo (`origin`). One /eod SHP commit will follow this file write.

### Import result

`node migrations/002_import.js` first run, from Mac connecting to Dev-DB at 172.16.12.11:
```
Import complete.
  Projects inserted: 17  (skipped: 0)
  Core files inserted: 51  (skipped: 0)
  Settings rows written: 6
```
Second run (idempotency):
```
Import complete.
  Projects inserted: 0  (skipped: 17)
  Core files inserted: 0  (skipped: 51)
  Settings rows written: 6
```
Final DB counts: `projects: 17, project_core_files: 51, settings: 6`.

### Test results (all 16 items pass)

| Section | Result |
|---|---|
| Script Present | file exists 3976 B; `require('../src/db.js')` matched |
| Import Execution | clean stdout, exit 0 |
| Projects Count | 17 rows; CCC spot-check returns expected fields |
| Core Files Count | 51 rows; every project has exactly 3 (claude/concept/tasklist) |
| Settings Rows | 6 keys present (`editor, file_patterns, github_token, project_root, shell, theme`); `file_patterns` parses as JSON (`{ concept, tasklist }`); `forgejo_token` absent (correctly skipped - source `settings.json` has no `forgejoToken` field) |
| Idempotency | second run exits 0; counts unchanged |
| Backup Files Intact | both JSON files present and unmodified; `grep` confirms no write calls in script |

---

## Decisions Made

- **Carry-forward files left unstaged again.** `data/projects.json` (M) and `docs/handoff/CCC_recovery.md` (M) are pre-existing modifications from earlier sessions, not 03b's work. Same precedent as Stage 03a SHP. Both need a separate cleanup pass (recovery file: `git rm --cached` + `.gitignore`).
- **Settings count line stays at "6" on every run by design.** `INSERT ... ON DUPLICATE KEY UPDATE` cannot distinguish "no change" from "wrote a value", so the script counts every settings write attempt. Correct behaviour for the table; documented in the test file's idempotency item so it's not misread as a duplicate-row warning.
- **`forgejo_token` is correctly absent from the settings table.** The kickoff prompt says: insert `forgejoToken` only if present in `settings.json`. The source file does not include it (the active token lives in `.env`), so the import skips it. The test file has an explicit assertion for this.
- **`/go` closure commit format adopted.** Stage 03a's SHP flagged the canonical-format deviation. Same situation arose this stage with the kickoff-prescribed work-commit message; `/go` triggered an explicit `Stage 03b complete - ...` closure commit (`5c679b3`) carrying the ticked test file. Future stages: prefer canonical format on the work commit too. Don't amend old commits.
- **`forgejo_token` mapping kept in the script even though source has no value.** Mapping table includes it for forward-compatibility - if `settings.json` ever gains a `forgejoToken` field, the import will pick it up automatically. Cost: zero. No-op when absent.

---

## Full Project Timeline

| Commit | Description | Date |
|---|---|---|
| ... v1.0.0 - v1.0.7 ... | (see prior SHPs) | 2026-02-27 to 2026-04-24 |
| `ab9bee7` | v1.1.0 Stage 00a+00b - TrueNAS share mounted | 2026-05-04 |
| `5f5d03f` | v1.1.0 Stage 01f - wired design preview live | 2026-05-04 |
| `fd0265b` | v1.1.0 Stage 02a - parent/sub hierarchy | 2026-05-04 |
| `a7292ed` | SHP update - Stage 02a GO | 2026-05-04 |
| `3749432` | v1.1.0 Stage 02b - locking badge + Start Session | 2026-05-05 |
| `fdbc231` | SHP update - Stage 02b GO | 2026-05-05 |
| `a98d2a8` | v1.1.0 Stage 02c - top menu diodes | 2026-05-05 |
| `1389e28` | SHP update - Stage 02c GO | 2026-05-05 |
| `9d645b9` | Stage 02d complete - treeview search/filter polish | 2026-05-05 |
| `5a53802` | Stage 02 complete - UI Shell (main gate GO) | 2026-05-05 |
| `722efa9` | SHP update - Stage 02 GO, Stage 03 next | 2026-05-05 |
| `2225181` | v1.1.0 Stage 03a - MariaDB schema and migration runner | 2026-05-05 |
| `4e74a7c` | SHP update - Stage 03a complete, /tested + Stage 03b next | 2026-05-05 |
| `a618b19` | **v1.1.0 Stage 03b - JSON import script** (work) | 2026-05-05 |
| `5c679b3` | **Stage 03b complete - JSON import script** (closure) | 2026-05-05 |

Pushed to Forgejo. **GitHub push pending** for everything from `a7292ed` onwards (11+ commits) - Phet runs `git push github main` from terminal once the keychain is workable.

Tags: `v1.0.0` -> `v1.0.7`. v1.1.0 not yet tagged.

---

## Architecture & File Map (v1.1 active surface, post-03b)

| Area | File / Path |
|---|---|
| **Backend - DB layer (Stage 03a, unchanged 03b)** | |
| MariaDB schema | `migrations/001_initial.sql` |
| Schema migration runner | `migrations/run.js` |
| DB layer (lazy pool, query/queryOne/transaction) | `src/db.js` |
| **Backend - Data import (NEW Stage 03b)** | |
| JSON -> DB import script | `migrations/002_import.js` |
| **Frontend (unchanged from Stage 02)** | |
| Design preview source (Next.js 16) | `docs/v1.1/design/stage01a-dark-light/` |
| Treeview component | `components/treeview-shell.tsx` |
| App shell + top menu | `components/app-shell.tsx` |
| Theme tokens | `components/theme-context.tsx` |
| Component gallery | `components/component-gallery.tsx` |
| Dummy data | `lib/dummy-data.ts` |
| Static build output | `docs/v1.1/design/preview/` |
| Apache alias config | `/etc/apache2/conf-available/CCC-design-preview-alias.conf` (Dev-Web only) |
| **Docs** | |
| Stage kickoff prompts (02a-03b) | `docs/handoff/stage02{a,b,c,d}-prompt.md`, `docs/handoff/stage03{a,b}-prompt.md` |
| Stage test files (02a-03b) | `docs/v1.1/CCC_test_stage02{a,b,c,d}.md`, `docs/v1.1/CCC_test_stage03{a,b}.md` |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` |
| v1.1 concept doc | `docs/v1.1/CCC_concept_v1.1.0.md` |

CCC v1.0 server code (`server.js`, `src/parser.js`, `src/sessions.js`, `src/projects.js`, `src/versions.js`, `src/usage.js`, `public/*`) is **untouched**. Stage 03c is the cutover - rewrite `src/projects.js` to use DB instead of `data/projects.json`.

---

## API Endpoint Inventory (current - v1.0.7 server, unchanged in v1.1 to date)

All endpoints live in `server.js`. Stage 03b added no routes (data import only).

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Serve `public/index.html` |
| GET | `/api/projects` | List all registered projects |
| POST | `/api/projects` | Register a new project |
| PUT | `/api/projects/:id` | Update project (name, group, coreFiles, activeVersion, evaluated) |
| DELETE | `/api/projects/:id` | Remove a project |
| DELETE | `/api/projects/:id/versions/:version` | Delete a specific version (active deletable with auto-fallback) |
| GET | `/api/projects/:id/versions` | List versions per `scanVersionFiles` |
| GET | `/api/projects/:id/files` | Tree of project's coreFiles |
| GET | `/api/file/:projectId` | Read a single file |
| PUT | `/api/file/:projectId` | Write a single file |
| GET | `/api/settings` | Read global settings |
| PUT | `/api/settings` | Update global settings |
| WS | `/ws` | xterm.js websocket - PTY session multiplexer |
| GET | `/design-preview/...` | Express static fallback (redundant in prod) |

---

## Database Schema & Seed (post-03b)

Database: `ccc` on Dev-DB (`172.16.12.11:3306`, MariaDB 10.11.14). User: `ccc`.

| Table | Rows after 03b | Columns (key fields only) | FKs |
|---|---|---|---|
| `users` | 0 | id (PK CHAR(36)), username (UNIQUE), password_hash, role (admin/developer), created_at, last_login | - |
| `projects` | **17** | id (PK), name, path, parent_id, group_name, sort_order, type, active_version, evaluated, lock_user_id, lock_session_id, created_at, updated_at | parent_id -> projects.id (SET NULL); lock_user_id -> users.id (SET NULL); **lock_session_id intentionally has no FK** |
| `project_core_files` | **51** | (project_id, file_type) PK; file_path | project_id -> projects.id (CASCADE) |
| `sessions` | 0 | id (PK), project_id, user_id, status, started_at, ended_at | project_id, user_id (both CASCADE) |
| `settings` | **6** | key (PK), value | - |
| `project_integrations` | 0 | (project_id, integration) PK; config (JSON), enabled | project_id -> projects.id (CASCADE) |

All InnoDB, utf8mb4. All `CREATE TABLE IF NOT EXISTS` so `migrations/run.js` is idempotent.

### Settings rows seeded (post-03b)

| `key` | Source field | Value summary |
|---|---|---|
| `project_root` | `projectRoot` | `/Users/steinhoferm/SC-Development` (Mac path - informational; runtime uses `PROJECT_ROOT` env var) |
| `editor` | `editor` | `CotEditor` |
| `shell` | `shell` | `/bin/zsh` |
| `theme` | `theme` | `dark` |
| `file_patterns` | `filePatterns` | `JSON.stringify({ concept, tasklist })` - re-parsed on read |
| `github_token` | `githubToken` | empty string (placeholder; real token in `.env`) |

`forgejo_token` is **not** in `settings` - source `settings.json` has no `forgejoToken` field, so the import correctly skipped it. Mapping is in place for forward-compat.

### DB layer interface (`src/db.js`, unchanged this stage)

- `await db.query(sql, params)` - returns array of row objects
- `await db.queryOne(sql, params)` - returns single object or null
- `await db.transaction(async (conn) => { ... })` - auto begin/commit/rollback/release
- Pool is lazy: built on first call, not on `require()`. Survives DB unreachable at server-start.
- `dotenv.config({ override: true })` so `.env` always wins over shell vars.

### Migration scripts

- `migrations/run.js` - schema runner. Reads sorted `migrations/*.sql`, applies them with `multipleStatements: true`. Idempotent via `IF NOT EXISTS`. Exit 0/1.
- `migrations/002_import.js` - data importer. Reads `data/projects.json` + `data/settings.json`, seeds via `transaction()` from `src/db.js`. Idempotent via `INSERT IGNORE` and `ON DUPLICATE KEY UPDATE`. Exit 0/1.

Both scripts use `dotenv.config({ override: true })` with the project-root `.env`.

---

## Frontend State Model (preview app, unchanged this session)

`app-shell.tsx`:
- `Diode.hover` per diode -> tooltip
- `sidebarWidth: number` (200-600), localStorage `ccc-sidebar-width`, default 320
- `dragging: boolean`
- `theme: "dark" | "light"`

`treeview-shell.tsx`:
- `query: string` - filter input
- `filteredActive`, `filteredParked`, `filteredNew` - all `useMemo([query])`
- `ProjectRow.expanded` - local state, default per project id
- `ProjectRow.forceExpand` - filter override, never mutates `expanded`
- `ProjectRow` progress-bar guard: `!hasChildren && project.stageProgress`
- `SubProjectRow.expanded` independent of filter
- `StartSessionButton.hover`

Sidebar render order: header -> search -> NEW (only if matches) -> ACTIVE (always shows header; "no match" if filtered empty) -> PARKED (always shows header; "empty" if no data) -> legend.

---

## Key Technical Details

### Lazy DB pool

`src/db.js` builds the pool on first call, not on `require()`. This lets `server.js` start before the DB is reachable. Once a connection is needed, the pool builds and from then on connections are reused with `connectionLimit: 10`.

### Why `lock_session_id` has no FK

`projects.lock_session_id` -> `sessions.id` would create a circular dependency: `sessions` has a FK to `projects`. On schema creation, sessions doesn't exist yet when projects is created. Avoided by leaving `lock_session_id` as a CHAR(36) without a formal FK constraint. Application code is responsible for ensuring the column references a real session.

### Idempotent import logic

- Projects + core files: `INSERT IGNORE`. `affectedRows = 0` -> already existed -> increment `skipped`. `> 0` -> increment `inserted`.
- Settings: `INSERT ... ON DUPLICATE KEY UPDATE value = VALUES(value)`. Always counted as written - this is the canonical pattern for upserts and the count line is always equal to the number of source-file keys mapped, regardless of whether the underlying row changed. Tested: second run still prints `Settings rows written: 6` while the row count of `settings` stays at 6.

### `dotenv override: true` everywhere

Stale `DB_*` exports in the shell silently win over `.env` by default (dotenv keeps existing `process.env`). All env-loading entry points in CCC (`migrations/run.js`, `src/db.js`, `migrations/002_import.js`) use `dotenv.config({ override: true })` to make `.env` authoritative. New env-loading code must follow the same pattern.

### Container vs single-project rendering rule (unchanged)

`Project` with `subProjects` -> container, no progress bar at parent. `Project` without `subProjects` -> single-project mode, bar at parent (e.g. CCC). Code guard: `!hasChildren && project.stageProgress`.

### Filter expand/collapse contract (unchanged)

`forceExpand` overrides via `effectiveExpanded`, never mutates `expanded`. After Escape, expand state restores to whatever was set locally before the filter.

### Path resolution (unchanged)

Project paths in `data/projects.json` are relative to `settings.projectRoot`. SHP path: `docs/handoff/{ProjectName}_shp.md`.

### Version model (unchanged)

`activeVersion` field in `projects.json` is the only pointer. `docs/vX.Y/` for major.minor; `docs/vX.Y/vX.Y.Z/` for patches. No filesystem symlinks.

### Test file naming regex (unchanged)

`/_test_stage\d+[a-z]*\d*\.md$/` - supports `_test_stage11.md`, `_test_stage11a.md`, `_test_stage07ac.md`, `_test_stage11a01.md`, `_test_stage07ac01.md`. Anything else is invisible to CCC.

### Status model (parser, unchanged)

Five states: WAITING_FOR_INPUT (red `#9B2335`), RUNNING (yellow `#B7791F`), COMPLETED (green `#276749`), ERROR (orange `#7A1828`), UNKNOWN (grey `#A0AEC0`). PTY env must clear both `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT`.

---

## Dependencies

CCC server (Node):
- `express@^4.21.2`
- `node-pty@^1.2.0-beta.11` (Node v25 compat)
- `ws@^8.19.0`
- `marked@^17.0.3`
- `dotenv@^16.4.7`
- `mariadb@^3.4.0` (3.5.2 installed)
- `@xterm/addon-fit@^0.11.0`, `@xterm/xterm@^6.0.0` (vendored to `public/` for browser)
- Dev: `playwright@^1.58.2`

Next.js preview app (`docs/v1.1/design/stage01a-dark-light/`): unchanged.
- `next@16.2.4` (Turbopack, static export), `react@19`, `lucide-react`, `tailwindcss`, shadcn/ui subset.

Dev-Web build dir: `/tmp/stage01a-build/`. Re-run `npm install` if `next: not found`.

---

## Apache & Deployment

### v1.1 design preview (live, unchanged)
- URL: `http://172.16.10.6/CCC/design-preview/`
- Apache `Alias` -> `/mnt/sc-development/CCC/docs/v1.1/design/preview/`
- Updates: rebuild on Dev-Web `/tmp/stage01a-build/`, rsync `out/` -> `preview/`. No reload required.
- Apache config: `/etc/apache2/conf-available/CCC-design-preview-alias.conf` (Dev-Web only, not in repo).

### CCC server v1.1 (not yet deployed to Dev-Web)
- Stage 03a + 03b added DB layer and seed but did NOT wire into server.js. CCC is still v1.0.7 on Mac localhost:3000.
- v1.1 server-side smoke test will need a CCC instance on Dev-Web - planned for Stage 03c+.

### Mac CCC v1.0.7 (production, untouched)
- localhost:3000 on Mac, unchanged across the entire v1.1 stage cycle so far.

---

## Known Gotchas (cumulative for v1.1, with new ones from 03b)

1. **Test URL is the design preview, not port 3000.** `http://172.16.10.6/CCC/design-preview/` for visual work.
2. **Browser caching is sticky.** Cmd+Shift+R required after every preview build.
3. **Build on Dev-Web local `/tmp/`**, not on the share. ~2.5s rebuild after first install.
4. **`next.config.mjs` must set `basePath: '/CCC/design-preview'`.**
5. **`server.js /design-preview` Express route is redundant** in prod (Apache serves static).
6. **Apache config not in repo** - `/etc/apache2/conf-available/CCC-design-preview-alias.conf` lives on Dev-Web only.
7. **DNS:** `kkh01vdweb01.mcsfam.local` doesn't resolve from Mac. Use IP `172.16.10.6` or `.mng.` hostname.
8. **GitHub push requires terminal credentials.** Bash tool can't reach macOS keychain. Phet pushes manually.
9. **SSH key must be loaded into ssh-agent** at session start: `! ssh-add --apple-use-keychain ~/.ssh/id_ed25519`.
10. **`/tmp/stage01a-build/` not persistence-guaranteed.** If `next: not found`, run `npm install` once.
11. **`docs/handoff/CCC_recovery.md` is legacy-tracked.** Modifies mid-session even after deletion. Carry-forward: `git rm --cached` + `.gitignore`.
12. **Hover styles use `useState`, not Tailwind hover.** Theme tokens are dynamic.
13. **Click handlers on row-internal elements need `e.stopPropagation()`** so they don't toggle the row.
14. **Container vs single-project rendering rule.** `!hasChildren && project.stageProgress` in `ProjectRow`.
15. **Filter never mutates expand state.** `forceExpand` override only; local `expanded` survives.
16. **Distinct empty copy: ACTIVE = `no match`, PARKED = `empty`.** Don't unify.
17. **dotenv default does NOT override existing `process.env`.** Stale shell `DB_*` exports silently win. All CCC env-loading entry points use `dotenv.config({ override: true })` - keep the pattern.
18. **Provisioned DB user is `ccc`, not `ccc_app`.** Concept doc + `.env.example` corrected. Any `ccc_app` reference in old docs is wrong.
19. **MariaDB sees Mac connections from `hhq01vifw01.mng.mcsfam.local`** (NAT through firewall). The `ccc` user's GRANT must cover that host pattern.
20. **Forgejo macOS keychain entry stale.** `git push` fails with "credentials are incorrect or have expired" until refreshed. Workaround: inline `credential.helper` with `FORGEJO_TOKEN` from `.env`. Recommended fix: refresh keychain entry once in a regular terminal.
21. **`lock_session_id` has no FK** (would create circular dep with sessions). Application code must enforce referential integrity.
22. **(NEW)** **`Settings rows written: N` always equals the number of source-file keys mapped, every run.** This is `INSERT ... ON DUPLICATE KEY UPDATE` semantics - the script counts write attempts, not net new rows. Verify idempotency via `SELECT COUNT(*) FROM settings`, not via the import's printed counter.
23. **(NEW)** **`forgejo_token` is intentionally absent from the `settings` table.** The source `settings.json` does not include `forgejoToken`. The import mapping covers it for forward-compat but skips on missing. Real Forgejo token lives in `.env`.
24. **(NEW)** **`.env` has at least one value with shell-special characters that aren't quoted.** When sourcing `.env` for the inline Forgejo credential helper, a token leaked as a stray bareword (`./.env:19: command not found: <fragment>`). Push still went through, but a password fragment surfaced in shell output. Quote all `.env` values (`KEY="value"`) to prevent this leak class.
25. **(NEW)** **`/go` closure commit pattern.** Sub-stage closure: `Stage NNx complete - <brief>`. Prefer applying canonical format on the work commit (kickoff prompts sometimes prescribe a different message - the `Stage 03a` and `Stage 03b` SHPs both flag this deviation). Don't amend old commits; add an explicit closure commit if needed.

---

## Open Items / Carry-Forwards

- **Phet still hasn't run the Stage 03a test file.** This was carried from the previous session. Stage 03a's items can be ticked off retroactively or be allowed to roll into Stage 03's main gate verification. Decide before main 03 Go/NoGo.
- **GitHub push pending** for all v1.1 stage commits, both 03b commits, and this SHP commit - Phet runs `git push github main` once.
- **Forgejo keychain refresh** needed (gotcha 20). Until done, every push needs the inline credential-helper trick.
- **`.env` value quoting needed** (gotcha 24).
- **Recovery file legacy-tracked.** `git rm --cached docs/handoff/CCC_recovery.md` + `.gitignore` cleanup.
- **`data/projects.json`** working-tree `M` carry-forward from earlier session - untouched, needs separate review.
- **Apache alias not version-controlled.** Capture in `deploy.sh` or infra doc later.
- **CCC v1.1 instance not running on Dev-Web.** Comes up in Stage 03c+ when DB is wired into the server.
- **v1.1.0 not yet tagged.**
- **Stage 03 main Go/NoGo gate** is at the end of 03d (after schema, import, projects.js rewrite, settings/sessions DB).

---

## Next Actions

1. **Cowork drafts Stage 03c kickoff prompt** (`docs/handoff/stage03c-prompt.md`). Scope: rewrite `src/projects.js` to use MariaDB instead of `data/projects.json` I/O. Interface-preserving rewrite - `server.js` route handlers must not need any changes.
2. CC starts Stage 03c when the kickoff prompt is delivered. Read `data/projects.json` for the data shape; the DB now has identical contents (verified this stage).
3. Stage 03d closes the cycle: settings + sessions DB cutover, server-restart cleanup of orphaned active sessions, then Stage 03 main Go/NoGo gate.
4. Phet pushes to GitHub once: `git push github main` (covers 11+ unpushed v1.1 commits).
5. Phet refreshes the Forgejo macOS keychain entry once in a regular terminal.

---

*End of SHP. Build 52. Run `/continue` to resume.*
