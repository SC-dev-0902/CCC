# Session Handover Pack - CCC
*Generated: 2026-05-05 | Version: v1.1.0 (Stage 02c GO) | Stage 02d next*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Version:** v1.1.0 - Stage 02c (Top Menu Diodes + progress-bar relocation fix) complete on 2026-05-05. All 19 test items ticked, no comments.
- **Active version in projects.json:** "1.1.0".
- **Stage:** v1.1 Stage 02c GO. Next: Stage 02d - Treeview Search/Filter (live filter on hardcoded project list, Escape clears).
- **Status:** Wired design preview at `http://172.16.10.6/CCC/design-preview/` now renders three top-menu diodes (PatchPilot red / disconnected, Forgejo green, GitHub green) with hover tooltips, AND the stage progress bar now sits per sub-project (off the container parent row). CCC v1.0.7 still on Mac localhost:3000 (untouched).

---

## What Was Done This Session (Stage 02c + in-session 02a fix)

### The deliverables

**Stage 02c (Top Menu Diodes) - per kickoff prompt:**
1. **Diode component verified** - `app-shell.tsx` already implemented the spec from earlier work: 9px filled circular dot, green (`t.statusCompleted`) when connected / red (`t.statusWaiting`) when disconnected, hover tooltip with service name, status, "Last checked 14s ago" placeholder, and URL. No code change required.
2. **PatchPilot flipped to disconnected** in `dummy-data.ts` so the red state is visible in the preview. Forgejo and GitHub stay connected. Only line changed.
3. **Usage bar absence confirmed** - `AppHeader` contains hexagon + title + INTEGRATIONS map + theme toggle. Nothing usage-related. No change.

**In-session fix (Stage 02a deviation authorised by Phet mid-Stage-02c):**
4. **Progress bar relocated** off container parent rows onto sub-project rows. The visual model is "container = grouping, sub-project = real work". LeadSieve / Orion / Nexus / Vertex no longer show a progress bar at the parent row. Each sub-project (leadsieve-service, leadsieve-admin, leadsieve-web, orion-api, orion-web, nexus-core, nexus-admin, nexus-mobile, vertex-service) now renders its own. CCC, which has no sub-projects, keeps its bar at the parent row (single-project mode preserved).

### Key code added/changed

- `docs/v1.1/design/stage01a-dark-light/lib/dummy-data.ts`:
  - `INTEGRATIONS[0].status`: `"connected"` -> `"disconnected"` (PatchPilot)
  - `SubProject` interface: added optional `stageProgress?: { current: number; total: number }`
  - `Project` interface: `stageProgress` made optional
  - Removed `stageProgress` from container projects (LeadSieve, Orion, Nexus, Vertex)
  - Added hardcoded `stageProgress` to each sub-project: leadsieve-service `3/16`, leadsieve-admin `5/12`, leadsieve-web `2/10`, orion-api `2/8`, orion-web `1/6`, nexus-core `6/6`, nexus-admin `0/8`, nexus-mobile `0/8`, vertex-service `0/5`
  - CCC kept its `stageProgress: { current: 14, total: 17 }` since it has no sub-projects

- `docs/v1.1/design/stage01a-dark-light/components/treeview-shell.tsx`:
  - `ProjectRow`: progress bar wrapper now guarded by `!hasChildren && project.stageProgress` - container rows show no bar
  - `SubProjectRow`: new progress bar block `{sub.stageProgress && (...)}` rendered between the row content and the optional file children, with `paddingLeft: 44` to align below the row name

- `docs/v1.1/design/preview/` - rebuilt static export (~55 file diffs, manifest hash: `e87MWa9QEYzIb8vTJgF_t` -> `yluISBb-rOD8LGrClytSe`)
- `docs/v1.1/CCC_test_stage02c.md` - new test file in v1.0 sectioned format. 19 items across 6 sections: Diodes Connected, Diodes Disconnected, Hover Tooltips, No Usage Bar, Progress-Bar Relocation, Themes & Console.
- `docs/v1.1/CCC_tasklist_v1.1.0.md` - all four Sub-Stage 02c items checked off.
- `docs/handoff/stage02c-prompt.md` - kickoff prompt (drafted by Cowork pre-session).

### Build flow (unchanged from 02a/02b - first time on a fresh `/tmp/stage01a-build/` so npm install ran)
1. Source on share at `/mnt/sc-development/CCC/docs/v1.1/design/stage01a-dark-light/`
2. SSH to Dev-Web (`kkh01vdweb01.mng.mcsfam.local`)
3. `rsync -a --exclude=node_modules --exclude=.next --exclude=out` to `/tmp/stage01a-build/`
4. `cd /tmp/stage01a-build && npm install` (this was a fresh dir on Dev-Web - the past 02b build dir was wiped at some point)
5. `npm run build` (~3s compile + 0.2s static gen)
6. `rsync -a --delete /tmp/stage01a-build/out/ /mnt/sc-development/CCC/docs/v1.1/design/preview/`
7. Apache alias serves from `/mnt/sc-development/CCC/docs/v1.1/design/preview/` at `http://172.16.10.6/CCC/design-preview/`. No reload needed.

