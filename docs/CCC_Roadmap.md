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

## v1.0.1 — Bug Fixes & Usage Status Bar

**Status:** Shipped
**Prerequisite:** v1.0 shipped
**Theme:** Fix critical bugs found during real-world testing. Add usage visibility.

### What ships in v1.0.1

| Area | Scope |
|------|-------|
| **Bug #3 — Import overwrites existing files (CRITICAL)** | Importing a project with existing `*_concept.md` was overwriting it with an empty template. Import is now fully non-destructive — only missing files are scaffolded, existing files are never touched. |
| **Bug #2 — Imported projects missing folder hierarchy** | Import Wizard now produces identical output to New Project Wizard — full `docs/` and version folder structure, version field for developer to specify (e.g. v1.0), CLAUDE.md template at root if missing. |
| **Bug #1 — No /evaluate-import notice** | All imports now set `evaluated: false` in `projects.json`. Persistent UI notice prompts developer to run `/evaluate-import` before starting work. New endpoint `POST /api/projects/:id/evaluated` clears the flag. `/evaluate-import` supports two modes: generate from scratch (no concept doc) or audit existing concept doc against actual project artifacts. |
| **Bug #4 — SHP lost on browser close** | Two-layer defence: `beforeunload` warning when active sessions exist + periodic SHP auto-save every 5 minutes. |
| **Improvement #5 — Auto-run /continue on session reopen** | On session start, CCC checks for an existing SHP. If found, auto-injects `/continue` after the Claude Code prompt is visible. |
| **Improvement #7 — Usage status bar** | Persistent status bar fixed to bottom of window (~28px). Hidden on launch, appears on first usage message from PTY. Parser emits `usageUpdate` events (percent, resetTime, isWeekly). Colour thresholds: amber at 80%, red at 95%. Bar is additive — no changes to existing parser state logic. |
| **Bug #6 — New Version dialog misaligned** | Select options (Major/Minor/Patch) were left-aligned instead of under label text. Fixed to match other CCC dialogs. |

---

## v1.0.2 — Workspace Restructure & Documentation Model

**Status:** Shipped
**Prerequisite:** v1.0.1 shipped
**Theme:** Align CCC with the restructured SC-Development workspace. Evolve the project documentation model.

### What ships in v1.0.2

| Area | Scope |
|------|-------|
| **Versioned filenames** | Version numbers now included in both folder path and filename: `docs/v1.0/v1.0.2/CCC_concept_v1.0.2.md`. Eliminates ambiguity across tools and conversations. New Project Wizard and New Version action scaffold files with version already in the filename. |
| **Documentation layer model** | Projects get topic-based doc folders alongside version folders: `discussion/`, `architecture/`, `spec/`, `adr/`, `context/`, `handoff/`. Version-specific files (concept, tasklist, test files) stay in `docs/vX.Y/`. Project-level knowledge (ADRs, specs, context) accumulates across versions in topic folders. |
| **PROJECT_MAP.md** | New file at project root — filesystem table of contents for CC orientation. Scaffolded by CCC on project creation. Lists key files, doc folders, and source layout. |
| **SHP relocation** | SHP moved from `docs/{ProjectName}_shp.md` to `docs/handoff/{ProjectName}_shp.md`. Recovery file auto-saved to `docs/handoff/{ProjectName}_recovery.md`. `/eod` and `/continue` updated to new path. |
| **New Project Wizard update** | Wizard scaffolds the full new folder structure: topic-based doc folders, PROJECT_MAP.md, versioned concept and tasklist filenames. Import follows the same structure — non-destructive. |
| **CCC own docs restructured** | CCC itself adopts the new doc layer model. Topic-based folders added to `CCC/docs/`. Existing version folders preserved. SHP moved to `docs/handoff/CCC_shp.md`. |

---

## v1.0.3 — Usage Status Bar Fixes

**Status:** Shipped
**Prerequisite:** v1.0.2 shipped
**Theme:** Fix the usage bar so it communicates clearly and reliably. The backend was correct — the display was not.

### What ships in v1.0.3

| Area | Scope |
|------|-------|
| **Countdown timer — tick every second** | Reset countdown was appearing frozen between data refreshes. Timer now ticks every second using the `resetTime` ISO string from the server. Format: `Xh Ym Zs`. Broken formatter string (`"Resets in resetting..."`) fixed. |
| **"Last updated" indicator** | Small timestamp showing when the last successful data refresh occurred (e.g. `· updated 5s ago`). Gives the developer confidence the bar is alive even when numbers haven't changed. |
| **Pulse animation on refresh** | Visual heartbeat — bar briefly flashes when new data arrives from server via WebSocket or REST poll. `usage-pulse` CSS class triggers on `updateUsageBar()`. |
| **Staleness detection (session-aware)** | If no successful refresh in 60 seconds while a terminal session is active: bar dims to ~0.75 opacity, "last updated" indicator turns amber. Staleness flag cleared immediately when fresh data arrives. No staleness shown when no session is active — expected behaviour, not an error. |
| **Edge case handling** | `updateUsageBar()` handles identical consecutive data (still pulses, still updates timestamp), zero values, missing fields, and undefined data without breaking the display. |

