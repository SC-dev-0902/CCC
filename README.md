# CCC — Claude Command Center

A local web dashboard for managing multiple simultaneous Claude Code sessions. Replaces terminal sprawl with a single window: project tree on the left, tabbed terminal sessions on the right, live colour-coded status indicators per project.

### Features

- Full interactive terminal sessions via PTY (node-pty + xterm.js)
- Live colour-coded status detection — red, yellow, green, orange, grey
- Inline Markdown preview for project files with "Open in Editor" integration
- New Project Wizard with template scaffolding
- Import existing projects with auto-detection of concept docs and tasklists
- Project versioning with version folders, active version tracking, and Git tagging
- Interactive test runner for stage gate checklists
- Project memory via Session Handover Packs (`/start-project`, `/eod`, `/continue`)
- Settings panel: theme (dark/light), editor, shell, file patterns, GitHub token
- Drag-and-drop project reordering between groups
- First-run onboarding experience

## Requirements

- **Git** — required to clone the repository (`git --version` should work)
- **Node.js 20+**
- **Claude Code CLI** — installed and authenticated (`claude --version` should work)
- **Native build tools** (required for compiling `node-pty`):
  - **macOS:** Xcode Command Line Tools (`xcode-select --install`)
  - **Linux:** `build-essential` and `python3` (`sudo apt install build-essential python3`)
  - **Windows:** Visual Studio Build Tools with "Desktop development with C++" workload

## Quick Start

```bash
git clone https://github.com/SC-dev-0902/CCC.git
cd CCC
```

Run the installer for your platform:

| Platform | Command |
|---|---|
| **macOS** | `./tools/macos/install_CCC.sh` |
| **Linux** | `./tools/linux/install_CCC.sh` |
| **Windows** | `.\tools\windows\install_CCC.ps1` |

The installer checks prerequisites, runs `npm install` (compiles `node-pty`), and creates your `.env` file.

Then start CCC:

```bash
npm start
```

Open `http://localhost:3000` in your browser.

**Desktop shortcut:** Each release archive includes a starter script (`start_CCC.command` on macOS, `start_CCC.sh` on Linux, `start_CCC.bat` on Windows). Place it on your Desktop — double-click to start the server and open CCC in your browser.

## Configuration

All runtime configuration is in `.env`. Copy `.env.example` and edit as needed.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port CCC listens on |
| `CLAUDE_REFERRAL_URL` | `https://claude.ai` | URL shown in onboarding when Claude Code is not detected |
| `GITHUB_TOKEN` | *(empty)* | Personal access token for auto-filing GitHub issues on parser degradation |
| `GITHUB_REPO` | *(empty)* | Target repo in `owner/repo` format |

Application settings (project root, editor, theme, etc.) are configured in the Settings panel within CCC and persisted to `data/settings.json`.

## Project Structure

```
CCC/
├── server.js              Express entry point
├── src/
│   ├── parser.js          Status detection (isolated module)
│   ├── sessions.js        PTY session management
│   ├── projects.js        Project registry logic
│   └── versions.js        Version folder management
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── data/
│   ├── projects.json      Project registry (auto-created on first run)
│   └── settings.json      User settings (auto-created on first run)
├── tools/
│   ├── macos/
│   │   ├── install_CCC.sh          Installer (macOS)
│   │   └── start_CCC.command       Desktop starter (macOS)
│   ├── linux/
│   │   ├── install_CCC.sh          Installer (Linux)
│   │   └── start_CCC.sh            Desktop starter (Linux)
│   ├── windows/
│   │   ├── install_CCC.ps1         Installer (Windows)
│   │   └── start_CCC.bat           Desktop starter (Windows)
│   ├── build-release.sh            Builds OS-specific release archives
│   └── screenshot.js               Playwright screenshot script
└── docs/                      Project documentation
```

## Platform Support

CCC v1.0 is developed and tested on macOS. Linux and Windows support is code-complete — shell spawning, editor launch, and path handling are all platform-aware — but has not yet been manually tested on target hardware. If you encounter platform-specific issues, please file an issue.

## Licence

[Elastic License 2.0 (ELv2)](LICENSE)
