# Stage 04e01 — Multi-Tab Fix + Import Wizard
*CCC v1.1 | Read and execute in full before writing a single line of code.*

---

## Part A — Multi-Tab Bug Fix

### Task A1 — Rebuild and hard-refresh first

Before any code investigation:

```bash
cd /mnt/sc-development/CCC/client
NEXT_PUBLIC_BASE_PATH=/CCC pnpm build
bash /tmp/ccc-restart.sh
```

Instruct Phet: **Cmd+Shift+R** in browser.

Test: click "Start Session" on two different projects. If two tabs appear and switching preserves the terminal buffer — bug was a stale build. Document result and move to Part B.

### Task A2 — If still broken after rebuild, fix TabBar key issue

In `client/components/app-shell.tsx`, the `TabBar` map returns `inner` directly for non-href tabs, with the `key` on the inner `<div>`. React requires the `key` on the outermost returned element. Fix:

```tsx
return tabs.map((tab) => {
  const isActive = tab.id === activeId
  const dotFor: Record<Tab["status"], string> = {
    running: t.statusRunning,
    completed: t.statusCompleted,
    unknown: t.statusUnknown,
    error: t.statusError,
    waiting: t.statusWaiting,
  }
  const content = (
    <div
      className="flex items-center gap-2 px-4 py-2 text-xs cursor-pointer"
      onClick={() => onSelect(tab.id)}
      style={{
        backgroundColor: isActive ? t.bgApp : "transparent",
        color: tab.reconnecting ? t.textMuted : t.textPrimary,
        borderTop: isActive ? `2px solid ${t.accent}` : "2px solid transparent",
        borderRight: `1px solid ${t.border}`,
        opacity: tab.reconnecting ? 0.6 : 1,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: dotFor[tab.status] }} />
      <span>{tab.label}</span>
      {tab.reconnecting && <span style={{ fontSize: 10, color: t.textMuted }}>(reconnecting)</span>}
      {onClose && tab.id !== "__settings__" && (
        <X
          size={11}
          style={{ color: t.textMuted }}
          onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
        />
      )}
    </div>
  )
  if (tab.href) {
    return <Link key={tab.id} href={tab.href}>{content}</Link>
  }
  return <div key={tab.id} style={{ display: "contents" }}>{content}</div>
})
```

Note: X button now excluded from the Settings tab (`tab.id !== "__settings__"`).

Rebuild + restart after fix. Verify two simultaneous sessions work.

---

## Part B — Remove 04d Migration Code

Stage 04d built a migration workflow that is being replaced by the Import Wizard in Part C. Remove all of it cleanly.

### Task B1 — Delete `src/migration.js`

Remove the file entirely.

### Task B2 — Remove migration routes from `server.js`

Remove these three routes:
- `POST /api/scan-home`
- `GET /api/projects/:id/migrate-preview`
- `GET /api/projects/:id/migrate` (SSE)

Remove the `require('./src/migration')` import and any references to `scanHomeFolder`, `previewMigration`, `executeMigration`.

### Task B3 — Remove `RESERVED_GROUP_NAMES` from `src/projects.js`

Remove the `RESERVED_GROUP_NAMES` constant and the check inside `addGroup` that rejects "To Be Migrated". The 409 rejection for duplicate group names remains.

### Task B4 — Remove "To Be Migrated" from the treeview

In `client/components/treeview-shell.tsx`, remove:
- `MigrationEntryRow` component
- `DraggableMigrationRow` component
- `tobeMigrated` filter slice
- The `migratingProject` state
- The drag-end TBM intercept branch
- The `<MigrationModal>` render
- The "TO BE MIGRATED" group label and entries render block

