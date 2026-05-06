# Session Handover Pack - CCC
*Generated: 2026-05-06 (EOD, after Stage 04c GO) | Version: v1.1.0 (dev) + v1.0.7 (local) | Stage 04c GO; Stage 04 still open (04d + 04e remain) | Build 71 | Both remotes at `68f13f9`*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Two live versions, two environments:**
  - **v1.1.0 (dev):** runs on **Dev-Web only** at `http://kkh01vdweb01.mcsfam.local/CCC/` via Apache reverse proxy onto `127.0.0.1:3000`. MariaDB-backed, Next.js client. Active development line.
  - **v1.0.7 (production-stable, local):** runs on **Mac only** at `http://localhost:3000`. JSON-file-backed, vanilla `public/` frontend. Lives in a parallel git worktree at `/Users/steinhoferm/SC-Development/CCC-v1.0` pinned to tag `v1.0.7`. **v1.0 was never intended to run on Dev-Web.**
- **Active version in projects DB (v1.1):** `"1.1"`.
- **Stage:** Stage 04c **GO** 2026-05-06 (commit `68f13f9`). Stage 04 main gate still open - 04d (First-Run Setup + Migration-via-Drag) and 04e (Multi-Session Tab Bar) remain.

---

## What Was Done This Session (2026-05-06, evening)

### Stage 04c GO - Treeview: Parent/Sub-Project Rendering + Drag-Drop

The kickoff (`docs/handoff/stage04c-prompt.md`) defined 8 tasks. All shipped, plus one bug fix folded in.

**Backend changes:**

1. **`src/projects.js`:** `reorderProjects()` UPDATE statement extended to set `parent_id` from `entry.parentId ?? null`. Backwards compatible: existing callers that don't supply `parentId` write `NULL`, which is correct for top-level projects.
2. **`server.js`:** new `GET /api/projects/:id/progress` route. Reads the project's registered `coreFiles.tasklist`, scans line-by-line, counts `^### Sub-Stage` headers (= total) and `-> GO` markers within each sub-stage block (= completed). Returns `{completed, total}`. 404 on unknown project; `{0,0}` on no-tasklist or missing file.
3. **`server.js`:** `findProjectWithPath()` helper now walks the tree (top-level + `subProjects[]`) so sub-project IDs resolve correctly.
4. **`server.js`:** `POST /api/projects` route handler bug fix - now forwards `parentId` AND `evaluated` to `addProject()`; `group` is optional when `parentId` is set; top-level still requires `group` with new error message `"group is required for top-level projects"`. **This closes SHP gotcha #40 (the `evaluated` half) and unblocks sub-project creation via direct POST instead of forcing the drag-drop code path.**

**Client changes:**

5. **`client/lib/api.ts`:** added `fetchProgress()` and `reorderProjects()` helpers, plus `ProjectProgress` and `ReorderEntry` types.
6. **`client/components/treeview-shell.tsx`:** substantial rewrite around the existing structure (test-file grouping preserved):
   - `ContainerRow` (a project with `subProjects.length > 0`): aggregate status dot via `aggregateStatus()` (priority `waiting > error > running > completed > unknown`), `GRP` badge, no progress bar, no Start Session button. Collapsible body renders sub-projects as draggable `ProjectRow`s.
   - `ProgressBar` + `useProjectProgress(id, hasTasklist)` hook: leaf rows with a registered tasklist render `Stage N / Total` (mono 9px) plus a 60×2px filled bar coloured by current status.
   - Filter behaviour: when query is non-empty, container stays visible if its name matches OR if any sub-project name matches; only matching sub-projects render under it.
   - Dispatch in `TreeviewShell`: containers → `DroppableContainerRow`, leaf top-level → `SortableLeafRow`.
   - **Drag-drop:** `DndContext` wraps the tree, `PointerSensor` with `activationConstraint: { distance: 5 }` so click-to-expand still fires on stationary clicks. Two `SortableContext`s (Active, Parked) hold leaf top-level IDs. `useDroppable({id: 'group:Active'|'group:Parked'})` on `GroupHeader`. `useDroppable({id: 'container:<id>'})` on each container. Sub-projects use `useDraggable`. `DragOverlay` shows a minimal name-only ghost.
   - **Drag-end logic** (`handleDragEnd`): inspects `over.id` prefix - `group:` → set group, parentId=null, append; `container:` → set parentId, group=null; bare project ID → if container, treat as drop-into-container; if sub-project, place in same parent; else sort within group. Optimistic local update via `applyMove()` (pure helper that returns a new tree); full reorder payload built by `buildReorderPayload()` (top-level + sub-project entries with sequential `order`); `apiReorderProjects()` PUT. Error path: revert + `reload()`.
   - **Chevron hit-area enlargement** (mid-stage UX fix): project/container chevrons 11→14 with 22×22 hit area; Testing 10→13 with 20×20; stage group 9→12 with 18×18. Each chevron has its own `onClick` with `stopPropagation` so it works even when the surrounding row hosts drag listeners.

