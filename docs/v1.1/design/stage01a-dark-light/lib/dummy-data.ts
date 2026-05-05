export type Status = "waiting" | "running" | "completed" | "error" | "unknown"
export type ProjectType = "code" | "config"

export interface SubProject {
  id: string
  name: string
  type: ProjectType
  status: Status
  version?: string
  lockedBy?: string
  stageProgress?: { current: number; total: number }
  files?: { name: string; type: "claude" | "shp" | "concept" | "tasklist" }[]
}

export interface Project {
  id: string
  name: string
  type: ProjectType
  status: Status
  stageProgress?: { current: number; total: number }
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
    subProjects: [
      {
        id: "leadsieve-service",
        name: "leadsieve-service",
        type: "code",
        status: "waiting",
        lockedBy: "Phet",
        stageProgress: { current: 3, total: 16 },
        files: [
          { name: "CLAUDE.md", type: "claude" },
          { name: "SHP", type: "shp" },
        ],
      },
      { id: "leadsieve-admin", name: "leadsieve-admin", type: "code", status: "completed", stageProgress: { current: 5, total: 12 } },
      { id: "leadsieve-web", name: "leadsieve-web", type: "code", status: "unknown", lockedBy: "Anna", stageProgress: { current: 2, total: 10 } },
    ],
  },
  {
    id: "ccc",
    name: "CCC",
    type: "code",
    status: "running",
    stageProgress: { current: 14, total: 17 },
  },
  {
    id: "orion",
    name: "Orion",
    type: "code",
    status: "running",
    subProjects: [
      { id: "orion-api", name: "orion-api", type: "code", status: "running", version: "v1.0", stageProgress: { current: 2, total: 8 } },
      { id: "orion-web", name: "orion-web", type: "code", status: "unknown", version: "v1.0", stageProgress: { current: 1, total: 6 } },
    ],
  },
  {
    id: "nexus",
    name: "Nexus",
    type: "code",
    status: "completed",
    subProjects: [
      { id: "nexus-core",   name: "nexus-core",   type: "code", status: "completed", version: "v1.0", stageProgress: { current: 6, total: 6 } },
      { id: "nexus-admin",  name: "nexus-admin",  type: "code", status: "unknown",   version: "v1.0", stageProgress: { current: 0, total: 8 } },
      { id: "nexus-mobile", name: "nexus-mobile", type: "code", status: "unknown",   version: "v1.0", stageProgress: { current: 0, total: 8 } },
    ],
  },
]

export const PARKED_PROJECTS: Project[] = [
  {
    id: "vertex",
    name: "Vertex",
    type: "code",
    status: "unknown",
    subProjects: [
      { id: "vertex-service", name: "vertex-service", type: "code", status: "unknown", version: "v1.0", stageProgress: { current: 0, total: 5 } },
    ],
  },
]

export const USERS = [
  { username: "phet", role: "admin" as const },
  { username: "anna", role: "developer" as const },
  { username: "marco", role: "developer" as const },
]

export const INTEGRATIONS = [
  { name: "PatchPilot", status: "disconnected" as const, url: "http://patchpilot.mcsfam.local", lastChecked: "14s ago" },
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
