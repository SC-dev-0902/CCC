# Stage 04c Kickoff — Treeview: Parent/Sub-Project Rendering + Drag-Drop
*CCC v1.1 | Read and execute this file in full before writing any code.*

---

## Context

Stage 04bN wired the Next.js treeview to real API data. Stage 04b01 added grouped test files.
The API already returns `subProjects[]` on container projects (from Stage 04a) but the treeview
renders everything as a flat list. This stage renders the actual hierarchy and adds drag-drop.

---

## Scope

Build exactly what is listed below. Nothing more.

**Out of scope for this stage:**
- "To Be Migrated" group (Stage 04d)
- Locking badge (Stage 06c)
- "New" group discovery (Stage 11)

---

## Technical Reference

**Key API shape (`GET /api/projects`):**
```json
{
  "groups": ["Active", "Parked"],
  "projects": [
    {
      "id": "uuid",
      "name": "LeadSieve",
      "group": "Active",
      "parentId": null,
      "subProjects": [
        { "id": "uuid", "name": "leadsieve-service", "parentId": "...", "subProjects": [], ... },
        { "id": "uuid", "name": "leadsieve-admin",   "parentId": "...", "subProjects": [], ... }
      ],
      "order": 0,
      "coreFiles": { "claude": "CLAUDE.md", "concept": "...", "tasklist": "..." },
      ...
    }
  ]
}
```

Note: the API field is `subProjects[]`, NOT `children[]`. The DB column is `sort_order`; the API
maps it to camelCase `order`. Do not confuse these.

**Project node types (determined at render time):**
- **Container**: `parentId === null` AND `subProjects.length > 0`
- **Standalone**: `parentId === null` AND `subProjects.length === 0`
- **Sub-project**: `parentId !== null`

**Existing reorder endpoint:**
```
PUT /api/projects-reorder
Body: [{ id, group, order, parentId }]
```
This endpoint and `reorderProjects()` in `src/projects.js` already exist. In Task 1 you will
extend `reorderProjects()` to also update `parent_id` when `parentId` is present in the payload.

**Build command (Dev-Web):**
```
cd /mnt/sc-development/CCC/client && NEXT_PUBLIC_BASE_PATH=/CCC pnpm build
```

**Server restart:**
```
bash /tmp/ccc-restart.sh
```
If `/tmp/ccc-restart.sh` is missing, recreate it:
```bash
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

**Test URL:** `http://kkh01vdweb01.mcsfam.local/CCC/`

---

## Tasks

### Task 1 — Extend `reorderProjects()` to handle `parent_id`

File: `src/projects.js`

The existing `reorderProjects(orderedIds)` function updates `group_name` and `sort_order` per
entry. Extend it to also update `parent_id` when a `parentId` field is present in an entry.

Change the UPDATE query from:
```sql
UPDATE projects SET group_name = ?, sort_order = ? WHERE id = ?
```
To:
```sql
UPDATE projects SET group_name = ?, sort_order = ?, parent_id = ? WHERE id = ?
```
Pass `entry.parentId ?? null` as the third bind parameter. All existing callers continue to work
because `parentId` was not previously in the payload — they will now send `null` for that field.

No new endpoint needed. `PUT /api/projects-reorder` already calls `reorderProjects()`.

---

### Task 2 — Add `GET /api/projects/:id/progress` endpoint

File: `server.js`

This endpoint reads the project's tasklist file and returns stage completion counts.

**Logic:**
1. Query DB for the project. If not found: `404`.
2. Get `coreFiles.tasklist` path for the project. If no tasklist registered: return `{ completed: 0, total: 0 }`.
3. Resolve the absolute path: `path.join(PROJECT_ROOT, project.path, coreFiles.tasklist)`.
4. Read the file. If file not found on disk: return `{ completed: 0, total: 0 }` (do not 404).
5. Count `total`: number of lines matching `/^###\s+Sub-Stage\s+/i`.
6. Count `completed`: number of lines matching `/-> GO/i` that appear AFTER a `### Sub-Stage` header
   line. One GO line per sub-stage counts as one completed sub-stage. Use a simple line-by-line
   scan tracking the current sub-stage.
7. Return: `{ completed: <int>, total: <int> }`.

