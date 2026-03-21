# CCC Concept — v1.0.5
*Usage Clarity & UI Polish*
*Version: 1.0.5 | Date: 2026-03-20*

---

## Overview

v1.0.5 is a focused patch. Two items only — no scope creep.

1. Fix the misleading usage bar display
2. Add tooltip to the version dot in the treeview

---

## 1) Usage Bar — Fix Misleading Display

### Problem

The current status bar shows "5h CLI" with a percentage. Both the label and the number are misleading:

- **"5h"** implies the user has a personal 5-hour session. Wrong — it is Anthropic's shared rate limit window, shared across Claude Code, Claude Desktop, and Claude Chat. The window can run out in well under 5 hours depending on usage across all clients.
- **"CLI"** is correct but not enough — users don't understand why the number shown doesn't match what they see in Claude Desktop.
- **The percentage itself** includes safety buffers (+5pp, -30min) that compensate for invisible Desktop/Chat consumption — but the user sees a number that still feels wrong because it can't account for what CCC cannot see.

### What to fix

- **Label:** Remove "5h CLI". Replace with something that communicates: this is Anthropic's rate limit window, CLI usage only, actual headroom is lower than shown.
  - Suggested: `Rate limit: X% (CLI only)`
  - The tooltip or a small info icon can carry the fuller explanation
- **Tooltip / info icon:** On hover over the usage bar or its label, show: "Usage measured from CLI sessions only. Claude Desktop and Claude Chat consume the same shared limit and are not visible to CCC. Actual remaining headroom may be lower than shown."
- **Do not remove the safety buffers** (+5pp, -30min) — they stay. Only the display label and user-facing explanation change.

### Rules

- The bar itself, its color thresholds (amber at 80%, red at 95%), and the countdown timer are not changed in this version.
- The fix is display and labeling only — no changes to `src/usage.js` logic unless a clear bug is found during investigation.
- If during investigation a clear bug is found in the usage calculation, fix it and document what was wrong in the SHP.

---

## 2) Version Dot — Tooltip on Hover

### Problem

The colored dot in front of the version number in the treeview has no explanation. Users see green, amber, red, or grey but have no way to know what each color means without reading the manual.

### What to fix

- On hover over the version dot, show a tooltip that explains the color.
- The tooltip must describe all four states clearly:
  - **Green** — session completed successfully
  - **Amber** — session running or waiting
  - **Red** — session waiting for user input / error
  - **Grey** — no active session / unknown state
- Implementation: CSS `title` attribute is acceptable for simplicity. A custom styled tooltip is also acceptable if it fits the existing CCC design language better. CC chooses — consistency with the rest of the UI is the only requirement.

### Rules

- The dot color logic itself is not changed — tooltip only.
- No new dependencies.

---

## 3) Test File Reading Panel — Full Width

### Problem

When a test file is opened in the reading panel, the content only renders at half the panel width. The right half of the panel is empty. This is a display/layout bug — the content should use the full available width of the reading panel.

### What to fix

- Test file content must render at 100% of the reading panel width, same as any other file opened in the panel.
- Investigate whether the issue is specific to test files or affects other file types too. If it affects other types, fix all of them.

### Rules

- Layout fix only — no changes to how test files are parsed or displayed content-wise.
- No new dependencies.

---

## Out of Scope

Everything else. This is a three-item patch.

---

*End of concept document.*
