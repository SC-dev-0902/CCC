"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ChevronRight, FileText, Plus, RefreshCw, Search } from "lucide-react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { tokens } from "./theme-context"
import {
  fetchProjects,
  fetchProjectVersions,
  fetchProgress,
  reorderProjects as apiReorderProjects,
  type ApiProject,
  type ApiTestFile,
  type ApiVersion,
  type ProjectProgress,
  type ReorderEntry,
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

const STATUS_PRIORITY: Record<Status, number> = {
  waiting: 5,
  error: 4,
  running: 3,
  completed: 2,
  unknown: 1,
}

function aggregateStatus(statuses: Status[]): Status {
  if (statuses.length === 0) return "unknown"
  return statuses.reduce((worst, s) =>
    STATUS_PRIORITY[s] > STATUS_PRIORITY[worst] ? s : worst
  )
}

const STATUS_COLOR: Record<Status, string> = {
  waiting: "#9B2335",
  running: "#B7791F",
  completed: "#276749",
  error: "#7A1828",
  unknown: "#A0AEC0",
}

function isContainer(p: ApiProject): boolean {
  return !!p.subProjects && p.subProjects.length > 0
}

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
  return (
    <span
      className="inline-block shrink-0"
      style={{ width: size, height: size, borderRadius: "50%", backgroundColor: STATUS_COLOR[status] }}
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

function useProjectProgress(projectId: string, hasTasklist: boolean): ProjectProgress & { loading: boolean } {
  const [state, setState] = useState<{ completed: number; total: number; loading: boolean }>({
    completed: 0,
    total: 0,
    loading: hasTasklist,
  })
  useEffect(() => {
    let cancelled = false
    if (!hasTasklist) {
      setState({ completed: 0, total: 0, loading: false })
      return
    }
    setState((s) => ({ ...s, loading: true }))
    fetchProgress(projectId)
      .then((p) => {
        if (cancelled) return
        setState({ completed: p.completed, total: p.total, loading: false })
      })
      .catch(() => {
        if (cancelled) return
        setState({ completed: 0, total: 0, loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [projectId, hasTasklist])
  return state
}

function ProgressBar({ completed, total, status, theme }: { completed: number; total: number; status: Status; theme: Theme }) {
  const t = tokens(theme)
  if (total <= 0) return null
  const pct = Math.min(100, Math.max(0, (completed / total) * 100))
  return (
    <div style={{ width: 60 }}>
      <div className="text-[9px] font-mono" style={{ color: t.textMuted, lineHeight: 1.1 }}>
        Stage {completed} / {total}
      </div>
      <div style={{ height: 2, backgroundColor: t.bgInput, marginTop: 1 }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: STATUS_COLOR[status] }} />
      </div>
    </div>
  )
}

interface ProjectRowProps {
  project: ApiProject
  status: Status
  theme: Theme
  forceExpand: boolean
  onStartSession: (project: ApiProject) => void
  onOpenFile: (projectId: string, projectName: string, filePath: string) => void
  dragHandleProps?: { listeners?: any; attributes?: any; setActivatorRef?: (el: HTMLElement | null) => void }
  setRowRef?: (el: HTMLElement | null) => void
  rowStyle?: React.CSSProperties
  isDragging?: boolean
}

function ProjectRow({
  project,
  status,
  theme,
  forceExpand,
  onStartSession,
  onOpenFile,
  dragHandleProps,
  setRowRef,
  rowStyle,
  isDragging,
}: ProjectRowProps) {
  const t = tokens(theme)
  const [expanded, setExpanded] = useState(false)
  const effectiveExpanded = forceExpand || expanded

  const claudeFile = project.coreFiles?.claude || "CLAUDE.md"
  const conceptFile = project.coreFiles?.concept
  const tasklistFile = project.coreFiles?.tasklist
  const shpFile = `docs/handoff/${project.name}_shp.md`

  const locked = !!project.lockUserId
  const hasTasklist = !!tasklistFile

  const [versionsData, setVersionsData] = useState<VersionsResponse | null>(null)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [versionsError, setVersionsError] = useState<string | null>(null)
  const [testingExpanded, setTestingExpanded] = useState(false)

  const progress = useProjectProgress(project.id, hasTasklist)

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
    <div
      ref={setRowRef}
      style={{ marginBottom: 4, ...(rowStyle || {}), opacity: isDragging ? 0.5 : 1 }}
    >
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ backgroundColor: "transparent" }}
        ref={dragHandleProps?.setActivatorRef}
        {...(dragHandleProps?.attributes || {})}
        {...(dragHandleProps?.listeners || {})}
      >
        <span
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, marginLeft: -4, cursor: "pointer", color: t.textMuted }}
        >
          {effectiveExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <StatusDot status={status} size={9} />
        <span className="text-xs font-medium" style={{ color: t.textPrimary }}>{project.name}</span>
        <Badge theme={theme}>{project.type === "code" ? "COD" : "CFG"}</Badge>
        {project.activeVersion && <Badge theme={theme}>v{project.activeVersion}</Badge>}
        <div className="flex items-center gap-2 ml-auto">
          {hasTasklist && !progress.loading && (
            <ProgressBar completed={progress.completed} total={progress.total} status={status} theme={theme} />
          )}
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

interface ContainerRowProps {
  project: ApiProject
  visibleSubProjects: ApiProject[]
  statusMap: Map<string, Status>
  theme: Theme
  forceExpand: boolean
  onStartSession: (project: ApiProject) => void
  onOpenFile: (projectId: string, projectName: string, filePath: string) => void
  setRowRef?: (el: HTMLElement | null) => void
  rowStyle?: React.CSSProperties
  isOverContainer?: boolean
}

function ContainerRow({
  project,
  visibleSubProjects,
  statusMap,
  theme,
  forceExpand,
  onStartSession,
  onOpenFile,
  setRowRef,
  rowStyle,
  isOverContainer,
}: ContainerRowProps) {
  const t = tokens(theme)
  const [expanded, setExpanded] = useState(false)
  const effectiveExpanded = forceExpand || expanded

  const aggregate = useMemo(() => {
    const statuses = visibleSubProjects.map((sp) => statusMap.get(sp.id) || "unknown")
    return aggregateStatus(statuses)
  }, [visibleSubProjects, statusMap])

  return (
    <div
      ref={setRowRef}
      style={{
        marginBottom: 4,
        border: isOverContainer ? `1px solid ${t.textMuted}` : "1px solid transparent",
        ...(rowStyle || {}),
      }}
    >
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ backgroundColor: "transparent" }}
      >
        <span
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, marginLeft: -4, cursor: "pointer", color: t.textMuted }}
        >
          {effectiveExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <StatusDot status={aggregate} size={9} />
        <span className="text-xs font-medium" style={{ color: t.textPrimary }}>{project.name}</span>
        <Badge theme={theme}>GRP</Badge>
      </div>

      {effectiveExpanded && (
        <div style={{ paddingLeft: 16 }}>
          {visibleSubProjects.map((sp) => (
            <DraggableSubProjectRow
              key={sp.id}
              project={sp}
              status={statusMap.get(sp.id) || "unknown"}
              theme={theme}
              forceExpand={forceExpand}
              onStartSession={onStartSession}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
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
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, marginLeft: -4 }}>
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
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
        style={{ paddingLeft: 40, color: t.textMuted, paddingTop: 4, paddingBottom: 4 }}
        onClick={(e) => {
          e.stopPropagation()
          setStageOpen((v) => !v)
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18 }}>
          {stageOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
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

function GroupHeader({ label, theme, droppableId }: { label: string; theme: Theme; droppableId?: string }) {
  const t = tokens(theme)
  const drop = useDroppable({ id: droppableId || `group:${label}`, data: { kind: "group", group: label } })
  const isOver = drop.isOver
  return (
    <div
      ref={drop.setNodeRef}
      className="flex items-center gap-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider mt-2"
      style={{
        color: t.textPrimary,
        borderBottom: `1px solid ${t.border}`,
        backgroundColor: isOver ? t.bgHover : "transparent",
      }}
    >
      <ChevronDown size={10} />
      {label}
    </div>
  )
}

// --- Drag-drop wrappers ---

function SortableLeafRow(props: ProjectRowProps & { id: string }) {
  const { id, ...rest } = props
  const sortable = useSortable({ id, data: { kind: "leaf", group: props.project.group } })
  const style: React.CSSProperties = {
    transform: sortable.transform
      ? `translate3d(${sortable.transform.x}px, ${sortable.transform.y}px, 0)`
      : undefined,
    transition: sortable.transition,
  }
  return (
    <ProjectRow
      {...rest}
      setRowRef={sortable.setNodeRef}
      rowStyle={style}
      isDragging={sortable.isDragging}
      dragHandleProps={{
        listeners: sortable.listeners,
        attributes: sortable.attributes,
        setActivatorRef: sortable.setActivatorNodeRef,
      }}
    />
  )
}

function DroppableContainerRow(props: ContainerRowProps & { id: string }) {
  const { id, ...rest } = props
  const drop = useDroppable({ id: `container:${id}`, data: { kind: "container", containerId: id } })
  return (
    <ContainerRow {...rest} setRowRef={drop.setNodeRef} isOverContainer={drop.isOver} />
  )
}

function DraggableSubProjectRow(props: {
  project: ApiProject
  status: Status
  theme: Theme
  forceExpand: boolean
  onStartSession: (project: ApiProject) => void
  onOpenFile: (projectId: string, projectName: string, filePath: string) => void
}) {
  const drag = useDraggable({ id: props.project.id, data: { kind: "sub", parentId: props.project.parentId } })
  const style: React.CSSProperties = {
    transform: drag.transform
      ? `translate3d(${drag.transform.x}px, ${drag.transform.y}px, 0)`
      : undefined,
  }
  return (
    <ProjectRow
      {...props}
      setRowRef={drag.setNodeRef}
      rowStyle={style}
      isDragging={drag.isDragging}
      dragHandleProps={{
        listeners: drag.listeners,
        attributes: drag.attributes,
        setActivatorRef: drag.setActivatorNodeRef,
      }}
    />
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
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragError, setDragError] = useState<string | null>(null)
  const previousProjectsRef = useRef<ApiProject[] | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

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

  // Filter:
  // - leaf top-level project: include if its name matches
  // - container: include if container name matches OR any sub-project name matches;
  //   when only sub-projects match, render container with only matching sub-projects.
  const filtered = useMemo(() => {
    if (!query) return projects.map((p) => ({ project: p, visibleSubProjects: p.subProjects || [] }))
    const q = query.toLowerCase()
    const out: { project: ApiProject; visibleSubProjects: ApiProject[] }[] = []
    for (const p of projects) {
      if (isContainer(p)) {
        const containerMatch = p.name.toLowerCase().includes(q)
        const matchingSubs = (p.subProjects || []).filter((sp) => sp.name.toLowerCase().includes(q))
        if (containerMatch) {
          out.push({ project: p, visibleSubProjects: p.subProjects || [] })
        } else if (matchingSubs.length > 0) {
          out.push({ project: p, visibleSubProjects: matchingSubs })
        }
      } else {
        if (p.name.toLowerCase().includes(q)) {
          out.push({ project: p, visibleSubProjects: [] })
        }
      }
    }
    return out
  }, [projects, query])

  const active = filtered.filter(({ project }) => (project.group || "Active").toLowerCase() === "active" || !project.group)
  const parked = filtered.filter(({ project }) => (project.group || "").toLowerCase() === "parked")

  const activeIds = useMemo(() => active.map((e) => e.project.id), [active])
  const parkedIds = useMemo(() => parked.map((e) => e.project.id), [parked])

  const draggingProject = useMemo(() => {
    if (!draggingId) return null
    for (const p of projects) {
      if (p.id === draggingId) return p
      for (const sp of p.subProjects || []) if (sp.id === draggingId) return sp
    }
    return null
  }, [draggingId, projects])

  const buildReorderPayload = (next: ApiProject[]): ReorderEntry[] => {
    const entries: ReorderEntry[] = []
    const groupCounters: Record<string, number> = {}
    for (const p of next) {
      const grp = p.group || "Active"
      const order = groupCounters[grp] ?? 0
      groupCounters[grp] = order + 1
      entries.push({ id: p.id, group: grp, order, parentId: null })
      const subs = p.subProjects || []
      for (let i = 0; i < subs.length; i++) {
        entries.push({ id: subs[i].id, group: null, order: i, parentId: p.id })
      }
    }
    return entries
  }

  const findProjectAnywhere = (
    arr: ApiProject[],
    id: string
  ): { project: ApiProject; parent: ApiProject | null } | null => {
    for (const p of arr) {
      if (p.id === id) return { project: p, parent: null }
      for (const sp of p.subProjects || []) {
        if (sp.id === id) return { project: sp, parent: p }
      }
    }
    return null
  }

  const handleDragStart = (e: DragStartEvent) => {
    setDraggingId(String(e.active.id))
    setDragError(null)
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    setDraggingId(null)
    const { active: act, over } = e
    if (!over) return
    const draggedId = String(act.id)
    const overId = String(over.id)

    const found = findProjectAnywhere(projects, draggedId)
    if (!found) return
    const dragged = found.project

    // Determine target placement
    let targetParentId: string | null = null
    let targetGroup: string | null = dragged.group
    let insertIndex = -1

    if (overId.startsWith("group:")) {
      targetGroup = overId.slice("group:".length)
      targetParentId = null
      // Append to end of that group
      insertIndex = -1
    } else if (overId.startsWith("container:")) {
      targetParentId = overId.slice("container:".length)
      targetGroup = null
      insertIndex = -1
    } else {
      // overId is a project ID. If it's a container, treat as drop-into-container.
      const overFound = findProjectAnywhere(projects, overId)
      if (!overFound) return
      const overProject = overFound.project
      if (isContainer(overProject)) {
        targetParentId = overProject.id
        targetGroup = null
        insertIndex = -1
      } else if (overFound.parent) {
        // Dropping onto a sub-project: place in same parent.
        targetParentId = overFound.parent.id
        targetGroup = null
        insertIndex = (overFound.parent.subProjects || []).findIndex((sp) => sp.id === overProject.id)
      } else {
        targetGroup = overProject.group
        targetParentId = null
        insertIndex = projects
          .filter((p) => (p.group || "Active") === (targetGroup || "Active"))
          .findIndex((p) => p.id === overProject.id)
      }
    }

    // No-op?
    if (
      dragged.parentId === targetParentId &&
      (dragged.group || null) === (targetGroup || null) &&
      insertIndex === -1
    ) {
      return
    }

    // Build optimistic next state
    previousProjectsRef.current = projects
    const next = applyMove(projects, dragged.id, targetParentId, targetGroup, insertIndex)
    setProjects(next)

    const payload = buildReorderPayload(next)
    try {
      await apiReorderProjects(payload)
    } catch (err: any) {
      setDragError(err?.message || "Failed to save reorder")
      // Revert
      if (previousProjectsRef.current) setProjects(previousProjectsRef.current)
      // Refresh from server to be safe
      reload()
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
          {dragError && (
            <div className="px-3 py-2 text-[10px]" style={{ color: t.statusError }}>
              {dragError}
            </div>
          )}

          <GroupHeader label="Active" theme={theme} />
          <SortableContext items={activeIds} strategy={verticalListSortingStrategy}>
            {loading && projects.length === 0 ? (
              <div className="px-2 py-2 text-[10px] italic" style={{ paddingLeft: 24, color: t.textMuted }}>
                loading projects...
              </div>
            ) : active.length === 0 ? (
              <div className="px-2 py-2 text-[10px] italic" style={{ paddingLeft: 24, color: t.textMuted }}>
                {query ? "no match" : "no projects"}
              </div>
            ) : (
              active.map(({ project, visibleSubProjects }) =>
                isContainer(project) ? (
                  <DroppableContainerRow
                    key={project.id}
                    id={project.id}
                    project={project}
                    visibleSubProjects={visibleSubProjects}
                    statusMap={statusMap}
                    theme={theme}
                    forceExpand={!!query}
                    onStartSession={onStartSession}
                    onOpenFile={onOpenFile}
                  />
                ) : (
                  <SortableLeafRow
                    key={project.id}
                    id={project.id}
                    project={project}
                    status={statusMap.get(project.id) || "unknown"}
                    theme={theme}
                    forceExpand={!!query}
                    onStartSession={onStartSession}
                    onOpenFile={onOpenFile}
                  />
                )
              )
            )}
          </SortableContext>

          <GroupHeader label="Parked" theme={theme} />
          <SortableContext items={parkedIds} strategy={verticalListSortingStrategy}>
            {parked.length === 0 ? (
              <div className="px-2 py-2 text-[10px] italic" style={{ paddingLeft: 24, color: t.textMuted }}>
                empty
              </div>
            ) : (
              parked.map(({ project, visibleSubProjects }) =>
                isContainer(project) ? (
                  <DroppableContainerRow
                    key={project.id}
                    id={project.id}
                    project={project}
                    visibleSubProjects={visibleSubProjects}
                    statusMap={statusMap}
                    theme={theme}
                    forceExpand={!!query}
                    onStartSession={onStartSession}
                    onOpenFile={onOpenFile}
                  />
                ) : (
                  <SortableLeafRow
                    key={project.id}
                    id={project.id}
                    project={project}
                    status={statusMap.get(project.id) || "unknown"}
                    theme={theme}
                    forceExpand={!!query}
                    onStartSession={onStartSession}
                    onOpenFile={onOpenFile}
                  />
                )
              )
            )}
          </SortableContext>
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

      <DragOverlay>
        {draggingProject ? (
          <div
            className="text-xs font-medium px-2 py-1.5"
            style={{ backgroundColor: t.bgCard, color: t.textPrimary, border: `1px solid ${t.border}` }}
          >
            {draggingProject.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// Pure helper: returns a new projects[] tree with the project moved to its new
// parent / group / position. Sub-project ordering within a parent is preserved
// other than the inserted item.
function applyMove(
  projects: ApiProject[],
  draggedId: string,
  targetParentId: string | null,
  targetGroup: string | null,
  insertIndex: number
): ApiProject[] {
  // Deep clone the spine we mutate (top-level array + each project's subProjects array).
  const cloned: ApiProject[] = projects.map((p) => ({ ...p, subProjects: [...(p.subProjects || [])] }))

  // Find and remove the dragged project (top-level or sub).
  let dragged: ApiProject | null = null
  const topIdx = cloned.findIndex((p) => p.id === draggedId)
  if (topIdx !== -1) {
    dragged = cloned[topIdx]
    cloned.splice(topIdx, 1)
  } else {
    for (const p of cloned) {
      const subIdx = (p.subProjects || []).findIndex((sp) => sp.id === draggedId)
      if (subIdx !== -1) {
        dragged = p.subProjects![subIdx]
        p.subProjects!.splice(subIdx, 1)
        break
      }
    }
  }
  if (!dragged) return projects

  // Apply new metadata
  const updated: ApiProject = {
    ...dragged,
    parentId: targetParentId,
    group: targetParentId ? null : (targetGroup || "Active"),
    subProjects: dragged.subProjects || [],
  }

  if (targetParentId) {
    const parent = cloned.find((p) => p.id === targetParentId)
    if (!parent) return projects
    const subs = parent.subProjects || []
    const idx = insertIndex >= 0 && insertIndex <= subs.length ? insertIndex : subs.length
    subs.splice(idx, 0, updated)
    parent.subProjects = subs
  } else {
    // Insert at the right place in the top-level array, respecting group ordering.
    const grp = updated.group
    if (insertIndex < 0) {
      // Append after the last entry of the same group
      let lastSameGroup = -1
      for (let i = 0; i < cloned.length; i++) {
        const cgrp = cloned[i].group || "Active"
        if (cgrp === (grp || "Active")) lastSameGroup = i
      }
      cloned.splice(lastSameGroup + 1, 0, updated)
    } else {
      // insertIndex is relative to entries of the same group; convert to absolute index.
      let count = 0
      let absIdx = cloned.length
      for (let i = 0; i < cloned.length; i++) {
        const cgrp = cloned[i].group || "Active"
        if (cgrp === (grp || "Active")) {
          if (count === insertIndex) {
            absIdx = i
            break
          }
          count++
        }
      }
      cloned.splice(absIdx, 0, updated)
    }
  }

  return cloned
}
