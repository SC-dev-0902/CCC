# CCC — Stage 12 Test Checklist
## Session-Version Binding & Interactive Test Runner

Test each item below. Tick when passed, add comments if something needs fixing.

---

### Wave 1: Session-Version Binding

- [x] Project row click expands/collapses only — does not open a tab.
- [x] `openSessionTab(projectId)` uses `projectId::session` tab ID scheme (double colon).
- [x] Active version row click opens session tab.
- [x] Non-active version click sets version active then opens session tab.
- [x] `renderSessionContent()` helper renders session/terminal content.
- [x] Session exit disposes terminal and returns to "no active session" prompt.
- [x] Status dot appears on active version row (not project row).
- [x] `getTabInfo()` and `renderTabContent()` handle `::session` tab ID format.

---

### Wave 2: Test File Relocation

- [x] `scanVersionFiles()` returns `{ files[], testFiles[] }` — separated by `_test_stage\d+\.md` regex.
- [x] `scanVersions()` top-level uses `flatTestFiles` (not `testFiles`).
- [x] Test files render under collapsible "Testing" sub-header inside each version node.
- [x] `expandedTestingSections` Set tracks Testing sub-header expand state.

---

### Wave 3: Interactive Test Runner

- [x] `PUT /api/file/:projectId` endpoint with path traversal protection.
- [x] `isTestFile()` detects `_test_stage\d+\.md` pattern.
- [x] `renderTestRunner()` renders: checkboxes, comment textareas, progress counter, Save button.
- [x] `parseTestFile()` parses: headings, checkbox lines, bold labels, `  > ` comment lines.
- [x] `reconstructTestFile()` rebuilds markdown from parsed structure.
- [x] Manual Save button only — no auto-save.
- [x] `DELETE /api/projects/:id/versions/:version` with active-version protection and FS deletion.
- [x] Remove button on non-active version rows with confirmation modal.
- [x] Sidebar refresh button clears `projectVersions` cache and reloads tree.

---

### Post-Go Parser Fixes

- [x] Three PERMISSION_PATTERNS added: `/Do you want to/i`, `/❯\s+\d/`, `/Esc to cancel/i`.
- [x] Empty chunk filter: skip chunks that strip to empty after ANSI removal.
- [x] Decorative line filters: skip horizontal rules, IDE hints, shortcut hints.
- [x] Degradation check disabled (false positives — redesign deferred to v1.1).

---

*Test file for Stage 12 Go/NoGo gate. Run `/tested` after review.*
