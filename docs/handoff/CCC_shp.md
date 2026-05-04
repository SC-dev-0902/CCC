# Session Handover Pack — CCC
*Generated: 2026-05-04 | Version: v1.1.0 (Stage 01 GO) | Stage 02 next*

---

## Project

- **Name:** Claude Command Center (CCC)
- **Version:** v1.1.0 — **Stage 01 (UI Design) complete on 2026-05-04**. All sub-stages 01a-01f done.
- **Active version in projects.json:** "1.1.0" (was "1.1" before this session — corrected by Phet to align with versioned filename convention)
- **Stage:** v1.1 Stage 01 GO. Next: Stage 02 — UI Shell. Implementation work begins on top of the wired design preview.
- **Status:** Wired design preview is live at http://172.16.10.6/CCC/design-preview/. Mac CCC v1.0.7 still running on Mac localhost:3000 (production). CCC v1.1 instance running on Dev-Web (PID 3864 at session end, port 3000).

---

## What Was Done This Session (Stage 01f)

### The deliverable
A **fully-wired Next.js design preview** of the v1.1 UI, served via Apache on Dev-Web at `http://172.16.10.6/CCC/design-preview/`. Five routes — dashboard `/`, login `/login`, setup `/setup`, settings `/settings` — sharing one persistent app shell (header with three diodes + theme toggle, tab bar, live treeview sidebar, main content area). Theme toggle is global (sun/moon icon, persists to localStorage). Dummy data inline. All form inputs are real React state, treeview filter/expand/lock-tooltip works, in-context modals (project edit, register dialog, watchdog banner, reconnecting banner) trigger from a "preview controls" strip in the dashboard.

### Scope evolution mid-stage
The 01f kickoff prompt (`docs/handoff/stage01f-prompt.md`) asked for a screenshot-gallery preview — single static `index.html` with embedded screenshots for sub-stages 01b-01e plus the live 01a Next.js component. CC built that first. Phet rejected it: "the page has to be the framework for our coding ... fully wired site with the screenshots as guideline (dummy data for now is fine)". The deliverable was redone from scratch as the wired multi-route Next.js site.

Tech stack decision: Approach A (extend the existing 01a Next.js app with new pages/components for 01b-01e) rather than vanilla JS. Implication: Stage 02+ will need to translate React → CCC's actual Vanilla JS production frontend.

### Key code added/changed in 01f
- `docs/v1.1/design/stage01a-dark-light/next.config.mjs` — added `output: 'export'`, `basePath: '/CCC/design-preview'`, `trailingSlash: true`
- `docs/v1.1/design/stage01a-dark-light/app/` — new pages: `page.tsx` (rewrote to use AppShell), `login/page.tsx`, `setup/page.tsx`, `settings/page.tsx`
- `docs/v1.1/design/stage01a-dark-light/components/`:
  - NEW: `theme-context.tsx` (ThemeProvider + useTheme + tokens helper)
  - NEW: `app-shell.tsx` (header + tab bar + sidebar + main slot)
  - NEW: `dashboard-main.tsx` (terminal placeholder + preview-control triggers)
  - NEW: `treeview-shell.tsx` (live filterable treeview)
  - NEW: `auth-card.tsx` (SignInCard, CreateAdminCard)
  - NEW: `settings-shell.tsx` (3-section settings + 4-step migration tool)
  - NEW: `component-gallery.tsx` (modals + banners — used in-context, not in a gallery page anymore)
  - DELETED: `ccc-dashboard.tsx`, `top-menu-shell.tsx`, `page-frame.tsx` (gallery-style)
- `docs/v1.1/design/stage01a-dark-light/lib/dummy-data.ts` — projects, users, integrations, migration families
- `docs/v1.1/design/preview/` — built static export (52 → ~80 files, all under basePath `/CCC/design-preview`)
- `server.js:24` — added `app.use('/design-preview', express.static(...))`. Active for any CCC instance running from this codebase.
- `docs/v1.1/CCC_test_stage01f.md` — 41-item test checklist, all marked [x] by Phet
- `.gitignore` — added `.next/` and `.smbdelete*`

