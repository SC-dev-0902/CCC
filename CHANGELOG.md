# Changelog

## v1.0.6
- Added: Non-code project support — projects can be typed as Code or Config, with Config skipping git validation
- Added: Project type badges (COD/CFG) in sidebar for visual identification
- Fixed: Slash command templates now deploy all 8 commands with workflow-aligned instructions (was 3 with outdated text)
- Fixed: Import modal no longer references non-existent `/start-project` command
- Fixed: Projects created via wizard can now always be dragged from Parked to Active
- Fixed: Test files for patch versions now land in the correct subfolder (e.g. `docs/v1.0/v1.0.6/`)

## v1.0.5
- Fixed: Usage bar label changed from "5h CLI" to "Rate limit (CLI only)" with tooltip explaining shared Anthropic limits
- Fixed: Test file and reading panel content now uses full panel width (was capped at 800px)
- Added: Version dot tooltips — hover to see what each status color means

## v1.0.4
- Fixed: Project rename now propagates to all files, folders, references, and coreFiles paths
- Fixed: Duplicate terminal input after WebSocket reconnect
- Fixed: File drops no longer navigate browser away from CCC
- Fixed: 10 documentation contradictions, gaps, and ambiguities across project docs
- Added: Session unresponsive detection — banner appears after 30s of no output, with restart option
- Added: WebSocket auto-reconnect on connection loss
- Added: Testing refresh button in treeview
- Changed: Treeview items sorted alphabetically
- Changed: Splitter max-width increased to 50vw

## v1.0.3
- Fixed: Usage status bar now counts cache creation tokens — previously showed <1% of actual usage
- Fixed: Reset timer counts down second-by-second (was updating once per minute)
- Fixed: Reset time now uses rolling window calculation aligned with Claude Desktop
- Fixed: Weekly token budget default updated for cache-inclusive counting
- Added: "Last updated" indicator shows when data was last refreshed
- Added: Subtle pulse animation when usage data refreshes
- Added: Staleness detection — bar dims when data stops flowing during active sessions
- Added: Configurable 5-hour token budget in Settings
- Changed: Status bar labelled "5h CLI" to clarify it shows local Claude Code usage only
- Changed: Safety buffers on all values — CCC now errs on the pessimistic side

## v1.0.2
- Fixed: Workspace compatibility for projects using underscore-prefixed filenames
- Added: Versioned filename convention for concept docs and tasklists
- Added: Topic folder scaffolding for all registered projects at startup
- Added: Active version delete with auto-fallback
- Changed: SHP and recovery paths moved to docs/handoff/
- Changed: New Project Wizard defaults location to project root's Projects/ subfolder

## v1.0.1
- Fixed: Import scaffolding no longer overwrites existing project files
- Fixed: Imported projects now match wizard-created project structure
- Fixed: /evaluate-import notice persists until explicitly cleared
- Fixed: Browser warns before closing with active sessions; periodic recovery auto-save
- Fixed: New Version dialog option alignment
- Added: Auto-inject /continue when reopening a project with an existing SHP
- Added: Usage status bar with 5-hour window and 7-day weekly tracking
- Added: Configurable weekly token and message budgets in Settings

## v1.0.0
- Unified dashboard for managing multiple Claude Code sessions
- Split-pane interface with project tree view and tabbed terminal sessions
- Live colour-coded status detection (red, yellow, green, orange, grey)
- Full interactive terminal with PTY — colours, scroll, resize, keyboard shortcuts
- Inline Markdown preview for project files (concept docs, tasklists, SHPs)
- "Open in Editor" integration with configurable external editor
- New Project Wizard with template scaffolding (Web App, API, Script, Research, Blank)
- Import existing projects with auto-detection of concept docs and tasklists
- Project versioning with version folders, active version tracking, and Git tagging
- Patch version support nested inside parent minor versions
- Interactive test runner for pre-GoNoGo stage gate checklists
- Project memory via Session Handover Packs (SHP) with `/start-project`, `/eod`, `/continue`
- Settings panel: theme (dark/light), editor, shell, file patterns, GitHub token
- Drag-and-drop project reordering between groups
- First-run onboarding experience
- Cross-platform support: macOS, Linux, Windows
- OS-specific installer scripts and release build tooling
