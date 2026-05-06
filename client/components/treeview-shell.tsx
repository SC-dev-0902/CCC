"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, FileText, Plus, RefreshCw, Search } from "lucide-react"
import { tokens } from "./theme-context"
import {
  fetchProjects,
  fetchProjectVersions,
  type ApiProject,
  type ApiTestFile,
  type ApiVersion,
  type Status,
  type VersionsResponse,
} from "@/lib/api"
import { wsPool } from "@/lib/ws"

type Theme = "dark" | "light"

const STATUS_LEGEND: { status: Status; label: string }[] = [
  { status: "waiting", label: "waiting" },
  { status: "running", label: "running" },
  { status: "completed", label: "completed" },
  { status: "error", label: "error" },
  { status: "unknown", label: "unknown" },
]

// Map server-side claudeStatus + state messages to a treeview status.
function statusFromWS(msg: any): Status | null {
  if (msg.type === "claudeStatus") {
    const s = String(msg.status || "").toUpperCase()
    if (s === "WAITING_FOR_INPUT") return "waiting"
    if (s === "RUNNING") return "running"
    if (s === "COMPLETED") return "completed"
    if (s === "ERROR") return "error"
    return "unknown"
  }
  if (msg.type === "state") {
    if (msg.state === "exited" || msg.state === "none") return "unknown"
    if (msg.state === "active") return "running"
  }
  if (msg.type === "exit") return "unknown"
  if (msg.type === "degraded") return "unknown"
  return null
}

interface GroupedTests {
  groups: { stage: string; files: ApiTestFile[]; subGroups: { stage: string; files: ApiTestFile[] }[] }[]
  ungrouped: ApiTestFile[]
}

// Group testFiles[] by stagePath into top-level stages with optional sub-stage groups.
// Files without a stagePath fall into "ungrouped".
function groupTestFilesByStage(testFiles: ApiTestFile[]): GroupedTests {
  const groupMap = new Map<string, { stage: string; files: ApiTestFile[]; subGroups: Map<string, ApiTestFile[]> }>()
  const ungrouped: ApiTestFile[] = []

  for (const tf of testFiles || []) {
    const sp = tf.stagePath
    if (!sp) {
      ungrouped.push(tf)
      continue
    }
    const parts = sp.split("/")
    const top = parts[0]
    if (!groupMap.has(top)) groupMap.set(top, { stage: top, files: [], subGroups: new Map() })
    const g = groupMap.get(top)!
    if (parts.length === 1) {
      g.files.push(tf)
    } else {
      const subKey = parts.slice(1).join("/")
      if (!g.subGroups.has(subKey)) g.subGroups.set(subKey, [])
      g.subGroups.get(subKey)!.push(tf)
    }
  }

  const sortFiles = (a: ApiTestFile, b: ApiTestFile) => (a.name || "").localeCompare(b.name || "")
  const groups = Array.from(groupMap.values())
    .sort((a, b) => a.stage.localeCompare(b.stage))
    .map((g) => ({
      stage: g.stage,
      files: g.files.sort(sortFiles),
      subGroups: Array.from(g.subGroups.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([stage, files]) => ({ stage, files: files.sort(sortFiles) })),
    }))

  return { groups, ungrouped: ungrouped.sort(sortFiles) }
}

function StatusDot({ status, size = 8 }: { status: Status; size?: number }) {
  const colors: Record<Status, string> = {
    waiting: "#9B2335",
    running: "#B7791F",
    completed: "#276749",
    error: "#7A1828",
    unknown: "#A0AEC0",
  }
  return (
    <span
      className="inline-block shrink-0"
      style={{ width: size, height: size, borderRadius: "50%", backgroundColor: colors[status] }}
    />
  )
}

function Badge({ children, theme }: { children: React.ReactNode; theme: Theme }) {
  const t = tokens(theme)
  return (
    <span
      className="text-[9px] font-mono px-1.5 py-0.5"
      style={{ backgroundColor: t.bgInput, color: t.textMuted, border: `1px solid ${t.border}` }}
    >
      {children}
    </span>
  )
}

function StartSessionButton({
  disabled,
  theme,
  onClick,
}: {
  disabled: boolean
  theme: Theme
  onClick: (e: React.MouseEvent) => void
}) {
  const t = tokens(theme)
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onClick(e)
      }}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="text-[9px] font-mono"
      style={{
        border: `1px solid ${t.border}`,
        backgroundColor: hover && !disabled ? t.bgHover : "transparent",
        color: t.textSecondary,
        padding: "2px 6px",
        borderRadius: 0,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      Start Session
    </button>
  )
}

interface ProjectRowProps {
  project: ApiProject
  status: Status
  theme: Theme
  forceExpand: boolean
  onStartSession: (project: ApiProject) => void
  onOpenFile: (projectId: string, projectName: string, filePath: string) => void
}