### Apache (Dev-Web, outside repo)
- Created `/etc/apache2/conf-available/CCC-design-preview-alias.conf`:
  ```apache
  RewriteEngine On
  RewriteRule ^/CCC/design-preview$ /CCC/design-preview/ [PT,L]
  Alias "/CCC/design-preview" "/mnt/sc-development/CCC/docs/v1.1/design/preview/"
  <Directory "/mnt/sc-development/CCC/docs/v1.1/design/preview">
      Options FollowSymLinks
      AllowOverride All
      Require all granted
  </Directory>
  ```
- `a2enconf CCC-design-preview-alias`, `systemctl reload apache2` — done.

### Build flow
1. Source on share at `/mnt/sc-development/CCC/docs/v1.1/design/stage01a-dark-light/`
2. rsync to Dev-Web local `/tmp/stage01a-build/` (excluding node_modules/.next/out)
3. `npm install && npm run build` on /tmp (ext4 — fast: ~2 min install first time, <1s cached; ~6s build)
4. rsync `/tmp/stage01a-build/out/` → `/mnt/sc-development/CCC/docs/v1.1/design/preview/`
5. Apache alias serves it at `http://172.16.10.6/CCC/design-preview/`

Building directly on the share would be slow due to NFS small-file write overhead; building on Dev-Web local /tmp keeps install + build fast.

---

## Decisions Made

- **Approach A (extend Next.js).** All wired 01b-01e components live inside the same Next.js app at `docs/v1.1/design/stage01a-dark-light/`, sharing SC tokens, Inter font, theme context. Stage 02 implementation will translate React → vanilla JS for production CCC frontend.
- **Build on Dev-Web /tmp, deploy to share.** Faster than building on the share. Single rsync afterward. Both Mac (SMB) and Dev-Web (NFS) see the same `preview/` content.
- **Dummy data inline in `lib/dummy-data.ts`.** Swappable later when real APIs exist.
- **Theme toggle persists to localStorage.** Whole app (header, sidebar, main, modals, banners) follows.
- **CCC v1.1 instance started on Dev-Web** for the 01f test (`nohup env PORT=3000 node server.js`, PID 3864). Mac CCC v1.0.7 untouched on localhost:3000 (production).
- **"No localhost for v1.1" rule.** Saved to memory. v1.1 lives entirely on Dev-Web; v1.0 stays on Mac for daily use.
- **"Design preview = wired framework, not screenshots" rule.** Saved to memory. Future preview stages must produce wired code, not image galleries.

---

## Full Project Timeline

| Commit | Description | Date |
|---|---|---|
| ... v1.0.0 - v1.0.7 ... | (see prior SHP) | 2026-02-27 to 2026-04-24 |
| `ab9bee7` | **v1.1.0 Stage 00a+00b** — TrueNAS share mounted (Mac SMB + Dev-Web NFS), v1.1 concept/tasklist added | 2026-05-04 |
| (this commit) | **v1.1.0 Stage 01f** — wired design preview at /CCC/design-preview/, basePath Next.js, Apache alias | 2026-05-04 |

Tags pushed to both remotes: `v1.0.0` → `v1.0.7`. v1.1.0 not yet tagged (will be when v1.1 ships).

---

## Architecture & File Map (v1.1 additions only — see prior SHP for v1.0)

| Area | File / Path |
|---|---|
| Design preview source | `docs/v1.1/design/stage01a-dark-light/` (Next.js 16 with Turbopack) |
| Design preview build output | `docs/v1.1/design/preview/` (static HTML, ~80 files, basePath `/CCC/design-preview`) |
| Screenshots (visual reference for Stage 02 implementation) | `docs/v1.1/design/stage01-*.png` (11 files) |
| Static route in CCC's Express | `server.js:24` |
| Apache alias config | `/etc/apache2/conf-available/CCC-design-preview-alias.conf` (on Dev-Web, NOT in repo) |
| Stage 01f kickoff prompt | `docs/handoff/stage01f-prompt.md` |
| Stage 01f test file | `docs/v1.1/CCC_test_stage01f.md` |

---

## Frontend State Model (preview app)

- `theme` — ThemeContext, dark | light. localStorage key `ccc-theme`. `<html class="dark">` toggled.
- `activeTabId` (dashboard) — string. Three default tabs: leadsieve, ccc, settings.
- Dashboard preview-controls flags: `editOpen`, `registerOpen`, `watchdog`, `reconnecting`.
- Treeview internal state: `query` (filter), per-row `expanded` flags.
- Settings-shell: `section` (Integrations | User Management | Migration Tool), `step` (0-3).

