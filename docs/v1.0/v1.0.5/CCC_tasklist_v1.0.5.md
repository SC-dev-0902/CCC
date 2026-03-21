# CCC_tasklist_v1.0.5.md — v1.0.5
*Derived from: CCC_concept_v1.0.5.md*
*Stage gate process: each stage ends with Go/NoGo before next stage begins*

---

## Stage 01 — Usage Clarity & UI Polish
**Focus:** Fix misleading usage bar label, add version dot tooltip, fix test file panel width

### Tasks
- [x] Investigate current usage bar label rendering in `public/index.html` and `public/app.js` — understand how "5h CLI" is displayed and where the percentage text is composed
- [x] Replace "5h CLI" label with "Rate limit (CLI only)" — tooltip carries the full explanation
- [x] Add tooltip/info explaining shared Anthropic rate limit — on hover: "Usage measured from CLI sessions only. Claude Desktop and Claude Chat consume the same shared limit and are not visible to CCC. Actual remaining headroom may be lower than shown."
- [x] Verify safety buffers (+5pp, -30min) are untouched — display change only
- [x] Investigate version dot rendering in treeview (`public/app.js`) — identify where dots are created
- [x] Add hover tooltip to version dots explaining all five states: green (completed), yellow (running), red (waiting for input), orange (error/needs attention), grey (no session/unknown)
- [x] Investigate test file reading panel width issue — identify the CSS/layout constraint causing half-width rendering
- [x] Fix reading panel to render test file content at full available width — same fix applied to read-panel-content (both had max-width: 800px)
- [ ] Restart CCC web server (`npm start`) before testing — changes require server restart to take effect
- [x] Generate pre-GoNoGo test file: `docs/v1.0/v1.0.5/CCC_test_stage01.md`

### Go/NoGo Gate
> Do all three fixes work correctly — usage bar label is clear and accurate, version dots show tooltips on hover, and test file content fills the full reading panel width?

**→ GO:** v1.0.5 complete — tag and push
**→ NOGO:** Fix issues, re-test

---
