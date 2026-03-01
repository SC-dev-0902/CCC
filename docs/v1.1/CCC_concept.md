# CCC v1.1 — Concept Document
*Version: 1.1*
*Codename: Ground Crew*

---

## Preface: What Changed Since v1.0

CCC v1.0 shipped as the cockpit — a unified dashboard for managing Claude Code sessions with project memory, status detection, and a split-pane interface. The developer sits in the cockpit, sees all projects, manages sessions, and works with full context via SHPs.

v1.1 makes the cockpit externally addressable. A new companion tool — **PatchPilot** — needs to deliver analyzed bug reports to CCC and receive resolution confirmations back. CCC v1.1 provides the interfaces PatchPilot requires while keeping all decision authority with the developer.

PatchPilot is a separate project. It is not a feature inside CCC. CCC v1.1 does not depend on PatchPilot being installed or running. Every feature in this document works with or without PatchPilot — the API is a general-purpose inbound interface, the issue management is native CCC functionality, and the developer remains the pilot at every step.

Additionally, v1.1 redesigns the degradation detection system that was disabled in v1.0 due to persistent false positives.

---

## The Problem v1.1 Solves

### The External Information Gap

CCC v1.0 is self-contained. The developer opens CCC, sees their projects, starts sessions, works. But bug reports arrive *outside* CCC — on GitHub, Forgejo, email, Discord. The developer must context-switch: read the issue tracker, mentally map it to a CCC project, decide what to do, then come back to CCC and work the fix. After the fix ships, they go back to GitHub to close the issue, write a comment, and notify the team. Every step outside CCC is a context break.

CCC v1.1 closes this gap by accepting issue packages from external tools and integrating them into the tree view the developer already watches. The developer never leaves CCC. External tools push information in; CCC surfaces it; the developer decides and acts; CCC reports the resolution back for external tools to consume.

### The Degradation Detection Problem

v1.0's degradation detection used a timer-based approach: if the parser didn't recognise output for 60 seconds, the session was marked "degraded." This produced false positives on idle sessions and streaming character-by-character output. The monitor was disabled entirely before v1.0 shipped. v1.1 redesigns this from scratch.

---

## Core Concepts

### The Boundary

This boundary was established in v1.0 and is reinforced in v1.1:

**CCC is the cockpit.** The developer sees everything here. All decisions happen here. CCC never acts autonomously — every action requires the developer's explicit choice.

**PatchPilot is the ground crew.** It prepares mission briefings (issue packages) and handles post-mission communication (closing issues, notifying channels). It has no authority over code, versions, sessions, or decisions.

**The developer is always the pilot.** PatchPilot delivers packages to CCC. CCC surfaces them. The developer decides which version to assign them to, when to work them, and whether to work them at all.

### Code Sovereignty

This is non-negotiable and defines the architecture:

- PatchPilot **never** starts a CCC session
- PatchPilot **never** interacts with Claude Code
- PatchPilot **never** modifies project files
- PatchPilot **never** assigns issues to versions
- PatchPilot **never** decides when or whether a fix happens
- CCC **never** acts on an issue without the developer's explicit action

PatchPilot pushes packages in. CCC tells PatchPilot when resolutions are ready. Everything in between is the developer's domain inside CCC.

---

## Feature 1: Inbound REST API

### Purpose

CCC exposes an HTTP API on localhost that external tools (starting with PatchPilot) can call to push information in and query project state. This is the only way external tools interact with CCC.

### Base URL

```
http://localhost:{CCC_PORT}/api/v1
```

The port comes from CCC's existing `.env` configuration. All endpoints are prefixed with `/api/v1` for future versioning.

### Authentication

CCC and external tools run on the same machine. A shared secret token in `.env` provides access control:

```
CCC_API_TOKEN=<shared-secret>
```

Every request must include:

```
Authorization: Bearer <shared-secret>
```

CCC rejects requests without a valid token. This prevents accidental or unauthorized access, even on localhost.

### Endpoints