function ProjectRow({ project, status, theme, forceExpand, onStartSession, onOpenFile }: ProjectRowProps) {
  const t = tokens(theme)
  const [expanded, setExpanded] = useState(false)
  const effectiveExpanded = forceExpand || expanded

  const claudeFile = project.coreFiles?.claude || "CLAUDE.md"
  const conceptFile = project.coreFiles?.concept
  const tasklistFile = project.coreFiles?.tasklist
  const shpFile = `docs/handoff/${project.name}_shp.md`

  const locked = !!project.lockUserId

  const [versionsData, setVersionsData] = useState<VersionsResponse | null>(null)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [versionsError, setVersionsError] = useState<string | null>(null)
  const [testingExpanded, setTestingExpanded] = useState(false)

  const loadVersions = useCallback(() => {
    setLoadingVersions(true)
    setVersionsError(null)
    fetchProjectVersions(project.id)
      .then(setVersionsData)
      .catch((e) => setVersionsError(e.message || "Failed to load versions"))
      .finally(() => setLoadingVersions(false))
  }, [project.id])

  useEffect(() => {
    if (!effectiveExpanded || versionsData || loadingVersions) return
    loadVersions()
  }, [effectiveExpanded, versionsData, loadingVersions, loadVersions])

  // Pick the active version's testFiles, falling back to the first version.
  const activeVersionEntry: ApiVersion | null = useMemo(() => {
    if (!versionsData) return null
    if (versionsData.activeVersion) {
      const found = versionsData.versions.find((v) => v.version === versionsData.activeVersion)
      if (found) return found
    }
    return versionsData.versions[0] || null
  }, [versionsData])

  const testCount = activeVersionEntry?.testFiles?.length || 0

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ backgroundColor: "transparent" }}
      >
        {effectiveExpanded ? <ChevronDown size={11} style={{ color: t.textMuted }} /> : <ChevronRight size={11} style={{ color: t.textMuted }} />}
        <StatusDot status={status} size={9} />
        <span className="text-xs font-medium" style={{ color: t.textPrimary }}>{project.name}</span>
        <Badge theme={theme}>{project.type === "code" ? "COD" : "CFG"}</Badge>
        {project.activeVersion && <Badge theme={theme}>v{project.activeVersion}</Badge>}
        <div className="flex items-center gap-2 ml-auto">
          <StartSessionButton
            disabled={locked}
            theme={theme}
            onClick={() => onStartSession(project)}
          />
        </div>
      </div>

      {effectiveExpanded && (
        <>
          <FileLink theme={theme} label={claudeFile} onClick={() => onOpenFile(project.id, project.name, claudeFile)} />
          {conceptFile && (
            <FileLink theme={theme} label={conceptFile.split("/").pop() || conceptFile} onClick={() => onOpenFile(project.id, project.name, conceptFile)} />
          )}
          {tasklistFile && (
            <FileLink theme={theme} label={tasklistFile.split("/").pop() || tasklistFile} onClick={() => onOpenFile(project.id, project.name, tasklistFile)} />
          )}
          <FileLink theme={theme} label={`${project.name}_shp.md`} onClick={() => onOpenFile(project.id, project.name, shpFile)} />

          <TestingSection
            theme={theme}
            expanded={testingExpanded}
            onToggle={() => setTestingExpanded((e) => !e)}
            onRefresh={loadVersions}
            loading={loadingVersions}
            error={versionsError}
            testCount={testCount}
            activeVersionFolder={activeVersionEntry?.folder}
            testFiles={activeVersionEntry?.testFiles || []}
            project={project}
            onOpenFile={onOpenFile}
          />
        </>
      )}
    </div>
  )
}

interface TestingSectionProps {
  theme: Theme
  expanded: boolean
  onToggle: () => void
  onRefresh: () => void
  loading: boolean
  error: string | null
  testCount: number
  activeVersionFolder: string | undefined
  testFiles: ApiTestFile[]
  project: ApiProject
  onOpenFile: (projectId: string, projectName: string, filePath: string) => void
}

function TestingSection({
  theme,
  expanded,
  onToggle,
  onRefresh,
  loading,
  error,
  testCount,
  activeVersionFolder,
  testFiles,
  project,
  onOpenFile,
}: TestingSectionProps) {
  const t = tokens(theme)
  return (
    <div style={{ marginTop: 2 }}>
      <div
        className="flex items-center gap-2 px-2 py-1 cursor-pointer"
        style={{ paddingLeft: 28, color: t.textMuted }}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <span className="text-[10px] uppercase tracking-wider">Testing</span>
        <span className="text-[10px] font-mono">{testCount}</span>
        <RefreshCw
          size={10}
          className="cursor-pointer ml-1"
          onClick={(e) => {
            e.stopPropagation()
            onRefresh()
          }}
          style={{ opacity: loading ? 0.4 : 0.7 }}
        />
      </div>

      {expanded && (
        <TestingBody
          theme={theme}
          loading={loading}
          error={error}
          testFiles={testFiles}
          activeVersionFolder={activeVersionFolder}
          project={project}
          onOpenFile={onOpenFile}
        />
      )}
    </div>
  )
}

