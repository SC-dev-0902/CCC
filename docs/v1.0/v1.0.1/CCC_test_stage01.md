# CCC Test — v1.0.1 Stage 01
## Bug #3: Import Overwrite Protection

**Instructions:** Test each scenario below. Mark pass/fail and add comments if needed.

---

### Test 1: Import project WITH existing concept doc
- [ ] Create or use a project that has a real `*_concept.md` (with actual content)
  > Can't test, since I have no project to import at the moment
- [ ] Import it via the Import Wizard
  > See comment above
- [ ] Verify the existing concept doc is **unchanged** (content preserved)
  > See comment above
- [ ] Verify no second/orphaned concept template was created alongside it
  > See comment above

**Result:**
**Comments:**

---

### Test 2: Import project WITH existing concept doc — name mismatch
- [ ] Use a project with `MyProject_concept.md` (or similar)
  > See comment above
- [ ] In the Import Wizard, type a **different name** (e.g., "my-project" or "My Project")
  > See comment above
- [ ] Verify the original concept doc is **unchanged**
  > See comment above
- [ ] Verify no `my-project_concept.md` template was created in the version folder
  > See comment above

**Result:**
**Comments:**

---

### Test 3: Import project with NO CCC files
- [ ] Use a project directory that has no `CLAUDE.md`, no `*_concept.md`, no `*_tasklist.md`
  > See comment above
- [ ] Import it via the Import Wizard
  > See comment above
- [ ] Verify all templates are scaffolded: concept, tasklist, CLAUDE.md, `.ccc-project.json`, `.claude/commands/`
  > See comment above
- [ ] Verify scaffolded files contain template content (not empty)
  > See comment above

**Result:**
**Comments:**

---

### Test 4: Import project with existing `.claude/commands/` directory
- [ ] Use a project that already has `.claude/commands/` with at least one existing file
  > See comment above
- [ ] Import it via the Import Wizard
  > See comment above
- [ ] Verify existing command files are **unchanged**
  > See comment above
- [ ] Verify missing CCC commands (`update-tasklist.md`, `review-concept.md`, `status.md`) are added
  > See comment above

**Result:**
**Comments:**

---

### Test 5: Import project with existing tasklist but no concept doc
- [ ] Use a project that has `*_tasklist.md` but no `*_concept.md`
  > See comment above
- [ ] Import it via the Import Wizard
  > See comment above
- [ ] Verify existing tasklist is **unchanged**
  > See comment above
- [ ] Verify a concept template IS scaffolded (since none was found)
  > See comment above

**Result:**
**Comments:**

---

### Test 6: Re-verify existing CLAUDE.md protection
- [ ] Use a project that already has a `CLAUDE.md` with real content
  > See comment above
- [ ] Import it via the Import Wizard
  > See comment above
- [ ] Verify the existing `CLAUDE.md` is **unchanged**
  > See comment above

**Result:**
**Comments:**

---

**Overall Stage 01 Result:**
**Tested by:**
**Date:**
