# CCC v1.1 - Stage 02d Test Checklist
## Treeview Search/Filter

Test URL: `http://172.16.10.6/CCC/design-preview/`

Test each item below. Tick when passed, add comments under any that need fixing. Hard-refresh the browser (Cmd+Shift+R) before starting - Apache caches assets aggressively.

---

### Search Input - Render

- [x] Open the design preview. Locate the sidebar header.
  - Outcome: directly below the "CLAUDE COMMAND CENTER" title bar there is a single search field with a magnifier icon (`Search` from lucide), placeholder text `Filter projects...`. Field background uses `bgInput` token, separator border below uses `border` token.

> Test comment:

- [x] Click into the search input.
  - Outcome: cursor focuses inside the field. No visible focus ring is required, but typing must register immediately.

> Test comment:

---

### Real-Time Filtering (Active group)

- [x] Type `lead` in the filter (lowercase).
  - Outcome: the Active group shows only **LeadSieve** with its three sub-projects (`leadsieve-service`, `leadsieve-admin`, `leadsieve-web`) all visible. CCC, Orion, and Nexus are hidden. Filter is case-insensitive.

> Test comment:

- [x] Clear the input, then type `LEAD` in upper case.
  - Outcome: identical result to the previous test - LeadSieve and its three sub-projects visible, others hidden. Case does not affect matches.

> Test comment:

- [x] Clear the input, then type `nexus-admin`.
  - Outcome: only **Nexus** parent renders, with **only** the `nexus-admin` sub-project visible underneath. `nexus-core` and `nexus-mobile` are filtered out. Other parents (LeadSieve, CCC, Orion) are hidden.

> Test comment:

- [x] Clear the input, then type `web`.
  - Outcome: two parents are visible at once - **LeadSieve** (showing only `leadsieve-web`) and **Orion** (showing only `orion-web`). Other parents and other sub-projects are hidden. This proves multi-parent filtering and per-parent sub-filtering work together.

> Test comment:

- [x] Clear the input, then type `ccc`.
  - Outcome: only **CCC** is visible in Active. CCC has no sub-projects, so its progress bar (`Stage 14 / 17`) renders directly on its row.

> Test comment:

---

### Auto-Expand on Filter Match

This block verifies that a parent whose child matches the filter auto-expands so the matching child is visible (even if the parent was collapsed before filtering).

- [x] Clear the search. Confirm **Nexus** is collapsed by default (no chevron-down, no sub-projects visible).
  - Outcome: Nexus row shows a right-pointing chevron and only the parent name + status dot. No sub-projects rendered.

> Test comment:

- [x] Type `nexus-core` in the filter.
  - Outcome: **Nexus** auto-expands. Chevron rotates to down. The single matching sub-project `nexus-core` (`Stage 6 / 6` full bar) is visible. Filter does not require the user to click to expand.

> Test comment:

- [x] Clear the search.
  - Outcome: Nexus returns to **collapsed** state - the auto-expand was driven by the filter only and did not modify the row's local expanded state.

> Test comment:

- [x] Type `orion-api`.
  - Outcome: **Orion** is visible and expanded showing only `orion-api`. (Orion was already expanded by default, so this confirms the force-expand is harmless when the row was already open.)

> Test comment:

- [x] Clear the search and confirm **LeadSieve** stays expanded (it expands by default).
  - Outcome: LeadSieve still shows its three sub-projects after the filter is cleared - default expansion preserved.

> Test comment:

---

### New Group - Filter Behaviour

- [x] Clear the search. Confirm the **NEW** group header is visible at the top of the tree, with `analytics-service` listed under it (italic, `unregistered` badge).
  - Outcome: `NEW` header renders above the Active group, single entry visible.

> Test comment:

- [x] Type `analytics`.
  - Outcome: `NEW` group still visible with `analytics-service` matching. Active group shows "no match" empty state (covered in next section).

> Test comment:

- [x] Clear and type `nexus`.
  - Outcome: the **NEW** group header **disappears entirely** along with `analytics-service`. The first visible group header in the tree is `ACTIVE`. This is the key behaviour: when nothing in NEW matches the filter, the whole group hides (header included).

> Test comment:

- [x] Clear the search.
  - Outcome: `NEW` header and `analytics-service` re-appear at the top of the tree.

> Test comment:

---

### Active Group - Empty State

- [x] Type a string that matches no project in any group, e.g. `zzzzzz`.
  - Outcome: under the **ACTIVE** header, a single line reads `no match` in italic, muted colour, indented to the same depth as the project rows (paddingLeft 24, fontSize 10px). No project rows render in Active. The `NEW` header is hidden (no match in NEW either). The `PARKED` group still renders its header followed by its existing `empty` placeholder (or `no match` if Vertex is not matched - see next item).

> Test comment:

- [x] With `zzzzzz` still in the field, inspect the **PARKED** group.
  - Outcome: `PARKED` header is visible. Below it, since `Vertex` and `vertex-service` do not match `zzzzzz`, the existing `empty` placeholder is shown. (Parked uses the `empty` placeholder, Active uses `no match` - this is intentional: Parked's placeholder pre-existed and was not touched in this stage.)

> Test comment:

- [x] Clear the input.
  - Outcome: Active group repopulates with all four projects. `no match` line is gone.

> Test comment:

---

### Escape to Clear

- [x] Type `lead` to filter Active down to LeadSieve.
  - Outcome: filtered tree visible.

> Test comment:

- [x] With the cursor still in the input, press **Escape**.
  - Outcome: the input clears immediately. The treeview restores to its full state - all groups, all projects, all default expand states (LeadSieve and Orion expanded; Nexus, CCC, Vertex collapsed).

> Test comment:

- [x] Type `nexus-core` (auto-expands Nexus). Press **Escape**.
  - Outcome: input clears AND Nexus returns to its collapsed state. Auto-expand was driven by the live filter only - clearing the filter restores the row's own expanded state.

> Test comment:

---

### Themes and Console

- [x] Toggle to Dark theme. Repeat the `lead`, `web`, and `zzzzzz` queries.
  - Outcome: filtered output renders correctly in dark theme. The `no match` line and the `empty` line both use `textMuted` colour and remain readable on the dark sidebar background.

> Test comment:

- [x] Toggle to Light theme. Repeat the same three queries.
  - Outcome: same behaviour, legible in light theme.

> Test comment:

- [x] Open the browser DevTools console and reload the page. Type a filter, clear it, press Escape.
  - Outcome: no console errors, no React warnings related to the filter, the `forceExpand` prop, or the New/Active group rendering.

> Test comment:

---

*Test file for Stage 02d Go/NoGo gate. Build 45. Run `/tested` after review.*
