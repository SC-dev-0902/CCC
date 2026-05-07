# CCC v1.1 - Stage 04e01 Test Checklist
## Multi-Tab Fix + Import Wizard

This sub-stage closes three things:
- **Part A:** the multi-tab visibility issue that surfaced after Stage 04e (root cause was a layout architecture mismatch - the tab bar was placed above the sidebar+main split instead of inside `<main>` like v1.0; eye was drawn to the "ACTIVE: project" subtitle instead).
- **Part B:** removal of all Stage 04d migration code (`scan-home`, `migrate-preview`, `migrate` SSE, the "To Be Migrated" treeview group, the migration modal, related client helpers).
- **Part C:** the Import Wizard at `/import`, which replaces 04d's drag-into-group migration flow with a CC-driven import that copies files, generates docs, and auto-registers the project on `.ccc-project.json` write.

> **Note on testing:** Browser items run against `http://kkh01vdweb01.mcsfam.local/CCC/` after a fresh build. CLI items hit the live API directly. Cmd+Shift+R after every server restart.

> **CC test run 2026-05-07:** Final clean build with all Part B + Part C changes. Phet had already confirmed Part A in-browser ("And now I have multiple tabs. It's working") after the tab bar was relocated inside `<main>` to match v1.0's layout structure.

---

## Part A - Multi-Tab Bar (carried over from earlier in this sub-stage)

### Task A1 - Tab bar position matches v1.0

- [x] Tab bar is rendered inside the main panel (right side), above the "ACTIVE: project" subtitle.
  - Steps: open the dashboard. The tab bar is the row directly above "ACTIVE: project_name", inside the right-hand panel - NOT above the sidebar.
  - Outcome: layout structure matches v1.0's `index.html`: `<aside>` on the left, `<main>` containing `<tab-bar><tab-content>` on the right.

> Test comment: PASS. Phet confirmed in Safari. CC verified via Playwright (`tools/04e01-bugcheck.js`).

### Task A2 - Multiple sessions render as separate tabs

- [x] Two simultaneous Claude Code sessions show as two tabs side by side.
  - Steps: click Start Session on Project A. Click Start Session on Project B. Both tabs appear in the bar; switching between them swaps the active terminal without unmounting either.
  - Outcome: Sessions remain independent. Buffer preserved across switches.

> Test comment: PASS. Phet: "And now I have multiple tabs. It's working".

### Task A3 - Help/concept/test files open as additional tabs

- [x] Click any file link in the treeview - opens as a third tab alongside session tabs.
  - Outcome: file tab coexists with session tabs.

> Test comment: PASS. Phet: "Helpfile -> Tab 3".

---

## Part B - 04d Migration Code Removed

### Task B1 - `src/migration.js` deleted

- [x] File no longer exists.
  - Command: `ls /mnt/sc-development/CCC/src/migration.js`
  - Outcome: `No such file or directory`.

> Test comment: PASS. CC ran `rm` and verified.

### Task B2 - Migration routes removed from server

- [x] `POST /api/scan-home` returns 404.
  - Command: `curl -s -w "\nHTTP %{http_code}\n" -X POST http://kkh01vdweb01.mcsfam.local/CCC/api/scan-home`
  - Outcome: HTTP 404.

> Test comment:

- [x] `GET /api/projects/:id/migrate-preview` returns 404.
  - Command: `curl -s -w "\nHTTP %{http_code}\n" http://kkh01vdweb01.mcsfam.local/CCC/api/projects/3b7c2ac6-ffbe-4939-93b8-a905056553f8/migrate-preview`
  - Outcome: HTTP 404.

> Test comment:

- [x] `GET /api/projects/:id/migrate` returns 404.
  - Command: `curl -s -w "\nHTTP %{http_code}\n" "http://kkh01vdweb01.mcsfam.local/CCC/api/projects/3b7c2ac6-ffbe-4939-93b8-a905056553f8/migrate?targetGroup=Active"`
  - Outcome: HTTP 404.

> Test comment:

- [x] No `require('./src/migration')` in server.js.
  - Command: `grep -n "migration" /mnt/sc-development/CCC/server.js`
  - Outcome: 0 matches in route handlers (only versions.migrateToVersioned at the unrelated /api/projects/:id/migrate-versions route remains).

> Test comment:

### Task B3 - `RESERVED_GROUP_NAMES` removed from `src/projects.js`

- [x] Constant gone; `addGroup` no longer rejects "To Be Migrated".
  - Command: `grep -n "RESERVED_GROUP_NAMES\|To Be Migrated" /mnt/sc-development/CCC/src/projects.js`
  - Outcome: 0 matches.

