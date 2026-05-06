# Session Handover Pack - CCC
*Generated: 2026-05-06 (EOD, after Stage 04d GO) | Version: v1.1.0 (dev) + v1.0.7 (local) | Stage 04d GO; Stage 04 still open (04e remains) | Build 73 | Forgejo + GitHub at `73786cc` (code commit only - SHP/tasklist commit pending at end of /eod)*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Two live versions, two environments:**
  - **v1.1.0 (dev):** runs on **Dev-Web only** at `http://kkh01vdweb01.mcsfam.local/CCC/` via Apache reverse proxy onto `127.0.0.1:3000`. MariaDB-backed, Next.js client. Active development line.
  - **v1.0.7 (production-stable, local):** runs on **Mac only** at `http://localhost:3000`. JSON-file-backed, vanilla `public/` frontend. Lives in a parallel git worktree at `/Users/steinhoferm/SC-Development/CCC-v1.0` pinned to tag `v1.0.7`. **v1.0 was never intended to run on Dev-Web.**
- **Active version in projects DB (v1.1):** `"1.1"`.
- **Stage:** Stage 04d **GO** 2026-05-06 (commit `73786cc`). Stage 04 main gate still open - 04e (Multi-Session Tab Bar) remains.

---

## What Was Done This Session (2026-05-06, late afternoon / evening)

### Stage 04d GO - First-Run Setup + Migration-via-Drag

The kickoff (`docs/handoff/stage04d-prompt.md`) defined 9 tasks. All shipped.

**Backend changes:**

1. **`src/migration.js` (new):** central module for the home-folder scan + migration flow.
   - `scanHomeFolder(projectRoot)`: reads top-level dirs, skips `.`-prefixed and `node_modules`/`__pycache__`/`.git`, compares each candidate's relative path against existing `projects.path` rows, INSERTs unregistered ones with `group_name='To Be Migrated'`, `evaluated=0`, `parent_id=NULL`, `active_version=NULL`. Returns `{added}`. Idempotent: a second call adds 0.
   - `previewMigration(projectId)`: resolves the project's absolute path via `resolveProjectPath(project.path)`, walks the v1.1 layout (16 dirs + `CLAUDE.md`), filters to entries that don't yet exist on disk, returns `{projectName, rootPath, version, toCreate}`. Version defaults to `'1.0'` when `active_version` is NULL.
   - `executeMigration(projectId, targetGroup, parentId, emitLine)`: calls `previewMigration`, creates each missing dir / writes `CLAUDE.md` placeholder, writes `.ccc-project.json` marker (`{id, name, version, migratedAt}`), then UPDATEs the row: `group_name = (parentId ? NULL : targetGroup)`, `parent_id = parentId`, `evaluated = 0`, `active_version = version`, `sort_order` recomputed for the destination group/parent. Streams `emitLine("Creating <relpath>")` for each path, `emitLine("Writing .ccc-project.json")`, `emitLine("Done")`.

2. **`server.js`:**
   - new `getProjectRoot()` async helper extracted from inline `readSettingsFromDB().projectRoot` reads.
   - new `POST /api/scan-home`: 400 if `project_root` not configured; otherwise calls `scanHomeFolder` and returns `{added}`.
   - new `GET /api/projects/:id/migrate-preview`: 404 on unknown id, otherwise the previewMigration shape.
   - new `GET /api/projects/:id/migrate`: SSE endpoint. Sets `text/event-stream` headers + `flushHeaders()`, emits `data: {"message":...}` per `emitLine`, ends with `data: {"done":true}` or `data: {"error":...}`. Query params: `targetGroup` (string, defaults to `Active`), `parentId` (string or empty - empty becomes null).

3. **`src/projects.js`:** new `RESERVED_GROUP_NAMES = ['To Be Migrated']` constant. `addGroup(name)` returns `null` (rejected) when the name is reserved. The route handler at `POST /api/groups` translates `null` to HTTP 409 (shared with the existing already-exists rejection - error message text is shared, behaviour is correct).

**Client changes:**

4. **`client/lib/api.ts`:** new `scanHome()`, `fetchMigratePreview()`, `MigratePreview` type, `buildMigrateUrl(projectId, targetGroup, parentId)` helper. The SSE connection uses the browser's native `EventSource` directly (no wrapper).

5. **`client/app/page.tsx`:** new `useEffect` at the top of `Page` that calls `fetchSettings()` on mount and `router.push('/setup')` if `projectRoot` is empty. Catches and silently ignores fetch errors (treeview can render with stale state if backend is starting).

6. **`client/app/setup/page.tsx`:** completely rewritten. The old `CreateAdminCard` placeholder (Stage 05 auth) is removed (the component file `client/components/auth-card.tsx` is left in place for Stage 05 to reuse). New body is a single `ProjectRootCard`:
   - text input (mono) + `Browse` toggle button.
   - Browse panel uses `GET /api/browse?path=<current>` (live API returns `{current, parent, directories: [name strings]}`). Each row in the dropdown has a "descend" click target on the name and a "Select" click target that pins the path and closes the dropdown. `..` row goes up one.
   - `Save & Scan` button does `PUT /api/settings { projectRoot }` then `POST /api/scan-home`, then `router.push('/')`. Inline error text on either failure.
   - Header reads "Claude Command Center - First-run setup". Footer is a single muted line ("Set this once. You can change it later under Settings.") instead of the prior login link.

