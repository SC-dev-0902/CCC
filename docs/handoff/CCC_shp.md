# Session Handover Pack - CCC
*Generated: 2026-05-04 | Version: v1.1.0 (Stage 02a GO) | Stage 02b next*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Version:** v1.1.0 - Stage 02a (Treeview: Parent/Sub-Project Hierarchy) complete on 2026-05-04. All 14 test items ticked.
- **Active version in projects.json:** "1.1.0".
- **Stage:** v1.1 Stage 02a GO. Next: Stage 02b - Locking Badge & "New" Group.
- **Status:** Wired design preview at `http://172.16.10.6/CCC/design-preview/` now renders three new fixture parents (Orion, Nexus, Vertex) with progress bars and version badges. Sidebar is resizable. Group headers readable. Mac CCC v1.0.7 still on Mac localhost:3000.

---

## What Was Done This Session (Stage 02a)

### The deliverable
Three new test fixture parents wired into the Next.js design preview:
- **Orion** (Active group, running, Stage 2/8, expanded by default) - sub-projects `orion-api` (running, v1.0) + `orion-web` (unknown, v1.0)
- **Nexus** (Active group, completed, Stage 1/6, collapsed by default) - sub-projects `nexus-core` (completed, v1.0) + `nexus-admin` (unknown, v1.0) + `nexus-mobile` (unknown, v1.0)
- **Vertex** (Parked group, unknown, Stage 0/5, collapsed by default) - sub-project `vertex-service` (unknown, v1.0)

Plus two mid-stage adjustments at Phet's request:
- Group header (NEW / ACTIVE / PARKED) contrast bumped to `textPrimary` + `font-semibold` + 11px (was unreadable `textMuted` 10px)
- Resizable sidebar: drag handle between sidebar and main, 200-600px range, persists to `localStorage`, double-click resets to 320px

### Scope detour mid-stage
The 02a kickoff prompt (`docs/handoff/stage02a-prompt.md`) initially told CC to edit `public/app.js` and `public/styles.css` (the v1.0 vanilla JS frontend). CC did so and gave Phet the wrong test URL (`http://172.16.10.6:3000/`). Phet flagged this: the v1.1 framework is the Next.js design preview, not the v1.0 production frontend.

The kickoff prompt was rewritten to target the design preview source (`docs/v1.1/design/stage01a-dark-light/lib/dummy-data.ts` + `components/treeview-shell.tsx`). The vanilla-JS edits were reverted clean. The implementation moved into the Next.js source.

This is a clarification of the workflow rule for v1.1+: **the Next.js design preview is the dev base for Stage 02+ implementation, not just a visual reference.** Future Stage 02b+ kickoff prompts should target the design preview source.

### Key code added/changed
- `docs/v1.1/design/stage01a-dark-light/lib/dummy-data.ts` - added `version?: string` to `SubProject` interface; appended Orion + Nexus to `ACTIVE_PROJECTS`; replaced empty `PARKED_PROJECTS` with Vertex.
- `docs/v1.1/design/stage01a-dark-light/components/treeview-shell.tsx`:
  - `SubProjectRow` renders `<Badge>{sub.version}</Badge>` after the type badge when `sub.version` is set
  - `ProjectRow` defaults Orion + LeadSieve to expanded, others collapsed (`expandedByDefault`)
  - `Parked` group now renders `PARKED_PROJECTS` with shared `filterProjects` helper (was hardcoded "empty")
  - `GroupHeader` color: `textMuted` -> `textPrimary`, weight: + `font-semibold`, size: 10px -> 11px
- `docs/v1.1/design/stage01a-dark-light/components/app-shell.tsx`:
  - `useState(sidebarWidth)` hydrated from `localStorage["ccc-sidebar-width"]`
  - Drag divider element between `<aside>` and `<main>`; `mousedown` -> window `mousemove`/`mouseup` listeners; constraints 200-600px; `cursor: col-resize`, body cursor + user-select locked during drag; double-click resets to 320
