# CCC_tasklist.md — v1.0.1
*Derived from: docs/v1.0/v1.0.1/CCC_concept.md*
*Stage gate process: each stage ends with Go/NoGo before next stage begins*

---

## Stage 01 — Bug #3: Import Overwrite Protection (CRITICAL)
**Focus:** Prevent import scaffolding from overwriting existing project files

### Tasks
- [ ] Read `server.js` — locate `POST /api/scaffold-import` endpoint and all file-write operations
- [ ] Add per-file existence checks before every scaffolded file write (concept doc, tasklist, CLAUDE.md, `.ccc-project.json`, slash commands)
- [ ] If file exists → skip it, do not overwrite, rename, or touch
- [ ] If file does not exist → scaffold as before
- [ ] Log which files were scaffolded vs skipped (server console)
- [ ] Test: import a project that already has a `*_concept.md` — verify it is preserved unchanged
- [ ] Test: import a project with no CCC files — verify all templates are scaffolded

### Go/NoGo Gate
> Can a project with existing docs be imported without any file being overwritten? Does a blank project still get full scaffolding?

**→ GO:** Proceed to Stage 02
**→ NOGO:** Revise file-check logic

---

## Stage 02 — Bug #2: Import Wizard Parity with New Project Wizard
**Focus:** Imported projects must be structurally identical to wizard-created projects

