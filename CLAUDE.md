# CLAUDE.md — Claude Command Center (CCC)
*Derived from: docs/v1.0/CCC_concept.md*

---

## Prime Directive

> "An assumption is the first step in a major cluster fuck." — Marine Corps

**Never assume. Always ask.** When in doubt about scope, intent, or next action — stop and ask. Do not proceed based on inference.

---

## What CCC Is

CCC is a local web application (Node.js + Express + xterm.js) that serves as a unified dashboard for managing multiple simultaneous Claude Code sessions. It replaces terminal sprawl with a single window: tree view of projects on the left, tab-based terminal sessions on the right, live colour-coded status indicators per project.

Read the active version's concept doc before starting any task. It is the single source of truth. The current active version is v1.0 — read `docs/v1.0/CCC_concept.md`.

---

## Behavioural Rules

- **Never hardcode the port.** Always read from `process.env.PORT`. Default is 3000, defined in `.env`.
- **Never commit `.env`.** It is in `.gitignore`. The repo ships with `.env.example`.
- **Never begin the next stage without an explicit Go from the developer.**
- **Never modify files in an imported project directory.** CCC is read-only on the filesystem except for its own `projects.json` and `settings.json`.
- **Never write version numbers into filenames.** Version history lives in Git.
- **Never use filesystem symlinks.** Active version is tracked in `projects.json`, not on the filesystem.
- **Never use platform-specific APIs or hardcoded paths.** v1.0 targets macOS, Linux, and Windows. Use `path.join()` for all paths. No `/Users/`, no `~/Library/`, no `C:\Users\`, no assumptions about zsh.
- **Parser module is sacred.** All Claude Code output parsing lives exclusively in `src/parser.js`. Nothing else touches raw output interpretation.

---

## Project Structure

```
CCC/
├── CLAUDE.md                  ← this file (project root)
├── LICENSE                    ← Elastic License 2.0
├── README.md
├── CHANGELOG.md
├── .env                       ← local only, never committed
├── .env.example               ← committed, shows available variables
├── .gitignore
├── package.json
├── server.js                  ← Express server entry point
├── src/
│   ├── parser.js              ← ISOLATED: all status detection logic lives here
│   ├── sessions.js            ← PTY session management
│   ├── projects.js            ← project registry logic
│   └── versions.js            ← version management (create, scan, migrate)
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── data/
│   ├── projects.json          ← project registry (committed, no absolute paths)
│   └── settings.json          ← user settings (gitignored)
├── tools/
│   ├── macos/
│   │   └── install_CCC.sh    ← Installer for macOS
│   ├── linux/
│   │   └── install_CCC.sh    ← Installer for Linux
│   ├── windows/
│   │   └── install_CCC.ps1   ← Installer for Windows
│   ├── build-release.sh       ← Builds OS-specific release archives
│   └── screenshot.js          ← Playwright screenshot script
└── docs/
    ├── CCC_Roadmap.md         ← version plan (v1.0, v1.1, v2.0)
    ├── CCC_shp.md             ← Session Handover Pack (overwritten each /eod)
    ├── screenshots/            ← Playwright-captured images
    └── v1.0/                  ← active version
        ├── CCC_concept.md
        ├── CCC_tasklist.md
        └── CCC_test_stage*.md ← pre-GoNoGo test files (one per stage)