#### 1. Health Check

```
GET /api/v1/health
```

Returns CCC's status, version, and API version. External tools call this to verify CCC is running before attempting operations.

**Response:**

```json
{
  "status": "ok",
  "version": "1.1.0",
  "apiVersion": "v1"
}
```

#### 2. List Projects

```
GET /api/v1/projects
```

Returns all CCC-managed projects with their configuration, including PatchPilot-specific fields where enabled.

**Response:**

```json
{
  "projects": [
    {
      "id": "ccc-unique-id",
      "name": "MyApp",
      "path": "/Users/phet/Projects/MyApp",
      "group": "Active",
      "activeVersion": "v1.0",
      "repo": {
        "platform": "github",
        "owner": "phet",
        "name": "myapp"
      },
      "patchpilot": {
        "enabled": true,
        "intakeMode": "label",
        "triggerLabel": "bugfix-ready"
      }
    }
  ]
}
```

**Notes:**
- `repo` and `patchpilot` are new fields added to the project model in v1.1
- Projects without PatchPilot enabled still appear but with `patchpilot.enabled: false`

#### 3. Get Project Detail

```
GET /api/v1/projects/{projectId}
```

Returns full project details including version history, SHP status, and PatchPilot configuration.

**Response:**

```json
{
  "id": "ccc-unique-id",
  "name": "MyApp",
  "path": "/Users/phet/Projects/MyApp",
  "group": "Active",
  "activeVersion": "v1.0",
  "versions": [
    {
      "version": "v1.0",
      "status": "completed",
      "taggedAs": "v1.0.0"
    },
    {
      "version": "v1.0.1",
      "status": "in-progress",
      "taggedAs": null
    }
  ],
  "repo": {
    "platform": "github",
    "owner": "phet",
    "name": "myapp"
  },
  "patchpilot": {
    "enabled": true,
    "intakeMode": "label",
    "triggerLabel": "bugfix-ready"
  },
  "shpExists": true,
  "shpPath": "docs/MyApp_shp.md"
}
```

#### 4. Push Issue Package

```
POST /api/v1/projects/{projectId}/issues
```

External tools deliver analyzed issue packages to CCC. The package contains everything needed for a `/bugfix` session.

**Request body:**

```json
{
  "issueNumber": 42,
  "platform": "github",
  "repoFullName": "phet/myapp",
  "issueUrl": "https://github.com/phet/myapp/issues/42",
  "title": "Login fails after session timeout",
  "severity": "high",
  "classification": "bug",
  "affectedComponent": "session-handling",
  "qualityScore": 8,
  "reproductionAvailable": true,
  "relatedIssues": [
    {
      "number": 38,
      "title": "Session cookie not cleared on logout",
      "status": "closed",
      "relevance": "same component"
    }
  ],
  "package": "# PatchPilot Issue Package\n## Project: MyApp\n## Issue: #42 — Login fails after session timeout\n..."
}
```

**Response:**

```json
{
  "status": "accepted",
  "issueId": "ccc-internal-issue-id"
}
```

**Behaviour:**
- CCC stores the issue in the project's unassigned issue pool
- The issue appears in the tree view under the project, awaiting developer assignment
- If an issue with the same `issueNumber` and `platform` already exists, CCC replaces it (update, not duplicate)

#### 5. Update Issue Status

```
PATCH /api/v1/projects/{projectId}/issues/{issueId}
```

External tools update an issue's status when something changes outside CCC (e.g., user closed the issue directly on GitHub).

**Request body:**

```json
{
  "status": "resolved",
  "resolvedInVersion": "v1.0.1",
  "resolvedAt": "2026-02-28T14:30:00Z"
}
```

**Allowed status values:**

| Status | Meaning |
|--------|---------|
| `pending` | Delivered to CCC, awaiting developer action |
| `assigned` | Developer assigned the issue to a patch version |
| `in-progress` | Developer has opened a `/bugfix` session for this issue |
| `resolved` | Patch tagged, issue fixed |
| `dismissed` | Developer dismissed the issue via CCC |
| `rejected` | Developer rejected the issue via CCC |

