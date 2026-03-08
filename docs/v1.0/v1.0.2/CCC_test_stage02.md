# CCC v1.0.2 — Stage 02 Test: Path Migration
*SHP read path, recovery write path, auto-inject /continue*

---

## Recovery Auto-Save

### Test 1: Recovery file writes to new path
- [x] Start a Claude Code session on any project
- [x] Wait for the recovery interval (default 5 minutes, or set to 1 minute in Settings for faster testing)
- [x] Check the project's filesystem — recovery file should be at `docs/handoff/{ProjectName}_recovery.md`
- [x] Verify NO recovery file at old path `docs/{ProjectName}_recovery.txt`

### Test 2: Recovery works on projects without docs/handoff/
- [x] Pick a project that does NOT have a `docs/handoff/` folder yet (an older project)
- [x] Start a session and wait for recovery save
- [x] Verify `docs/handoff/` was auto-created and recovery file was written there

---

## Auto-Inject /continue

### Test 3: Finds SHP at new path
- [x] Ensure a project has `docs/handoff/{ProjectName}_shp.md`
- [x] Start a Claude Code session on that project
- [x] Verify `/continue` is auto-injected (pendingContinue triggers)

### Test 4: Falls back to old SHP path
- [x] Ensure a project has `docs/{ProjectName}_shp.md` (old path) but NOT `docs/handoff/{ProjectName}_shp.md`
- [x] Start a Claude Code session on that project
- [x] Verify `/continue` is still auto-injected (backwards compatibility)

### Test 5: Finds recovery at new path
- [x] Ensure a project has `docs/handoff/{ProjectName}_recovery.md` but NO SHP file
- [x] Start a Claude Code session
- [x] Verify `/continue` is auto-injected

### Test 6: Falls back to old recovery path
- [x] Ensure a project has `docs/{ProjectName}_recovery.txt` (old path) but no new-path files
- [x] Start a Claude Code session
- [x] Verify `/continue` is still auto-injected (backwards compatibility)

---
