"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, FileText, Plus, RefreshCw, Search } from "lucide-react"
import { ACTIVE_PROJECTS, NEW_PROJECTS, PARKED_PROJECTS, STATUS_LEGEND, type Project, type Status, type SubProject } from "@/lib/dummy-data"
import { tokens } from "./theme-context"

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

function Badge({ children, theme }: { children: React.ReactNode; theme: "dark" | "light" }) {
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

function ProgressBar({ current, total, theme }: { current: number; total: number; theme: "dark" | "light" }) {
  const t = tokens(theme)
  const pct = (current / total) * 100
  return (
    <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
      <div style={{ flex: 1, height: 3, backgroundColor: t.bgInput }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: t.accent }} />
      </div>
      <span className="text-[10px] font-mono shrink-0" style={{ color: t.textMuted }}>
        Stage {current} / {total}
      </span>
    </div>
  )
}

function SubProjectRow({ sub, theme }: { sub: SubProject; theme: "dark" | "light" }) {
  const t = tokens(theme)
  const [expanded, setExpanded] = useState(sub.id === "leadsieve-service")
  const locked = !!sub.lockedBy

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1 cursor-pointer"
        style={{ paddingLeft: 18 }}
        onClick={() => setExpanded(!expanded)}
      >
        {sub.files && sub.files.length > 0 ? (
          expanded ? <ChevronDown size={11} style={{ color: t.textMuted }} /> : <ChevronRight size={11} style={{ color: t.textMuted }} />
        ) : (
          <span style={{ width: 11 }} />
        )}
        <StatusDot status={sub.status} />
        <span className="text-xs" style={{ color: t.textPrimary }}>{sub.name}</span>
        <Badge theme={theme}>{sub.type === "code" ? "COD" : "CFG"}</Badge>
        {sub.version && <Badge theme={theme}>{sub.version}</Badge>}
        {locked && (
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 ml-auto"
            style={{ backgroundColor: t.bgHover, color: t.accent, border: `1px solid ${t.accent}` }}
            title={`Locked by ${sub.lockedBy}`}
          >
            {sub.lockedBy}
          </span>
        )}
      </div>
      {expanded && sub.files?.map((f) => (
        <div
          key={f.name}
          className="flex items-center gap-2 py-0.5 text-[11px]"
          style={{ paddingLeft: 50, color: t.textSecondary }}
        >
          <FileText size={10} style={{ color: t.textMuted }} />
          {f.name}
        </div>
      ))}
      {locked && expanded && (
        <div className="text-[10px] italic px-2 py-1" style={{ paddingLeft: 50, color: t.textMuted }}>
          Read only - Start Session disabled
        </div>
      )}
    </div>
  )
}

function ProjectRow({ project, theme }: { project: Project; theme: "dark" | "light" }) {
  const t = tokens(theme)
  const expandedByDefault = project.id === "leadsieve" || project.id === "orion"
  const [expanded, setExpanded] = useState(expandedByDefault)
  const hasChildren = !!project.subProjects?.length

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ backgroundColor: project.id === "leadsieve" ? t.bgHover : "transparent" }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={11} style={{ color: t.textMuted }} /> : <ChevronRight size={11} style={{ color: t.textMuted }} />
        ) : (
          <span style={{ width: 11 }} />
        )}
        <StatusDot status={project.status} size={9} />
        <span className="text-xs font-medium" style={{ color: t.textPrimary }}>{project.name}</span>
        <Badge theme={theme}>{project.type === "code" ? "COD" : "CFG"}</Badge>
      </div>
      <div className="px-2" style={{ paddingLeft: 24 }}>
        <ProgressBar current={project.stageProgress.current} total={project.stageProgress.total} theme={theme} />
      </div>
      {expanded && project.subProjects?.map((sub) => (
        <SubProjectRow key={sub.id} sub={sub} theme={theme} />
      ))}
    </div>
  )
}

function GroupHeader({ label, theme }: { label: string; theme: "dark" | "light" }) {
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

export function TreeviewShell({ theme, filter = "" }: { theme: "dark" | "light"; filter?: string }) {
  const t = tokens(theme)
  const [query, setQuery] = useState(filter)

  const matches = (s: string) => s.toLowerCase().includes(query.toLowerCase())
  const filterProjects = (list: Project[]) => {
    if (!query) return list
    return list
      .map((p) => {
        const subMatches = p.subProjects?.filter((s) => matches(s.name)) || []
        if (matches(p.name) || subMatches.length > 0) {
          return { ...p, subProjects: matches(p.name) ? p.subProjects : subMatches }
        }
        return null
      })
      .filter(Boolean) as Project[]
  }
  const filteredActive = useMemo(() => filterProjects(ACTIVE_PROJECTS), [query])
  const filteredParked = useMemo(() => filterProjects(PARKED_PROJECTS), [query])

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
          <RefreshCw size={12} className="cursor-pointer" />
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
        {NEW_PROJECTS.length > 0 && (
          <>
            <GroupHeader label="New" theme={theme} />
            {NEW_PROJECTS.map((p) => matches(p.name) || !query ? (
              <div key={p.id} className="flex items-center gap-2 px-2 py-1" style={{ paddingLeft: 24 }}>
                <StatusDot status="unknown" />
                <span className="text-xs italic" style={{ color: t.textSecondary }}>{p.name}</span>
                <Badge theme={theme}>unregistered</Badge>
              </div>
            ) : null)}
          </>
        )}

        <GroupHeader label="Active" theme={theme} />
        {filteredActive.map((p) => <ProjectRow key={p.id} project={p} theme={theme} />)}

        <GroupHeader label="Parked" theme={theme} />
        {filteredParked.length === 0 ? (
          <div className="px-2 py-2 text-[10px] italic" style={{ paddingLeft: 24, color: t.textMuted }}>
            empty
          </div>
        ) : (
          filteredParked.map((p) => <ProjectRow key={p.id} project={p} theme={theme} />)
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
