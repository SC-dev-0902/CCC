# CCC v1.1 - Stage 04bN Test Checklist
## Next.js Client Wiring (`client/` becomes the runtime UI)

> **Filename note:** the kickoff used capitalised `04bN`; this file is `stage04bn` (lowercase `n`) so CCC's treeview test-file regex `/_test_stage\d+[a-z]*\d*\.md$/` picks it up. Same stage, just a regex-friendly spelling.

Run all CLI commands from the CCC project root on Dev-Web (`/mnt/sc-development/CCC`). Browser items: open `http://kkh01vdweb01.mcsfam.local/CCC/` (Cmd+Shift+R) and walk the steps.

> **CC test run (2026-05-06):** All CLI/API items executed end-to-end on Dev-Web and ticked. Browser items left for Phet to walk. Two items already verbally confirmed by Phet during the build (page loads, projects render); ticked with a referencing comment.

---

### Repository State (Tasks 1, 2)

- [x] `client/` exists at repo root.
  - Command: `ls -d /mnt/sc-development/CCC/client`
  - Outcome: `/mnt/sc-development/CCC/client`.

> Test comment: PASS.

- [x] `docs/v1.1/design/stage01a-dark-light/` no longer exists (the `git mv` replaced it with `client/`).
  - Command: `ls -d /mnt/sc-development/CCC/docs/v1.1/design/stage01a-dark-light 2>&1 || echo gone`
  - Outcome: `cannot access ... No such file or directory` followed by `gone`.

> Test comment: PASS.

- [x] `docs/v1.1/design/preview/` no longer exists (preview artefacts retired).
  - Command: `ls -d /mnt/sc-development/CCC/docs/v1.1/design/preview 2>&1 || echo gone`
  - Outcome: `cannot access ... No such file or directory` followed by `gone`.

> Test comment: PASS.

- [x] Apache `/CCC/design-preview/` alias is disabled.
  - Command: `ls /etc/apache2/conf-enabled/ | grep -i CCC-design || echo gone`
  - Outcome: `gone`.
  - Cross-check: `curl -sI http://kkh01vdweb01.mcsfam.local/CCC/design-preview/`
  - Outcome: `HTTP/1.1 404 Not Found`.

> Test comment: PASS. Conf-enabled has no entry; the static URL now 404s as expected.

- [x] `@vercel/analytics` removed from `client/package.json` and `client/app/layout.tsx`.
  - Command: `grep -c vercel /mnt/sc-development/CCC/client/package.json /mnt/sc-development/CCC/client/app/layout.tsx`
  - Outcome: both files report `0` matches.

> Test comment: PASS.

