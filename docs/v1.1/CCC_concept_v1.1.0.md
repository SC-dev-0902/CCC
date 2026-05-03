# CCC (Claude Command Center)
**Concept Document v1.1.0**
*Derived from: Design session 2026-05-02*

---

## Overview

v1.1 is a major architectural release built on three pillars:

1. **Centralization** - CCC moves from a local Mac application to a server-based web application running on Dev-Web (kkh01vdweb01, Debian 12). Project files live on a TrueNAS network share mounted by both the server (NFS) and development machines (SMB). Accessible from any LAN device.
2. **MariaDB backend** - flat JSON files (`projects.json`, `settings.json`) replaced by a proper database on Dev-DB. Shared infrastructure with other SC projects (LeadSieve, Jarvis).
3. **Nested project structure** - projects are now physically nested on the filesystem. A parent project (e.g., LeadSieve) contains sub-projects (LeadSieve-Service, LeadSieve-Admin, LeadSieve-Web) as physical subdirectories. CCC understands and manages this hierarchy.

### What Does NOT Change
- The UI (index.html, app.js, styles.css) - same dashboard, same xterm.js terminal, same project tree
- The CC session model - node-pty spawns Claude Code in project directories, WebSocket streams terminal I/O
- The stage-gate workflow - stages, kickoff prompts, test files, Go/NoGo gates
- The parser module (`src/parser.js`) - five-state model, sacred
- The slash commands - `/continue`, `/start-stage`, `/eod`, `/reload-docs`, `/evaluate-import` (plus new `/go` — see below)
- All v1.0.x features carry over unless explicitly noted

### What Changes
- **Where it runs**: Mac local process -> Dev-Web server (Debian 12, systemd)
- **Where projects live**: Mac local disk -> TrueNAS NFS share
- **Where state lives**: JSON files -> MariaDB on Dev-DB
- **Who can access it**: localhost only -> LAN (with authentication)
- **Project hierarchy**: flat project list -> physically nested parent/sub-project structure
- **CC session scope**: one tab per project -> one tab per parent, CC scoped to sub-project via kickoff prompt
- **Multi-user**: single user -> multiple developer accounts with sub-project locking
- **Usage bar**: removed (Anthropic has no real-time API; inaccurate values worse than no values; re-add as a future patch when API is available)

---

## 1. Infrastructure

### Network Topology

```
+----------------------------------------------------------+
|                     LAN (mcsfam.local)                   |
|                                                          |
|  +---------------+   +---------------+   +------------+ |
|  |  Dev-Web       |   |  Dev-DB        |   |  TrueNAS   | |
|  |  kkh01vdweb01  |   |  MariaDB       |   |  NFS Share | |
|  |                |   |                |   |            | |
|  |  Apache 2.4    |   |  ccc DB        |   | SC-Dev     | |
|  |  Node.js       +-->+  + other DBs   |   | dataset    | |
|  |  CCC app       |   |                |   |            | |
|  |  Claude CLI    |   +---------------+   +------+-----+ |
|  |  node-pty      |                              |       |
|  |                +<------- NFS mount -----------+       |
|  +-------+--------+                              |       |
|          | :443                                  |       |
|          |                                       |       |
|  +-------+--------+                   +----------+-----+ |
|  |  Browser        |                   |  Mac / M5       | |
|  |  (any LAN       |                   |  Cowork +       | |
|  |   device)       |                   |  editing        | |
|  |                 |                   |  SMB mount -----+ |
|  +-----------------+                   +-----------------+ |
+----------------------------------------------------------+
```

### Machines and Roles

| Machine | Hostname | Role in CCC v1.1 |
|---------|----------|------------------|
| Dev-Web | kkh01vdweb01 | CCC application server - Node.js, Apache reverse proxy, Claude Code CLI, node-pty |
| Dev-DB | (existing) | MariaDB - CCC database, shared with other projects |
| TrueNAS | (existing) | Network share - SC-Development dataset. NFS export for Dev-Web, SMB share for Mac |
| Mac (later Mac Mini M5) | local | Cowork sessions, direct file editing, browser access to CCC |

