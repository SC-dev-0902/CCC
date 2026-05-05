# CCC v1.1 - Stage 04b Test Checklist
## Filesystem Scanner Update (`src/versions.js` + treeview grouping)

Run all commands from the CCC project root on Dev-Web (`/mnt/sc-development/CCC`). The v1.1 server runs there only - the Mac CCC v1.0.7 is unaffected. Tests use a throwaway fixture under `/tmp/04b-fixture/` so the live CCC project structure (still legacy v1.0 layout) is not disturbed.

Tick each item when passed, add comments under any that need fixing.

---

### Server Boot

- [ ] Restart the CCC v1.1 server on Dev-Web and confirm it starts without error.
  - Command: `pkill -f "node server.js" 2>/dev/null; sleep 1; cd /mnt/sc-development/CCC && setsid nohup node server.js > /tmp/ccc-server.log 2>&1 < /dev/null & sleep 14; tail -n 20 /tmp/ccc-server.log`
  - Outcome: log contains `CCC running on http://localhost:3000`. No stack traces.

> Test comment:

- [ ] Confirm port 3000 responds.
  - Command: `curl -s -o /dev/null -w "%{http_code}\n" http://172.16.10.6:3000/api/version`
  - Outcome: `200`.

> Test comment:

---

### Scaffold the Fixture

- [ ] Build a fixture project at `/tmp/04b-fixture/` matching the new v1.1 layout.
  - Command:
    ```
    rm -rf /tmp/04b-fixture && mkdir -p /tmp/04b-fixture && \
    mkdir -p /tmp/04b-fixture/v1.0/docs/handoff && \
    mkdir -p /tmp/04b-fixture/v1.0/docs/testfiles/stage01/stage01a && \
    mkdir -p /tmp/04b-fixture/v1.0/docs/testfiles/stage02 && \
    mkdir -p /tmp/04b-fixture/v1.0/v1.0.1/docs/testfiles/stage03 && \
    printf '# Project_concept_v1.0.md\n\n**Concept Document v1.0**\n' > /tmp/04b-fixture/v1.0/docs/Project_concept_v1.0.md && \
    printf '# Project_tasklist_v1.0.md\n\n## Stage 01 - test\n- [x] one\n- [ ] two\n\n## Stage 02 - test\n- [x] alpha\n' > /tmp/04b-fixture/v1.0/docs/Project_tasklist_v1.0.md && \
    printf -- '- [x] a\n- [ ] b\n- [ ] c\n' > /tmp/04b-fixture/v1.0/docs/testfiles/stage01/Project_test_stage01.md && \
    printf -- '- [x] x\n- [x] y\n' > /tmp/04b-fixture/v1.0/docs/testfiles/stage01/stage01a/Project_test_stage01a.md && \
    printf -- '- [ ] one\n' > /tmp/04b-fixture/v1.0/docs/testfiles/stage02/Project_test_stage02.md && \
    printf -- '- [x] q\n' > /tmp/04b-fixture/v1.0/v1.0.1/docs/testfiles/stage03/Project_test_stage03.md && \
    find /tmp/04b-fixture | sort
    ```
  - Outcome: `find` lists every directory and file just created (concept, tasklist, four test files, plus parent dirs).

> Test comment:

---

### `getVersionFolder()` (Task 1a)

- [ ] `getVersionFolder('1.0')` returns `v1.0` (no `docs/` prefix).
  - Command: `cd /mnt/sc-development/CCC && node -e "const v=require('./src/versions'); console.log(v.getVersionFolder('1.0'));"`
  - Outcome: `v1.0`.

> Test comment:

- [ ] `getVersionFolder('1.1.1')` returns `v1.1/v1.1.1`.
  - Command: `cd /mnt/sc-development/CCC && node -e "const v=require('./src/versions'); console.log(v.getVersionFolder('1.1.1'));"`
  - Outcome: `v1.1/v1.1.1`.

> Test comment:

---

### `scanVersions()` against fixture (Tasks 1b + 1c)

