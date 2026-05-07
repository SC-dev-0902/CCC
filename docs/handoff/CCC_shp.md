# Session Handover Pack - CCC
*Generated: 2026-05-07 (EOD, after Stage 04e + 04e01 GO) | Version: v1.1.0 (dev) + v1.0.7 (local) | Stage 04 main gate now up | Build 75 | Forgejo + GitHub at `0a2c320` (code commit; SHP/tasklist commit pending at end of /eod)*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Two live versions, two environments:**
  - **v1.1.0 (dev):** runs on **Dev-Web only** at `http://kkh01vdweb01.mcsfam.local/CCC/` via Apache reverse proxy onto `127.0.0.1:3000`. MariaDB-backed, Next.js client. Active development line.
  - **v1.0.7 (production-stable, local):** runs on **Mac only** at `http://localhost:3000`. JSON-file-backed, vanilla `public/` frontend. Lives in a parallel git worktree at `/Users/steinhoferm/SC-Development/CCC-v1.0` pinned to tag `v1.0.7`. **v1.0 was never intended to run on Dev-Web.**
- **Active version in projects DB (v1.1):** `"1.1"`.
- **Stage:** Stage 04e + 04e01 **GO** 2026-05-07 (commit `0a2c320`). Stage 04 main gate now up - covers 04a, 04a01, 04b, 04bN, 04b01, 04c, 04d, 04e, 04e01.

---

## What Was Done This Session (2026-05-07)

### Stage 04e GO - Multi-Session Tab Bar (early in the session)

The kickoff (`docs/handoff/stage04e-prompt.md`) defined 5 files. All shipped.

1. `server.js`: `DELETE /api/sessions/:projectId` (idempotent, calls `sessions.destroySession`).
2. `client/lib/api.ts`: `deleteSession(projectId)` helper.
3. `client/components/dashboard-main.tsx`: multi-terminal slot rendering. New `SessionSlot` interface; props gain `sessionSlots: SessionSlot[]`; main content area maps over every slot, renders a `<TerminalPanel>` inside a wrapper div with `display: flex` for the active slot and `display: none` for inactive ones, so terminal buffers persist across tab switches. File reader and empty state preserved.
4. `client/app/page.tsx`: derives `sessionSlots` from `tabs`; `handleCloseTab` calls `deleteSession(projectId)` for session tabs; activate-nearest-remaining logic skips `__settings__` so closing the last session tab falls through to the empty state.
5. Test file: `docs/v1.1/CCC_test_stage04e.md` (17 ticks).

Phet confirmed in browser: two simultaneous CC sessions, buffer preserved across tab switches, X button kills PTY, file tabs coexist with session tabs.

### Stage 04e01 GO - Multi-Tab Fix + Import Wizard (rest of the session)

Three parts merged into one sub-stage by Phet's expanded kickoff (`docs/handoff/stage04e01-prompt.md`).

**Part A - Multi-Tab visibility fix**

Bug surfaced after 04e GO: Phet reported "second session overwrites first session". State was correct (Array(3) tabs proven via diagnostic console.logs), Playwright headless Chromium showed three tabs rendering, but Phet's Safari and Brave showed only one tab.

Root cause was NOT a render bug. It was a **layout architecture mismatch with v1.0**:
- v1.0 places the tab bar **inside `<main>`** (above the terminal area, right side).
- v1.1 had placed it above the sidebar+main split (full-width, top of app, below the AppHeader).

Phet's eye looked in the main panel for tabs (where v1.0 had them) and only saw the "ACTIVE: project" subtitle there - which is just a static label that legitimately changes when the active tab changes, hence "looks like a label not a tab".

Diagnostic journey took ~2 hours (cache-busting, Playwright reproduction, browser comparison, even bright magenta + dashed yellow debug treatment to confirm the bar was rendering). Unlock came when Phet pointed to the v1.0 source and asked CC to read it.

Fix:
- `app-shell.tsx`: TabBar moved from above the sidebar+main split into `<main>` (above `{children}`).
- `app-shell.tsx`: Fragment-based key handling, `flex-shrink: 0` on every tab and the wrapper, `min-height: 32`.
- `app-shell.tsx`: Settings tab X button hidden via `tab.id !== "__settings__"` gate.

**Part B - Stage 04d migration code removed**

