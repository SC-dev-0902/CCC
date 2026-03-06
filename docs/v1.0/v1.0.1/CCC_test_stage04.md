# CCC Test — v1.0.1 Stage 04
## Bug #4: SHP Safety Net

**Instructions:** Test each scenario below. Mark pass/fail and add comments if needed.

---

### Test 1: beforeunload warning with active session
- [ ] Start a Claude Code or shell session in CCC
- [ ] Try to close the browser tab (Cmd+W or close button)
- [ ] Verify the browser shows "Leave site? Changes you made may not be saved." warning
- [ ] Cancel the close — verify CCC is still working normally

**Result:**
**Comments:**

---

### Test 2: No warning without active sessions
- [ ] Ensure no terminal sessions are running (no active sessions)
- [ ] Close the browser tab
- [ ] Verify it closes immediately without a warning

**Result:**
**Comments:**

---

### Test 3: Recovery auto-save setting visible
- [ ] Open Settings panel
- [ ] Verify "Recovery Auto-Save Interval (minutes)" field is visible
- [ ] Verify default value is 5
- [ ] Change the value to 1 minute (for testing), save settings
- [ ] Verify the save succeeds

**Result:**
**Comments:**

---

### Test 4: Recovery file is created
- [ ] Set recovery interval to 1 minute in Settings
- [ ] Start a Claude Code session — interact with it (generate some scrollback)
- [ ] Wait at least 1 minute
- [ ] Check the project's `docs/` folder for `{ProjectName}_recovery.txt`
- [ ] Verify the file exists and contains terminal scrollback text

**Result:**
**Comments:**

---

### Test 5: Recovery file is overwritten on each save
- [ ] With a session running, wait for two recovery save cycles
- [ ] Check the recovery file timestamp — verify it was updated on the second cycle
- [ ] Verify the file contains the latest scrollback (not a duplicate)

**Result:**
**Comments:**

---

### Test 6: Recovery file is deleted on /eod
- [ ] With a recovery file existing, run `/eod` in the Claude Code session
- [ ] Verify the SHP file is created: `docs/{ProjectName}_shp.md`
- [ ] Verify the recovery file is deleted: `docs/{ProjectName}_recovery.txt` no longer exists

**Result:**
**Comments:**

---

**Overall Stage 04 Result:**
**Tested by:**
**Date:**
