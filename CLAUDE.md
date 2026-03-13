# CLAUDE.md — Claude Command Center (CCC)
*Derived from: docs/v1.0/CCC_concept_v1.0.md*

---

## Prime Directive

> "An assumption is the first step in a major cluster fuck." — Marine Corps

**Never assume. Always ask.** When in doubt about scope, intent, or next action — stop and ask. Do not proceed based on inference.

---

## What CCC Is

CCC is a local web application (Node.js + Express + xterm.js) that serves as a unified dashboard for managing multiple simultaneous Claude Code sessions. It replaces terminal sprawl with a single window: tree view of projects on the left, tab-based terminal sessions on the right, live colour-coded status indicators per project.

Read the active version's concept doc before starting any task. It is the single source of truth. The current active version is v1.0 — read `docs/v1.0/CCC_concept_v1.0.md`.

---

## Behavioural Rules

- **Never hardcode the port.** Always read from `process.env.PORT`. Default is 3000, defined in `.env`.
- **Never commit `.env`.** It is in `.gitignore`. The repo ships with `.env.example`.
- **Never begin the next stage without an explicit Go from the developer.**
- **Import scaffolding is additive only.** When importing an existing project, CCC creates missing CCC structure (`docs/vX.Y/`, `CLAUDE.md`, `.claude/commands/`, `.ccc-project.json`) but never overwrites existing files. Outside of import, CCC only writes to its own `projects.json` and `settings.json`.
- **Version numbers in filenames are forward-only.** New files use `{Name}_concept_v{X.Y}.md` convention. Existing files without version numbers are left as-is — do not rename retroactively.
- **Never use filesystem symlinks.** Active version is tracked in `projects.json`, not on the filesystem.
- **Never use platform-specific APIs or hardcoded paths.** v1.0 targets macOS, Linux, and Windows. Use `path.join()` for all paths. No `/Users/`, no `~/Library/`, no `C:\Users\`, no assumptions about zsh.
- **Parser module is sacred.** All Claude Code output parsing lives exclusively in `src/parser.js`. Nothing else touches raw output interpretation.

---

## Project Structure

```
CCC/
├── CLAUDE.md                  ← this file (project root)
├── PROJECT_MAP.md             ← filesystem table of contents for CC orientation
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
│   ├── versions.js            ← version management (create, scan, migrate)
│   └── usage.js               ← token usage status bar (cache, timer, refresh)
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
    ├── handoff/               ← SHP + recovery files
    │   └── CCC_shp.md        ← Session Handover Pack (overwritten each /eod)
    ├── discussion/            ← design discussions, meeting notes
    ├── architecture/          ← architecture decisions, diagrams
    ├── spec/                  ← specifications, interface contracts
    ├── adr/                   ← architecture decision records
    ├── context/               ← background research, reference material
    ├── screenshots/           ← Playwright-captured images
    └── v1.0/                  ← active version
        ├── CCC_concept_v1.0.md
        ├── CCC_tasklist.md
        └── CCC_test_stage*.md ← pre-GoNoGo test files (one per stage)