### TrueNAS Setup
- **Dataset**: `SC-Development` on existing TrueNAS pool
- **NFS export**: for Dev-Web (read/write) - Linux-native, lowest overhead
- **SMB share**: for Mac (read/write) - standard macOS network mount
- **Mount point on Dev-Web**: `/mnt/sc-development`
- **Mount point on Mac**: `/Volumes/SC-Development` (or Finder-mounted equivalent)
- **Pre-requisite**: SC-Development content migrated from Mac local disk to TrueNAS share before v1.1 go-live (manual one-time move)

### Apache Reverse Proxy
CCC needs the following vhost on kkh01vdweb01:

```apache
<VirtualHost *:443>
    ServerName ccc.mcsfam.local

    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) ws://127.0.0.1:3000/$1 [P,L]

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem
</VirtualHost>
```

Required modules: `mod_proxy`, `mod_proxy_http`, `mod_proxy_wstunnel`, `mod_rewrite`, `mod_ssl`.

**Critical**: `mod_proxy_wstunnel` is essential. Without it, xterm.js terminal sessions silently fail.

### Claude Code on Dev-Web
- Claude Code CLI installed on kkh01vdweb01
- Anthropic API key in server `.env`
- `node-pty` compiled natively on Debian 12 (requires `build-essential`, `python3`)
- CC sessions spawn in project directories on the NFS mount

---

## 2. Project Structure

This is the most significant structural change in v1.1. The flat project list is replaced by a physically nested hierarchy.

### Filesystem Layout

```
SC-Development/
+-- Projects/
|   +-- LeadSieve/                          <- parent project
|   |   +-- CLAUDE.md                       <- master context for all of LeadSieve
|   |   +-- docs/                           <- project-level docs (cross-version)
|   |   |   +-- adr/
|   |   |   +-- architecture/
|   |   |   +-- discussion/
|   |   |   +-- handoff/
|   |   |   +-- context/
|   |   |   +-- spec/
|   |   +-- v1.0/                           <- version folder at project root
|   |   |   +-- docs/                       <- version-level docs
|   |   |   |   +-- adr/
|   |   |   |   +-- architecture/
|   |   |   |   +-- discussion/
|   |   |   |   +-- handoff/
|   |   |   |   |   +-- LeadSieve_shp.md        <- parent SHP
|   |   |   |   |   +-- stage01-prompt.md
|   |   |   |   |   +-- stage01a-prompt.md
|   |   |   |   +-- testfiles/              <- all test files, nested by stage
|   |   |   |   |   +-- stage01/
|   |   |   |   |   |   +-- LeadSieve_test_stage01.md   <- main stage test
|   |   |   |   |   |   +-- stage01a/
|   |   |   |   |   |       +-- LeadSieve_test_stage01a.md  <- sub-stage test
|   |   |   |   |   +-- stage02/
|   |   |   |   |       +-- LeadSieve_test_stage02.md
|   |   |   |   +-- LeadSieve_concept_v1.0.md   <- master concept
|   |   |   |   +-- LeadSieve_tasklist_v1.0.md
|   |   |   +-- v1.0.1/                     <- patch nested inside version
|   |   |       +-- docs/
|   |   |           +-- handoff/
|   |   |           +-- testfiles/
|   |   |           +-- LeadSieve_concept_v1.0.1.md  <- delta concept, refs v1.0
|   |   |           +-- LeadSieve_tasklist_v1.0.1.md
|   |   +-- leadsieve-service/              <- sub-project (same structure recursively)
|   |   |   +-- CLAUDE.md
|   |   |   +-- src/
|   |   |   +-- docs/
|   |   |   +-- v1.0/
|   |   |       +-- docs/
|   |   |           +-- handoff/
|   |   |           |   +-- LeadSieve-Service_shp.md
|   |   |           +-- testfiles/
|   |   |           |   +-- stage01/
|   |   |           |   |   +-- LeadSieve-Service_test_stage01.md
|   |   |           |   |   +-- stage01a/
|   |   |           |   |       +-- LeadSieve-Service_test_stage01a.md
|   |   |           +-- LeadSieve-Service_concept_v1.0.md
|   |   |           +-- LeadSieve-Service_tasklist_v1.0.md
|   |   +-- leadsieve-admin/
|   |   +-- leadsieve-web/
|   +-- TradingMaster/
|   +-- Jarvis/
+-- CCC/
```

