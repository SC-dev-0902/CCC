# Stage 04d Kickoff - First-Run Setup + Migration-via-Drag
*CCC v1.1 | Read and execute this file in full before writing any code.*

---

## Context

Stage 04c ships parent/sub-project rendering and drag-drop. This stage adds the first-run
experience and the drag-to-migrate workflow. When `settings.project_root` is not set, CCC
redirects to `/setup` where the user sets the Project Home Folder. After saving, CCC scans
the folder and surfaces all found (unregistered) directories under a "To Be Migrated" group.
Dragging a project from that group to Active/Parked/Container triggers a two-state migration
modal: preview then live execution.

The `/setup` page currently renders a placeholder `CreateAdminCard` component (scaffolded for
Stage 05 auth). Stage 04d replaces that placeholder with the project-root setup form. Stage 05
will extend `/setup` to also handle first-admin creation after the project-root step.

---

## Scope

Build exactly what is listed below. Nothing more.

**Out of scope for this stage:**
- Authentication (Stage 05)
- Background periodic directory scanning (Stage 11)
- Locking badge (Stage 06c)
- Settings page migration wizard (Stage 08 - superseded by this drag flow)
- No changes to `src/parser.js` (sacred)

---

## Technical Reference

**Environment:**
- CCC runs on Dev-Web at `/mnt/sc-development/CCC`
- Server: Node.js on `kkh01vdweb01`, running as `node server.js`
- Frontend: Next.js static export served from `client/out/`
- Test URL: `http://kkh01vdweb01.mcsfam.local/CCC/`

**Build command:**
```bash
cd /mnt/sc-development/CCC/client && NEXT_PUBLIC_BASE_PATH=/CCC pnpm build
```

**Server restart:**
```bash
bash /tmp/ccc-restart.sh
```
If `/tmp/ccc-restart.sh` is missing, recreate it:
```bash
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
  -o PreferredAuthentications=password -o PubkeyAuthentication=no \
  "$SSH_USER@kkh01vdweb01.mng.mcsfam.local" \
  'cat > /tmp/ccc-restart.sh << '"'"'EOF'"'"'
#!/bin/bash
PIDS=$(pgrep -x node)
[ -n "$PIDS" ] && for p in $PIDS; do grep -q "server\.js" /proc/$p/cmdline 2>/dev/null && kill $p; done
sleep 2
cd /mnt/sc-development/CCC && nohup node server.js >/tmp/ccc-server.log 2>&1 </dev/null & disown
sleep 1; echo "started PID $!"
EOF
chmod +x /tmp/ccc-restart.sh && bash /tmp/ccc-restart.sh' < /dev/null
```

**sshpass pattern (for running commands on Dev-Web):**
```bash
SSH_USER=$(grep '^SSH-USER_ID=' /mnt/sc-development/CCC/.env | cut -d= -f2-)
SSH_PASS=$(grep '^SSH_USER_Password=' /mnt/sc-development/CCC/.env | cut -d= -f2-)
sshpass -p "$SSH_PASS" ssh \
  -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
  -o PreferredAuthentications=password -o PubkeyAuthentication=no \
  "$SSH_USER@kkh01vdweb01.mng.mcsfam.local" '<command>' < /dev/null
```

**Key API shapes (existing, do not change):**
```
GET  /api/settings           -> { projectRoot, theme, editor, ... }
PUT  /api/settings           -> body: { projectRoot: "/mnt/sc-development" }
GET  /api/browse?path=...    -> { dirs: [{ name, path }] }
GET  /api/projects           -> { groups, projects: [...] }  (already returns "To Be Migrated" group if entries exist)
PUT  /api/projects-reorder   -> body: { orderedIds: [{id, group, order, parentId}] }
```

**"To Be Migrated" group:**
Stored in the `projects` table as `group_name = 'To Be Migrated'`. Treated as a standard group
by the existing `/api/projects` endpoint - it will appear in the response like any other group.
No schema changes needed. The group name is reserved; no user can create a group with this name.

