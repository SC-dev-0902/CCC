# CCC — Stage 04 Test Checklist
## Status Detection (Parser Module)

Test each item below. Tick when passed, add comments if something needs fixing.

---

### Parser Module

- [x] `src/parser.js` exists — isolated, single responsibility.
- [x] Five state patterns defined: WAITING_FOR_INPUT, RUNNING, COMPLETED, ERROR, UNKNOWN.
- [x] Current Claude Code output patterns researched and documented in parser comments.
- [x] Parser receives PTY output stream and emits state change events.

---

### Live Status Updates

- [x] State changes propagate via WebSocket to frontend.
- [x] Tree view status dots update live when Claude Code state changes.
- [x] Tab colours update live to match current state.

---

### Degradation

- [x] Parser confidence monitoring: flags degraded state after 60s of unrecognised output.
- [x] Degraded state: all dots fall back to grey.
- [x] Degraded state: warning banner appears with link to GitHub issues.
- [x] Optional: auto-file GitHub issue on degradation (requires GitHub token in Settings).

---

### Isolation

- [x] Parser is fully unit-testable in isolation — no dependencies on server or frontend.

---

*Test file for Stage 04 Go/NoGo gate. Run `/tested` after review.*