### Rules

- **Sub-projects are physical subdirectories** of the parent at the project root, alongside `src/`, `docs/`, and version folders. They are not inside `docs/`.
- **Version folders live at the project root** (`v1.0/`, `v1.0.1/`), not inside `docs/`. The `docs/` folder at project root is for cross-version knowledge only.
- **Patches nest inside their parent version** (`v1.0/v1.0.1/`).
- **docs/ appears at every level** (project root, version, patch) with the same topic subfolders: `adr/`, `architecture/`, `discussion/`, `handoff/`, `context/`, `spec/`.
- **CLAUDE.md lives at the project root** (and at each sub-project root). Derived from the active version's master concept doc.
- **Source code** (`src/`, `server.js`, `package.json`, etc.) lives at the project root alongside `docs/` and version folders.

### Documentation Model

- **Master concept** (`vX.Y/docs/ProjectName_concept_vX.Y.md`): Full specification for the version. Written by Cowork before any CC work begins.
- **Delta sub-concept** (`vX.Y/vX.Y.Z/docs/ProjectName_concept_vX.Y.Z.md`): Patch-level concept. Contains only the changes from the master concept, with an explicit reference to it. Does not repeat unchanged sections.
- **Tasklist** (`vX.Y/docs/ProjectName_tasklist_vX.Y.md`): Stage breakdown, written by Cowork.
- **Test files**: At both main-stage and sub-stage level, stored under `vX.Y/docs/testfiles/stageNN/` (see Stage/Sub-Stage Workflow section).
- **Kickoff prompts** (`vX.Y/docs/handoff/stageNN-prompt.md`, `stageNNa-prompt.md`): Written by Cowork, executed by CC.
- **SHP** (`vX.Y/docs/handoff/ProjectName_shp.md`): Written by CC on `/eod`, one file per project/sub-project.

### Versioning Model

Sub-projects version independently. LeadSieve-Service can be at v1.2 while LeadSieve-Admin is at v1.0. The parent project (LeadSieve) has a **release version** that captures the tested, compatible combination of sub-project versions at a given point in time.

- **Sub-project version**: internal development unit (e.g., Service v1.2 = 12 stages of work)
- **Parent release version**: external milestone (e.g., LeadSieve v2.0 = Service v1.2 + Admin v1.1 + Web v1.0, tested together and known to be compatible)

---

## 3. Stage/Sub-Stage Workflow

The stage/sub-stage model is formally defined in v1.1. CCC builds structure and tooling around it.

### Stage Numbering Convention

This convention applies to all projects:

| Stage | Purpose |
|-------|---------|
| **Stage 00** | Infrastructure prerequisites — anything that must exist before development begins (server setup, DB, NFS, etc.). Only used when a project has real infrastructure prerequisites. |
| **Stage 01** | UI Shell — static frontend with hardcoded data. The interface must feel right before any backend code is written. Always Stage 01. |
| **Stage 02+** | Features, backend, integrations — in logical build order. |

### Definitions

| Unit | Description | Forgejo commit | Test file | Go/NoGo gate |
|------|-------------|----------------|-----------|--------------|
| **Stage** (StageNN) | A logical unit of work with a defined outcome. The unit of delivery. | Yes - commit on completion | Yes - mandatory before Go/NoGo | Yes |
| **Sub-stage** (StageNNa, NNb...) | A working step within a stage. Isolated scope, own kickoff prompt. | Yes - commit on completion | Yes | No - sub-stages complete, then stage Go/NoGo |

### Pipeline

```
Cowork: Master Concept -> Tasklist (stages + sub-stages) -> Kickoff Prompts
CC:     Reads kickoff prompt -> Executes -> Commits on sub-stage GO -> Commits on stage GO
CCC:    Manages sessions, tracks test files, shows progress, handles locking
```

