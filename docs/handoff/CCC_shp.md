# Session Handover Pack - CCC
*Generated: 2026-05-05 | Version: v1.1.0 (Stage 02 GO - main gate) | Stage 03 next*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Version:** v1.1.0 - Stage 02 (UI Shell) main Go/NoGo gate **GO** on 2026-05-05. Sub-Stages 02a (parent/sub hierarchy), 02b (locking badge + New group), 02c (top menu diodes + progress-bar relocation fix), and 02d (treeview search/filter polish) all complete.
- **Active version in projects.json:** "1.1.0".
- **Stage:** v1.1 Stage 02 GO (main gate). Next: **Stage 03 - MariaDB Schema & Data Migration** (Cowork drafts the Stage 03a kickoff prompt; CC waits).
- **Status:** Wired Next.js design preview at `http://172.16.10.6/CCC/design-preview/` is the v1.1 dev base. All static UI elements look and feel correct against the Stage 01 visual spec. No backend wiring touched yet. CCC v1.0.7 still on Mac localhost:3000 (untouched).

---

## What Was Done This Session (Stage 02d + Stage 02 main GO)

### Code changes (single source file)

`docs/v1.1/design/stage01a-dark-light/components/treeview-shell.tsx`:

1. **`ProjectRow` got a `forceExpand?: boolean` prop** (default `false`).
   - Computed `const effectiveExpanded = forceExpand || expanded`.
   - Replaced both `expanded` reads (chevron icon choice + child render gate) with `effectiveExpanded`.
   - Local `expanded` state and the `setExpanded` toggle remain intact - so when filter clears, rows fall back to their own state.
2. **`filteredNew` memo added** alongside the existing `filteredActive` / `filteredParked` memos:
   ```tsx
   const filteredNew = useMemo(
     () => (!query ? NEW_PROJECTS : NEW_PROJECTS.filter((p) => matches(p.name))),
     [query]
   )
   ```
3. **NEW group rendering rewritten** - now guarded by `filteredNew.length > 0`. When zero matches, the `GroupHeader` itself disappears (not just the entries).
4. **ACTIVE group empty state** - when `filteredActive.length === 0 && query` is non-empty, renders a single `no match` line (10px italic, `paddingLeft: 24`, `textMuted`). Mirrors the existing PARKED `empty` placeholder visually but uses different copy because PARKED's no-match path is the default empty state, not a filter result.
5. **`forceExpand={!!query}` passed** to every `ProjectRow` rendered from `filteredActive` and `filteredParked`. NOT passed to `SubProjectRow` (sub-project expansion is independent of the parent-level filter).

### Test file

`docs/v1.1/CCC_test_stage02d.md` - 7 sections, **24 items, all ticked, no comments** during /tested:
1. Search Input - Render (2)
2. Real-Time Filtering - Active group (5: `lead`, `LEAD`, `nexus-admin`, `web`, `ccc`)
3. Auto-Expand on Filter Match (5)
4. New Group - Filter Behaviour (4)
5. Active Group - Empty State (3)
6. Escape to Clear (2)
7. Themes and Console (3)

### Tasklist

`docs/v1.1/CCC_tasklist_v1.1.0.md` - all four Sub-Stage 02d items ticked. Sub-Stages 02a, 02b, 02c, 02d all complete. Stage 02 Go/NoGo gate line **untouched** (per /go protocol).

### Build flow

Standard Dev-Web pipeline (unchanged from 02a/02b/02c):
1. Source: `/mnt/sc-development/CCC/docs/v1.1/design/stage01a-dark-light/`
2. SSH `kkh01vdweb01.mng.mcsfam.local`
3. `rsync -av --exclude=node_modules --exclude=.next --exclude=out` -> `/tmp/stage01a-build/`
4. `cd /tmp/stage01a-build && npm run build` (~2.5s compile + 0.2s static gen)
5. `rsync -a --delete /tmp/stage01a-build/out/` -> `/mnt/sc-development/CCC/docs/v1.1/design/preview/`
6. Apache alias serves at `http://172.16.10.6/CCC/design-preview/` - no reload needed.

Build hash advanced: `yluISBb-rOD8LGrClytSe` -> `vKRGR_7136MUbc4SKAy_R`.

### Commits this session

