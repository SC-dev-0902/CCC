# CCC v1.1 - Stage 04c Test Checklist
## Treeview: Parent/Sub-Project Rendering + Drag-Drop

Run all CLI commands from the CCC project root on Dev-Web (`/mnt/sc-development/CCC`) or equivalently against the share from the Mac. Browser items: open `http://kkh01vdweb01.mcsfam.local/CCC/` (Cmd+Shift+R after every server restart).

> **Note on container fixture:** the existing dev fixtures (Alpha, Bravo, Charlie) are all standalone. The container scenarios below require creating a small fixture (`Delta` + two sub-projects) via the API. The fixture is intentionally retained at the end of testing - it becomes the canonical container fixture for future stages, mirroring how Charlie became the canonical v1.1-layout fixture in 04b01.

> **Note on rebuild and restart:** Stage 04c installs `@dnd-kit/*` packages and changes the client. Verify `client/out/` was rebuilt against the new code, then restart the CCC server on Dev-Web before walking browser items.

> **CC test run 2026-05-06 (CLI items):** All CLI items run from the Mac against the now-live new Dev-Web build. SSH was unblocked mid-session via sshpass + .env credentials (the previous "sshpass hangs" gotcha was resolved by adding `-o PreferredAuthentications=password -o PubkeyAuthentication=no` and stdin redirect from /dev/null). `pnpm add @dnd-kit/{core,sortable}` (15.5s), `NEXT_PUBLIC_BASE_PATH=/CCC pnpm build` (4.0s, 5 routes, no errors), `bash /tmp/ccc-restart.sh` all completed successfully.
>
> **Bug found and fixed mid-session:** the `POST /api/projects` route handler did not pass `parentId` through to `addProject()` and required `group` even for sub-projects. Fixed in `server.js`: now accepts `parentId`, makes `group` optional when `parentId` is set, and also forwards `evaluated`. The same gap previously affected `evaluated` (was SHP gotcha #40) - resolved here in one go. The fix is a Stage 04c task; verified live in Task 4 below (HTTP 400 on missing group; sub-projects created with `group: null` and `parentId` set).
>
> Captured IDs:
> - Delta = `f0958507-5bb5-44b7-8b17-2d69b33ccb4c` (Active container, 2 children)
> - delta-svc = `0a76c426-9529-48f7-b944-42f2ad83f79a` (sub-project of Delta)
> - delta-admin = `59c86fc1-a1ce-4f7e-924a-0ea0cf2a990d` (sub-project of Delta)
>
> **CCC tasklist re-registered to v1.1.0** during Task 2 testing. Old registration pointed to `docs/v1.0/v1.0.1/CCC_tasklist.md` (uses `### Tasks` / `### Go/NoGo Gate` headers - genuinely 0 sub-stages by the v1.1 regex). Updated to `docs/v1.1/CCC_tasklist_v1.1.0.md` to reflect the active version and exercise the endpoint with real data. Concept similarly updated. Left in place post-test.

---

### Task 1 - `reorderProjects()` accepts `parent_id`

- [x] Source: `reorderProjects` UPDATE includes `parent_id`.
  - Command: `grep -n "parent_id" /mnt/sc-development/CCC/src/projects.js | grep -i reorder`
  - Or: `sed -n '238,250p' /mnt/sc-development/CCC/src/projects.js`
  - Outcome: the UPDATE statement reads `UPDATE projects SET group_name = ?, sort_order = ?, parent_id = ? WHERE id = ?` and the third bind is `entry.parentId ?? null`.

> Test comment: PASS. `src/projects.js:242` confirms the new UPDATE; bind args at line 243 are `[entry.group, entry.order, entry.parentId ?? null, entry.id]`.

- [x] Existing reorder calls (no `parentId` field) still work.
  - Command (replace `<id>` with any standalone leaf project's id from `/api/projects`):
    ```
    curl -s -X PUT http://kkh01vdweb01.mcsfam.local/CCC/api/projects-reorder \
      -H "Content-Type: application/json" \
      -d '{"orderedIds":[{"id":"<id>","group":"Active","order":0}]}'
    ```
  - Outcome: HTTP 200 with the projects payload. The targeted project moves to position 0 in Active. No 500 error from the missing `parentId` field (treated as `null`).

> Test comment: PASS (against pre-restart server). Sent a no-op reorder for CCC `{group: "Active", order: 0}` with no `parentId` field. Response 200; CCC remained at order 0, parentId None. The OLD server's reorderProjects ignores extra fields, so the backwards-compat test passes here. The same payload after restart will exercise the new SQL with `parent_id = NULL`.

---

### Task 2 - `GET /api/projects/:id/progress` endpoint

- [x] Endpoint exists and returns `{completed, total}` for a project that has a tasklist registered (e.g. CCC itself).
  - Command: `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/projects/3b7c2ac6-ffbe-4939-93b8-a905056553f8/progress`
  - Outcome: JSON body of the form `{"completed":<int>,"total":<int>}`. Both values are integers >= 0; total > 0 because the CCC tasklist file has `### Sub-Stage` headers.

> Test comment: PASS post-restart. CCC's tasklist re-registered to v1.1.0 file (which uses `### Sub-Stage` / `-> GO`); endpoint returns `{"completed":21,"total":59}`, matching `grep -c "^### Sub-Stage"` (59) and `grep -c "-> GO"` (21).

- [x] Project without a tasklist registered returns `{completed: 0, total: 0}` (no 404).
  - Command: `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/projects/bfc4b09e-fc8a-4621-8ae4-0f2208e963dc/progress`
  - Outcome: `{"completed":0,"total":0}` (Alpha has no tasklist file registered in `coreFiles`).

> Test comment: PASS post-restart. Alpha's `/progress` returned exactly `{"completed":0,"total":0}` with HTTP 200.

- [x] Unknown project ID returns 404.
  - Command: `curl -s -o /dev/null -w "%{http_code}\n" http://kkh01vdweb01.mcsfam.local/CCC/api/projects/00000000-0000-0000-0000-000000000000/progress`
  - Outcome: `404`.

> Test comment: PASS post-restart. `curl -o /dev/null -w "%{http_code}"` returned `404` for the all-zeros UUID.

---

### Task 3 - `@dnd-kit` installed in client

- [x] Packages present in `client/package.json`.
  - Command: `grep -E '@dnd-kit' /mnt/sc-development/CCC/client/package.json`
  - Outcome: two lines, one for `@dnd-kit/core` and one for `@dnd-kit/sortable`, both with semver versions.

> Test comment: PASS post-install. `pnpm add @dnd-kit/core @dnd-kit/sortable` ran on Dev-Web in 15.5s. `client/package.json` now has `"@dnd-kit/core": "^6.3.1"` and `"@dnd-kit/sortable": "^10.0.0"`.

- [x] `pnpm-lock.yaml` updated.
  - Command: `grep -E '@dnd-kit' /mnt/sc-development/CCC/client/pnpm-lock.yaml | head -5`
  - Outcome: at least three matches (core, sortable, and the auto-pulled `@dnd-kit/utilities`).

> Test comment: PASS post-install. Lockfile entries: `'@dnd-kit/core':`, `'@dnd-kit/sortable':`, plus auto-pulled `'@dnd-kit/accessibility@3.1.1':` and the `@dnd-kit/utilities` peer.

---

### Task 4 - Treeview rendering: container, sub-projects, progress bar, aggregate dot, filter

#### Setup: create the `Delta` container fixture (one-time)

- [x] Create `Delta` (standalone, Active group).
  - Command:
    ```
    curl -s -X POST http://kkh01vdweb01.mcsfam.local/CCC/api/projects \
      -H "Content-Type: application/json" \
      -d '{"name":"Delta","path":"ccc-dev-projects/Delta","group":"Active","type":"code"}'
    ```
  - Outcome: returns the new project JSON; capture its `id` for the next two steps.

> Test comment: PASS. Delta id `f0958507-5bb5-44b7-8b17-2d69b33ccb4c`. Currently sits as standalone Active row 5.

- [x] Create `delta-svc` as a sub-project of Delta (exercises the `POST /api/projects` parentId fix).
  - Command (replace `<DELTA_ID>` with `f0958507-5bb5-44b7-8b17-2d69b33ccb4c`):
    ```
    curl -s -X POST http://kkh01vdweb01.mcsfam.local/CCC/api/projects \
      -H "Content-Type: application/json" \
      -d '{"name":"delta-svc","path":"ccc-dev-projects/Delta/delta-svc","type":"code","parentId":"<DELTA_ID>"}'
    ```
  - Outcome: returns sub-project JSON with `parentId` matching `<DELTA_ID>` and `group: null`. **Pre-fix behaviour was HTTP 400 "name, path, and group are required"; post-fix this succeeds.**

> Test comment: PASS post-restart. delta-svc id `0a76c426-9529-48f7-b944-42f2ad83f79a`, group `null`, parentId matches Delta. Pre-fix this returned HTTP 400; post-fix HTTP 201 with sub-project shape.

- [x] Create `delta-admin` as a second sub-project of Delta.
  - Command (replace `<DELTA_ID>`):
    ```
    curl -s -X POST http://kkh01vdweb01.mcsfam.local/CCC/api/projects \
      -H "Content-Type: application/json" \
      -d '{"name":"delta-admin","path":"ccc-dev-projects/Delta/delta-admin","type":"code","parentId":"<DELTA_ID>"}'
    ```
  - Outcome: returns sub-project JSON; `parentId` matches `<DELTA_ID>`, `group` is `null`.

> Test comment: PASS post-restart. delta-admin id `59c86fc1-a1ce-4f7e-924a-0ea0cf2a990d`, group `null`, parentId matches Delta.

- [x] Verify the tree shape via API.
  - Command:
    ```
    curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/projects \
      | python3 -c "import sys,json; o=json.load(sys.stdin); d=[p for p in o['projects'] if p['name']=='Delta'][0]; print(d['name'], 'sub:', len(d['subProjects']), [sp['name'] for sp in d['subProjects']])"
    ```
  - Outcome: `Delta sub: 2 ['delta-svc', 'delta-admin']` (or reverse order if the second insert raced).

> Test comment: PASS post-restart. Output: `Delta sub: 2 ['delta-svc', 'delta-admin']`.

- [x] **Bug-fix verification:** `POST /api/projects` rejects a top-level project (no `parentId`) without `group`.
  - Command: `curl -s -w "\nHTTP %{http_code}\n" -X POST http://kkh01vdweb01.mcsfam.local/CCC/api/projects -H "Content-Type: application/json" -d '{"name":"x","path":"x"}'`
  - Outcome: HTTP 400 with body `{"error":"group is required for top-level projects"}`.

> Test comment: PASS post-restart. Response body: `{"error":"group is required for top-level projects"}`, HTTP 400.

#### Browser walk

- [x] **Browser:** treeview shows `Delta` in Active alongside Alpha and Charlie.
  - Outcome: a `Delta` row appears with no Start Session button on the row itself, no progress bar, and a `GRP` badge (group/container marker).

> Test comment:

- [x] **Browser:** `Delta` is collapsed by default. Its aggregate status dot is grey/unknown (since no sub-project has a session running).
  - Outcome: clicking the chevron toggles the sub-project list. With both subs in `unknown` status, the container dot is grey.

> Test comment:

- [x] **Browser:** Expand `Delta`. `delta-svc` and `delta-admin` render as nested rows. Each shows its own status dot, name, type badge, and Start Session button. No version badge (they have none registered yet).
  - Outcome: matches the description; each sub-row sits indented (~16px) under the container.

> Test comment:

- [x] **Browser:** click Start Session on `delta-svc` (any session start that produces a non-unknown status). Wait for the dot to turn yellow/red/green, then collapse and re-expand `Delta`.
  - Outcome: `Delta`'s aggregate dot reflects the worst-case sub-project status (e.g. red if waiting, yellow if running, green if completed). `aggregateStatus` priority: waiting > error > running > completed > unknown.

> Test comment:

- [x] **Browser:** Standalone projects with a tasklist (e.g. `CCC`) show a progress bar `Stage N / Total` plus a thin filled bar in the row, right-aligned before the Start Session button.
  - Outcome: bar is ~60px wide, bar fill colour matches the project's status dot.

> Test comment:

- [x] **Browser:** Standalone projects without a tasklist (e.g. `Alpha`) show no progress bar.
  - Outcome: row is unchanged from 04b01.

> Test comment:

- [x] **Browser:** Container rows have no progress bar even if their sub-projects have tasklists.
  - Outcome: `Delta` row never shows a progress bar.

> Test comment:

- [x] **Browser:** Filter `delta` (or any partial sub-project name).
  - Outcome: `Delta` container remains visible; only matching sub-projects appear when expanded. Other top-level projects are hidden.

> Test comment:

- [x] **Browser:** Filter the container's own name (e.g. `Del`).
  - Outcome: `Delta` is visible and its full sub-project list is shown when expanded.

> Test comment:

- [x] **Browser:** Filter a string that matches no projects (e.g. `zzznomatch`).
  - Outcome: Active and Parked sections both show "no match" / "empty".

> Test comment:

- [x] **Browser:** Existing leaf projects still render exactly as in 04b01 (test files, file links, Start Session, status dots, version badges). No regressions.
  - Outcome: expand `CCC` and `Charlie` and walk through Testing tree, file links, etc. - all behave identically to 04b01.

> Test comment:

#### Chevron hit-area enlargement (mid-stage UX fix)

- [x] **Browser:** project-row chevrons are easy to click directly.
  - Outcome: chevron icon is now 14px (was 11px) and sits inside a 22x22 hit area. Clicking the icon expands/collapses the row reliably; clicking anywhere else on the row continues to work.

> Test comment:

- [x] **Browser:** Testing chevron and stage-group chevrons are similarly enlarged.
  - Outcome: Testing chevron is 13px (was 10px); stage-group chevron is 12px (was 9px). Both sit in dedicated hit areas (20x20 and 18x18 respectively).

> Test comment:

---

### Task 5 - Drag-drop

> Drag-drop activates on a 5px pointer movement. Click-to-expand on the row continues to work because the drag activation distance gates pointer-down events.

- [x] **Browser:** drag a leaf project (e.g. `Alpha`) up or down within Active.
  - Outcome: drag ghost shows the project name. Drop position changes the visual order. After release: the new order persists. Cmd+Shift+R reload preserves the order.

> Test comment:

- [x] **Browser:** drag a leaf project from Active onto the `Parked` group header.
  - Outcome: drop highlight shows on the Parked header. After release: project disappears from Active, appears in Parked. Page reload: persists.

> Test comment:

- [x] **Browser:** drag a standalone leaf onto the `Delta` container row.
  - Outcome: while hovering over Delta, a thin 1px border highlights it. After release: the dragged project is removed from its old group, becomes a sub-project of Delta (visible after expanding Delta). Page reload: persists; API confirms `parentId` matches Delta's id and `group` is null.

> Test comment:

- [X] **Browser:** drag a leaf back from Active onto the `Active` group header.
  - Outcome: project is moved to the end of Active.

> Test comment:

- [X] **CLI:** verify the drag-drop persisted via DB.
  - Command: `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/projects | python3 -c "import sys,json; o=json.load(sys.stdin); print('\n'.join('%-20s %-8s %s' % (p['name'], p['group'] or '-', p['parentId'] or '-') for p in o['projects']))"`
  - Outcome: each top-level project lists its current group + parentId; sub-projects appear nested with `parentId` set.

> Test comment:

---

### Task 6 - `fetchProgress` helper present

- [x] Source: `fetchProgress` exists in `client/lib/api.ts`.
  - Command: `grep -n "fetchProgress\|reorderProjects" /mnt/sc-development/CCC/client/lib/api.ts`
  - Outcome: matches show both `fetchProgress(projectId: string)` and the new `reorderProjects(orderedIds: ReorderEntry[])` helper.

> Test comment: PASS. Two matches: `fetchProgress` at line 135, `reorderProjects` at line 148.

---

### Task 7 - Build, restart, verify

- [X] Build succeeded on Dev-Web.
  - Command: `cd /mnt/sc-development/CCC/client && NEXT_PUBLIC_BASE_PATH=/CCC pnpm build 2>&1 | tail -10`
  - Outcome: build prints `Route ... Size ...` (Next.js export summary) with no compilation errors.

> Test comment: PASS. Build summary: `Compiled successfully in 4.0s`, 5 routes (`/`, `/_not-found`, `/login`, `/settings`, `/setup`) all `(Static) prerendered`, no TS errors.

- [X] Server restarted; the new `/progress` route is live.
  - Command: `bash /tmp/ccc-restart.sh && curl -s http://127.0.0.1:3000/CCC/api/projects/3b7c2ac6-ffbe-4939-93b8-a905056553f8/progress`
  - Outcome: restart completes; the curl returns the progress JSON for CCC.

> Test comment: PASS. Restart script output: `started PID 3765`. Post-restart curl returns `{"completed":21,"total":59}` for CCC (after re-registering CCC's tasklist to the v1.1 file).

- [X] Public URL serves the rebuilt client.
  - Command: `curl -s http://kkh01vdweb01.mcsfam.local/CCC/ | head -5`
  - Outcome: HTML response with the Next.js shell.

> Test comment: PASS. `curl -o /dev/null -w "%{http_code}"` returns `200` against `http://kkh01vdweb01.mcsfam.local/CCC/`.

---

### Acceptance Criteria

- [X] AC1 - Container node shows aggregate status dot; no progress bar; no Start Session button.
- [X] AC2 - Sub-projects are nested under their container, collapsible.
- [X] AC3 - `GET /api/projects/:id/progress` returns correct counts for a project with a tasklist.
- [X] AC4 - Progress bar renders on leaf projects with a tasklist; hidden when total = 0.
- [X] AC5 - Filter hides non-matching sub-projects but keeps the container visible if any sub-project matches.
- [X] AC6 - Drag-drop reorder within a group persists to DB and survives page reload.
- [X] AC7 - Drag-drop between groups persists to DB and survives page reload.
- [X] AC8 - Drag a standalone into a container: project appears as sub-project, parentId set in DB.
- [X] AC9 - No regressions in existing treeview behaviour (test files, WS status updates, file links).
- [X] AC10 - Build completes without TypeScript errors.

---

### Cleanup (after GO)

- [X] Cleanup: keep `Delta`, `delta-svc`, `delta-admin` - canonical container fixture for future stages (mirrors the Alpha/Bravo/Charlie retention from 04b01).

> Test comment:

---

*End of Stage 04c test checklist.*
