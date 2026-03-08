# CCC v1.0.2 — Stage 04 Test: Settings, Verification & Ship
*End-to-end verification, settings patterns, tag*

---

## Settings Patterns

### Test 1: Default patterns updated
- [x] Open Settings in CCC
- [x] Concept File Pattern shows `docs/v{VERSION}/{PROJECT}_concept_v{VERSION}.md`
  >  it says: 'docs/{PROJECT}_concept.md' but should say e.g.: 'docs/{PROJECT}_concept_v1.0.2.md'
  > **Fixed:** Updated `data/settings.json` — old values were persisted from before the default change. Now shows versioned pattern.
- [x] Tasklist File Pattern shows `docs/v{VERSION}/{PROJECT}_tasklist_v{VERSION}.md`
  > dito concept remark
  > **Fixed:** Same fix as above.
- [x] Hint text mentions both `{PROJECT}` and `{VERSION}` placeholders

---

## Project Path Verification

### Test 2: All projects resolve correctly
- [x] All registered projects load in CCC sidebar without errors
- [x] Expanding any project shows its version tree and files

---

## End-to-End Walkthrough

### Test 3: Create a new project
- [x] Use New Project wizard to create a test project
  > A new project is still created outside the folder 'Projects' and not as it should, inside
  > **Fixed:** Wizard Location field now defaults to `{projectRoot}/Projects` instead of `{projectRoot}`. Please re-test.
- [x] Verify `docs/` has topic folders (discussion, architecture, spec, adr, context, handoff)
- [x] Verify `PROJECT_MAP.md` exists at project root
- [x] Verify concept file uses versioned filename: `{Name}_concept_v1.0.md`
- [x] Verify tasklist file uses versioned filename: `{Name}_tasklist_v1.0.md`

### Test 4: Create a new version on the test project
- [x] Create a minor version (e.g. v1.1) on the test project
- [x] Verify concept and tasklist use versioned filenames

### Test 5: Start a session and verify recovery
- [x] Start a CC session on any project
- [x] Wait for recovery interval (or check after a few minutes)
- [x] Recovery file lands in `docs/handoff/{Name}_recovery.md`
  > Confirmed: `Dummy_recovery.md` created in `docs/handoff/`

### Test 6: Old projects with old-path SHPs
- [x] Projects that still have SHP at `docs/{Name}_shp.md` still trigger auto-inject `/continue`
  > Verified in Stage 02 testing (backwards compatibility tests passed)

### Test 7: Import an existing project (if available)
- [ ] Import a non-CCC project → verify topic folders scaffolded, PROJECT_MAP.md created
  > Deferred — no project available to import (carried from Stage 01)

### Additional fix: Scaffolded projects missing `evaluated` flag
- [x] New Project wizard now sets `evaluated: true` on scaffolded projects
- [x] Startup migration backfills `evaluated: true` for projects that pre-date the flag
  > Bug found during testing: scaffolded projects couldn't be dragged to Active or start sessions

---

## Startup Migration

### Test 8: Topic folders on all projects
- [x] Check at least 2 non-CCC projects — they should have all 6 topic folders under `docs/`
  > Verified: LedgerNest, SC-Web, PatchPilot all have topic folders
- [x] Verify folders are empty (non-destructive — no existing files were overwritten)

---