**Test file:**

7. **`docs/v1.1/CCC_test_stage04c.md`:** comprehensive checklist mirroring the v1.0 format. CC ran every CLI item end-to-end against the live (post-restart) Dev-Web build; PASS comments include actual values (`21/59`, `404`, `{0,0}`, captured IDs, etc.). Phet ticked browser items.

**Deploy + verification:**

- `pnpm add @dnd-kit/core @dnd-kit/sortable` (Dev-Web, 15.5s) → `@dnd-kit/core 6.3.1`, `@dnd-kit/sortable 10.0.0`.
- `NEXT_PUBLIC_BASE_PATH=/CCC pnpm build` (Dev-Web, 4.0s) → 5 routes, no TS errors.
- `bash /tmp/ccc-restart.sh` → PID 3765, ~13s cold start.
- All Task 1-7 CLI items verified PASS against the new server.

**Side-effects (intentional, kept):**

- **CCC's `coreFiles` re-registered to v1.1.0 paths.** Old registration pointed to `docs/v1.0/v1.0.1/CCC_concept_v1.0.1.md` and `docs/v1.0/v1.0.1/CCC_tasklist.md` (which uses old `### Tasks` / `### Go/NoGo Gate` headers - genuinely 0 sub-stages by the v1.1 regex). Updated to `docs/v1.1/CCC_concept_v1.1.0.md` and `docs/v1.1/CCC_tasklist_v1.1.0.md`. The `/progress` endpoint now returns `21/59` for CCC.
- **Three new projects in DB (canonical container fixture):**
  - `Delta` (Active, container) = `f0958507-5bb5-44b7-8b17-2d69b33ccb4c`
  - `delta-svc` (sub-project of Delta, group=NULL) = `0a76c426-9529-48f7-b944-42f2ad83f79a`
  - `delta-admin` (sub-project of Delta, group=NULL) = `59c86fc1-a1ce-4f7e-924a-0ea0cf2a990d`
  Mirrors the Alpha/Bravo/Charlie retention from 04b01.

**Memory updates:**

- New auto-memory: `feedback_fix_bugs_on_the_spot.md` ("Bug discovery protocol"). Two-part rule: bug blocks current task → fix on the spot; bug spotted incidentally while reading code → report to Phet, decide together. Never just record-and-walk-away.

**Carry-forwards from prior session that are NOT yet resolved:**

- `client/app/globals.css` is **still SMB-locked**. `cat`, `cp`, `git`, and `Read` all return `Permission denied` despite `rwx------` ownership. Yesterday's edit (origin: 04bN font fallback) remains uncommitted (left out of `68f13f9` for the same reason).
- `docs/handoff/CCC_recovery.md` is still legacy-tracked and auto-regenerates from terminal capture; left out of commits this session as before. `git rm --cached` + `.gitignore` pending.

---

## Decisions Made This Session

