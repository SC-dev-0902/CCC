# CCC — Claude Command Center

A local web dashboard for managing multiple simultaneous Claude Code sessions. Replaces terminal sprawl with a single window: project tree on the left, tabbed terminal sessions on the right, live colour-coded status indicators per project.

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
git clone <your-repo-url> CCC
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
│   │   └── install_CCC.sh     Installer (macOS)
│   ├── linux/
│   │   └── install_CCC.sh     Installer (Linux)
│   ├── windows/
│   │   └── install_CCC.ps1    Installer (Windows)
│   ├── build-release.sh        Builds OS-specific release archives
│   └── screenshot.js           Playwright screenshot script
└── docs/                      Project documentation
```

## Platform Support

CCC v1.0 runs on macOS, Linux, and Windows. Shell spawning, editor launch, and path handling are all platform-aware. Primary development and testing happens on macOS — if you encounter platform-specific issues on Linux or Windows, please file an issue.
