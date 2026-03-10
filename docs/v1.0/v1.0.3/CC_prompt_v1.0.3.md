# CCC v1.0.3 — Prompt for Normal Claude Code

## Problem

The usage status bar data is CORRECT — it matches Claude Desktop exactly. The backend scanner works fine. Do NOT touch `src/usage.js` or the server broadcast.

The problem is purely visual: the bar looks frozen because there's no visible feedback between data refreshes. The developer can't tell if the bar is alive or broken.

## Design Principle: Pessimistic by Default

CCC can never show truly accurate real-time data — it only sees CLI usage, not Desktop/web/API from the shared pool. So the rule is: **always display pessimistically**. Show the developer they're closer to the limit than they might be, never further.

Concretely:
- Safety buffers (+5pp tokens, −30min timer) stay — they compensate for invisible shared-pool usage
- If the last data refresh was more than 60 seconds ago, mark the bar as **stale** — dim it, show staleness warning, signal that real usage is probably worse than displayed
- Never show confident static numbers without a "last updated" timestamp
- When in doubt, round usage UP and time remaining DOWN

## What to Fix (frontend only)

Read the full concept doc first: `docs/v1.0/v1.0.3/CCC_concept_v1.0.3.md`

### 1. Countdown Timer — Must Tick Every Second
The reset countdown must count down visibly every second. `tickResetCountdown()` and a 1-second `setInterval` exist in `app.js` — verify they're actually running. The countdown should show `Xh Ym Zs` and update live between server refreshes. Check that `usageResetTime` is being set correctly and the interval isn't being cleared/overwritten.

### 2. "Last Updated" Indicator
Add a small timestamp next to the usage info showing when the last successful refresh happened: `· updated 5s ago` or `· updated 2m ago`. Update this every second. This tells the developer the bar is alive even when the numbers haven't changed.

### 3. Pulse Animation on Data Refresh
When `updateUsageBar()` receives new data, briefly pulse the bar. The `usage-pulse` class and animation may already exist — check `styles.css`. If it exists, verify it triggers in `updateUsageBar()`. If not, add it: a brief opacity or background flash, 0.3-0.5s duration.

### 4. Staleness Detection (session-aware)
Staleness is ONLY flagged when at least one terminal session is active (`terminalInstances` has an entry with `state === 'active'`). No active session = no staleness — the bar shows last known data normally.

When a session IS active and more than 60 seconds pass without a successful refresh:
- Dim the usage bar (opacity ~0.75, NOT lower — must remain readable)
- Make the "last updated" indicator turn amber/red
- Developer interprets stale data as "real usage is probably worse"
- Remove staleness indicator immediately when fresh data arrives

### 5. Edge Cases
- When data is identical to previous refresh: still pulse, still update "last updated"
- Handle zero values, missing fields, undefined data gracefully

## Key Files to Modify

| File | What to change |
|------|---------------|
| `public/app.js` L1528-1602 | `updateUsageBar()`, `tickResetCountdown()`, add staleness tracking, add "last updated" logic |
| `public/styles.css` L1854-1949 | Verify/add `usage-pulse` animation, add staleness styles (dimmed bar, amber/red indicator) |
| `public/index.html` L46-67 | Add "last updated" element to status bar HTML if needed |

## Do NOT Touch

- `src/usage.js` — scanner works correctly, verified against Claude Desktop
- `server.js` — broadcast interval and REST endpoint are fine
- Terminal sessions, PTY, parser, status detection
- Stage-gate process, slash commands
- Documentation structure, SHP
- `projects.json`, `settings.json` format

## Verify After Changes

1. Open CCC, watch the reset countdown — it must tick every second (Xh Ym Zs)
2. The "last updated" indicator should update every second
3. When a WebSocket broadcast arrives (every 30s), the bar should briefly pulse
4. With NO terminal session open, the bar should show last known data normally — NO dimming
5. With an active terminal session, if data stops flowing for 60s, the bar should dim (but remain readable)
6. Fresh data arriving should clear staleness immediately
6. Colour thresholds (amber 80%, red 95%) must still work on both 5h and 7d sections