**Note:** `assigned` and `in-progress` are set by CCC when the developer acts. External tools typically only set `resolved` (when detecting a tag) or query status.

#### 6. Get Issue Status

```
GET /api/v1/projects/{projectId}/issues/{issueId}
```

Returns the current state of a delivered issue.

**Response:**

```json
{
  "issueId": "ccc-internal-issue-id",
  "issueNumber": 42,
  "platform": "github",
  "status": "resolved",
  "assignedToVersion": "v1.0.25",
  "deliveredAt": "2026-02-28T10:00:00Z",
  "updatedAt": "2026-02-28T14:30:00Z",
  "resolvedInVersion": "v1.0.25",
  "resolvedAt": "2026-02-28T14:30:00Z"
}
```

#### 7. List Issues for Project

```
GET /api/v1/projects/{projectId}/issues
```

Returns all issues for a project, optionally filtered by status. PatchPilot uses this to reconcile its own state on startup and to poll for resolutions.

**Query parameters:**

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `status` | (all) | Filter: `pending`, `assigned`, `in-progress`, `resolved`, `dismissed`, `rejected` |

**Response:**

```json
{
  "issues": [
    {
      "issueId": "ccc-internal-issue-id",
      "issueNumber": 42,
      "platform": "github",
      "title": "Login fails after session timeout",
      "severity": "high",
      "status": "resolved",
      "assignedToVersion": "v1.0.25",
      "resolvedInVersion": "v1.0.25",
      "deliveredAt": "2026-02-28T10:00:00Z",
      "updatedAt": "2026-02-28T14:30:00Z"
    }
  ]
}
```

This is the primary endpoint PatchPilot polls to detect resolutions. When it finds `"status": "resolved"` with a `resolvedInVersion`, it knows the fix shipped and can close the GitHub issue, post the comment, and notify channels.

#### 8. Get Indicator Count

```
GET /api/v1/projects/{projectId}/indicators
```

Diagnostic endpoint — returns counts for health-check purposes.

**Response:**

```json
{
  "projectId": "ccc-unique-id",
  "pendingIssueCount": 2,
  "assignedCount": 1,
  "inProgressCount": 1
}
```

### Error Responses

All endpoints follow a consistent error format:

```json
{
  "error": "descriptive-error-code",
  "message": "Human-readable explanation"
}
```

| HTTP Status | Error Code | Meaning |
|-------------|------------|---------|
| 400 | `invalid-request` | Malformed request body or missing required fields |
| 401 | `unauthorized` | Missing or invalid API token |
| 404 | `project-not-found` | No project with this ID |
| 404 | `issue-not-found` | No issue with this ID for this project |
| 409 | `duplicate-issue` | Issue already exists (use update instead) |
| 500 | `internal-error` | CCC encountered an unexpected error |

---

## Feature 2: Issue Management in the Tree View

### The Unassigned Issue Pool

When PatchPilot (or any external tool) pushes an issue package to CCC, it lands in the project's **unassigned issue pool**. This pool is visible in the tree view as a node under the project:

```
MyApp
  ├── v1.0 (active)
  │    ├── concept doc, tasklist, etc.
  │    ├── v1.0.24 (completed, tagged)
  │    └── v1.0.25 (in progress)
  ├── 📋 Unassigned Issues (3)
  │    ├── #42 Login fails after session timeout [high]
  │    ├── #38 Session cookie not cleared [medium]
  │    └── #29 Dashboard 401 errors [low]
  └── v0.9 (completed)
```

**Display rules:**
- The pool shows at project level, not under any specific version
- Each issue shows: number, title, severity badge
- Issues are sorted by severity (critical → high → medium → low), then by delivery time
- The pool node shows a count badge
- Clicking an issue opens a read panel with the full issue package (Markdown rendered)

### Assignment via Drag & Drop

