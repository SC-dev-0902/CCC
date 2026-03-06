# CCC Test — v1.0.1 Stage 07
## Improvement #7: Usage Status Bar

**Instructions:** Test each scenario below. Mark pass/fail and add comments if needed.

---

### Status Bar Layout

- [x] Open CCC in browser (hard refresh, no active sessions)
- [x] Verify usage bar is visible at bottom of main panel (same height as Settings footer)
- [x] Verify bar shows empty structure: "5h" label, empty progress bar, dashes for values, divider, "7d" label, empty progress bar, dashes for values
- [x] Verify no actual usage data is populated yet

---

### Data Population

- [x] Start a Claude Code session for any project
- [x] Verify usage data populates within a few seconds (percentage, progress bar fill, reset timer, message count)
- [x] Verify 5h section shows: filled progress bar, X%, "resets in Xh Xm", X/X msgs
- [x] Verify 7d section shows: filled progress bar, X%, "XK / XK tokens . X msgs"
- [x] Verify data updates automatically (wait ~30 seconds for WS broadcast)

---

### Colour Thresholds

- [x] Verify 5h progress bar is blue/accent when usage is below 80%
- [x] If usage is above 80%, verify bar turns amber
- [x] If usage is above 95%, verify bar turns red

---

### Settings Integration

- [x] Open Settings panel
- [x] Verify "Claude Code Plan" dropdown exists (Pro / Max 5 / Max 20)
- [x] Verify "Weekly Token Budget" field exists (default: 500,000)
- [x] Verify "Weekly Message Budget" field exists (default: 5,000)
- [x] Change a value, click Save — verify Save button is visible and works
- [x] Verify settings panel scrolls to show Save button

---

### Bar Persistence

- [x] With usage data visible, switch between project tabs
- [x] Verify the usage bar remains visible and data unchanged
- [x] Open Settings tab — verify usage bar still visible
- [x] Close all sessions — verify bar remains visible with last known values

---

### Version Number

- [x] Check sidebar footer — verify version shows v1.0.1

---

**Overall Stage 07 Result:**
**Tested by:**
**Date:**
