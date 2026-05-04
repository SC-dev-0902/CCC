# CCC v1.1 — Stage 02b Test Checklist
## Locking Badge & "New" Group

Test URL: `http://172.16.10.6/CCC/design-preview/`

Test each item below. Tick when passed, add comments under any that need fixing. Hard-refresh the browser (Cmd+Shift+R) before starting — Apache caches assets aggressively.

---

### Lock Badge — `● DevName` Format

- [x] Open the design preview. Expand the **LeadSieve** parent in the Active group.
  - Outcome: `leadsieve-service` row shows a badge on the right reading `● Phet` — the `●` glyph (filled circle) is followed by a single space and the dev name.

> Test comment:

- [x] On the same parent, locate `leadsieve-web`.
  - Outcome: row shows `● Anna` badge — same format, accent-coloured border, accent text, monospace.

> Test comment:

- [x] Inspect the badge styling visually.
  - Outcome: badge has accent-coloured border, accent-coloured text, monospace font. Background matches `bgHover` from the theme.

> Test comment:

- [x] Hover the lock badge.
  - Outcome: no native browser tooltip pops up (tooltip is deferred to Stage 06c).

> Test comment:

---

### Start Session Button — Unlocked Rows

- [x] On `leadsieve-admin` (unlocked), check the right side of the row.
  - Outcome: a small "Start Session" button is visible. Border 1px in theme border colour, transparent background, monospace 9px text in `textSecondary`, sharp corners (no border-radius), padding `2px 6px`.

> Test comment:

- [x] Hover the "Start Session" button on `leadsieve-admin`.
  - Outcome: background switches to `bgHover` (subtle highlight). Cursor is a pointer.

> Test comment:

- [x] Expand the **Orion** parent. Locate `orion-api` and `orion-web`.
  - Outcome: both unlocked sub-projects show the "Start Session" button on the right.

> Test comment:

- [x] Click the "Start Session" button on `orion-api`.
  - Outcome: nothing happens visually (handler is a stub). The Orion row underneath does NOT toggle expand/collapse — the button click does not bubble to the row.

> Test comment:

---

### Start Session Button — Locked Rows

- [x] On `leadsieve-service` (locked by Phet), inspect the right side of the row.
  - Outcome: BOTH the `● Phet` badge AND a "Start Session" button are visible. Button is positioned to the right of the lock badge.

> Test comment:

- [x] Hover the disabled "Start Session" button on `leadsieve-service`.
  - Outcome: button shows opacity ~0.4, cursor changes to `not-allowed`. No background highlight on hover.

> Test comment:

- [x] Click the disabled "Start Session" button.
  - Outcome: no action triggers. The parent row's expand/collapse does NOT fire from the button click.

> Test comment:

- [x] Same checks on `leadsieve-web` (locked by Anna).
  - Outcome: `● Anna` badge plus disabled "Start Session" button visible side-by-side.

> Test comment:

- [x] Expand `leadsieve-service` (chevron click on the row body, not the button).
  - Outcome: row expands to show files. The italic "Read only - Start Session disabled" text is GONE (the disabled button now communicates this).

> Test comment:

---

### "New" Group Verification

- [x] Locate the "New" group in the sidebar.
  - Outcome: "NEW" header is visible ABOVE the "ACTIVE" header.

> Test comment:

- [x] Inspect the `analytics-service` entry under "New".
  - Outcome: name shown in italic, with an `unregistered` badge next to it. No stage progress bar. No expand chevron (no children).

> Test comment:

- [x] Status indicator on `analytics-service`.
  - Outcome: a status dot is present (unknown / grey is acceptable for v1.1).

> Test comment:

---

### Themes & Console

- [x] Toggle to Dark theme.
  - Outcome: lock badges, "Start Session" buttons, and "New" group entries all render with correct dark-theme tokens. No washed-out or invisible elements.

> Test comment:

- [x] Toggle to Light theme.
  - Outcome: same elements render correctly with light-theme tokens. Borders and text remain legible.

> Test comment:

- [x] Open the browser DevTools console and reload the page.
  - Outcome: no errors, no warnings related to the treeview or new components.

> Test comment:

---

*Test file for Stage 02b Go/NoGo gate. Run `/tested` after review.*
