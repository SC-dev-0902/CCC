# CCC Tasklist v1.0.7
*Sub-Stage & Fix Test File Detection*

---

## Stage 01 — Sub-Stage & Fix Test File Detection

**Focus:** Update the three code locations that prevent CCC from finding sub-stage and fix test files. Followed by a documentation update.
**Commit to Forgejo:** After all sub-stages are GO.

### Stage 01a — Regex Fixes (`src/versions.js`)

- [ ] Fix regex in flat docs scan (~line 62): `_test_stage\\d+` → `_test_stage\\d+[a-z]?\\d*`
- [ ] Fix regex in `scanVersionFiles()` (~line 195): same change
- [ ] Update JSDoc comment in `scanVersionFiles()` (~line 187) to reflect new pattern
- [ ] Generate test file: `docs/v1.0/v1.0.7/CCC_test_stage01a.md`

### Go/NoGo Gate — Stage 01a

---

### Stage 01b — API Endpoint + `getTestFilePath()` Fix

- [ ] Fix `server.js` `GET /api/projects/:id/test-file-path`: replace `parseInt(req.query.stage, 10)` with string validation `^\d+[a-z]?\d*$`
- [ ] Fix `getTestFilePath()` in `src/versions.js` (~line 316): accept string stage identifier, pad only if purely numeric
- [ ] Generate test file: `docs/v1.0/v1.0.7/CCC_test_stage01b.md`

### Go/NoGo Gate — Stage 01b

---

### Stage 01c — CLAUDE.md Documentation Update

- [ ] Update Stage Gate Process section regex reference: `/_test_stage\d+\.md$/` → `/_test_stage\d+[a-z]?\d*\.md$/`
- [ ] Add note that sub-stages and fixes are supported
- [ ] Generate test file: `docs/v1.0/v1.0.7/CCC_test_stage01c.md`

### Go/NoGo Gate — Stage 01c

---

### Stage 01 — Forgejo Commit
- [ ] All sub-stages (01a, 01b, 01c) GO
- [ ] `git add . && git commit -m "v1.0.7 — Sub-stage and fix test file detection"`
- [ ] `git push origin main --tags`

### Go/NoGo Gate — Stage 01

---

*Three sub-stages. Forgejo commit after all three are GO.*
