# CCC — Stage 11 Test Checklist
## Resilience & Polish

Test each item below. Tick when passed, add comments if something needs fixing.

---

### Wave 1: Backend Resilience

**1a. Missing projects.json (first run)**
- [X] Stop CCC. Delete `data/projects.json`. Start CCC. Server starts without error.
- [X] `data/projects.json` is auto-created with `Active` and `Parked` groups, empty projects array.
- [X] Browser loads normally — tree view shows empty Active/Parked groups.

**1b. Missing settings.json (first run)**
- [X] Stop CCC. Delete `data/settings.json`. Start CCC. Server starts without error.
- [X] `data/settings.json` is auto-created with defaults (theme: dark, editor: open, etc.).
- [X] Settings panel loads and shows default values.

**1c. Port conflict**
- [X] Start CCC normally on port 3000. In a second terminal, run `PORT=3000 node server.js`.
- [X] Second instance prints clear error: port 3000 in use, advice to change PORT, then exits.
- [X] First instance is unaffected.

**1d. Invalid project paths**
- [X] Register a project, then manually edit `data/projects.json` to set its path to a non-existent directory.
- [X] Open the project tab — "No active session" prompt appears (no crash).
- [X] Click "Start Claude Code" — toast error appears (not a browser alert), no crash.
- [X] Click a core file in the tree — read panel shows "Project directory does not exist" error.

---

### Wave 2: Session Crash Recovery

- [X] Open a project tab. Start a shell session (`Open Shell`).
- [X] In the terminal, type `exit` and press Enter. Session ends.
- [X] Terminal content (scroll history) remains visible — not replaced with a blank screen.
- [X] A restart bar appears at the bottom: "Session ended." with two buttons.
- [X] Click "Restart Claude Code" — old terminal disappears, new Claude Code session starts.
- [X] Repeat: start shell, exit, then click "Open Shell" — new shell session starts cleanly.

---

### Wave 3: Read Panel Auto-Refresh

- [X] Open a core file (e.g., CLAUDE.md) in the read panel.
- [X] In a separate editor, make a visible change to that file and save.
- [X] After up to 10 minutes, the read panel updates to show the new content.
- [X] Scroll position is preserved after the auto-refresh.
- [X] Switch to a different tab and back — no duplicate timers or errors in console.

*(For practical testing, you can temporarily change the interval from `10 * 60 * 1000` to `10 * 1000` in app.js, test, then revert.)*

---

### Wave 4: First-Run Onboarding

- [X] Temporarily hide `claude` from PATH (e.g., `PATH=/usr/bin:/bin node server.js`).
- [X] Open browser — onboarding screen appears instead of main UI.
- [X] "Get Claude Code" link opens the referral URL in a new tab.
- [X] Help section mentions `claude --version` for troubleshooting.
- [X] Click "Retry" — if Claude is still not in PATH, onboarding re-appears.
- [X] Restore normal PATH, start CCC normally — main UI loads, no onboarding.
- [X] Set `CLAUDE_REFERRAL_URL=https://example.com` in .env — onboarding link uses that URL.

---

### Wave 5: Documentation & Cleanup

**5a. .env.example**
- [X] `CLAUDE_REFERRAL_URL=` line is present with comment.
- [X] All existing variables have documentation comments.

**5b. README.md**
- [X] File exists at project root.
- [X] Contains: requirements, quick start, config table, platform note.
- [X] No placeholder text or TODO markers.

**5c. Console error sweep**
- [X] Open browser DevTools console. Navigate through: tree view, open tabs, start session, exit session, restart session, settings, read panel, new project wizard, import flow.
- [X] Zero unexpected console errors throughout.

**5d. Alert removal**
- [X] No browser `alert()` dialogs appear anywhere in the app. All error messages use toast notifications.

---

### Overall

- [X] Fresh install test: clone repo, `npm install`, `cp .env.example .env`, `npm start` — everything works from scratch.
- [X] Existing data preserved: start CCC with existing `projects.json` and `settings.json` — no data loss or corruption.

---

*Test file for Stage 11 Go/NoGo gate. Run `/tested` after review.*