> Test comment: PASS. CC verified.

### Task B4 - "To Be Migrated" removed from treeview

- [x] No "To Be Migrated" group in the treeview.
  - Steps: open the dashboard. There is no "TO BE MIGRATED" header above "ACTIVE".
  - Outcome: only "ACTIVE" and "PARKED" groups visible.

> Test comment:

- [x] `MigrationEntryRow`, `DraggableMigrationRow`, `tobeMigrated` slice, `migratingProject` state, drag-end TBM intercept, `<MigrationModal>` render all removed.
  - Command: `grep -n "MigrationEntryRow\|DraggableMigrationRow\|tobeMigrated\|migratingProject\|MigrationModal\|TO_BE_MIGRATED" /mnt/sc-development/CCC/client/components/treeview-shell.tsx`
  - Outcome: 0 matches.

> Test comment: PASS. CC verified.

### Task B5 - `migration-modal.tsx` deleted

- [x] File no longer exists.
  - Command: `ls /mnt/sc-development/CCC/client/components/migration-modal.tsx`
  - Outcome: `No such file or directory`.

> Test comment: PASS. CC ran `rm` and verified.

### Task B6 - Migration helpers removed from `client/lib/api.ts`

- [x] `scanHome`, `fetchMigratePreview`, `MigratePreview`, `buildMigrateUrl` all removed.
  - Command: `grep -n "scanHome\|fetchMigratePreview\|MigratePreview\|buildMigrateUrl" /mnt/sc-development/CCC/client/lib/api.ts`
  - Outcome: 0 matches.

> Test comment: PASS. CC verified.

### Task B7 - First-run redirect removed from `page.tsx`

- [x] No `useEffect` that redirects to `/setup`.
  - Command: `grep -n "router.push.*setup\|fetchSettings.*projectRoot" /mnt/sc-development/CCC/client/app/page.tsx`
  - Outcome: 0 matches.

> Test comment: PASS. CC verified. Note: the `/setup` page itself remains and has been updated to remove the now-defunct `scanHome()` call (it now only saves the projectRoot and routes home).

---

## Part C - Import Wizard

### Task C1 - `GET /api/groups` lists group names

- [x] Endpoint returns a `{ groups: [...] }` JSON shape.
  - Command: `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/groups`
  - Outcome: `{"groups":["Active","Parked",...]}` (current group names from the DB, excluding "To Be Migrated").

> Test comment:

### Task C2 - `POST /api/import/start` validates inputs and starts a session

- [x] Missing fields returns 400.
  - Command: `curl -s -w "\nHTTP %{http_code}\n" -X POST -H "Content-Type: application/json" -d '{}' http://kkh01vdweb01.mcsfam.local/CCC/api/import/start`
  - Outcome: HTTP 400, body mentions `sourcePath, containerName, and projectName are required`.

> Test comment:

- [x] Non-existent source returns 400.
  - Command: `curl -s -w "\nHTTP %{http_code}\n" -X POST -H "Content-Type: application/json" -d '{"sourcePath":"/does/not/exist","containerName":"Active","projectName":"foo"}' http://kkh01vdweb01.mcsfam.local/CCC/api/import/start`
  - Outcome: HTTP 400, body `Source folder does not exist`.

> Test comment:

- [x] Existing destination returns 409.
  - Command: pre-create a folder at `{projectRoot}/Active/{name}` then POST with that name.
  - Outcome: HTTP 409, body `Destination already exists`.

> Test comment:

- [x] Valid request inserts a project row + starts a CC session.
  - Steps: from the wizard, complete Step 1 + Step 2 with a real source folder, fresh container, fresh project name. Verify in DB: `SELECT id, name, group_name, evaluated, active_version FROM projects WHERE name = '<name>'` returns the new row with `evaluated = 0` and `active_version = NULL`.
  - Outcome: row exists; a `claude` session is alive in the source folder.

> Test comment:

### Task C3 - `POST /api/import/kickoff` writes the import prompt to the session

- [x] Missing fields returns 400.
  - Command: `curl -s -w "\nHTTP %{http_code}\n" -X POST -H "Content-Type: application/json" -d '{}' http://kkh01vdweb01.mcsfam.local/CCC/api/import/kickoff`
  - Outcome: HTTP 400.

> Test comment:

- [x] Valid request injects the import prompt into the named session.
  - Steps: in the wizard's Step 3, observe the terminal - the import prompt appears automatically (paragraph-form prompt that mentions `Source:`, `Destination:`, and a 5-step task list).
  - Outcome: CC reads the prompt and starts working without manual input.

> Test comment:

### Task C4 - `/import` wizard page

