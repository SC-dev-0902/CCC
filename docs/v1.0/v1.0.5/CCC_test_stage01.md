# CCC v1.0.5 — Stage 01 Test File
*Usage Clarity & UI Polish*

---

## 1. Usage Bar Label

- [x] Look at the status bar at the bottom of CCC — the left section should say **"Rate limit (CLI only)"** instead of "5h CLI"
- [x] Hover over the "Rate limit (CLI only)" text — a tooltip should appear explaining that usage is CLI-only and that Claude Desktop and Claude Chat share the same limit invisibly
- [x] The percentage number, progress bar, countdown timer, and message count should all still display as before — nothing else in the status bar has changed
- [x] If usage is active, verify the color thresholds still work (amber at high usage, red at very high usage) — no change expected

## 2. Version Dot Tooltip

- [x] In the treeview, find a project with an active version — hover over the colored dot next to the version number
- [x] A tooltip should appear describing what the dot color means (e.g. "Session completed — ready for next instruction" for a green dot)
- [x] If a session is running, hover the dot again — the tooltip should update to match the current state (e.g. "Session running — Claude is working" for yellow)
- [x] Hover over a dot on a patch version row — same tooltip behaviour applies
- [x] Non-active version dots (no color) should show no tooltip text

## 3. Test File Reading Panel — Full Width

- [x] Open any test file from the treeview (e.g. this file) — the content should fill the full width of the reading panel, not just the left half
- [x] Open a regular markdown file (e.g. a concept doc or tasklist) — it should also use the full panel width
- [x] Scroll down in a long file — content stays full width throughout

## Cross-Cutting

- [x] No console errors in the browser developer tools (Cmd+Option+I → Console tab)
- [x] Dark and light themes both render correctly — no layout shifts between themes
- [x] All other CCC features (terminal sessions, settings, project tree) work as before

---
