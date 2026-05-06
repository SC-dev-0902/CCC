// Minimal API client for the CCC server.
// All paths are joined onto BASE_PATH so the app works whether served direct
// (port 3000) or under an Apache proxy mount like /CCC/.

export const API_BASE = process.env.NEXT_PUBLIC_BASE_PATH || ""

export type Status = "waiting" | "running" | "completed" | "error" | "unknown"

// Field names match the live /api/projects response shape (camelCase).
// Stage 04bN kickoff used snake_case in its example - the live API has been
// camelCase since Stage 04a; matching the live shape so the UI actually
// renders something. Flagged in the stage closure comment.
export interface ApiProject {
  id: string
  name: string
  path: string
  group: string | null
  type: "code" | "config"
  activeVersion: string | null
  evaluated: boolean
  parentId: string | null
  subProjects: ApiProject[]
  lockUserId: string | null
  lockSessionId: string | null
  order: number
  coreFiles?: { claude?: string; concept?: string; tasklist?: string }
}

export interface ProjectsResponse {
  projects: ApiProject[]
  groups: Array<string | { name: string }>
}

export interface SettingsPayload {
  projectRoot: string
  editor: string
  shell: string
  theme: "dark" | "light"
  filePatterns: { concept: string; tasklist: string }
  githubToken: string
  recoveryInterval?: number
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

export async function fetchProjects(): Promise<ProjectsResponse> {
  return jsonOrThrow<ProjectsResponse>(await fetch(`${API_BASE}/api/projects`))
}

export async function fetchSettings(): Promise<SettingsPayload> {
  return jsonOrThrow<SettingsPayload>(await fetch(`${API_BASE}/api/settings`))
}

export async function saveSettings(partial: Partial<SettingsPayload>): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  })
  return jsonOrThrow<{ ok: boolean }>(res)
}

export async function fetchFile(projectId: string, filePath: string): Promise<string> {
  const url = `${API_BASE}/api/file/${encodeURIComponent(projectId)}?filePath=${encodeURIComponent(filePath)}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = (await res.json()) as { content: string }
  return data.content
}

export interface StartSessionResponse {
  ok: boolean
  state: string
  sessionId?: string
}

export async function startSession(projectId: string, command: "claude" | "shell" = "claude"): Promise<StartSessionResponse> {
  const res = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(projectId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  })
  return jsonOrThrow<StartSessionResponse>(res)
}

export async function fetchVersionInfo(): Promise<{ version: string; build: string }> {
  return jsonOrThrow<{ version: string; build: string }>(await fetch(`${API_BASE}/api/version`))
}

// --- Versions / Test Files (Stage 04b + 04b01) ---

export interface ApiTestFile {
  name: string
  checked: number
  total: number
  stagePath?: string
}

export interface ApiVersion {
  version: string
  type: "major" | "minor" | "patch"
  folder: string
  files: Array<string | { name: string; stagesCompleted: number; stagesTotal: number }>
  testFiles: ApiTestFile[]
  patches?: ApiVersion[]
}

export interface VersionsResponse {
  versions: ApiVersion[]
  hasFlatDocs: boolean
  activeVersion: string | null
  evaluated?: boolean
}

export async function fetchProjectVersions(projectId: string): Promise<VersionsResponse> {
  return jsonOrThrow<VersionsResponse>(await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectId)}/versions`))
}

// --- Stage Progress (Stage 04c) ---

export interface ProjectProgress {
  completed: number
  total: number
}

export async function fetchProgress(projectId: string): Promise<ProjectProgress> {
  return jsonOrThrow<ProjectProgress>(await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectId)}/progress`))
}

// --- Reorder (Stage 04c) ---

export interface ReorderEntry {
  id: string
  group: string | null
  order: number
  parentId: string | null
}

export async function reorderProjects(orderedIds: ReorderEntry[]): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/projects-reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  })
  return jsonOrThrow<unknown>(res)
}