### Test File Naming & Location

Test files live in `vX.Y/docs/testfiles/`, nested by stage:

```
vX.Y/docs/testfiles/
+-- stageNN/
|   +-- ProjectName_test_stageNN.md       <- main stage test
|   +-- stageNNa/
|       +-- ProjectName_test_stageNNa.md  <- sub-stage test
+-- stageNN+1/
    +-- ProjectName_test_stageNN+1.md
```

CCC scanner regex (filename only): `/_test_stage\d+[a-z]*\d*\.md$/`

| Pattern | Example | Level |
|---------|---------|-------|
| `ProjectName_test_stageNN.md` | `CCC_test_stage01.md` | Main stage |
| `ProjectName_test_stageNNa.md` | `CCC_test_stage01a.md` | Sub-stage |
| `ProjectName_test_stageNNa01.md` | `CCC_test_stage01a01.md` | Fix within sub-stage |

### Tasklist Ownership

| Who | Responsibility |
|-----|---------------|
| **CC** | Checks off individual task checkboxes (`- [x]`) as it completes work |
| **Cowork** | Marks Go/NoGo gate lines as `-> GO` after Phet's explicit decision |

CC never touches Go/NoGo gate lines. Gate updates are Cowork's responsibility, performed after Phet gives a GO following successful testing.

### /go — The GO Slash Command

`/go` is a new global slash command that formalizes the GO action inside a CC session. Behaviour is identical for both sub-stages and main stages — one command, no special cases.

**Sequence when `/go` is run:**
1. CC runs `/eod` (writes the sub-project SHP, captures current state)
2. CC commits the completed stage/sub-stage to Forgejo with the correct commit message
3. CC exits the session (clean end — CCC shows "start new session" prompt)

**After session exit (human steps):**
- Sub-stage: Phet starts a fresh session for the next sub-stage via `/continue` + next kickoff prompt
- Main stage: Cowork reviews the test file and marks the Go/NoGo gate as `-> GO` in the tasklist before the next stage begins

**Commit message format (CC derives from active kickoff prompt context):**
- Sub-stage: `Stage NNx complete - [brief description]`
- Main stage: `Stage NN complete - [brief description]`

`/go` lives in `~/.claude/commands/` alongside the other global commands. The fresh session per sub-stage eliminates context bleed — each sub-stage starts clean with exactly what it needs from the SHP chain and kickoff prompt.

### Git Protocol

- Sub-stages: commit to Forgejo on completion via `/go`
- Main stage: commit to Forgejo on completion via `/go` after all sub-stages are GO and the stage test file passes
- On version completion: tag matching the version number, push to both Forgejo and GitHub.

---

## 4. CC Session Model

### Option C - Parent-Rooted, Sub-Project Scoped

CC spawns at the **parent project root**. This gives it visibility over all sub-projects, their SHPs, their docs, and any shared contracts. The kickoff prompt scopes the session to a specific sub-project.

- CCC shows **one tab per parent project** in the treeview
- Inside the tab, the active sub-project is shown (set by kickoff prompt)
- Multiple developers can have CC sessions active simultaneously on different sub-projects under the same parent

### SHP Chain

When CC starts on a sub-project:
1. `/continue` reads the **parent SHP** first (master context - what is this project, all sub-project statuses)
2. Then reads the **sub-project SHP** (working detail - current stage, decisions, open items)
3. CC operates with both contexts loaded

When CC ends (`/eod`):
1. CC writes/updates the **sub-project SHP**
2. CCC automatically appends a status line to the **parent SHP**: `[sub-project] StageNN [status] - YYYY-MM-DD (Dev: Name)`

### Sub-Project Locking

When a CC session starts on a sub-project:
- The sub-project is **locked** to that developer
- A badge appears on the sub-project in the treeview: `● DevName`
- Other developers see the badge and cannot start a CC session on that sub-project
- **Read-only access** (browse files, read SHP, open read panel) is always permitted on locked sub-projects