- `9d645b9` **Stage 02d complete - treeview search/filter polish** (source + rebuilt static export + new test file + tasklist ticks + kickoff prompt)
- `5a53802` **Stage 02 complete - UI Shell** (test file 24/24 ticks, records Stage 02 main gate GO)

Both pushed to Forgejo (`origin`). GitHub push pending - see Open Items.

---

## Decisions Made

- **`forceExpand` semantics: filter overrides, never mutates.** Picked `effectiveExpanded = forceExpand || expanded` over driving `setExpanded` from the filter. Reason: the user's explicit collapsed/expanded choice must survive filter changes. After Escape, Nexus snaps back to collapsed (its prior state) - validated in test sections 3 + 6.
- **Active uses `no match`, Parked stays `empty`.** Two visually identical placeholders, two different strings, intentional. Parked's `empty` predates Stage 02d and represents the no-data default state; Active's `no match` represents a filter result. Keeping them distinct preserves semantic meaning.
- **NEW group hides entire group when zero matches** (header included), but Active group keeps its header and shows `no match` underneath. Asymmetry is intentional: NEW is a transient group that disappears when irrelevant; ACTIVE is the primary working surface and must always be present so the user can see *why* nothing is showing.
- **No `forceExpand` on `SubProjectRow`.** Sub-project expansion drives file-list visibility (CLAUDE.md, SHP). The filter doesn't match file names, so auto-expanding sub-projects would expose unrelated files. Per kickoff prompt explicit instruction.
- **Stage 02 closure committed as separate commit** (`5a53802`) rather than amending the work commit. Per global rules: never amend; new commits only.
- **`data/projects.json` working-tree modification left unstaged.** Pre-existing change at session start, not from this session. Needs separate review.
- **`docs/handoff/CCC_recovery.md` deletion left unstaged in stage commits.** Legacy-tracked transient file - should be `git rm --cached` + `.gitignore` outside of stage commits (carry-forward).

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
| `a98d2a8` | v1.1.0 Stage 02c - top menu diodes (+ progress-bar relocation fix) | 2026-05-05 |
| `1389e28` | SHP update - Stage 02c GO, Stage 02d next | 2026-05-05 |
| `9d645b9` | **v1.1.0 Stage 02d** - treeview search/filter polish | 2026-05-05 |
| `5a53802` | **v1.1.0 Stage 02 main gate GO** - UI Shell complete | 2026-05-05 |