---

## Decisions Made

- **Mid-stage 02a fix authorised by Phet.** When Phet noticed the progress bar was on the container row and asked to move it to the sub-projects, this was flagged as drift / no-touch list violation (treeview-shell.tsx is on the Stage 02c no-touch list, and the bar location was approved in Stage 02a GO). Phet explicitly authorised "solve it now and we continue with 02c". Per precedence hierarchy, in-session explicit instruction by Phet beats global rules. The fix landed in the same Stage 02c commit with both items called out in the message.
- **Project-level vs sub-project-level progress.** A project with sub-projects is treated as a *container*; the parent row no longer has its own stage progress. A project without sub-projects (e.g. CCC) is its own work item; its bar stays at the parent row. The `Project.stageProgress` field is now optional to support both shapes without forcing dummy values on container projects.
- **No tooltip change for diodes.** The existing Diode component in `app-shell.tsx` already met the spec - hardcoded "14s ago" placeholder is acceptable per the prompt ("last checked placeholder timestamp"). The `lastChecked` field exists in `INTEGRATIONS` data but is not piped through; over-engineering deferred to Stage 10a where real polling lands.
- **SSH key needed manual load.** `ssh-add --apple-use-keychain ~/.ssh/id_ed25519` had to be run by Phet via `! ` prefix - Bash tool here cannot reach the macOS keychain. Once loaded, all subsequent SSH ran clean. Added to known gotchas.
- **Recovery file regenerates mid-session.** Deleted at session start per /continue protocol, but CCC writes it back during the live session. Still excluded from stage commits manually.

---

## Full Project Timeline

| Commit | Description | Date |
|---|---|---|
| ... v1.0.0 - v1.0.7 ... | (see prior SHPs) | 2026-02-27 to 2026-04-24 |
| `ab9bee7` | v1.1.0 Stage 00a+00b - TrueNAS share mounted | 2026-05-04 |
| `5f5d03f` | v1.1.0 Stage 01f - wired design preview live at `/CCC/design-preview/` | 2026-05-04 |
| `fd0265b` | v1.1.0 Stage 02a - parent/sub-project hierarchy, version badges, resizable sidebar | 2026-05-04 |
| `a7292ed` | SHP update - Stage 02a GO, Stage 02b next | 2026-05-04 |
| `3749432` | v1.1.0 Stage 02b - locking badge `● DevName`, Start Session button, New group verified | 2026-05-05 |
| `fdbc231` | SHP update - Stage 02b GO, Stage 02c next | 2026-05-05 |
| `a98d2a8` | **v1.1.0 Stage 02c** - top menu diodes (+ progress-bar relocation fix) | 2026-05-05 |