7. **`client/components/migration-modal.tsx` (new):** 520px-wide modal with backdrop `rgba(0,0,0,0.5)`. Two phases:
   - **State 1 (preview)**: on mount fetches `/migrate-preview`. Shows project root, `Version: v{version}`, and a scrollable mono path list (max-height 240). Buttons `Cancel` + `Confirm`.
   - **State 2 (running)**: on Confirm opens an `EventSource` to `buildMigrateUrl(...)`. Each `data` event JSON-decodes; `message` lines append to a scrollable mono log, `error` flips to `error` phase, `done` flips to `done` phase. Auto-scrolls to bottom on each new line. Phase transitions show a single `Close` button at the end. The `useEffect` cleanup closes the EventSource on unmount.
   - Click on the backdrop only cancels in `preview` / `error` phases (never during `running`).

8. **`client/components/treeview-shell.tsx`:**
   - new `MigrationEntryRow` + `DraggableMigrationRow` (uses `useDraggable` with `data: { kind: "migration", group: TO_BE_MIGRATED }`). Renders folder name + muted-mono path only - no status dot, no version badge, no Start Session button, no progress bar, no file links.
   - new `tobeMigrated` filter slice (`project.group === "To Be Migrated"`); the existing `active`/`parked` slices now exclude TBM explicitly.
   - new `migratingProject` state holding `{project, targetGroup, targetParentId} | null`.
   - **drag-end branch**: after computing target group/parentId, if `dragged.group === "To Be Migrated"`, set `migratingProject` and `return` early. The optimistic update + DB call do NOT run; the modal becomes the sole path. `onComplete` of the modal reloads from server (the migrate endpoint already updated the row).
   - **render**: `TO BE MIGRATED` group label + entries render above `Active`, hidden when `tobeMigrated.length === 0`. The `<MigrationModal>` mounts at the bottom of the JSX tree inside `DndContext`.

**Test file:**

9. **`docs/v1.1/CCC_test_stage04d.md`:** 23 items across 9 task sections (mirrors v1.0 format). CC pre-ran every CLI item end-to-end (curl the endpoints, full SSE smoke with `/tmp/04d-mig-test` for the Active path, `/tmp/04d-cmig-test` for the Delta-container path; both fixtures cleaned up with `?deleteFiles=true`). Phet ticked all browser items.

**Build + verification:**

- `pnpm build` (Dev-Web, 3.5s) → 5 routes (`/`, `/_not-found`, `/login`, `/settings`, `/setup`), no TS errors.
- `bash /tmp/ccc-restart.sh` → PID 4106, ~13s cold start. Second restart after the `addGroup` change → PID 4293.
- All Task 1-9 CLI items verified PASS against the live server.

**Side-effects (intentional, kept):**