- [ ] `scanVersions()` finds `v1.0` at project root, no `flatTestFiles` key, `folder` is `v1.0`.
  - Command: `cd /mnt/sc-development/CCC && node -e "const v=require('./src/versions'); const r=v.scanVersions('/tmp/04b-fixture','Project'); console.log(JSON.stringify({keys:Object.keys(r),vCount:r.versions.length,folder:r.versions[0]?.folder,version:r.versions[0]?.version,patches:r.versions[0]?.patches.length},null,2));"`
  - Outcome: `keys: ["versions","hasFlatDocs"]`, `vCount: 1`, `folder: "v1.0"`, `version: "1.0"`, `patches: 1`. No `flatTestFiles` in the keys list.

> Test comment:

- [ ] Concept and tasklist files are picked up from `v1.0/docs/`.
  - Command: `cd /mnt/sc-development/CCC && node -e "const v=require('./src/versions'); const r=v.scanVersions('/tmp/04b-fixture','Project'); console.log(JSON.stringify(r.versions[0].files,null,2));"`
  - Outcome: two entries - one is the bare string `"Project_concept_v1.0.md"`, the other is `{"name":"Project_tasklist_v1.0.md","stagesCompleted":1,"stagesTotal":2}`. Stage 01 has one unticked item (incomplete); Stage 02 is complete.

> Test comment:

- [ ] Test files include `stagePath` for both flat and nested cases.
  - Command: `cd /mnt/sc-development/CCC && node -e "const v=require('./src/versions'); const r=v.scanVersions('/tmp/04b-fixture','Project'); console.log(JSON.stringify(r.versions[0].testFiles.map(t=>({n:t.name,sp:t.stagePath,c:t.checked,t:t.total})),null,2));"`
  - Outcome: three entries -
    - `{n: 'Project_test_stage01.md', sp: 'stage01', c: 1, t: 3}`
    - `{n: 'Project_test_stage01a.md', sp: 'stage01/stage01a', c: 2, t: 2}`
    - `{n: 'Project_test_stage02.md', sp: 'stage02', c: 0, t: 1}`
    Order may vary by filesystem listing - all three must be present with the listed `stagePath`s.

> Test comment:

- [ ] Patch version `v1.0.1` nested inside `v1.0/` is detected and scans correctly.
  - Command: `cd /mnt/sc-development/CCC && node -e "const v=require('./src/versions'); const r=v.scanVersions('/tmp/04b-fixture','Project'); const p=r.versions[0].patches[0]; console.log(JSON.stringify({version:p.version,folder:p.folder,testFiles:p.testFiles},null,2));"`
  - Outcome: `version: "1.0.1"`, `folder: "v1.0/v1.0.1"`, one test file `{name: 'Project_test_stage03.md', checked: 1, total: 1, stagePath: 'stage03'}`.

> Test comment:

---

### `getTestFilePath()` (Task 1d)

- [ ] Numeric stageId zero-pads, returns the correct relative path, and creates the stage subfolder.
  - Command: `cd /mnt/sc-development/CCC && node -e "const v=require('./src/versions'); const fs=require('fs'); const p=v.getTestFilePath('/tmp/04b-fixture','Project','5','1.0'); const dir='/tmp/04b-fixture/v1.0/docs/testfiles/stage05'; console.log(JSON.stringify({path:p,dirExists:fs.existsSync(dir)}));"`
  - Outcome: `path: "v1.0/docs/testfiles/stage05/Project_test_stage05.md"`, `dirExists: true`.

> Test comment:

- [ ] Sub-stage stageId (`11a`) is used as-is.
  - Command: `cd /mnt/sc-development/CCC && node -e "const v=require('./src/versions'); console.log(v.getTestFilePath('/tmp/04b-fixture','Project','11a','1.0'));"`
  - Outcome: `v1.0/docs/testfiles/stage11a/Project_test_stage11a.md`.

> Test comment:

- [ ] Fix sub-stage stageId (`11a01`) is used as-is.
  - Command: `cd /mnt/sc-development/CCC && node -e "const v=require('./src/versions'); console.log(v.getTestFilePath('/tmp/04b-fixture','Project','11a01','1.0'));"`
  - Outcome: `v1.0/docs/testfiles/stage11a01/Project_test_stage11a01.md`.

