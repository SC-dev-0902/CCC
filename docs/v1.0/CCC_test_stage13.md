# CCC — Stage 13 Test Checklist
## Cross-Platform Support

---

### Shell & PTY Spawning

- [x] **macOS:** CCC starts, session spawns correctly with default shell
- [x] **macOS:** Claude Code session launches via "Start Claude Code"
- [x] **macOS:** Plain shell session launches via "Open Shell"
- [x] **Linux:** `node-pty` compiles during `npm install`
- [x] **Linux:** Session spawns correctly with default shell
- [x] **Linux:** Claude Code session launches
- [x] **Windows:** `node-pty` compiles during `npm install`
- [x] **Windows:** Session spawns correctly with PowerShell
- [x] **Windows:** Claude Code session launches

### Editor Launch

- [x] **macOS:** "Open in Editor" works with system default (empty editor setting)
- [x] **macOS:** "Open in Editor" works with named app (e.g. CotEditor)
- [x] **Linux:** "Open in Editor" works with system default (`xdg-open`)
- [x] **Linux:** "Open in Editor" works with specific editor binary
- [x] **Windows:** "Open in Editor" works with system default (`start ""`)
- [x] **Windows:** "Open in Editor" works with specific editor

### Path Handling

- [x] **macOS:** Project paths with spaces work correctly
- [x] **Linux:** Project paths with spaces work correctly
- [x] **Windows:** Project paths with spaces work correctly
- [x] **Windows:** Case-insensitive path security check — `C:\Users` vs `c:\users` does not bypass

### SHP & Versioning

- [x] **Linux:** New version folder created correctly
- [x] **Linux:** SHP file written and read correctly
- [x] **Windows:** New version folder created correctly
- [x] **Windows:** SHP file written and read correctly

### Installer Scripts

- [x] **macOS:** `./tools/macos/install_CCC.sh` runs, checks pass, dependencies install
- [ ] **Linux:** `./tools/linux/install_CCC.sh` runs, checks pass, dependencies install
  > Still have to test
- [ ] **Windows:** `.\tools\windows\install_CCC.ps1` runs, checks pass, dependencies install
  > Still have to test

### Release Archives

- [x] **macOS archive:** Extract `dist/CCC-1.0.0-macos.tar.gz` — contains `install_CCC.sh` at root, no other OS installers. Build with `./tools/build-release.sh`, archives land in `dist/`.
- [x] **Linux archive:** `tar -xzf CCC-*-linux.tar.gz` contains `install_CCC.sh` at root, no other OS installers
- [x] **Windows archive:** Unzip `CCC-*-windows.zip` contains `install_CCC.ps1` at root, no other OS installers

### README & Documentation

- [x] README Requirements section lists Git, Node.js 20+, Claude Code CLI, and per-OS build tools
- [x] README Quick Start table shows correct installer path per OS
- [x] README Project Structure includes `tools/` with all three OS folders
- [x] CLAUDE.md Project Structure matches README

### macOS Regression

- [x] Status dots update live during Claude Code session *(deferred — parser unchanged in Stage 13, no regression risk)*
- [x] Tab switching is instant
- [x] Read panel renders Markdown correctly
- [x] Settings panel opens and saves
- [x] No console errors in browser DevTools

---

> **Gate question:** Can a developer on Linux clone, install, and use CCC without issues? Can a developer on Windows do the same? Does the README clearly guide setup on all three platforms?
