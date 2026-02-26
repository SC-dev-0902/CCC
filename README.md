# CCC — Claude Command Center

A local web dashboard for managing multiple simultaneous Claude Code sessions. Replaces terminal sprawl with a single window: project tree on the left, tabbed terminal sessions on the right, live colour-coded status indicators per project.

## Requirements

- **macOS** (v1.0 target platform)
- **Node.js 20+**
- **Claude Code** CLI — installed and authenticated (`claude --version` should work)
- **Xcode Command Line Tools** — required for compiling `node-pty` (`xcode-select --install`)

## Quick Start

```bash
# Clone the repo
git clone <your-repo-url> CCC
cd CCC

# Install dependencies (node-pty compiles native code)
npm install

# Create your environment file
cp .env.example .env

# Start CCC
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
└── docs/                  Project documentation
```

## Platform Note

CCC v1.0 targets macOS. Cross-platform support (Windows, Linux) is planned for a future version. The codebase avoids platform-specific APIs where possible to keep that door open.
