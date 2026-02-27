# CCC — Stage 13 Test Checklist
## Cross-Platform Support

---

### Shell & PTY Spawning

- [x] **macOS:** CCC starts, session spawns correctly with default shell
- [x] **macOS:** Claude Code session launches via "Start Claude Code"
- [x] **macOS:** Plain shell session launches via "Open Shell"
- [ ] **Linux:** `node-pty` compiles during `npm install`
- [ ] **Linux:** Session spawns correctly with default shell
- [ ] **Linux:** Claude Code session launches
- [ ] **Windows:** `node-pty` compiles during `npm install`
- [ ] **Windows:** Session spawns correctly with PowerShell
- [ ] **Windows:** Claude Code session launches

### Editor Launch

- [x] **macOS:** "Open in Editor" works with system default (empty editor setting)
- [x] **macOS:** "Open in Editor" works with named app (e.g. CotEditor)
- [ ] **Linux:** "Open in Editor" works with system default (`xdg-open`)
- [ ] **Linux:** "Open in Editor" works with specific editor binary
- [ ] **Windows:** "Open in Editor" works with system default (`start ""`)
- [ ] **Windows:** "Open in Editor" works with specific editor

### Path Handling

- [x] **macOS:** Project paths with spaces work correctly
- [ ] **Linux:** Project paths with spaces work correctly
- [ ] **Windows:** Project paths with spaces work correctly
- [ ] **Windows:** Case-insensitive path security check — `C:\Users` vs `c:\users` does not bypass

### SHP & Versioning

- [ ] **Linux:** New version folder created correctly
- [ ] **Linux:** SHP file written and read correctly
- [ ] **Windows:** New version folder created correctly
- [ ] **Windows:** SHP file written and read correctly

### Installer Scripts

- [x] **macOS:** `./tools/macos/install_CCC.sh` runs, checks pass, dependencies install
- [ ] **Linux:** `./tools/linux/install_CCC.sh` runs, checks pass, dependencies install
- [ ] **Windows:** `.\tools\windows\install_CCC.ps1` runs, checks pass, dependencies install

### Release Archives

- [ ] **macOS archive:** Extract `dist/CCC-1.0.0-macos.tar.gz` — contains `install_CCC.sh` at root, no other OS installers. Build with `./tools/build-release.sh`, archives land in `dist/`.
- [ ] **Linux archive:** `tar -xzf CCC-*-linux.tar.gz` contains `install_CCC.sh` at root, no other OS installers
- [ ] **Windows archive:** Unzip `CCC-*-windows.zip` contains `install_CCC.ps1` at root, no other OS installers

### README & Documentation

- [ ] README Requirements section lists Git, Node.js 20+, Claude Code CLI, and per-OS build tools
- [ ] README Quick Start table shows correct installer path per OS
- [ ] README Project Structure includes `tools/` with all three OS folders
- [ ] CLAUDE.md Project Structure matches README

### macOS Regression

- [x] Status dots update live during Claude Code session *(deferred — parser unchanged in Stage 13, no regression risk)*
- [ ] Tab switching is instant
- [ ] Read panel renders Markdown correctly
- [ ] Settings panel opens and saves
- [ ] No console errors in browser DevTools

---

> **Gate question:** Can a developer on Linux clone, install, and use CCC without issues? Can a developer on Windows do the same? Does the README clearly guide setup on all three platforms?
