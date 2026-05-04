# Stage 02a Kickoff Prompt - Treeview: Parent/Sub-Project Hierarchy

## Rules
- No free-styling. Implement the approved Stage 01 design exactly as shown in the screenshots.
- Touch only `docs/v1.1/design/stage01a-dark-light/lib/dummy-data.ts` and `docs/v1.1/design/stage01a-dark-light/components/treeview-shell.tsx`.
- No edits to `public/app.js`, `public/styles.css`, or any backend file. The v1.1 framework is the Next.js design preview - that is what gets developed in Stage 02+.
- No em dash anywhere.
- Do not mark Go/NoGo gate lines in the tasklist. Check off task checkboxes only.
- After source changes, rebuild on Dev-Web `/tmp` and rsync the static export into `docs/v1.1/design/preview/`. Apache serves the result at `http://172.16.10.6/CCC/design-preview/`. That URL is the test target.

## Design Reference
Screenshots are in `docs/v1.1/design/`:
- `stage01-Treeview.png` - primary reference for the treeview hierarchy
- `stage01-dark-light.png` - dark and light theme reference

Study these before writing a single line.

---

## What to Build

The Next.js design preview already contains `ProjectRow`, `SubProjectRow`, `ProgressBar` and the `Badge` component (`components/treeview-shell.tsx`). The structural rendering is in place.

You are extending the dummy data to include three new test fixture parents - Orion, Nexus, Vertex - and adding a per-sub-project version badge.

---

## Task 1 - Add version field and parent fixtures

In `lib/dummy-data.ts`:

1. Add `version?: string` to the `SubProject` interface.

2. Append to `ACTIVE_PROJECTS` (after the existing LeadSieve and CCC entries):

```
{
  id: "orion",
  name: "Orion",
  type: "code",
  status: "running",
  stageProgress: { current: 2, total: 8 },
  subProjects: [
    { id: "orion-api", name: "orion-api", type: "code", status: "running", version: "v1.0" },
    { id: "orion-web", name: "orion-web", type: "code", status: "unknown", version: "v1.0" },
  ],
},
{
  id: "nexus",
  name: "Nexus",
  type: "code",
  status: "completed",
  stageProgress: { current: 1, total: 6 },
  subProjects: [
    { id: "nexus-core",   name: "nexus-core",   type: "code", status: "completed", version: "v1.0" },
    { id: "nexus-admin",  name: "nexus-admin",  type: "code", status: "unknown",   version: "v1.0" },
    { id: "nexus-mobile", name: "nexus-mobile", type: "code", status: "unknown",   version: "v1.0" },
  ],
},
```

3. Replace `PARKED_PROJECTS` with:

```
export const PARKED_PROJECTS: Project[] = [
  {
    id: "vertex",
    name: "Vertex",
    type: "code",
    status: "unknown",
    stageProgress: { current: 0, total: 5 },
    subProjects: [
      { id: "vertex-service", name: "vertex-service", type: "code", status: "unknown", version: "v1.0" },
    ],
  },
];
```

These match the 3 test projects on the filesystem at `Projects/Orion/`, `Projects/Nexus/`, `Projects/Vertex/`.

The `ProjectRow` component currently defaults `useState(true)` for expansion. Change this so Orion is expanded by default, Nexus and Vertex are collapsed by default. Keep LeadSieve expanded as it currently is (no behaviour change for existing fixtures).

---

## Task 2 - Render version badge in SubProjectRow

In `components/treeview-shell.tsx`, inside `SubProjectRow`, render a `<Badge theme={theme}>{sub.version}</Badge>` directly after the existing type Badge, only when `sub.version` is set. Do not change any other markup or styling in that component.

---

## Task 3 - Render the Parked group properly

`treeview-shell.tsx` currently renders the Parked group header but only shows an "empty" placeholder. Replace that placeholder logic so Parked projects render the same way Active projects do (`PARKED_PROJECTS.map((p) => <ProjectRow ... />)`), with the same filter behaviour as Active.

---

## Task 4 - Build and deploy

On Dev-Web (`kkh01vdweb01.mng.mcsfam.local`):

```
rsync -av --delete \
  --exclude=node_modules --exclude=.next --exclude=out \
  /mnt/sc-development/CCC/docs/v1.1/design/stage01a-dark-light/ \
  /tmp/stage01a-build/

cd /tmp/stage01a-build && npm install --silent && npm run build

rsync -av --delete \
  /tmp/stage01a-build/out/ \
  /mnt/sc-development/CCC/docs/v1.1/design/preview/
```

No Apache reload needed.

Verify: `http://172.16.10.6/CCC/design-preview/`.

---

## Task 5 - Test file

Generate `docs/v1.1/CCC_test_stage02a.md` with the following checklist:

- [ ] Orion parent row renders in Active group - chevron, running status dot, name, COD badge
- [ ] Orion progress bar shows: fill at 25% (2/8), label reads "Stage 2 / 8"
- [ ] Orion expands to show orion-api (running) and orion-web (unknown) with v1.0 version badges
- [ ] Nexus parent row renders in Active group - chevron, completed status dot, name, COD badge
- [ ] Nexus progress bar shows: fill at ~16% (1/6), label reads "Stage 1 / 6"
- [ ] Nexus collapsed by default (sub-projects hidden)
- [ ] Vertex parent row renders in Parked group - chevron, unknown status dot, name, COD badge
- [ ] Vertex progress bar shows: fill at 0% (0/5), label reads "Stage 0 / 5"
- [ ] Each sub-project row shows: status dot, name, type badge, version badge (v1.0)
- [ ] Clicking chevron collapses and expands sub-projects correctly
- [ ] LeadSieve and CCC still render without visual breakage
- [ ] Dark theme renders correctly (uses theme tokens)
- [ ] Light theme renders correctly (uses theme tokens)
- [ ] No console errors on load

---

## When Done

Report what was built and the test file location. Then wait for testing.
Run `/go` when Phet gives the Go.
