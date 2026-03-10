# CCC v1.0.3 — Stage 01+02 Test

Restart CCC server, then Cmd+Shift+R in browser.

---

## Token Counting & Percentages

- [x] 5h CLI percentage is in the same ballpark as Claude Desktop (or slightly higher — pessimistic)
- [x] 5h CLI percentage is never lower than Claude Desktop
- [x] 7d weekly percentage is in the same ballpark as Claude Desktop (~25%)
- [x] Progress bar fill matches the displayed percentage on both 5h and 7d
- [x] Messages count (e.g. 150/1000 msgs) displays and updates

## Reset Timer

- [x] Reset countdown shows `Xh Ym Zs` format (seconds visible)
- [x] Countdown ticks every second (watch it for 5+ seconds)
- [x] Reset time is equal to or less than Claude Desktop's reset time (pessimistic)
- [x] When countdown reaches 0, shows "resetting…"

## Refresh Indicator

- [x] "updated Xs ago" appears at the end of the status bar
- [x] Counter increments every second (0s → 1s → 2s → ... → 29s)
- [x] Resets to "updated 0s ago" when new data arrives (~every 30s)
- [x] After 60s, switches to "updated 1m ago" format

## Pulse Animation

- [x] Bar briefly flashes/pulses when data refreshes (~every 30s)
- [x] Pulse is subtle — noticeable but not distracting

## Staleness Detection

- [x] With NO active session: bar shows data normally, no dimming, no amber
- [x] With active session: if data stops for >60s, bar dims and "updated" turns amber
- [x] Staleness clears immediately when fresh data arrives

## Colour Thresholds

- [ ] At 80%+ usage: bar and percentage turn amber
  > Will see once 80% reached
- [ ] At 95%+ usage: bar and percentage turn red
  > dito
- [ ] Weekly bar: same amber/red thresholds work
  > dito

## Settings

- [x] Settings panel shows "5h Token Budget" field (default 1,000,000)
- [x] Settings panel shows "Weekly Token Budget" field (default 20,000,000)
- [x] Plan selector still present (for message limits)
- [x] Changing and saving token budget updates the percentage on next refresh

## Status Bar Label

- [x] Left label reads "5h CLI" (not just "5h")
