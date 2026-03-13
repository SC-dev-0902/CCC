# Claude Command Center (CCC)
**Concept Document v1.0.3 — Patch Release**
*Seeded from v1.0.2*

---

## Patch Purpose

CCC v1.0.3 fixes the usage status bar so that consumption data is visibly and reliably updated. The status bar currently shows stale data — the progress bar, percentage, and reset timer do not reflect actual usage in real time. This patch addresses both the data freshness (backend) and the visual feedback (frontend).

---

## Design Principle: Pessimistic by Default

CCC cannot guarantee accurate real-time usage data. It only sees CLI activity — Desktop, web, and API usage from the shared pool are invisible. JSONL files may lag behind actual consumption. The 5h window is Anthropic's server-side concept; CCC reconstructs it from local data.

**Given this, CCC must always display usage pessimistically rather than optimistically.** If the data can't be precise, err on the side of showing the developer they're closer to the limit than they might actually be. Better to slow down too early than hit a rate limit wall unexpectedly.

This means:
- **When data is stale**: visually indicate staleness (e.g., dim the bar, show a "last updated X ago" label) so the developer knows the numbers are unreliable — and assumes the real situation is worse
- **Safety buffers stay**: the existing +5pp token buffer and −30min timer buffer remain. These compensate for invisible shared-pool usage
- **Never show confident numbers that haven't moved**: a static "42%" that hasn't changed in 10 minutes is misleading. Either refresh it or flag it as stale
- **Staleness threshold**: if the last successful data refresh was more than 60 seconds ago, mark the bar as stale. The developer should treat stale data as "probably worse than shown"

---

## Problem Statement

The usage status bar displays two consumption windows:
- **5h window**: token %, message count, reset countdown
- **7d window**: weekly token/message totals, percentage against budget

**Observed behaviour:**
The backend data is correct — CCC shows the same numbers as Claude Desktop (verified: both showed 2h15m remaining on a 5h window). The scanner, WebSocket broadcast, and REST polling all work.

**The problem is purely visual.** The status bar looks frozen because:
1. **No visible countdown** — the reset timer doesn't tick between data refreshes, so it appears stuck
2. **No refresh indicator** — when new data arrives and the numbers haven't changed (because no Claude activity happened in the last 30s), the bar looks dead
3. **No staleness signal** — there's nothing telling the developer "yes, this is still being updated" vs "this might be stale"

The developer cannot distinguish between "the data is current and unchanged" and "the bar is broken."

**Additional observation (2026-03-11):** The reset timer shows "resets in 44m 33s" but the actual reset happened within ~10 minutes in real time. This suggests the countdown calculation itself may be wrong — not just the tick interval. The displayed remaining time is roughly 4x the actual remaining time. Investigate whether the reset time is being computed from stale data or whether the 5h window start point is incorrect.

**Additional observation (2026-03-11, later):** The status bar now shows the text "Resets in resetting..." — the countdown logic is falling through to some fallback string instead of computing a proper `Xh Ym Zs` value. This confirms the countdown formatter is broken, not just drifting. Likely the `resetTime` value passed to the formatter is invalid, expired, or the formatter doesn't handle edge cases (e.g., negative remaining time, undefined input, or a reset that already happened).

**Root cause:** Primarily a frontend feedback problem, but the timer drift and broken formatter string above indicate the reset countdown logic has multiple issues: calculation drift AND string formatting failure.

---

## Scope

### In Scope (frontend only)
- Fix the reset countdown timer to tick every second — it must count down visibly between data refreshes
- Add a "last updated" indicator so the developer can see the bar is alive, even when numbers haven't changed
- Add a pulse/flash animation when new data arrives from the server
- Add a staleness flag: if no successful refresh in 60 seconds, dim the bar and show a warning
- Ensure the progress bar fill updates visibly when data changes (even small changes)

### Out of Scope
- No backend changes — `src/usage.js` scanner is working correctly (verified: matches Claude Desktop)
- No changes to `server.js` broadcast interval or REST endpoint
- No changes to the documentation model, project structure, or scaffolding
- No changes to terminal sessions, parser, or status detection
- No changes to the stage-gate process

---

## Current Architecture (for reference)

