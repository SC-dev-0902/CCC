# Claude Command Center (CCC)
**Concept Document v1.0.2 — Patch Release**
*Seeded from v1.0.1*

---

## Patch Purpose

CCC v1.0.2 makes CCC compatible with the restructured SC-Development workspace. It updates CCC's project template, documentation model, file naming conventions, and SHP storage location. No changes to the running application's internals (terminals, parser, status detection, WebSocket, stage gates).

---

## Context: The SC-Development Workspace

CCC lives inside a larger workspace: `SC-Development/`. Previously, all projects sat flat alongside CCC at the workspace root. The workspace has been restructured:

```
SC-Development/
│
├── CCC/                              ← governance + orchestration (stays at root)
│
├── Projects/                         ← all managed projects
│   ├── CC-Monitor/
│   ├── Concorda/
│   ├── Forge/
│   ├── Jarvis/
│   ├── LedgerNest/
│   ├── Pactum - Core/
│   ├── PatchPilot/
│   ├── PeuanRuamChan/
│   ├── SC-Web/
│   └── TradingMaster/
│
├── Standards/                        ← shared development standards (workspace-level)
│
└── Templates/                        ← reusable templates and skills
    ├── ai-project-template/          ← project scaffold template
    ├── claude-skills/                ← Claude Code skills, copied into projects
    └── internal-web-governance/      ← web design governance docs
```

### Workspace Boundaries

Three actors operate in this workspace with clear separation of responsibility:

| Actor | Scope | Role |
|-------|-------|------|
| **Claude Coworker** | Entire `SC-Development/` workspace | Discusses, plans, produces concept docs, maintains workspace-level documents (Standards, Templates) |
| **CCC + CC** | Individual project folders | Builds projects — manages sessions, SHP, tasklists, status detection, terminals |
| **Normal CC** | CCC folder only | Builds CCC itself (CCC cannot build CCC — restart problem) |

**CCC does not modify the workspace.** CCC operates inside individual project folders only. It creates tasklists, writes SHPs, runs terminals, tracks status, scaffolds project structure. It never touches `Standards/`, `Templates/`, or other projects outside the active session's project boundary.

**CCC's `projectRoot` setting** remains `/Users/steinhoferm/SC-Development`. Project paths in `projects.json` are relative to this root. Projects under `Projects/` use paths like `Projects/LedgerNest`. CCC itself uses the path `CCC`.

---

## Change 1: Version Numbers in Filenames

**Previous rule:** "Never write version numbers into filenames. Version history lives in Git."

**New rule:** Version numbers are included in both the folder path and the filename. This eliminates ambiguity when referencing documents across conversations (Coworker, claude.ai, normal CC, CCC).

**Convention:**
```
docs/v1.0/v1.0.2/CCC_concept_v1.0.2.md     ← folder + filename carry version
docs/v1.0/v1.0.2/CCC_tasklist_v1.0.2.md     ← same for tasklist
```

**Rationale:** When working across multiple tools and conversations, seeing `CCC_concept.md` in three different version folders causes confusion. `CCC_concept_v1.0.2.md` is unambiguous regardless of where you encounter it.

**Scope:** This applies to concept docs and tasklists. Other files (CLAUDE.md, SHP, test files) retain their current naming.

**Scaffolding impact:** When CCC creates a new version (via the "New Version" action), it must scaffold templates with the version number already in the filename. For example, creating v1.0.2 scaffolds `CCC_concept_v1.0.2.md` and `CCC_tasklist_v1.0.2.md` — not `CCC_concept.md`. This applies to both the New Project Wizard and the New Version action.

---

## Change 2: Documentation Layer Model

Projects scaffolded by CCC adopt a richer documentation structure. The existing version-folder model is preserved for operational CCC files (concept, tasklist, test files). A new set of topic-based folders is added for project knowledge that accumulates across versions.

### Updated Project Structure

```
ProjectName/
│
├── CLAUDE.md                             ← project anchor, derived from active version concept
├── PROJECT_MAP.md                        ← filesystem table of contents (new)
│
├── docs/
│   ├── vX.Y/                             ← version-specific (CCC operational)
│   │   ├── ProjectName_concept_vX.Y.md
│   │   ├── ProjectName_tasklist_vX.Y.md
│   │   └── ProjectName_test_stageXX.md
│   │
│   ├── discussion/                       ← brainstorming, idea exploration
│   ├── architecture/                     ← system structure, component relationships
│   ├── spec/                             ← implementation contracts
│   ├── adr/                              ← architectural decision records
│   ├── context/                          ← persistent project knowledge
│   └── handoff/                          ← SHP + recovery file (new location)
│       ├── ProjectName_shp.md
│       └── ProjectName_recovery.md
│
├── src/
├── tests/
└── tools/
```

### Documentation Flow