The developer assigns issues to patch versions by dragging them from the unassigned pool onto a version node in the tree:

1. Developer drags `#42 Login fails after session timeout` from the unassigned pool
2. Drops it onto `v1.0.25` (or creates a new patch version first)
3. CCC moves the issue from unassigned to assigned under that version
4. Issue status changes from `pending` → `assigned`

```
MyApp
  ├── v1.0 (active)
  │    ├── v1.0.25 (in progress)
  │    │    ├── docs...
  │    │    ├── 🔧 #42 Login fails after session timeout
  │    │    └── 🔧 #38 Session cookie not cleared
  │    └── v1.0.26 (planned)
  ├── 📋 Unassigned Issues (1)
  │    └── #29 Dashboard 401 errors [low]
  └── v0.9 (completed)
```

**Rules:**
- Issues can only be assigned to patch versions under the active major/minor version
- Multiple issues can be assigned to the same patch version (bundled fix)
- Issues can be dragged back to the unassigned pool (unassign)
- Drag & drop uses the same infrastructure as CCC v1.0's project reordering

### Issue Actions

Right-clicking an issue (or via a context menu) provides:

| Action | Effect | Status Change |
|--------|--------|---------------|
| **Review** | Opens the full issue package in read panel | (none) |
| **Assign** | Drag & drop to a patch version | `pending` → `assigned` |
| **Dismiss** | Issue is valid but not worth fixing now | `pending` → `dismissed` |
| **Reject** | Issue is invalid, not a bug, or not reproducible | `pending` → `rejected` |
| **Unassign** | Move back to unassigned pool | `assigned` → `pending` |

Dismissed and rejected issues are removed from the tree view but retained in storage. PatchPilot can poll their status and respond on the issue tracker accordingly.

---

## Feature 3: The `/bugfix` Slash Command

### Purpose

`/bugfix` is a new global slash command that loads the assigned issue package alongside the project's SHP into a Claude Code session. It is the bridge between "developer reviewed the issue" and "Claude Code starts working the fix."

### Trigger Context

`/bugfix` runs in a Claude Code session opened under a patch version that has assigned issues. It reads:

1. The project's SHP (`docs/{ProjectName}_shp.md`) — full project context
2. The issue package(s) assigned to this patch version — the bug report, analysis, history, related issues
3. The patch version context — what version this fix targets

### Behaviour

When the developer types `/bugfix` in a Claude Code session under `v1.0.25`:

1. Claude Code reads the SHP for full project context
2. Claude Code reads all issue packages assigned to `v1.0.25`
3. Claude Code presents a summary: "This patch version addresses N issues: #42 (high — Login fails after session timeout), #38 (medium — Session cookie not cleared)"
4. Claude Code asks the developer which issue to start with (if multiple)
5. Work begins with full context — project knowledge from SHP, issue details from the package

### Status Transitions

| Event | Status Change |
|-------|---------------|
| Developer opens session under patch version with assigned issues | `assigned` → `in-progress` |
| Developer tags the patch version | `in-progress` → `resolved` |
| Developer dismisses via context menu | any → `dismissed` |
| Developer rejects via context menu | any → `rejected` |

The `resolved` transition happens when CCC detects a Git tag for the patch version, consistent with CCC v1.0's existing version completion flow.

### Command File Location

```
~/.claude/commands/bugfix.md
```

Added to the existing set of seven global slash commands from v1.0.

---

## Feature 4: Project Model Extensions

### New Fields in `projects.json`

Each project gains two new optional objects:

```json
{
  "id": "ccc-unique-id",
  "name": "MyApp",
  "path": "MyApp",
  "group": "Active",
  "activeVersion": "v1.0",
  "evaluated": true,
  "repo": {
    "platform": "github",
    "owner": "phet",
    "name": "myapp"
  },
  "patchpilot": {
    "enabled": false,
    "intakeMode": "label",
    "triggerLabel": "bugfix-ready"
  }
}
```

**`repo`** — links the CCC project to its remote repository. Used by the API to help external tools map issues to the correct project.