```

---

## Project Versioning

CCC models project evolution through explicit versions. Each version is a full development cycle.

- **A version is a container** — it has its own concept doc, tasklist, stage progression, and Go/NoGo gates.
- **Major (X.0) and Minor (x.Y) versions** get their own concept doc and tasklist.
- **Patch versions (x.y.Z)** get their own concept doc (seeded from parent minor version) and their own tasklist.
- **Version documents live in `docs/vX.Y/`** — e.g., `docs/v1.1/CCC_concept_v1.1.md`.
- **Patch version documents nest inside their parent** — e.g., `docs/v1.1/v1.1.1/CCC_concept_v1.1.1.md` and `CCC_tasklist_v1.1.1.md`.
- **The active version is tracked in `projects.json`** via the `activeVersion` field (major.minor only, e.g. `"1.0"`). Patch versions are subfolders within the active version folder. The pointer does not change for patches. Never use filesystem symlinks.
- **CLAUDE.md stays at the project root** and is always derived from the active version's concept doc.
- **When a version's final stage receives a Go**, prompt for a Git tag matching the version number.

Read `docs/v1.0/CCC_concept_v1.0.md` → Project Versioning section for the full specification.

---

## Project Memory

CCC gives Claude Code session continuity through file-based SHP (Session Handover Pack) storage.

- **SHPs are stored as a single file** per project: `docs/handoff/{ProjectName}_shp.md` (overwritten each `/eod`, Git provides history).
- **Six global slash commands** drive the workflow:
- **`/start-project`** — reads CLAUDE.md, concept, tasklist. Generates tasklist if missing. Asks comprehension questions. Works without CCC.
- **`/continue`** — CCC feeds the most recent SHP to Claude Code. Requires CCC to be running.
- **`/eod`** — Claude Code writes the SHP. CCC stores it. Requires CCC to be running.
- **`/create-tasklist`** — manual trigger to generate tasklist from concept doc.
- **`/reload-docs`** — re-reads all project docs after external changes.
- **`/evaluate-import`** — reads existing code/docs, interviews developer, generates CCC-compliant docs for imported projects.
- **SHP files are human-readable Markdown** — Git-friendly, openable in any editor.
- **Never store SHPs in the database.** v1.0 uses file-based storage. SQLite is a v2.0 upgrade.

Read `docs/v1.0/CCC_concept_v1.0.md` → Project Memory section for the full specification.

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

The active version dot in the sidebar follows the same traffic light colours. Green means everything is in order. Orange means the project needs attention (e.g., unevaluated import). No session running defaults to green (all OK).

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
- **Before every Go/NoGo gate, generate a test checklist file.** No test file = no gate.
  - Naming: `docs/v{X.Y}/{ProjectName}_test_stage{XX}.md` (e.g. `CCC_test_stage01.md`)
  - MUST use `_test_stage` — CCC treeview regex: `/_test_stage\d+\.md$/`
  - Any other naming (`_test_batch`, `_test_`, etc.) is invisible to CCC
  - This rule applies to all CCC-managed projects
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

The user manual is **Stage 16** — written after v1.0 ships, after post-ship housekeeping, before the Promotion Tour.

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

### Stage 16 Start
Before writing a single word, Claude Code re-reads all four documents:
- `CLAUDE.md`
- `docs/v1.0/CCC_concept_v1.0.md`
- `docs/v1.0/CCC_tasklist.md`
- `docs/handoff/CCC_shp.md`

Manual structure is proposed and confirmed with Phet before writing begins.

### Output
- `docs/USER_MANUAL.md` — full manual with embedded screenshots
- `docs/screenshots/` — all Playwright-captured images and animated GIF

### Human Editorial Pass (HEP)
Phet reviews all manual text before publish. No outward-facing text goes out without human review.


---

## Anti-AI-Look — the UI Must Not Look Generated

These are the tells that make a UI look AI-generated. Avoid all of them:

1. **No italic subtitles on every card.** Real products do not explain every section. Only add a subtitle when the heading is genuinely unclear.
2. **Vary the visual rhythm.** Not every section needs a white card wrapper. Mix card sizes, weights, and densities.
3. **No uniform spacing everywhere.** Intentionally vary padding and gaps. A hero metric deserves more breathing room than a settings row.
4. **Avoid the default SaaS palette.** Generic colour combos that scream "template" — avoid them. Push for intentional choices with warmth and personality.
5. **Do not over-explain empty states.** A subtle hint is enough. No paragraphs.
6. **Typography hierarchy matters.** Use size, weight, and color variation. Page title → section title → label → caption should all feel different.
7. **Inline SVG icons are not decoration.** Icons should add meaning, not fill space.
8. **Sharp corners — no bubbly UI.** Use sharp or minimal border-radius — follow the project's UI kit. Never 16px+ rounded corners.