```
discussion → concept → architecture → spec → implementation
```

| Layer | Purpose |
|-------|---------|
| `discussion/` | Brainstorming and idea exploration. Informal, unstructured. |
| `vX.Y/{Name}_concept_vX.Y.md` | Structured project concept for a specific version. Foundation for tasklist and CLAUDE.md. |
| `architecture/` | System structure, component relationships. Persists across versions. |
| `spec/` | Implementation contracts. Detailed enough for CC to build from. |
| `adr/` | Architectural Decision Records. Why choices were made. Persists across versions. |
| `context/` | Persistent project knowledge. Background info, domain knowledge, constraints. |
| `handoff/` | SHP and recovery file. Session continuity. |

### What is version-specific vs. project-level

**Version-specific** (lives in `docs/vX.Y/`): concept doc, tasklist, test files. These reset with each new version — a new version gets its own concept and tasklist.

**Project-level** (lives in topic folders): discussions, architecture docs, specs, ADRs, context, handoff files. These accumulate over the life of the project and persist across versions.

---

## Change 3: PROJECT_MAP.md

A new file at the project root: `PROJECT_MAP.md`. This is a filesystem table of contents — a quick-reference map of the project's folder structure and key files.

**Purpose:** CC orientation. After reading CLAUDE.md (the behavioural anchor), CC reads PROJECT_MAP.md to understand where everything lives. This is especially useful for projects with the new documentation layer model, where files are spread across multiple topic folders.

**Content example:**
```markdown
# Project Map — ProjectName

## Key Files
- `CLAUDE.md` — behavioural instructions for Claude Code
- `docs/v1.0/ProjectName_concept_v1.0.md` — active version concept
- `docs/v1.0/ProjectName_tasklist_v1.0.md` — active version tasklist

## Documentation
- `docs/discussion/` — brainstorming and idea exploration
- `docs/architecture/` — system structure and component diagrams
- `docs/spec/` — implementation contracts
- `docs/adr/` — architectural decision records
- `docs/context/` — persistent project knowledge
- `docs/handoff/` — SHP and recovery file

## Source
- `src/` — application source code
- `tests/` — test files
- `tools/` — automation scripts
```

**Maintenance:** PROJECT_MAP.md is updated when the project structure changes (new folders, renamed files, new versions). CCC scaffolds it during project creation. CC can update it as part of normal workflow.

---

## Change 4: SHP and Recovery File Location

**Previous location:** `docs/{ProjectName}_shp.md` (flat in docs root)

**New location:** `docs/handoff/{ProjectName}_shp.md`

The recovery file (auto-saved during sessions as a safety net against browser closure) also lives here:

```
docs/handoff/
├── ProjectName_shp.md            ← written at /eod, read by /continue
└── ProjectName_recovery.md       ← auto-saved every 5 minutes during session
```

**What changes:**
- `/eod` writes SHP to `docs/handoff/{ProjectName}_shp.md`
- `/continue` reads SHP from `docs/handoff/{ProjectName}_shp.md`
- Recovery auto-save writes to `docs/handoff/{ProjectName}_recovery.md`
- The global `~/.claude/CLAUDE.md` must be updated to v0.7 with the new SHP path

**What does NOT change:**
- SHP content and format — unchanged
- SHP is still a single file, overwritten each `/eod`
- Git still captures SHP history
- Recovery auto-save interval is still configurable in Settings

---

## Change 5: CCC New Project Wizard Update

The New Project Wizard scaffolds projects using the updated structure. When a user creates a new project through CCC, the wizard produces:

```
ProjectName/
├── CLAUDE.md                             ← from selected template
├── PROJECT_MAP.md                        ← auto-generated from structure
├── .ccc-project.json                     ← CCC metadata
│
├── docs/
│   ├── vX.Y/                             ← version folder
│   │   ├── ProjectName_concept_vX.Y.md   ← blank concept template
│   │   └── ProjectName_tasklist_vX.Y.md  ← blank tasklist template
│   ├── discussion/                       ← empty, ready
│   ├── architecture/                     ← empty, ready
│   ├── spec/                             ← empty, ready
│   ├── adr/                              ← empty, ready
│   ├── context/                          ← empty, ready
│   └── handoff/                          ← empty, ready
│
├── .claude/
│   └── commands/                         ← starter slash commands
│
├── src/
├── tests/
└── tools/
```

**Import flow** follows the same structure. When importing an existing project, CCC scaffolds the missing folders and files without overwriting anything that already exists (same non-destructive rule as v1.0.1).

---

## Change 6: CCC's Own Documentation Structure

CCC itself adopts the new documentation layer model. Existing version folders remain in place (the TreeView depends on them). New topic-based folders are added alongside them.