When the CC session ends (normally, crash, or server restart):
- The lock is **automatically released**
- No manual unlock needed
- Orphaned locks (server restart) are cleared on startup from the `sessions` table

---

## 5. Multi-User

v1.1 ships with full multi-user support.

- Multiple developer accounts with roles: `admin`, `developer`
- All users see all projects (no per-user project isolation in v1.1)
- Multiple developers can work simultaneously on **different sub-projects**
- One CC session per sub-project at any time (enforced by locking)
- Admin creates and manages developer accounts via Settings UI
- No self-registration (LAN app, users are known)
- First run: if `users` table is empty, CCC prompts to create admin account

---

## 6. MariaDB Backend

### Why MariaDB
- JSON files do not support concurrent access (CCC + PatchPilot API + multiple developers)
- No query capability for filtering, searching, or aggregating
- No transaction safety - crash mid-write can corrupt JSON
- MariaDB is the established SC-Development database standard (LeadSieve, Jarvis, Concorda)

### Database
- **Server**: Dev-DB (existing MariaDB instance)
- **Database name**: `ccc`
- **User**: `ccc_app` with access restricted to `ccc` database

### Schema

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | CHAR(36) PK | UUID |
| `username` | VARCHAR(100) NOT NULL UNIQUE | |
| `password_hash` | VARCHAR(255) NOT NULL | bcrypt |
| `role` | ENUM('admin', 'developer') DEFAULT 'developer' | |
| `created_at` | DATETIME DEFAULT NOW() | |
| `last_login` | DATETIME | |

#### `projects`
| Column | Type | Notes |
|--------|------|-------|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(255) NOT NULL | Display name |
| `path` | VARCHAR(512) NOT NULL | Relative path from PROJECT_ROOT |
| `parent_id` | CHAR(36) FK -> projects.id NULL | NULL = top-level project |
| `group_name` | VARCHAR(100) NOT NULL | 'Active', 'Parked', 'New' |
| `sort_order` | INT DEFAULT 0 | Drag-and-drop ordering |
| `type` | ENUM('code', 'config') DEFAULT 'code' | |
| `active_version` | VARCHAR(20) | e.g., '1.0' |
| `evaluated` | BOOLEAN DEFAULT FALSE | |
| `lock_user_id` | CHAR(36) FK -> users.id NULL | NULL = unlocked |
| `lock_session_id` | CHAR(36) NULL | Links to sessions table |
| `created_at` | DATETIME DEFAULT NOW() | |
| `updated_at` | DATETIME ON UPDATE NOW() | |

#### `project_core_files`
| Column | Type | Notes |
|--------|------|-------|
| `project_id` | CHAR(36) FK -> projects.id | |
| `file_type` | ENUM('claude', 'concept', 'tasklist') | |
| `file_path` | VARCHAR(512) NOT NULL | Relative to project path |

#### `sessions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | CHAR(36) PK | UUID |
| `project_id` | CHAR(36) FK -> projects.id | Sub-project being worked on |
| `user_id` | CHAR(36) FK -> users.id | |
| `status` | ENUM('active', 'exited', 'error') DEFAULT 'active' | |
| `started_at` | DATETIME DEFAULT NOW() | |
| `ended_at` | DATETIME | |

#### `settings`
| Column | Type | Notes |
|--------|------|-------|
| `key` | VARCHAR(100) PK | |
| `value` | TEXT | JSON-encoded values |

#### `project_integrations`
| Column | Type | Notes |
|--------|------|-------|
| `project_id` | CHAR(36) FK | |
| `integration` | VARCHAR(50) | e.g., 'patchpilot' |
| `config` | JSON | Integration-specific config |
| `enabled` | BOOLEAN DEFAULT FALSE | |

---

## 7. Authentication

### UI Authentication
Session-based via `express-session` + `express-mysql-session` (sessions stored in MariaDB).

- All routes except `/api/v1/health` require an authenticated session
- Login page at `/login` - unauthenticated requests redirect here
- Valid session cookie grants full UI access
- Admin manages developer accounts in Settings UI

### API Authentication
Bearer token for PatchPilot and future integrations.

