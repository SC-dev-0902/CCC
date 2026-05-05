# Stage 02d Kickoff Prompt — Treeview Search/Filter
*CCC v1.1 | Design preview only | Static UI, no backend wiring*

---

## Context

Stage 02c delivered the top menu diodes. Stage 02d completes the treeview filter behaviour.

All work is in the Next.js design preview at:
`docs/v1.1/design/stage01a-dark-light/`

The design preview is served via Apache on Dev-Web at:
`http://172.16.10.6/CCC/design-preview/`

**No localhost. Do not reference localhost anywhere — not in test files, not in instructions.**

---

## Current state

`treeview-shell.tsx` already has a search input, query state, Escape handler, and a `filterProjects` helper. The filter correctly hides non-matching nodes and keeps parents whose children match. Three gaps remain:

1. **Auto-expand on filter** — `ProjectRow` uses local `useState` for expanded/collapsed and ignores the active filter. If a parent is collapsed and a child matches, the parent row appears but the matching child is invisible.
2. **"New" group header stays visible when all New items are filtered out** — the items are hidden inline but the group header renders regardless.
3. **Active group has no empty state** — if the filter matches nothing in Active, the group is silent. Parked already has an empty state; Active does not.

---

## What NOT to build

- No changes to `dummy-data.ts`
- No changes to `app-shell.tsx`, `theme-context.tsx`, `component-gallery.tsx`
- No backend wiring of any kind
- No new dependencies

---

## Tasks

### Task 1 — Auto-expand ProjectRow when filter is active

File: `docs/v1.1/design/stage01a-dark-light/components/treeview-shell.tsx`

Add a `forceExpand` boolean prop to `ProjectRow`. When `forceExpand` is true, the row renders as expanded regardless of its local state — matching sub-projects become visible. When `forceExpand` is false, local state controls as before.

Implementation note: use `const effectiveExpanded = forceExpand || expanded` wherever the component currently uses `expanded` to decide whether to render children. The local `expanded` state and its toggle remain unchanged — so when the filter clears, rows return to their own state.

In `TreeviewShell`, pass `forceExpand={!!query}` to every `ProjectRow` rendered from `filteredActive` and `filteredParked`.

Do not add `forceExpand` to `SubProjectRow` — sub-project expansion is independent of the parent-level filter.

### Task 2 — Fix "New" group visibility

File: `treeview-shell.tsx`

Compute `filteredNew` using the same `matches` helper and the same `useMemo([query])` pattern already used for `filteredActive` and `filteredParked`:

```tsx
const filteredNew = useMemo(
  () => (!query ? NEW_PROJECTS : NEW_PROJECTS.filter((p) => matches(p.name))),
  [query]
)
```

Replace the existing inline filter on `NEW_PROJECTS.map(...)` with a map over `filteredNew`. Guard the entire New section on `filteredNew.length > 0` so the group header hides when nothing matches.

### Task 3 — Active group empty state

File: `treeview-shell.tsx`

When `filteredActive.length === 0` (and `query` is non-empty), render a single empty-state line below the Active group header, styled identically to the existing Parked empty state:

```tsx
<div className="px-2 py-2 text-[10px] italic" style={{ paddingLeft: 24, color: t.textMuted }}>
  no match
</div>
```

Do not add a Parked empty state for the no-query case — the existing "empty" placeholder is correct and remains unchanged.

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

If `next: not found` appears, run `npm install` once in `/tmp/stage01a-build/` before building.

### Task 5 — Generate test file

Write `docs/v1.1/CCC_test_stage02d.md`.

Test URL: `http://172.16.10.6/CCC/design-preview/`

Use the v1.0 sectioned format (same as `CCC_test_stage02c.md`): `### Section`, step + expected outcome, `> Test comment:` placeholder, footer with build info.

Sections:
1. Search Input — Render
2. Real-Time Filtering (Active group — parents, sub-projects, mixed)
3. Auto-Expand on Filter Match
4. New Group — Filter Behaviour
5. Active Group — Empty State
6. Escape to Clear
7. Themes and Console

### Task 6 — Update tasklist and commit

Check off all four Stage 02d items in `docs/v1.1/CCC_tasklist_v1.1.0.md`.

Then commit and push:

```
git add .
git commit -m "v1.1.0 Stage 02d — Treeview Search/Filter"
git push
```

---

## Acceptance criteria

- Typing a sub-project name in the filter causes its parent to auto-expand and the sub-project to be visible
- Typing a query that matches no New projects hides the "New" group header entirely
- Typing a query that matches nothing in Active shows "no match" below the Active header
- Escape clears the filter and restores the treeview to its prior collapsed/expanded state
- Design preview rebuilt and accessible at `http://172.16.10.6/CCC/design-preview/`
- Test file at `docs/v1.1/CCC_test_stage02d.md` in v1.0 sectioned format
- Stage 02d tasks checked off in tasklist
- Committed and pushed to Forgejo

---

## No-touch list

- `app-shell.tsx`
- `theme-context.tsx`
- `component-gallery.tsx`
- `dummy-data.ts`
- `public/app.js`
- `public/styles.css`
- Any file not listed in Tasks 1-6 above