**Updated CCC docs structure:**
```
CCC/docs/
├── CCC_Roadmap.md                        ← version plan (stays at docs root)
├── USER_MANUAL.md                        ← user manual (stays at docs root)
├── screenshots/                          ← Playwright images (stays)
│
├── v1.0/                                 ← existing version folder (stays)
│   ├── CCC_concept_v1.0.md
│   ├── CCC_tasklist.md
│   ├── CCC_test_stage*.md
│   ├── v1.0.1/                           ← existing patch folder (stays)
│   │   ├── CCC_concept_v1.0.1..md
│   │   └── CCC_tasklist.md
│   └── v1.0.2/                           ← this patch
│       ├── CCC_concept_v1.0.2.md
│       └── CCC_tasklist_v1.0.2.md
│
├── discussion/                           ← new
├── architecture/                         ← new
├── spec/                                 ← new
├── adr/                                  ← new
├── context/                              ← new
└── handoff/                              ← new (SHP moves here)
    ├── CCC_shp.md
    └── CCC_recovery.md
```

**Migration:** The existing `docs/CCC_shp.md` moves to `docs/handoff/CCC_shp.md`. All other existing files stay where they are. New topic-based folders are created empty.

---

## What Does NOT Change

The following CCC internals are untouched in v1.0.2:

- **Terminal sessions** — PTY, xterm.js, WebSocket, background persistence
- **Parser** (`src/parser.js`) — status detection, five-state model, degradation handling
- **Usage tracking** (`src/usage.js`) — rolling window, epoch reset, safety buffer
- **Stage-gate process** — stages, Go/NoGo gates, tasklist format
- **Slash commands** — `/start-project`, `/continue`, `/eod`, `/tested`, `/create-tasklist`, `/reload-docs`, `/evaluate-import` (paths updated, behaviour unchanged)
- **Settings panel** — all existing settings preserved
- **Status dots** — colour model, tree view, tab bar
- **Git protocol** — commit conventions, tagging, push workflow
- **Tech stack** — Node.js, Express, ws, marked.js, vanilla JS
- **Persistence model** — JSON files (`projects.json`, `settings.json`)

---

## Migration Notes

### Previous Model
- Projects sat flat alongside CCC at the workspace root
- Concept and tasklist filenames had no version info
- SHP lived at `docs/{ProjectName}_shp.md`
- Project documentation was limited to concept + tasklist + CLAUDE.md
- No PROJECT_MAP.md

### New Model
- Projects live under `SC-Development/Projects/`
- CCC stays at `SC-Development/CCC/`
- Concept and tasklist filenames include version: `{Name}_concept_vX.Y.md`
- SHP and recovery file live in `docs/handoff/`
- Projects get topic-based documentation folders (discussion, architecture, spec, adr, context, handoff)
- PROJECT_MAP.md at project root for CC orientation

### Migration Steps (for normal CC to implement)

1. **Update file naming convention** in CCC's scaffolding code — concept and tasklist files include version in filename
2. **Update New Project Wizard** — scaffold the new folder structure (topic-based docs folders, PROJECT_MAP.md)
3. **Update Import Wizard** — scaffold missing topic-based folders during import
4. **Move SHP path** — `/eod` writes to `docs/handoff/`, `/continue` reads from `docs/handoff/`
5. **Move recovery auto-save path** — writes to `docs/handoff/{ProjectName}_recovery.md`
6. **Update CCC's project-level CLAUDE.md** — reflect new conventions (version-in-filename rule, new SHP path, PROJECT_MAP.md reference)
7. **Create CCC's own topic-based folders** — `docs/discussion/`, `docs/architecture/`, `docs/spec/`, `docs/adr/`, `docs/context/`, `docs/handoff/`
8. **Move CCC's own SHP** — from `docs/CCC_shp.md` to `docs/handoff/CCC_shp.md`
9. **Update `settings.json` file patterns** — concept and tasklist patterns include version placeholder
10. **Verify `projects.json` paths** — already updated (projects now under `Projects/`)

### Global CLAUDE.md Update (manual, by Phet)

The global `~/.claude/CLAUDE.md` must be updated to v0.7:
- SHP path: `docs/{ProjectName}_shp.md` → `docs/handoff/{ProjectName}_shp.md`
- Add PROJECT_MAP.md to the document hierarchy
- Update test file path references if needed
- Note the version-in-filename convention

---

## Scope

- Workspace compatibility + documentation model evolution only
- No new runtime features
- No parser changes
- No terminal changes
- No WebSocket changes
- No UI changes beyond wizard scaffolding updates
- Cross-platform compatibility must be maintained
- Elastic License 2.0 applies

---

*This is a patch release. For full project context, see `docs/v1.0/CCC_concept_v1.0.md`. For v1.0.1 patch context, see `docs/v1.0/v1.0.1/CCC_concept_v1.0.1..md`.*
