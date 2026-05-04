# Session Handover Pack - CCC
*Generated: 2026-05-05 | Version: v1.1.0 (Stage 02b GO) | Stage 02c next*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Version:** v1.1.0 - Stage 02b (Locking Badge & "New" Group) complete on 2026-05-05. All 18 test items ticked, no comments.
- **Active version in projects.json:** "1.1.0".
- **Stage:** v1.1 Stage 02b GO. Next: Stage 02c - Top Menu Diodes (PatchPilot, Forgejo, GitHub indicators) + remove usage bar.
- **Status:** Wired design preview at `http://172.16.10.6/CCC/design-preview/` now renders `● Phet` / `● Anna` lock badges, `Start Session` button on every sub-project row (disabled state on locked rows), and the "New" group above "Active" with `analytics-service`. Mac CCC v1.0.7 still on Mac localhost:3000 (untouched).

---

## What Was Done This Session (Stage 02b)

### The deliverable
Three behaviours added to the Next.js design preview's `treeview-shell.tsx`:

1. **Lock badge format `● {DevName}`** - existing badge content changed from raw dev name to `● {DevName}` (U+25CF + space + name). Native `title` tooltip removed (deferred to Stage 06c). Styling unchanged: accent border, accent text, monospace.

2. **`Start Session` button** - new `StartSessionButton` component rendered on every sub-project row.
   - Unlocked: `1px solid t.border`, transparent bg, `t.textSecondary`, 9px mono, sharp corners (border-radius 0), padding `2px 6px`, hover bg `t.bgHover`.
   - Locked: same visual frame but opacity 0.4, cursor `not-allowed`, no-op onClick.
   - Click handler calls `e.stopPropagation()` so the parent row's expand toggle does not fire.
   - Stub onClick (`() => {}`) - real wiring is Stage 06.

3. **`Read only - Start Session disabled` italic text removed** - the disabled button now communicates this. The expand-time text block was deleted from `SubProjectRow`.

The "New" group already met spec from Stage 02a's render path (renders above Active, shows `analytics-service` with `unregistered` badge, no chevron, no progress bar) - no code change needed for Task 3.

### Key code added/changed
- `docs/v1.1/design/stage01a-dark-light/components/treeview-shell.tsx`:
  - **New component `StartSessionButton({ disabled, theme })`** with internal `useState(hover)`. Inline styles only (no Tailwind hover utilities since theme tokens are dynamic).
  - **`SubProjectRow` updated:**
    - Lock badge content: `{sub.lockedBy}` -> `● {sub.lockedBy}`
    - `title` attribute removed from lock badge
    - Wrapper `<div className="flex items-center gap-2 ml-auto">` introduced to right-align the lock badge + button cluster
    - `<StartSessionButton disabled={locked} theme={theme} />` appended after the lock badge
    - Italic "Read only - Start Session disabled" block deleted
