# CCC — Stage 08 Test Checklist
## Import Existing Projects

Test each item below. Tick when passed, add comments if something needs fixing.

---

### Import Flow

- [x] Import UI: two-phase modal (scan directory → confirm detected files).
- [x] Hard gate: import blocked if `*_concept.md` is absent — clear explanation shown.
- [x] Auto-detect core filenames (concept, tasklist, CLAUDE.md).
- [x] Ambiguous detection: user asked to confirm mappings.
- [x] Missing CLAUDE.md: offer to generate from concept doc.
- [x] Missing tasklist: offer to generate from concept doc.

---

### Registration

- [x] Group assignment: existing groups or create new.
- [x] Register in `projects.json` — no filesystem writes to imported project directory.

---

*Test file for Stage 08 Go/NoGo gate. Run `/tested` after review.*