- `CCC_API_TOKEN` in `.env` - shared secret
- All `/api/v1/*` endpoints require `Authorization: Bearer <token>` header
- Health check (`GET /api/v1/health`) is public

---

## 8. New Features

### Top Menu Indicators
Three status diodes in the top menu bar, replacing the removed usage bar:

| Indicator | States | Behaviour |
|-----------|--------|-----------|
| PatchPilot | Available (green) / Not Available (red) | Pings PatchPilot health endpoint on startup and periodically |
| Forgejo | Connected (green) / Not Connected (red) | Checks Forgejo API with configured token |
| GitHub | Connected (green) / Not Connected (red) | Checks GitHub API with configured token |

### Stage Progress Bar
A compact progress bar at the **parent project level** in the treeview. Shows overall version progress: `Stage 04 / 12` with a filled bar.

**Source of truth: the tasklist file.** CCC reads `vX.Y/docs/ProjectName_tasklist_vX.Y.md` and parses it:
- **Total**: count of main-stage headers (`## Stage NN` entries)
- **Completed**: count of stages whose Go/NoGo gate line contains `-> GO`

The tasklist is the plan from day one, so the total is known before any test files exist. A stage is considered done when the Go/NoGo gate in the tasklist is marked GO - not when test files are checked.

### Project Path Editing
The project edit modal includes an editable path field. CCC validates the new path exists before updating the DB record. Resolves the v1.0 issue requiring manual JSON editing when a project is moved.

### CC Session Watchdog
Monitors active CC sessions for responsiveness. If a session produces no output for a configurable timeout (default 90 seconds) while still marked active:
- Warning banner: "Session unresponsive - click to restart"
- Developer can restart from the banner without closing the tab
- Sub-project lock is retained during the restart attempt

### WebSocket Auto-Reconnect
Handles network interruptions through the Apache proxy transparently:
- Automatic reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- "Reconnecting..." state visible in the terminal during disconnection
- Terminal history preserved on successful reconnect
- Subtle connection state indicator in the tab bar

### Treeview Search/Filter
A search input above the treeview. Filters the project tree in real time, showing only matching projects, sub-projects, and their parents. Clears on Escape.

### Forgejo Webhook Integration
CCC registers a webhook with Forgejo on setup. When a push lands on a project's main branch, CCC receives the event and updates the project's last-commit metadata in DB. The Forgejo diode confirms the connection is live.

### Parent SHP Auto-Update
When a developer runs `/eod` in a sub-project session, CCC automatically appends a status line to the parent project's SHP:

```
[leadsieve-service] Stage 03 in progress - 2026-05-02 (Dev: Phet)
```

This keeps the parent SHP current as the master cross-project memory without manual effort.

### "New Projects" Discovery Group
CCC scans the NFS project root on startup and periodically for directories not registered in the DB. Unregistered directories appear under a **"New"** group in the treeview (alongside Active and Parked). The developer drags from "New" to Active or Parked to register the project as a fully managed CCC project.

### Project Locking with Dev Badge
Sub-projects display a lock badge (`● DevName`) when a CC session is active. Other developers see the badge, cannot start a session, but can browse and read files freely. Lock auto-releases when session ends.

### Migration Tool
A guided, non-destructive tool to migrate existing projects from the v1.0 flat structure to the v1.1 nested structure. Ships as a public feature since all CCC v1.0 users face the same migration.

- Reads existing project structure
- Proposes the new hierarchy (parent detection, sub-project grouping)
- Shows a full diff of planned changes before anything moves
- Developer confirms, then migration executes
- Original files kept as backup until developer confirms success

---

## 9. PatchPilot API (v1)

Full API specification defined in `Projects/PatchPilot/docs/v1.0/Ccc v1.1 api requirements.md`.

### API Base
`/api/v1` - all endpoints prefixed here. Existing non-versioned endpoints (`/api/projects`, etc.) remain for the browser UI and are not removed.

