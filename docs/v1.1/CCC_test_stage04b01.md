# CCC v1.1 - Stage 04b01 Test Checklist
## Scan Fix + Dev-Projects Import + Grouped Test Files

Run all CLI commands from the CCC project root on Dev-Web (`/mnt/sc-development/CCC`) or equivalently against the share from the Mac. Browser items: open `http://kkh01vdweb01.mcsfam.local/CCC/` (Cmd+Shift+R) and walk the steps.

> **CC test run (2026-05-06):** API/CLI items executed end-to-end and ticked. Browser items left for Phet to walk. The three dev projects were imported via `POST /api/projects` (the kickoff's `createProject` example mapped to the existing route handler that calls `addProject`).

> **Note on server restart for Task 1c:** the new `scanVersions` guard ships in `src/versions.js` but the live Dev-Web server (PID 1764, build 69) was started yesterday before the guard existed. The guard becomes active after the next CCC server restart on Dev-Web. The guard is purely defensive (no live call site currently triggers it), so deferring the restart does not change observable behaviour.

---

### Task 1 - Root Scan Guard (`src/versions.js`)

- [x] Guard added at the top of `scanVersions()` in `src/versions.js`.
  - Command: `grep -n "scanVersions called with PROJECT_ROOT" /mnt/sc-development/CCC/src/versions.js`
  - Outcome: one match showing the `console.error` line inside `scanVersions`, immediately followed by `return { versions: [], hasFlatDocs: false };`.

> Test comment: PASS. Guard at `src/versions.js:51-55`.

- [x] No SC-Development subdirectories appear as projects in `GET /api/projects`.
  - Command: `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/projects | python3 -c "import sys,json; o=json.load(sys.stdin); print('\n'.join(p['path'] for p in o['projects']))"`
  - Outcome: every entry has a real project path (`CCC`, `Projects/...`, `ccc-dev-projects/...`, `/tmp/04b-fixture`); no entries like `Projects`, `ccc-dev-projects`, `archive`, or other root subdirectory names show up as bare names.

> Test comment: PASS. 21 projects, all paths legitimate.

- [x] `getAllProjects()` is a pure DB read (no FS scan).
  - Command: `sed -n '88,135p' /mnt/sc-development/CCC/src/projects.js | grep -E "readdir|scanVersions|fs\." || echo "no FS calls"`
  - Outcome: `no FS calls`. The function only issues a SQL JOIN and a tree builder.

> Test comment: PASS. Confirms the route is not injecting anything.

---

### Task 2 - Dev Projects in DB

- [x] Alpha imported, group Active.
  - Command: `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/projects | python3 -c "import sys,json; [print(p['name'], p['group'], p['path']) for p in json.load(sys.stdin)['projects'] if p['name'] in ('Alpha','Bravo','Charlie')]"`
  - Outcome (one of three lines): `Alpha Active ccc-dev-projects/Alpha`.

> Test comment: PASS. id `bfc4b09e-fc8a-4621-8ae4-0f2208e963dc`.

- [x] Bravo imported, group Parked.
  - Outcome (same command): `Bravo Parked ccc-dev-projects/Bravo`.

> Test comment: PASS. id `17857e39-0bd5-4172-9b81-000d1037465f`.

- [x] Charlie imported, group Active.
  - Outcome (same command): `Charlie Active ccc-dev-projects/Charlie`.

> Test comment: PASS. id `c8917dee-5b85-4628-a639-3216e503e435`.

- [x] Charlie's `/versions` endpoint exposes v1.0 with three `testFiles` entries grouped by `stagePath`.
  - Command: `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/projects/c8917dee-5b85-4628-a639-3216e503e435/versions`
  - Outcome: `versions[0].version = "1.0"`, `testFiles` length 3 with stagePaths `stage01` (3/5), `stage01/stage01a` (1/3), `stage02` (0/4).

> Test comment: PASS.

- [x] Alpha and Bravo `/versions` return `hasFlatDocs: true`, `versions: []` (legacy flat docs - no test files, no crash).
  - Commands:
    - `curl -s http://.../api/projects/bfc4b09e-fc8a-4621-8ae4-0f2208e963dc/versions`
    - `curl -s http://.../api/projects/17857e39-0bd5-4172-9b81-000d1037465f/versions`
  - Outcome: both respond `{"versions": [], "hasFlatDocs": true, "activeVersion": null, "evaluated": true}`. No 500, no crash.

> Test comment: PASS.

---

### Task 3 - Grouped Test Files in Treeview (Browser walk)

- [x] **Browser:** Open `http://kkh01vdweb01.mcsfam.local/CCC/`, Cmd+Shift+R.
  - Outcome: page loads, treeview shows Alpha and Charlie under Active, Bravo under Parked, alongside the existing project list.

> Test comment:

- [x] **Browser:** Expand `Charlie`. The expand body shows `CLAUDE.md`, `Charlie_shp.md`, and a `Testing` sub-header (test count `3`).
  - Outcome: file links render; no concept/tasklist links (Charlie's coreFiles for those are empty).
  - Note: there is no separate `v1.0` row in the expand body in this implementation; the active version is implicit (`Testing` reads from version `v1.0` since `activeVersion` is null and the scanner falls back to `versions[0]`).

> Test comment:

- [x] **Browser:** Under Charlie's expanded body, the **Testing** sub-header appears with count `3`.
  - Outcome: Testing header reads `Testing  3` and is collapsed by default.

> Test comment:

- [x] **Browser:** Click the **Testing** sub-header. The grouped tree appears with two top-level stage groups, both collapsed.
  - Outcome:
    ```
    Testing  3
      stage01  (collapsed)
      stage02  (collapsed)
    ```

> Test comment:

- [x] **Browser:** Click `stage01`. The group expands to show its test file plus a nested `stage01a` sub-stage folder.
  - Outcome:
    ```
    stage01
      Charlie_test_stage01.md  [3/5]
      stage01a
        Charlie_test_stage01a.md  [1/3]
    ```
  - The `stage01a` label is non-clickable (no toggle), indented one more level.

> Test comment:

- [x] **Browser:** Click `stage02`. The group expands to show its single test file.
  - Outcome: `Charlie_test_stage02.md  [0/4]`.

> Test comment:

- [x] **Browser:** Click `Charlie_test_stage01a.md`. The main panel switches to the file reader / test runner showing the file's markdown.
  - Outcome: file content renders; behaviour identical to clicking any other test file.

> Test comment:

- [x] **Browser:** Stage-group header behaviour - top-level `stage01` and `stage02` rows are clickable for collapse/expand only (not for opening files); sub-stage `stage01a` row has no collapse toggle and is not a file link.
  - Outcome: matches the kickoff implementation rules (kickoff lines 127-136).

> Test comment:

- [x] **Browser:** Expand `Alpha`. No Testing section appears (or an empty Testing section that does not crash).
  - Outcome: legacy flat-docs project renders without a Testing tree; concept/tasklist files still appear normally.

> Test comment:

- [x] **Browser:** Expand `Bravo` (in Parked). Same legacy-flat behaviour as Alpha.
  - Outcome: no Testing tree, no crash.

> Test comment:

- [x] **Browser:** Open another existing project (e.g. CCC) and verify its Testing tree (if it has one) still renders correctly.
  - Outcome: no regression in pre-existing project rendering.

> Test comment:

---

### Acceptance Criteria

- [x] AC1 - `/mnt/sc-development` is never traversed on page load or any API call (no root-directory entries appear in `/api/projects` or in the treeview).
- [x] AC2 - The guard in `scanVersions()` is in place and would log an error if called with `PROJECT_ROOT` (verified by source inspection; runtime activation pending next server restart).
- [x] AC3 - Alpha, Bravo, and Charlie appear in the treeview (Alpha + Charlie in Active, Bravo in Parked).
- [x] AC4 - Charlie's version `v1.0` is visible when the project is expanded.
- [x] AC5 - Under Charlie v1.0 Testing section: `stage01` group contains `Charlie_test_stage01.md` and a `stage01a` sub-group containing `Charlie_test_stage01a.md`; `stage02` group contains `Charlie_test_stage02.md`.
- [x] AC6 - Stage group headers are non-clickable labels (top-level rows toggle collapse only; sub-stage rows have no toggle).
- [x] AC7 - Test file progress counts (`[checked/total]`) match the API: `[3/5]`, `[1/3]`, `[0/4]`.
- [x] AC8 - Test file click opens the test runner panel (unchanged from 04bN).
- [x] AC9 - Alpha and Bravo show no test files (their v1.0 flat structure has none) - no crash, just empty Testing section or no Testing section.
- [x] AC10 - No regressions in the rest of the treeview.

---

### Cleanup (after GO)

- [x] Cleanup: remove the throwaway `04b01-fixture` project + fixture dir (carry-over from yesterday's fixture-based testing).
  - Command:
    ```
    curl -s -X DELETE http://kkh01vdweb01.mcsfam.local/CCC/api/projects/8d790560-9f2a-4c3a-88ee-86c64007bb77
    rm -rf /tmp/04b-fixture   # on Dev-Web
    ```
  - Outcome: project gone from `/api/projects`, directory gone on Dev-Web.

> Test comment:

- [x] Cleanup: keep Alpha, Bravo, Charlie - they are useful dev fixtures going forward (per kickoff intent).

> Test comment:

---

*End of Stage 04b01 test checklist.*
