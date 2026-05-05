# Stage 02c Kickoff Prompt — Top Menu Diodes
*CCC v1.1 | Design preview only | Static UI, no backend wiring*

---

## Context

Stage 02b delivered the locking badge and "Start Session" button. Stage 02c adds the three status diodes in the top menu and removes the usage bar.

All work is in the Next.js design preview at:
`docs/v1.1/design/stage01a-dark-light/`

The design preview is served via Apache on Dev-Web at:
`http://172.16.10.6/CCC/design-preview/`

**No localhost. Do not reference localhost anywhere — not in test files, not in instructions.**

---

## What NOT to build

- No backend wiring of any kind
- No real polling or timer logic — diode states are hardcoded
- No changes to `treeview-shell.tsx` or any file not listed in the tasks below

---

## Current state

`app-shell.tsx` has a `Diode` component and renders `INTEGRATIONS` from `dummy-data.ts` in the `AppHeader`. All three services (PatchPilot, Forgejo, GitHub) are currently hardcoded as `"connected"` — the red/disconnected state has never been visible in the preview.

The usage bar is not present in the current `AppHeader` — verify and confirm.

---

## Tasks

### Task 1 — Verify diode spec compliance

File: `docs/v1.1/design/stage01a-dark-light/components/app-shell.tsx`

The `Diode` component must:
- Render a filled circular dot: green when connected (`t.statusCompleted`), red when disconnected (`t.statusWaiting`)
- Show a hover tooltip containing: service name, connected/disconnected status, last checked placeholder timestamp, service URL
- Tooltip styled consistently with the SC design system (border, bg, font)

If the current implementation matches: no change needed. Fix only what deviates.

### Task 2 — Demo disconnected state

File: `docs/v1.1/design/stage01a-dark-light/lib/dummy-data.ts`

Change `PatchPilot` status to `"disconnected"`. Forgejo and GitHub remain `"connected"`. This makes the red diode state visible and testable in the preview. No other changes to this file.

### Task 3 — Confirm usage bar absent

File: `app-shell.tsx` — `AppHeader` component

Confirm no usage bar, token counter, or usage-related import exists. If found, remove it. If absent, nothing to do.

### Task 4 — Rebuild and redeploy design preview

Run the following on Dev-Web (`kkh01vdweb01.mng.mcsfam.local`):

```bash
rsync -av --exclude=node_modules --exclude=.next --exclude=out \
  /mnt/sc-development/CCC/docs/v1.1/design/stage01a-dark-light/ \
  /tmp/stage01a-build/

cd /tmp/stage01a-build && npm run build

rsync -av --delete /tmp/stage01a-build/out/ \
  /mnt/sc-development/CCC/docs/v1.1/design/preview/
```

Apache serves the result at `http://172.16.10.6/CCC/design-preview/` — no reload needed.

### Task 5 — Generate test file

Write `docs/v1.1/CCC_test_stage02c.md`.

Test URL: `http://172.16.10.6/CCC/design-preview/`

Use the v1.0 sectioned format (same as `CCC_test_stage02b.md`): `### Section`, step + expected outcome, `> Test comment:` placeholder, footer with build info.

Sections:
1. Diodes — Connected State (Forgejo + GitHub)
2. Diodes — Disconnected State (PatchPilot)
3. Hover Tooltips (all three diodes, both states)
4. No Usage Bar
5. Themes and Console

### Task 6 — Update tasklist

Check off all three Stage 02c items in `docs/v1.1/CCC_tasklist_v1.1.0.md`.

### Task 7 — Commit and push

```
git add .
git commit -m "v1.1.0 Stage 02c — Top Menu Diodes"
git push
```

---

## Acceptance criteria

- Three diodes render in top menu: PatchPilot (red), Forgejo (green), GitHub (green)
- Hover tooltip on each diode shows service name, status, last checked timestamp, URL
- No usage bar present in the top menu
- Design preview rebuilt and accessible at `http://172.16.10.6/CCC/design-preview/`
- Test file at `docs/v1.1/CCC_test_stage02c.md` in v1.0 sectioned format
- Stage 02c tasks checked off in tasklist
- Committed and pushed to Forgejo

---

## No-touch list

- `treeview-shell.tsx`
- `theme-context.tsx`
- `component-gallery.tsx`
- `public/app.js`
- `public/styles.css`
- Any file not listed in Tasks 1-7 above
