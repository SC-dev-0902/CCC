# CCC — Stage 01 Test Checklist
## UI Shell & Layout

Test each item below. Tick when passed, add comments if something needs fixing.

---

### Layout & Structure

- [x] `index.html` loads with split-pane layout (tree view left, main panel right).
- [x] Tree view shows hardcoded project groups: Active, Parked.
- [x] Tree view shows hardcoded projects with status dots (all five colours represented).
- [x] Groups are collapsible — click to expand/collapse.
- [x] Project nodes are expandable — show three core files as children.
- [x] Settings entry visible at bottom of tree view, always present.

---

### Tab Bar

- [x] Tab bar renders hardcoded tabs with status colours.
- [x] Active tab switching works — click a tab, content changes.
- [x] Main panel shows placeholder content per tab.

---

### Visual & Responsive

- [x] Colour scheme and typography are consistent and readable.
- [x] Panel widths hold at different window sizes — no overflow or collapse.
- [x] Resize handle between tree view and main panel works.

---

*Test file for Stage 01 Go/NoGo gate. Run `/tested` after review.*
