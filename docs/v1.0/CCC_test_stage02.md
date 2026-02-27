# CCC — Stage 02 Test Checklist
## Project Persistence & JSON

Test each item below. Tick when passed, add comments if something needs fixing.

---

### Data Schema

- [x] `data/projects.json` exists with schema: id, name, path, group, coreFiles.
- [x] `data/settings.json` exists with schema: port, editor, shell, theme, filePatterns.
- [x] Express server reads and serves projects from JSON on startup.

---

### CRUD Operations

- [x] Add project: UI form creates entry in `projects.json`.
- [x] Remove project: entry removed from `projects.json`.
- [x] Edit project: rename and reassign group work correctly.

---

### Drag & Drop

- [x] Drag project between groups — group change persists to `projects.json`.
- [x] Reorder projects within a group — order persists to `projects.json`.

---

### Environment

- [x] `.env` and `.env.example` in place.
- [x] `PORT` read from environment everywhere — no hardcoded values.
- [x] `.gitignore` covers `.env`, `data/settings.json`, `node_modules`.

---

*Test file for Stage 02 Go/NoGo gate. Run `/tested` after review.*
