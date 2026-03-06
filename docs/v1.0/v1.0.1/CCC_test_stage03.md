# CCC Test — v1.0.1 Stage 03
## Bug #1: /evaluate-import Notice

**Instructions:** Test each scenario below. Mark pass/fail and add comments if needed.

---

### Test 1: All imports flagged as unevaluated
- [ ] Import any project via the Import Wizard
- [ ] Verify `projects.json` shows `"evaluated": false` for the imported project

**Result:**
**Comments:**

---

### Test 2: Persistent UI notice appears
- [ ] Click on an unevaluated project in the tree view
- [ ] Verify the notice appears: "Run `/evaluate-import` in your Claude Code session before starting work."
- [ ] Verify the notice is visible alongside the session start buttons

**Result:**
**Comments:**

---

### Test 3: Orange traffic light dot
- [ ] Expand an unevaluated project in the tree view
- [ ] Verify the active version dot is orange (not green)

**Result:**
**Comments:**

---

### Test 4: Unevaluated blocked from Active group
- [ ] Try to drag an unevaluated project to the Active group
- [ ] Verify it is blocked with a warning
- [ ] Try to edit the project and change its group to Active
- [ ] Verify it is blocked

**Result:**
**Comments:**

---

### Test 5: Flag clears via API endpoint
- [ ] With CCC running, call: `curl -s -X POST http://localhost:3000/api/projects/PROJECT_ID/evaluated`
- [ ] Verify the response is `{"ok":true}`
- [ ] Refresh the page — verify the notice is gone
- [ ] Verify the traffic light dot is now green
- [ ] Verify the project can now be moved to Active

**Result:**
**Comments:**

---

### Test 6: Flag does NOT auto-clear on concept doc detection
- [ ] Import a project that already has a real `*_concept.md`
- [ ] Verify `evaluated` is still `false` despite concept doc existing
- [ ] Verify the notice still appears — only the API endpoint clears it

**Result:**
**Comments:**

---

**Overall Stage 03 Result:**
**Tested by:**
**Date:**
