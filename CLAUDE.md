# CLAUDE.md — Claude Command Center (CCC)
# Project-Level Behavioral Contract
# Derived from: docs/CCC_concept.md
# Global rules: ~/.claude/CLAUDE.md (always applies)

---

## What CCC Is

CCC is a local web application (Node.js + Express + xterm.js) that serves as a unified dashboard for managing multiple simultaneous Claude Code sessions. It replaces terminal sprawl with a single window: tree view of projects on the left, tab-based terminal sessions on the right, live colour-coded status indicators per project.

**Read `docs/CCC_concept.md` before starting any task.** It is the single source of truth. One file, no versioning in the filename, always current.

---

## CCC-Specific Behavioural Rules

These rules extend the global contract (~/.claude/CLAUDE.md) for this project specifically.

- **Never hardcode the port.** Always read from `process.env.PORT`. Default: 3000, defined in `.env`.
- **Never hardcode the referral URL.** Always read from `process.env.CLAUDE_REFERRAL_URL`. Falls back to `https://claude.ai` if not set.
- **Never commit `.env`.** Gitignored. Repo ships with `.env.example`.
- **Never modify files in an imported project directory.** CCC is read-only on the filesystem except for its own `projects.json` and `settings.json`.
- **Never write version numbers into filenames.** Version history lives in Git.
- **Never use filesystem symlinks.** Active version is tracked in `projects.json` via `activeVersion` field.
- **Never use platform-specific APIs or hardcoded paths.** v1.0 targets macOS but must not close the door on cross-platform support. Use `path.join()` for all paths. No `/Users/`, no `~/Library/`, no assumptions about shell.
- **Parser module is sacred.** All Claude Code output parsing lives exclusively in `src/parser.js`. Nothing else touches raw output interpretation. No exceptions.
- **Do not implement platform folder restructuring during v1.0.** Platform separation (`platform/macos/`, `platform/windows/`, `platform/linux/`) is a post-v1.0 housekeeping task — not a feature, not a version bump. Do not touch during current build.

---

## Current Platform

**v1.0 target: macOS only.**

Post-v1.0, before v1.1 development begins, a housekeeping sprint will restructure the project:

```
CCC/
└── platform/
    ├── macos/      ← current codebase moves here
    ├── windows/    ← placeholder
    └── linux/      ← placeholder
```

This applies to CCC itself and to the New Project Wizard and Import flow. It is housekeeping — not a version bump, not a feature release.

---

## Project Structure (v1.0 — macOS)

```
CCC/
├── CLAUDE.md                  ← this file (project root)
├── .env                       ← local only, never committed
├── .env.example               ← committed, documents all variables
├── .gitignore
├── package.json
├── server.js                  ← Express entry point
├── src/
│   ├── parser.js              ← ISOLATED: status detection only
│   ├── sessions.js            ← PTY session management
│   └── projects.js            ← project registry logic
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── data/
│   ├── projects.json          ← project registry (committed, no absolute paths)
│   └── settings.json          ← user settings (gitignored)
└── docs/
    ├── CCC_concept.md         ← source of truth
    ├── CCC_tasklist.md        ← stage-gated task breakdown
    ├── CCC_shp.md             ← project memory (overwritten at /eod)
    └── CCC_test_stageXX.md    ← pre-GoNoGo test list (one per stage, accumulates)
```

---

## Tech Stack

| Concern | Technology |
|---|---|
| Server | Node.js + Express |
| Terminal | node-pty (beta) + xterm.js |
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

If the parser receives unrecognised output for more than 60 seconds of activity:
- All status dots fall back to ⚫
- A warning banner appears with a link to the GitHub issues page
- The terminal remains fully interactive — only status colours are affected
- If a GitHub token is configured in Settings, CCC auto-files one issue:
  `[Auto] Status detection degraded — Claude Code output format may have changed`

---

## Project Versioning

- Each version is a full development cycle with its own concept doc and tasklist
- Version documents live in `docs/vX.Y/` — e.g. `docs/v1.1/CCC_concept.md`
- Patch versions nest inside their parent: `docs/v1.1/v1.1.1/`
- Active version tracked in `projects.json` via `activeVersion` field
- CLAUDE.md stays at project root, always derived from active version's concept doc
- When final stage receives Go → prompt for Git tag matching version number

---

## Project Memory — SHP

The SHP (Session Handover Pack) is the **project memory**.

> *"A fresh session reading it can start work immediately without re-reading source files. It knows the codebase without having built it."*

> *"It knows the outcome, not the journey."*

**One SHP per project. One file. Always overwritten at `/eod`.**
File: `docs/CCC_shp.md`

### SHP must contain

- Full project timeline — every stage, commit, and date
- Complete API inventory — every endpoint with method, path, and purpose
- Frontend state model — all variables, maps, sets, and the rendering pipeline
- Parser state machine — detection priority, degradation logic, debounce behaviour
- Path resolution chain — how relative paths work
- Version model — folder structure, inheritance rules
- Architecture decisions — the rules that govern how CCC code is written
- All dependencies — with version notes (e.g. why node-pty needs the beta version)
- Known gotchas — the things that will bite you if you don't know about them
- Current stage status — where we are, what's done, what's next

### The four slash commands

| Command | When | What it does |
|---|---|---|
| `/start-project` | First ever session | Reads CLAUDE.md, concept, tasklist. Asks comprehension questions. Works without CCC running. |
| `/eod` | End of every session | Writes complete SHP to `docs/CCC_shp.md`, overwriting previous. Git captures history. |
| `/continue` | Start of new session | CCC feeds current SHP to Claude Code. Resume without archaeology. |
| `/tested` | After Phet has reviewed the pre-GoNoGo test file | Re-reads `docs/{ProjectName}_test_stageXX.md`, processes any comments, applies fixes, then presents Go/NoGo gate. |

Global slash commands — installed in `~/.claude/commands/`, available across all projects.

### Pre-Go/NoGo test list

Before every Go/NoGo gate, Claude Code generates `docs/{ProjectName}_test_stageXX.md`. The file appears in the CCC Read panel. Phet works through it — ticking items, adding comments. When done, Phet types `/tested`. Claude Code processes comments and presents the gate. Test files accumulate in `docs/` — one per stage, full audit trail.

### "Create SHP" — chat command

When Phet says **"Create SHP"** in the Claude.ai chat interface: output the current SHP as plain text directly in chat. No files, no questions, no preamble. Ready to copy. Distinct from `/eod` — this is for human use across Claude.ai sessions.

---

## Git Protocol

After every stage Go decision:
```
git add .
git commit -m "Stage XX complete — [brief description]"
git push
```

---

## Stack Decisions (CCC entry for ~/.claude/CLAUDE.md §3.2)

| Project | Stack Decisions |
|---|---|
| CCC | Node.js + Express, node-pty beta, xterm.js, ws, marked.js, JSON persistence, no database |

---

*Project contract ends here. Global rules (~/.claude/CLAUDE.md) always apply.*
