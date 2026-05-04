# Stage 02b Kickoff Prompt — Locking Badge & "New" Group
*CCC v1.1 | Design preview only | Static UI, no backend wiring*

---

## Context

Stage 02a delivered the parent/sub-project hierarchy in the design preview. Stage 02b adds the locking badge, "Start Session" button states, and verifies the "New" group.

All work is in the Next.js design preview at:
`docs/v1.1/design/stage01a-dark-light/`

The design preview is served via Apache on Dev-Web at:
`http://172.16.10.6/CCC/design-preview/`

**No localhost. Do not reference localhost anywhere — not in test files, not in instructions.**

---

## What NOT to build

- No backend wiring of any kind
- No drag-to-register flow for the "New" group
- No tooltip on the lock badge (that is Stage 06c)
- No changes to `app-shell.tsx`, `dashboard-main.tsx`, `public/app.js`, or `public/styles.css`
- Do not touch any file not listed in the tasks below

---

## Current state

`treeview-shell.tsx` has a `SubProjectRow` component that:
- Renders a lock badge showing `sub.lockedBy` in accent colour — but **missing** the `●` prefix
- Shows italic text "Read only - Start Session disabled" when locked + expanded — **remove this**
- Has **no "Start Session" button** element at all

The "New" group already renders from `NEW_PROJECTS` in `dummy-data.ts` (one entry: `analytics-service`). Review it against the spec below — fix only what is off.

---

## Tasks

### Task 1 — Lock badge: `● DevName` format

File: `docs/v1.1/design/stage01a-dark-light/components/treeview-shell.tsx`

In `SubProjectRow`, update the existing lock badge:
- Change content from `{sub.lockedBy}` to `● {sub.lockedBy}` (literal `●` U+25CF, space, then the dev name)
- Styling unchanged: accent-coloured border, accent text, monospace font
- Position: right side of row (after version badge), before the "Start Session" button

### Task 2 — "Start Session" button

File: `treeview-shell.tsx` — `SubProjectRow`

Add a "Start Session" button to every sub-project row:

**Unlocked sub-project:**
- Small button, SC-styled: border `1px solid t.border`, background transparent, text `t.textSecondary`, font size 9px, monospace, zero border-radius, padding `2px 6px`
- Hover: background `t.bgHover`
- Has an onClick handler (stub — `() => {}` for now, wiring is Stage 06)

**Locked sub-project:**
- Same button visually, but: opacity 0.4, cursor `not-allowed`, no onClick handler
- The `● DevName` badge and the disabled button both appear on the row

**Remove** the "Read only - Start Session disabled" italic text — the disabled button communicates this.

Row layout (left to right): `[chevron] [status dot] [name] [COD/CFG badge] [version badge] ... [● DevName badge — if locked] [Start Session button]`

### Task 3 — "New" group verification

File: `treeview-shell.tsx`

Verify the "New" group matches the spec:
- Renders above "Active"
- Shows `analytics-service` with an "unregistered" badge
- No status dot (or unknown dot is acceptable)
- No stage progress bar
- No expand chevron (no sub-projects)

If the current render matches: no code change. Fix only what is off.

### Task 4 — Rebuild and redeploy design preview

Run the following on Dev-Web (`kkh01vdweb01.mng.mcsfam.local`):

```bash
# Step 1 — rsync source to local build dir (fast ext4)
rsync -av --exclude=node_modules --exclude=.next --exclude=out \
  /mnt/sc-development/CCC/docs/v1.1/design/stage01a-dark-light/ \
  /tmp/stage01a-build/

# Step 2 — build
cd /tmp/stage01a-build && npm run build

# Step 3 — deploy output back to preview folder
rsync -av --delete /tmp/stage01a-build/out/ \
  /mnt/sc-development/CCC/docs/v1.1/design/preview/
```

Apache serves the result at `http://172.16.10.6/CCC/design-preview/` — no reload needed.

### Task 5 — Generate test file

Write `docs/v1.1/CCC_test_stage02b.md`.

Test URL: `http://172.16.10.6/CCC/design-preview/`

Include checklist items for:
- `● Phet` lock badge visible on leadsieve-service row
- `● Anna` lock badge visible on leadsieve-web row
- "Start Session" button visible on unlocked sub-project rows (e.g. leadsieve-admin, orion-api, orion-web)
- "Start Session" button on locked rows appears disabled (reduced opacity, cursor-not-allowed)
- Locked rows show both the `● DevName` badge and the disabled "Start Session" button
- "New" group renders above "Active"
- `analytics-service` entry shows "unregistered" badge, no progress bar, no expand chevron
- Dark theme renders correctly
- Light theme renders correctly
- No console errors on load

---

## Acceptance criteria

- `● DevName` badge appears on all locked sub-projects
- "Start Session" button present on all sub-project rows; disabled state visually clear on locked rows
- "New" group present above "Active" with one unregistered entry
- Design preview rebuilt and accessible at `http://172.16.10.6/CCC/design-preview/`
- Test file at `docs/v1.1/CCC_test_stage02b.md`
- No localhost references anywhere

---

## No-touch list

- `app-shell.tsx`
- `dashboard-main.tsx`
- `component-gallery.tsx`
- `public/app.js`
- `public/styles.css`
- Any file not listed in Tasks 1-5 above
