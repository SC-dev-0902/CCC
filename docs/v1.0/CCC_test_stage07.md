# CCC — Stage 07 Test Checklist
## New Project Wizard

Test each item below. Tick when passed, add comments if something needs fixing.

---

### Wizard Flow

- [x] Wizard UI: step-by-step modal flow (Name → Location → Template → Group → Create).
- [x] Name input: becomes folder name and file prefix.
- [x] Location input: browse or type parent directory path.
- [x] Template selection: Web App / API / Script / Research / Blank.
- [x] Group selection: existing groups or create new.

---

### Scaffolding

- [x] `CLAUDE.md` pre-filled from selected template.
- [x] `docs/{NAME}_concept.md` created with section headers.
- [x] `docs/{NAME}_tasklist.md` created with Todo/In Progress/Done skeleton.
- [x] `.claude/commands/` created with starter slash commands (`/update-tasklist`, `/review-concept`, `/status`).

---

### Registration

- [x] New project lands in **Parked** group by default.
- [x] Project registered in `projects.json`.

---

### Post-Stage 07 Fixes

- [x] API hardening — no crash on malformed input.
- [x] Loading overlay during creation.
- [x] Group pruning — empty non-protected groups cleaned up.
- [x] Disk delete option on project removal.

---

*Test file for Stage 07 Go/NoGo gate. Run `/tested` after review.*
