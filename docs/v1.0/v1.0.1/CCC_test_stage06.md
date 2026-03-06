# CCC Test — v1.0.1 Stage 06
## Bug #6: New Version Dialog Alignment

**Instructions:** Test each scenario below. Mark pass/fail and add comments if needed.

---

### Test 1: Radio buttons properly aligned
- [x] Open a project in the tree view, expand Versions
- [x] Hover over a version row (e.g., v1.0) — verify a "+" button appears
- [x] Click the "+" button on the version row — verify the **New Version** dialog opens (not the New Project wizard)
- [x] Verify the version number is pre-filled with the next patch (e.g., "1.0.1")
- [x] Verify the "Patch" radio button is pre-selected
- [x] Verify the "Type" radio buttons (Major/Minor/Patch) sit directly under the "Type" label
- [x] Verify radio buttons are inline (horizontal row), not stacked vertically
- [x] Verify radio buttons look like normal radio buttons (not styled as text inputs)

**Result:**
**Comments:**

---

### Test 2: Visual consistency with other dialogs
- [x] Open the New Version dialog (via "+" on a version row)
- [x] Open the New Project Wizard (via sidebar "+" button) for comparison
- [x] Verify the New Version dialog's label/input alignment matches the other dialogs

**Result:**
**Comments:**

---

### Test 3: Functionality preserved
- [x] Select "Major" radio option — verify selection works
- [x] Select "Patch" radio option — verify selection works
- [x] Create a new version — verify it succeeds
- [x] Delete the test version afterward (cleanup)

**Result:**
**Comments:**

---

### Test 4: Versions header "+" still works
- [x] Hover over the "Versions" header row — verify "+" appears
- [x] Click it — verify the New Version dialog opens (with smart defaults, not patch-prefilled)

**Result:**
**Comments:**

---

**Overall Stage 06 Result:**
**Tested by:**
**Date:**
