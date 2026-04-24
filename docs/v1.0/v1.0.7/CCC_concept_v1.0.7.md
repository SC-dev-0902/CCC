# CCC
**Concept Document v1.0.7 — Patch Release**
*Seeded from v1.0.6*

---

## Patch Purpose

CCC detects test files using the regex `/_test_stage\d+\.md$/`. This only matches main-stage files (e.g. `CCC_test_stage11.md`). It cannot find sub-stage files (`CCC_test_stage11a.md`) or fix files (`CCC_test_stage11a01.md`).

The stage naming convention already in use across projects:

| Type | Example filename | Currently detected? |
|------|-----------------|-------------------|
| Main stage | `CCC_test_stage11.md` | Yes |
| Sub-stage | `CCC_test_stage11a.md` | No |
| Fix | `CCC_test_stage11a01.md` | No |

Three locations in the codebase share this blind spot and all three must be fixed together.

---

## Problem Details

### Location 1 — Flat docs scan (`src/versions.js` ~line 62)

Scans `docs/` for legacy flat test files. Regex:
```js
const testPattern = new RegExp(`^${escapedName}_test_stage\\d+\\.md$`);
```
Does not match `_test_stage11a.md` or `_test_stage11a01.md`.

### Location 2 — Version folder scan (`src/versions.js` `scanVersionFiles()` ~line 195)

Scans each version/patch subfolder for test files. Same regex, same blind spot.

### Location 3 — Test file path API (`server.js` + `getTestFilePath()` in `src/versions.js`)

The `GET /api/projects/:id/test-file-path?stage=N` endpoint does:
```js
const stageNumber = parseInt(req.query.stage, 10);
```
`parseInt("11a")` returns `11` — the letter suffix is silently stripped before it reaches `getTestFilePath()`. So even if CC requests the path for `stage11a`, it gets back a path for `stage11`.

---

## Fix

### 1. Regex — update in both locations

Old pattern: `_test_stage\\d+\\.md$`

New pattern: `_test_stage\\d+[a-z]?\\d*\\.md$`

This matches:
- `_test_stage11.md` (main stage)
- `_test_stage11a.md` (sub-stage)
- `_test_stage11a01.md` (fix)

Apply to both regex instances in `src/versions.js` (lines ~62 and ~195). Update the JSDoc comment at line ~187 to reflect the new pattern.

### 2. API endpoint — accept string stage identifier

In `server.js` `GET /api/projects/:id/test-file-path`:

Old validation:
```js
const stageNumber = parseInt(req.query.stage, 10);
if (!stageNumber || stageNumber < 1) {
  return res.status(400).json({ error: 'stage query parameter is required (positive integer)' });
}
```

New validation:
```js
const stageId = req.query.stage;
if (!stageId || !/^\d+[a-z]?\d*$/.test(stageId)) {
  return res.status(400).json({ error: 'stage query parameter is required (e.g. "11", "11a", "11a01")' });
}
```

Pass `stageId` (string) to `getTestFilePath()` instead of the parsed integer.

### 3. `getTestFilePath()` — handle string stage identifiers

Old signature uses integer + `padStart`:
```js
function getTestFilePath(projectName, stageNumber, activeVersion) {
  const stageStr = String(stageNumber).padStart(2, '0');
  ...
}
```

New: pad only if purely numeric, otherwise use as-is:
```js
function getTestFilePath(projectName, stageId, activeVersion) {
  const stageStr = /^\d+$/.test(String(stageId))
    ? String(stageId).padStart(2, '0')
    : String(stageId);
  ...
}
```

### 4. CLAUDE.md — update treeview regex reference

In the Stage Gate Process section, update the documented regex from `/_test_stage\d+\.md$/` to `/_test_stage\d+[a-z]?\d*\.md$/`.

---

## Scope

- Three code locations in `src/versions.js` and `server.js` — nothing else
- One documentation update in `CLAUDE.md`
- No changes to parser, terminal, WebSocket, status detection, project structure, UI layout, or any other subsystem
- No new dependencies
- Backward compatible — existing test files continue to work
- Cross-platform compatibility maintained
- Elastic License 2.0 applies

---

## Acceptance Criteria

- `CCC_test_stage11.md` — found and displayed (regression check)
- `CCC_test_stage11a.md` — found and displayed (new)
- `CCC_test_stage11a01.md` — found and displayed (new)
- API `?stage=11` — returns correct path (regression check)
- API `?stage=11a` — returns path with `_test_stage11a.md` (new)
- API `?stage=11a01` — returns path with `_test_stage11a01.md` (new)
- API `?stage=abc` — returns 400 (invalid format rejected)

---

*This is a patch release. For full project context, see `docs/v1.0/CCC_concept_v1.0.md`.*