- `docs/v1.1/design/preview/` - rebuilt static export (~50 file diffs, manifest hashes changed: `JYDaea3B6wcb2098tW46v` -> `e87MWa9QEYzIb8vTJgF_t`)
- `docs/v1.1/CCC_test_stage02b.md` - new test file in v1.0 sectioned format (### Section, step + outcome, `> Test comment` placeholders, footer). 18 items across 5 sections: Lock Badge, Start Session Unlocked, Start Session Locked, "New" Group, Themes & Console.
- `docs/v1.1/CCC_tasklist_v1.1.0.md` - all three Sub-Stage 02b items checked off.
- `docs/handoff/stage02b-prompt.md` - kickoff prompt (drafted by Cowork pre-session).

### Build flow (unchanged from 02a)
1. Source on share at `/mnt/sc-development/CCC/docs/v1.1/design/stage01a-dark-light/`
2. SSH to Dev-Web (`kkh01vdweb01.mng.mcsfam.local`)
3. `rsync -a --delete --exclude=node_modules --exclude=.next --exclude=out` to `/tmp/stage01a-build/`
4. `cd /tmp/stage01a-build && npm run build` (~6s on warm cache)
5. `rsync -a --delete /tmp/stage01a-build/out/ /mnt/sc-development/CCC/docs/v1.1/design/preview/`
6. Apache alias serves from `/mnt/sc-development/CCC/docs/v1.1/design/preview/` at `http://172.16.10.6/CCC/design-preview/`. No reload needed.

---

## Decisions Made

- **Lock badge tooltip (native `title`) removed.** The HTML `title` attribute is a tooltip - flagged in the prompt's "What NOT to build" (deferred to Stage 06c). Even though small, it counted.
- **`StartSessionButton` is a local component inside `treeview-shell.tsx`**, not extracted to its own file. Used in only one place; extraction would be premature.
- **Hover via `useState`, not Tailwind `hover:` classes.** Theme tokens are dynamic per dark/light, so Tailwind utility classes can't reach them. Inline style + `onMouseEnter`/`onMouseLeave` is the project's pattern.
- **Test file uses v1.0 sectioned structure.** Per memory feedback `feedback_test_file_format_v1_style.md` after Stage 02a's flat checklist was below standard. Sections + step/outcome + `> Test comment:` placeholders + footer.
- **Recovery file excluded from stage commit.** `docs/handoff/CCC_recovery.md` is auto-saved transient session state (per cumulative known gotchas list). It is currently tracked in git (legacy), but stage commits should not include its churn. Long-term: should be added to `.gitignore` and untracked, but that is a separate task.

---

## Full Project Timeline

| Commit | Description | Date |
|---|---|---|
| ... v1.0.0 - v1.0.7 ... | (see prior SHPs) | 2026-02-27 to 2026-04-24 |
| `ab9bee7` | v1.1.0 Stage 00a+00b - TrueNAS share mounted | 2026-05-04 |
| `5f5d03f` | v1.1.0 Stage 01f - wired design preview live at `/CCC/design-preview/` | 2026-05-04 |
| `fd0265b` | v1.1.0 Stage 02a - parent/sub-project hierarchy, version badges, resizable sidebar | 2026-05-04 |
| `a7292ed` | SHP update - Stage 02a GO, Stage 02b next | 2026-05-04 |
| `3749432` | **v1.1.0 Stage 02b** - locking badge `● DevName`, Start Session button, New group verified | 2026-05-05 |

Pushed to Forgejo. **GitHub push pending** for `a7292ed` and `3749432` - Phet to run `git push github main` from terminal (Bash tool can't reach macOS keychain).

Tags: `v1.0.0` -> `v1.0.7` on both remotes. v1.1.0 not yet tagged.

---

## Architecture & File Map (v1.1 active surface)

| Area | File / Path |
|---|---|
| Design preview source (Next.js 16) | `docs/v1.1/design/stage01a-dark-light/` |
| Treeview component (current edit target) | `components/treeview-shell.tsx` |
| App shell + resizable sidebar | `components/app-shell.tsx` |
| Theme tokens | `components/theme-context.tsx` |
| Dummy data | `lib/dummy-data.ts` |
| Static build output | `docs/v1.1/design/preview/` |
| Apache alias config | `/etc/apache2/conf-available/CCC-design-preview-alias.conf` (on Dev-Web, NOT in repo) |
| Stage 02b kickoff prompt | `docs/handoff/stage02b-prompt.md` |
| Stage 02b test file | `docs/v1.1/CCC_test_stage02b.md` |
| v1.1 tasklist | `docs/v1.1/CCC_tasklist_v1.1.0.md` |

---

## Frontend State Model (preview app, current)

- `app-shell.tsx`:
  - `sidebarWidth: number` (200-600), persisted to `localStorage["ccc-sidebar-width"]`, default 320
  - `dragging: boolean` - true while user is dragging the divider
- `treeview-shell.tsx`:
  - `ProjectRow.expanded` - `useState(expandedByDefault)`. `expandedByDefault = project.id === "leadsieve" || project.id === "orion"`. Other projects collapsed.
  - `SubProjectRow.expanded` - `useState(sub.id === "leadsieve-service")` (only LeadSieve service starts expanded to demo file children).
  - `StartSessionButton.hover` - `useState(false)`, toggled by `onMouseEnter`/`onMouseLeave`. Drives background colour swap.
  - `filteredActive` and `filteredParked` flow through shared `filterProjects(list)` helper. Filter matches parent name OR sub-project name; keeps parents whose children matched.

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

CCC server: unchanged from v1.0.7. Next.js preview app: unchanged dependency set (Next.js 16.2.4, React 19, shadcn/ui, lucide-react). No new packages added in 02b.

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
9. **Recovery file is auto-saved transient session state**, not committed. Currently tracked in git (legacy) - exclude from stage commits manually.
10. **Hover styles in this codebase use `useState`, not Tailwind hover classes.** Because theme tokens are dynamic, Tailwind hover utilities cannot reference them.
11. **Click handlers on row-internal elements need `e.stopPropagation()`** - the parent row has an onClick that toggles expand. Without `stopPropagation`, button clicks expand/collapse the row.

---

## Open Items / Carry-Forwards

- **GitHub push pending** for `a7292ed` and `3749432` - Phet to run `git push github main` from terminal.
- **Recovery file should be untracked.** It is committed legacy. Add to `.gitignore` and `git rm --cached` it - small task, do when convenient.
- **Apache alias not version-controlled** - still needs to be captured in a deploy.sh or infrastructure doc later.
- **Stage 02c next** - Top Menu Diodes (PatchPilot, Forgejo, GitHub) + remove usage bar from top menu. Cowork drafts the kickoff prompt. Source files for 02c will be `app-shell.tsx` (top menu) - currently on the no-touch list for 02b but in scope for 02c.
- **CCC v1.1 instance on Dev-Web** - no longer needed for the preview test loop. Any leftover PID likely gone.
- **Carry-forwards from prior sessions:** Mac SMB no fstab entry; `_SC-Development` 6.2GB local backup still kept; Mac CCC v1.0.7 untouched on production.

---

## Next Actions

1. Phet pushes to GitHub: `git push github main` (covers `a7292ed` + `3749432`).
2. Begin **Stage 02c (Top Menu Diodes)** when ready. Cowork drafts the kickoff prompt targeting `app-shell.tsx` (or wherever the top menu lives in the design preview source - confirm before sending).
3. Continue using v1.0 sectioned test file format (saved feedback).