### Endpoints

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 1 | GET | `/api/v1/projects` | List projects with integration config |
| 2 | GET | `/api/v1/projects/{id}` | Project detail with version history |
| 3 | GET | `/api/v1/projects/{id}/shp` | Get SHP content |
| 4 | POST | `/api/v1/projects/{id}/versions` | Create patch version |
| 5 | POST | `/api/v1/projects/{id}/versions/{ver}/bundle` | Deliver bundle document |
| 6 | PATCH | `/api/v1/projects/{id}/versions/{ver}` | Update version status |
| 7 | PATCH | `/api/v1/projects/{id}/indicator` | Update menubar pill count |
| 8 | GET | `/api/v1/health` | Health check (public, no auth) |

---

## 10. Server-Side Code Changes

### File Structure

```
CCC/
+-- server.js              <- updated: MariaDB, auth, API v1, webhook receiver
+-- src/
|   +-- parser.js          <- UNCHANGED (sacred)
|   +-- projects.js        <- REWRITTEN: MariaDB queries, nested project support
|   +-- sessions.js        <- UPDATED: session records in DB, locking logic
|   +-- versions.js        <- UPDATED: version queries from DB, new FS model
|   +-- usage.js           <- REMOVED
|   +-- db.js              <- NEW: MariaDB connection pool + query helpers
|   +-- auth.js            <- NEW: session auth middleware + API token validation
|   +-- api-v1.js          <- NEW: /api/v1 router (PatchPilot endpoints)
|   +-- watchdog.js        <- NEW: CC session responsiveness monitoring
|   +-- webhooks.js        <- NEW: Forgejo webhook receiver
+-- public/                <- mostly unchanged; search/filter, diodes, progress bar, locking added
+-- data/                  <- DEPRECATED: JSON files kept as backup, not used at runtime
+-- migrations/
|   +-- 001_initial.sql    <- create all tables
|   +-- 002_seed.sql       <- migrate from JSON + create admin user
|   +-- run.js             <- migration runner
+-- tools/
|   +-- migrate-structure/ <- NEW: project structure migration tool
```

### New Dependencies
```json
{
  "mariadb": "^3.x",
  "express-session": "^1.x",
  "express-mysql-session": "^3.x",
  "bcrypt": "^5.x"
}
```

### .env Template
```env
# MariaDB
DB_HOST=dev-db-hostname
DB_PORT=3306
DB_USER=ccc_app
DB_PASSWORD=<password>
DB_NAME=ccc

# Application
PORT=3000
PROJECT_ROOT=/mnt/sc-development

# Authentication
SESSION_SECRET=<random-string>
CCC_API_TOKEN=<shared-secret-for-patchpilot>

# Integrations
FORGEJO_URL=http://mcs-forgejo.mcsfam.net
FORGEJO_TOKEN=<token>
GITHUB_TOKEN=<token>
PATCHPILOT_URL=<patchpilot-base-url>

# Anthropic (for Claude Code CLI on Dev-Web)
ANTHROPIC_API_KEY=<key>
```

---

## 11. Deployment

### Deploy Workflow
```
Mac (develop) -> Forgejo (push) -> Dev-Web (pull + restart)
```

### deploy.sh
```bash
#!/bin/bash
cd /srv/ccc
git pull origin main
npm install --production
node migrations/run.js
sudo systemctl restart ccc
```