**`patchpilot`** — PatchPilot-specific configuration. When `enabled: false` (default), PatchPilot ignores this project. These fields are editable via CCC's Settings panel (per-project section).

**Backwards compatibility:** Both fields are optional and default to `null` / `{ enabled: false }`. Existing v1.0 `projects.json` files work without modification.

### Issue Storage

Issues are stored in a project-level JSON file:

```
data/issues/{projectId}.json
```

Each file contains the full issue objects — metadata, status, assignment, and the Markdown package. This follows CCC v1.0's pattern of file-based storage (no SQLite until v2.0).

---

## Feature 5: Degradation Detection Redesign

### The Problem with v1.0's Approach

v1.0 used a single timer: if the parser didn't recognise output for 60 seconds, the session was marked "degraded." This failed because:

1. **Idle sessions** — Claude Code sitting at the `❯` prompt with no output is normal, not degraded
2. **Streaming output** — Character-by-character rendering of long responses doesn't produce recognisable state markers for extended periods
3. **Decorative output** — Horizontal rules, ASCII art, and formatted tables don't match parser patterns

The timer couldn't distinguish "Claude Code is broken" from "nothing is happening" or "something is happening but the parser doesn't recognise it."

### The v1.1 Approach: Activity-Aware Detection

Instead of a single timeout, v1.1 uses a two-layer detection model:

**Layer 1 — Activity classification:**

| Signal | Classification |
|--------|---------------|
| Parser recognises a state (RUNNING, WAITING, COMPLETED, ERROR) | **Recognised activity** |
| Raw PTY data arriving but parser doesn't match a state | **Unrecognised activity** |
| No PTY data at all | **Idle** |

**Layer 2 — Degradation rules:**

| Condition | Result |
|-----------|--------|
| Recognised activity | Not degraded. Timer resets. |
| Unrecognised activity for < threshold | Not degraded. Parser might catch up. |
| Unrecognised activity for ≥ threshold | **Degraded.** Output is flowing but CCC can't parse it. |
| Idle | Not degraded. Nothing to parse. |

The key insight: **idle is not degraded.** Only sustained unrecognised output — meaning Claude Code is doing something CCC can't understand — triggers degradation.

### Threshold Configuration

```json
{
  "degradation": {
    "unrecognisedThreshold": 120
  }
}
```

Default: 120 seconds of continuous unrecognised output. Configurable in settings. The threshold is deliberately high — false positives are worse than late detection.

### UI Treatment