**Migration version default:**
Use `project.activeVersion` if set (e.g., `"1.0"` -> folder `v1.0`). If not set, default to
`1.0`. The version folder name is always `v{version}` (e.g., `v1.0`).

---

## Tasks

### Task 1 - Create `src/migration.js`

New module that contains all migration logic. `server.js` requires it.

**`scanHomeFolder(projectRoot)`**

Scans `projectRoot` for top-level directories that are not already in the `projects` DB table.

Steps:
1. Read `projectRoot` directory. For each entry that is a directory:
   - Skip entries whose name starts with `.` (hidden)
   - Skip entries named `node_modules`, `__pycache__`, `.git`
2. Query DB: `SELECT path FROM projects` to get all registered paths.
3. Compute the relative path for each found dir: `path.relative(projectRoot, absPath)`.
   A directory is "unregistered" if no existing DB row has a path matching this relative path
   (or the absolute path).
4. For each unregistered directory: insert into `projects` table with:
   - `id`: new UUID (`crypto.randomUUID()`)
   - `name`: directory name (`path.basename(absPath)`)
   - `path`: relative path from `projectRoot`
   - `group_name`: `'To Be Migrated'`
   - `evaluated`: `false`
   - `sort_order`: 0
   - `parent_id`: NULL
   - `active_version`: NULL
   - `type`: `'code'`
5. Return `{ added: N }` where N is the count of newly inserted projects.

Note: if a directory is already in "To Be Migrated" (already inserted by a previous scan), do
not insert again. Check against existing DB rows before inserting.

**`previewMigration(projectId)`**

Returns the list of paths that will be created. Used by the preview endpoint (Task 2).

Steps:
1. Load project from DB by `projectId`.
2. Resolve absolute path: `resolveProjectPath(project)` (import from `src/projects.js`).
3. Determine version: `project.activeVersion || '1.0'`.
4. Build the full list of dirs/files to create (see structure below).
5. For each path, check if it exists on disk. Include only paths that do NOT exist.
6. Return `{ projectName, rootPath: absolutePath, version, toCreate: [relativePathStrings] }`.

**`executeMigration(projectId, targetGroup, parentId, emitLine)`**

Creates the v1.1 folder structure and updates DB. Calls `emitLine(message)` for each operation
so the caller can stream it.

Steps:
1. Call `previewMigration(projectId)` to get the list of items to create.
2. For each path in `toCreate`:
   a. `fs.mkdirSync(absolutePath, { recursive: true })` (or `fs.writeFileSync` for files).
   b. Call `emitLine("Creating " + relativePath)`.
