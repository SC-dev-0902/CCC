# CCC_tasklist_v1.1.0.md — Claude Command Center v1.1.0
*Derived from: docs/v1.1/v1.1.0/CCC_concept_v1.1.0.md*
*Stage gate process: each stage ends with Go/NoGo before next stage begins*
*Both sub-stages and main stages commit to Forgejo on completion. Main stages have a Go/NoGo gate; sub-stages do not.*

---

## Stage 00 — Infrastructure Setup
**Focus:** Dev-Web server prepared, TrueNAS NFS accessible, Apache proxy running, MariaDB database ready. No CCC code yet - just the foundation everything else runs on.
**Convention:** Stage 00 is the global convention for infrastructure prerequisites across all projects. It runs before Stage 01 (UI) because the environment must exist before anything can be built or tested.

### Sub-Stage 00a — Dev-Web Node.js Environment
- [ ] Install Node.js LTS (v22.x) on kkh01vdweb01 via NodeSource repo
- [ ] Install build tools: `apt install build-essential python3`
- [ ] Verify `node-pty` compiles natively: `npm install node-pty` test build
- [ ] Install Claude Code CLI on Dev-Web with Anthropic API key
- [ ] Create `ccc` system user for the service

### Sub-Stage 00b — TrueNAS NFS Mount
- [ ] Verify `SC-Development` dataset exists on TrueNAS
- [ ] Configure NFS export on TrueNAS for kkh01vdweb01 (read/write)
- [ ] Mount NFS share on Dev-Web at `/mnt/sc-development`
- [ ] Verify all project directories accessible from Dev-Web via NFS
- [ ] Add NFS mount to `/etc/fstab` for persistence across reboots

### Sub-Stage 00c — Apache Reverse Proxy
- [ ] Enable required Apache modules: `mod_proxy`, `mod_proxy_http`, `mod_proxy_wstunnel`, `mod_rewrite`, `mod_ssl`
- [ ] Create vhost for `ccc.mcsfam.local` with HTTP -> Node.js proxy
- [ ] Configure WebSocket upgrade rules (critical: `mod_proxy_wstunnel`)
- [ ] Generate/install SSL certificate (self-signed or internal CA)
- [ ] Verify HTTPS access and WebSocket upgrade both work

### Sub-Stage 00d — MariaDB Database
- [ ] Create `ccc` database on Dev-DB
- [ ] Create `ccc_app` user with access restricted to `ccc` database only
- [ ] Verify connection from Dev-Web to Dev-DB
- [ ] Create `.env` on Dev-Web with all connection strings (DB, Forgejo, GitHub, API key)

### Go/NoGo Gate
> Can CCC code be deployed to Dev-Web, connect to MariaDB on Dev-DB, and serve HTTPS with working WebSocket proxy?

**-> GO:** Proceed to Stage 01
**-> NOGO:** Fix infrastructure blockers before writing any application code

---

## Stage 01 — UI Shell
**Focus:** Static frontend only. All new v1.1 UI elements rendered with hardcoded data. No backend wiring, no real DB calls. The interface must look and feel right before any backend code is written.

### Sub-Stage 01a — Treeview: Parent/Sub-Project Hierarchy
- [ ] Render hardcoded parent project with collapsible sub-projects underneath
- [ ] Each sub-project has its own status dot and version indicator
- [ ] Parent project shows aggregate status dot
- [ ] Stage progress bar on parent node: hardcoded `Stage 03 / 12` with filled CSS bar

### Sub-Stage 01b — Locking Badge & "New" Group
- [ ] Sub-project locking badge: `● DevName` renders next to a locked sub-project (hardcoded)
- [ ] Locked sub-project "Start Session" button visually disabled for other developers
- [ ] "New" group renders above "Active" with a sample unregistered project entry

### Sub-Stage 01c — Top Menu Diodes
- [ ] Three status diodes in top menu: PatchPilot, Forgejo, GitHub
- [ ] Each diode renders in green (available) and red (not available) states — toggle via hardcoded flag
- [ ] Hover tooltip shows service name and placeholder "last checked" timestamp
- [ ] Usage bar removed from top menu

### Sub-Stage 01d — Treeview Search/Filter
- [ ] Search input above treeview renders correctly
- [ ] Typing filters the hardcoded project list in real time
- [ ] Non-matching nodes hide; matching nodes and their parents remain visible
- [ ] Escape clears the filter