```

---

## Project Versioning

CCC models project evolution through explicit versions. Each version is a full development cycle.

- **A version is a container** — it has its own concept doc, tasklist, stage progression, and Go/NoGo gates.
- **Major (X.0) and Minor (x.Y) versions** get their own concept doc and tasklist.
- **Patch versions (x.y.Z)** get their own concept doc (seeded from parent minor version) and their own tasklist.
- **Version documents live in `docs/vX.Y/`** — e.g., `docs/v1.1/CCC_concept.md`.
- **Patch version documents nest inside their parent** — e.g., `docs/v1.1/v1.1.1/CCC_concept.md` and `CCC_tasklist.md`.
- **The active version is tracked in `projects.json`** via the `activeVersion` field. Never use filesystem symlinks.
- **CLAUDE.md stays at the project root** and is always derived from the active version's concept doc.
- **When a version's final stage receives a Go**, prompt for a Git tag matching the version number.

Read `docs/v1.0/CCC_concept.md` → Project Versioning section for the full specification.

---

## Project Memory

CCC gives Claude Code session continuity through file-based SHP (Session Handover Pack) storage.

- **SHPs are stored as a single file** per project: `docs/{ProjectName}_shp.md` (overwritten each `/eod`, Git provides history).
- **Six global slash commands** drive the workflow:
- **`/start-project`** — reads CLAUDE.md, concept, tasklist. Generates tasklist if missing. Asks comprehension questions. Works without CCC.
- **`/continue`** — CCC feeds the most recent SHP to Claude Code. Requires CCC to be running.
- **`/eod`** — Claude Code writes the SHP. CCC stores it. Requires CCC to be running.
- **`/create-tasklist`** — manual trigger to generate tasklist from concept doc.
- **`/reload-docs`** — re-reads all project docs after external changes.
- **`/evaluate-import`** — reads existing code/docs, interviews developer, generates CCC-compliant docs for imported projects.
- **SHP files are human-readable Markdown** — Git-friendly, openable in any editor.
- **Never store SHPs in the database.** v1.0 uses file-based storage. SQLite is a v2.0 upgrade.

Read `docs/v1.0/CCC_concept.md` → Project Memory section for the full specification.

---

## Tech Stack

| Concern | Technology |
|---|---|
| Server | Node.js + Express |
| Terminal | node-pty + xterm.js |
| WebSocket | ws library |
| Frontend | Vanilla JS |
| Markdown render | marked.js |
| Persistence | JSON files |

No database. No cloud. No accounts. Runs on `localhost:PORT`.

---

## Status Model

The parser (`src/parser.js`) maps Claude Code output to exactly five states:

| State | Colour | Meaning |
|---|---|---|
| WAITING_FOR_INPUT | 🔴 Red | Claude is waiting for a decision |
| RUNNING | 🟡 Yellow | Claude is actively working |
| COMPLETED | 🟢 Green | Task done, awaiting next instruction |
| ERROR | 🟠 Orange | Error state detected |
| UNKNOWN | ⚫ Grey | No session or unrecognised output |

---

## Parser Resilience

If the parser receives unrecognised output for more than 60 seconds of activity, it enters a degraded state:
- All status dots fall back to ⚫
- A warning banner appears in the UI with a link to the GitHub issues page
- The terminal remains fully interactive — nothing is broken, only status colours are affected
- If a GitHub token is configured in Settings, CCC auto-files one issue titled: `[Auto] Status detection degraded — Claude Code output format may have changed`

---

## Stage Gate Process

Development proceeds in defined stages. See `docs/v1.0/CCC_tasklist.md` for the full breakdown. See `docs/CCC_Roadmap.md` for the version plan (v1.0, v1.1, v2.0).

- Each stage has a defined set of tasks
- Each stage ends with a Go/NoGo decision
- **Never begin Stage N+1 without an explicit Go**
- Stage 01 produces a static UI shell — no backend, no real terminals, hardcoded data only. The UI must feel right before any backend code is written.

---

## Git Protocol

After every stage Go decision, push to the repository:
  git add .
  git commit -m "Stage XX complete — [brief description]"
  git push
  
## SHP Protocol

When the developer says **"Create SHP"** — output the current Session Handover Pack as plain text directly in the chat. No files, no questions, no preamble. Just the text, ready to copy. Update stage status and version number before outputting.

---

## User Manual

The user manual is **Stage 13** — written after v1.0 ships, after post-ship housekeeping, before the Promotion Tour.

### Screenshots — Playwright
Claude Code cannot take screenshots directly. Screenshots are captured via Playwright (Node.js — fits the CCC stack naturally). Claude Code writes all scripts. Phet runs them. No prior Playwright experience required.

```
Claude Code writes screenshot.js
    ↓
Phet runs: node screenshot.js  (CCC must be running)
    ↓
Screenshots land in docs/screenshots/
    ↓
Claude Code builds manual around them
```

Playwright is installed as a **dev dependency only** — not part of the CCC runtime.

### Bonus — Promotion Tour Asset
The same Playwright script is extended to produce an animated GIF of live status dots changing in real time. Saved to `docs/screenshots/` — ready for the README and Show HN post.

### Stage 13 Start
Before writing a single word, Claude Code re-reads all four documents:
- `CLAUDE.md`
- `docs/v1.0/CCC_concept.md`
- `docs/v1.0/CCC_tasklist.md`
- `docs/CCC_shp.md`

Manual structure is proposed and confirmed with Phet before writing begins.

### Output
- `docs/USER_MANUAL.md` — full manual with embedded screenshots
- `docs/screenshots/` — all Playwright-captured images and animated GIF

### Human Editorial Pass (HEP)
Phet reviews all manual text before publish. No outward-facing text goes out without human review.