---

## Apache & Deployment

### v1.1 design preview (live)
- URL: http://172.16.10.6/CCC/design-preview/
- Static via Apache `Alias` → `/mnt/sc-development/CCC/docs/v1.1/design/preview/`
- Updates: rebuild on Dev-Web `/tmp/stage01a-build/`, rsync `out/` → preview/. No Apache reload needed.

### CCC v1.1 Express instance (also running for 01f, but the preview itself is Apache-served)
- Started by `cd /mnt/sc-development/CCC && nohup env PORT=3000 node server.js > /tmp/ccc-v1.1.log 2>&1 &`
- PID at session end: 3864 (will not survive Dev-Web reboot)
- Stop with: `pkill -f "node server.js"` on Dev-Web

### Mac CCC v1.0.7 (production, unchanged)
- localhost:3000, PID 86709 at session end
- Untouched this session

---

## Dependencies

CCC server: unchanged from v1.0.7. Next.js preview app uses its own `package.json` at `docs/v1.1/design/stage01a-dark-light/`:
- Next.js 16.2.4 (Turbopack)
- React 19, React DOM 19
- shadcn/ui components (existing from V0 source)
- lucide-react icons

`node_modules/` is present on the share but `.gitignore`d. `.next/` is now also `.gitignore`d.

---

## Known Gotchas (additions for v1.1)

1. **Building on the share is slow over NFS** — small-file writes to TrueNAS via NFS take many minutes. Always build on Dev-Web local `/tmp` and rsync `out/` to the share.
2. **Building on Mac SMB is much slower still** (~30+ min for npm install of a Next.js app vs 2 min on Dev-Web ext4). Don't.
3. **Next.js `basePath: '/CCC/design-preview'`** must be in `next.config.mjs`. Without it, the static export's absolute `/_next/...` URLs break under Apache alias (404). All client links must respect basePath (Next.js's `<Link>` does this automatically).
4. **`pnpm: not found` warning at end of `npm run build`** — non-fatal post-build script trying pnpm; ignore.
5. **No deploy.sh for the preview** — preview lives on the share, accessed by both Mac and Dev-Web at the same path. "Deploy" = rsync out/ to preview/.
6. **server.js `/design-preview` Express route is now redundant** for the live URL (Apache serves the static folder directly), but kept in code so any CCC running from this codebase has the route. Remove only if it conflicts with future routing.
7. **Apache config `CCC-design-preview-alias.conf` is not in the CCC repo** — it lives on Dev-Web at `/etc/apache2/conf-available/`. If Dev-Web is rebuilt, recreate it from the SHP.
8. **DNS:** `kkh01vdweb01.mcsfam.local` does NOT resolve from Mac (only `.mng.` does). Use the IP `172.16.10.6` or the .mng. hostname for Mac → Dev-Web service URLs until SRV-LAN DNS is configured.

---

## Open Items / Carry-Forwards

- **GitHub push pending** — local Bash tool can't reach the macOS keychain for git credentials. Phet to push to GitHub manually after the Forgejo push completes: `git push github main`.
- **CCC v1.1 instance on Dev-Web is a manual nohup job, not a service** — Stage 14 will turn this into a systemd service. For now, manual restart needed across reboots.
- **Apache alias is not version-controlled** — needs documenting in deploy.sh later or in CCC's own infrastructure docs.
- **Stage 02 (UI Shell)** — implementation work begins. The wired Next.js preview is the visual contract; Stage 02 ports it into CCC's actual production frontend (Vanilla JS per concept doc §10). React-to-vanilla translation will be the bulk of Stage 02.
- **Carry-forwards from prior sessions:** Mac SMB no fstab entry (manual remount after reboot); `_SC-Development` 6.2GB local backup still kept; GitHub credential refresh; PM2 / Leadsieve / Mac CCC restart per Stage 00.

---

## Next Actions

1. (After this commit) Phet pushes to GitHub from terminal: `git push github main`.
2. Begin **Stage 02 (UI Shell)** when ready. Cowork drafts the kickoff prompt for Stage 02a or similar — the actual implementation work in CCC's vanilla JS frontend, using the wired Next.js preview as the visual contract.
3. CCC v1.1 instance on Dev-Web can be left running or stopped — no longer required for design review since Apache serves the preview. If left running, keep PID 3864 noted.
