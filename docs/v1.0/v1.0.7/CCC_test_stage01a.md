# CCC v1.0.7 — Stage 01a Test File
*Regex fix for sub-stage and fix test file detection in `src/versions.js`*

---

## Preparation

Before testing, create three dummy test files to verify detection. Pick any registered CCC project (or use CCC itself). Place all three in the project's `docs/` directory (flat docs scan) AND inside a version folder like `docs/v1.0/` (for `scanVersionFiles()`):

- `CCC_test_stage11.md` (main stage — regression)
- `CCC_test_stage11a.md` (sub-stage — new)
- `CCC_test_stage11a01.md` (fix — new)

Each file needs at least one checkbox line (e.g. `- [ ] placeholder`) so the checkbox count returns something observable.

Restart the CCC web server (`npm start`) and hard-refresh the browser (Cmd+Shift+R) before testing — the regex changes require a server restart to take effect.

---

## Flat docs scan (`scanVersions()` ~line 62)

- [x] `CCC_test_stage11.md` placed in `docs/` appears in the project's "Testing" section in the treeview (regression — main stage still detected)
- [x] `CCC_test_stage11a.md` placed in `docs/` appears in the project's "Testing" section in the treeview (new — sub-stage detected)
- [x] `CCC_test_stage11a01.md` placed in `docs/` appears in the project's "Testing" section in the treeview (new — fix file detected)
- [x] Each file shows its checkbox count (e.g. `0/1`) next to the filename
- [x] A non-matching file (e.g. `CCC_test_stageXX.md` or `CCC_test_notes.md`) placed in `docs/` is NOT listed as a test file

---

## Version folder scan (`scanVersionFiles()` ~line 195)

- [x] `CCC_test_stage11.md` placed in `docs/v1.0/` appears under the v1.0 version node in the treeview (regression)
- [x] `CCC_test_stage11a.md` placed in `docs/v1.0/` appears under the v1.0 version node in the treeview (new)
- [x] `CCC_test_stage11a01.md` placed in `docs/v1.0/` appears under the v1.0 version node in the treeview (new)
- [x] `CCC_test_stage11a.md` placed in a patch subfolder (e.g. `docs/v1.0/v1.0.7/`) appears under the patch node in the treeview
- [x] `CCC_test_stage11a01.md` placed in a patch subfolder appears under the patch node
- [x] Each file shows its checkbox count next to the filename
- [x] A non-matching filename placed in a version folder is NOT listed as a test file

---

## Code verification

- [x] `src/versions.js` flat docs scan regex (~line 62) reads: `new RegExp(\`^${escapedName}_test_stage\\d+[a-z]?\\d*\\.md$\`)`
- [x] `src/versions.js` `scanVersionFiles()` regex (~line 195) reads: `new RegExp(\`^${escapedName}_test_stage\\d+[a-z]?\\d*\\.md$\`)`
- [x] JSDoc comment above `scanVersionFiles()` reads `Test files match {projectName}_test_stage\d+[a-z]?\d*\.md` and mentions main stages, sub-stages, and fixes
- [x] No other code changes in `src/versions.js` (`git diff src/versions.js` shows only the three changes above)
- [x] No changes in any other file (`git diff` shows only `src/versions.js` modified, plus the new test file)
