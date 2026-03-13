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

**Status:** Shipped
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
| Cross-Platform | macOS verified, Linux/Windows code-complete (manual testing deferred — no target hardware) |
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

## v1.0.4 — Project Rename, Testing Refresh & Documentation Audit

**Status:** Shipped
**Prerequisite:** v1.0.3 shipped
**Theme:** Fix project rename propagation, resolve documentation contradictions accumulated across v1.0–v1.0.3.

### What ships in v1.0.4

| Area | Scope |
|------|-------|
| Project rename (full propagation) | When renaming a project in CCC, rename ALL references — not just `projects.json` display name. This includes: concept doc filenames (`{ProjectName}_concept.md`), tasklist filenames (`{ProjectName}_tasklist.md`), test file filenames (`{ProjectName}_test_stage*.md`), CLAUDE.md internal references, `coreFiles` paths in `projects.json`, SHP/handoff filenames. Currently only the treeview display name changes — everything else stays under the old name, breaking test file detection (`scanVersionFiles` regex) and other name-dependent features. |
| Testing refresh button | Add a refresh/rescan button next to the "Testing" sub-header in the treeview so new test files are picked up on demand without requiring collapse/expand |
| Splitter max-width removal | The divider between treeview and reading panel has a max-width constraint that prevents the treeview from being resized wider. Remove the cap or increase it significantly so users with long project names or deep nesting can expand the treeview as needed |
| Treeview alphabetical sorting | All items in the treeview (projects, groups, files) must be sorted alphabetically. Currently the order depends on insertion order in `projects.json` / filesystem scan order, which makes it hard to find things as the list grows |
| "Waiting for action" red dot missing | When CCC detects the session is waiting for user action (e.g., Claude asks a yes/no question), the status should show a red dot in both the treeview and the tab bar. Currently neither location shows a red dot — the user has no visual cue that a project needs attention. Verify the status detection for "waiting" state and ensure the red dot renders in both treeview node and tab |
| **Documentation audit — contradictions** | Fix the following contradictions between CLAUDE.md and `CCC_concept_v1.0.md`: **(1) SHP path:** CLAUDE.md says `docs/handoff/{ProjectName}_shp.md`, concept says `docs/{ProjectName}_shp.md`. Reality is `docs/handoff/`. Align both docs to `docs/handoff/`. **(2) User Manual stage number:** CLAUDE.md says Stage 13, concept says Stage 16. Pick one and align. **(3) Filename versioning convention:** Concept says "no versioning in filenames, ever" and shows `CCC_concept.md`. CLAUDE.md says "New files use `{Name}_concept_v{X.Y}.md`". Actual files on disk use versioned names. The concept doc rule is stale — update it to match reality. **(4) Slash commands scope:** Concept says commands belong in `~/.claude/commands/` (global). Reality is project-level `.claude/commands/`. Update concept to match. |
| **Documentation audit — gaps** | **(5) `src/usage.js` missing from Project Structure:** CLAUDE.md's tree doesn't list it — add it. **(6) Roadmap v1.0 status:** Says "In development" but v1.0 is shipped. Update to "Shipped". **(7) Anti-AI-Look rule 8 (border-radius):** Says "4px–6px max" but leadsieve-service UI kit mandates 0px. Make the rule project-agnostic: "Use sharp or minimal border-radius — follow the project's UI kit." **(8) Anti-AI-Look rule 4 (palette):** Says "Avoid Navy + teal + slate grey" but CCC's own UI uses that palette. Reword to be about avoiding *generic/default* combinations without naming specific colours that CCC itself uses. |
| **Documentation audit — ambiguities** | **(9) Test file requirement propagation:** The `_test_stage` naming convention is only documented in CCC's own CLAUDE.md and concept. Other project CLAUDE.md files reference stage gates but not the test file regex. Either propagate the rule to all project CLAUDE.md files or accept it as CCC-only. **(10) `activeVersion` pointer vs. patch versions:** When CCC is at v1.0.3, `projects.json` shows `"activeVersion": "1.0"`. Clarify whether the pointer tracks major.minor or major.minor.patch. |
| **CC session unresponsive / frozen prompt** | CC inside CCC frequently becomes unresponsive — the prompt freezes and the user cannot type or interact. This has happened repeatedly. Investigate root cause: is it a resource issue (memory/CPU), a stuck WebSocket, or a rendering deadlock? Add detection (e.g. heartbeat check) and recovery (auto-restart session or show "Session unresponsive — click to restart" banner). At minimum, the user must never be stuck with no way to act. |

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
| Integrated Claude chat panel | Claude.ai chat alongside terminal — keeps entire workflow inside CCC. Moved from v2.0: PatchPilot integration creates bug-to-patch pipeline. Open questions: API key cost, no embeddable SDK yet. |
| Promotion campaign | Show HN, Reddit (r/ClaudeAI, r/cursor), X/Twitter thread, blog post |

### Promotion strategy

Ship v1.0 → use it daily for 2-3 weeks → fix rough edges → ship v1.1 → promote. First impression must be flawless.

All promotion material should highlight: **v1.0 supports macOS natively. Linux and Windows support is code-complete — manual testing pending target hardware.**

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