### Go/NoGo Gate
> Do all new v1.1 UI elements look and feel correct with hardcoded data? Is the overall interface something you would want to work in all day?

**-> GO:** Proceed to Stage 02
**-> NOGO:** Revise UI before writing any backend code

---

## Stage 02 — MariaDB Schema & Data Migration
**Focus:** Replace JSON file storage with MariaDB. Existing v1.0 projects.json and settings.json import cleanly. All v1.0 CRUD operations work identically via DB.

### Sub-Stage 02a — Schema & Migration Runner
- [ ] Create `migrations/` folder and `migrations/run.js` migration runner
- [ ] Write `migrations/001_initial.sql`: create all tables per concept doc schema
  - `users`, `projects`, `project_core_files`, `sessions`, `settings`, `project_integrations`
- [ ] Write `src/db.js`: MariaDB connection pool, query helpers (`query()`, `queryOne()`, `transaction()`)
- [ ] Run migration on Dev-Web, verify all tables created correctly

### Sub-Stage 02b — JSON Import Script
- [ ] Write `migrations/002_seed.sql` / seed script: reads `data/projects.json` and `data/settings.json`, inserts into DB
- [ ] Handle all project fields: id, name, path, group, type, activeVersion, evaluated, coreFiles
- [ ] Handle settings fields: editor, shell, theme, filePatterns, GitHub token, Forgejo token
- [ ] Run import on Dev-Web with existing projects.json, verify all rows present in DB
- [ ] Keep `data/` folder files as backup (not deleted)

### Sub-Stage 02c — projects.js Rewrite
- [ ] Rewrite `src/projects.js` to use MariaDB queries instead of JSON I/O
- [ ] `getAllProjects()` -> SELECT with LEFT JOIN on project_core_files
- [ ] `addProject()` -> INSERT + INSERT core files
- [ ] `updateProject()` -> UPDATE projects + upsert core files
- [ ] `removeProject()` -> DELETE cascade
- [ ] `resolveProjectPath()` -> reads `project_root` from settings table
- [ ] Exported interface stays identical - no changes to server.js route handlers

### Sub-Stage 02d — Settings & Sessions DB
- [ ] Update settings read/write in `server.js` to use DB instead of settings.json
- [ ] Update `src/sessions.js`: session start/end events write to `sessions` table
- [ ] On server restart: mark all `sessions` with `status = 'active'` as `status = 'error'` (orphaned)
- [ ] Verify settings persist across server restart via DB

### Go/NoGo Gate
> Do all v1.0 CRUD operations (add/edit/delete/drag project, edit settings) work identically using MariaDB as the backend? Does the JSON import produce a correct DB state?

**-> GO:** Proceed to Stage 03
**-> NOGO:** Fix DB layer before adding new structure

---

## Stage 03 — Nested Project Structure
**Focus:** CCC understands and manages the new physically nested project hierarchy. Treeview renders parent/sub-project structure. Version folders at project root (not inside docs/) are correctly scanned.

### Sub-Stage 03a — DB Schema for Nesting
- [ ] Add `parent_id` column to `projects` table (FK -> projects.id, nullable)
- [ ] Add `lock_user_id` and `lock_session_id` columns to `projects` table
- [ ] Write migration for the column additions
- [ ] Update `src/projects.js`: `getAllProjects()` returns tree structure (parent with children array)
- [ ] Update `src/projects.js`: `addProject()` accepts optional `parent_id`

### Sub-Stage 03b — Filesystem Scanner Update
- [ ] Update `src/versions.js`: version folders now at project root (e.g., `v1.0/`), not inside `docs/`
- [ ] Update `src/versions.js`: `scanVersionFiles()` scans `vX.Y/docs/` for concept and tasklist; scans `vX.Y/docs/testfiles/` recursively for test files
- [ ] Update `src/versions.js`: patch versions nest as `vX.Y/vX.Y.Z/` - scan recursively
- [ ] Update `src/versions.js`: `getTestFilePath()` returns path within `vX.Y/docs/testfiles/stageNN/` (creates stage subfolder if missing)
- [ ] Update test file scanner to walk `testfiles/stageNN/stageNNa/` nesting
- [ ] Treeview renders test files grouped by stage under the Testing section

