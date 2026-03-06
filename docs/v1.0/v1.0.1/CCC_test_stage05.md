# CCC Test — v1.0.1 Stage 05
## Improvement #5: Auto-run /continue on Session Reopen

**Instructions:** Test each scenario below. Mark pass/fail and add comments if needed.

---

### Test 1: Auto-inject /continue when SHP exists
- [ ] Ensure a project has `docs/{ProjectName}_shp.md` on disk
- [ ] Start a Claude Code session for that project via CCC
- [ ] Verify `/continue` is automatically sent after Claude Code's prompt appears
- [ ] Verify the command is visible in the terminal output

**Result:**
**Comments:**

---

### Test 2: Auto-inject /continue when only recovery file exists
- [ ] Ensure a project has `docs/{ProjectName}_recovery.txt` but NO `_shp.md`
- [ ] Start a Claude Code session for that project via CCC
- [ ] Verify `/continue` is automatically sent

**Result:**
**Comments:**

---

### Test 3: No injection when no SHP or recovery file
- [ ] Use a project that has neither `_shp.md` nor `_recovery.txt` in `docs/`
- [ ] Start a Claude Code session via CCC
- [ ] Verify nothing is auto-injected — Claude Code waits for manual input

**Result:**
**Comments:**

---

### Test 4: No injection for shell sessions
- [ ] Ensure a project has an SHP file
- [ ] Start a **shell session** (not Claude Code) via CCC
- [ ] Verify `/continue` is NOT injected

**Result:**
**Comments:**

---

### Test 5: Injection only happens once
- [ ] Start a Claude Code session with an SHP present — `/continue` is injected
- [ ] Let Claude Code process the command and return to its prompt
- [ ] Verify `/continue` is NOT injected a second time

**Result:**
**Comments:**

---

**Overall Stage 05 Result:**
**Tested by:**
**Date:**
