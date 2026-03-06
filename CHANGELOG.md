# Changelog

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