3. Write `.ccc-project.json` at project root (always, even if it exists - it's a marker):
   ```json
   {
     "id": "<projectId>",
     "name": "<projectName>",
     "version": "<version>",
     "migratedAt": "<ISO timestamp>"
   }
   ```
   Call `emitLine("Writing .ccc-project.json")`.
4. Update the DB row:
   - `group_name`: `targetGroup` (or NULL if `parentId` is set)
   - `parent_id`: `parentId` (or NULL)
   - `evaluated`: `false` (migration creates structure; project still needs concept doc etc.)
   - `active_version`: `version`
5. Call `emitLine("Done")`.

**v1.1 folder structure to create (if not present):**

The following paths are relative to the project's absolute root:
```
docs/
docs/adr/
docs/architecture/
docs/discussion/
docs/handoff/
docs/context/
docs/spec/
v{version}/
v{version}/docs/
v{version}/docs/adr/
v{version}/docs/architecture/
v{version}/docs/discussion/
v{version}/docs/handoff/
v{version}/docs/context/
v{version}/docs/spec/
v{version}/docs/testfiles/
CLAUDE.md  (file, only if missing - create as empty file so git tracks the dir and CC can fill it)
```

Substitution: `{version}` = `project.activeVersion || '1.0'`.

For `CLAUDE.md`: if the file is missing, create it with this single-line placeholder:
```
# CLAUDE.md
```

---

### Task 2 - Add backend endpoints to `server.js`

Add the following three routes. Place them in a new section after the `// --- Scan / Import API ---`
comment block.

**`POST /api/scan-home`**

Triggers a scan of the configured project root.

```javascript
app.post('/api/scan-home', async (req, res) => {
  const projectRoot = await getProjectRoot() // reads from settings table
  if (!projectRoot) {
    return res.status(400).json({ error: 'project_root not configured' })
  }
  const result = await scanHomeFolder(projectRoot)
  res.json(result) // { added: N }
})
```

`getProjectRoot()` is the existing helper that reads `project_root` from settings DB. If it
does not already exist as a named function in `server.js`, extract it from the inline usage.

**`GET /api/projects/:id/migrate-preview`**

Returns a dry-run list of paths that would be created.

```javascript
app.get('/api/projects/:id/migrate-preview', async (req, res) => {
  const preview = await previewMigration(req.params.id)
  if (!preview) return res.status(404).json({ error: 'project not found' })
  res.json(preview)
})
```

**`GET /api/projects/:id/migrate`**

SSE endpoint. Streams migration progress, then updates DB.

Query params: `targetGroup` (string, e.g. `Active`), `parentId` (string or empty).

```javascript
app.get('/api/projects/:id/migrate', async (req, res) => {
  const { targetGroup, parentId } = req.query
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const emit = (msg) => res.write(`data: ${JSON.stringify({ message: msg })}\n\n`)

  try {
    await executeMigration(
      req.params.id,
      targetGroup || 'Active',
      parentId || null,
      emit
    )
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
  }
  res.end()
})
```

---

### Task 3 - First-run detection in `client/app/page.tsx`

On mount, the main page reads settings and redirects to `/setup` if `projectRoot` is empty.

Add a `useEffect` at the top of the `Page` component (before any other useEffects):

```typescript
useEffect(() => {
  fetch(api('/api/settings'))
    .then(r => r.json())
    .then(s => {
      if (!s.projectRoot) router.push('/setup')
    })
    .catch(() => {}) // silently ignore - server may still be starting
}, [])
```

Import `useRouter` from `next/navigation`. This runs once on mount. If settings fetch fails,
do nothing (the treeview will show an empty state).

---

### Task 4 - Rewrite `client/app/setup/page.tsx`

Replace the current `CreateAdminCard` content with a project-root setup form.

**Layout:** Same header/footer shell as the current page. Replace the card body with:

```
+-------------------------------------------+
| Claude Command Center - First-run setup    |
|                                            |
|  Project Home Folder                       |
|  [/mnt/sc-development_______________] [..] |  <- path input + browse button
|                                            |
|  This is the root directory that contains  |
|  all your projects. CCC will scan it and   |
|  list found projects for you to register.  |
|                                            |
|  [    Save & Scan    ]                     |
|                                            |
|  {error message if any}                    |
+-------------------------------------------+
```

**Behaviour:**
1. Path input is a standard text field. Browse button (`..`) calls `GET /api/browse?path=<current>`
   and shows the returned `dirs[]` as a simple dropdown list below the input. Clicking a dir
   appends it to the path and re-fetches. This is the same browse pattern used in the existing
   settings panel - read `client/components/settings-shell.tsx` to understand the current pattern
   and reuse it here.
2. "Save & Scan" button:
   a. `PUT /api/settings` with `{ projectRoot: pathValue }`.
   b. On success: `POST /api/scan-home`.
   c. On success: `router.push('/')`.
   d. Show inline error text if either call fails.
3. No external libraries. Use existing design tokens from `tokens(theme)`.
4. Sharp corners, no border-radius, SC design language. Follow the visual style of
   `client/components/settings-shell.tsx`.

**Remove** the `import { CreateAdminCard } from "@/components/auth-card"` line and its usage.
Do not delete `auth-card.tsx` - Stage 05 will need it.

---

### Task 5 - "To Be Migrated" group in `client/components/treeview-shell.tsx`

**Group rendering:**

The existing `GET /api/projects` response will include a group named `'To Be Migrated'` once
entries exist in the DB. Render it above the "Active" group with these rules:
- Hidden entirely when there are no projects with `group === 'To Be Migrated'`.
- Label: `TO BE MIGRATED` (same styling as `ACTIVE` / `PARKED` group labels, uppercase).
- No "Add group" button on this group label.
- Entries show: folder name only, `path` in muted text below the name. No status dot. No
  version badge. No Start Session button. No file links. No progress bar.
- Entries are draggable (use `useDraggable` from @dnd-kit, same pattern as sub-project rows).

**New drag-end branch:**

In `handleDragEnd`, add a check at the top of the function: if the dragged project has
`group === 'To Be Migrated'`, do NOT call `apiReorderProjects`. Instead:
1. Store the drag target info (`targetGroup`, `targetParentId`) in a ref or temp state.
2. Open the migration modal (`setMigratingProject({ project, targetGroup, targetParentId })`).
3. Return early - do not apply any optimistic update yet.

The optimistic update and DB update happen only after the user confirms in the modal and the
migration completes successfully.

**After migration completes:**
The `MigrationModal` component calls a callback `onComplete`. In this callback:
1. Remove the migrated project from the local "To Be Migrated" list optimistically.
2. Call `reload()` to re-fetch all projects from the API (this picks up the DB update done by
   the migrate endpoint).

---

### Task 6 - Create `client/components/migration-modal.tsx`

Two-state modal component.

**Props:**
```typescript
interface MigrationModalProps {
  project: ApiProject         // the project being migrated
  targetGroup: string         // 'Active' | 'Parked'
  targetParentId: string | null
  theme: 'dark' | 'light'
  onComplete: () => void      // called after successful migration
  onCancel: () => void        // called on cancel or close
}
```

**State 1 - Preview:**

On mount, fetch `GET /api/projects/:id/migrate-preview`. Show a loading state while fetching.

When loaded, render:
```
+-----------------------------------------------+
| Migrate: {project.name}                        |
| Destination: {targetGroup}                     |
|                                                |
| The following will be created:                 |
|                                                |
|  docs/                                         |
|  docs/adr/                                     |
|  docs/handoff/                                 |
|  v1.0/                                         |
|  v1.0/docs/                                    |
|  ... (one line per path in toCreate[])         |
|                                                |
| If nothing is listed, the structure already    |
| exists. CCC will still register the project.   |
|                                                |
|  [  Cancel  ]   [  Confirm  ]                  |
+-----------------------------------------------+
```

Use `font-mono text-[11px]` for the path list. Scrollable if list is long (max-height: 240px).

**State 2 - Running:**

On Confirm, transition to State 2. Open an `EventSource` to:
```
GET /api/projects/{id}/migrate?targetGroup={targetGroup}&parentId={targetParentId || ''}
```

Render a scrollable log panel. Each `data` event appends a new line:
- `{ message: "..." }` -> append `message` as a new line
- `{ error: "..." }` -> append line in error colour, stop reading, show Close button
- `{ done: true }` -> close EventSource, show Close button

```
+-----------------------------------------------+
| Migrating: {project.name}                      |
|                                                |
|  Creating docs/                                |
|  Creating docs/adr/                            |
|  Creating v1.0/docs/                           |
|  Writing .ccc-project.json                     |
|  Done                                          |
|                                                |
|                               [  Close  ]      |  <- appears only when done or error
+-----------------------------------------------+
```

Log panel: `font-mono text-[11px]`, auto-scroll to bottom on each new line.

Close button calls `onComplete()`.

**Modal overlay:** full-screen semi-transparent backdrop (`rgba(0,0,0,0.5)`), modal centred,
fixed width 520px, sharp corners, border `1px solid t.border`, background `t.bgPanel`.

Add `MigrationModal` state to `treeview-shell.tsx`:
```typescript
const [migratingProject, setMigratingProject] = useState<{
  project: ApiProject
  targetGroup: string
  targetParentId: string | null
} | null>(null)
```

Render `{migratingProject && <MigrationModal ... />}` at the bottom of `TreeviewShell`.

---

### Task 7 - Add API helpers to `client/lib/api.ts`

Add after the existing helpers:

```typescript
export async function scanHome(): Promise<{ added: number }> {
  const res = await fetch(api('/api/scan-home'), { method: 'POST' })
  if (!res.ok) throw new Error(`scan-home failed: ${res.status}`)
  return res.json()
}

export interface MigratePreview {
  projectName: string
  rootPath: string
  version: string
  toCreate: string[]
}

export async function fetchMigratePreview(projectId: string): Promise<MigratePreview> {
  const res = await fetch(api(`/api/projects/${projectId}/migrate-preview`))
  if (!res.ok) throw new Error(`migrate-preview failed: ${res.status}`)
  return res.json()
}
```

The SSE connection in `MigrationModal` uses the browser's native `EventSource` API directly
(no wrapper needed).

---

### Task 8 - Build, restart, verify

1. `cd /mnt/sc-development/CCC/client && NEXT_PUBLIC_BASE_PATH=/CCC pnpm build`
2. `bash /tmp/ccc-restart.sh`
3. Verify server: `curl -s http://127.0.0.1:3000/CCC/ | head -5`
4. Verify preview endpoint: `curl -s "http://127.0.0.1:3000/CCC/api/projects/<any-project-id>/migrate-preview"`
5. Verify scan endpoint: `curl -s -X POST http://127.0.0.1:3000/CCC/api/scan-home`

Use the Delta container and delta-svc/delta-admin fixture projects for migration testing.
`POST /api/scan-home` will not add them again if they are already registered (DB check in
`scanHomeFolder` prevents duplicates).

To test the full flow manually before writing the test file: temporarily remove one fixture
project from the DB directly (`DELETE FROM ccc.projects WHERE name = 'delta-svc'`), then call
`POST /api/scan-home` and verify delta-svc reappears in "To Be Migrated". Then test the
drag-to-migrate flow in the browser.

---

### Task 9 - Generate test file

Write `docs/v1.1/CCC_test_stage04d.md`.

Include test items for:
- First-run redirect: visiting `/` with no projectRoot redirects to `/setup`
- Setup page renders with path input and browse button
- Save & Scan: setting projectRoot saves to settings, scan runs, "To Be Migrated" group appears
- "To Be Migrated" group hidden when empty
- Entries in "To Be Migrated" show folder name and path, no status dot or Start Session button
- Drag from "To Be Migrated" to Active group opens migration modal
- Migration modal State 1 shows correct file list from preview endpoint
- Cancel button closes modal, project stays in "To Be Migrated"
- Confirm triggers State 2, live output streams correctly
- After migration: project appears in Active group, removed from "To Be Migrated"
- Correct v1.1 folder structure created on disk
- `.ccc-project.json` written at project root
- Container migration path: drag from "To Be Migrated" to a container triggers modal with
  correct targetParentId; after migration project appears as sub-project of container
- Duplicate scan: running scan-home again does not create duplicate "To Be Migrated" entries
- Acceptance criteria for all of the above

---

## Acceptance Criteria

1. Visiting `/` with no `projectRoot` configured redirects to `/setup`.
2. `/setup` renders a project home folder form. Save & Scan sets `projectRoot` in settings and
   runs `POST /api/scan-home`.
3. After scan, unregistered directories appear in "To Be Migrated" group in the treeview.
4. "To Be Migrated" group is hidden when it has no entries.
5. "To Be Migrated" entries are draggable to Active, Parked, and container drop targets.
6. Dragging an entry opens the migration modal (not a direct DB reorder).
7. Migration modal State 1 shows the correct list of paths to be created (dry-run preview).
8. Confirm triggers live SSE stream in State 2; each created path appears as a new line.
9. After migration closes: project appears in the target group with correct `group`/`parentId`
   in DB; no longer present in "To Be Migrated".
10. v1.1 folder structure exists on disk after migration (spot-check at least 3 paths).
11. `.ccc-project.json` is present at the migrated project root.
12. Running `POST /api/scan-home` a second time does not create duplicate entries.
13. No regressions in existing treeview behaviour.
14. Build completes without TypeScript errors.

---

*End of Stage 04d kickoff. Restart the CCC server after backend changes before testing.
Report back with a summary and the test file path when done.*
