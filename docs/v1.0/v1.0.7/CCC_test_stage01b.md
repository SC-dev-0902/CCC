# CCC v1.0.7 — Stage 01b Test File
*API endpoint + `getTestFilePath()` — string stage identifier support*

---

## Preparation

Restart the CCC web server (`npm start`) before testing — both changes are in server-side code (`server.js` and `src/versions.js`) and require a restart to take effect. Browser refresh is not needed (no frontend change in this sub-stage).

For the API tests, pick any registered CCC project. Replace `:id` with a real project id from `data/projects.json` (or use the id CCC shows in its UI). Run the curl commands from a terminal. `CCC_PORT` is the port CCC is running on (default 3000).

For the unit-level `getTestFilePath()` tests, use a Node one-liner from the CCC project root. Example:
```sh
node -e "console.log(require('./src/versions').getTestFilePath('CCC', '11a', '1.0.7'))"
```

---

## API endpoint — `GET /api/projects/:id/test-file-path`

- [x] `curl "http://localhost:3000/api/projects/:id/test-file-path?stage=11"` returns HTTP 200 and a JSON `path` ending in `_test_stage11.md` (regression — numeric stage still works)
- [x] `curl "http://localhost:3000/api/projects/:id/test-file-path?stage=11a"` returns HTTP 200 and a JSON `path` ending in `_test_stage11a.md` (new — sub-stage suffix preserved)
- [x] `curl "http://localhost:3000/api/projects/:id/test-file-path?stage=11a01"` returns HTTP 200 and a JSON `path` ending in `_test_stage11a01.md` (new — fix suffix preserved)
- [x] `curl -o /dev/null -w "%{http_code}" "http://localhost:3000/api/projects/:id/test-file-path?stage=abc"` returns `400` (non-numeric input rejected)
- [x] `curl -o /dev/null -w "%{http_code}" "http://localhost:3000/api/projects/:id/test-file-path?stage="` returns `400` (empty string rejected)
- [x] `curl -o /dev/null -w "%{http_code}" "http://localhost:3000/api/projects/:id/test-file-path"` returns `400` (missing parameter rejected)
- [x] The 400 response body contains the new error message including the examples `"11"`, `"11a"`, `"11a01"`

---

## `getTestFilePath()` function

From the CCC project root, run the following `node -e` one-liners and confirm the output matches:

- [x] `node -e "console.log(require('./src/versions').getTestFilePath('CCC', '11', '1.0'))"` → `docs/v1.0/CCC_test_stage11.md` (regression — numeric stage padded and used)
- [x] `node -e "console.log(require('./src/versions').getTestFilePath('CCC', '11', '1.0.7'))"` → `docs/v1.0/v1.0.7/CCC_test_stage11.md` (regression — numeric stage in patch folder)
- [x] `node -e "console.log(require('./src/versions').getTestFilePath('CCC', '11a', '1.0.7'))"` → `docs/v1.0/v1.0.7/CCC_test_stage11a.md` (new — sub-stage, no zero-pad)
- [x] `node -e "console.log(require('./src/versions').getTestFilePath('CCC', '11a01', '1.0.7'))"` → `docs/v1.0/v1.0.7/CCC_test_stage11a01.md` (new — fix, no zero-pad)
- [x] `node -e "console.log(require('./src/versions').getTestFilePath('CCC', '1', '1.0'))"` → `docs/v1.0/CCC_test_stage01.md` (regression — single digit zero-padded)

---

## Code verification

- [x] `server.js` `/api/projects/:id/test-file-path` validation uses `const stageId = req.query.stage` and regex `^\d+[a-z]?\d*$` (no `parseInt`)
- [x] `server.js` passes `stageId` (not `stageNumber`) to `versions.getTestFilePath()`
- [x] `src/versions.js` `getTestFilePath()` signature is `(projectName, stageId, activeVersion)` and pads only when `/^\d+$/.test(String(stageId))` is true
- [x] JSDoc above `getTestFilePath()` in `src/versions.js` refers to `stageId` (string), not `stageNumber`
- [x] `git diff server.js` shows only the validation block + the one-line call update
- [x] `git diff src/versions.js` shows only the `getTestFilePath()` body + JSDoc change
- [x] No other files modified in this sub-stage (aside from this test file)