> Test comment:

- [ ] Patch version produces the nested path.
  - Command: `cd /mnt/sc-development/CCC && node -e "const v=require('./src/versions'); console.log(v.getTestFilePath('/tmp/04b-fixture','Project','7','1.0.1'));"`
  - Outcome: `v1.0/v1.0.1/docs/testfiles/stage07/Project_test_stage07.md`.

> Test comment:

---

### `createVersion()` (Task 1e)

- [ ] `createVersion()` scaffolds `vX.Y/docs/`, `vX.Y/docs/handoff/`, `vX.Y/docs/testfiles/`, plus seeded concept + tasklist.
  - Command:
    ```
    cd /mnt/sc-development/CCC && \
    rm -rf /tmp/04b-create && mkdir -p /tmp/04b-create && \
    node -e "const v=require('./src/versions'); v.createVersion('/tmp/04b-create','Demo','1.2','minor');" && \
    find /tmp/04b-create | sort
    ```
  - Outcome: tree includes
    `/tmp/04b-create/v1.2`, `.../v1.2/docs`, `.../v1.2/docs/handoff`, `.../v1.2/docs/testfiles`,
    `.../v1.2/docs/Demo_concept_v1.2.md`, `.../v1.2/docs/Demo_tasklist_v1.2.md`.

> Test comment:

- [ ] Patch type creates the nested layout `vX.Y/vX.Y.Z/docs/...`.
  - Command:
    ```
    cd /mnt/sc-development/CCC && \
    rm -rf /tmp/04b-patch && mkdir -p /tmp/04b-patch/v1.2 && \
    node -e "const v=require('./src/versions'); v.createVersion('/tmp/04b-patch','Demo','1.2.1','patch');" && \
    find /tmp/04b-patch/v1.2/v1.2.1 | sort
    ```
  - Outcome: tree includes `v1.2/v1.2.1`, `v1.2/v1.2.1/docs`, `.../docs/handoff`, `.../docs/testfiles`, `.../docs/Demo_concept_v1.2.1.md`, `.../docs/Demo_tasklist_v1.2.1.md`.

> Test comment:

---

### `migrateToVersioned()` (Task 1f)

- [ ] Moves `docs/{name}_concept.md` and `docs/{name}_tasklist.md` into `vX.Y/docs/`, plus creates `handoff/` and `testfiles/`.
  - Command:
    ```
    cd /mnt/sc-development/CCC && \
    rm -rf /tmp/04b-migrate && mkdir -p /tmp/04b-migrate/docs && \
    printf 'concept\n' > /tmp/04b-migrate/docs/Demo_concept.md && \
    printf 'tasklist\n' > /tmp/04b-migrate/docs/Demo_tasklist.md && \
    node -e "const v=require('./src/versions'); console.log(JSON.stringify(v.migrateToVersioned('/tmp/04b-migrate','Demo','1.0')));" && \
    find /tmp/04b-migrate | sort
    ```
  - Outcome: returned `{folder:"v1.0",version:"1.0",moved:["Demo_concept.md","Demo_tasklist.md"]}`. Tree shows `v1.0/docs/Demo_concept.md`, `v1.0/docs/Demo_tasklist.md`, `v1.0/docs/handoff/`, `v1.0/docs/testfiles/`. The original `docs/Demo_concept.md` and `docs/Demo_tasklist.md` are gone.

> Test comment:

---

### `server.js` callers (Task 3)

