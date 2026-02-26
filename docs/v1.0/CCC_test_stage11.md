# CCC — Stage 11 Test Checklist
## Resilience & Polish

Test each item below. Tick when passed, add comments if something needs fixing.

---

### Wave 1: Backend Resilience

**1a. Missing projects.json (first run)**
- [x] Stop CCC. Delete `data/projects.json`. Start CCC. Server starts without error.
  > Test comment
- [x] `data/projects.json` is auto-created with `Active` and `Parked` groups, empty projects array.
- [x] Browser loads normally — tree view shows empty Active/Parked groups.

**1b. Missing settings.json (first run)**
- [x] Stop CCC. Delete `data/settings.json`. Start CCC. Server starts without error.
- [x] `data/settings.json` is auto-created with defaults (theme: dark, editor: open, etc.).
- [x] Settings panel loads and shows default values.

**1c. Port conflict**
- [x] Start CCC normally on port 3000. In a second terminal, run `PORT=3000 node server.js`.
- [x] Second instance prints clear error: port 3000 in use, advice to change PORT, then exits.
- [x] First instance is unaffected.

**1d. Invalid project paths**
- [x] Register a project, then manually edit `data/projects.json` to set its path to a non-existent directory.
- [x] Open the project tab — "No active session" prompt appears (no crash).
- [x] Click "Start Claude Code" — toast error appears (not a browser alert), no crash.
- [x] Click a core file in the tree — read panel shows "Project directory does not exist" error.

---

### Wave 2: Session Crash Recovery

- [x] Open a project tab. Start a shell session (`Open Shell`).
- [x] In the terminal, type `exit` and press Enter. Session ends.
- [x] Terminal content (scroll history) remains visible — not replaced with a blank screen.
- [x] A restart bar appears at the bottom: "Session ended." with two buttons.
- [x] Click "Restart Claude Code" — old terminal disappears, new Claude Code session starts.
- [x] Repeat: start shell, exit, then click "Open Shell" — new shell session starts cleanly.

---

### Wave 3: Read Panel Auto-Refresh

- [x] Open a core file (e.g., CLAUDE.md) in the read panel.
- [x] In a separate editor, make a visible change to that file and save.
- [x] After up to 10 minutes, the read panel updates to show the new content.
- [x] Scroll position is preserved after the auto-refresh.
- [x] Switch to a different tab and back — no duplicate timers or errors in console.

*(For practical testing, you can temporarily change the interval from `10 * 60 * 1000` to `10 * 1000` in app.js, test, then revert.)*

---

### Wave 4: First-Run Onboarding

- [x] Temporarily hide `claude` from PATH (e.g., `PATH=/usr/bin:/bin node server.js`).
- [x] Open browser — onboarding screen appears instead of main UI.
- [x] "Get Claude Code" link opens the referral URL in a new tab.
- [x] Help section mentions `claude --version` for troubleshooting.
- [x] Click "Retry" — if Claude is still not in PATH, onboarding re-appears.
- [x] Restore normal PATH, start CCC normally — main UI loads, no onboarding.
- [x] Set `CLAUDE_REFERRAL_URL=https://example.com` in .env — onboarding link uses that URL.

---

### Wave 5: Documentation & Cleanup

**5a. .env.example**
- [x] `CLAUDE_REFERRAL_URL=` line is present with comment.
  > Test comment
- [x] All existing variables have documentation comments.

**5b. README.md**
- [x] File exists at project root.
- [x] Contains: requirements, quick start, config table, platform note.
- [x] No placeholder text or TODO markers.

**5c. Console error sweep**
- [x] Open browser DevTools console. Navigate through: tree view, open tabs, start session, exit session, restart session, settings, read panel, new project wizard, import flow.
- [x] Zero unexpected console errors throughout.

**5d. Alert removal**
- [x] No browser `alert()` dialogs appear anywhere in the app. All error messages use toast notifications.

---

### Overall

- [x] Fresh install test: clone repo, `npm install`, `cp .env.example .env`, `npm start` — everything works from scratch.
- [x] Existing data preserved: start CCC with existing `projects.json` and `settings.json` — no data loss or corruption.

---

*Test file for Stage 11 Go/NoGo gate. Run `/tested` after review.*