Add the route before the `app.get('/api/projects/:id/versions', ...)` route.

---

### Task 3 — Install `@dnd-kit` in the client

Working directory: `/mnt/sc-development/CCC/client`

```
pnpm add @dnd-kit/core @dnd-kit/sortable
```

Verify the packages appear in `client/package.json` dependencies before continuing.

---

### Task 4 — Rewrite `treeview-shell.tsx`: container and sub-project rendering

File: `client/components/treeview-shell.tsx`

**Do not break any existing behaviour** (test file grouping, status dots, WS subscriptions,
search/filter, file links, Start Session button). Extend the component.

#### 4a — New `ContainerRow` component

A container is rendered differently from a leaf project:

```
[chevron] [aggregate status dot] LeadSieve                    [no button]
  [chevron] [status dot] leadsieve-service  v1.1  Stage 4/16  [Start Session]
            CLAUDE.md
            ...test files section...
  [chevron] [status dot] leadsieve-admin    v1.0  Stage 3/14  [Start Session]
            CLAUDE.md
            ...test files section...
```

`ContainerRow` behaviour:
- Collapsible (chevron toggles sub-project list). Collapsed by default.
- Shows aggregate status dot (see Task 4c for logic).
- Shows project name.
- No version badge, no Start Session button, no progress bar on the container node itself.
- When expanded: renders each entry in `project.subProjects[]` as a `ProjectRow` (existing
  component, already handles status dot, version badge, file links, testing section).

#### 4b — Progress bar on leaf project nodes

Add a `ProgressBar` component and a `useProjectProgress` hook.

`useProjectProgress(projectId: string)`:
- On mount: `GET /api/projects/:id/progress` (use `fetchProgress` helper in `lib/api.ts`).
- Returns `{ completed: number, total: number, loading: boolean }`.
- If `total === 0`: returns loading=false, completed=0, total=0 (bar hidden).

`ProgressBar` component:
- Renders only when `total > 0`.
- Display: `Stage {completed} / {total}` in monospace text (`text-[9px] font-mono`).
- Filled CSS bar below the text: width = `(completed / total) * 100%`, height 2px, colour
  matching the project's current status dot colour.
- Use design tokens from `tokens(theme)` for bar background (`t.bgInput`) and filled portion.

Show the `ProgressBar` in `ProjectRow` when `project.coreFiles?.tasklist` is set.
Progress bar renders on the same row as the project name, right-aligned before the Start Session
button. Keep the row compact — the bar width should be fixed at 60px.

#### 4c — Aggregate status dot on container nodes

```typescript
const STATUS_PRIORITY: Record<Status, number> = {
  waiting:   5,
  error:     4,
  running:   3,
  completed: 2,
  unknown:   1,
}

function aggregateStatus(statuses: Status[]): Status {
  if (statuses.length === 0) return "unknown"
  return statuses.reduce((worst, s) =>
    STATUS_PRIORITY[s] > STATUS_PRIORITY[worst] ? s : worst
  )
}
```

`ContainerRow` passes `project.subProjects.map(sp => statusMap.get(sp.id) || 'unknown')` to
`aggregateStatus()` to determine its dot colour.

#### 4d — Filter behaviour with containers

When the search query is non-empty, a container should remain visible if ANY of its sub-projects
match the query. Sub-projects that do not match are hidden; matching sub-projects are shown.
The container node itself (name) is also tested against the query.

Update the `filtered` memo in `TreeviewShell` to handle this:
- Top-level projects where `subProjects.length === 0`: include if name matches (existing behaviour).
- Top-level projects where `subProjects.length > 0` (containers): include if container name matches
  OR if any sub-project name matches. When rendering, pass only matching sub-projects to the
  `ContainerRow`.

#### 4e — Dispatch: container vs. leaf

In `TreeviewShell`, when rendering the `active` and `parked` lists, dispatch by node type:

```tsx
{project.subProjects && project.subProjects.length > 0 ? (
  <ContainerRow
    key={project.id}
    project={project}
    statusMap={statusMap}
    theme={theme}
    forceExpand={!!query}
    onStartSession={onStartSession}
    onOpenFile={onOpenFile}
  />
) : (
  <ProjectRow
    key={project.id}
    project={project}
    status={statusMap.get(project.id) || "unknown"}
    theme={theme}
    forceExpand={!!query}
    onStartSession={onStartSession}
    onOpenFile={onOpenFile}
  />
)}
```