1. **Roll the chevron hit-area UX fix into Stage 04c (option a) rather than deferring to 04c01.** Phet flagged the "icons too small to click" complaint mid-session; both options were on the table; Phet picked (a) given how minor the change was. Test file got a "Chevron hit-area enlargement (mid-stage UX fix)" sub-section under Task 4 to track the work.
2. **Fix the `POST /api/projects` parentId/evaluated bug on the spot.** Discovered while running the test setup (sub-project create returned HTTP 400 because the route handler ignored `parentId` and required `group`). Initial attempt was to log it as "future cleanup" and use the reorder code path as a workaround; Phet pushed back ("when you find a bug you fix it on the spot"). The fix was small (3 lines + an error message change) and closed half of SHP gotcha #40 (the `evaluated` parallel issue).
3. **Save the bug discovery protocol as auto-memory.** Two-part rule: blocking bugs get fixed; incidental discoveries get reported (don't silently rewrite arbitrary code while reading).
4. **Re-register CCC's `coreFiles` to the v1.1 file paths.** Old registration was stale (v1.0.1 era). Touching it during `/progress` testing made the endpoint return real data; left in place because v1.1 is the active version and the v1.0.1 paths were obsolete anyway.
5. **`sshpass` to Dev-Web is unblocked.** Previous "sshpass hangs" gotcha (#6) is obsolete: combination of `-o PreferredAuthentications=password -o PubkeyAuthentication=no` plus stdin redirect from `/dev/null` plus reading credentials from `.env` lets the Bash tool drive Dev-Web autonomously, without requiring Phet to load the SSH key into the agent. SHP gotchas updated.
6. **Container fixture `Delta` retained post-test.** Mirrors the Alpha/Bravo/Charlie retention from 04b01. Becomes the canonical container fixture for 04d/04e and beyond.
7. **Skip `client/app/globals.css` from this commit.** Same SMB-lock condition as yesterday's session; not 04c-related work; carry forward.
8. **Skip the `docs/handoff/CCC_recovery.md` modification.** Same as prior sessions; legacy auto-tracked file regenerates on its own.
9. **Two-commit closure pattern (`Stage 04c complete - ...` followed by SHP/tasklist commit).** Matches recent precedent (`b4c4a70` + `565363f`, `e8809cd` + `565363f`). The SHP/tasklist commit is the one that closes the day; this file is part of it.

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
| `68f13f9` | **Stage 04c complete - parent/sub-project rendering + drag-drop** | 2026-05-06 |

Tags: `v1.0.0` -> `v1.0.7`. v1.1.0 not yet tagged (deferred to end of v1.1 cycle).

**Worktree HEAD:** `138a565` (v1.0.7).

---

## Git State

**Forgejo (`origin`)**: `http://mcs-git.mcsfam.local:3000/Phet/CCC.git` - HEAD `68f13f9`.
**GitHub (`github`)**: `https://github.com/SC-dev-0902/CCC.git` - HEAD `68f13f9`.

**Worktrees:**
```
/Users/steinhoferm/SC-Development/CCC       68f13f9 [main]
/Users/steinhoferm/SC-Development/CCC-v1.0  138a565 (detached HEAD = v1.0.7)
```

**Uncommitted in v1.1 tree at end of session (carried forward; will be in next commit):**
```
 M client/app/globals.css           <- SMB lock since 2026-05-06; content unverifiable
 M docs/handoff/CCC_recovery.md     <- legacy auto-tracked; will regenerate; pending git rm --cached
 M docs/handoff/CCC_shp.md          <- this file, just rewritten by /eod (will be staged + committed)
 M docs/v1.1/CCC_tasklist_v1.1.0.md <- 04c ticked (will be staged + committed)
```

A second `Stage 04c GO 2026-05-06 + tasklist ticks + SHP` commit will close the session.

---

## Architecture & File Map

### v1.1 (this directory: `/Users/steinhoferm/SC-Development/CCC`)

| Area | File / Path | Purpose |
|---|---|---|
| **Backend (Express)** | | |
| Server entry | `server.js` | Routes, WS server, static `client/out/` mount, startup IIFEs (migration, orphan-session cleanup), 30s usage broadcaster. **04c:** new `findProjectWithPath` walks tree; new `GET /api/projects/:id/progress`; `POST /api/projects` forwards `parentId`+`evaluated`, `group` optional with parentId. |
| DB layer | `src/db.js` | Lazy MariaDB pool, `query`/`queryOne`/`transaction` helpers |
| Project CRUD | `src/projects.js` | `getAllProjects` (DB-only, JOIN), `addProject` (already supported parentId from 04a), `updateProject`, `removeProject`, **`reorderProjects` now UPDATEs `parent_id`**, `addGroup`/`removeGroup`, `resolveProjectPath`, `renameProject` |
| Sessions (PTY) | `src/sessions.js` | `node-pty` lifecycle, `claudeStatus` parsing wired to parser |
| Status parser (sacred) | `src/parser.js` | All Claude Code output -> 5 statuses |
| Version scanner | `src/versions.js` | Post-04b layout, defensive guard refuses `scanVersions(PROJECT_ROOT)` since 04b01 |
| Token usage | `src/usage.js` | Reads `~/.claude/projects/`, NOT PROJECT_ROOT |
| Migrations | `migrations/001_initial.sql`, `003_sessions_user_id_nullable.sql`, `004_group_name_nullable.sql`, `002_import.js` | |
| **Frontend (Next.js)** | | |
| Source root | `client/` | |
| Static export | `client/out/` (regenerated by `pnpm build` on Dev-Web) | |
| Pages | `client/app/page.tsx`, `client/app/settings/page.tsx`, `client/app/login/page.tsx`, `client/app/setup/page.tsx` | |
| Layout | `client/app/layout.tsx` | System fonts; no Google CDN; no @vercel/analytics |
| Globals | `client/app/globals.css` | System fonts at top, design tokens below. **SMB-locked since 2026-05-06.** |
| Treeview | `client/components/treeview-shell.tsx` | **04c overhaul:** ContainerRow + DroppableContainerRow, SortableLeafRow, DraggableSubProjectRow, ProgressBar + useProjectProgress, aggregateStatus, container-aware filter, DndContext wrapping with two SortableContexts and group/container droppables, applyMove + buildReorderPayload, chevron hit-area enlargement |
| Dashboard | `client/components/dashboard-main.tsx` | Terminal + FileReader slots |
| Terminal | `client/components/terminal-panel.tsx` | xterm.js via dynamic import (ssr:false), wired through wsPool |
| File reader | `client/components/file-reader-panel.tsx` | `marked` for `.md`, `<pre>` fallback |
| Settings | `client/components/settings-shell.tsx` | `GET/PUT /api/settings`, theme via `useTheme()` |
| API client | `client/lib/api.ts` | **04c:** `fetchProgress`, `reorderProjects`, `ProjectProgress`, `ReorderEntry` types added. |
| WebSocket pool | `client/lib/ws.ts` | Per-project sockets keyed on `projectId`, `*`-wildcard subscription |
| Theme context | `client/components/theme-context.tsx` | `tokens(theme)` for design tokens |
| Build config | `client/next.config.mjs` | `output: 'export'`, `basePath: process.env.NEXT_PUBLIC_BASE_PATH \|\| ''` |
| Dummy data | `client/lib/dummy-data.ts` | Type exports retained (`Status`, `Project`, `SubProject`); data constants no longer imported |
| **Apache (Dev-Web only, not in repo)** | | |
| Reverse proxy | `/etc/apache2/conf-available/CCC.conf` | `ProxyPass /CCC/ -> 127.0.0.1:3000/`, `ProxyPass /CCC/ws -> ws://127.0.0.1:3000/ws` |
| **Docs** | | |
| Stage kickoffs (04) | `docs/handoff/stage04{a,a01,b,bN,b01,c}-prompt.md` | All committed |
| Test files (04) | `docs/v1.1/CCC_test_stage04{a,b,bn,b01,c}.md` | All committed |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` | 04c ticked + GO line added |
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
| GET | `/api/projects` | All projects, grouped (DB-only, no FS) |
| POST | `/api/projects` | **04c:** Add a project; forwards `parentId`+`evaluated`; `group` optional when `parentId` set; top-level requires `group` (HTTP 400 otherwise) |
| PUT | `/api/projects/:id` | Update fields (name, group, coreFiles, activeVersion, evaluated, type) |
| POST | `/api/projects/:id/rename` | Rename project + propagate to all `{name}_*` files + folder |
| DELETE | `/api/projects/:id` | Remove project (`?deleteFiles=true` also removes the directory) |
| PUT | `/api/projects-reorder` | **04c:** Drag-drop reorder; `entry.parentId ?? null` is bound into the UPDATE alongside `group_name` and `sort_order` |
| GET | `/api/projects/:id/versions` | Version scan + test files (per-version `testFiles[]` with `stagePath`) |
| POST | `/api/projects/:id/versions` | Create new version folder |
| PUT | `/api/projects/:id/active-version` | Set active version (**known issue:** body shape may need `{version}` not `{activeVersion}`) |
| DELETE | `/api/projects/:id/versions/:version` | Delete a version (auto-fallback if active) |
| POST | `/api/projects/:id/versions/:version/complete` | Mark version completed (Git tag prompt) |
| POST | `/api/projects/:id/migrate-versions` | Migrate from flat to versioned layout |
| POST | `/api/projects/:id/evaluated` | Set the evaluated flag |
| GET | `/api/projects/:id/test-file-path` | Resolve a test file's actual path |
| **GET** | **`/api/projects/:id/progress`** | **04c (new):** scans the project's `coreFiles.tasklist`; returns `{completed, total}` based on `^### Sub-Stage` headers and `-> GO` markers within each block. 404 on unknown project; `{0,0}` on no-tasklist or missing-file. |
| POST | `/api/groups` | Add group |
| DELETE | `/api/groups/:name` | Remove group |
| GET | `/api/browse` | List subdirectories |
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

## Frontend State Model (v1.1, post 04c)

**`TreeviewShell` (`client/components/treeview-shell.tsx`):**
- `projects: ApiProject[]` - loaded from `fetchProjects()` on mount and on refresh.
- `loading: boolean`, `error: string | null`.
- `query: string` - filter input.
- `statusMap: Map<string, Status>` - WS-driven, indexed by projectId.
- `draggingId: string | null` - currently dragged project (for DragOverlay).
- `dragError: string | null` - shown briefly on reorder API failure.
- `previousProjectsRef: useRef<ApiProject[] | null>` - holds pre-drag state for rollback.
- `sensors`: `useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))`.

**Filter `filtered` memo:**
- Returns array of `{ project, visibleSubProjects }`.
- Leaf top-level project: included if name matches.
- Container: included if container name matches (full subProjects rendered) OR if any sub-project name matches (only matching subs rendered).

**`active` / `parked` / `activeIds` / `parkedIds`:** filtered slices by `group`; `activeIds`/`parkedIds` are the SortableContext `items[]`.

**`ProjectRow`:**
- `expanded`, `effectiveExpanded = forceExpand || expanded`.
- `versionsData`, `loadingVersions`, `versionsError` - lazy on first expand.
- `testingExpanded`.
- `progress = useProjectProgress(project.id, hasTasklist)` - `{completed, total, loading}`.
- Props now include `dragHandleProps` (sortable/draggable listeners + activator ref), `setRowRef`, `rowStyle` (transform + transition), `isDragging`.

**`useProjectProgress(projectId, hasTasklist)`:**
- If `!hasTasklist`: returns `{0, 0, false}` immediately.
- Else: fires `fetchProgress(projectId)` once, sets state on resolve, returns `loading: true` until then.

**`ContainerRow` (new):**
- `expanded` local state.
- `aggregate = aggregateStatus(visibleSubProjects.map(sp => statusMap.get(sp.id) || 'unknown'))` (memoized).
- `isOverContainer` from `useDroppable({id: 'container:<id>'})` - shows 1px highlight border when a leaf is hovering.
- Renders sub-projects via `DraggableSubProjectRow`.

**`SortableLeafRow` / `DroppableContainerRow` / `DraggableSubProjectRow`:** thin wrappers that wire dnd-kit hooks to the underlying row components.

**Drop targets (in DndContext):**
- `useDroppable({id: 'group:Active'})` and `'group:Parked'` on `GroupHeader`.
- `useDroppable({id: 'container:<id>'})` on each container.
- Sortable items participate via `useSortable`.

**Drag-end logic (`handleDragEnd`):**
1. Look up dragged + over.
2. Branch on `over.id` prefix:
   - `group:` → set group, parentId=null, append to that group.
   - `container:` → set parentId, group=null, append to container's subs.
   - bare ID → if container, drop-into-container; if sub-project, place in same parent at that index; else top-level sort within group at that index.
3. No-op detection short-circuits.
4. `applyMove(projects, ...)` returns the new tree (pure helper).
5. `setProjects(next)` (optimistic).
6. `apiReorderProjects(buildReorderPayload(next))` PUT.
7. On error: revert from `previousProjectsRef`, then `reload()` to be safe.

**Render pipeline summary:**
1. Mount → `fetchProjects()` → `setProjects` + `setLoading(false)`.
2. WS pool subscribes to `*` → `claudeStatus` / `state` updates `statusMap`.
3. `filtered` memo → `active` / `parked`.
4. `DndContext` wraps; each group renders inside its `SortableContext`. Containers render via `DroppableContainerRow`; leaves via `SortableLeafRow`.
5. Each `ProjectRow`: collapsed by default. On expand → `fetchProjectVersions(id)`; tasklist hook fires `/progress` if registered.
6. Sub-projects render under expanded containers via `DraggableSubProjectRow`.

---

## Database Snapshot (Dev-DB `ccc` on `kkh01vddb01`, MariaDB 10.11.14)

| Table | Rows | Key shape |
|---|---|---|
| `projects` | 21 (20 pre-existing - Delta + 2 sub-projects added 04c; no deletions this session) | `parent_id` / `lock_user_id` / `lock_session_id` nullable; `group_name` nullable post-04a01 |
| `project_core_files` | ~58 (CCC's 3 entries updated to v1.1 paths; 3 new entries each for delta-svc/delta-admin) | (project_id, file_type) PK; CASCADE on project_id |
| `sessions` | varies | `user_id` nullable post-03d01 |
| `settings` | 6 | `project_root` = `/mnt/sc-development`; `file_patterns` JSON = v1.1 layout |
| `users` | 0 | (multi-user lands in Stage 05) |
| `project_integrations` | 0 | (Stage 09+) |

`data/projects.json` and `data/settings.json` in the v1.1 tree are no longer consulted at runtime. JSON files remain on disk as backups.

---

## Key Technical Details

### `/api/projects` response shape (camelCase since 04a)
```json
{
  "groups": [{"name":"Active","order":0},{"name":"Parked","order":1}],
  "projects": [
    {
      "id": "uuid", "name": "...", "path": "...",
      "group": "Active", "type": "code", "activeVersion": "1.1",
      "evaluated": true, "order": 0,
      "parentId": null, "subProjects": [...],
      "lockUserId": null, "lockSessionId": null,
      "coreFiles": {"claude": "CLAUDE.md", "concept": "...", "tasklist": "..."}
    }
  ]
}
```

### `/api/projects/:id/progress` response shape (04c)
```json
{ "completed": 21, "total": 59 }
```
Algorithm: line scan tracking `inStage` + `stageHasGo` flags. Each `^### Sub-Stage` header increments `total` and starts a new stage. Each `-> GO` within a stage sets `stageHasGo = true`. When the next `### Sub-Stage` header arrives (or EOF), if the previous stage had a GO, `completed` increments. Endpoint returns `{0,0}` when project has no tasklist registered or the file is missing on disk; 404 on unknown project ID.

### `/api/projects-reorder` payload (04c)
```json
{
  "orderedIds": [
    { "id": "<uuid>", "group": "Active", "order": 0, "parentId": null },
    { "id": "<sub-uuid>", "group": null, "order": 0, "parentId": "<parent-uuid>" }
  ]
}
```
Each entry is one `UPDATE projects SET group_name = ?, sort_order = ?, parent_id = ? WHERE id = ?`. Pre-04c callers without `parentId` continue to work (`?? null`).

### Path resolution chain (`src/projects.js:resolveProjectPath`)
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

### sshpass to Dev-Web (NEW - replaces gotcha #6)
The Bash tool can drive Dev-Web autonomously without requiring Phet to load the SSH key. Pattern:
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
Key elements: SSH options inline (not via `$SSH_OPTS` var - shell parsing breaks on the space-separated form); `< /dev/null` redirect; `PreferredAuthentications=password` + `PubkeyAuthentication=no` to skip the key dance. SSH-USER_ID and SSH_USER_Password live in `.env` (note `.env` has unquoted `&&` in the password value - the `grep | cut -d=` extraction handles it cleanly).

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

## Dependencies (v1.1)

### Root `package.json` (key entries)

| Package | Version | Notes |
|---|---|---|
| `express` | ^4.18 | HTTP server |
| `ws` | ^8.x | WebSocket server |
| `node-pty` | `1.2.0-beta.11` | **Required for Node.js v25 compatibility** |
| `mariadb` | ^3.x | DB driver |
| `dotenv` | ^16.x | Used with `{override: true}` everywhere |
| `marked` | ^11.x | Markdown render |

### `client/package.json` (key entries, including 04c additions)

| Package | Version | Notes |
|---|---|---|
| `next` | 16.2.4 | Output: 'export' |
| `react` / `react-dom` | ^19 | |
| `@dnd-kit/core` | ^6.3.1 | **04c addition.** `@dnd-kit/utilities` and `@dnd-kit/accessibility` auto-pulled. |
| `@dnd-kit/sortable` | ^10.0.0 | **04c addition.** |
| `@xterm/xterm`, `@xterm/addon-fit` | ^6.0, ^0.11 | UMD constructor: `new FitAddon.FitAddon()` |
| `lucide-react` | ^0.564.0 | Icons (chevrons, etc.) |
| `marked` | ^18.0.3 | Markdown render in client |

Build tooling: `pnpm` v10.33.3 (Dev-Web prereq, install once via `npm install -g pnpm`).

---

## Known Gotchas (cumulative, post-04c)

1. v1.1 testing happens on Dev-Web only. Test URL is `http://kkh01vdweb01.mcsfam.local/CCC/`. **v1.0 testing is on Mac at `localhost:3000`.**
2. Browser caching is sticky. **Cmd+Shift+R required** after every preview build, every server restart with frontend changes.
3. Apache config not in repo - lives on Dev-Web only.
4. **GitHub push from CC works** via inline token URL. `.env GITHUB_TOKEN`.
5. **REPLACES previous gotcha #6:** `sshpass` to Dev-Web works with the right invocation (see Key Technical Details > sshpass section above). Bash tool can drive Dev-Web autonomously; ssh-add is no longer required.
6. `docs/handoff/CCC_recovery.md` is legacy-tracked. Modifies mid-session (auto-regenerated). `git rm --cached` + `.gitignore` pending. **Deleting it does not stop regeneration.**
7. `dotenv` default does NOT override existing `process.env`. All v1.1 env-loading entry points use `dotenv.config({ override: true })`.
8. Provisioned DB user is `ccc`, not `ccc_app`.
9. MariaDB sees Mac connections from `hhq01vifw01.mng.mcsfam.local` (NAT through firewall). The `ccc` user's GRANT must cover that host.
10. Forgejo macOS keychain entry stale. Direct `git push origin` works because the Forgejo repo URL has no auth.
11. `lock_session_id` has no FK (would create circular dep with sessions).
12. `.env` has unquoted shell-special characters (`&&` in DB_PASSWORD/SSH_USER_Password). Quote all `.env` values to silence dotenv warnings AND so `source .env` works. The `grep | cut -d=` pattern in the sshpass snippet bypasses this.
13. Sub-stage closure pattern: `Stage NNx complete - <brief>`. Two-commit pattern for sub-stage closure: code commit + GO/SHP/tasklist commit (precedent: 03d/03d01, 04a/04a01, 04bN, 04c).
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
24. **`pkill -f "node server.js"` from an SSH bash shell self-kills the parent.** Use `pgrep -x node` + `/proc/$p/cmdline` filter (the restart script does this).
25. **API field shape mismatch.** Live API has been camelCase since 04a (`subProjects`, `parentId`, etc.) - kickoffs/concept docs sometimes show snake_case in examples; the live shape is authoritative.
26. **Field name on versions endpoint is `testFiles`, not `tests`.** Each entry includes `stagePath` (post-04b).
27. **Scanner regex matches `^${projectName}_test_stage\d+[a-z]*\d*\.md$`.** Test files for project `Foo` must literally be named `Foo_test_stageNN[a][NN].md`.
28. **`/api/projects/scan` does not exist.** Real route: `POST /api/scan-project`.
29. **Workflow: commits go on completion + GO, not just at task completion.** Pattern is two commits per sub-stage closure (code + GO/SHP/tasklist).
30. **v1.0 lives in a parallel worktree.** Two worktrees share `.git`. Independent `node_modules`, `.env`, `data/`.
31. **Worktree `data/settings.json` is a copy.** Will diverge from v1.1 - that's intended.
32. **Desktop launcher is a plain bash wrapper** (`~/Desktop/CCC Starter.command`).
33. **Worktree `package-lock.json` shows as modified.** Cosmetic.
34. **v1.0 `.env` `GITHUB_REPO` format is `owner/repo`.** v1.1's `.env` has the full URL.
35. **Worktree's tagged `tools/macos/start_CCC.command` has a 15s startup timeout - too short for cold-SMB.** Use the Desktop wrapper instead.
36. **macOS SMB credentials are per-share on TrueNAS.** Per-share keychain entry required.
37. **The treeview is DB-of-record, not FS-driven.** `getAllProjects()` is one SQL JOIN; per-project `scanVersions` only fires on row expand.
38. **`scanVersions()` has a defensive guard since 04b01** - refuses to scan PROJECT_ROOT.
39. **REPLACES previous gotcha #40:** `POST /api/projects` route handler **now forwards `parentId` and `evaluated`** (fixed in 04c). Top-level still requires `group`. Sub-projects (parentId set) leave group as NULL.
40. **`globals.css` SMB-locked since 2026-05-06.** `cat`, `cp`, `git`, `Read` all `Permission denied` despite `rwx------`. Yesterday's edit (04bN font fallback) remains uncommitted; left out of `68f13f9`.
41. **Dev fixtures are persistent.** Alpha (Active), Bravo (Parked), Charlie (Active, v1.1 layout), Delta (Active container), delta-svc + delta-admin (sub-projects of Delta) are all retained.
42. **Test file rewriting policy.** A test file may be rewritten in place when the kickoff scope changes mid-stage (precedent: 04b01).
43. **Mental-model check during /tested.** If Phet's symptom doesn't reconcile with the code, ask one direct question rather than guessing.
44. **Phet's tick state is authoritative input to /tested.** Once Phet ticks an item in CCC, treat it as Phet's call. CC verifies its own CLI-runnable items in parallel; gating concerns are about deployment state, not Phet's testing process.
45. **Bug discovery protocol** (auto-memory `feedback_fix_bugs_on_the_spot.md`): bug blocks current task → fix on the spot; bug spotted incidentally → report to Phet, decide together. Never just record-and-walk-away.

---

## Stage 04 Sub-Stage Progression

| Sub-stage | Title | Status | Closure commit |
|---|---|---|---|
| 04a | DB Schema for Nesting | GO 2026-05-05 | `3f924ea` |
| 04a01 | group_name nullable schema fix | GO 2026-05-05 | `d9203d7` |
| 04b | Filesystem Scanner Update (backend) | GO 2026-05-06 | `e8809cd` (impl), `565363f` (ticks) |
| 04bN | Next.js Client Wiring | GO 2026-05-06 | `b4c4a70` (impl), `565363f` (GO) |
| 04b01 | Scan guard + dev-projects + grouped test files | GO 2026-05-06 | `6e4a0ec` |
| 04c | Treeview: Parent/Sub-Project rendering + drag-drop | **GO 2026-05-06** | **`68f13f9`** + the SHP/tasklist follow-up |
| 04d | First-Run Setup + Migration-via-Drag (redesigned 2026-05-06) | not started | - |
| 04e | Multi-Session Tab Bar | not started | - |

**Stage 04 main Go/NoGo gate** still open. Closes after 04d, 04e.

---

## Open Items / Carry-Forwards

- **`client/app/globals.css`** still SMB-locked. Verify and commit (or revert) once readable. This has been pending since 2026-05-06 morning.
- **`docs/handoff/CCC_recovery.md`** legacy-tracked auto-regenerating file. `git rm --cached` + add to `.gitignore` pending.
- **`.env` value quoting** (gotcha #12). `source .env` errors on `&&` lines.
- **`/api/projects/:id/active-version` PUT contract** (carry-over). May expect `{version}` not `{activeVersion}`. Worth a server-side audit when 04d/04e need it.
- **API field-shape concept-doc correction** (Cowork): camelCase, not snake_case.
- **`pnpm` documented as Dev-Web prereq** (Cowork).
- **`/tmp/04b-fixture` directory on Dev-Web** still on disk; clears on next reboot.
- **v1.1.0 not yet tagged.** Tag at end of v1.1 cycle.
- **`POST /api/projects` `evaluated` flag** carry-through is now in place (04c). Any future field added to `addProject()` (e.g. `coreFiles`) needs the same treatment in the route handler.
- **Stage 04d kickoff** redesigned 2026-05-06 (now First-Run Setup + Migration-via-Drag, replacing original New Project Wizard scope). Cowork-drafted kickoff in `docs/handoff/stage04d-prompt.md` once ready.
- **Stage 04e kickoff** Multi-Session Tab Bar; Cowork-drafted.

---

## Next Actions (next session)

1. **Stage 04d kickoff** (Cowork-drafted) - First-Run Setup + Migration-via-Drag. New scope replaces the original New Project Wizard idea. Charlie + Delta are good fixtures to test container-migration paths.

2. **Stage 04e kickoff** (Cowork-drafted) - Multi-Session Tab Bar above the main panel.

3. **After 04d + 04e ship:** Stage 04 main Go/NoGo gate. After GO, move to Stage 05 (Authentication & Multi-User).

4. **Optional cleanup (any session):**
   - `client/app/globals.css` re-read after SMB unlocks; verify content; commit or revert.
   - `docs/handoff/CCC_recovery.md` `git rm --cached` + add to `.gitignore`.
   - `.env` quote unquoted values.
   - Forgejo deploy via `deploy.sh` (Forgejo-first deploy global hard rule, active 2026-04-25). Currently deploys are direct rsync/build on Dev-Web; the formal `deploy.sh` path needs wiring before a formal Stage 04 GO release.

---

*End of SHP. Build 71 (`68f13f9`) on Forgejo + GitHub. v1.1 Stage 04c GO, Stage 04 main gate still open. v1.0 worktree at `CCC-v1.0` untouched. Run `/continue` to resume.*
