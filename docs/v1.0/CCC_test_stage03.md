# CCC — Stage 03 Test Checklist
## Terminal Sessions (PTY + xterm.js)

Test each item below. Tick when passed, add comments if something needs fixing.

---

### PTY & WebSocket

- [x] `node-pty` integrated on the server — PTY processes spawn correctly.
- [x] WebSocket server (`ws`) — one connection per terminal session.
- [x] `xterm.js` renders in the frontend inside the main panel.
- [x] PTY session spawns in correct project directory on demand.
- [x] Full bidirectional input/output between xterm.js and PTY.

---

### Terminal Behaviour

- [x] Terminal resize handling — cols/rows sync on window resize.
- [x] Sessions persist in background when switching tabs.
- [x] "Start Claude Code" / "Open Shell" prompt appears for new sessions.
- [x] Session state tracked per project (active / exited).
- [x] Keyboard shortcuts work: Ctrl+C, Ctrl+D, arrow keys, tab completion, history.
- [x] Colours and formatting: 256-colour / truecolor renders via xterm.js.
- [x] Scroll back through session history works.

---

*Test file for Stage 03 Go/NoGo gate. Run `/tested` after review.*