function TestingBody({
  theme,
  loading,
  error,
  testFiles,
  activeVersionFolder,
  project,
  onOpenFile,
}: {
  theme: Theme
  loading: boolean
  error: string | null
  testFiles: ApiTestFile[]
  activeVersionFolder: string | undefined
  project: ApiProject
  onOpenFile: (projectId: string, projectName: string, filePath: string) => void
}) {
  const t = tokens(theme)

  if (loading && testFiles.length === 0) {
    return (
      <div className="text-[10px] italic" style={{ paddingLeft: 50, color: t.textMuted }}>
        loading...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-[10px]" style={{ paddingLeft: 50, color: t.statusError }}>
        {error}
      </div>
    )
  }

  if (!testFiles.length) {
    return (
      <div className="text-[10px] italic" style={{ paddingLeft: 50, color: t.textMuted }}>
        no test files
      </div>
    )
  }

  const grouped = groupTestFilesByStage(testFiles)
  const baseFolder = activeVersionFolder || ""

  return (
    <>
      {grouped.groups.map((g) => (
        <StageGroup
          key={g.stage}
          group={g}
          theme={theme}
          baseFolder={baseFolder}
          project={project}
          onOpenFile={onOpenFile}
        />
      ))}
      {grouped.ungrouped.length > 0 && (
        <>
          <div
            className="text-[10px] italic"
            style={{ paddingLeft: 44, color: t.textMuted, marginTop: 4 }}
          >
            Ungrouped
          </div>
          {grouped.ungrouped.map((tf) => (
            <TestFileRow
              key={tf.name}
              testFile={tf}
              theme={theme}
              depth={1}
              onClick={() => onOpenFile(project.id, project.name, `${baseFolder}/docs/testfiles/${tf.name}`)}
            />
          ))}
        </>
      )}
    </>
  )
}

