"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, FileText, Plus, RefreshCw, Search } from "lucide-react"
import { tokens } from "./theme-context"
import { fetchProjects, type ApiProject, type Status } from "@/lib/api"
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

  // Sub-projects are deferred to Stage 04c. Show files directly under project for now.
  const claudeFile = project.coreFiles?.claude || "CLAUDE.md"
  const conceptFile = project.coreFiles?.concept
  const tasklistFile = project.coreFiles?.tasklist
  const shpFile = `docs/handoff/${project.name}_shp.md`
  const hasFiles = true

  const locked = !!project.lockUserId

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ backgroundColor: "transparent" }}
      >
        {hasFiles ? (
          effectiveExpanded ? <ChevronDown size={11} style={{ color: t.textMuted }} /> : <ChevronRight size={11} style={{ color: t.textMuted }} />
        ) : (
          <span style={{ width: 11 }} />
        )}
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
        </>
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

  useEffect(() => { reload() }, [reload])

  // Subscribe to all WS messages to keep the status map fresh whenever a
  // session emits a state change (regardless of which project tab is active).
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
  }, [projects, query])

  const active = filtered.filter((p) => (p.group || "Active").toLowerCase() === "active" || !p.group)
  const parked = filtered.filter((p) => (p.group || "").toLowerCase() === "parked")

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ backgroundColor: t.bgSidebar, color: t.textPrimary }}
    >
      {/* Header */}
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

      {/* Search */}
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

      {/* Tree */}
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

      {/* Status legend */}
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
