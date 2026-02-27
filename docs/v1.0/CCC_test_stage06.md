# CCC — Stage 06 Test Checklist
## Project Versioning

Test each item below. Tick when passed, add comments if something needs fixing.

---

### Schema & Folder Structure

- [x] `projects.json` extended with `activeVersion` field per project.
- [x] Versioned folder structure created: `docs/vX.Y/` containing concept and tasklist.
- [x] Patch versions nest inside parent minor folder: `docs/vX.Y/vX.Y.Z/`.

---

### Tree View

- [x] Expand project node to show Versions list with nested version entries.
- [x] Active version visually distinguished (bold, indicator, or highlight).
- [x] Expanding a version shows its core files (concept, tasklist).
- [x] Project-level status dot reflects active version's status.

---

### Version Lifecycle

- [x] "New Version" action on a project: scaffolds `docs/vX.Y/` with concept and tasklist templates.
- [x] New version automatically becomes active version (updates `activeVersion` in `projects.json`).
- [x] Patch version gets own concept doc seeded from parent minor version's concept.
- [x] Version completion: when final stage receives Go, prompt for Git tag.
- [x] CLAUDE.md at project root reflects active version's concept doc.
- [x] Migrate existing flat `docs/` projects to versioned structure on first use.

---

*Test file for Stage 06 Go/NoGo gate. Run `/tested` after review.*