When degraded:
- Status dot turns orange (same as v1.0's design intent)
- A banner appears in the session tab: "CCC cannot detect Claude Code's current state. The session may still be working normally."
- The banner includes a "Dismiss" button that clears the degraded state until the next trigger
- The banner does NOT say the session is broken — it says CCC's *detection* is limited

---

## Settings Panel Extensions

### Per-Project: Repository Configuration

New section in the project settings area:

| Field | Type | Purpose |
|-------|------|---------|
| Repository platform | Dropdown: GitHub, Forgejo, None | Which platform hosts this project |
| Repository owner | Text | Account or org name |
| Repository name | Text | Repo name |
| PatchPilot enabled | Toggle | Whether PatchPilot can push issues to this project |
| Intake mode | Dropdown: Label, Auto | How PatchPilot selects issues |
| Trigger label | Text | Label name for label-triggered intake |

### Global: API Configuration

New section in the global settings area:

| Field | Type | Purpose |
|-------|------|---------|
| API enabled | Toggle | Master switch for the REST API |
| API token | Text (masked) | Shared secret for bearer auth |
| Degradation threshold | Number | Seconds of unrecognised output before degraded state |

---

## What CCC v1.1 Does NOT Do

- **Cloud sync or remote access** — localhost only
- **Autonomous actions** — developer decides everything
- **PatchPilot dependency** — CCC works without PatchPilot
- **Outbound webhooks to PatchPilot** — PatchPilot polls (Option A), callbacks deferred
- **SQLite** — file-based storage continues; SQLite moves to v2.0
- **Issue triage or classification** — PatchPilot does analysis; CCC just stores and displays
- **Git operations** — CCC detects tags but never creates commits, branches, or tags
- **Issue tracker communication** — CCC never talks to GitHub or Forgejo; that's PatchPilot's job

---

## Updated Architecture

### New Files

```
CCC/
├── src/
│   ├── api.js                ← NEW: Express router for /api/v1/* endpoints
│   ├── issues.js             ← NEW: Issue storage CRUD, status transitions
│   ├── auth.js               ← NEW: Bearer token validation middleware
│   ├── parser.js             ← MODIFIED: Activity-aware degradation detection
│   ├── sessions.js           ← MODIFIED: Degradation integration
│   ├── projects.js           ← MODIFIED: repo + patchpilot fields
│   └── versions.js           ← (unchanged)
├── data/
│   ├── projects.json         ← MODIFIED: new optional fields
│   ├── settings.json         ← MODIFIED: API + degradation settings
│   └── issues/               ← NEW: per-project issue storage
│       └── {projectId}.json
├── public/
│   ├── app.js                ← MODIFIED: issue pool, drag & drop, context menu
│   └── styles.css            ← MODIFIED: issue styling, severity badges
└── server.js                 ← MODIFIED: mounts API router, auth middleware
```

### Data Flow

```
PatchPilot                          CCC                              Developer
    │                                │                                   │
    ├── POST /issues ───────────────►│                                   │
    │                                ├── Stores in unassigned pool       │
    │                                ├── Updates tree view ─────────────►│
    │                                │                                   │
    │                                │       Developer reviews issue ◄───┤
    │                                │       Drags to v1.0.25 ◄─────────┤
    │                                │       Opens /bugfix session ◄────┤
    │                                │       Works the fix ◄────────────┤
    │                                │       Tags the version ◄─────────┤
    │                                │                                   │
    │                                ├── Status → resolved               │
    │                                │                                   │
    ├── GET /issues?status=resolved ►│                                   │
    │◄── "resolved in v1.0.25" ──────┤                                   │
    │                                │                                   │
    ├── Closes GitHub issue          │                                   │
    ├── Posts comment                │                                   │
    └── Notifies Discord/Telegram   │                                   │
```

---

## Design Principles

1. **The developer is always the pilot.** PatchPilot prepares, CCC surfaces, the developer decides. No autonomous actions.
2. **Code sovereignty belongs to the developer.** CCC never assigns issues, never starts fixes, never decides priority. That's the developer's call.
3. **Separation of concerns is sacred.** CCC manages sessions and surfaces information. PatchPilot manages the issue pipeline. Neither reaches into the other's domain.
4. **PatchPilot is a smart distributor/notifier.** It delivers packages in and communicates resolutions out. It has no authority in between.
5. **Idle is not degraded.** Only sustained unrecognised output triggers degradation. Silence is normal.
6. **File-based storage until v2.0.** JSON files, not SQLite. Simple, portable, sufficient for a solo developer.
7. **An assumption is the first step in a major cluster fuck.** Every decision in this document was discussed and confirmed. Nothing was inferred.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Issue package** | Markdown document prepared by PatchPilot containing the full analysis of a bug report — classification, severity, reproduction steps, related issues, history |
| **Unassigned pool** | Project-level holding area for issues that PatchPilot has delivered but the developer hasn't assigned to a version yet |
| **Assigned** | Developer has dragged an issue onto a specific patch version |
| **Code sovereignty** | The principle that all decisions about code, versions, and fixes belong to the developer — never to PatchPilot or CCC acting autonomously |
| **Ground crew** | PatchPilot's role — prepares mission briefings before the pilot arrives, handles post-mission paperwork |
| **Cockpit** | CCC's role — where the developer sits, sees everything, and makes every decision |

---

*"An assumption is the first step in a major cluster fuck." — Confirmed, not assumed.*