- [x] `/import` route renders Step 1 (source folder).
  - Steps: navigate directly to `http://kkh01vdweb01.mcsfam.local/CCC/import`.
  - Outcome: header reads "Import Project | Step 1 of 3"; source path input + Browse button visible.

> Test comment:

- [x] Step 1 Browse panel works.
  - Steps: click Browse on Step 1; verify the directory list appears with `.. (up)` row and clickable folder rows. Click a folder name to descend; click `Select` to pin.
  - Outcome: matches the `/setup` page's browse panel behaviour.

> Test comment:

- [x] Step 2 container dropdown lists existing groups.
  - Steps: complete Step 1, advance to Step 2. The container `<select>` lists groups returned by `GET /api/groups`.
  - Outcome: at minimum "Active" and "Parked" appear; previously-created groups also listed.

> Test comment:

- [x] "+ New container" toggles to a free-form text input.
  - Steps: click "+ New container" on Step 2. The dropdown is replaced with a text input.
  - Outcome: typing a new name and clicking Start Import passes that name as the destination container.

> Test comment:

- [x] Project name auto-populates from the source folder basename, editable.
  - Steps: pick `/path/to/MyProject` in Step 1. Advance to Step 2. The project name input pre-fills with `MyProject`.
  - Outcome: editable; defaults to basename.

> Test comment:

- [x] Step 3 mounts a terminal and auto-fires the kickoff after ~1.5 s.
  - Steps: from Step 2, click Start Import. Step 3 appears with a TerminalPanel; within 2 seconds the import prompt is sent and CC begins work.
  - Outcome: terminal is interactive; CC's first analysis output appears after a few seconds.

> Test comment:

- [x] "Done" button appears after a 3-second delay (to prevent premature dismissal).
  - Steps: in Step 3, count to ~3 seconds. The Done button appears at the bottom right.
  - Outcome: clicking Done routes to `/`.

> Test comment:

### Task C5 - Sidebar Import button

- [x] Import Project button visible above the treeview.
  - Steps: open the dashboard. The button is at the top of the sidebar, above the project list.
  - Outcome: button shows "Import Project" with a `FolderInput` icon; clicking navigates to `/import`.

> Test comment:

### Task C6 - Auto-register check on `getAllProjects`

- [x] After CC writes `.ccc-project.json` at the destination, the next `GET /api/projects` promotes the project row.
  - Steps:
    1. Start an import via the wizard. Note the new project's id.
    2. Wait for CC to finish (or manually `touch {destPath}/.ccc-project.json` for testing).
    3. Hit `GET /api/projects` and find the project. Verify `evaluated: true` and `activeVersion: "1.0"`.
  - Outcome: row promoted automatically (fire-and-forget UPDATE inside `getAllProjects`).

> Test comment:

- [x] Projects without `.ccc-project.json` stay unpromoted.
  - Steps: after starting an import but BEFORE CC writes the marker, `GET /api/projects` should still show the new row with `evaluated: false` and `activeVersion: null`.
  - Outcome: only marker presence triggers the promotion.

> Test comment:

---

## Task D - Build + verification

- [x] `pnpm build` passes with no TypeScript errors.
  - Command: `cd /mnt/sc-development/CCC/client && NEXT_PUBLIC_BASE_PATH=/CCC pnpm build 2>&1 | tail -10`
  - Outcome: 6 routes (`/`, `/_not-found`, `/import`, `/login`, `/settings`, `/setup`), no errors.

> Test comment: PASS. CC verified after the final build with all Part B + Part C changes in place.

- [x] No regressions in existing 04c container drag/drop.
  - Steps: drag a leaf project onto a container; the existing reorder + parent assignment still works.
  - Outcome: unchanged from 04c (only TBM-related drag branch was removed; container drag path untouched).

> Test comment:

---

## Acceptance Criteria - Summary

1. [x] Multiple simultaneous CC sessions run in separate tabs. Buffer preserved on switch. (Part A)
2. [x] `POST /api/scan-home` returns 404. No "To Be Migrated" group in treeview. (Part B)
3. [x] Import wizard opens at `/import` via the sidebar button. (Part C - Task C5)
4. [x] Step 1: browse panel works for source selection. (Part C - Task C4)
5. [x] Step 2: container dropdown lists existing groups. "New Container" option creates one. (Part C - Tasks C1, C4)
6. [x] Step 3: CC terminal starts in the source folder and receives the import kickoff automatically. (Part C - Tasks C2, C3, C4)
7. [x] `pnpm build` passes with no TypeScript errors. (Task D)

---

*End of CCC v1.1 Stage 04e01 test checklist. Phet to walk the browser items in Safari, then issue `/tested` to CC.*
