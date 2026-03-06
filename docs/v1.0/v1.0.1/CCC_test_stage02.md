# CCC Test — v1.0.1 Stage 02
## Bug #2: Import Wizard Parity with New Project Wizard

**Instructions:** Test each scenario below. Mark pass/fail and add comments if needed.
**Note:** Bug #2 appears fully resolved from post-ship polish. These tests verify that.

---

### Test 1: Import produces version folder structure
- [ ] Import a project via the Import Wizard with version "1.0"
- [ ] Verify `docs/v1.0/` folder exists on the filesystem
- [ ] Verify concept and tasklist templates are inside `docs/v1.0/` (if project had no existing docs)

**Result:**
**Comments:**

---

### Test 2: Version field works with non-default version
- [ ] Import a project and set version to "0.5" (or any non-1.0 value)
- [ ] Verify `docs/v0.5/` folder is created
- [ ] Verify `activeVersion` in projects.json matches "0.5"
- [ ] Verify `coreFiles` paths point to `docs/v0.5/`

**Result:**
**Comments:**

---

### Test 3: Tree view shows full hierarchy
- [ ] After import, expand the project in the tree view
- [ ] Verify "Versions" header appears
- [ ] Expand Versions — verify the imported version node appears (e.g., "v1.0")
- [ ] Verify version node shows concept doc, tasklist, and Testing section
- [ ] Compare visually with a wizard-created project — hierarchy should be identical

**Result:**
**Comments:**

---

### Test 4: CLAUDE.md scaffolded at root
- [ ] Import a project that has no CLAUDE.md
- [ ] Verify CLAUDE.md is created at the project root
- [ ] Verify it contains template content referencing the correct version folder

**Result:**
**Comments:**

---

### Test 5: coreFiles and activeVersion set correctly
- [ ] After import, check `projects.json` for the imported project
- [ ] Verify `coreFiles.concept` points to `docs/vX.Y/{name}_concept.md`
- [ ] Verify `coreFiles.tasklist` points to `docs/vX.Y/{name}_tasklist.md`
- [ ] Verify `coreFiles.claude` is `CLAUDE.md`
- [ ] Verify `activeVersion` matches the version entered during import

**Result:**
**Comments:**

---

**Overall Stage 02 Result:**
**Tested by:**
**Date:**