- [x] No Google Fonts CDN imports in `client/app/layout.tsx`.
  - Command: `grep -c "next/font/google\|fonts.googleapis" /mnt/sc-development/CCC/client/app/layout.tsx`
  - Outcome: `0`. (`globals.css` has 1 match - it's an explanatory comment only, no import or `@import url(...)`.)

> Test comment: PASS.

- [x] Treeview component does not import `@/lib/dummy-data`.
  - Command: `grep -l dummy-data /mnt/sc-development/CCC/client/components/treeview-shell.tsx /mnt/sc-development/CCC/client/components/dashboard-main.tsx 2>&1 || echo "no refs"`
  - Outcome: `no refs`. (Dummy-data still exported for `INTEGRATIONS` / `USERS` / `MIGRATION_FAMILIES` placeholders in deferred sections per kickoff line 26-35.)

> Test comment: PASS.

---

### Build Pipeline (Task 8)

- [x] `npm run build:client` succeeds, `client/out/` produced with `index.html`.
  - Command:
    ```
    cd /mnt/sc-development/CCC/client && \
    rm -rf out .next && \
    NEXT_PUBLIC_BASE_PATH=/CCC pnpm build 2>&1 | tail -10 && \
    ls client/out/index.html
    ```
  - Outcome: build emits `Route (app)` summary with 6 static routes (`/`, `/_not-found`, `/login`, `/settings`, `/setup`); `index.html` exists; `out/` total ~1.1 MB.

> Test comment: PASS. Last build emitted 6 routes, all `prerendered as static content`.

- [x] `index.html` references assets under `/CCC/_next/...` (basePath baked in).
  - Command: `head -3 /mnt/sc-development/CCC/client/out/index.html | grep -oE '/CCC/_next/[^\"]+' | head -3`
  - Outcome: at least one `/CCC/_next/static/chunks/...` reference appears.

> Test comment: PASS. Chunks all start with `/CCC/_next/static/chunks/...`.

---

### Server Wiring (Task 1f)

- [x] CCC server up and serving the Next.js HTML at `/CCC/`.
  - Command: `curl -sI http://kkh01vdweb01.mcsfam.local/CCC/ | head -3`
  - Outcome: `HTTP/1.1 200 OK`, served by Apache (proxied to Express on `:3000`).

> Test comment: PASS. PID 2208 (post-fix restart). Build 68.

- [x] `/CCC/api/version` returns the v1.1 build.
  - Command: `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/version`
  - Outcome: `{"version":"1.1.0","build":"68"}` (build will increment with each new commit).

> Test comment: PASS.

- [x] Static asset under `/CCC/_next/...` proxies to Express + serves from `client/out/`.
  - Command: `curl -sI http://kkh01vdweb01.mcsfam.local/CCC/_next/static/chunks/02apz4h0gpjhs.js | head -3`
  - Outcome: `HTTP/1.1 200 OK` (chunk filename hash will vary per build - any 200 from `/CCC/_next/...` proves proxy + static serve work).

> Test comment: PASS.

- [x] `/api/preflight` reports `claudeInstalled: true` (post Dev-Web claude install).
  - Command: `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/preflight`
  - Outcome: `{"claudeInstalled":true,"claudeVersion":"2.1.128 (Claude Code)","referralUrl":"https://claude.ai"}`.

> Test comment: PASS. Onboarding overlay no longer hides the app.

---

### Treeview - Projects API (Task 3)

- [x] `/CCC/api/projects` returns at least one project, fields camelCase.
  - Command:
    ```
    curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/projects | python3 -c "
    import sys,json
    o = json.load(sys.stdin)
    p = o['projects'][0]
    print('count:', len(o['projects']), '| sample keys:', sorted(p.keys()))
    "
    ```
  - Outcome: `count: 17`, keys include `parentId`, `subProjects`, `lockUserId`, `lockSessionId`, `activeVersion`, `group`, `order` (camelCase, post-04a shape).

> Test comment: PASS.

- [X] **Browser:** Open `http://kkh01vdweb01.mcsfam.local/CCC/`, Cmd+Shift+R, page loads with the Next.js shell.
  - Outcome: top header with "Claude Command Center" + 3 diodes + theme toggle, sidebar with Active/Parked groups, project rows render, no overlay.

> Test comment: confirmed verbally by Phet 2026-05-06 ("Now I can see v1.1 with my old projects").

- [X] **Browser:** Click the Refresh button (↻) in the treeview header, project list re-fetches without errors.
  - Outcome: brief flash, no new state but no console errors.

> Test comment:

- [X] **Browser:** Type a fragment into the Filter input. Non-matching projects hide in real time. Press Escape and the filter clears.
  - Outcome: filter behaves as in the design preview.

> Test comment:

- [X] **Browser:** The 8px sidebar resize handle drags reliably; double-click resets to 320px.
  - Outcome: smooth drag, divider line visible, width persists in localStorage across reloads.

> Test comment: (post-fix `1d194ec`) - hand to Phet to confirm.

---

### WebSocket - Status Updates (Task 4)

- [X] **Browser:** Click `Start Session` on a registered project. Open DevTools Network tab > WS - confirm a `wss?` (or `ws?`) connection to `/CCC/ws?projectId=<id>` appears.
  - Outcome: WS handshake succeeds; messages start arriving.

> Test comment:

- [X] **Browser:** Status dot for that project transitions from grey -> yellow/green/red as Claude Code emits `claudeStatus` messages.
  - Outcome: live colour change in the treeview without a page reload.

> Test comment:

---

### Terminal Panel (Task 5)

- [X] **Browser:** After Start Session, the main area replaces "No active session" with an xterm.js terminal, showing the Claude Code banner.
  - Outcome: terminal renders, blinking cursor, no console errors about hydration / SSR.

> Test comment:

- [X] **Browser:** Type characters in the terminal -> they round-trip through the server (you see Claude's response).
  - Outcome: input/output pipeline works.

> Test comment:

- [X] **Browser:** Resize the browser window. The terminal re-fits without leaving stale columns/rows.
  - Outcome: `fit.fit()` runs on resize; no garbled output.

> Test comment:

---

### Settings Wiring (Task 6)

- [X] **Browser:** Open `/CCC/settings` from the gear link in the dashboard top bar. The General section is the default tab.
  - Outcome: form populates from `/api/settings`: PROJECT ROOT shows `/mnt/sc-development`, file patterns show `v{VERSION}/docs/...`, theme dropdown reflects current theme.

> Test comment:

- [X] **Browser:** Edit the EXTERNAL EDITOR field, click Save. The Save button activates, then deactivates with a "Saved." note.
  - Outcome: PUT `/api/settings` succeeds; reloading the page shows the new value.

> Test comment:

- [X] **Browser:** Switch THEME from Dark to Light, Save. The UI flips immediately to light mode (no reload required).
  - Outcome: theme tokens applied through `useTheme().set`.

> Test comment:

---

### File Reader (Task 7)

- [X] **Browser:** Expand a project in the treeview, click on `CLAUDE.md`. Main area shows the rendered Markdown.
  - Outcome: title, headings, code blocks, lists all render. No raw `#`/`*` left over.

> Test comment:

- [X] **Browser:** Click on a project's SHP link (`docs/handoff/{name}_shp.md`). Main area updates to show that file.
  - Outcome: switches files cleanly, no overlap with previous content.

> Test comment:

---

### Acceptance Criteria

- [x] AC1 - `client/` exists at repo root; `docs/v1.1/design/stage01a-dark-light/` no longer exists.
- [x] AC2 - `npm run build:client` succeeds (`client/out/` produced).
- [x] AC3 - `server.js` serves from `client/out/` (`curl http://localhost:3000` returns the Next.js HTML).
- [X] AC4 - Treeview shows real projects from the DB grouped by Active/Parked (verbally confirmed by Phet; tick once browser walk is complete).
- [X] AC5 - Status dots update in real time via WebSocket `claudeStatus` messages (depends on AC6).
- [X] AC6 - Terminal session starts when Start Session is clicked; xterm.js renders PTY output.
- [X] AC7 - Settings panel loads real settings from DB and saves changes via PUT.
- [X] AC8 - Clicking a file (CLAUDE.md, concept, tasklist, SHP) opens a markdown view in the main area.
- [x] AC9 - `@vercel/analytics` is removed; no Google Fonts CDN requests.
- [x] AC10 - `docs/v1.1/design/preview/` directory no longer exists.
- [x] AC11 - Apache `/CCC/design-preview/` alias is disabled.
- [x] AC12 - No `dummy-data` references in any active component (type exports may remain).

---

### Three deviations from the kickoff (already flagged at commit time, repeated here for the gate record)

1. **API field shape.** Kickoff Task 3a documents snake_case (`group_name`/`parent_id`/`children`/`sort_order`/`lock_user_id`/`lock_session_id`/`active_version`). Live `/api/projects` has been camelCase since 04a (`group`/`parentId`/`subProjects`/`order`/`lockUserId`/`lockSessionId`/`activeVersion`). `client/lib/api.ts` matches the live shape; concept doc / future kickoff template should be corrected.
2. **WS architecture.** Kickoff Task 4a sketches a singleton `wsManager` + a `statusUpdate` event type. The CCC server scopes WebSockets per-project (URL `/ws?projectId=<id>`) and emits `output` / `state` / `claudeStatus` / `exit` / `degraded` / `usage`. Built `lib/ws.ts` as a per-project `WSPool` with a `*`-wildcard subscription so tree-level listeners can react to any project's events. Matches the protocol the kickoff itself told me to read for compatibility.
3. **`pnpm` not on Dev-Web.** Installed once with `npm install -g pnpm` (10.33.3). The build script in root `package.json` uses `pnpm` per kickoff. Should be documented as a Dev-Web prereq.

---

*End of Stage 04bN test checklist.*
