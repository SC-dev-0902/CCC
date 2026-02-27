# CCC_Roadmap.md — Claude Command Center
*Version Roadmap — source of truth for what ships when*

---

## Roadmap Rules

- A version is locked when the developer says it is locked. No features creep in after the lock.
- Each version follows the stage-gated process with Go/NoGo gates.
- See `CCC_tasklist.md` for the detailed task breakdown of the active version.
- See `CCC_concept.md` for the full design specification.

---

## v1.0 — The Foundation

**Status:** In development
**Platform:** macOS, Linux, Windows
**Theme:** Dashboard + Project Memory. CCC manages Claude Code sessions and gives them continuity.

### What ships in v1.0

| Area | Scope |
|------|-------|
| UI Shell & Layout | Split-pane interface, tree view, tab bar, status dots |
| Project Persistence | `projects.json`, drag & drop, groups |
| Terminal Sessions | Full PTY via node-pty + xterm.js, background persistence |
| Status Detection | Parser module, five-state model, degraded state fallback |
| Read Panel | Markdown viewer, "Open in Editor" launch |
| New Project Wizard | Scaffold folder + CLAUDE.md + concept + tasklist + slash commands |
| Import Existing Projects | Hard gate on concept doc, non-destructive, read-only |
| Settings Panel | Editor, shell, theme, GitHub token, file patterns |
| Project Memory | `/start-project`, `/eod`, `/continue` — file-based SHP storage |
| Project Versioning | Version folders in `docs/`, active version pointer in JSON |
| Resilience & Polish | Error handling, first-run experience, README |
| Cross-Platform | macOS, Linux, Windows — tested and documented |
| Housekeeping | Filesystem cleanup, documentation audit, code quality |

### What does NOT ship in v1.0

- Cloud sync or multi-machine support
- Multiple users / authentication
- Built-in text editor
- Git integration beyond post-stage push
- Mobile / tablet support
- SQLite (file-based storage is sufficient for v1.0)

### Version lock

**v1.0 is locked.** No additional features will be added. The scope above is final.

---

## v1.1 — Promotion Tour

**Status:** Planned
**Prerequisite:** v1.0 shipped and used as daily driver for 2-3 weeks
**Theme:** First impressions. Polish rough edges found during daily use, then go public.

### What ships in v1.1

| Area | Scope |
|------|-------|
| Bug fixes | Anything found during 2-3 weeks of daily use |
| Degradation detection | Redesign — current approach triggers false positives on idle and decorative output |
| Polish | UI refinements, performance, edge cases |
| README | Polished with GIF/screen recording |
| Promotion campaign | Show HN, Reddit (r/ClaudeAI, r/cursor), X/Twitter thread, blog post |

### Promotion strategy

Ship v1.0 → use it daily for 2-3 weeks → fix rough edges → ship v1.1 → promote. First impression must be flawless.

All promotion material should highlight: **v1.0 supports macOS, Linux, and Windows.**

### Promotion assets (to be drafted in dedicated session)

- Polished README with GIF/screen recording
- Show HN post
- Reddit posts (r/ClaudeAI, r/cursor)
- X/Twitter thread
- Blog post: the full story from "terminal chaos" to CCC

---

## v2.0 — Project Memory (Advanced)

**Status:** Future
**Prerequisite:** v1.1 shipped, community feedback collected
**Theme:** CCC becomes a context-aware command center. SQLite replaces file-based storage. Full project history with search.

### Candidate features

| Area | Scope |
|------|-------|
| SQLite migration | Replace file-based SHP storage with SQLite DB |
| Searchable history | Full-text search across all stored SHPs per project |
| Context layering | Yesterday's SHP in full + compressed digest of prior history |
| User manual | CCC as infrastructure — must be running before Claude Code |
| Claude.ai API integration | Optional API key for in-CCC document generation |
| Global slash commands | `~/.claude/commands/` for universal workflow commands |

### Design questions for v2.0 (to be resolved before development)

- What gets stored beyond the daily SHP? Raw terminal output? Summarised chunks?
- How is history surfaced in the UI? New panel? Search bar? Timeline?
- How much context does `/continue` inject? Full last SHP + digest? Configurable depth?
- Does CCC auto-detect end-of-day, or is `/eod` always manual?

---

## Future Ideas (unversioned)

Ideas that have been discussed but are not assigned to a version yet:

- Menu bar icon showing global status (how many projects need attention)
- Desktop notifications when a project turns red
- Session logs / history per project
- Claude Code token usage display
- Keyboard shortcuts for switching between projects
- Quick-reply bar for common Claude Code responses (y/n/yes to all)
- Surface `.claude/commands/` per project in CCC UI for one-click invocation

---

*"An assumption is the first step in a major cluster fuck." — Keep it sharp.*