### Sub-Stage 03c — Treeview: Parent/Sub-Project Rendering
- [ ] Update `public/app.js` treeview to render parent projects with collapsible sub-project list
- [ ] Sub-projects expand under their parent node
- [ ] Each sub-project has its own status dot, version indicator, and file links
- [ ] Parent project node shows aggregate status (worst-case of sub-project statuses)
- [ ] Stage progress bar on parent node: count main-stage test files (completed / total) in active version

### Sub-Stage 03d — New Project Wizard Update
- [ ] Update New Project Wizard to scaffold v1.1 folder structure:
  - `docs/` (project-level, with topic subfolders)
  - `vX.Y/docs/` (version-level, with topic subfolders including `handoff/`)
  - `CLAUDE.md` at project root
- [ ] Add "Is this a sub-project?" option - if yes, select parent project
- [ ] Sub-project creation registers with `parent_id` in DB

### Go/NoGo Gate
> Does the treeview correctly show a parent project with sub-projects? Do version folders at project root scan correctly? Does the New Project Wizard produce the correct v1.1 folder structure?

**-> GO:** Proceed to Stage 04
**-> NOGO:** Fix structure scanning and rendering

---

## Stage 04 — Authentication & Multi-User
**Focus:** Login system, session management, developer accounts. All routes protected. First-run admin setup.

### Sub-Stage 04a — Auth Middleware
- [ ] Create `src/auth.js`: session middleware, `requireAuth()` route guard, `requireApiToken()` for /api/v1
- [ ] Configure `express-session` with `express-mysql-session` store (sessions in MariaDB)
- [ ] Mount session middleware globally in `server.js`
- [ ] Apply `requireAuth()` to all routes except `/login` and `/api/v1/health`
- [ ] Apply `requireApiToken()` to all `/api/v1/*` routes except health check

### Sub-Stage 04b — Login UI
- [ ] Login page at `/login`: username + password form, minimal styling consistent with CCC UI
- [ ] `POST /login`: validate credentials, create session, redirect to `/`
- [ ] `POST /logout`: destroy session, redirect to `/login`
- [ ] Unauthenticated requests to any route redirect to `/login`
- [ ] Invalid credentials show error message without revealing which field is wrong

### Sub-Stage 04c — User Management
- [ ] First-run detection: if `users` table empty, redirect to `/setup` for admin account creation
- [ ] `GET/POST /setup`: create first admin account, then redirect to login
- [ ] Settings panel: admin-only "Manage Users" section (add developer, set role, delete account)
- [ ] `POST /api/users`: create user (admin only)
- [ ] `DELETE /api/users/:id`: delete user (admin only, cannot delete self)
- [ ] Password hashing with bcrypt (cost factor 12)
- [ ] Update `last_login` in `users` table on successful login

### Go/NoGo Gate
> Does the login gate work? Can an admin create developer accounts? Do sessions persist correctly? Do unauthenticated requests redirect to login?

**-> GO:** Proceed to Stage 05
**-> NOGO:** Fix auth before wiring multi-user features

---

## Stage 05 — CC Session Model (Option C + Locking)
**Focus:** CC sessions spawn at parent root, scoped to sub-project. SHP chain (/continue reads parent then sub-project SHP). Sub-project locking with dev badge. Parent SHP auto-update on /eod.

### Sub-Stage 05a — Parent-Root Session Spawn
- [ ] Update `src/sessions.js`: CC session for a sub-project spawns PTY at the **parent project root**
- [ ] CCC tab opens at parent level; active sub-project shown inside the tab
- [ ] Session start writes to `sessions` table with `project_id` = sub-project ID
- [ ] Session start locks the sub-project: set `lock_user_id` and `lock_session_id` in `projects` table
- [ ] Session end (any reason) releases lock: clear both lock fields