function StageGroup({
  group,
  theme,
  baseFolder,
  project,
  onOpenFile,
}: {
  group: { stage: string; files: ApiTestFile[]; subGroups: { stage: string; files: ApiTestFile[] }[] }
  theme: Theme
  baseFolder: string
  project: ApiProject
  onOpenFile: (projectId: string, projectName: string, filePath: string) => void
}) {
  const t = tokens(theme)
  const [stageOpen, setStageOpen] = useState(false)

  return (
    <div>
      <div
        className="flex items-center gap-1 cursor-pointer text-[10px] uppercase tracking-wider"
        style={{ paddingLeft: 44, color: t.textMuted, paddingTop: 2, paddingBottom: 2 }}
        onClick={(e) => {
          e.stopPropagation()
          setStageOpen((v) => !v)
        }}
      >
        {stageOpen ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
        <span>{group.stage}</span>
      </div>

      {stageOpen && (
        <>
          {group.files.map((tf) => (
            <TestFileRow
              key={tf.name}
              testFile={tf}
              theme={theme}
              depth={1}
              onClick={() => onOpenFile(project.id, project.name, `${baseFolder}/docs/testfiles/${group.stage}/${tf.name}`)}
            />
          ))}
          {group.subGroups.map((sg) => (
            <div key={sg.stage}>
              <div
                className="text-[10px] uppercase tracking-wider"
                style={{ paddingLeft: 60, color: t.textMuted, paddingTop: 2, paddingBottom: 2 }}
              >
                {sg.stage}
              </div>
              {sg.files.map((tf) => (
                <TestFileRow
                  key={tf.name}
                  testFile={tf}
                  theme={theme}
                  depth={2}
                  onClick={() => onOpenFile(project.id, project.name, `${baseFolder}/docs/testfiles/${group.stage}/${sg.stage}/${tf.name}`)}
                />
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function TestFileRow({
  testFile,
  theme,
  depth,
  onClick,
}: {
  testFile: ApiTestFile
  theme: Theme
  depth: 1 | 2
  onClick: () => void
}) {
  const t = tokens(theme)
  return (
    <div
      className="flex items-center gap-2 py-0.5 text-[11px] cursor-pointer"
      style={{ paddingLeft: depth === 2 ? 76 : 60, color: t.textSecondary }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <FileText size={10} style={{ color: t.textMuted }} />
      <span>{testFile.name}</span>
      {testFile.total > 0 && (
        <span className="text-[9px] font-mono ml-1" style={{ color: t.textMuted }}>
          [{testFile.checked}/{testFile.total}]
        </span>
      )}
    </div>
  )
}

function FileLink({ theme, label, onClick }: { theme: Theme; label: string; onClick: () => void }) {
  const t = tokens(theme)
  return (
    <div
      className="flex items-center gap-2 py-0.5 text-[11px] cursor-pointer"
      style={{ paddingLeft: 32, color: t.textSecondary }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <FileText size={10} style={{ color: t.textMuted }} />
      {label}
    </div>
  )
}

function GroupHeader({ label, theme }: { label: string; theme: Theme }) {
  const t = tokens(theme)
  return (
    <div
      className="flex items-center gap-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider mt-2"
      style={{ color: t.textPrimary, borderBottom: `1px solid ${t.border}` }}
    >
      <ChevronDown size={10} />
      {label}
    </div>
  )
}

interface TreeviewShellProps {
  theme: Theme
  filter?: string
  onStartSession: (project: ApiProject) => void
  onOpenFile: (projectId: string, projectName: string, filePath: string) => void
}

export function TreeviewShell({ theme, filter = "", onStartSession, onOpenFile }: TreeviewShellProps) {
  const t = tokens(theme)
  const [query, setQuery] = useState(filter)
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusMap, setStatusMap] = useState<Map<string, Status>>(new Map())

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchProjects()
      .then((res) => setProjects(res.projects))
      .catch((e) => setError(e.message || "Failed to load projects"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const unsub = wsPool.subscribe("*", (msg) => {
      const next = statusFromWS(msg)
      if (!next) return
      setStatusMap((prev) => {
        const m = new Map(prev)
        m.set(msg.projectId, next)
        return m
      })
    })
    return unsub
  }, [])

  const matches = (s: string) => s.toLowerCase().includes(query.toLowerCase())
  const filtered = useMemo(() => {
    if (!query) return projects
    return projects.filter((p) => matches(p.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, query])

  const active = filtered.filter((p) => (p.group || "Active").toLowerCase() === "active" || !p.group)
  const parked = filtered.filter((p) => (p.group || "").toLowerCase() === "parked")

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ backgroundColor: t.bgSidebar, color: t.textPrimary }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: `1px solid ${t.border}` }}
      >
        <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: t.textPrimary }}>
          Claude Command Center
        </span>
        <div className="flex items-center gap-2" style={{ color: t.textMuted }}>
          <RefreshCw
            size={12}
            className="cursor-pointer"
            onClick={reload}
            style={{ opacity: loading ? 0.4 : 1 }}
          />
          <Plus size={12} className="cursor-pointer" />
        </div>
      </div>

      <div className="px-3 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
        <div className="flex items-center gap-2 px-2 py-1.5" style={{ backgroundColor: t.bgInput }}>
          <Search size={11} style={{ color: t.textMuted }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Filter projects..."
            className="flex-1 bg-transparent border-none outline-none text-xs"
            style={{ color: t.textPrimary }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-3">
        {error && (
          <div className="px-3 py-3 text-[11px]" style={{ color: t.statusError }}>
            {error}
          </div>
        )}

        <GroupHeader label="Active" theme={theme} />
        {loading && projects.length === 0 ? (
          <div className="px-2 py-2 text-[10px] italic" style={{ paddingLeft: 24, color: t.textMuted }}>
            loading projects...
          </div>
        ) : active.length === 0 ? (
          <div className="px-2 py-2 text-[10px] italic" style={{ paddingLeft: 24, color: t.textMuted }}>
            {query ? "no match" : "no projects"}
          </div>
        ) : (
          active.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              status={statusMap.get(p.id) || "unknown"}
              theme={theme}
              forceExpand={!!query}
              onStartSession={onStartSession}
              onOpenFile={onOpenFile}
            />
          ))
        )}

        <GroupHeader label="Parked" theme={theme} />
        {parked.length === 0 ? (
          <div className="px-2 py-2 text-[10px] italic" style={{ paddingLeft: 24, color: t.textMuted }}>
            empty
          </div>
        ) : (
          parked.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              status={statusMap.get(p.id) || "unknown"}
              theme={theme}
              forceExpand={!!query}
              onStartSession={onStartSession}
              onOpenFile={onOpenFile}
            />
          ))
        )}
      </div>

      <div className="px-3 py-2" style={{ borderTop: `1px solid ${t.border}`, backgroundColor: t.bgMain }}>
        <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>Status legend</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {STATUS_LEGEND.map((l) => (
            <div key={l.status} className="flex items-center gap-1.5">
              <StatusDot status={l.status} size={7} />
              <span className="text-[10px]" style={{ color: t.textSecondary }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
