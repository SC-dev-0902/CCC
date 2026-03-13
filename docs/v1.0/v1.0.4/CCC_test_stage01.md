# CCC Test — Stage 01: Project Rename (Full Propagation)
*Version: v1.0.4 | Generated: 2026-03-13*

---

**Pre-test:** Restart CCC (`npm start`), then Cmd+Shift+R in browser.

---

## Basic Rename

- [x] Open Edit modal for a project with existing `{Name}_*` files on disk (e.g. PatchPilot)
- [x] Change the project name (e.g. "PatchPilot" → "PatchPilot-Test")
- [x] Treeview updates to show the new name immediately after save
- [x] Expand version tree — concept, tasklist, and test file nodes show new filename prefix

## Folder Rename

- [x] Project folder on disk renamed to match new name
- [x] `path` field in `projects.json` updated to reflect new folder name

## File Propagation

- [x] Check `docs/` on disk — all `{OldName}_*` files renamed to `{NewName}_*`
- [x] Check `docs/handoff/` — SHP and recovery files renamed (if they existed)
- [x] Check version folders (`docs/vX.Y/`) — files renamed
- [x] Check patch subfolders (`docs/vX.Y/vX.Y.Z/`) — files renamed (if applicable)
- [x] Files that do NOT follow `{Name}_` pattern (e.g. `CLAUDE.md` itself) are untouched

## projects.json Update

- [x] `name` field updated to new name
- [x] `coreFiles.concept` path contains new name
- [x] `coreFiles.tasklist` path contains new name

## CLAUDE.md Content Update

- [x] Open the project's `CLAUDE.md` — all occurrences of the old name replaced with new name
- [x] No other files had their content modified (only CLAUDE.md)

## Round-Trip

- [x] Rename the project back to its original name
- [x] All files rename back correctly — including folder name
- [x] `path` and `coreFiles` paths revert to original
- [x] Treeview, version tree, and test file detection all work as before

## Edge Cases

- [x] Rename a project that has NO `{Name}_*` files on disk — succeeds with zero file renames, display name and folder update
- [x] Attempt to rename to a name where target folder already exists — error shown, nothing changed
- [x] Rename a project with spaces in the name (e.g. "Pactum - Core") — files and folder handled correctly

## Error Handling

- [x] If rename fails mid-operation, files and folder are rolled back to original names
- [x] Error message shown in UI (not silent failure)

---

*Tick each item, add comments if needed. Run `/tested` when done.*
