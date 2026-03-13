# CCC Test — Stage 02: UX Improvements
*Version: v1.0.4 | Generated: 2026-03-13*

---

**Pre-test:** Restart CCC (`npm start`), then Cmd+Shift+R in browser.

---

## 2a. Testing Refresh Button

- [x] Refresh icon (&#x21bb;) visible next to "Testing" sub-header in treeview
- [x] Clicking refresh rescans test files without collapsing/expanding the section
- [x] New test files created on disk appear after clicking refresh
- [x] Refresh button also works on patch-level Testing headers

## 2b. Splitter Max-Width Removal

- [x] Sidebar can be dragged wider than 400px
- [x] Sidebar can expand up to ~50% of viewport width
- [x] Sidebar minimum width (200px) still enforced
- [x] Sidebar width persists after page reload (localStorage)

## 2c. Treeview Alphabetical Sorting

- [x] Groups sorted alphabetically (e.g. "Active" before "Parked")
- [x] Projects within each group sorted alphabetically by name
- [x] Files within version sections sorted alphabetically
- [x] Sorting does not break drag & drop reordering

## 2d. "Waiting for Action" Red Dot

- [x] Start a CC session in CCC, trigger a permission prompt (e.g. file write)
- [x] Red dot appears on the active version node in treeview
- [x] Red dot appears on the session tab in the tab bar
- [x] Dot changes back to yellow/green when action is taken and Claude resumes

---

*Tick each item, add comments if needed. Run `/tested` when done.*
