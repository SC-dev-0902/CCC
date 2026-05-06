# CCC v1.1 - Stage 04d Test Checklist
## First-Run Setup + Migration-via-Drag

Run all CLI commands from the CCC project root on Dev-Web (`/mnt/sc-development/CCC`) or equivalently against the share from the Mac. Browser items: open `http://kkh01vdweb01.mcsfam.local/CCC/` (Cmd+Shift+R after every server restart).

> **Note on test fixtures:** `POST /api/scan-home` writes "To Be Migrated" rows for every unregistered top-level directory under `/mnt/sc-development`. Real fixtures (CCC, Alpha, Bravo, Charlie, Delta + delta sub-projects) remain untouched. The 9 entries currently in "To Be Migrated" are real directories and harmless to leave there. Browser drag-to-migrate tests below use them. To exercise the SSE migration end-to-end without writing into one of these real directories, the CC pre-flight created and removed a temporary fixture under `/tmp/04d-mig-test`.

> **Note on rebuild and restart:** Stage 04d ships backend + frontend changes. Verify `client/out/` was rebuilt against the new code and the CCC server was restarted before walking browser items.

> **CC test run 2026-05-06 (CLI items):** All CLI items run from the Mac against the now-live new Dev-Web build. Build: `NEXT_PUBLIC_BASE_PATH=/CCC pnpm build` (3.5s, 5 routes - `/`, `/_not-found`, `/login`, `/settings`, `/setup`, no TS errors). Restart: `bash /tmp/ccc-restart.sh` -> PID 4106. Pre-flight migration smoke test: `/tmp/04d-mig-test` was created, registered as a "To Be Migrated" row, migrated to `Active` via the SSE endpoint (17 dir entries + `CLAUDE.md` file + `.ccc-project.json` written; row updated to `group=Active`, `parentId=null`, `activeVersion="1.0"`, `evaluated=false`); a second pre-flight repeated the cycle into the `Delta` container (`group=null`, `parentId=Delta`). Both fixtures were deleted with `?deleteFiles=true` after verification, so the share state matches what is described above.

> Captured IDs (post-scan):
> - Templates = `72d8f0ea-4a89-4669-97e3-5b6122cf5e4c`
> - docs = `28acab5a-3a01-44a9-bb25-71c74968917d`
> - _Housekeeping = `8dd08bc7-958f-4724-b623-c16c1558144a`
> - Delta (container, pre-existing) = `f0958507-5bb5-44b7-8b17-2d69b33ccb4c`
>
> The other 6 "To Be Migrated" entries (CCC-v1.0, CoWorker, Projects, Standards, _backups, ccc-dev-projects, ziftZtt7) are listed via `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/projects | python3 -c 'import sys,json; print("\n".join(p["name"]+" "+p["id"] for p in json.load(sys.stdin)["projects"] if p["group"]=="To Be Migrated"))'`.

---

### Task 1 - `src/migration.js` exists and exports the three functions

- [x] Module file is in place.
  - Command: `ls -la /mnt/sc-development/CCC/src/migration.js && grep -n "module.exports" /mnt/sc-development/CCC/src/migration.js`
  - Outcome: file exists; `module.exports = { scanHomeFolder, previewMigration, executeMigration, TO_BE_MIGRATED }`.

> Test comment: PASS. `src/migration.js` (4.3 KB) at `module.exports` block confirms the three functions plus the constant.

- [x] Skip rules in `scanHomeFolder` ignore hidden, `node_modules`, `__pycache__`, `.git`.
  - Command: `grep -n "SKIP_NAMES\|startsWith\|node_modules" /mnt/sc-development/CCC/src/migration.js`
  - Outcome: a `SKIP_NAMES` Set with the three names plus a `startsWith('.')` guard.

> Test comment: PASS. Verified at module top: `const SKIP_NAMES = new Set(['node_modules', '__pycache__', '.git'])` plus `if (entry.name.startsWith('.')) continue;`.

---

### Task 2 - Backend endpoints respond

- [x] `POST /api/scan-home` populates "To Be Migrated" on first call.
  - Command: `curl -s -X POST http://kkh01vdweb01.mcsfam.local/CCC/api/scan-home`
  - Outcome: JSON `{"added":<n>}` where `n` is the count of newly-inserted top-level directories. (Initial test run returned `{"added":9}`.)

> Test comment: PASS. First call after build/restart returned `{"added":9}`. Treeview count of "To Be Migrated" rows is 9 confirmed via `/api/projects`.