### Tasks
- [ ] Read `server.js` — locate `POST /api/scaffold-project` (New Project Wizard) to understand target output
- [ ] Compare scaffold-project output vs scaffold-import output — document differences
- [ ] Add version field to Import Wizard UI (text input, e.g. "1.0", "0.5") — default "1.0"
- [ ] Update `POST /api/scaffold-import` to scaffold `docs/vX.Y/` folder structure using the specified version
- [ ] Place concept template in version folder if missing (respecting Bug #3 overwrite protection)
- [ ] Place tasklist template in version folder if missing (respecting Bug #3 overwrite protection)
- [ ] Place CLAUDE.md template at project root if missing (respecting Bug #3 overwrite protection)
- [ ] Set `activeVersion` on the project record to match the specified version
- [ ] Update `coreFiles` paths to point to the version folder (e.g. `docs/v1.0/ProjectName_concept.md`)
- [ ] Verify tree view shows full hierarchy after import: project → versions → docs
- [ ] Test: import a project with version "0.5" — verify folder is `docs/v0.5/`, tree shows hierarchy
- [ ] Test: import a project with existing `docs/v1.0/` — verify existing files are preserved, missing files are scaffolded

### Go/NoGo Gate
> Is an imported project visually and structurally indistinguishable from a wizard-created project in both tree view and filesystem?

**→ GO:** Proceed to Stage 03
**→ NOGO:** Align import output with wizard output

---

## Stage 03 — Bug #1: /evaluate-import Notice
**Focus:** Persistent UI notice for unevaluated imported projects

### Tasks
- [ ] Audit existing `evaluated` flag implementation — check what post-ship polish already implemented
- [ ] Verify `"evaluated": false` is set on ALL imports, regardless of whether concept doc exists
- [ ] Remove auto-clear logic from `GET /api/projects/:id/versions` — flag only clears via API
- [ ] Add `POST /api/projects/:id/evaluated` endpoint — sets flag to `true`
- [ ] Update `/evaluate-import` command with Mode A (generate) and Mode B (audit) flows
- [ ] `/evaluate-import` calls `curl POST /api/projects/:id/evaluated` at completion
- [ ] Verify persistent UI notice: "Run `/evaluate-import` in your Claude Code session before starting work."
- [ ] Verify notice disappears only after API endpoint is called
- [ ] Verify orange traffic light dot for unevaluated projects
- [ ] Document which parts were already working vs needed fixing

### Go/NoGo Gate
> Does importing any project show the evaluate notice, and does the notice only clear via the explicit API call after `/evaluate-import` completes?

**→ GO:** Proceed to Stage 04
**→ NOGO:** Fix notice lifecycle

---

## Stage 04 — Bug #4: SHP Safety Net
**Focus:** Prevent SHP loss on browser close — two layers of defence

### Tasks
- [ ] Implement Layer 1: `beforeunload` event — warn when active terminal sessions exist
- [ ] Only trigger when at least one session is running — no sessions, no warning
- [ ] Implement Layer 2: periodic recovery auto-save (terminal scrollback capture)
- [ ] Capture xterm.js scrollback text via `buffer.active.getLine().translateToString()`
- [ ] Write to `docs/{ProjectName}_recovery.txt` — never touch the SHP file
- [ ] Recovery file overwritten on each periodic save
- [ ] Add `recoveryInterval` setting (default 5 minutes) to Settings panel and server defaults
- [ ] Timer starts on app init, restarts on settings save
- [ ] Auto-save only runs for active sessions, silent fail on errors
- [ ] Update `/continue` command: check both SHP and recovery file, compare timestamps, use newer
- [ ] Update `/eod` command: delete recovery file after SHP is written
- [ ] Test: close browser tab with active session → beforeunload warning appears
- [ ] Test: recovery file created at configured interval
- [ ] Test: no warning and no recovery save when no sessions active

### Go/NoGo Gate
> Does the browser warn before closing with active sessions? Does periodic recovery save capture terminal scrollback?

**→ GO:** Proceed to Stage 05
**→ NOGO:** Revise safety layers

---

## Stage 05 — Improvement #5: Auto-run /continue
**Focus:** Automatically inject /continue when reopening a project with an existing SHP

### Tasks
- [ ] On Claude Code session start, check if `docs/{ProjectName}_shp.md` or `_recovery.txt` exists
- [ ] If either exists → set `pendingContinue` flag on terminal instance
- [ ] On first `claudeStatus` of `WAITING_FOR_INPUT` or `COMPLETED`, inject `/continue\r` after 500ms delay
- [ ] Clear flag immediately to prevent re-injection
- [ ] No injection for shell sessions
- [ ] If neither SHP nor recovery file exists → do nothing (developer runs `/start-project` manually)
- [ ] Test: start session for project with SHP → `/continue` automatically sent
- [ ] Test: start session for project without SHP → nothing injected
- [ ] Test: shell session with SHP → nothing injected

### Go/NoGo Gate
> Does CCC auto-inject `/continue` reliably when an SHP exists, and stay silent when it doesn't?

**→ GO:** Proceed to Stage 06
**→ NOGO:** Fix injection timing or detection

---

## Stage 06 — Bug #6: New Version Dialog Alignment
**Focus:** Fix visual misalignment of select options in New Version dialog

### Tasks
- [ ] Read `public/styles.css` and `public/app.js` — locate New Version dialog markup and styles
- [ ] Identify the misaligned select/radio elements
- [ ] Fix alignment so options sit directly under their label text
- [ ] Match alignment style used in New Project Wizard and Import Wizard dialogs
- [ ] Visual check: compare New Version dialog with other CCC dialogs for consistency

### Go/NoGo Gate
> Are the New Version dialog options properly aligned and visually consistent with other CCC dialogs?

**→ GO:** Proceed to Stage 07
**→ NOGO:** Fix alignment

---

## Stage 07 — Improvement #7: Usage Status Bar ✅ GO
**Focus:** Show Claude Code usage limits in a persistent status bar

### Implementation (revised from original plan)
- [x] Created `src/usage.js` — scans `~/.claude/projects/` JSONL files directly (not parser-based)
- [x] Token counting matches claude-monitor algorithm: `input_tokens + output_tokens` only (no cache)
- [x] Deduplication by `message_id:request_id` (first occurrence wins)
- [x] 5-hour billing window with hour-rounded block start
- [x] 7-day weekly totals with custom budget support
- [x] `GET /api/usage` endpoint + 30-second WS broadcast
- [x] Always-visible status bar at bottom of main panel (same height as Settings footer)
- [x] Bar shows empty structure with placeholders until session starts and data arrives
- [x] 5h section: progress bar, percentage, reset timer, message count
- [x] 7d section: progress bar, percentage, token/message counts against custom budget
- [x] Colour thresholds: blue < 80%, amber >= 80%, red >= 95%
- [x] Settings: Claude Code Plan dropdown, Weekly Token Budget, Weekly Message Budget
- [x] Version updated to v1.0.1

### Go/NoGo Gate — **GO** (2026-03-06)

---

## Post-Completion
- [ ] Update CLAUDE.md if any architectural changes were made
- [ ] Git tag `v1.0.1`
- [ ] Push to both remotes (Forgejo + GitHub)
- [ ] Ask Phet about changelog update

---

*Fix order: Bug #3 → Bug #2 → Bug #1 → Bug #4 → Improvement #5 → Bug #6 → Improvement #7*
*For full patch context, see docs/v1.0/v1.0.1/CCC_concept.md*