Pushed to Forgejo. **GitHub push pending** for `a7292ed`, `3749432`, `fdbc231`, `a98d2a8` - Phet to run `git push github main` from terminal (Bash tool can't reach macOS keychain).

Tags: `v1.0.0` -> `v1.0.7` on both remotes. v1.1.0 not yet tagged.

---

## Architecture & File Map (v1.1 active surface)

| Area | File / Path |
|---|---|
| Design preview source (Next.js 16) | `docs/v1.1/design/stage01a-dark-light/` |
| Treeview component | `components/treeview-shell.tsx` |
| App shell + top menu (AppHeader, Diode) | `components/app-shell.tsx` |
| Theme tokens | `components/theme-context.tsx` |
| Dummy data | `lib/dummy-data.ts` |
| Static build output | `docs/v1.1/design/preview/` |
| Apache alias config | `/etc/apache2/conf-available/CCC-design-preview-alias.conf` (on Dev-Web, NOT in repo) |
| Stage 02c kickoff prompt | `docs/handoff/stage02c-prompt.md` |
| Stage 02c test file | `docs/v1.1/CCC_test_stage02c.md` |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` |

---

## Frontend State Model (preview app, current)

- `app-shell.tsx`:
  - `Diode.hover` - `useState(false)`, drives tooltip visibility per diode.
  - `sidebarWidth: number` (200-600), persisted to `localStorage["ccc-sidebar-width"]`, default 320.
  - `dragging: boolean` - true while user is dragging the divider.
- `treeview-shell.tsx`:
  - `ProjectRow.expanded` - `useState(expandedByDefault)`. `expandedByDefault = project.id === "leadsieve" || project.id === "orion"`. Other projects collapsed.
  - `ProjectRow` progress bar render guard: `!hasChildren && project.stageProgress` - container rows do not show a bar.
  - `SubProjectRow.expanded` - `useState(sub.id === "leadsieve-service")` (only LeadSieve service starts expanded to demo file children).
  - `SubProjectRow` progress bar render guard: `sub.stageProgress` truthy. All sub-projects in dummy-data have it.
  - `StartSessionButton.hover` - `useState(false)`, toggled by `onMouseEnter`/`onMouseLeave`.
  - `filteredActive` and `filteredParked` flow through shared `filterProjects(list)` helper. Filter matches parent name OR sub-project name; keeps parents whose children matched. (Filter input wired but search box behaviour to be refined in Stage 02d.)

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

### Mac CCC v1.0.7 (production, unchanged)
- localhost:3000 on Mac
- Untouched this session

---

## Dependencies

CCC server: unchanged from v1.0.7. Next.js preview app: unchanged dependency set (Next.js 16.2.4, React 19, shadcn/ui, lucide-react). No new packages added in 02c.

---

## Known Gotchas (cumulative for v1.1)

1. **Test URL is the design preview, not port 3000.** `http://172.16.10.6/CCC/design-preview/` for v1.1+ visual work.
2. **Browser caching is sticky.** Cmd+Shift+R required after every build. Brave is especially sticky on Next.js asset URLs even though hash-named filenames change per build.
3. **Building on the share is slow over NFS / very slow over SMB.** Always build on Dev-Web local `/tmp/`. ~3s rebuild after first install.
4. **Next.js `basePath: '/CCC/design-preview'`** must be in `next.config.mjs`. Without it, `/_next/...` URLs 404 under Apache alias.
5. **server.js `/design-preview` Express route is redundant** (Apache serves static). Kept in code for any CCC running from this codebase.
6. **Apache config not in repo.** `/etc/apache2/conf-available/CCC-design-preview-alias.conf` lives on Dev-Web only.
7. **DNS:** `kkh01vdweb01.mcsfam.local` does NOT resolve from Mac (only `.mng.` does). Use IP `172.16.10.6` or `.mng.` hostname.
8. **GitHub push requires terminal credentials.** Bash tool can't reach macOS keychain - Phet pushes manually after each stage.
9. **SSH key must be loaded into ssh-agent at session start.** Bash tool cannot reach macOS keychain to enter the passphrase. Phet runs `! ssh-add --apple-use-keychain ~/.ssh/id_ed25519` once per session before any SSH/rsync to Dev-Web.
10. **`/tmp/stage01a-build/` on Dev-Web may need a fresh `npm install`.** The directory is not persistent guaranteed - if `next: not found` appears after rsync, run `npm install` once and the build works.
11. **Recovery file is auto-saved transient session state**, not committed. Currently tracked in git (legacy) - exclude from stage commits manually. Regenerates mid-session even after deletion.
12. **Hover styles in this codebase use `useState`, not Tailwind hover classes.** Because theme tokens are dynamic, Tailwind hover utilities cannot reference them.
13. **Click handlers on row-internal elements need `e.stopPropagation()`** - the parent row has an onClick that toggles expand. Without `stopPropagation`, button clicks expand/collapse the row.
14. **Container vs single-project rendering rule.** A `Project` with `subProjects` is a container - no progress bar at parent row, bars on each sub. A `Project` without `subProjects` keeps its bar at the parent row. Code guard: `!hasChildren && project.stageProgress` in `ProjectRow`.

---

## Open Items / Carry-Forwards

- **GitHub push pending** for `a7292ed`, `3749432`, `fdbc231`, `a98d2a8` (and the upcoming SHP commit) - Phet to run `git push github main` from terminal.
- **Recovery file should be untracked.** It is committed legacy. Add to `.gitignore` and `git rm --cached` it - small task, do when convenient.
- **Apache alias not version-controlled** - still needs to be captured in a deploy.sh or infrastructure doc later.
- **Stage 02d next** - Treeview Search/Filter. The search input is already in the treeview (input + filterProjects helper) but Stage 02d needs to confirm: real-time filter, parent visibility when child matches, Escape clears, edge cases. Cowork drafts the kickoff prompt.
- **`data/projects.json` modification** - was modified in working tree at session start, not by this session. Left unstaged. May need separate review/commit.
- **CCC v1.1 instance on Dev-Web** - not running for the preview test loop. Apache static serve is sufficient.
- **Carry-forwards from prior sessions:** Mac SMB no fstab entry; `_SC-Development` 6.2GB local backup still kept; Mac CCC v1.0.7 untouched on production.

---

## Next Actions

1. Phet pushes to GitHub: `git push github main` (covers `a7292ed`, `3749432`, `fdbc231`, `a98d2a8`, and the upcoming SHP commit).
2. Begin **Stage 02d (Treeview Search/Filter)** when ready. Cowork drafts the kickoff prompt - target file is `treeview-shell.tsx` (currently has the search input UI and a basic `filterProjects` helper; behaviour edges need pinning down).
3. Continue using v1.0 sectioned test file format (saved feedback).
