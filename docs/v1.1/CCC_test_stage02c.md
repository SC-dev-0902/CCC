# CCC v1.1 - Stage 02c Test Checklist
## Top Menu Diodes (+ progress-bar relocation fix)

Test URL: `http://172.16.10.6/CCC/design-preview/`

Test each item below. Tick when passed, add comments under any that need fixing. Hard-refresh the browser (Cmd+Shift+R) before starting - Apache caches assets aggressively.

---

### Diodes - Connected State (Forgejo + GitHub)

- [x] Open the design preview. Locate the top menu (header bar at the top of the page).
  - Outcome: three diode entries are visible on the right side of the header, before the theme toggle. From left to right: PatchPilot, Forgejo, GitHub.

> Test comment:

- [x] Inspect the **Forgejo** diode dot.
  - Outcome: filled circular dot, ~9px diameter, green colour (`statusCompleted`). Service name "Forgejo" rendered next to it in `textPrimary`.

> Test comment:

- [x] Inspect the **GitHub** diode dot.
  - Outcome: filled circular dot, ~9px diameter, green colour. Service name "GitHub" rendered next to it.

> Test comment:

---

### Diodes - Disconnected State (PatchPilot)

- [x] Inspect the **PatchPilot** diode dot.
  - Outcome: filled circular dot, ~9px diameter, **red** colour (`statusWaiting`). Service name "PatchPilot" rendered next to it.

> Test comment:

- [x] Confirm the dot shape is identical to the green dots (only colour differs).
  - Outcome: same size, same circular `border-radius: 50%`, same alignment - only the fill colour is different.

> Test comment:

---

### Hover Tooltips (all three diodes, both states)

- [x] Hover the **PatchPilot** diode.
  - Outcome: tooltip appears below-right of the diode within ~150ms. Contents (top to bottom): `PatchPilot - Disconnected` (medium weight), `Last checked 14s ago` (muted), `http://patchpilot.mcsfam.local` (monospace, muted, font-size 10px). Tooltip has a 1px border in `border` token, background in `bgCard`, min-width 220px.

> Test comment:

- [x] Hover the **Forgejo** diode.
  - Outcome: tooltip shows `Forgejo - Connected`, `Last checked 14s ago`, `http://mcs-forgejo.mcsfam.net`. Same styling as PatchPilot tooltip.

> Test comment:

- [x] Hover the **GitHub** diode.
  - Outcome: tooltip shows `GitHub - Connected`, `Last checked 14s ago`, `https://github.com/SC-dev-0902`. Same styling.

> Test comment:

- [x] Move the cursor away from each diode.
  - Outcome: tooltip disappears cleanly (no flicker, no orphaned tooltip remaining).

> Test comment:

---

### No Usage Bar

- [x] Inspect the top menu bar.
  - Outcome: contents from left to right are: hexagon icon + "Claude Command Center" title (left) - then on the right: PatchPilot diode, Forgejo diode, GitHub diode, theme toggle button. **No usage bar, no token counter, no usage-related element of any kind.**

> Test comment:

---

### Progress-Bar Relocation (Stage 02a fix)

This block verifies that the stage progress bar no longer renders on container parent rows (e.g. LeadSieve), and instead renders on each sub-project row.

- [x] Locate the **LeadSieve** parent row in the Active group (do not expand it yet).
  - Outcome: the LeadSieve row shows the parent name, status dot, and `COD` badge. **No progress bar** is rendered on the LeadSieve row itself.

> Test comment:

- [x] Expand the **LeadSieve** parent.
  - Outcome: three sub-project rows render. Each sub-project row shows its own progress bar directly under the row content:
    - `leadsieve-service` -> `Stage 3 / 16`
    - `leadsieve-admin`   -> `Stage 5 / 12`
    - `leadsieve-web`     -> `Stage 2 / 10`
  - Each progress bar uses the accent colour for the filled portion and the muted text for the `Stage X / Y` label.

> Test comment:

- [x] Expand the **Orion** parent.
  - Outcome: no progress bar on the Orion row itself. Sub-projects show:
    - `orion-api` -> `Stage 2 / 8`
    - `orion-web` -> `Stage 1 / 6`

> Test comment:

- [x] Locate the **Nexus** parent row and expand it.
  - Outcome: no progress bar on the Nexus row itself. Sub-projects show:
    - `nexus-core`   -> `Stage 6 / 6` (full bar)
    - `nexus-admin`  -> `Stage 0 / 8` (empty bar)
    - `nexus-mobile` -> `Stage 0 / 8` (empty bar)

> Test comment:

- [x] Locate the **CCC** project row in the Active group.
  - Outcome: CCC has no sub-projects (it is a single project, not a container), so the progress bar **remains on the CCC row itself** -> `Stage 14 / 17`.

> Test comment:

- [x] Expand the **Vertex** parent in the Parked group.
  - Outcome: no progress bar on the Vertex row itself. `vertex-service` sub-project shows `Stage 0 / 5`.

> Test comment:

---

### Themes and Console

- [x] Toggle to Dark theme.
  - Outcome: all three diodes render correctly in dark theme. Tooltip background uses dark `bgCard`, border visible. Progress bars on sub-project rows still legible (accent fill, muted label).

> Test comment:

- [x] Toggle to Light theme.
  - Outcome: all three diodes render correctly in light theme. Tooltip background uses light `bgCard`, border visible. Progress bars on sub-project rows still legible.

> Test comment:

- [x] Open the browser DevTools console and reload the page.
  - Outcome: no errors, no warnings related to the diodes, the tooltip, or the relocated progress bars.

> Test comment:

---

*Test file for Stage 02c Go/NoGo gate. Run `/tested` after review.*