---

### Task 5 — Add drag-drop

Use `@dnd-kit/core` (`DndContext`, `useDraggable`, `useDroppable`) and `@dnd-kit/sortable`
(`SortableContext`, `useSortable`, `arrayMove`).

#### Drag sources
- Any leaf project row (standalone or sub-project) is draggable.
- Container rows are NOT draggable (they move when all their sub-projects move).

#### Drop targets
Three types:
1. **Group drop zone** (`Active`, `Parked`): dropping a project here moves it to that group,
   clears its `parentId` (makes it standalone), appends to end of group.
2. **Container drop zone**: dropping a sub-project or standalone onto a container sets its
   `parentId` to the container's id, clears `group_name` (sub-projects have `group_name = NULL`).
3. **Sort within group**: reorder projects within the same group using `arrayMove`.

#### On drag end
1. Compute the new `[{ id, group, order, parentId }]` array for all affected projects.
2. Apply optimistic update to local React state immediately.
3. Call `PUT /api/projects-reorder` with the full updated array.
4. On error: revert local state, show a brief error hint (plain text in the treeview, no toast
   library needed).

#### Visual feedback during drag
- Dragging project: 50% opacity on the dragged row.
- Valid drop target: subtle highlight border (`1px solid t.textMuted`).
- Use `DragOverlay` from `@dnd-kit/core` to render a minimal drag ghost (just the project name,
  no full row height).

---

### Task 6 — Add `fetchProgress` to `client/lib/api.ts`

```typescript
export interface ProjectProgress {
  completed: number
  total: number
}

export async function fetchProgress(projectId: string): Promise<ProjectProgress> {
  const res = await fetch(`${api("/api/projects")}/${projectId}/progress`)
  if (!res.ok) throw new Error(`progress fetch failed: ${res.status}`)
  return res.json()
}
```

Place after the existing `fetchProjectVersions` function.

---

### Task 7 — Build, restart, verify

1. `cd /mnt/sc-development/CCC/client && NEXT_PUBLIC_BASE_PATH=/CCC pnpm build`
2. `bash /tmp/ccc-restart.sh`
3. Verify the server is running: `curl -s http://127.0.0.1:3000/CCC/ | head -5`
4. Verify the new endpoint: `curl -s http://127.0.0.1:3000/CCC/api/projects/<id>/progress`
   (replace `<id>` with any project id that has a tasklist registered).

---

### Task 8 — Generate test file

Write `docs/v1.1/CCC_test_stage04c.md`.

Include test items covering:
- Container nodes render without progress bar or Start Session button
- Sub-projects render nested under their container (collapsed by default)
- Aggregate status dot on container reflects worst-case sub-project status
- Standalone projects show progress bar when tasklist exists
- Progress bar shows correct Stage N / Total from tasklist
- Filter: container visible when sub-project name matches
- Drag-drop: reorder within Active group persists after reload
- Drag-drop: move from Active to Parked persists after reload
- Drag-drop: drop standalone into container sets parentId, removes from flat group
- Acceptance criteria for all of the above

---

## Acceptance Criteria

1. Container node shows aggregate status dot; no progress bar; no Start Session button.
2. Sub-projects are nested under their container, collapsible.
3. `GET /api/projects/:id/progress` returns correct counts for a project with a tasklist.
4. Progress bar renders correctly on leaf projects with a tasklist; hidden when total = 0.
5. Filter hides non-matching sub-projects but keeps the container visible if any sub-project matches.
6. Drag-drop reorder within a group persists to DB and survives page reload.
7. Drag-drop between groups persists to DB and survives page reload.
8. Drag a standalone into a container: project appears as sub-project, parentId set in DB.
9. No regressions in existing treeview behaviour (test files, WS status updates, file links).
10. Build completes without TypeScript errors (note: `ignoreBuildErrors: true` in next.config.mjs,
    but aim for clean types anyway).

---

*End of Stage 04c kickoff. Report back with a summary and the test file path when done.*
