# Claude Command Center (CCC)
**Concept Document v1.0.4 — Patch Release**
*Seeded from v1.0.3*

---

## Patch Purpose

CCC v1.0.4 addresses three areas: (1) project rename propagation — currently only the treeview display name changes, breaking file detection, (2) UX improvements — testing refresh, splitter constraint, alphabetical sorting, red dot for waiting state, and (3) a full documentation audit to fix contradictions, gaps, and ambiguities accumulated across v1.0–v1.0.3. Additionally addresses the CC session unresponsive/frozen prompt issue.

---

## Scope

### Area 1: Project Rename (Full Propagation)

**Problem:** When renaming a project in CCC, only the `projects.json` display name changes. Everything else stays under the old name:
- Concept doc filenames (`{ProjectName}_concept.md`)
- Tasklist filenames (`{ProjectName}_tasklist.md`)
- Test file filenames (`{ProjectName}_test_stage*.md`)
- CLAUDE.md internal references
- `coreFiles` paths in `projects.json`
- SHP/handoff filenames

This breaks `scanVersionFiles` regex and other name-dependent features.

**Solution:**
- Add a `renameProject(projectId, newName)` function in `src/projects.js`
- On rename, scan and rename all files matching the old name pattern across `docs/`, `docs/handoff/`, and version folders
- Update `coreFiles` array in `projects.json` with new paths
- Update internal references in CLAUDE.md (grep + replace old name → new name)
- Wrap in a transaction-like pattern: collect all renames first, execute, roll back on failure

**Constraints:**
- Must handle version subfolders (`docs/vX.Y/`, `docs/vX.Y/vX.Y.Z/`)
- Must preserve git history (rename, not delete+create)
- Must refresh the treeview after rename completes
- Must NOT rename files that don't follow the `{ProjectName}_` pattern (e.g., `CLAUDE.md` itself)

### Area 2: UX Improvements

#### 2a. Testing Refresh Button
Add a refresh/rescan button next to the "Testing" sub-header in the treeview. Clicking it re-runs `scanVersionFiles` for that project and updates the test file list without requiring collapse/expand.

**Implementation:** Small icon button (e.g., `↻` or Material Symbols `refresh`) positioned inline with the "Testing" header. On click: `GET /api/projects/:id/versions` → update `projectVersions` map → re-render treeview node.

#### 2b. Splitter Max-Width Removal
The divider between treeview and reading panel has a max-width constraint preventing the treeview from expanding. Remove or significantly increase the cap (e.g., 600px minimum) so users with long project names or deep nesting can expand the treeview.

**Implementation:** Find the CSS `max-width` on the splitter/treeview container and either remove it or set it to 50% of viewport.

#### 2c. Treeview Alphabetical Sorting
All items in the treeview (projects, groups, files) must be sorted alphabetically. Currently order depends on `projects.json` insertion order / filesystem scan order.

**Implementation:** Sort in the frontend render function, not in `projects.json` (preserve user-defined order for drag & drop). Sort groups alphabetically, then projects within groups, then files within version sections.

#### 2d. "Waiting for Action" Red Dot
When CCC detects the session is waiting for user action (e.g., Claude asks a yes/no question), the status should show a red dot in both the treeview and the tab bar. Currently neither location renders it.

**Investigation:**
- Verify `parser.js` correctly detects WAITING_FOR_INPUT state
- Check if the status update reaches the frontend via WebSocket
- Check if the DOM rendering handles the "waiting" state for dot colour
- Fix whichever link in the chain is broken

### Area 3: Documentation Audit

#### Contradictions to Fix

**(1) SHP path:** CLAUDE.md says `docs/handoff/{ProjectName}_shp.md`, concept says `docs/{ProjectName}_shp.md`. Reality is `docs/handoff/`. Align both to `docs/handoff/`.

**(2) User Manual stage number:** CLAUDE.md says Stage 13, concept says Stage 16. Pick one and align.

**(3) Filename versioning convention:** Concept says "no versioning in filenames, ever" and shows `CCC_concept.md`. CLAUDE.md says "New files use `{Name}_concept_v{X.Y}.md`". Actual files on disk use versioned names. Update concept to match reality.

**(4) Slash commands scope:** Concept says commands belong in `~/.claude/commands/` (global). Reality is project-level `.claude/commands/`. Update concept to match.

#### Gaps to Fill

**(5) `src/usage.js` missing from Project Structure:** CLAUDE.md's tree doesn't list it — add it.

**(6) Roadmap v1.0 status:** Says "In development" but v1.0 is shipped. Update to "Shipped".

**(7) Anti-AI-Look rule 8 (border-radius):** Says "4px–6px max" but leadsieve-service UI kit mandates 0px. Make the rule project-agnostic: "Use sharp or minimal border-radius — follow the project's UI kit."

**(8) Anti-AI-Look rule 4 (palette):** Says "Avoid Navy + teal + slate grey" but CCC's own UI uses that palette. Reword to avoid naming specific colours CCC uses.

#### Ambiguities to Resolve

**(9) Test file requirement propagation:** `_test_stage` naming convention is only documented in CCC's own CLAUDE.md and concept. Either propagate to all project CLAUDE.md files or accept as CCC-only convention.

**(10) `activeVersion` pointer vs. patch versions:** When CCC is at v1.0.3, `projects.json` shows `"activeVersion": "1.0"`. Clarify whether the pointer tracks major.minor or major.minor.patch.

### Area 4: CC Session Unresponsive

**Problem:** CC inside CCC frequently becomes unresponsive — the prompt freezes and the user cannot type or interact. Happens repeatedly.

**Investigation:**
- Is it a resource issue (memory/CPU from long PTY sessions)?
- A stuck WebSocket (connection alive but no data flowing)?
- A rendering deadlock in xterm.js (terminal buffer overflow)?
- A node-pty issue (child process stopped responding)?

**Minimum requirement:** The user must never be stuck with no way to act.

**Solution options (implement at least one):**
1. **Heartbeat check** — ping PTY every 10s, if no response in 30s → show warning
2. **"Session unresponsive" banner** — detection triggers a visible banner with "Restart session" button
3. **Auto-recovery** — after 60s unresponsive, kill and restart PTY, inject `/continue` into new session
4. **Resource monitoring** — track PTY memory/CPU, warn before deadlock

---

## What Does NOT Change

- **Usage status bar** — shipped in v1.0.3, no changes
- **Terminal session core** — PTY, xterm.js basics unchanged (resilience additions only)
- **Stage-gate process** — stages, Go/NoGo gates, tasklist format
- **Slash commands** — all commands, paths, and behaviour unchanged
- **Persistence model** — JSON files
- **Cross-platform compatibility** must be maintained
- **Elastic License 2.0** applies

---

## Migration Notes

- No structural migration required
- Documentation fixes are text-only changes
- Project rename feature is additive (new function, new API endpoint)
- UX improvements are additive CSS/JS changes

---

*This is a patch release. For full project context, see `docs/v1.0/CCC_concept_v1.0.md`.*
