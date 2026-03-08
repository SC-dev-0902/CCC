# PROJECT_MAP.md — Claude Command Center (CCC)

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Project-level instructions for Claude Code |
| `PROJECT_MAP.md` | This file — filesystem table of contents |
| `README.md` | Public-facing project description |
| `CHANGELOG.md` | Public-facing version history |
| `LICENSE` | Elastic License 2.0 |
| `package.json` | Node.js dependencies and scripts |
| `.env.example` | Environment variable template |
| `server.js` | Express server entry point — all REST API endpoints |
| `src/parser.js` | Claude Code output parser — status detection logic |
| `src/sessions.js` | PTY session management |
| `src/projects.js` | Project registry logic |
| `src/versions.js` | Version management (create, scan, migrate, tag) |
| `public/index.html` | Single-page app shell |
| `public/app.js` | Frontend application logic |
| `public/styles.css` | Stylesheet |
| `data/projects.json` | Project registry (committed) |
| `data/settings.json` | User settings (gitignored) |
| `tools/macos/install_CCC.sh` | macOS installer |
| `tools/linux/install_CCC.sh` | Linux installer |
| `tools/windows/install_CCC.ps1` | Windows installer |
| `tools/build-release.sh` | Builds OS-specific release archives |
| `tools/screenshot.js` | Playwright screenshot script |
| `docs/CCC_Roadmap.md` | Version plan (v1.0, v1.1, v2.0) |
| `docs/handoff/CCC_shp.md` | Session Handover Pack — project memory |
| `docs/handoff/` | SHP + recovery files |
| `docs/discussion/` | Design discussions, meeting notes |
| `docs/architecture/` | Architecture decisions, diagrams |
| `docs/spec/` | Specifications, interface contracts |
| `docs/adr/` | Architecture decision records |
| `docs/context/` | Background research, reference material |
| `docs/screenshots/` | Playwright-captured images |
| `docs/USER_MANUAL.md` | User manual (with embedded screenshots) |
| `docs/v1.0/` | v1.0 version folder (concept, tasklist, test files) |
| `docs/v1.0/v1.0.1/` | v1.0.1 patch folder |
| `docs/v1.0/v1.0.2/` | v1.0.2 patch folder (current) |