- `docs/v1.1/design/preview/` - rebuilt static export (~80 files, manifest hashes changed)
- `docs/handoff/stage02a-prompt.md` - rewritten from "edit `public/*`" to "edit Next.js source + rebuild + rsync"
- `docs/v1.1/CCC_test_stage02a.md` - 14-item test checklist, all `[x]`
- `docs/v1.1/CCC_tasklist_v1.1.0.md` - all four Stage 02a items checked off

### Build flow (unchanged from 01f, now standard for v1.1)
1. Source on share at `/mnt/sc-development/CCC/docs/v1.1/design/stage01a-dark-light/`
2. SSH to Dev-Web (`kkh01vdweb01.mng.mcsfam.local`)
3. `rsync -a --delete --exclude=node_modules --exclude=.next --exclude=out` to `/tmp/stage01a-build/`
4. `cd /tmp/stage01a-build && npm run build` (npm install only on first build; ~6s rebuild)
5. `rsync -a --delete /tmp/stage01a-build/out/ /mnt/sc-development/CCC/docs/v1.1/design/preview/`
6. Apache alias serves from `/mnt/sc-development/CCC/docs/v1.1/design/preview/` at `http://172.16.10.6/CCC/design-preview/`. No reload needed.

---

## Decisions Made

- **Design preview is the dev base, not screenshots.** Stage 02+ implements in `docs/v1.1/design/stage01a-dark-light/`. Vanilla JS files in `public/` are NOT the v1.1 implementation target.
- **Test URL for Stage 02+ is `http://172.16.10.6/CCC/design-preview/`.** Not port 3000. Apache serves the static Next.js export.
- **`/CCC/design-preview/` is the only `/CCC/...` URL that resolves on Apache.** No `/CCC/` -> live CCC binding exists. The CCC v1.1 Express instance (port 3000) is unrelated to the design preview.
- **Test files follow v1.0 structure** - `docs/v1.0/CCC_test_stage*.md` are the canonical pattern. Stage 02a's flat checklist was below standard. Future test files use sectioned structure with steps + outcomes, comment placeholders, footer. Memory saved.
- **Out-of-scope items get committed in the same stage.** Group header polish + resizable sidebar were direct mid-stage asks; rolled into the Stage 02a commit rather than split into 02a01.

---

## Full Project Timeline

| Commit | Description | Date |
|---|---|---|
| ... v1.0.0 - v1.0.7 ... | (see prior SHPs) | 2026-02-27 to 2026-04-24 |
| `ab9bee7` | v1.1.0 Stage 00a+00b - TrueNAS share mounted | 2026-05-04 |
| `5f5d03f` | v1.1.0 Stage 01f - wired design preview live at `/CCC/design-preview/` | 2026-05-04 |
| `fd0265b` | **v1.1.0 Stage 02a** - Orion/Nexus/Vertex parents, version badges, resizable sidebar, group header polish | 2026-05-04 |