### Data Flow
```
~/.claude/projects/**/*.jsonl
        ↓
  src/usage.js  (scanUsage / scanWeeklyUsage)
        ↓
  server.js     (GET /api/usage + WebSocket broadcast every 30s)
        ↓
  app.js        (fetchUsage → updateUsageBar → DOM)
```

### Key Files
| File | Role |
|------|------|
| `src/usage.js` | Scans JSONL session files, computes token/message totals for 5h and 7d windows |
| `server.js` (L1380-1417) | REST endpoint `/api/usage` + WebSocket interval broadcast |
| `public/app.js` (L1525-1583) | `updateUsageBar()` DOM updates + `fetchUsage()` REST poll |
| `public/index.html` (L46-67) | Status bar HTML structure |
| `public/styles.css` (L1854-1949) | Status bar styling, progress fill, colour thresholds |

### Update Triggers (current)
- App init → `fetchUsage()`
- Session start → `fetchUsage()`
- Settings save → `fetchUsage()`
- REST poll fallback → every 30s
- WebSocket broadcast → every 30s from server
- Reset countdown tick → every 60s (local)

---

## Required Changes (frontend only)

### 1. Countdown Timer — Tick Every Second
The reset countdown must tick visibly every second, counting down from the `resetTime` ISO string provided by the server. Currently `tickResetCountdown()` exists and is set up with a 1-second interval, but verify it's actually running and updating the DOM on every tick. The countdown format should be `Xh Ym Zs` and update live.

### 2. "Last Updated" Indicator
Add a small timestamp showing when the last successful data refresh occurred. Something like `· updated 5s ago` or `· updated 2m ago` next to the usage info. This gives the developer confidence the bar is alive even when the numbers haven't changed.

### 3. Pulse Animation on Refresh
When `updateUsageBar()` receives new data from the server (via WebSocket or REST poll), briefly flash/pulse the bar. This is a visual heartbeat — the developer can see that the connection is live and data is flowing. Verify `usage-pulse` CSS class exists in `styles.css` and the animation triggers correctly in `updateUsageBar()`.

### 4. Staleness Detection (session-aware)
Track when the last successful data refresh happened. Staleness is **only flagged when at least one terminal session is active**. If no session is active, the bar shows the last known data normally — no dimming, no warning. Stale data without an active session is expected, not an error.

When a session IS active and more than 60 seconds pass without a successful refresh:
- Dim the usage bar (reduce opacity to ~0.75, not lower — must remain readable)
- Show a visual warning (e.g., the "last updated" indicator turns amber/red)
- The developer should interpret stale data as "real usage is probably worse than shown"

When fresh data arrives again, remove the staleness indicator immediately.

### 5. Edge Cases
- Handle `updateUsageBar()` gracefully when data is identical to the previous refresh (still pulse, still update "last updated" timestamp)
- Handle zero values, missing fields, and undefined data without breaking the display

---

## What Does NOT Change

The following CCC internals are untouched in v1.0.3:

- **Terminal sessions** — PTY, xterm.js, WebSocket, background persistence
- **Parser** (`src/parser.js`) — status detection, five-state model, degradation handling
- **Stage-gate process** — stages, Go/NoGo gates, tasklist format
- **Slash commands** — all commands, paths, and behaviour unchanged
- **Settings panel** — existing settings preserved (possible addition: refresh interval setting)
- **Status dots** — colour model, tree view, tab bar
- **Git protocol** — commit conventions, tagging, push workflow
- **Tech stack** — Node.js, Express, ws, marked.js, vanilla JS
- **Documentation model** — folder structure, naming conventions, SHP location (all per v1.0.2)
- **Persistence model** — JSON files (`projects.json`, `settings.json`)
- **Cross-platform compatibility** must be maintained
- **Elastic License 2.0** applies

---

## Migration Notes

No structural migration required. This is a bugfix patch:
- No file moves
- No path changes
- No config format changes
- Drop-in replacement of `src/usage.js`, `server.js`, `public/app.js`, and `public/styles.css`

---

*This is a patch release. For full project context, see `docs/v1.0/CCC_concept_v1.0.md`. For v1.0.2 patch context, see `docs/v1.0/v1.0.2/CCC_concept_v1.0.2.md`.*
