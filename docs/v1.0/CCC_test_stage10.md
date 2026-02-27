# CCC — Stage 10 Test Checklist
## Project Memory (SHP Storage)

Test each item below. Tick when passed, add comments if something needs fixing.

---

### SHP Storage

- [x] Single-file SHP: `docs/{ProjectName}_shp.md` created and overwritten each `/eod`.
- [x] SHP file format: standard Markdown, human-readable, Git-friendly.
- [x] SHP contains: work done, decisions made, open items, next actions, current stage status.

---

### Slash Commands

- [x] `/start-project`: reads CLAUDE.md, concept doc, tasklist, asks comprehension questions.
- [x] `/eod`: Claude Code generates SHP, overwrites `docs/{ProjectName}_shp.md`.
- [x] `/continue`: reads current SHP, feeds to Claude Code session.
- [x] Global slash commands installed in `~/.claude/commands/` (not per-project).
- [x] `/continue` handles no existing SHP gracefully (falls back to `/start-project` behaviour).

---

### Implementation

- [x] SHP storage is single-file (not dated files in `docs/shp/`). Git history serves as archive.

---

*Test file for Stage 10 Go/NoGo gate. Run `/tested` after review.*
