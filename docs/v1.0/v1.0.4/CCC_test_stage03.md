# CCC Test — Stage 03: Session Resilience (Unresponsive/Frozen Prompt)
*Version: v1.0.4 | Generated: 2026-03-13*

---

**Pre-test:** Cmd+Shift+R in browser.

---

## WebSocket Auto-Reconnect

- [x] Start a CC session, then disconnect wifi briefly (or close laptop lid) — session reconnects automatically when connection restores
- [x] Terminal remains usable after reconnection — input and output flow normally

## Unresponsive Detection

- [x] Start a CC session, type input, wait 30s without any output → "Session may be unresponsive" red banner appears at top
- [x] Drop a file attachment (e.g. PNG) that freezes the prompt → banner appears after 30s
- [x] Banner shows "Restart Session" button and dismiss (×) button
- [x] If output arrives (e.g. Claude responds), banner clears automatically
- [x] Dismissing the banner clears the unresponsive state — banner doesn't reappear until new input/drop is sent and ignored

## Restart via Banner

- [ ] Clicking "Restart Session" in the unresponsive banner kills PTY and shows the "No active session" start prompt
- [ ] A new session can be started after restart
- [ ] Terminal is clean after restart — no leftover output from previous session

## User Is Never Stuck

- [x] When the session is unresponsive, the banner provides the only restart path — no accidental session kills via always-visible buttons
- [x] File drops do not navigate the browser away — they are blocked or handled gracefully

---

*Tick each item, add comments if needed. Run `/tested` when done.*