- [ ] `GET /api/projects/:id/test-file-path?stage=99` returns the new path pattern AND the stage subfolder is auto-created on disk.
  - Pre-step (find a registered project id, e.g. CCC itself):
    `curl -s http://172.16.10.6:3000/api/projects | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);const p=o.projects.find(x=>x.name==='CCC')||o.projects[0];console.log('id:',p.id,'name:',p.name,'activeVersion:',p.activeVersion);});"`
  - Command: `curl -s "http://172.16.10.6:3000/api/projects/<ID>/test-file-path?stage=99" | python3 -m json.tool` (substitute `<ID>` from the pre-step).
  - Outcome: response `path` ends with `docs/testfiles/stage99/CCC_test_stage99.md` (path prefix depends on the chosen project's `activeVersion`). Server returns 200.

> Test comment:

- [ ] No regressions in the import-scan endpoint (it still calls `scanVersions`).
  - Command: `curl -s "http://172.16.10.6:3000/api/projects/scan?path=/mnt/sc-development/CCC" | python3 -c "import sys,json; o=json.load(sys.stdin); print('valid:',o.get('valid'),'| versioning keys:',sorted(o.get('versioning',{}).keys()))"`
  - Outcome: `valid: True` and `versioning keys: ['hasFlatDocs', 'hasVersionedDocs', 'suggestedActiveVersion']`. (CCC's actual project has no v1.1-layout folders yet, so `hasVersionedDocs: false` is expected.)

> Test comment:

---

### Treeview Test File Grouping (Task 2)

- [ ] Open `http://172.16.10.6:3000/` in the browser. Cmd+Shift+R to bypass cache.
  - Outcome: page loads, project list visible.

> Test comment:

- [ ] Register the fixture as a temporary CCC project to verify the grouped Testing UI.
  - Command:
    ```
    curl -s -X POST http://172.16.10.6:3000/api/projects \
      -H 'Content-Type: application/json' \
      -d '{"name":"04b-fixture","path":"/tmp/04b-fixture","group":"Active","type":"web-app"}'
    ```
  - Outcome: response includes `id`, `name: "04b-fixture"`. Refresh the browser.

> Test comment:

- [ ] In the treeview, expand the `04b-fixture` project, expand the Versions section, expand `v1.0`, click Testing.
  - Outcome: under Testing the structure renders as:
    ```
    Testing
      stage01
        Project_test_stage01.md  [1/3]
        stage01a
          Project_test_stage01a.md  [2/2]
      stage02
        Project_test_stage02.md  [0/1]
    ```
    Stage labels are non-clickable; sub-stage `stage01a` sits visually nested under `stage01`. Clicking any test file opens the test runner panel as before.

> Test comment:

- [ ] Expand the patch version `v1.0.1` Testing section.
  - Outcome: shows `stage03 / Project_test_stage03.md [1/1]`. Click opens the runner.

> Test comment:

- [ ] Cleanup: remove the throwaway `04b-fixture` project (keeps the registry clean).
  - Command: substitute the id from the registration response: `curl -s -X DELETE http://172.16.10.6:3000/api/projects/<ID>`
  - Outcome: response `{"ok":true}` (or similar success).

> Test comment:

- [ ] Cleanup: remove fixture directories.
  - Command: `rm -rf /tmp/04b-fixture /tmp/04b-create /tmp/04b-patch /tmp/04b-migrate`
  - Outcome: directories are gone (`ls /tmp | grep 04b-` returns empty).

> Test comment:

---

### Acceptance Criteria

- [ ] AC1 - `scanVersions()` scans version folders at project root (`vX.Y/`), not inside `docs/`.
- [ ] AC2 - `scanVersionFiles()` returns concept/tasklist files from `vX.Y/docs/` and test files from `vX.Y/docs/testfiles/` with correct `stagePath` values.
- [ ] AC3 - Patch versions (`vX.Y.Z/`) nested inside `vX.Y/` are correctly detected and scanned.
- [ ] AC4 - `getTestFilePath()` returns the new path pattern and creates the stage subfolder if it does not exist.
- [ ] AC5 - `createVersion()` creates `vX.Y/docs/`, `vX.Y/docs/handoff/`, and `vX.Y/docs/testfiles/` with seeded concept + tasklist files.
- [ ] AC6 - `migrateToVersioned()` moves flat docs into `vX.Y/docs/` (not `docs/vX.Y/`).
- [ ] AC7 - All `getTestFilePath()` callers in `server.js` pass `projectAbsPath` as first argument.
- [ ] AC8 - Treeview Testing section groups test files by stage with correct hierarchy.
- [ ] AC9 - `flatTestFiles` is no longer present in the `scanVersions()` result.
- [ ] AC10 - No references to `docs/vX.Y` remain in `src/versions.js` after the change.

---

*End of Stage 04b test checklist.*