- Deleted: `src/migration.js`, `client/components/migration-modal.tsx`.
- Removed routes from `server.js`: `POST /api/scan-home`, `GET /api/projects/:id/migrate-preview`, `GET /api/projects/:id/migrate` (SSE), and the `require('./src/migration')` import.
- Removed `RESERVED_GROUP_NAMES` from `src/projects.js` (and the `addGroup` rejection).
- Removed TBM treeview code from `treeview-shell.tsx`: `MigrationEntryRow`, `DraggableMigrationRow`, `tobeMigrated` filter slice, `migratingProject` state, drag-end TBM intercept branch, `<MigrationModal>` render.
- Removed migration helpers from `client/lib/api.ts`: `scanHome`, `fetchMigratePreview`, `MigratePreview` type, `buildMigrateUrl`.
- Removed first-run `/setup` redirect from `client/app/page.tsx`.
- Updated `client/app/setup/page.tsx`: dropped the now-defunct `scanHome()` call. Page kept reachable for manual projectRoot edits (Import Wizard handles onboarding going forward).
- 9 leftover TBM rows from Stage 04d's scan-home call are filtered out of `getAllProjects` (`WHERE p.group_name IS NULL OR p.group_name != 'To Be Migrated'`) and `buildGroupsArray`. Rows remain in DB - non-destructive. Phet decides their fate later.

**Part C - Import Wizard**