Pushed to Forgejo. GitHub push pending (Bash tool can't reach keychain - Phet to `git push github main`).

Tags: `v1.0.0` -> `v1.0.7` on both remotes. v1.1.0 not yet tagged.

---

## Architecture & File Map (v1.1 active surface)

| Area | File / Path |
|---|---|
| Design preview source (Next.js 16) | `docs/v1.1/design/stage01a-dark-light/` |
| Treeview component | `components/treeview-shell.tsx` |
| App shell + resizable sidebar | `components/app-shell.tsx` |
| Theme tokens | `components/theme-context.tsx` |
| Dummy data | `lib/dummy-data.ts` |
| Static build output | `docs/v1.1/design/preview/` |
| Apache alias config | `/etc/apache2/conf-available/CCC-design-preview-alias.conf` (on Dev-Web, NOT in repo) |
| Stage 02a kickoff prompt | `docs/handoff/stage02a-prompt.md` |
| Stage 02a test file | `docs/v1.1/CCC_test_stage02a.md` |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` |

---

## Frontend State Model (preview app, additions)

- `app-shell.tsx`:
  - `sidebarWidth: number` (200-600), persisted to `localStorage["ccc-sidebar-width"]`, default 320
  - `dragging: boolean` - true while user is dragging the divider; locks body cursor and user-select
- `treeview-shell.tsx`:
  - `ProjectRow.expanded` - `useState(expandedByDefault)`. `expandedByDefault = project.id === "leadsieve" || project.id === "orion"`. Other projects collapsed.
  - `filteredActive` and `filteredParked` both flow through shared `filterProjects(list)` helper. Filter matches parent name OR sub-project name; keeps parents whose children matched.

---

## Apache & Deployment

### v1.1 design preview (live)
- URL: `http://172.16.10.6/CCC/design-preview/`
- Apache `Alias` -> `/mnt/sc-development/CCC/docs/v1.1/design/preview/`
- Updates: rebuild on Dev-Web `/tmp/stage01a-build/`, rsync `out/` -> `preview/`. No Apache reload.

### Apache routing summary
| URL path | Binds to |
|---|---|
| `/` | Apache DocumentRoot `/var/www/kkh01vdweb01/wwwroot/` (steinhofer-consulting site) |
| `/proxforge/` | mod_proxy -> `127.0.0.1:8800` |
| `/CCC/design-preview/` | Apache Alias -> share preview folder |
| `/CCC/...` (anything else) | 404 |

There is no Apache binding to the live CCC Express server. `http://172.16.10.6:3000/` is the raw Node port (CCC v1.1 instance, manual nohup).

### Mac CCC v1.0.7 (production, unchanged)
- localhost:3000 on Mac
- Untouched this session

---

## Dependencies

CCC server: unchanged from v1.0.7. Next.js preview app: unchanged dependency set (Next.js 16.2.4, React 19, shadcn/ui, lucide-react). No new packages added in 02a.

---

## Known Gotchas (cumulative for v1.1)

1. **Test URL is the design preview, not port 3000.** `http://172.16.10.6/CCC/design-preview/` for v1.1+ visual work.
2. **Browser caching is sticky.** Cmd+Shift+R required after every build. Brave is especially sticky on Next.js asset URLs even though hash-named filenames change per build.
3. **Building on the share is slow over NFS / very slow over SMB.** Always build on Dev-Web local `/tmp/`. ~6s rebuild after first install.
4. **Next.js `basePath: '/CCC/design-preview'`** must be in `next.config.mjs`. Without it, `/_next/...` URLs 404 under Apache alias.
5. **server.js `/design-preview` Express route is redundant** (Apache serves static). Kept in code for any CCC running from this codebase.
6. **Apache config not in repo.** `/etc/apache2/conf-available/CCC-design-preview-alias.conf` lives on Dev-Web only.
7. **DNS:** `kkh01vdweb01.mcsfam.local` does NOT resolve from Mac (only `.mng.` does). Use IP `172.16.10.6` or `.mng.` hostname.
8. **GitHub push requires terminal credentials.** Bash tool can't reach macOS keychain - Phet pushes manually after each stage.
9. **Recovery file is auto-saved transient session state**, not committed. SHP is the durable artefact.

---

## Open Items / Carry-Forwards

- **GitHub push pending** for commit `fd0265b` - Phet to run `git push github main` from terminal.
- **CCC v1.1 instance on Dev-Web** - no longer needed for the preview test loop. PID 3864 from prior session likely gone after Dev-Web reboot/passage of time.
- **Apache alias not version-controlled** - still needs to be captured in a deploy.sh or infrastructure doc later.
- **Stage 02a kickoff prompt edited mid-stage** (broke the immutability rule) because the original target was wrong. Phet directed the rewrite. Future kickoff prompts: check target files before sending.
- **Stage 02b** - Locking Badge & "New" Group. Cowork to draft kickoff prompt. Source files will be the same Next.js preview surface.
- **Carry-forwards from prior sessions:** Mac SMB no fstab entry; `_SC-Development` 6.2GB local backup still kept; Mac CCC v1.0.7 untouched on production.

---

## Next Actions

1. Phet pushes to GitHub: `git push github main`.
2. Begin **Stage 02b (Locking Badge & "New" Group)** when ready. Cowork drafts the kickoff prompt targeting the Next.js design preview source.
3. Future test files use the v1.0 sectioned structure (saved to memory: `feedback_test_file_format_v1_style.md`).