Pushed to Forgejo. **GitHub push pending** for `a7292ed`, `3749432`, `fdbc231`, `a98d2a8`, `1389e28`, `9d645b9`, `5a53802` - Phet to run `git push github main` from terminal (Bash tool can't reach macOS keychain).

Tags: `v1.0.0` -> `v1.0.7` on both remotes. v1.1.0 not yet tagged - tag on Stage 03+ readiness or end-of-v1.1 ship.

---

## Architecture & File Map (v1.1 active surface)

| Area | File / Path |
|---|---|
| Design preview source (Next.js 16) | `docs/v1.1/design/stage01a-dark-light/` |
| Treeview component (search/filter, expand/collapse, progress bars) | `components/treeview-shell.tsx` |
| App shell + top menu (AppHeader, Diode component, sidebar resizer) | `components/app-shell.tsx` |
| Theme tokens (dark/light) | `components/theme-context.tsx` |
| Component gallery (in-preview test surface) | `components/component-gallery.tsx` |
| Dummy data (NEW_PROJECTS, ACTIVE_PROJECTS, PARKED_PROJECTS, INTEGRATIONS, USERS, STATUS_LEGEND) | `lib/dummy-data.ts` |
| Static build output | `docs/v1.1/design/preview/` |
| Apache alias config | `/etc/apache2/conf-available/CCC-design-preview-alias.conf` (on Dev-Web, NOT in repo) |
| Stage kickoff prompts (02a-02d) | `docs/handoff/stage02{a,b,c,d}-prompt.md` |
| Stage test files (02a-02d) | `docs/v1.1/CCC_test_stage02{a,b,c,d}.md` |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` |
| v1.1 concept doc | `docs/v1.1/CCC_concept_v1.1.md` |

CCC v1.0 server code (`server.js`, `src/parser.js`, `src/sessions.js`, `src/projects.js`, `src/versions.js`, `src/usage.js`, `public/*`) is untouched in v1.1 so far. Stage 03 will start touching server-side code (MariaDB).

---

## API Endpoint Inventory (current - v1.0.7 server, unchanged in v1.1 to date)

All endpoints live in `server.js`. v1.1 has not added any backend routes yet (Stage 02 was UI shell only).

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Serve `public/index.html` |
| GET | `/api/projects` | List all registered projects |
| POST | `/api/projects` | Register a new project |
| PUT | `/api/projects/:id` | Update project (name, group, coreFiles, activeVersion, evaluated) |
| DELETE | `/api/projects/:id` | Remove a project |
| DELETE | `/api/projects/:id/versions/:version` | Delete a specific version (active version deletable with auto-fallback) |
| GET | `/api/projects/:id/versions` | List versions for project (returns `{ files[], testFiles[] }` per `scanVersionFiles`) |
| GET | `/api/projects/:id/files` | Tree of project's coreFiles |
| GET | `/api/file/:projectId` | Read a single file (querystring `path`) |
| PUT | `/api/file/:projectId` | Write a single file (test-runner save) |
| GET | `/api/settings` | Read global settings |
| PUT | `/api/settings` | Update global settings |
| WS | `/ws` | xterm.js websocket - PTY session multiplexer (sessions identified by `projectId::session`) |
| GET | `/design-preview/...` | Express static fallback for the v1.1 design preview (redundant in prod where Apache serves directly; kept for any local CCC instance) |

---

## Frontend State Model (preview app, current after Stage 02d)

`app-shell.tsx`:
- `Diode.hover` - `useState(false)` per diode, drives tooltip visibility.
- `sidebarWidth: number` (200-600), persisted to `localStorage["ccc-sidebar-width"]`, default 320.
- `dragging: boolean` - true while user is dragging the sidebar divider.
- `theme: "dark" | "light"` - global theme via `theme-context`.

`treeview-shell.tsx`:
- `query: string` - the live filter input. Set by `<input onChange>` + `onKeyDown` Escape handler.
- `matches(s)` - case-insensitive includes test against `query`.
- `filterProjects(list)` - parent-or-child match; if parent matches, keeps all subProjects; if only children match, narrows to matching subProjects.
- `filteredActive`, `filteredParked`, `filteredNew` - all `useMemo([query])`.
- `ProjectRow.expanded` - local `useState(expandedByDefault)`. `expandedByDefault = project.id === "leadsieve" || project.id === "orion"`. All other rows collapsed by default.
- `ProjectRow.forceExpand` - prop. `true` whenever `query` is non-empty (passed by parent). Drives `effectiveExpanded`.
- `ProjectRow` progress bar render guard: `!hasChildren && project.stageProgress` - container rows do not show a bar.
- `SubProjectRow.expanded` - `useState(sub.id === "leadsieve-service")` (only LeadSieve service starts expanded to demo file children). Independent of filter.
- `SubProjectRow` progress bar render guard: `sub.stageProgress` truthy. All sub-projects in dummy-data have it.
- `StartSessionButton.hover` - `useState(false)`, toggled by `onMouseEnter`/`onMouseLeave`.

Rendering pipeline (top to bottom of sidebar):
1. Header (title + RefreshCw / Plus icons)
2. Search input (filter field, Escape clears)
3. Tree:
   - NEW group: rendered iff `filteredNew.length > 0` (header AND entries hide together)
   - ACTIVE group: header always rendered. Body: `no match` line iff `filteredActive.length === 0 && query`, else map over `filteredActive` with `forceExpand={!!query}`.
   - PARKED group: header always rendered. Body: `empty` line iff `filteredParked.length === 0`, else map with `forceExpand={!!query}`.
4. Status legend (footer)

---

## Key Technical Details

### Container vs single-project rendering rule

A `Project` with `subProjects` is a **container** - no progress bar at parent row, bars on each sub. A `Project` without `subProjects` is **single-project mode** - bar stays at parent row (e.g., CCC `Stage 14 / 17`). Code guard in `ProjectRow`: `!hasChildren && project.stageProgress`. `Project.stageProgress` is optional in the type; container projects omit it.

### Filter expand/collapse contract

The filter never mutates `expanded`. It overrides via `effectiveExpanded` for as long as `query` is non-empty. Clearing the filter (Escape or empty input) instantly restores each row's prior expand state because the local `useState` was never touched.

### Path resolution

Project paths in `data/projects.json` are stored relative to `settings.projectRoot`. `settings.projectRoot` defaults to user-chosen path; New Project Wizard defaults to `{projectRoot}/Projects`. SHP path: `docs/handoff/{ProjectName}_shp.md` (fallback to old `docs/{Name}_shp.md` for legacy).

### Version model

- Active version stored in `projects.json` `activeVersion` field (e.g., `"1.0"`, `"1.1.0"`). Major.minor only - patches nest as subfolders.
- `docs/vX.Y/` holds concept doc + tasklist + test files for that version.
- Patches: `docs/vX.Y/vX.Y.Z/` for patch-specific concept + tasklist.
- No filesystem symlinks - the `activeVersion` field is the only pointer.
- CLAUDE.md at project root is derived from active version's concept doc.

### Test file naming (CCC treeview regex)

`/_test_stage\d+[a-z]*\d*\.md$/` - supports `_test_stage11.md`, `_test_stage11a.md`, `_test_stage07ac.md`, `_test_stage11a01.md`, `_test_stage07ac01.md`. Anything else (`_test_batch`, `_test_`) is invisible to CCC.

### Status model (parser)

`src/parser.js` maps Claude Code output to five states: WAITING_FOR_INPUT (red `#9B2335`), RUNNING (yellow `#B7791F`), COMPLETED (green `#276749`), ERROR (orange `#7A1828`), UNKNOWN (grey `#A0AEC0`). Same colours used in design preview's `StatusDot` component. PTY env must clear both `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT` - leaking either makes Claude Code detect nesting and alter output.

---

## Dependencies

CCC server (Node): unchanged from v1.0.7.
- `express`, `node-pty@1.2.0-beta.11` (Node v25 compat), `ws`, `marked`.

Next.js preview app (`docs/v1.1/design/stage01a-dark-light/`):
- `next@16.2.4` (Turbopack, static export via `output: 'export'`)
- `react@19`
- `lucide-react` (icons)
- `tailwindcss` (with the custom theme tokens layered on via inline styles - hover variants are NOT used because tokens are dynamic)
- shadcn/ui components (subset)
- No new packages added in 02d.

Dev-Web build dir: `/tmp/stage01a-build/`. May need a fresh `npm install` if the dir was wiped between sessions.

---

## Apache & Deployment

### v1.1 design preview (live)
- URL: `http://172.16.10.6/CCC/design-preview/`
- Apache `Alias` -> `/mnt/sc-development/CCC/docs/v1.1/design/preview/`
- Updates: rebuild on Dev-Web `/tmp/stage01a-build/`, rsync `out/` -> `preview/`. No Apache reload required.
- Apache config file lives on Dev-Web only (NOT in repo): `/etc/apache2/conf-available/CCC-design-preview-alias.conf`.

### Apache routing summary
| URL path | Binds to |
|---|---|
| `/` | Apache DocumentRoot `/var/www/kkh01vdweb01/wwwroot/` (steinhofer-consulting site) |
| `/proxforge/` | mod_proxy -> `127.0.0.1:8800` |
| `/CCC/design-preview/` | Apache Alias -> share preview folder |
| `/CCC/...` (anything else) | 404 |

### Mac CCC v1.0.7 (production, unchanged)
- localhost:3000 on Mac. Untouched this session and across the v1.1 stage cycle.

---

## Known Gotchas (cumulative for v1.1)

1. **Test URL is the design preview, not port 3000.** `http://172.16.10.6/CCC/design-preview/` for all v1.1 visual work.
2. **Browser caching is sticky.** Cmd+Shift+R required after every build. Brave is especially sticky on Next.js asset URLs even though hash-named filenames change per build.
3. **Building on the share is slow over NFS / very slow over SMB.** Always build on Dev-Web local `/tmp/`. ~2.5s rebuild after first install.
4. **`next.config.mjs` must set `basePath: '/CCC/design-preview'`.** Without it, `/_next/...` URLs 404 under Apache alias.
5. **`server.js /design-preview` Express route is redundant** in production (Apache serves static). Kept in code for any CCC running from this codebase.
6. **Apache config not in repo.** `/etc/apache2/conf-available/CCC-design-preview-alias.conf` lives on Dev-Web only - capture in deploy.sh or infra doc later.
7. **DNS:** `kkh01vdweb01.mcsfam.local` does NOT resolve from Mac (only `.mng.` does). Use IP `172.16.10.6` or `.mng.` hostname.
8. **GitHub push requires terminal credentials.** Bash tool can't reach macOS keychain - Phet pushes manually after each session.
9. **SSH key must be loaded into ssh-agent at session start.** Bash tool cannot reach macOS keychain to enter the passphrase. Phet runs `! ssh-add --apple-use-keychain ~/.ssh/id_ed25519` once per session before any SSH/rsync to Dev-Web.
10. **`/tmp/stage01a-build/` on Dev-Web is not persistence-guaranteed.** If `next: not found` after rsync, run `npm install` once.
11. **Recovery file is auto-saved transient session state**, not committed. Currently tracked in git (legacy) - exclude from stage commits manually. Regenerates mid-session even after deletion. Carry-forward: `git rm --cached docs/handoff/CCC_recovery.md` + add to `.gitignore`.
12. **Hover styles in this codebase use `useState`, not Tailwind hover classes.** Theme tokens are dynamic so Tailwind hover utilities cannot reference them.
13. **Click handlers on row-internal elements need `e.stopPropagation()`** - the parent row has an onClick that toggles expand. Without `stopPropagation`, button clicks expand/collapse the row.
14. **Container vs single-project rendering rule.** A `Project` with `subProjects` is a container - no progress bar at parent row, bars on each sub. A `Project` without `subProjects` keeps its bar at parent row. Code guard: `!hasChildren && project.stageProgress` in `ProjectRow`.
15. **Filter never mutates expand state.** `forceExpand` is an override prop; local `expanded` is preserved. Tested in stage 02d - Escape after auto-expand returns Nexus to collapsed. Do not "fix" this by setting `expanded` from the filter - it would break the contract.
16. **Distinct empty copy: ACTIVE = `no match`, PARKED = `empty`.** Different strings on purpose. Don't unify them.

---

## Open Items / Carry-Forwards

- **GitHub push pending** for `a7292ed`, `3749432`, `fdbc231`, `a98d2a8`, `1389e28`, `9d645b9`, `5a53802`, plus the upcoming /eod SHP commit. Phet to run `git push github main`.
- **Recovery file legacy-tracked.** `docs/handoff/CCC_recovery.md` is tracked but should not be. Run `git rm --cached docs/handoff/CCC_recovery.md` and add `docs/handoff/CCC_recovery.md` to `.gitignore`. Small cleanup, not stage-blocking.
- **Apache alias not version-controlled.** Capture `/etc/apache2/conf-available/CCC-design-preview-alias.conf` into a `deploy.sh` or infra doc.
- **`data/projects.json` modification carried in working tree from prior session.** Untouched by Stage 02 work. Needs separate review/commit.
- **CCC v1.1 instance not running on Dev-Web.** Apache static serve is sufficient for the preview-test loop. v1.1 server-side will come up in Stage 03+ once MariaDB lands.
- **v1.1.0 not yet tagged.** Tag at end-of-v1.1 ship or after Stage 03 readiness.
- **Stage 03 (MariaDB Schema & Data Migration) starts next.** Cowork drafts the Stage 03a kickoff prompt - per CCC pipeline rules CC waits and does not interpret the concept doc on its own. Stage 03 will be the first v1.1 sub-stage to touch backend code.

---

## Next Actions

1. **Phet pushes to GitHub:** `git push github main` (covers all v1.1 stage commits and the /eod SHP commit).
2. **Cowork drafts the Stage 03a kickoff prompt** (`docs/handoff/stage03a-prompt.md`) covering the MariaDB schema + migration runner subset of Stage 03.
3. When ready: Phet runs `Read and execute docs/handoff/stage03a-prompt.md` against CC. CC will switch from UI-shell mode to backend mode - first time touching `migrations/` and a new `src/db.js`.
4. Continue using v1.0 sectioned test file format (saved feedback).
5. Build/deploy flow stays the same for any preview-side touches; for backend testing the test loop will move to a CCC v1.1 instance running on Dev-Web (not yet stood up).

---

*End of SHP. Build 47. Run `/continue` to resume.*