- **9 "To Be Migrated" rows now in DB.** Real top-level dirs under `/mnt/sc-development` that were not registered before: `CCC-v1.0`, `CoWorker`, `Projects`, `Standards`, `Templates`, `_Housekeeping`, `_backups`, `ccc-dev-projects`, `docs`, `ziftZtt7` (10 dirs but Templates is a typo - it's `Templates`, total = 9). They sit in TBM until Phet drags them somewhere. Subsequent `scan-home` calls return `{added:0}`.

**Carry-forwards from prior sessions that are STILL not resolved:**

- `client/app/globals.css` is **still SMB-locked**. `cat`, `cp`, `git`, and `Read` all return `Permission denied` despite `rwx------` ownership. Existing edit (origin: 04bN font fallback) remains uncommitted. This has been pending for several sessions now.
- `docs/handoff/CCC_recovery.md` is still legacy-tracked and auto-regenerates from terminal capture; left out of commits this session as before. `git rm --cached` + `.gitignore` pending.

---

## Decisions Made This Session

1. **Treat the live `/api/browse` shape as authoritative.** The kickoff sample showed `{ dirs: [{name, path}] }`; the real endpoint returns `{ current, parent, directories: [name strings] }`. Setup page wires to the real shape directly, with a manual `joinPath` helper for descent.
2. **Reserve "To Be Migrated" via `addGroup` rejection rather than via `PROTECTED_GROUPS`.** Adding it to PROTECTED_GROUPS would have excluded it from `buildGroupsArray`'s dynamic group section, hiding the group when entries existed. Cleaner solution: a separate `RESERVED_GROUP_NAMES` constant that only short-circuits creation. The shared 409 response text reads "Group already exists" - acceptable since the user-visible outcome is the same.
3. **No "optimistic local removal" in the modal `onComplete`.** Kickoff suggested first removing the migrated row from the local TBM list, then `reload()`. In practice `reload()` resolves quickly and overwrites local state with fresh server data, so the local-removal step would be invisible. Skipped to keep the code simpler. Visible behaviour is correct.
4. **Server-side `executeMigration` always recomputes `sort_order` for the destination.** The client-side reorder API isn't called for TBM drops (kickoff explicitly says no DB write before the modal). The server-side migration must therefore set its own sort_order so the row lands cleanly at the end of the destination group/parent. `getAllProjects` returns sorted by `sort_order ASC` so this matches the user's drop placement (always at the end - precise insertion-index control inside a target is a separate concern not covered by 04d).
5. **SSE smoke testing on `/tmp` fixtures, not on the 9 real TBM rows.** Migrating any of the real rows would create folders inside that user-owned directory (e.g., `_Housekeeping/v1.0/docs/...`) which would be unwanted side-effects. CC created `/tmp/04d-mig-test` and `/tmp/04d-cmig-test`, registered them via direct API, ran SSE migrate, verified disk + DB, deleted with `?deleteFiles=true`. Both fixtures were gone by end of pre-flight.
6. **Skip `client/app/globals.css` from this commit.** Same SMB-lock condition as prior sessions; not 04d-related work; carry forward.
7. **Skip the `docs/handoff/CCC_recovery.md` modification.** Same as prior sessions.
8. **Two-commit closure pattern (`Stage 04d complete - ...` followed by SHP/tasklist commit).** Matches recent precedent (precedent: 03d/03d01, 04a/04a01, 04bN, 04c). The SHP/tasklist commit is the one that closes the day; this file is part of it.

---

## Full Project Timeline (recent)

| Hash | Description | Date |
|---|---|---|
| `2225181` | v1.1.0 Stage 03a - MariaDB schema and migration runner | 2026-05-04 |
| `5c679b3` | Stage 03b complete - JSON import script | 2026-05-05 |
| `5408c93` | Stage 03c complete - projects.js rewritten to MariaDB | 2026-05-05 |
| `453ab48` | Stage 03d complete - settings and sessions DB cutover | 2026-05-05 |
| `0a48e6b` | Stage 03d01 complete - sessions.user_id nullable | 2026-05-05 |
| `4fee6d0` | SHP update - Stage 03 complete (03d + 03d01), Stage 04 next | 2026-05-05 |
| `3f924ea` | Stage 04a complete - DB schema for nesting | 2026-05-05 |
| `d9203d7` | Stage 04a01 complete - group_name nullable | 2026-05-05 |
| `e8809cd` | Stage 04b complete - filesystem scanner update | 2026-05-05 |
| `143c4e8` | Add /CCC/ Apache mount support - frontend BASE_PATH | 2026-05-05 |
| `c55dd75` | Stage 04b CC test ticks + proxied-URL refresh | 2026-05-05 |
| `fd65963` | Bump package.json to 1.1.0 | 2026-05-05 |
| `d89f3d3` | Default file patterns to v1.1 layout | 2026-05-05 |
| `b4c4a70` | Stage 04bN complete - Next.js client wiring | 2026-05-05 |
| `1d194ec` | Sidebar resize handle - widen hit area, show divider | 2026-05-06 |
| `565363f` | Stage 04bN GO 2026-05-06 + Stage 04b backend ticked | 2026-05-06 |
| `6e4a0ec` | Stage 04b01 complete - scan guard + dev-projects + grouped test files | 2026-05-06 |
| `68f13f9` | Stage 04c complete - parent/sub-project rendering + drag-drop | 2026-05-06 |
| `a15d208` | Stage 04c GO 2026-05-06 + tasklist ticks + SHP | 2026-05-06 |
| `73786cc` | **Stage 04d complete - First-Run Setup + Migration-via-Drag** | 2026-05-06 |

Tags: `v1.0.0` -> `v1.0.7`. v1.1.0 not yet tagged (deferred to end of v1.1 cycle).

**Worktree HEAD:** `138a565` (v1.0.7).

---

## Git State

**Forgejo (`origin`)**: `http://mcs-git.mcsfam.local:3000/Phet/CCC.git` - HEAD `73786cc` (will be at SHP/tasklist commit after this /eod).
**GitHub (`github`)**: `https://github.com/SC-dev-0902/CCC.git` - HEAD `73786cc` (will be at SHP/tasklist commit after this /eod).

**Worktrees:**
```
/Users/steinhoferm/SC-Development/CCC       73786cc [main]
/Users/steinhoferm/SC-Development/CCC-v1.0  138a565 (detached HEAD = v1.0.7)
```

**Uncommitted in v1.1 tree at end of session (will be in next commit, which is the SHP/tasklist commit):**
```
 M client/app/globals.css           <- SMB lock since 2026-05-06; content unverifiable; carry forward
 M docs/handoff/CCC_recovery.md     <- legacy auto-tracked; will regenerate; pending git rm --cached
 M docs/handoff/CCC_shp.md          <- this file (will be staged + committed)
 M docs/v1.1/CCC_tasklist_v1.1.0.md <- 04d ticked (will be staged + committed)
```

A second `Stage 04d GO 2026-05-06 + tasklist ticks + SHP` commit closes the session.

---

## Architecture & File Map

### v1.1 (this directory: `/Users/steinhoferm/SC-Development/CCC`)

| Area | File / Path | Purpose |
|---|---|---|
| **Backend (Express)** | | |
| Server entry | `server.js` | Routes, WS server, static `client/out/` mount, startup IIFEs (migration, orphan-session cleanup), 30s usage broadcaster. **04d:** new `getProjectRoot()` helper; new `POST /api/scan-home`, `GET /api/projects/:id/migrate-preview`, `GET /api/projects/:id/migrate` (SSE). |
| DB layer | `src/db.js` | Lazy MariaDB pool, `query`/`queryOne`/`transaction` helpers |
| Project CRUD | `src/projects.js` | `getAllProjects`, `addProject`, `updateProject`, `removeProject`, `reorderProjects`, `addGroup`/`removeGroup`, `resolveProjectPath`, `renameProject`. **04d:** `RESERVED_GROUP_NAMES` blocks creating "To Be Migrated" via `addGroup`. |
| Migration | `src/migration.js` | **04d (new):** `scanHomeFolder`, `previewMigration`, `executeMigration`, `TO_BE_MIGRATED` constant. |
| Sessions (PTY) | `src/sessions.js` | `node-pty` lifecycle, `claudeStatus` parsing wired to parser |
| Status parser (sacred) | `src/parser.js` | All Claude Code output -> 5 statuses |
| Version scanner | `src/versions.js` | Post-04b layout, defensive guard refuses `scanVersions(PROJECT_ROOT)` since 04b01 |
| Token usage | `src/usage.js` | Reads `~/.claude/projects/`, NOT PROJECT_ROOT |
| Migrations | `migrations/001_initial.sql`, `003_sessions_user_id_nullable.sql`, `004_group_name_nullable.sql`, `002_import.js` | |
| **Frontend (Next.js)** | | |
| Source root | `client/` | |
| Static export | `client/out/` (regenerated by `pnpm build` on Dev-Web) | |
| Pages | `client/app/page.tsx`, `client/app/settings/page.tsx`, `client/app/login/page.tsx`, `client/app/setup/page.tsx` | **04d:** `page.tsx` first-run useEffect; `setup/page.tsx` rewritten as project-root form. |
| Layout | `client/app/layout.tsx` | System fonts; no Google CDN; no @vercel/analytics |
| Globals | `client/app/globals.css` | System fonts at top, design tokens below. **SMB-locked since 2026-05-06.** |
| Treeview | `client/components/treeview-shell.tsx` | **04d:** `MigrationEntryRow` + `DraggableMigrationRow`, `tobeMigrated` slice, `migratingProject` state, drag-end TBM intercept opens modal, `<MigrationModal>` rendered inside DndContext. |
| Migration modal | `client/components/migration-modal.tsx` | **04d (new):** two-phase modal (preview / running). EventSource for SSE. |
| Dashboard | `client/components/dashboard-main.tsx` | Terminal + FileReader slots |
| Terminal | `client/components/terminal-panel.tsx` | xterm.js via dynamic import (ssr:false), wired through wsPool |
| File reader | `client/components/file-reader-panel.tsx` | `marked` for `.md`, `<pre>` fallback |
| Settings | `client/components/settings-shell.tsx` | `GET/PUT /api/settings`, theme via `useTheme()` |
| API client | `client/lib/api.ts` | **04d:** `scanHome()`, `fetchMigratePreview()`, `MigratePreview` type, `buildMigrateUrl()`. |
| WebSocket pool | `client/lib/ws.ts` | Per-project sockets keyed on `projectId`, `*`-wildcard subscription |
| Theme context | `client/components/theme-context.tsx` | `tokens(theme)` for design tokens (`bgApp`, `bgSidebar`, `bgCard`, `bgInput`, `bgHover`, `bgMain`, `bgTabBar`, `border`, `accent`, `accentHover`, `accentBg`, `textPrimary`, `textSecondary`, `textMuted`, status colours). **No `bgPanel` token** - use `bgCard`. |
| Build config | `client/next.config.mjs` | `output: 'export'`, `basePath: process.env.NEXT_PUBLIC_BASE_PATH \|\| ''` |
| Dummy data | `client/lib/dummy-data.ts` | Type exports retained (`Status`, `Project`, `SubProject`); data constants no longer imported |
| **Apache (Dev-Web only, not in repo)** | | |
| Reverse proxy | `/etc/apache2/conf-available/CCC.conf` | `ProxyPass /CCC/ -> 127.0.0.1:3000/`, `ProxyPass /CCC/ws -> ws://127.0.0.1:3000/ws` |
| **Docs** | | |
| Stage kickoffs (04) | `docs/handoff/stage04{a,a01,b,bN,b01,c,d}-prompt.md` | All committed |
| Test files (04) | `docs/v1.1/CCC_test_stage04{a,b,bn,b01,c,d}.md` | All committed |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` | 04d ticked + GO line already present |
| v1.1 concept doc | `docs/v1.1/CCC_concept_v1.1.0.md` | |

### v1.0 (worktree: `/Users/steinhoferm/SC-Development/CCC-v1.0`)

- `package.json` v1.0.7, deps: `@xterm/addon-fit`, `@xterm/xterm`, `dotenv`, `express`, `marked`, `node-pty@1.2.0-beta.11`, `ws`. (No `mariadb`, no Next.js.)
- `server.js` (single-file JSON-backed Express, no `src/db.js`).
- `public/` (vanilla `index.html` + `app.js` + `styles.css`).
- `data/projects.json` (v1.0.7-tagged copy + runtime mods), `data/settings.json`.
- Mac launcher: `~/Desktop/CCC Starter.command`.

---

## API Endpoint Inventory

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/projects` | All projects, grouped (DB-only, no FS). Includes "To Be Migrated" group when entries exist. |
| POST | `/api/projects` | Add a project; forwards `parentId`+`evaluated`; `group` optional when `parentId` set; top-level requires `group` |
| PUT | `/api/projects/:id` | Update fields (name, group, coreFiles, activeVersion, evaluated, type) |
| POST | `/api/projects/:id/rename` | Rename project + propagate to all `{name}_*` files + folder |
| DELETE | `/api/projects/:id` | Remove project (`?deleteFiles=true` also removes the directory) |
| PUT | `/api/projects-reorder` | Drag-drop reorder; entries carry `parentId` |
| GET | `/api/projects/:id/versions` | Version scan + test files (per-version `testFiles[]` with `stagePath`) |
| POST | `/api/projects/:id/versions` | Create new version folder |
| PUT | `/api/projects/:id/active-version` | Set active version (**known issue:** body shape may need `{version}` not `{activeVersion}`) |
| DELETE | `/api/projects/:id/versions/:version` | Delete a version (auto-fallback if active) |
| POST | `/api/projects/:id/versions/:version/complete` | Mark version completed (Git tag prompt) |
| POST | `/api/projects/:id/migrate-versions` | Migrate from flat to versioned layout |
| POST | `/api/projects/:id/evaluated` | Set the evaluated flag |
| GET | `/api/projects/:id/test-file-path` | Resolve a test file's actual path |
| GET | `/api/projects/:id/progress` | Tasklist scan: `{completed, total}` based on `^### Sub-Stage` headers and `-> GO` markers |
| **POST** | **`/api/scan-home`** | **04d (new):** scan settings.project_root for unregistered top-level dirs; INSERT each as a "To Be Migrated" row. Returns `{added}`. 400 if `project_root` is empty. Idempotent. |
| **GET** | **`/api/projects/:id/migrate-preview`** | **04d (new):** dry-run list of paths that would be created. 404 unknown id. Shape: `{projectName, rootPath, version, toCreate}`. |
| **GET** | **`/api/projects/:id/migrate?targetGroup=X&parentId=Y`** | **04d (new):** SSE. Streams `data: {"message":...}` per operation, ends with `data: {"done":true}` or `data: {"error":...}`. UPDATEs the project row when complete: `group_name`, `parent_id`, `evaluated=0`, `active_version`, recomputed `sort_order`. |
| POST | `/api/groups` | Add group. **04d:** rejects `name === "To Be Migrated"` (RESERVED_GROUP_NAMES). |
| DELETE | `/api/groups/:name` | Remove group |
| GET | `/api/browse` | List subdirectories. Returns `{current, parent, directories: [name strings]}` (NOT `{dirs: [{name, path}]}`). |
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
| GET | `/api/usage` | Token usage snapshot |

WebSocket: `ws://host${BASE_PATH}/ws?projectId=<id>`. Server emits `output` | `state` | `claudeStatus` | `usage` | `degraded` | `exit`. Client sends `{type: "input", data}` | `{type: "resize", cols, rows}`.

---

## Frontend State Model (v1.1, post 04d)

**`Page` (`client/app/page.tsx`):**
- New first-run `useEffect`: on mount, `fetchSettings().then(s => { if (!s.projectRoot) router.push('/setup') })`. Catches errors silently.
- Existing tab/session state model unchanged.

**`ProjectRootCard` (`client/app/setup/page.tsx`):**
- `pathValue: string` - mono input.
- `browseOpen: boolean`, `browseData: BrowseResponse | null`, `browseError: string | null`.
- `error: string | null`, `busy: 'idle' | 'saving' | 'scanning'`.
- On mount: `fetchSettings()` to seed pathValue with the existing projectRoot (if set).
- `loadBrowse(path)`: GET `/api/browse?path=...`; updates browseData.
- `handleSaveAndScan`: PUT settings → POST scan-home → router.push('/'); inline error on either failure.

**`TreeviewShell` (`client/components/treeview-shell.tsx`):**
- `projects: ApiProject[]`, `loading`, `error`, `query`, `statusMap`, `draggingId`, `dragError`, `previousProjectsRef`, `sensors`.
- **NEW:** `migratingProject: {project, targetGroup, targetParentId} | null`.
- `tobeMigrated` filter slice (group === "To Be Migrated").
- `active` / `parked` slices explicitly exclude TBM.
- `handleDragEnd` first computes target group/parentId. If `dragged.group === "To Be Migrated"`, set `migratingProject` and return early - no DB call, no optimistic update.
- The `<MigrationModal>` mounts at the bottom of the JSX inside `DndContext`. `onComplete` clears the state and calls `reload()`.

**`MigrationModal` (`client/components/migration-modal.tsx`):**
- `phase: 'preview' | 'running' | 'done' | 'error'` (starts at `preview`).
- `preview: MigratePreview | null`, `previewError: string | null`.
- `logLines: string[]`, `streamError: string | null`.
- `logRef: HTMLDivElement | null` - auto-scrolls to bottom on each `logLines` change.
- `esRef: EventSource | null` - closed in cleanup, also closed on `done` and `error`.
- `handleConfirm` switches to `running`, opens an EventSource at `buildMigrateUrl(...)`, parses each event.
- `onmessage`: `{message:string}` → append; `{error}` → flip to error; `{done:true}` → flip to done.
- `onerror` while `running`: flip to error with "Connection lost".

---

## Database Snapshot (Dev-DB `ccc` on `kkh01vddb01`, MariaDB 10.11.14)

| Table | Rows | Key shape |
|---|---|---|
| `projects` | 30 (21 pre-existing + 9 added by 04d scan-home; no deletions this session) | `parent_id` / `lock_user_id` / `lock_session_id` nullable; `group_name` nullable post-04a01; "To Be Migrated" rows have `evaluated=0`, `active_version=NULL`, `parent_id=NULL`. |
| `project_core_files` | ~58 (no new entries this session - TBM rows are inserted without core_files; LEFT JOIN returns null and `rowsToProject` falls back to defaults) | (project_id, file_type) PK; CASCADE on project_id |
| `sessions` | varies | `user_id` nullable post-03d01 |
| `settings` | 6 | `project_root` = `/mnt/sc-development`; `file_patterns` JSON = v1.1 layout |
| `users` | 0 | (multi-user lands in Stage 05) |
| `project_integrations` | 0 | (Stage 09+) |

`data/projects.json` and `data/settings.json` in the v1.1 tree are no longer consulted at runtime. JSON files remain on disk as backups.

---

## Key Technical Details

### v1.1 folder structure created by `executeMigration` (per project root)
```
docs/
docs/adr/
docs/architecture/
docs/discussion/
docs/handoff/
docs/context/
docs/spec/
v{version}/                       <- {version} = project.activeVersion || '1.0'
v{version}/docs/
v{version}/docs/adr/
v{version}/docs/architecture/
v{version}/docs/discussion/
v{version}/docs/handoff/
v{version}/docs/context/
v{version}/docs/spec/
v{version}/docs/testfiles/
CLAUDE.md                         <- only created if missing; placeholder content "# CLAUDE.md\n"
.ccc-project.json                 <- always written; { id, name, version, migratedAt }
```

### `/api/scan-home` skip rules
- Names starting with `.` (hidden)
- `node_modules`, `__pycache__`, `.git`
- Anything already registered in `projects.path` (compared as relative path AND absolute path)

### `/api/projects/:id/migrate` SSE event grammar
```
data: {"message":"Creating docs"}
data: {"message":"Creating docs/adr"}
... (one per path)
data: {"message":"Creating CLAUDE.md"}
data: {"message":"Writing .ccc-project.json"}
data: {"message":"Done"}
data: {"done":true}
```
Or on error:
```
data: {"error":"<message>"}
```

### Path resolution chain (`src/projects.js:resolveProjectPath`) - unchanged
1. If `projectPath` is absolute → return as-is.
2. If `process.env.PROJECT_ROOT` is set → `path.join(PROJECT_ROOT, projectPath)`.
3. If DB has `settings.project_root` → `path.join(dbValue, projectPath)`.
4. Fall through → raw `projectPath`.

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
Or via root: `npm run build:client`.

### Server restart on Dev-Web (v1.1)
```
bash /tmp/ccc-restart.sh
```
Lost on Dev-Web reboot. Recreate inline via the snippet below if missing.

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

### Restart-script recreate snippet
```
ssh kkh01vdweb01.mng.mcsfam.local 'cat > /tmp/ccc-restart.sh << EOF
#!/bin/bash
PIDS=\$(pgrep -x node)
[ -n "\$PIDS" ] && for p in \$PIDS; do grep -q "server\.js" /proc/\$p/cmdline 2>/dev/null && kill \$p; done
sleep 2
cd /mnt/sc-development/CCC && nohup node server.js >/tmp/ccc-server.log 2>&1 </dev/null & disown
sleep 1; echo "started PID \$!"
EOF
chmod +x /tmp/ccc-restart.sh && bash /tmp/ccc-restart.sh'
```
~13s cold-start over NFS.

### Server start on Mac (v1.0)
- Double-click `~/Desktop/CCC Starter.command`.
- Or: `cd /Users/steinhoferm/SC-Development/CCC-v1.0 && npm start`.
- Browser at `http://localhost:3000`.

### Proxmox VM 416 (kkh01vdweb01)
- 16 GB RAM, `cpu: host` (i9-10900K passthrough; AVX/AVX2 required for Bun/claude-code).

---

## Dependencies (v1.1) - unchanged from 04c

### Root `package.json`

| Package | Version | Notes |
|---|---|---|
| `express` | ^4.18 | HTTP server |
| `ws` | ^8.x | WebSocket server |
| `node-pty` | `1.2.0-beta.11` | **Required for Node.js v25 compatibility** |
| `mariadb` | ^3.x | DB driver |
| `dotenv` | ^16.x | Used with `{override: true}` everywhere |
| `marked` | ^11.x | Markdown render |

### `client/package.json`

| Package | Version | Notes |
|---|---|---|
| `next` | 16.2.4 | Output: 'export' |
| `react` / `react-dom` | ^19 | |
| `@dnd-kit/core` | ^6.3.1 | 04c addition |
| `@dnd-kit/sortable` | ^10.0.0 | 04c addition |
| `@xterm/xterm`, `@xterm/addon-fit` | ^6.0, ^0.11 | UMD constructor: `new FitAddon.FitAddon()` |
| `lucide-react` | ^0.564.0 | Icons (chevrons, etc.) |
| `marked` | ^18.0.3 | Markdown render in client |

Build tooling: `pnpm` v10.33.3 (Dev-Web prereq, install once via `npm install -g pnpm`).

---

## Known Gotchas (cumulative, post-04d)

1. v1.1 testing happens on Dev-Web only. Test URL is `http://kkh01vdweb01.mcsfam.local/CCC/`. **v1.0 testing is on Mac at `localhost:3000`.**
2. Browser caching is sticky. **Cmd+Shift+R required** after every preview build, every server restart with frontend changes.
3. Apache config not in repo - lives on Dev-Web only.
4. **GitHub push from CC works** via inline token URL. `.env GITHUB_TOKEN`.
5. `sshpass` to Dev-Web works with the right invocation (`-o PreferredAuthentications=password -o PubkeyAuthentication=no` + stdin redirect from `/dev/null` + reading credentials from `.env`).
6. `docs/handoff/CCC_recovery.md` is legacy-tracked. Modifies mid-session (auto-regenerated). `git rm --cached` + `.gitignore` pending. Deleting it does not stop regeneration.
7. `dotenv` default does NOT override existing `process.env`. All v1.1 env-loading entry points use `dotenv.config({ override: true })`.
8. Provisioned DB user is `ccc`, not `ccc_app`.
9. MariaDB sees Mac connections from `hhq01vifw01.mng.mcsfam.local` (NAT through firewall). The `ccc` user's GRANT must cover that host.
10. Forgejo macOS keychain entry stale. Direct `git push origin` works because the Forgejo repo URL has no auth.
11. `lock_session_id` has no FK (would create circular dep with sessions).
12. `.env` has unquoted shell-special characters (`&&` in DB_PASSWORD/SSH_USER_Password). Quote all `.env` values to silence dotenv warnings AND so `source .env` works. The `grep | cut -d=` pattern in the sshpass snippet bypasses this.
13. Sub-stage closure pattern: `Stage NNx complete - <brief>`. Two-commit pattern for sub-stage closure: code commit + GO/SHP/tasklist commit.
14. Mac and Dev-Web are the SAME filesystem (TrueNAS share - SMB on Mac, NFS on Dev-Web). Edits made on the Mac are immediately visible on Dev-Web.
15. CCC v1.1 server only works on Dev-Web. `PROJECT_ROOT=/mnt/sc-development` exists only there. **CCC v1.0 only works on Mac.**
16. Restarting the v1.1 server takes ~13s over NFS.
17. `data/projects.json` and `data/settings.json` are no longer consulted at runtime in v1.1.
18. `sessions.user_id` is `NULL` post 03d01.
19. `destroySession` and `pty.onExit` race on session replace - whichever lands second wins (`'exited'` typically).
20. **Frontend basePath (v1.1).** `BASE_PATH = window.location.pathname.replace(/\/index\.html$/, "/").replace(/\/$/, "")` derives `/CCC` under Apache, empty on direct port. All `api()` and WebSocket URLs prefix with this.
21. **Apache `ProxyPass /CCC/design-preview !` was removed** when the design preview was retired.
22. **Proxmox VM `cpu: host` required** - Bun runtime JIT segfaults on `kvm64` (lacks AVX/AVX2).
23. **`pnpm` is a Dev-Web dependency** - `npm install -g pnpm` if missing.
24. **`pkill -f "node server.js"` from an SSH bash shell self-kills the parent.** Use `pgrep -x node` + `/proc/$p/cmdline` filter.
25. **API field shape mismatch.** Live API has been camelCase since 04a (`subProjects`, `parentId`, etc.) - kickoffs/concept docs sometimes show snake_case in examples; the live shape is authoritative.
26. **Field name on versions endpoint is `testFiles`, not `tests`.** Each entry includes `stagePath` (post-04b).
27. **Scanner regex matches `^${projectName}_test_stage\d+[a-z]*\d*\.md$`.** Test files for project `Foo` must literally be named `Foo_test_stageNN[a][NN].md`.
28. **`/api/projects/scan` does not exist.** Real route: `POST /api/scan-project`.
29. **Workflow: commits go on completion + GO, not just at task completion.** Pattern is two commits per sub-stage closure (code + GO/SHP/tasklist).
30. **v1.0 lives in a parallel worktree.** Two worktrees share `.git`. Independent `node_modules`, `.env`, `data/`.
31. **Worktree `data/settings.json` is a copy.** Will diverge from v1.1 - intended.
32. **Desktop launcher is a plain bash wrapper** (`~/Desktop/CCC Starter.command`).
33. **Worktree `package-lock.json` shows as modified.** Cosmetic.
34. **v1.0 `.env` `GITHUB_REPO` format is `owner/repo`.** v1.1's `.env` has the full URL.
35. **Worktree's tagged `tools/macos/start_CCC.command` has a 15s startup timeout - too short for cold-SMB.** Use the Desktop wrapper instead.
36. **macOS SMB credentials are per-share on TrueNAS.** Per-share keychain entry required.
37. **The treeview is DB-of-record, not FS-driven.** `getAllProjects()` is one SQL JOIN; per-project `scanVersions` only fires on row expand.
38. **`scanVersions()` has a defensive guard since 04b01** - refuses to scan PROJECT_ROOT.
39. **`POST /api/projects` route handler forwards `parentId` and `evaluated`.** Top-level still requires `group`. Sub-projects (parentId set) leave group as NULL. (04c fix.)
40. **`globals.css` SMB-locked since 2026-05-06.** Several sessions in a row now. Pending session-local fix when SMB re-permissions cooperate.
41. **Dev fixtures are persistent.** Alpha (Active), Bravo (Parked), Charlie (Active, v1.1 layout), Delta (Active container), delta-svc + delta-admin (sub-projects of Delta) are all retained.
42. **Test file rewriting policy.** A test file may be rewritten in place when the kickoff scope changes mid-stage (precedent: 04b01).
43. **Mental-model check during /tested.** If Phet's symptom doesn't reconcile with the code, ask one direct question rather than guessing.
44. **Phet's tick state is authoritative input to /tested.** Once Phet ticks an item, treat it as Phet's call. CC verifies its own CLI-runnable items in parallel; gating concerns are about deployment state, not Phet's testing process.
45. **Bug discovery protocol** (auto-memory `feedback_fix_bugs_on_the_spot.md`): bug blocks current task → fix on the spot; bug spotted incidentally → report to Phet, decide together. Never just record-and-walk-away.
46. **`/api/browse` returns `{current, parent, directories: [name strings]}`**, not `{dirs: [{name, path}]}` as some kickoff prompts suggested. The setup page wires to the live shape.
47. **`tokens(theme)` does NOT include `bgPanel`.** Use `bgCard` for modal/card backgrounds. (Caught and fixed in 04d.)
48. **`/api/projects/:id/migrate` is SSE.** Browser-side `EventSource` connects directly; no wrapper. The connection must be closed explicitly on done/error to release the server-side request handler.
49. **`scan-home` insertion bypasses `addProject`.** It does direct SQL INSERT and skips `project_core_files`. `getAllProjects` LEFT-JOINs and `rowsToProject` falls back to `emptyCoreFiles()` when no rows match - works correctly. Any future field added to `addProject` that should also apply to TBM rows needs to be added in `migration.js`'s INSERT too.
50. **The 9 "To Be Migrated" rows currently in DB are real top-level dirs.** Don't blindly delete them; some may correspond to projects Phet wants to register later.

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
| 04d | First-Run Setup + Migration-via-Drag | **GO 2026-05-06** | **`73786cc`** + the SHP/tasklist follow-up |
| 04e | Multi-Session Tab Bar | not started | - |

**Stage 04 main Go/NoGo gate** still open. Closes after 04e.

---

## Open Items / Carry-Forwards

- **`client/app/globals.css`** still SMB-locked. Verify and commit (or revert) once readable. This has been pending for several sessions now.
- **`docs/handoff/CCC_recovery.md`** legacy-tracked auto-regenerating file. `git rm --cached` + add to `.gitignore` pending.
- **`.env` value quoting** (gotcha #12). `source .env` errors on `&&` lines.
- **`/api/projects/:id/active-version` PUT contract** (carry-over). May expect `{version}` not `{activeVersion}`. Worth a server-side audit when 04d/04e need it.
- **API field-shape concept-doc correction** (Cowork): camelCase, not snake_case.
- **`pnpm` documented as Dev-Web prereq** (Cowork).
- **9 "To Be Migrated" rows in DB.** Real top-level dirs. Phet decides which to migrate; the rest can stay or be deleted via `DELETE /api/projects/:id`.
- **v1.1.0 not yet tagged.** Tag at end of v1.1 cycle.
- **Stage 04e kickoff** Multi-Session Tab Bar; Cowork-drafted (existing draft pre-dates 04d).
- **Forgejo deploy via `deploy.sh`** (global rule, active 2026-04-25). Currently deploys are direct rsync/build on Dev-Web; the formal `deploy.sh` path needs wiring before a formal Stage 04 GO release.
- **Add-group route 409 message is shared** between "already exists" and "reserved name" cases. Cosmetic - separate message would require touching the route handler.

---

## Next Actions (next session)

1. **Stage 04e kickoff** (Cowork-drafted) - Multi-Session Tab Bar above the main panel. Charlie / Delta still good fixtures.

2. **After 04e ships:** Stage 04 main Go/NoGo gate. After GO, move to Stage 05 (Authentication & Multi-User).

3. **Optional cleanup (any session):**
   - `client/app/globals.css` re-read after SMB unlocks; verify content; commit or revert.
   - `docs/handoff/CCC_recovery.md` `git rm --cached` + add to `.gitignore`.
   - `.env` quote unquoted values.
   - Forgejo deploy via `deploy.sh`.
   - Decide what to do with the 9 "To Be Migrated" rows from the 04d scan-home call.

---

*End of SHP. Build 73 (`73786cc`) on Forgejo + GitHub. v1.1 Stage 04d GO, Stage 04 main gate still open. v1.0 worktree at `CCC-v1.0` untouched. Run `/continue` to resume.*