**Design principle:** CCC displays usage pessimistically — data is CLI-only and the shared pool is invisible. Safety buffers (+5pp token buffer, -30min timer buffer) retained unchanged.

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

## v1.0.5 — Usage Clarity & UI Polish

**Status:** Shipped
**Prerequisite:** v1.0.4 shipped
**Theme:** Fix misleading usage display and small UI gaps identified during daily use.

### What ships in v1.0.5

| Area | Scope |
|------|-------|
| **Usage bar label** | "5h CLI" is misleading — implies a personal session and a full 5 hours. Both are wrong. The window is Anthropic's shared rate limit, not the user's session, and it runs out faster because Chat/Desktop consumption is invisible to CCC. New label: "Rate limit: X% (CLI only - actual limit may be lower)". Display must communicate clearly what is being measured and its limitations. |
| **Version dot tooltip** | The colored dot in front of the version number in the treeview should show a tooltip on hover explaining what each color means (e.g. green/amber/red/grey and what each indicates for that project's status). CSS `title` attribute or a custom hover tooltip - consistent with existing CCC design language. |
| **Test file reading panel — full width** | When a test file is opened in the reading panel, the content only renders at half the panel width. The right half is empty. Content must use the full available width of the reading panel, same as any other file. |

---

## v1.0.6 — Non-Code Projects, Workflow Enforcement & Activation Fix

**Status:** Shipped
**Prerequisite:** v1.0.5 shipped
**Theme:** Final local-era release. Non-code project support, pipeline enforcement in code, and activation gate fixes.

### What ships in v1.0.6

| Area | Scope |
|------|-------|
| **Non-code project support** | New `type` field on projects: `"code"` (default) or `"config"`. Config projects skip git requirements (branch checks, commit history, repo validation) but keep the full stage-gate workflow. Project creation/edit UI exposes the type field. Treeview shows **COD** / **CFG** badge on all projects. Startup migration backfills `type: "code"` on existing projects. |
| **Development workflow enforcement** | `generateSlashCommand()` rewritten to support all 8 commands with workflow-aligned text matching CCC's own `.claude/commands/`. Both scaffold routes (`scaffold-project` and `scaffold-import`) now deploy all 8 commands (was 3). Audit confirmed no code path auto-generates populated tasklists. `/start-project` references removed from import modal UI. |
| **Test file version-aware placement** | `getTestFilePath()` helper added to `src/versions.js`. New `GET /api/projects/:id/test-file-path?stage=N` endpoint returns the correct path and auto-creates the directory. Patch versions (v1.0.6) place test files in `docs/v1.0/v1.0.6/` — not the major version root. |
| **Project activation fix** | Comprehensive fix of the activation gate. `evaluated: undefined` no longer blocks Parked→Active drag. `addProject()` defaults `evaluated: true` when undefined. All code paths checked — `handleDrop()`, edit modal, API validation. Config projects bypass evaluation checks entirely. Ad-hoc 2026-03-27 fix removed and replaced with proper solution. |

---

## v1.0.7 — Sub-Stage & Fix Test File Detection

**Status:** Shipped
**Prerequisite:** v1.0.6 shipped
**Theme:** CCC's test file regex only matches main-stage files. Sub-stage and fix test files are invisible to the treeview and the path API.

### What ships in v1.0.7

| Area | Scope |
|------|-------|
| **Regex fix — flat docs scan** | `src/versions.js` flat scan regex updated from `_test_stage\d+\.md$` to `_test_stage\d+[a-z]?\d*\.md$`. Flat legacy test files with sub-stage or fix suffixes are now detected. |
| **Regex fix — version folder scan** | Same regex fix applied to `scanVersionFiles()` in `src/versions.js`. Sub-stage and fix test files in version/patch subfolders are now detected and shown in the treeview. |
| **Regex fix — frontend test runner** | `public/app.js` `isTestFile()` regex updated to `_test_stage\d+[a-z]?\d*\.md$` so the test runner renders interactive checkboxes for sub-stage and fix test files instead of plain markdown. |
| **API fix — stage identifier as string** | `GET /api/projects/:id/test-file-path` previously called `parseInt(req.query.stage)`, silently stripping letter suffixes. Now accepts string stage identifiers matching `\d+[a-z]?\d*` (e.g. `11`, `11a`, `11a01`). |
| **`getTestFilePath()` fix** | Updated to accept a string stage identifier. Pads only purely numeric identifiers to 2 digits; sub-stage identifiers (e.g. `11a`, `11a01`) are used as-is. |
| **CLAUDE.md update** | Treeview regex documented in Stage Gate Process section updated to reflect the new pattern. |

**Naming convention supported after this patch:**
- `CCC_test_stage11.md` — main stage
- `CCC_test_stage11a.md` — sub-stage
- `CCC_test_stage11a01.md` — fix

---

## v1.1 — Server Mode, DB Migration & Promotion Tour

**Status:** Planned
**Prerequisite:** v1.0.x patches shipped, PatchPilot available
**Theme:** CCC grows from a local tool to an optionally centralized command center. DB migration replaces fragile JSON files. Then go public.

### What ships in v1.1

| Area | Scope |
|------|-------|
| **Server mode (optional)** | At install time, choose `--mode local` (default, current behavior) or `--mode server`. Server mode binds to `0.0.0.0` instead of `localhost`, enables authentication middleware, and optionally configures Cloudflare Tunnel + Access. Local mode stays zero-config as today. Single codebase, no fork — just a config switch via `CCC_MODE` env var. |
| **Authentication (server mode)** | Required for server mode only. Cloudflare Access (email-based one-time codes, zero-trust) as the primary auth layer. No passwords to manage. Local mode has no auth (it's your machine). |
| **DB migration — mode-aware backend** | Replace file-based JSON storage (`projects.json`, SHP files) with a proper database. The backend follows the mode: **Local mode → SQLite** (zero config, embedded, no daemon needed). **Server mode → PostgreSQL or MariaDB** (concurrent access, transactions, proper locking). Abstraction layer so the app code doesn't care which DB runs underneath. |
| **Data migration tool** | One-time migration script: reads existing `projects.json` + SHP files → inserts into the chosen DB. Non-destructive — original files kept as backup. Runs automatically on first start after upgrade. |
| Bug fixes | Anything found during daily use (v1.0.5+ fixes roll in here) |
| Degradation detection | Redesign — current approach triggers false positives on idle and decorative output |
| Polish | UI refinements, performance, edge cases |
| README | Polished with GIF/screen recording |
| Integrated Claude chat panel | Claude.ai chat alongside terminal — keeps entire workflow inside CCC. PatchPilot integration creates bug-to-patch pipeline. Open questions: API key cost, no embeddable SDK yet. |
| Promotion campaign | Show HN, Reddit (r/ClaudeAI, r/cursor), X/Twitter thread, blog post |

### Server mode architecture

```
┌─────────────────────────────────────────────────┐
│  CCC_MODE=local (default)                       │
│  ┌───────────┐   ┌──────────┐   ┌───────────┐  │
│  │ Express   │──▸│ SQLite   │   │ node-pty  │  │
│  │ localhost │   │ embedded │   │ local PTY │  │
│  └───────────┘   └──────────┘   └───────────┘  │
│  No auth · single user · zero config            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  CCC_MODE=server                                │
│  ┌───────────┐   ┌──────────┐   ┌───────────┐  │
│  │ Express   │──▸│ PostgreSQL│   │ node-pty  │  │
│  │ 0.0.0.0  │   │ or Maria │   │ server PTY│  │
│  └─────┬─────┘   └──────────┘   └───────────┘  │
│        │                                         │
│  ┌─────▼─────────────────────┐                  │
│  │ Cloudflare Tunnel + Access│                  │
│  │ (zero-trust auth gate)    │                  │
│  └───────────────────────────┘                  │
│  Auth required · multi-device · DC deployment   │
└─────────────────────────────────────────────────┘
```

### DB abstraction layer

The application code uses a storage interface — never raw SQL or file reads:

```
StorageInterface
├── getProjects() / saveProject() / deleteProject()
├── getSHP() / saveSHP() / listSHPs()
├── getSettings() / saveSettings()
└── migrate()

Implementations:
├── SqliteStorage    ← local mode
└── PostgresStorage  ← server mode (or MariaDB)
```

### Design questions for v1.1 (to be resolved before development)

- Cloudflare Access vs. simple token auth for server mode? (Leaning Cloudflare — consistent with LeadSieve)
- Should server mode support multiple users, or just multi-device for a single user?
- PTY session security in server mode — is Cloudflare Access sufficient, or do we need per-session tokens?
- DB schema design — what tables replace `projects.json`? (projects, groups, core_files, shp_entries, settings)

### Promotion strategy

Ship v1.0.x → DB migration + server mode → polish → ship v1.1 → promote. First impression must be flawless. PatchPilot available at launch gives a real ecosystem story.

All promotion material should highlight: **CCC runs locally (zero config) or as a central server (Cloudflare-secured). v1.0 supports macOS natively. Linux and Windows support is code-complete — manual testing pending target hardware.**

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
**Theme:** CCC becomes a context-aware command center. Full project history with search. DB is already in place from v1.1.

### Candidate features

| Area | Scope |
|------|-------|
| Searchable history | Full-text search across all stored SHPs per project (DB already available from v1.1) |
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
