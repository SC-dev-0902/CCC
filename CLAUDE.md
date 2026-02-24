# CLAUDE.md — Claude Command Center (CCC)
*Derived from: docs/CCC_concept.md*

---

## Prime Directive

> "An assumption is the first step in a major cluster fuck." — Marine Corps

**Never assume. Always ask.** When in doubt about scope, intent, or next action — stop and ask. Do not proceed based on inference.

---

## What CCC Is

CCC is a local web application (Node.js + Express + xterm.js) that serves as a unified dashboard for managing multiple simultaneous Claude Code sessions. It replaces terminal sprawl with a single window: tree view of projects on the left, tab-based terminal sessions on the right, live colour-coded status indicators per project.

Read `docs/CCC_concept.md` before starting any task. It is the single source of truth. Always read the latest version — there is only one file, no versioning in the filename.

---

## Behavioural Rules

- **Never hardcode the port.** Always read from `process.env.PORT`. Default is 3000, defined in `.env`.
- **Never commit `.env`.** It is in `.gitignore`. The repo ships with `.env.example`.
- **Never begin the next stage without an explicit Go from the developer.**
- **Never modify files in an imported project directory.** CCC is read-only on the filesystem except for its own `projects.json` and `settings.json`.
- **Never write version numbers into filenames.** Version history lives in Git.
- **Parser module is sacred.** All Claude Code output parsing lives exclusively in `src/parser.js`. Nothing else touches raw output interpretation.

---

## Project Structure

```
CCC/
├── CLAUDE.md                  ← this file (project root)
├── .env                       ← local only, never committed
├── .env.example               ← committed, shows available variables
├── .gitignore
├── package.json
├── server.js                  ← Express server entry point
├── src/
│   ├── parser.js              ← ISOLATED: all status detection logic lives here
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
    └── CCC_tasklist.md        ← stage-gated task breakdown
```

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

Development proceeds in defined stages. See `docs/CCC_tasklist.md` for the full breakdown.

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
