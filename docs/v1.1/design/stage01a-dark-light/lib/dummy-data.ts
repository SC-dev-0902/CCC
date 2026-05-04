export type Status = "waiting" | "running" | "completed" | "error" | "unknown"
export type ProjectType = "code" | "config"

export interface SubProject {
  id: string
  name: string
  type: ProjectType
  status: Status
  lockedBy?: string
  files?: { name: string; type: "claude" | "shp" | "concept" | "tasklist" }[]
}

export interface Project {
  id: string
  name: string
  type: ProjectType
  status: Status
  stageProgress: { current: number; total: number }
  subProjects?: SubProject[]
}

export const NEW_PROJECTS = [
  { id: "n1", name: "analytics-service", path: "Projects/analytics-service" },
]

export const ACTIVE_PROJECTS: Project[] = [
  {
    id: "leadsieve",
    name: "LeadSieve",
    type: "code",
    status: "running",
    stageProgress: { current: 3, total: 16 },
    subProjects: [
      {
        id: "leadsieve-service",
        name: "leadsieve-service",
        type: "code",
        status: "waiting",
        lockedBy: "Phet",
        files: [
          { name: "CLAUDE.md", type: "claude" },
          { name: "SHP", type: "shp" },
        ],
      },
      { id: "leadsieve-admin", name: "leadsieve-admin", type: "code", status: "completed" },
      { id: "leadsieve-web", name: "leadsieve-web", type: "code", status: "unknown", lockedBy: "Anna" },
    ],
  },
  {
    id: "ccc",
    name: "CCC",
    type: "code",
    status: "running",
    stageProgress: { current: 14, total: 17 },
  },
]

export const PARKED_PROJECTS: Project[] = []

export const USERS = [
  { username: "phet", role: "admin" as const },
  { username: "anna", role: "developer" as const },
  { username: "marco", role: "developer" as const },
]

export const INTEGRATIONS = [
  { name: "PatchPilot", status: "connected" as const, url: "http://patchpilot.mcsfam.local", lastChecked: "14s ago" },
  { name: "Forgejo", status: "connected" as const, url: "http://mcs-forgejo.mcsfam.net", lastChecked: "14s ago" },
  { name: "GitHub", status: "connected" as const, url: "https://github.com/SC-dev-0902", lastChecked: "14s ago" },
]

export const MIGRATION_FAMILIES = [
  {
    parent: "LeadSieve",
    children: ["leadsieve-service", "leadsieve-admin", "leadsieve-web"],
  },
  {
    parent: "Steinhofer",
    children: ["consulting-site", "trademaster"],
  },
]

export const STATUS_LEGEND: { status: Status; label: string }[] = [
  { status: "waiting", label: "waiting" },
  { status: "running", label: "running" },
  { status: "completed", label: "completed" },
  { status: "error", label: "error" },
  { status: "unknown", label: "unknown" },
]