Update the `active` and `parked` filter slices — remove the explicit TBM exclusions (they're no longer needed).

### Task B5 — Delete `client/components/migration-modal.tsx`

Remove the file entirely.

### Task B6 — Remove migration helpers from `client/lib/api.ts`

Remove: `scanHome()`, `fetchMigratePreview()`, `MigratePreview` type, `buildMigrateUrl()`.

### Task B7 — Remove first-run redirect from `client/app/page.tsx`

Remove the `useEffect` that redirects to `/setup` when `projectRoot` is empty. First-run setup is handled differently going forward (the Import Wizard handles onboarding).

Rebuild after Part B. Verify the treeview renders cleanly with no TBM group, no migration references.

---

## Part C — Import Wizard

### Overview

The import flow:
1. User clicks **Import** in the CCC sidebar header
2. A wizard opens (full-page route at `/import`)
3. Step 1: select source folder (old project, anywhere on disk)
4. Step 2: select destination container (existing CCC group, or create new)
5. CCC starts a CC terminal session in the source folder and auto-sends the import kickoff
6. CC copies all files from source to `{projectRoot}/{containerName}/{projectName}/v1.0/`, transforms to CCC v1.1 structure, generates `CLAUDE.md`, concept doc, tasklist
7. Wizard shows the live terminal — Phet watches CC work and responds to CC's questions
8. When CC is done: `.ccc-project.json` exists in the destination. CCC registers the project automatically.

### New folder structure (what CC produces at destination)

```
{projectRoot}/{containerName}/{projectName}/
├── CLAUDE.md                          ← generated by CC
├── .ccc-project.json                  ← written by CC (triggers auto-register)
├── docs/
│   ├── handoff/                       ← empty, CC will populate on first /eod
│   └── v1.0/
│       ├── {Name}_concept_v1.0.md     ← generated by CC
│       └── {Name}_tasklist_v1.0.md    ← generated by CC
└── v1.0/                              ← complete source code copy from old project
    └── [all files copied from source]
```

Version is always `v1.0` for imported projects. CC escalates to the developer if it detects the project is already versioned.

### Task C1 — Backend: GET /api/groups (list for container selector)

The existing `GET /api/projects` already returns groups. Add a lightweight dedicated endpoint for the wizard:

```js
app.get('/api/groups', async (req, res) => {
  const { groups } = await projects.getAllProjects()
  // Return group names only, excluding system groups
  const names = groups
    .map(g => g.name)
    .filter(n => n && n !== 'To Be Migrated')
  res.json({ groups: names })
})
```

### Task C2 — Backend: POST /api/import/start

```js
app.post('/api/import/start', async (req, res) => {
  const { sourcePath, containerName, projectName } = req.body

  if (!sourcePath || !containerName || !projectName) {
    return res.status(400).json({ error: 'sourcePath, containerName, and projectName are required' })
  }

  const settings = await getSettingsFromDB()
  const projectRoot = settings.projectRoot
  if (!projectRoot) {
    return res.status(400).json({ error: 'Project root not configured' })
  }

  const destPath = path.join(projectRoot, containerName, projectName)

  if (path.resolve(sourcePath) === path.resolve(destPath)) {
    return res.status(400).json({ error: 'Source and destination cannot be the same' })
  }

  if (!fs.existsSync(sourcePath)) {
    return res.status(400).json({ error: 'Source folder does not exist' })
  }

  if (fs.existsSync(destPath)) {
    return res.status(409).json({ error: 'Destination already exists' })
  }

  // Register project in DB (unevaluated, group = containerName)
  const project = await projects.addProject({
    name: projectName,
    path: path.join(containerName, projectName),  // relative to projectRoot
    group: containerName,
    evaluated: 0,
    activeVersion: null,
  })

  // Start a CC session in the SOURCE folder
  sessions.createSession(project.id, sourcePath, 'claude')

  res.json({ ok: true, projectId: project.id, destPath })
})
```

### Task C3 — Backend: POST /api/import/kickoff

After the terminal is mounted and connected, the client sends this to auto-inject the import prompt into the CC session:

```js
app.post('/api/import/kickoff', (req, res) => {
  const { projectId, sourcePath, destPath } = req.body
  const prompt = `You are importing an existing project into CCC v1.1.\n\nSource: ${sourcePath}\nDestination: ${destPath}\n\nTask:\n1. Analyse the source project (read key files: package.json, README, existing docs, CLAUDE.md if present)\n2. Explain to the developer what you found and what you plan to do\n3. Copy ALL files from source to ${destPath}/v1.0/\n4. Create the CCC v1.1 structure at the destination:\n   - CLAUDE.md (generate based on project analysis)\n   - .ccc-project.json (content: {"imported":true,"importedAt":"${new Date().toISOString()}","sourceVersion":"1.0"})\n   - docs/handoff/ (empty folder)\n   - docs/v1.0/{projectName}_concept_v1.0.md (generate)\n   - docs/v1.0/{projectName}_tasklist_v1.0.md (generate)\n5. Ask the developer to confirm each major step before executing it\n\nNever use em dash (—). Use a regular hyphen with spaces ( - ) instead.\n\nStart by reading the source project and explaining what you found.`

  sessions.writeToSession(projectId, prompt + '\n')
  res.json({ ok: true })
})
```

### Task C4 — Frontend: Import Wizard page at /import

Create `client/app/import/page.tsx`.

The page has three steps:

**Step 1 — Source folder**
- Heading: "Import Project"
- Sub-heading: "Step 1 of 3 — Select the source folder"
- Path input (mono) + Browse button (reuse the same browse panel logic from `/setup/page.tsx`)
- Browse uses `GET /api/browse?path=...`
- "Next" button — validates path is non-empty, then advances to Step 2

**Step 2 — Destination container + project name**
- Heading: "Step 2 of 3 — Select destination"
- Container selector: dropdown list from `GET /api/groups`
- Below the dropdown: "+ New Container" link — clicking reveals a text input to type a new container name
- Project name input (auto-populated from the source folder's basename, editable)
- "Start Import" button — calls `POST /api/import/start`, on success advances to Step 3

**Step 3 — Terminal**
- Heading: "Step 3 of 3 — CC is importing your project"
- Muted sub-text: "Review CC's analysis and respond to its questions."
- Full-height `<TerminalPanel>` for the session started by `/api/import/start`
- After terminal mounts: fires `POST /api/import/kickoff` once (use a `useRef` flag to prevent double-fire)
- "Done — go to project" button appears after a 3-second delay (not auto-close; Phet decides when the import is finished)
- "Done" button navigates to `/`

Use `tokens(theme)` for all colours. No hardcoded colour values.

### Task C5 — Frontend: Import button in sidebar

In `client/components/app-shell.tsx`, add an Import button to the sidebar header area (above or below the treeview, visually distinct from project rows).

```tsx
import { useRouter } from "next/navigation"

// Inside TreeviewShell or the aside block in AppShell:
<button
  onClick={() => router.push('/import')}
  className="flex items-center gap-2 w-full px-4 py-2 text-xs"
  style={{
    color: t.textSecondary,
    borderBottom: `1px solid ${t.border}`,
  }}
>
  <FolderInput size={13} />
  Import Project
</button>
```

Import `FolderInput` from `lucide-react`.

### Task C6 — Backend: GET /api/projects watch for .ccc-project.json (auto-register check)

When `GET /api/projects` is called, for any project with `evaluated = 0` and `activeVersion = NULL`, check if `.ccc-project.json` exists at the resolved project path. If it does, update the project row: `evaluated = 1`, set `active_version = '1.0'`. This auto-completes registration when CC finishes the import.

Add this check inside `getAllProjects()` in `src/projects.js` as a fire-and-forget UPDATE (do not block the response).

---

## Task D — Test file

Generate `docs/v1.1/CCC_test_stage04e01.md` after all implementation is complete.

Cover:
- Multi-tab: two simultaneous sessions, buffer preserved on switch, close kills session
- Settings tab: no X button
- Migration code removed: curl `POST /api/scan-home` returns 404
- Import wizard: Step 1 browse works, Step 2 container list populates, "New Container" input appears
- Import start: `POST /api/import/start` creates DB row + starts session
- Import kickoff: terminal receives the prompt automatically
- Auto-register: after CC creates `.ccc-project.json`, next `GET /api/projects` shows `evaluated: 1`

---

## Acceptance criteria

1. Multiple simultaneous CC sessions run in separate tabs. Buffer preserved on switch.
2. `POST /api/scan-home` returns 404. No "To Be Migrated" group in treeview.
3. Import wizard opens at `/import` via the sidebar button.
4. Step 1: browse panel works for source selection.
5. Step 2: container dropdown lists existing groups. "New Container" option creates one.
6. Step 3: CC terminal starts in the source folder and receives the import kickoff automatically.
7. `pnpm build` passes with no TypeScript errors.

---

## Build + restart

```bash
cd /mnt/sc-development/CCC/client
NEXT_PUBLIC_BASE_PATH=/CCC pnpm build
bash /tmp/ccc-restart.sh
```

Server restart required (new routes). Cmd+Shift+R after restart.
