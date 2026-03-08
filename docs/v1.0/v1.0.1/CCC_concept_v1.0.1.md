# Claude Command Center (CCC)
**Concept Document v1.0.1 — Patch Release**
*Seeded from v1.0.0*

---

## Patch Purpose

Six issues found during real-world testing. Fix order: 3 → 2 → 1 → 4 → 5 → 6.

---

## Bug #3 — Import overwrites existing concept docs (CRITICAL)

Importing a project that already has `*_concept.md` overwrites it with an empty template. Data loss.

**Fix:** Check for existing files before scaffolding. If file exists, don't touch it. Only scaffold what's missing. Import is non-destructive — already stated in v1.0 concept but not implemented correctly.

---

## Bug #2 — Imported projects don't match New Project Wizard output (HIGH)

After import, no folder hierarchy in tree view or filesystem.

**Fix:** Import Wizard must produce identical result to New Project Wizard — scaffold `docs/` and version folder, show full hierarchy in tree, include a version field so developer can specify what version the project represents (e.g. v1.0, v0.5). Place `CLAUDE.md` template at root if missing. Place concept/tasklist templates in version folder if missing — but never overwrite existing files (Bug #3).

---

## Bug #1 — No /evaluate-import notice (MEDIUM)

Importing a non-CCC project completes silently. No message telling developer to run `/evaluate-import`.

**Fix:** All imports set `"evaluated": false` in `projects.json` — always, regardless of whether a concept doc exists. Display persistent UI notice: *"Run `/evaluate-import` in your Claude Code session before starting work."*

The flag only clears via an explicit API call: `POST /api/projects/:id/evaluated`. No auto-clear based on file detection. `/evaluate-import` calls this endpoint (via `curl`) at completion.

New endpoint: `POST /api/projects/:id/evaluated` — sets `evaluated: true` in `projects.json`.

`/evaluate-import` operates in two modes:
- **Mode A** — No concept doc exists: Claude Code reads code/configs, interviews developer, generates concept doc, CLAUDE.md, and tasklist from scratch.
- **Mode B** — Concept doc exists: Claude Code reads the existing concept doc AND scans actual project artifacts (code, configs, folder structure, dependencies). Compares what the concept describes against what actually exists. Reports gaps, inconsistencies, outdated information. Developer reviews and decides what to update.

The sequence: Import → `/evaluate-import` → review → `/start-project`. `/evaluate-import` is always required after import.

**Blocked by:** Bug #2.

---

## Bug #4 — SHP lost on browser close (HIGH)

Two layers of defence.

**Layer 1:** `beforeunload` event when active sessions exist — browser warns before closing.

**Layer 2:** Periodic SHP auto-save every 5 minutes (configurable). `/eod` remains the clean handover, periodic save is insurance.

Evaluate whether CCC instructs Claude Code to produce SHP or captures enough state to write one independently — simpler approach wins.

---

## Improvement #5 — Auto-run /continue on session reopen (QoL)

When CCC launches Claude Code session, check if `docs/{ProjectName}_shp.md` exists. If yes, auto-inject `/continue` after session starts. If no SHP, do nothing. Must wait until Claude Code prompt is visible before injecting.

---

## Improvement #7 — Usage Status Bar (QoL)

Developer has no visibility of Claude Code usage limits without leaving CCC to check settings.

**Fix:** Add a persistent status bar fixed to the bottom of the CCC window (full width, ~28px). The bar is hidden on launch and appears only after the first usage message arrives — no placeholder, no flash on startup.

**Data source:** Claude Code already emits usage messages through the PTY output stream, e.g.:
```
You've used 96% of your session limit · resets 1am (Asia/Bangkok) · /upgrade to keep using Claude Code
```
The parser captures this — no API calls, no polling required.

**`src/parser.js`:** Add a usage pattern alongside existing state patterns. On match, emit a `usageUpdate` event with three fields: `percent` (integer), `resetTime` (string), `isWeekly` (boolean — true when "weekly" appears instead of "session").

**`src/server.js`:** Listen for `usageUpdate` events. Store the last known usage object in memory. Broadcast to all connected WebSocket clients as a `usage` message type. Send stored value immediately to any new client on connect.

**Frontend:** Status bar displays three items left-aligned with separators: session percentage with a small progress indicator, reset time, and a subtle "weekly" badge when `isWeekly` is true. Percentage colour: neutral by default, amber at ≥80%, red at ≥95%. Uses existing CCC colour palette.

**Scope constraint:** Usage detection is additive only. No changes to existing parser state logic.

---

## Bug #6 — New Version dialog misaligned (LOW)

Select options (Major/Minor/Patch) are left-aligned instead of under label text. Fix alignment to match other CCC dialogs.

---

## Fix Order

Bug #3 → Bug #2 → Bug #1 → Bug #4 → Improvement #5 → Bug #6 → Improvement #7

Rationale:
- Bug #3 (overwrite protection) is critical — data loss, fix first
- Bug #2 (folder scaffolding) depends on Bug #3 — scaffolding must respect existing files
- Bug #1 (evaluate notice) depends on Bug #2 — notice only makes sense when folder structure exists
- Bug #4 (SHP safety) is independent but lower priority than data loss
- Improvement #5 (auto-continue) is quality-of-life, lowest risk
- Bug #6 (dialog alignment) is cosmetic, near-last
- Improvement #7 (usage status bar) is additive and independent — done last

---

## Scope

- Bug fixes and one improvement only. No new features.
- No parser changes.
- No New Project Wizard changes.
- Cross-platform compatibility must be maintained.
- Elastic License 2.0 applies.

---

*This is a patch release. For full project context, see `docs/v1.0/CCC_concept.md`.*