- `server.js` (new): `GET /api/groups` (lightweight, names only, excludes "To Be Migrated"), `POST /api/import/start` (validates source/dest, INSERTs unevaluated row with `parent_id=NULL`, starts CC session in **source** folder via `sessions.createSession(id, sourcePath, 'claude')`), `POST /api/import/kickoff` (uses `sessions.writeToSession(projectId, prompt)` to inject the import prompt with explicit em-dash ban).
- `src/projects.js`: auto-register check inside `getAllProjects()`. For each project with `evaluated=false` AND `activeVersion=null`, if `.ccc-project.json` exists at the resolved path, fire-and-forget `UPDATE projects SET evaluated=1, active_version='1.0' WHERE id=?`. Runs on every `/api/projects` call (fine at small project counts; revisit if list grows large).
- `client/app/import/page.tsx` (new): 3-step wizard. Step 1 - source folder browse (reuses `/setup`'s browse-panel pattern, shape `{current, parent, directories: [name]}`). Step 2 - container `<select>` from `GET /api/groups` plus toggle to "+ New Container" text input; project name auto-populates from source basename. Step 3 - mounts a `<TerminalPanel sessionId="${projectId}::import" projectId={projectId}>`, fires `POST /api/import/kickoff` once after a 1.5 s delay (idempotent guard via `useRef`), reveals "Done" button after a 3-second delay so the developer doesn't dismiss before CC starts producing output.

**UX refinements (in response to Phet's testing feedback)**

- Import button location: moved from sidebar header to **AppHeader top-right next to the diodes** (PatchPilot / Forgejo / GitHub / theme toggle). Renders as a `FolderInput` icon button. Sidebar is no longer wrapped in flex-col with the import row.
- `Active`/`Parked` group headers became **clickable to collapse/expand**, chevron upgraded from `size={10}` to `size={14}`. Per-group collapsed state in `TreeviewShell` via `Set<string>` (`collapsedGroups`). Mirrors v1.0's `collapsedGroups` pattern.

**Test file**

`docs/v1.1/CCC_test_stage04e01.md` - covers Parts A/B/C/D. CC pre-flight verified via curl + Playwright (`tools/04e01-bugcheck.js`); browser walkthrough by Phet confirmed.

**Build + verification**

- `pnpm build` clean. **6 routes**: `/`, `/_not-found`, `/import`, `/login`, `/settings`, `/setup`. No TS errors.
- Server PID 6916 on Dev-Web after final restart (`bash /tmp/ccc-restart.sh`). Cold start ~13 s over NFS.
- Old `client/out/` and `.next/` were nuked partway through the session (`rm -rf`) for a clean rebuild during diagnosis - all subsequent builds wrote fresh chunk hashes.

---

## Decisions Made This Session

1. **Treat Phet's "overwrite" symptom as a layout discoverability issue, not a render bug.** Initial fixes targeted React keys, Fragment wrappers, `display: contents`, etc. None resolved the symptom in real browsers. v1.0 source review revealed the tab bar's structural location difference. Layout fix was the actual unlock.
2. **TabBar lives inside `<main>`, not above the sidebar+main split.** Matches v1.0's `index.html`. The tab bar appears between the sidebar (left) and the active sub-project context strip ("ACTIVE: project"). All tab-related styling now lives on a `data-testid="ccc-tabbar"` wrapper inside `<main>`.
3. **Non-destructive cleanup of leftover TBM rows.** 9 rows in `projects` table from Stage 04d's scan-home call are filtered out of API responses but kept in DB. Avoids a destructive DELETE without explicit confirmation. Phet can `DELETE /api/projects/:id` per-row later.
4. **Auto-register check fires on every `/api/projects` call.** Fire-and-forget UPDATE inside `getAllProjects()`. Acceptable today; should move to event-driven (filesystem watcher or POST trigger) if project count grows beyond ~50.
5. **Import button to AppHeader diodes row.** Phet's first reaction when shown the sidebar version: "Import has to be an icon where we also have the diodes". Moved immediately. Now a single FolderInput icon next to PatchPilot/Forgejo/GitHub/theme.
6. **Active/Parked groups collapsible.** Phet: "those chevrons from Active/Parked are so small that I can't click them". Added click-to-toggle, larger chevron, ChevronDown/ChevronRight switching by collapsed state. Per-group collapsed state local to TreeviewShell (not persisted across reloads - if Phet wants persistence, that's a future tweak).
7. **Test file lives at `docs/v1.1/CCC_test_stage04e01.md`.** Mirrors prior CCC test file format. Browser items pre-ticked under the "Phet confirmed" precedent for items he validated verbally.
8. **One commit covering both 04e + 04e01.** Files were intertwined - splitting would have been messy. Single closure commit `0a2c320`. Per the global two-commit pattern, a follow-up SHP/tasklist commit closes the day.
9. **Carry-forwards excluded from this commit (same as prior sessions):** `client/app/globals.css` (still SMB-locked), `docs/handoff/CCC_recovery.md` (legacy auto-tracked).

---

## Full Project Timeline (recent)

| Hash | Description | Date |
|---|---|---|
| `5408c93` | Stage 03c complete - projects.js rewritten to MariaDB | 2026-05-05 |
| `453ab48` | Stage 03d complete - settings and sessions DB cutover | 2026-05-05 |
| `0a48e6b` | Stage 03d01 complete - sessions.user_id nullable | 2026-05-05 |
| `4fee6d0` | SHP update - Stage 03 complete | 2026-05-05 |
| `3f924ea` | Stage 04a complete - DB schema for nesting | 2026-05-05 |
| `d9203d7` | Stage 04a01 complete - group_name nullable | 2026-05-05 |
| `e8809cd` | Stage 04b complete - filesystem scanner update | 2026-05-05 |
| `b4c4a70` | Stage 04bN complete - Next.js client wiring | 2026-05-05 |
| `565363f` | Stage 04bN GO + 04b backend ticked | 2026-05-06 |
| `6e4a0ec` | Stage 04b01 complete - scan guard + dev-projects + grouped test files | 2026-05-06 |
| `68f13f9` | Stage 04c complete - parent/sub-project rendering + drag-drop | 2026-05-06 |
| `a15d208` | Stage 04c GO + tasklist + SHP | 2026-05-06 |
| `73786cc` | Stage 04d complete - First-Run Setup + Migration-via-Drag | 2026-05-06 |
| `f1a5860` | Stage 04d GO + tasklist + SHP | 2026-05-06 |
| `0a2c320` | **Stage 04e + 04e01 complete - Multi-Session Tab Bar + Import Wizard** | 2026-05-07 |

Tags: `v1.0.0` -> `v1.0.7`. v1.1.0 not yet tagged (deferred to end of v1.1 cycle).

---

## Git State

**Forgejo (`origin`)**: `http://mcs-git.mcsfam.local:3000/Phet/CCC.git` - HEAD `0a2c320` (will be at SHP/tasklist commit after this /eod).
**GitHub (`github`)**: `https://github.com/SC-dev-0902/CCC.git` - HEAD `0a2c320` (will be at SHP/tasklist commit after this /eod).

**Worktrees:**
```
/Users/steinhoferm/SC-Development/CCC       0a2c320 [main]
/Users/steinhoferm/SC-Development/CCC-v1.0  138a565 (detached HEAD = v1.0.7)
```

**Uncommitted in v1.1 tree at end of session (will be in next commit, the SHP/tasklist commit):**
```
 M client/app/globals.css           <- SMB lock since 2026-05-06; carry forward
 M docs/handoff/CCC_recovery.md     <- legacy auto-tracked; pending git rm --cached
 M docs/handoff/CCC_shp.md          <- this file (will be staged + committed)
 M docs/v1.1/CCC_tasklist_v1.1.0.md <- 04e + 04e01 ticked + GO lines
```

A second `Stage 04e + 04e01 GO 2026-05-07 + tasklist ticks + SHP` commit closes the session.

---

## Architecture & File Map

### v1.1 (this directory: `/Users/steinhoferm/SC-Development/CCC`)

| Area | File / Path | Purpose |
|---|---|---|
| **Backend (Express)** | | |
| Server entry | `server.js` | Routes, WS server, static `client/out/` mount, startup IIFEs (orphan-session cleanup), 30s usage broadcaster. **04e:** `DELETE /api/sessions/:projectId`. **04e01:** `GET /api/groups`, `POST /api/import/start`, `POST /api/import/kickoff`. Removed: 04d migration routes. |
| DB layer | `src/db.js` | Lazy MariaDB pool, `query/queryOne/transaction` helpers |
| Project CRUD | `src/projects.js` | `getAllProjects` (with auto-register check + TBM filter), `addProject`, `updateProject`, `removeProject`, `reorderProjects`, `addGroup` (no longer rejects "To Be Migrated"), `removeGroup`, `resolveProjectPath`, `renameProject`. **04e01:** `RESERVED_GROUP_NAMES` removed; auto-register check inside `getAllProjects` promotes `evaluated=1, active_version='1.0'` if `.ccc-project.json` exists; SQL filter excludes group_name='To Be Migrated' rows; `buildGroupsArray` excludes 'To Be Migrated'. |
| Sessions (PTY) | `src/sessions.js` | `node-pty` lifecycle, `claudeStatus` parsing wired to parser. Exposes `createSession`, `destroySession`, `writeToSession`, etc. |
| Status parser (sacred) | `src/parser.js` | All Claude Code output -> 5 statuses |
| Version scanner | `src/versions.js` | Post-04b layout, defensive guard refuses `scanVersions(PROJECT_ROOT)` since 04b01 |
| Token usage | `src/usage.js` | Reads `~/.claude/projects/`, NOT PROJECT_ROOT |
| Migrations | `migrations/001_initial.sql`, `003_sessions_user_id_nullable.sql`, `004_group_name_nullable.sql`, `002_import.js` | |
| **Frontend (Next.js)** | | |
| Source root | `client/` | |
| Static export | `client/out/` (regenerated by `pnpm build` on Dev-Web) | |
| Pages | `client/app/page.tsx`, `client/app/settings/page.tsx`, `client/app/login/page.tsx`, `client/app/setup/page.tsx`, **`client/app/import/page.tsx` (04e01)** | **04e:** `page.tsx` - sessionSlots derivation, handleCloseTab kills + activates nearest. **04e01:** first-run redirect removed; `setup/page.tsx` no longer calls scanHome (page still reachable for manual projectRoot edits). |
| Layout | `client/app/layout.tsx` | System fonts; no Google CDN; no @vercel/analytics |
| Globals | `client/app/globals.css` | System fonts at top, design tokens below. **SMB-locked since 2026-05-06.** |
| App shell | `client/components/app-shell.tsx` | **04e01:** TabBar moved from above sidebar+main split into `<main>`. AppHeader gains FolderInput icon button (Import) next to diodes. Sidebar simplified back to single TreeviewShell child. |
| Treeview | `client/components/treeview-shell.tsx` | **04e01:** TBM code removed (MigrationEntryRow, DraggableMigrationRow, tobeMigrated slice, migratingProject state, drag-end intercept). GroupHeader now clickable with collapse/expand state, larger chevron. Active/Parked render gated by `collapsedGroups` Set. |
| Dashboard | `client/components/dashboard-main.tsx` | **04e:** sessionSlots prop, multi-terminal slot rendering with display:flex/none toggle. |
| Terminal | `client/components/terminal-panel.tsx` | xterm.js via dynamic import (ssr:false), wired through wsPool. Re-mounts on `[projectId, sessionId]` change. |
| File reader | `client/components/file-reader-panel.tsx` | `marked` for `.md`, `<pre>` fallback |
| Settings | `client/components/settings-shell.tsx` | `GET/PUT /api/settings`, theme via `useTheme()` |
| API client | `client/lib/api.ts` | **04e:** `deleteSession`. **04e01:** removed `scanHome`, `fetchMigratePreview`, `MigratePreview`, `buildMigrateUrl`. |
| WebSocket pool | `client/lib/ws.ts` | Per-project sockets keyed on `projectId`, `*`-wildcard subscription |
| Theme context | `client/components/theme-context.tsx` | `tokens(theme)` for design tokens. **No `bgPanel` token** - use `bgCard`. |
| Build config | `client/next.config.mjs` | `output: 'export'`, `basePath: process.env.NEXT_PUBLIC_BASE_PATH \|\| ''` |
| **Tools** | | |
| Playwright reproductions | `tools/04e01-bugcheck.js`, `tools/04e01-compare.js` | Headless Chromium harness for the multi-tab bug repro and v1.0/v1.1 visual comparison |
| **Apache (Dev-Web only, not in repo)** | | |
| Reverse proxy | `/etc/apache2/conf-available/CCC.conf` | `ProxyPass /CCC/ -> 127.0.0.1:3000/`, `ProxyPass /CCC/ws -> ws://127.0.0.1:3000/ws` |
| **Docs** | | |
| Stage kickoffs (04e + 04e01) | `docs/handoff/stage04e-prompt.md`, `docs/handoff/stage04e01-prompt.md` | |
| Test files (04e + 04e01) | `docs/v1.1/CCC_test_stage04e.md`, `docs/v1.1/CCC_test_stage04e01.md` | |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` | 04e + 04e01 ticked, GO lines |
| v1.1 concept doc | `docs/v1.1/CCC_concept_v1.1.0.md` | |

### v1.0 (worktree: `/Users/steinhoferm/SC-Development/CCC-v1.0`)

- `package.json` v1.0.7. Vanilla `public/index.html` + `app.js` + `styles.css`. Mac launcher: `~/Desktop/CCC Starter.command`. **Stage 04e tab bar follows v1.0's `<main>`-internal layout.**

---

## API Endpoint Inventory

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/projects` | All projects, grouped (DB-only, no FS). Auto-register check + TBM filter. |
| POST | `/api/projects` | Add a project; forwards `parentId`+`evaluated`; `group` optional when `parentId` set |
| PUT | `/api/projects/:id` | Update fields (name, group, coreFiles, activeVersion, evaluated, type) |
| POST | `/api/projects/:id/rename` | Rename project + propagate to all `{name}_*` files + folder |
| DELETE | `/api/projects/:id` | Remove project (`?deleteFiles=true` also removes the directory) |
| PUT | `/api/projects-reorder` | Drag-drop reorder; entries carry `parentId` |
| GET | `/api/projects/:id/versions` | Version scan + test files (per-version `testFiles[]` with `stagePath`) |
| POST | `/api/projects/:id/versions` | Create new version folder |
| PUT | `/api/projects/:id/active-version` | Set active version |
| DELETE | `/api/projects/:id/versions/:version` | Delete a version (auto-fallback if active) |
| POST | `/api/projects/:id/versions/:version/complete` | Mark version completed (Git tag prompt) |
| POST | `/api/projects/:id/migrate-versions` | Migrate from flat to versioned layout (NOT removed - this is `versions.migrateToVersioned`, separate from 04d migration) |
| POST | `/api/projects/:id/evaluated` | Set the evaluated flag |
| GET | `/api/projects/:id/test-file-path` | Resolve a test file's actual path |
| GET | `/api/projects/:id/progress` | Tasklist scan: `{completed, total}` based on `^### Sub-Stage` headers and `-> GO` markers |
| **GET** | **`/api/groups`** | **04e01 (new):** lightweight group names list (excludes "To Be Migrated"). Used by Import Wizard. |
| POST | `/api/groups` | Add group (no longer rejects "To Be Migrated") |
| DELETE | `/api/groups/:name` | Remove group |
| GET | `/api/browse` | List subdirectories. Returns `{current, parent, directories: [name strings]}`. |
| GET | `/api/settings` | Settings from DB |
| PUT | `/api/settings` | Save partial settings |
| GET | `/api/file/:projectId?filePath=...` | Read a project file |
| PUT | `/api/file/:projectId` | Write a project file (test-runner saves) |
| POST | `/api/open-editor` | Open external editor |
| POST | `/api/scaffold-project` | New project wizard scaffolding |
| POST | `/api/scaffold-import` | Import scaffolding (additive only) |
| GET | `/api/preflight` | Claude install check + version + referral URL |
| GET | `/api/version` | `{version, build}` |
| POST | `/api/scan-project` | User-triggered project-dir scan |
| POST | `/api/sessions/:projectId` | Start a Claude Code or shell session |
| GET | `/api/sessions/:projectId` | Session state for one project |
| GET | `/api/sessions` | All session state |
| **DELETE** | **`/api/sessions/:projectId`** | **04e (new):** kill the PTY for a project. Idempotent. |
| GET | `/api/usage` | Token usage snapshot |
| **POST** | **`/api/import/start`** | **04e01 (new):** validates source/dest, INSERTs unevaluated row, starts CC session in source folder. |
| **POST** | **`/api/import/kickoff`** | **04e01 (new):** writes the import prompt into the named session. |

**REMOVED (Stage 04d era):**
- ~~`POST /api/scan-home`~~
- ~~`GET /api/projects/:id/migrate-preview`~~
- ~~`GET /api/projects/:id/migrate` (SSE)~~

WebSocket: `ws://host${BASE_PATH}/ws?projectId=<id>`. Server emits `output` | `state` | `claudeStatus` | `usage` | `degraded` | `exit`. Client sends `{type: "input", data}` | `{type: "resize", cols, rows}`.

---

## Frontend State Model (v1.1, post 04e01)

**`Page` (`client/app/page.tsx`):**
- `tabs: Tab[]` (always at least `SETTINGS_TAB`).
- `activeTabId: string | null`.
- `statusByProject: Map<string, TabStatus>`.
- `sessionSlots` derived from `tabs` filtered to session kind with both projectId and sessionId; passed to `DashboardMain`.
- `handleStartSession`: prepends new tab, sets active, awaits `startSession()` (CC over WS).
- `handleOpenFile`: prepends new file tab, sets active.
- `handleCloseTab`: if session, fire `deleteSession(projectId)` then drop the tab. If was active, activate first remaining tab (excluding `__settings__`); else null.
- First-run redirect: **removed**. Setup page reachable manually but no auto-bounce.

**`AppShell` (`client/components/app-shell.tsx`):**
- `<header>` (AppHeader) - logo, title, diodes, **FolderInput Import button (04e01)**, theme toggle.
- `<div className="flex flex-1 overflow-hidden">`:
  - `<aside>` - sidebar with `<TreeviewShell>`.
  - resize handle.
  - `<main className="flex-1 overflow-hidden flex flex-col">`:
    - `<TabBar>` (04e01: relocated here).
    - `<div className="flex-1 overflow-auto flex flex-col">{children}</div>` (DashboardMain renders here).

**`TabBar` (inside AppShell):**
- `<div data-testid="ccc-tabbar" className="flex items-stretch shrink-0">` with `min-height: 34`, `borderBottom: 2px solid t.accent`, `backgroundColor: t.bgSidebar`.
- Each tab: Fragment-keyed for non-href, `<Link>`-keyed for href (settings). All children carry `flex-shrink: 0`.
- X button gated by `tab.id !== "__settings__"`.

**`TreeviewShell` (`client/components/treeview-shell.tsx`):**
- `projects: ApiProject[]`, `loading`, `error`, `query`, `statusMap`, `draggingId`, `dragError`.
- **`collapsedGroups: Set<string>`** (04e01).
- `active`/`parked` filter slices (no TBM filter needed - rows pre-filtered server-side).
- `GroupHeader` clickable with chevron `size={14}` and `cursor: pointer`; rendering of group contents gated by `!collapsedGroups.has(label)`.
- TBM code removed entirely.

**`DashboardMain` (`client/components/dashboard-main.tsx`):**
- Props: `sessionSlots`, `active`, `watchdog`, `reconnecting`.
- Active sub-project context strip (the "ACTIVE: project_name" label).
- Banners (watchdog, reconnecting).
- Main content area: maps over every `sessionSlot`, renders a `<TerminalPanel>` inside a wrapper with `display: flex` for active and `display: none` for inactive. File reader and empty state stack alongside.

**`/import` (Import Wizard):**
- `Step1Source` - source folder browse (reuses `/api/browse` shape).
- `Step2Destination` - container `<select>` from `/api/groups`, "+ New Container" toggle, project name (auto-populated from source basename).
- `Step3Terminal` - mounts `<TerminalPanel sessionId={projectId + "::import"} projectId={projectId}>`. After 1.5 s, fires `POST /api/import/kickoff`. After 3 s, reveals "Done - go to project" button (routes to `/`).

---

## Database Snapshot (Dev-DB `ccc` on `kkh01vddb01`, MariaDB 10.11.14)

| Table | Rows | Key shape |
|---|---|---|
| `projects` | 30 (21 live + 9 leftover TBM rows filtered out by API) | `parent_id` / `lock_user_id` / `lock_session_id` nullable; `group_name` nullable post-04a01. 04e01 SQL filter excludes `group_name = 'To Be Migrated'` from `getAllProjects`. |
| `project_core_files` | ~58 | (project_id, file_type) PK; CASCADE on project_id |
| `sessions` | varies | `user_id` nullable post-03d01 |
| `settings` | 6 | `project_root` = `/mnt/sc-development`; `file_patterns` JSON = v1.1 layout |
| `users` | 0 | (multi-user lands in Stage 05) |
| `project_integrations` | 0 | (Stage 09+) |

**Note on the 9 TBM rows:** they remain in DB. To remove them entirely (if Phet decides):
```sql
DELETE FROM projects WHERE group_name = 'To Be Migrated';
```

---

## Key Technical Details

### Import Wizard prompt that CC receives (Task C3)
```
You are importing an existing project into CCC v1.1.

Source: {sourcePath}
Destination: {destPath}

Task:
1. Analyse the source project (read key files: package.json, README,
   existing docs, CLAUDE.md if present)
2. Explain to the developer what you found and what you plan to do
3. Copy ALL files from source to {destPath}/v1.0/
4. Create the CCC v1.1 structure at the destination:
   - CLAUDE.md (generate based on project analysis)
   - .ccc-project.json (content: {"imported":true, ...})
   - docs/handoff/ (empty folder)
   - docs/v1.0/{projectName}_concept_v1.0.md (generate)
   - docs/v1.0/{projectName}_tasklist_v1.0.md (generate)
5. Ask the developer to confirm each major step before executing it

Never use em dash (-). Use a regular hyphen with spaces ( - ) instead.

Start by reading the source project and explaining what you found.
```

Sent via `sessions.writeToSession(projectId, prompt + '\n')` triggered by Step 3 mounting + a 1.5 s delay (idempotent guard via `useRef`).

### Path resolution chain (`src/projects.js:resolveProjectPath`) - unchanged
1. If `projectPath` is absolute -> return as-is.
2. If `process.env.PROJECT_ROOT` is set -> `path.join(PROJECT_ROOT, projectPath)`.
3. If DB has `settings.project_root` -> `path.join(dbValue, projectPath)`.
4. Fall through -> raw `projectPath`.

### `client/next.config.mjs`
```js
{
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  trailingSlash: false,
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true }
}
```

### Build command (v1.1)
```
cd /mnt/sc-development/CCC/client
NEXT_PUBLIC_BASE_PATH=/CCC pnpm build
```

### Server restart on Dev-Web (v1.1)
```
bash /tmp/ccc-restart.sh
```
Lost on Dev-Web reboot. Recreate inline via the snippet in the prior SHP if missing.

### sshpass to Dev-Web (current pattern)
```bash
SSH_USER=$(grep '^SSH-USER_ID=' /Users/steinhoferm/SC-Development/CCC/.env | cut -d= -f2-)
SSH_PASS=$(grep '^SSH_USER_Password=' /Users/steinhoferm/SC-Development/CCC/.env | cut -d= -f2-)
sshpass -p "$SSH_PASS" ssh \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=10 \
  -o PreferredAuthentications=password \
  -o PubkeyAuthentication=no \
  "$SSH_USER@kkh01vdweb01.mng.mcsfam.local" '<command>' < /dev/null
```

### Playwright reproduction (multi-tab fix)
```bash
cd /Users/steinhoferm/SC-Development/CCC
node tools/04e01-bugcheck.js
# Loads CCC, clicks Start Session on two different projects,
# captures DOM + screenshots into /tmp/04e01-shots/
```

---

## Dependencies (v1.1)

### Root `package.json`

| Package | Version | Notes |
|---|---|---|
| `express` | ^4.18 | HTTP server |
| `ws` | ^8.x | WebSocket server |
| `node-pty` | `1.2.0-beta.11` | **Required for Node.js v25 compatibility** |
| `mariadb` | ^3.x | DB driver |
| `dotenv` | ^16.x | Used with `{override: true}` everywhere |
| `marked` | ^11.x | Markdown render |
| `playwright` / `playwright-core` | dev | tools/04e01-bugcheck.js, tools/04e01-compare.js |

### `client/package.json`

| Package | Version | Notes |
|---|---|---|
| `next` | 16.2.4 | Output: 'export' |
| `react` / `react-dom` | ^19 | |
| `@dnd-kit/core` | ^6.3.1 | |
| `@dnd-kit/sortable` | ^10.0.0 | |
| `@xterm/xterm`, `@xterm/addon-fit` | ^6.0, ^0.11 | UMD constructor: `new FitAddon.FitAddon()` |
| `lucide-react` | ^0.564.0 | Icons (chevrons, FolderInput, etc.) |
| `marked` | ^18.0.3 | Markdown render in client |

Build tooling: `pnpm` v10.33.3 (Dev-Web prereq).

---

## Known Gotchas (cumulative, post-04e01)

(Inherits all gotchas from prior SHPs - condensed below to highlight what's new or relevant for the next session.)

1. **TabBar location matters.** It MUST be inside `<main>` (not above the sidebar+main split). Matches v1.0. If the eye looks for tabs in the right panel and only sees a static label, the tab bar is in the wrong place.
2. **04d migration code is gone.** Don't try to call `POST /api/scan-home`, drag from "To Be Migrated", etc. Those routes 404 and the UI elements don't exist. Onboarding goes through `/import`.
3. **9 leftover TBM rows in `projects` table.** Filtered from API but still in DB. To clear: `DELETE FROM projects WHERE group_name = 'To Be Migrated'`.
4. **Auto-register fires on every `/api/projects` call.** Acceptable today; revisit if list grows.
5. **Import button is in the AppHeader top-right.** Not in the sidebar. FolderInput icon next to PatchPilot/Forgejo/GitHub/theme.
6. **Active/Parked group headers are clickable to collapse.** Per-group state in `TreeviewShell`. Not persisted across reloads.
7. `client/app/globals.css` SMB-locked since 2026-05-06. Several sessions in a row.
8. `docs/handoff/CCC_recovery.md` legacy auto-tracked - regenerates mid-session. `git rm --cached` + `.gitignore` pending.
9. `.env` value quoting (gotcha from prior SHP). `source .env` errors on `&&` lines.
10. v1.1 testing on Dev-Web only (`http://kkh01vdweb01.mcsfam.local/CCC/`). v1.0 testing on Mac at `localhost:3000`.
11. Browser caching is sticky. **Cmd+Shift+R required** after every preview build, every server restart with frontend changes. Brave/Safari sometimes need stronger cache clears.
12. Apache config not in repo - lives on Dev-Web only.
13. **GitHub push from CC works** via inline token URL (`.env GITHUB_TOKEN`).
14. `sshpass` to Dev-Web works with the right invocation (`-o PreferredAuthentications=password -o PubkeyAuthentication=no` + stdin redirect from `/dev/null`).
15. `dotenv` default does NOT override existing `process.env`. All v1.1 env-loading entry points use `dotenv.config({ override: true })`.
16. `pkill -f "node server.js"` from an SSH bash shell self-kills the parent. Use `pgrep -x node` + `/proc/$p/cmdline` filter.
17. **API field shape is camelCase** (`subProjects`, `parentId`, etc.) since 04a.
18. **Field name on versions endpoint is `testFiles`, not `tests`.** Each entry includes `stagePath` (post-04b).
19. **Scanner regex matches `^${projectName}_test_stage\d+[a-z]*\d*\.md$`.** Test files for project `Foo` must be `Foo_test_stageNN[a][NN].md`.
20. `/api/projects/scan` does not exist. Real route: `POST /api/scan-project`.
21. **Workflow: commits go on completion + GO.** Two commits per sub-stage closure (code + GO/SHP/tasklist).
22. **v1.0 lives in a parallel worktree.** Two worktrees share `.git`. Independent `node_modules`, `.env`, `data/`.
23. **Frontend basePath (v1.1).** `BASE_PATH = window.location.pathname.replace(/\/index\.html$/, "/").replace(/\/$/, "")` derives `/CCC` under Apache, empty on direct port.
24. **Proxmox VM `cpu: host` required** - Bun runtime JIT segfaults on `kvm64`.
25. **`pnpm` is a Dev-Web dependency** - `npm install -g pnpm` if missing.
26. **Phet's tick state is authoritative.** Once Phet ticks, treat it as Phet's call.
27. **Bug discovery protocol** (auto-memory `feedback_fix_bugs_on_the_spot.md`): bug blocks current task -> fix on the spot; bug spotted incidentally -> report to Phet, decide together.

---

## Stage 04 Sub-Stage Progression

| Sub-stage | Title | Status | Closure commit |
|---|---|---|---|
| 04a | DB Schema for Nesting | GO 2026-05-05 | `3f924ea` |
| 04a01 | group_name nullable schema fix | GO 2026-05-05 | `d9203d7` |
| 04b | Filesystem Scanner Update (backend) | GO 2026-05-06 | `e8809cd` (impl), `565363f` (ticks) |
| 04bN | Next.js Client Wiring | GO 2026-05-06 | `b4c4a70` (impl), `565363f` (GO) |
| 04b01 | Scan guard + dev-projects + grouped test files | GO 2026-05-06 | `6e4a0ec` |
| 04c | Treeview: Parent/Sub-Project rendering + drag-drop | GO 2026-05-06 | `68f13f9` + `a15d208` |
| 04d | First-Run Setup + Migration-via-Drag | GO 2026-05-06 | `73786cc` + `f1a5860` |
| 04e | Multi-Session Tab Bar | GO 2026-05-07 | `0a2c320` (combined with 04e01) |
| 04e01 | Multi-Tab Fix + Import Wizard | **GO 2026-05-07** | **`0a2c320`** + the SHP/tasklist follow-up |

**Stage 04 main Go/NoGo gate** is now UP.

---

## Open Items / Carry-Forwards

- **`client/app/globals.css`** still SMB-locked. Verify and commit (or revert) once readable.
- **`docs/handoff/CCC_recovery.md`** legacy-tracked auto-regenerating file. `git rm --cached` + add to `.gitignore` pending.
- **`.env` value quoting.** `source .env` errors on `&&` lines.
- **`/api/projects/:id/active-version` PUT contract** (carry-over). May expect `{version}` not `{activeVersion}`.
- **9 leftover TBM rows in DB.** Phet decides their fate (keep / DELETE).
- **`/setup` page de-fanged but still routable.** Could be deleted in a tidy-up since Import Wizard handles onboarding.
- **Auto-register check runs on every `/api/projects` call.** Move to event-driven if list grows.
- **v1.1.0 not yet tagged.** Tag at end of v1.1 cycle.
- **Forgejo deploy via `deploy.sh`** (global rule, active 2026-04-25). Currently direct rsync/build on Dev-Web.

---

## Next Actions (next session)

1. **Stage 04 main Go/NoGo gate.** Phet decides: GO (proceed to Stage 05) or NOGO (additional 04 work).
2. **After Stage 04 GO:** Stage 05 - Authentication & Multi-User. Login system, session middleware, first-run admin setup, user management.
3. **Optional cleanup (any session):**
   - `client/app/globals.css` re-read after SMB unlocks; verify content; commit or revert.
   - `docs/handoff/CCC_recovery.md` `git rm --cached` + add to `.gitignore`.
   - `.env` quote unquoted values.
   - Decide what to do with the 9 leftover TBM rows.
   - Forgejo deploy via `deploy.sh`.
   - Remove `/setup` page entirely (Import Wizard supersedes).

---

*End of SHP. Build 75 (`0a2c320`) on Forgejo + GitHub. v1.1 Stage 04e + 04e01 GO 2026-05-07. Stage 04 main gate up. v1.0 worktree at `CCC-v1.0` untouched. Run `/continue` to resume.*