### systemd Service
```ini
[Unit]
Description=CCC - Claude Command Center
After=network.target

[Service]
Type=simple
User=ccc
WorkingDirectory=/srv/ccc
EnvironmentFile=/srv/ccc/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## 12. Migration Plan (v1.0.x -> v1.1)

### Prerequisites (manual, before v1.1 build starts)
1. TrueNAS `SC-Development` dataset created, NFS and SMB exports configured
2. SC-Development content moved from Mac local disk to TrueNAS share (one-time)
3. NFS mount verified on Dev-Web at `/mnt/sc-development`
4. SMB mount verified on Mac
5. MariaDB `ccc` database and `ccc_app` user created on Dev-DB
6. Node.js LTS + build tools on Dev-Web (`apt install build-essential python3`)
7. Apache vhost configured with WebSocket proxy
8. Claude Code CLI installed on Dev-Web with API key

### Pre-Go-Live Migration (after v1.1 build is complete, before switching off v1.0)
1. All active projects paused (no CC work during migration window)
2. Run CCC migration tool: restructure project folders into new nested hierarchy
3. Verify all projects load correctly in CCC v1.1 treeview
4. Run `node migrations/run.js`: create DB tables, import from JSON backup
5. Start CCC v1.1 service, verify projects/sessions/settings load from DB
6. Verify a CC session works end-to-end through Apache proxy
7. Resume active projects

### Rollback
CCC v1.0.x continues running on Mac with local JSON files until v1.1 is verified. Migration tool is non-destructive - originals kept as backup. TrueNAS share is a copy of Mac content until confirmed.

---

## 13. Acceptance Criteria

### Infrastructure
- [ ] TrueNAS NFS share mounted on Dev-Web, all project directories accessible
- [ ] SMB share accessible from Mac
- [ ] Apache reverse proxy serves CCC on HTTPS with working WebSocket support
- [ ] CCC runs as systemd service, auto-restarts on failure

### MariaDB
- [ ] All tables created per schema
- [ ] Migration script imports projects.json and settings.json correctly
- [ ] All CRUD operations on projects work identically to v1.0.x from the UI
- [ ] Concurrent access (browser + API call) does not corrupt data

### Nested Project Structure
- [ ] CCC treeview renders parent/sub-project hierarchy correctly
- [ ] Sub-projects expand under their parent
- [ ] Version folders at project root are correctly scanned
- [ ] Test files at both main-stage and sub-stage level appear under Testing section
- [ ] New Project Wizard scaffolds the full v1.1 structure

### CC Session Model
- [ ] CC session starts at parent project root
- [ ] `/continue` reads parent SHP then sub-project SHP in correct order
- [ ] `/eod` writes to sub-project SHP and appends status line to parent SHP
- [ ] Multiple simultaneous sessions on different sub-projects work without conflict

### Multi-User & Locking
- [ ] Multiple developer accounts can log in simultaneously
- [ ] Starting a CC session locks the sub-project, badge shows dev name
- [ ] Other developers see the badge and are blocked from starting a session
- [ ] Read-only access works on locked sub-projects
- [ ] Lock auto-releases when session ends (normally or on crash)
- [ ] Server restart clears orphaned locks

### New Features
- [ ] PatchPilot / Forgejo / GitHub diodes show correct status in top menu
- [ ] Stage progress bar at parent level correctly parses tasklist for total and completed stage count
- [ ] Project path can be updated in edit modal with path validation
- [ ] Watchdog detects unresponsive session and shows restart banner
- [ ] WebSocket auto-reconnects after interruption, terminal history preserved
- [ ] Treeview search/filter shows correct results in real time
- [ ] "New" group shows unregistered project directories from NFS scan
- [ ] Drag from New to Active/Parked registers the project
- [ ] Migration tool completes a test migration non-destructively with diff preview

### PatchPilot API
- [ ] All 8 endpoints return correct responses with valid bearer token
- [ ] Health check returns without auth
- [ ] Invalid token returns 401

### Existing Functionality
- [ ] All v1.0.x UI features work identically
- [ ] Stage-gate workflow (kickoff prompts, test runner, Go/NoGo) unchanged
- [ ] Non-versioned API endpoints still work for the browser UI
- [ ] Parser module behaviour unchanged

---

## 14. Out of Scope (v1.1)

- Per-user project permissions (v1.2+)
- Audit log of user actions (v1.2+)
- ShipIt integration (separate project, uses same API pattern)
- Mobile-responsive UI (LAN app, desktop/laptop only)
- Real-time collaboration (multiple users editing same file simultaneously)
- Usage bar (re-add as a patch when Anthropic usage API is available)
- Promotion campaign (Show HN, Reddit, blog post) - after v1.1 ships
- User manual update for v1.1 (Stage 16 equivalent, after v1.1 is live)

---

*"An assumption is the first step in a major cluster fuck." - Keep it sharp.*