### Sub-Stage 05b — SHP Chain
- [ ] Update `/continue` slash command: inject parent SHP content first, then sub-project SHP
- [ ] Parent SHP path: `vX.Y/docs/handoff/{ParentName}_shp.md`
- [ ] Sub-project SHP path: `vX.Y/docs/handoff/{SubProjectName}_shp.md`
- [ ] If parent SHP missing: proceed with sub-project SHP only (log warning, don't fail)
- [ ] Update `/eod` slash command: after writing sub-project SHP, CCC appends status line to parent SHP

### Sub-Stage 05c — Locking UI
- [ ] Treeview: locked sub-projects show badge `● DevName` next to the sub-project node
- [ ] "Start CC Session" button disabled on locked sub-projects for other developers
- [ ] Tooltip on locked badge: "Locked by [DevName] since [time]"
- [ ] Read-only access (read panel, file browsing) always available regardless of lock
- [ ] On server startup: query sessions table, clear all locks for non-active sessions

### Go/NoGo Gate
> Does a CC session spawn at the parent root? Does `/continue` read parent + sub-project SHP in order? Does the lock badge appear and block other developers from starting a session? Does the lock release when the session ends?

**-> GO:** Proceed to Stage 06
**-> NOGO:** Fix session model before building features on top

---

## Stage 06 — Import Wizard Update
**Focus:** Import wizard updated for v1.1 nested structure. Supports importing a standalone project as a sub-project under an existing parent.

### Sub-Stage 06a — Import for Nested Structure
- [ ] Import wizard step: "Is this a sub-project?" - if yes, select or create parent
- [ ] Import detects version folders at project root (not inside docs/)
- [ ] Import detects docs/ at project root (cross-version) vs vX.Y/docs/ (version-level)
- [ ] Import registers with `parent_id` in DB if sub-project
- [ ] Import remains non-destructive: never overwrites existing files
- [ ] `evaluated: false` set for imports missing concept doc (unchanged from v1.0)

### Go/NoGo Gate
> Does import correctly handle v1.1 folder structure? Does sub-project import register correctly under a parent?

**-> GO:** Proceed to Stage 07
**-> NOGO:** Fix import before building migration tool on same logic

---

## Stage 07 — Migration Tool
**Focus:** First-class guided tool to migrate v1.0 flat project structure to v1.1 nested structure. Non-destructive with diff preview. Ships as a public feature for all CCC v1.0 users.

### Sub-Stage 07a — Analysis Pass
- [ ] Create `tools/migrate-structure/` module
- [ ] `analyze(projectRoot)`: scans existing project folders, detects flat v1.0 structure
- [ ] Groups projects into parent candidates (e.g., detects LeadSieve, leadsieve-service, leadsieve-admin as a family)
- [ ] Outputs proposed hierarchy as a JSON plan: parent assignments, folder moves, docs restructure
- [ ] Handles edge cases: projects with no obvious parent, already-partially-nested structures

### Sub-Stage 07b — Diff Preview UI
- [ ] Migration tool UI accessible from CCC Settings (admin only)
- [ ] Step 1: Scan - run analysis pass, show detected project families
- [ ] Step 2: Review - show proposed hierarchy with drag-to-adjust grouping
- [ ] Step 3: Diff - full list of planned file/folder operations (move, create, rename) before anything executes
- [ ] Step 4: Confirm - developer explicitly confirms before any filesystem changes

### Sub-Stage 07c — Migration Execution
- [ ] Execute file/folder moves per the confirmed plan
- [ ] Update `data/projects.json` backup to reflect new paths (for rollback reference)
- [ ] Update DB `projects` table with new paths and parent_id relationships
- [ ] Create `docs/` topic subfolders at each level if missing
- [ ] Original folder locations kept as `.ccc-backup-[timestamp]/` until developer confirms success
- [ ] Completion summary: X projects migrated, X warnings, X errors

### Go/NoGo Gate
> Does the migration tool correctly analyze a v1.0 project set, show an accurate diff, and execute the migration without data loss? Is rollback possible if something goes wrong?

**-> GO:** Proceed to Stage 08
**-> NOGO:** Fix migration tool - this is a public feature, must be solid

---

## Stage 08 — PatchPilot API v1
**Focus:** Implement all 8 API endpoints per the Interface Contract v2.0. Bearer token auth. Health check public.

### Sub-Stage 08a — API Router & Auth
- [ ] Create `src/api-v1.js`: Express router mounted at `/api/v1`
- [ ] `requireApiToken()` middleware applied to all routes except health check
- [ ] Consistent error response format: `{ "error": "code", "message": "human-readable" }`

### Sub-Stage 08b — Project & SHP Endpoints
- [ ] `GET /api/v1/projects`: list projects with integration config from `project_integrations` table
- [ ] `GET /api/v1/projects/{id}`: project detail with version history from DB
- [ ] `GET /api/v1/projects/{id}/shp`: read and return SHP file content

### Sub-Stage 08c — Version & Bundle Endpoints
- [ ] `POST /api/v1/projects/{id}/versions`: create patch version, scaffold folder structure on NFS
- [ ] `POST /api/v1/projects/{id}/versions/{ver}/bundle`: store bundle document, retrievable by CC `/bugfix`
- [ ] `PATCH /api/v1/projects/{id}/versions/{ver}`: update version status (e.g., archive)
- [ ] `PATCH /api/v1/projects/{id}/indicator`: update menubar pill count
- [ ] `GET /api/v1/health`: return CCC version, API version, DB status - no auth required

### Go/NoGo Gate
> Do all 8 endpoints return correct responses per the Interface Contract? Does bearer token auth work? Does the health check return without auth?

**-> GO:** Proceed to Stage 09
**-> NOGO:** Fix API endpoints to match Interface Contract before PatchPilot integration

---

## Stage 09 — Top Menu Indicators & UI Updates
**Focus:** PatchPilot/Forgejo/GitHub diodes in top menu. Stage progress bar. Project path editing. Treeview search/filter.

### Sub-Stage 09a — Status Diodes
- [ ] Three diodes in top menu: PatchPilot, Forgejo, GitHub
- [ ] Each diode: green (connected/available) / red (not connected/not available)
- [ ] PatchPilot: pings `PATCHPILOT_URL/health` on startup and every 60 seconds
- [ ] Forgejo: pings Forgejo API using `FORGEJO_TOKEN` on startup and every 60 seconds
- [ ] GitHub: pings GitHub API using `GITHUB_TOKEN` on startup and every 60 seconds
- [ ] Diode state persisted in memory, pushed to frontend via WebSocket on change
- [ ] Hover tooltip on each diode: service name + last check timestamp + URL

### Sub-Stage 09b — Stage Progress Bar
- [ ] Progress bar on parent project node in treeview
- [ ] Source of truth: tasklist file at `vX.Y/docs/ProjectName_tasklist_vX.Y.md`
- [ ] Total = count of `## Stage NN` headers in the tasklist
- [ ] Completed = count of stages with Go/NoGo gate line containing `-> GO`
- [ ] Display: `Stage 04 / 12` with a filled CSS bar
- [ ] Updates when treeview refreshes (existing refresh mechanic)

### Sub-Stage 09c — Project Path Editing
- [ ] Add path field to project edit modal (currently read-only display)
- [ ] On save: validate path exists on NFS before updating DB
- [ ] If path invalid: show inline error, do not save
- [ ] Update `project_core_files` paths accordingly if path changes

### Sub-Stage 09d — Treeview Search/Filter
- [ ] Search input above treeview (subtle, collapsible or always visible)
- [ ] Typing filters treeview in real time: show matching projects/sub-projects and their parents
- [ ] Non-matching nodes hidden; matching nodes highlighted
- [ ] Escape key clears filter and restores full treeview
- [ ] Search persists across tab switches within the same session

### Go/NoGo Gate
> Do all three diodes show correct status? Does the progress bar reflect actual test file completion? Does path editing validate and save correctly? Does treeview search filter correctly?

**-> GO:** Proceed to Stage 10
**-> NOGO:** Fix UI components before building resilience features

---

## Stage 10 — "New Projects" Discovery
**Focus:** CCC scans the NFS project root for unregistered directories and surfaces them under a "New" group. Drag-to-register flow.

### Sub-Stage 10a — Filesystem Scanner
- [ ] Background scanner runs on startup and every 10 minutes
- [ ] Scans `PROJECT_ROOT` for directories not in the `projects` DB table
- [ ] Skips known non-project directories (e.g., `.git`, `node_modules`, hidden folders)
- [ ] Unregistered directories stored in memory (not DB) as "discovered" candidates

### Sub-Stage 10b — "New" Group UI
- [ ] "New" group appears in treeview above "Active" when unregistered projects are found
- [ ] Unregistered projects listed with folder name and path
- [ ] No status dot, no version info - just the folder name and a "Register" hint
- [ ] Drag from "New" to "Active" or "Parked" triggers registration flow
- [ ] Registration flow: confirm name, set type (code/config), assign - then added to DB as a proper project

### Go/NoGo Gate
> Does the scanner correctly detect unregistered directories? Does drag-to-register add the project to DB and move it to the target group?

**-> GO:** Proceed to Stage 11
**-> NOGO:** Fix scanner and registration flow

---

## Stage 11 — Forgejo Webhooks & Parent SHP Auto-Update
**Focus:** Forgejo webhook receives push events and updates project metadata. Parent SHP auto-updated when sub-project /eod runs.

### Sub-Stage 11a — Webhook Receiver
- [ ] Create `src/webhooks.js`: Express router for `POST /webhooks/forgejo`
- [ ] Verify Forgejo webhook signature (HMAC-SHA256)
- [ ] Parse push event: extract project path from repository name/URL
- [ ] Match to project in DB by path
- [ ] Update project's last-commit metadata in DB (commit hash, message, timestamp)
- [ ] Register webhook on Forgejo for each project via Forgejo API on project activation

### Sub-Stage 11b — Parent SHP Auto-Update
- [ ] Detect `/eod` completion in active CC session output (parser output or explicit API call)
- [ ] After sub-project SHP is written: read parent SHP, append status line
- [ ] Status line format: `[sub-project-name] StageNN [status] - YYYY-MM-DD (Dev: Username)`
- [ ] If parent SHP does not exist: create it with just the status line
- [ ] Status line appended to a `## Sub-Project Status` section in the parent SHP (created if missing)

### Go/NoGo Gate
> Does Forgejo push event update project metadata in DB? Does /eod correctly append a status line to the parent SHP?

**-> GO:** Proceed to Stage 12
**-> NOGO:** Fix webhook and SHP chain

---

## Stage 12 — CC Session Watchdog & WebSocket Resilience
**Focus:** Detect and recover from unresponsive CC sessions. WebSocket auto-reconnect with transparent recovery.

### Sub-Stage 12a — Session Watchdog
- [ ] Create `src/watchdog.js`: monitors all active PTY sessions
- [ ] Configurable timeout (default 90 seconds, settable in Settings)
- [ ] If session produces no output for timeout duration: emit `sessionUnresponsive` event
- [ ] Frontend receives event: show "Session unresponsive - click to restart" banner in the terminal panel
- [ ] "Restart" button in banner: kills PTY, spawns new session in same directory, preserves lock
- [ ] Watchdog reset on any PTY output (even whitespace) - only fires on true silence

### Sub-Stage 12b — WebSocket Auto-Reconnect
- [ ] Frontend WebSocket wrapper: on disconnect, attempt reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- [ ] During reconnect attempt: show "Reconnecting..." overlay in terminal panel
- [ ] On successful reconnect: re-subscribe to active session channels, restore terminal state
- [ ] Terminal history (xterm.js buffer) preserved during reconnect
- [ ] Subtle connection indicator in tab bar (dot colour or opacity change, not intrusive)
- [ ] If reconnect fails after max attempts: show "Connection lost - reload page" message

### Go/NoGo Gate
> Does the watchdog fire correctly after 90 seconds of silence and show the restart banner? Does WebSocket reconnect transparently after a network interruption, with terminal history intact?

**-> GO:** Proceed to Stage 13
**-> NOGO:** Fix watchdog and reconnect before deployment

---

## Stage 13 — Deployment & systemd
**Focus:** CCC running as a production service on Dev-Web. Forgejo-first deploy pipeline. systemd auto-restart.

### Sub-Stage 13a — Service Setup
- [ ] Create `ccc` system user on Dev-Web
- [ ] Deploy CCC to `/srv/ccc` (pull from Forgejo)
- [ ] Run `npm install --production` (compiles node-pty natively on Debian)
- [ ] Create `/srv/ccc/.env` with all production values
- [ ] Run `node migrations/run.js`: create tables, import from JSON backup
- [ ] Create and enable systemd service unit (`ccc.service`)
- [ ] Verify service starts, restarts on failure, and survives reboot

### Sub-Stage 13b — Deploy Script
- [ ] Write `deploy.sh` at `/srv/ccc/deploy.sh`
- [ ] Script: `git pull origin main` + `npm install --production` + `node migrations/run.js` + `systemctl restart ccc`
- [ ] Verify deploy script runs cleanly from a fresh push
- [ ] Add `deploy.sh` to CCC's Forgejo repo (executable, committed)

### Go/NoGo Gate
> Is CCC running as a systemd service on Dev-Web? Does `deploy.sh` produce a clean deploy from a Forgejo push? Does the service auto-restart on failure?

**-> GO:** Proceed to Stage 14
**-> NOGO:** Fix deployment before documentation and migration

---

## Stage 14 — CLAUDE.md Updates & Documentation
**Focus:** Update CCC's own CLAUDE.md and the SC-Development CLAUDE.md to reflect the v1.1 structure and workflow. All references to the new project structure, stage/sub-stage model, and session model must be accurate.

### Sub-Stage 14a — CCC CLAUDE.md Update
- [ ] Update Project Structure section: new FS layout (version folders at root, nested sub-projects, docs/ at every level, testfiles/ nesting)
- [ ] Update Project Memory section: SHP chain (/continue reads parent then sub-project, /eod updates both)
- [ ] Update Stage Gate Process section: Stage/Sub-Stage model formally documented including /go command
- [ ] Update test file regex: `/_test_stage\d+[a-z]*\d*\.md$/` (multi-letter sub-stage support)
- [ ] Update slash commands section: add `/go` (updates SHP + commits stage/sub-stage to Forgejo)
- [ ] Update Tech Stack table: add MariaDB, express-session, bcrypt
- [ ] Remove any references to usage.js or usage bar
- [ ] Verify all file paths in CLAUDE.md match the actual v1.1 structure on disk

### Sub-Stage 14b — SC-Development CLAUDE.md Update
- [ ] Add section: "Project Structure" - v1.1 nested layout with example
- [ ] Add section: "Stage/Sub-Stage Model" - definitions, Git rules (/go command), test file naming
- [ ] Add section: "CC Session Model" - Option C, SHP chain, locking behaviour
- [ ] Add section: "Tasklist Ownership" - CC checks boxes, Cowork marks Go/NoGo gates
- [ ] Write `/go` global slash command file in `~/.claude/commands/go.md`
- [ ] Update any references to flat project structure
- [ ] Verify Cowork startup sequence still valid for v1.1 (memory file paths, etc.)

### Sub-Stage 14c — Housekeeping
- [ ] Update CHANGELOG.md: v1.1.0 entry
- [ ] Update README.md: server mode setup, prerequisites, deploy instructions
- [ ] Update CCC_Roadmap.md: v1.1 status Planned -> Shipped
- [ ] Verify `.env.example` includes all new v1.1 variables
- [ ] Remove `src/usage.js` from codebase

### Go/NoGo Gate
> Are all documentation files internally consistent with the v1.1 codebase? Can a new developer read CLAUDE.md and correctly understand the v1.1 project structure and workflow?

**-> GO:** Proceed to Stage 15
**-> NOGO:** Fix documentation gaps

---

## Stage 15 — Pre-Launch Migration
**Focus:** Migrate all SC-Development projects from v1.0 flat structure to v1.1 nested structure using the migration tool. All projects verified in CCC v1.1 before switching off v1.0.

### Sub-Stage 15a — Migration Execution
- [ ] Freeze all active CC work (no sessions during migration window)
- [ ] Run migration tool analysis pass on all SC-Development projects
- [ ] Review proposed hierarchy with Phet - adjust groupings as needed
- [ ] Review full diff of planned file operations
- [ ] Execute migration after explicit confirmation
- [ ] Verify all projects load correctly in CCC v1.1 treeview
- [ ] Verify SHPs at correct paths, readable by /continue
- [ ] Verify version folders detected correctly by treeview scanner

### Sub-Stage 15b — Post-Migration Verification
- [ ] Start one test CC session end-to-end: spawn at parent root, /continue reads SHP chain, /eod writes and updates parent SHP
- [ ] Verify all three status diodes show correct state
- [ ] Verify PatchPilot API health check reachable
- [ ] Confirm backup folders present and intact
- [ ] Delete backup folders only after Phet explicitly confirms migration success

### Go/NoGo Gate
> Are all projects correctly migrated and visible in CCC v1.1? Does a full CC session end-to-end work on a migrated project? Is the old CCC v1.0 on Mac no longer needed?

**-> GO:** v1.1 is live. Tag v1.1.0, push to Forgejo and GitHub. Resume all active projects.
**-> NOGO:** Roll back using backup folders, fix migration issues, retry

---

*"An assumption is the first step in a major cluster fuck." - Keep it sharp.*
