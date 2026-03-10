# CCC v1.0.3 — Tasklist
*Patch: Usage status bar fix*

---

## Stage 01: Fix Token Counting & Plan Limits
├── [ ] Fix `parseJsonlFile()` in `src/usage.js`: count `input_tokens + cache_creation_input_tokens + output_tokens` (exclude `cache_read_input_tokens`)
├── [ ] Apply same fix to `scanWeeklyUsage()`
├── [ ] Remove hardcoded `PLAN_LIMITS` token values — replace with configurable `tokenBudget5h` in Settings (default 1,000,000 for Max5)
├── [ ] Add `tokenBudget5h` field to Settings panel (alongside existing `weeklyTokenBudget`)
├── [ ] Remove `usagePlan` selector if no longer needed, or keep for message limits only
├── [ ] Replace epoch walker with rolling-window reset: `oldest_counted_entry + 5h - now` (minus safety buffer)
├── [ ] Label status bar as "CLI" so it's clear this is local-only usage
├── [ ] Generate pre-GoNoGo test file: `docs/v1.0/v1.0.3/CCC_test_stage01.md`
└── Go/NoGo: Does the status bar show realistic usage percentages closer to Claude Desktop?
    → GO → Stage 02
    → NOGO → Adjust formula or limits

## Stage 02: Fix Timer Display & Add Refresh Indicator
├── [ ] Change `tickResetCountdown` interval from 60000ms to 1000ms (`app.js:1550`)
├── [ ] Update `formatResetLabel(ms)` to include seconds: `4h 23m` (≥1h), `23m 15s` (<1h), `45s` (<1m)
├── [ ] Handle negative/zero ms in `tickResetCountdown` — show "resetting…" when countdown expires
├── [ ] Add CSS pulse/flash animation on usage bar when data refreshes
├── [ ] Trigger animation in `updateUsageBar()` each time new data arrives
├── [ ] Generate pre-GoNoGo test file: `docs/v1.0/v1.0.3/CCC_test_stage02.md`
└── Go/NoGo: Does the timer tick second-by-second and does the bar pulse on refresh?
    → GO → Stage 03
    → NOGO → Revise timer or animation

## Stage 03: Verification & Ship
├── [ ] Test: usage percentage is realistic (closer to Claude Desktop, accounting for CLI-only)
├── [ ] Test: progress bar fill moves when usage increases
├── [ ] Test: reset timer counts down second-by-second
├── [ ] Test: 7d weekly section refreshes with cache-inclusive counting
├── [ ] Test: colour thresholds (amber 80%, red 95%) still work
├── [ ] Test: Settings — tokenBudget5h saves and applies
├── [ ] Test: edge cases — zero values, no sessions, expired countdown
├── [ ] Bump version to 1.0.3 in `package.json`
├── [ ] Generate pre-GoNoGo test file: `docs/v1.0/v1.0.3/CCC_test_stage03.md`
└── Go/NoGo: Is v1.0.3 ready to ship?
    → GO → Tag and push
    → NOGO → Fix remaining issues