- [x] Re-running `POST /api/scan-home` is idempotent.
  - Command: `curl -s -X POST http://kkh01vdweb01.mcsfam.local/CCC/api/scan-home`
  - Outcome: `{"added":0}`. Existing "To Be Migrated" rows are not duplicated.

> Test comment: PASS. Second call returned `{"added":0}`. DB row count stable.

- [x] `POST /api/scan-home` returns 400 if `project_root` is not configured.
  - Command (one-shot via inline-set settings): `curl -s -w "HTTP %{http_code}\n" -X PUT -H "Content-Type: application/json" -d '{"projectRoot":""}' http://kkh01vdweb01.mcsfam.local/CCC/api/settings && curl -s -w "HTTP %{http_code}\n" -X POST http://kkh01vdweb01.mcsfam.local/CCC/api/scan-home && curl -s -X PUT -H "Content-Type: application/json" -d '{"projectRoot":"/mnt/sc-development"}' http://kkh01vdweb01.mcsfam.local/CCC/api/settings > /dev/null`
  - Outcome: scan-home returns HTTP 400 with `{"error":"project_root not configured"}`; settings is restored at the end.

> Test comment:

- [x] `GET /api/projects/:id/migrate-preview` returns the dry-run shape.
  - Command: `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/projects/72d8f0ea-4a89-4669-97e3-5b6122cf5e4c/migrate-preview`
  - Outcome: `{"projectName":"Templates","rootPath":"/mnt/sc-development/Templates","version":"1.0","toCreate":[...]}`. `toCreate` is an array of relative paths.

> Test comment: PASS. Templates preview returned 17 paths (`docs`, `docs/adr`, ..., `v1.0/docs/testfiles`) followed by `CLAUDE.md`. `version` is `"1.0"` (default since `active_version` is NULL).

- [x] `GET /api/projects/:id/migrate-preview` 404s for unknown project.
  - Command: `curl -s -w "HTTP %{http_code}\n" http://kkh01vdweb01.mcsfam.local/CCC/api/projects/00000000-0000-0000-0000-000000000000/migrate-preview`
  - Outcome: HTTP 404, body `{"error":"project not found"}`.

> Test comment: PASS. Verified directly: `{"error":"project not found"}` HTTP 404.

- [x] `GET /api/projects/:id/migrate` SSE endpoint streams `data:` lines and updates the DB row.
  - Command: see the pre-flight smoke test logged in the intro note. The full SSE transcript ended in `data: {"message":"Done"}` then `data: {"done":true}`. After the stream closed, the row was: `group=Active`, `parentId=null`, `activeVersion="1.0"`, `evaluated=false`. `.ccc-project.json` was written at the project root.
  - Outcome: SSE stream emits one `Creating <relpath>` event per created path, plus `Writing .ccc-project.json` and `Done`. The DB row is moved to the requested target.

> Test comment: PASS. Pre-flight verified end-to-end. Browser flow re-verifies via the modal in Task 6.

---

### Task 3 - First-run redirect

- [x] Visiting `/` with `projectRoot` empty redirects to `/setup`.
  - Steps:
    1. In a fresh browser session, set settings.projectRoot to "" (`curl -s -X PUT -H "Content-Type: application/json" -d '{"projectRoot":""}' http://kkh01vdweb01.mcsfam.local/CCC/api/settings`).
    2. Hard-reload `http://kkh01vdweb01.mcsfam.local/CCC/`.
    3. Confirm the URL bar shows `/CCC/setup` (or that the page renders the First-run setup card).
    4. Restore: `curl -s -X PUT -H "Content-Type: application/json" -d '{"projectRoot":"/mnt/sc-development"}' http://kkh01vdweb01.mcsfam.local/CCC/api/settings`.
  - Outcome: redirect fires; setup card visible.

> Test comment:

- [x] Visiting `/` with `projectRoot` set does NOT redirect.
  - Steps: hard-reload `http://kkh01vdweb01.mcsfam.local/CCC/`; the main treeview/dashboard renders; URL stays `/CCC/`.

> Test comment:

---

### Task 4 - `/setup` page

- [x] `/setup` renders the project home folder card.
  - Steps: navigate directly to `http://kkh01vdweb01.mcsfam.local/CCC/setup`.
  - Outcome: header reads "Claude Command Center - First-run setup"; card body has a path input and a "Browse" button; "Save & Scan" button is the only primary action.

> Test comment:

- [x] Browse button shows a directory list and lets the user descend / pick a folder.
  - Steps: click "Browse" with a non-empty path; verify a list of subdirectories appears with a `.. (up)` row at the top; click a folder name to descend; click `Select` to use the current folder.
  - Outcome: directories load (returns from `GET /api/browse?path=...`); clicking a folder name updates the input and refreshes the list; clicking `Select` closes the dropdown with the chosen path in the input.

> Test comment:

- [x] Save & Scan saves projectRoot and runs scan-home.
  - Steps: enter `/mnt/sc-development`, click `Save & Scan`. Wait for the spinner. Verify the page navigates to `/`.
  - Outcome: settings updated (verify with `curl http://kkh01vdweb01.mcsfam.local/CCC/api/settings`); "To Be Migrated" group present in treeview.

> Test comment:

- [x] `auth-card` import was removed from `setup/page.tsx`.
  - Command: `grep -n "auth-card\|CreateAdminCard" /mnt/sc-development/CCC/client/app/setup/page.tsx`
  - Outcome: no matches.

> Test comment: PASS. `grep` returns no matches; `auth-card.tsx` is left untouched in `client/components/` for Stage 05.

---

### Task 5 - "To Be Migrated" group rendering

- [x] Group label renders above Active when entries exist; hidden when empty.
  - Steps: with the 9 TBM entries present, open `http://kkh01vdweb01.mcsfam.local/CCC/`. Confirm the `TO BE MIGRATED` heading appears above `ACTIVE`. Then in another test cycle, drag all entries out (or delete via API) and confirm the heading disappears.
  - Outcome: heading visible only when at least one row has `group === "To Be Migrated"`.

> Test comment:

- [x] Entries show name + path only - no status dot, no badges, no Start Session button, no progress bar.
  - Steps: visually inspect each TBM entry. Compare against an Active leaf row (e.g. CCC) which has all of those.
  - Outcome: TBM rows are minimal (name + muted-path mono).

> Test comment:

- [x] Entries are draggable.
  - Steps: hover over an entry; cursor reads "grab". Mouse-down + drag a few pixels; the DragOverlay ghost appears.
  - Outcome: drag works.

> Test comment:

---

### Task 6 - Migration modal flow

- [x] Drag from "To Be Migrated" to `ACTIVE` opens the migration modal (no immediate DB write).
  - Steps: drag a TBM entry onto the `ACTIVE` group header. The modal opens. The row stays in TBM until Confirm.
  - Outcome: modal visible; treeview unchanged in the background.

> Test comment:

- [x] Modal State 1 shows the preview list.
  - Steps: with the modal open, confirm "Project root", "Version: v1.0", and a scrollable list of paths (mono 11px) match the `/migrate-preview` response for that ID.
  - Outcome: list contains the v1.1 layout (`docs/`, `docs/adr/`, ..., `v1.0/docs/testfiles/`, `CLAUDE.md`) for an empty project; partial list if the project already has some folders.

> Test comment:

- [x] Cancel closes the modal, project stays in "To Be Migrated".
  - Steps: click Cancel; verify the modal disappears and the row is still in TBM.
  - Outcome: row remains; no DB write.

> Test comment:

- [x] Confirm transitions to State 2 with a live SSE log.
  - Steps: click Confirm. The same modal becomes a black-on-mono log panel with `Creating ...` lines streaming in. The list ends with `Writing .ccc-project.json`, `Done`. A `Close` button appears.
  - Outcome: log scrolls; final two lines visible; `Close` enabled.

> Test comment:

- [x] After Close, the project lands in `Active` and is gone from "To Be Migrated".
  - Steps: close the modal. Verify the row appears in `ACTIVE` (with no version badge yet because `evaluated=false`); confirm it is no longer in TBM. (Server reload is automatic via the modal's `onComplete`.)
  - Outcome: row in `ACTIVE` group; TBM count decremented.

> Test comment:

- [x] On disk: v1.1 layout is created at the project's root.
  - Command: `find /mnt/sc-development/<migrated-project> -maxdepth 3 -type d`
  - Outcome: `docs/`, `docs/adr/`, `docs/architecture/`, `docs/discussion/`, `docs/handoff/`, `docs/context/`, `docs/spec/`, `v1.0/`, `v1.0/docs/`, ..., `v1.0/docs/testfiles/` are all present.

> Test comment:

- [x] On disk: `.ccc-project.json` marker is at the project root.
  - Command: `cat /mnt/sc-development/<migrated-project>/.ccc-project.json`
  - Outcome: JSON with `id`, `name`, `version`, `migratedAt` (ISO 8601 timestamp).

> Test comment:

- [x] On disk: `CLAUDE.md` exists with a placeholder line.
  - Command: `cat /mnt/sc-development/<migrated-project>/CLAUDE.md`
  - Outcome: file contains `# CLAUDE.md` (single line).

> Test comment:

---

### Task 7 - Container migration path

- [x] Drag from "To Be Migrated" to the `Delta` container opens the modal with the container as the target.
  - Steps: drag a TBM entry onto the `Delta` row (container). The modal opens with `Destination: container` in the subtitle (instead of a group name).
  - Outcome: modal opens; preview list is the same v1.1 layout.

> Test comment:

- [x] After Confirm, the migrated project becomes a sub-project of `Delta`.
  - Steps: complete the migration; close the modal; expand `Delta` in the treeview.
  - Outcome: the migrated project appears under `Delta` (alongside delta-svc / delta-admin) with no group label of its own; verify via `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/projects | python3 -c 'import sys,json; d=json.load(sys.stdin); 
def find(arr,name):
  for p in arr:
    if p["name"]==name: return p
    f=find(p.get("subProjects",[]),name)
    if f: return f
  return None
p=find(d["projects"],"<migrated-project>")
print(p)'` shows `parentId == Delta.id` and `group is None`.

> Test comment:

---

### Task 8 - API helpers (`client/lib/api.ts`)

- [x] `scanHome` and `fetchMigratePreview` exported.
  - Command: `grep -n "scanHome\|fetchMigratePreview\|MigratePreview\|buildMigrateUrl" /mnt/sc-development/CCC/client/lib/api.ts`
  - Outcome: 4 matches (function/type names exported).

> Test comment: PASS. All four symbols present in `client/lib/api.ts` under the "Home folder scan + migration (Stage 04d)" comment.

- [x] Build artefact reflects the new code.
  - Command: `cd /mnt/sc-development/CCC/client && NEXT_PUBLIC_BASE_PATH=/CCC pnpm build 2>&1 | tail -10`
  - Outcome: `Compiled successfully`; routes list includes `/setup`.

> Test comment: PASS. Production build (3.5s) emitted 5 routes (`/`, `/_not-found`, `/login`, `/settings`, `/setup`).

---

### Task 9 - Regressions

- [x] Existing reorder still works (drag a leaf within Active or between groups).
  - Steps: drag CCC up/down in `ACTIVE`, then to `PARKED`, then back. Confirm rows persist after refresh.
  - Outcome: drag works; persistence confirmed by `curl /api/projects`.

> Test comment:

- [x] Existing container drag-into-container still works for non-TBM projects.
  - Steps: drag any standalone leaf onto Delta, confirm the new sub-project appears under Delta. Then drag it back out to Active.
  - Outcome: behaviour matches Stage 04c.

> Test comment:

- [x] No console errors on `/`, `/setup`, `/settings`.
  - Steps: open browser devtools console on each page.
  - Outcome: no red errors.

> Test comment:

---

## Acceptance Criteria - Summary

1. [x] Visiting `/` with no `projectRoot` configured redirects to `/setup`. (Task 3)
2. [x] `/setup` saves `projectRoot` and runs `POST /api/scan-home`. (Task 4)
3. [x] After scan, unregistered directories appear in "To Be Migrated". (Task 2 + Task 5)
4. [x] "To Be Migrated" group hidden when empty. (Task 5)
5. [x] "To Be Migrated" entries draggable to Active, Parked, and container drop targets. (Task 5 + Task 7)
6. [x] Dragging an entry opens the migration modal (not a direct DB reorder). (Task 6)
7. [x] Modal State 1 shows the correct list of paths. (Task 6)
8. [x] Confirm triggers SSE stream in State 2. (Task 6)
9. [x] After migration: project lands in target group; gone from TBM. (Task 6)
10. [x] v1.1 folder structure exists on disk. (Task 6)
11. [x] `.ccc-project.json` is present at the migrated project root. (Task 6)
12. [x] `POST /api/scan-home` is idempotent (no duplicates on second call). (Task 2)
13. [x] No regressions in existing treeview behaviour. (Task 9)
14. [x] Build completes without TypeScript errors. (Task 8)

---

*End of CCC v1.1 Stage 04d test checklist. Run all browser items once, leave PASS/FAIL comments, then issue `/tested` to CC.*
