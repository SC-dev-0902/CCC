"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Moon, Sun } from "lucide-react"
import { API_BASE } from "@/lib/api"
import { tokens, useTheme } from "@/components/theme-context"

const TerminalPanel = dynamic(
  () => import("@/components/terminal-panel").then((m) => m.TerminalPanel),
  { ssr: false, loading: () => <div className="text-xs opacity-60 p-4">Loading terminal...</div> }
)

interface BrowseResponse {
  current: string
  parent: string
  directories: string[]
}

type Step = 1 | 2 | 3

export default function Page() {
  const { theme, toggle } = useTheme()
  const t = tokens(theme)

  const [step, setStep] = useState<Step>(1)
  const [sourcePath, setSourcePath] = useState("")
  const [containerName, setContainerName] = useState("")
  const [projectName, setProjectName] = useState("")
  const [importedProjectId, setImportedProjectId] = useState<string | null>(null)
  const [importedDestPath, setImportedDestPath] = useState<string | null>(null)

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: t.bgApp, color: t.textPrimary }}
    >
      <header
        className="flex items-center px-5 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgSidebar }}
      >
        <span className="text-sm font-medium">Import Project</span>
        <span className="ml-3 text-[11px]" style={{ color: t.textMuted }}>
          Step {step} of 3
        </span>
        <button
          onClick={toggle}
          className="ml-auto flex items-center justify-center"
          style={{
            width: 28, height: 28,
            border: `1px solid ${t.border}`,
            backgroundColor: t.bgInput,
            color: t.textSecondary,
          }}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </header>

      <div className="flex-1 flex items-start justify-center px-5 py-10">
        {step === 1 && (
          <Step1Source
            theme={theme}
            sourcePath={sourcePath}
            onChange={setSourcePath}
            onNext={(picked) => {
              const base = picked.split("/").filter(Boolean).pop() || ""
              if (!projectName) setProjectName(base)
              setStep(2)
            }}
          />
        )}
        {step === 2 && (
          <Step2Destination
            theme={theme}
            sourcePath={sourcePath}
            containerName={containerName}
            projectName={projectName}
            onContainerChange={setContainerName}
            onProjectNameChange={setProjectName}
            onBack={() => setStep(1)}
            onStarted={(projectId, destPath) => {
              setImportedProjectId(projectId)
              setImportedDestPath(destPath)
              setStep(3)
            }}
          />
        )}
        {step === 3 && importedProjectId && importedDestPath && (
          <Step3Terminal
            theme={theme}
            projectId={importedProjectId}
            sourcePath={sourcePath}
            destPath={importedDestPath}
          />
        )}
      </div>
    </div>
  )
}

// --- Step 1 ---

function Step1Source({
  theme,
  sourcePath,
  onChange,
  onNext,
}: {
  theme: "dark" | "light"
  sourcePath: string
  onChange: (v: string) => void
  onNext: (picked: string) => void
}) {
  const t = tokens(theme)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [browseData, setBrowseData] = useState<BrowseResponse | null>(null)
  const [browseError, setBrowseError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadBrowse(at: string) {
    setBrowseError(null)
    try {
      const res = await fetch(`${API_BASE}/api/browse?path=${encodeURIComponent(at)}`)
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
      }
      const data = (await res.json()) as BrowseResponse
      setBrowseData(data)
    } catch (e: any) {
      setBrowseError(e.message || "Browse failed")
      setBrowseData(null)
    }
  }

  async function handleToggleBrowse() {
    if (browseOpen) { setBrowseOpen(false); return }
    setBrowseOpen(true)
    await loadBrowse(sourcePath || "/")
  }

  function handleNext() {
    if (!sourcePath.trim()) { setError("Source folder is required."); return }
    setError(null)
    onNext(sourcePath.trim())
  }

  return (
    <Card theme={theme} title="Source folder" subtitle="Select the existing project folder you want to import.">
      <div className="flex gap-2">
        <input
          type="text"
          value={sourcePath}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/path/to/existing/project"
          style={{
            backgroundColor: t.bgInput,
            color: t.textPrimary,
            border: `1px solid ${t.border}`,
            padding: "6px 10px",
            fontSize: 13,
            width: "100%",
            fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
          }}
        />
        <button
          onClick={handleToggleBrowse}
          className="text-xs px-3"
          style={{
            border: `1px solid ${t.border}`,
            backgroundColor: t.bgInput,
            color: t.textPrimary,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {browseOpen ? "Hide" : "Browse"}
        </button>
      </div>

      {browseOpen && (
        <BrowsePanel
          theme={theme}
          data={browseData}
          error={browseError}
          onAscend={(parent) => loadBrowse(parent)}
          onDescend={(next) => { onChange(next); loadBrowse(next) }}
          onSelect={(next) => { onChange(next); setBrowseOpen(false) }}
        />
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleNext}
          className="text-xs px-4 py-1.5"
          style={{
            border: `1px solid ${t.accent}`,
            backgroundColor: t.accent,
            color: "#FFFFFF",
            cursor: "pointer",
          }}
        >
          Next
        </button>
        {error && <div className="text-[11px]" style={{ color: t.statusError }}>{error}</div>}
      </div>
    </Card>
  )
}

// --- Step 2 ---

function Step2Destination({
  theme,
  sourcePath,
  containerName,
  projectName,
  onContainerChange,
  onProjectNameChange,
  onBack,
  onStarted,
}: {
  theme: "dark" | "light"
  sourcePath: string
  containerName: string
  projectName: string
  onContainerChange: (v: string) => void
  onProjectNameChange: (v: string) => void
  onBack: () => void
  onStarted: (projectId: string, destPath: string) => void
}) {
  const t = tokens(theme)
  const [groups, setGroups] = useState<string[]>([])
  const [newContainer, setNewContainer] = useState(false)
  const [newContainerName, setNewContainerName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/groups`)
      .then((r) => r.json())
      .then((d) => setGroups(d.groups || []))
      .catch(() => {})
  }, [])

  async function handleStart() {
    setError(null)
    const finalContainer = newContainer ? newContainerName.trim() : containerName
    if (!finalContainer) { setError("Container is required."); return }
    if (!projectName.trim()) { setError("Project name is required."); return }
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/import/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath,
          containerName: finalContainer,
          projectName: projectName.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      onStarted(data.projectId, data.destPath)
    } catch (e: any) {
      setError(e.message || "Start failed")
      setBusy(false)
    }
  }

  return (
    <Card theme={theme} title="Destination" subtitle="Choose a container (group) and confirm the project name.">
      <div className="text-[11px] mb-3" style={{ color: t.textMuted }}>
        Source: <span style={{ fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace", color: t.textSecondary }}>{sourcePath}</span>
      </div>

      <label className="block text-[11px] uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
        Container
      </label>
      {!newContainer ? (
        <select
          value={containerName}
          onChange={(e) => onContainerChange(e.target.value)}
          style={{
            backgroundColor: t.bgInput,
            color: t.textPrimary,
            border: `1px solid ${t.border}`,
            padding: "6px 10px",
            fontSize: 13,
            width: "100%",
          }}
        >
          <option value="">- select a container -</option>
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={newContainerName}
          onChange={(e) => setNewContainerName(e.target.value)}
          placeholder="New container name"
          style={{
            backgroundColor: t.bgInput,
            color: t.textPrimary,
            border: `1px solid ${t.border}`,
            padding: "6px 10px",
            fontSize: 13,
            width: "100%",
          }}
        />
      )}
      <button
        onClick={() => setNewContainer((v) => !v)}
        className="text-[11px] mt-1.5"
        style={{ color: t.accent, cursor: "pointer", textDecoration: "underline" }}
      >
        {newContainer ? "Cancel - pick existing" : "+ New container"}
      </button>

      <label className="block text-[11px] uppercase tracking-wider mt-4 mb-1.5" style={{ color: t.textMuted }}>
        Project name
      </label>
      <input
        type="text"
        value={projectName}
        onChange={(e) => onProjectNameChange(e.target.value)}
        style={{
          backgroundColor: t.bgInput,
          color: t.textPrimary,
          border: `1px solid ${t.border}`,
          padding: "6px 10px",
          fontSize: 13,
          width: "100%",
        }}
      />

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={onBack}
          className="text-xs px-3 py-1.5"
          style={{
            border: `1px solid ${t.border}`,
            backgroundColor: "transparent",
            color: t.textSecondary,
            cursor: "pointer",
          }}
        >
          Back
        </button>
        <button
          onClick={handleStart}
          disabled={busy}
          className="text-xs px-4 py-1.5"
          style={{
            border: `1px solid ${t.accent}`,
            backgroundColor: busy ? "transparent" : t.accent,
            color: busy ? t.textMuted : "#FFFFFF",
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.5 : 1,
          }}
        >
          {busy ? "Starting..." : "Start Import"}
        </button>
        {error && <div className="text-[11px]" style={{ color: t.statusError }}>{error}</div>}
      </div>
    </Card>
  )
}

// --- Step 3 ---

function Step3Terminal({
  theme,
  projectId,
  sourcePath,
  destPath,
}: {
  theme: "dark" | "light"
  projectId: string
  sourcePath: string
  destPath: string
}) {
  const t = tokens(theme)
  const router = useRouter()
  const kickoffFiredRef = useRef(false)
  const [doneVisible, setDoneVisible] = useState(false)

  useEffect(() => {
    // Reveal "Done" after a 3-second delay so the developer doesn't dismiss
    // before CC has a chance to start producing output.
    const id = setTimeout(() => setDoneVisible(true), 3000)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    // Fire the kickoff prompt once after the terminal has had a moment to mount.
    if (kickoffFiredRef.current) return
    kickoffFiredRef.current = true
    const id = setTimeout(() => {
      fetch(`${API_BASE}/api/import/kickoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, sourcePath, destPath }),
      }).catch(() => {})
    }, 1500)
    return () => clearTimeout(id)
  }, [projectId, sourcePath, destPath])

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1100,
        border: `1px solid ${t.border}`,
        backgroundColor: t.bgCard,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 160px)",
      }}
    >
      <div className="px-5 py-3" style={{ borderBottom: `1px solid ${t.border}` }}>
        <div className="text-sm font-medium">CC is importing your project</div>
        <div className="text-[11px] mt-1" style={{ color: t.textMuted }}>
          Review CC's analysis and respond to its questions in the terminal below.
        </div>
        <div className="text-[10px] mt-1.5" style={{ color: t.textMuted, fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" }}>
          Source: {sourcePath}<br />
          Destination: {destPath}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <TerminalPanel sessionId={projectId + "::import"} projectId={projectId} theme={theme} />
      </div>
      {doneVisible && (
        <div className="px-5 py-3 flex justify-end" style={{ borderTop: `1px solid ${t.border}` }}>
          <button
            onClick={() => router.push("/")}
            className="text-xs px-4 py-1.5"
            style={{
              border: `1px solid ${t.accent}`,
              backgroundColor: t.accent,
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            Done - go to project
          </button>
        </div>
      )}
    </div>
  )
}

// --- Shared ---

function Card({ theme, title, subtitle, children }: { theme: "dark" | "light"; title: string; subtitle?: string; children: React.ReactNode }) {
  const t = tokens(theme)
  return (
    <div
      style={{
        width: 600,
        border: `1px solid ${t.border}`,
        backgroundColor: t.bgCard,
      }}
    >
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${t.border}` }}>
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="text-[11px] mt-1" style={{ color: t.textMuted }}>{subtitle}</div>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

function BrowsePanel({
  theme,
  data,
  error,
  onAscend,
  onDescend,
  onSelect,
}: {
  theme: "dark" | "light"
  data: BrowseResponse | null
  error: string | null
  onAscend: (parent: string) => void
  onDescend: (next: string) => void
  onSelect: (next: string) => void
}) {
  const t = tokens(theme)
  return (
    <div
      className="mt-2"
      style={{
        border: `1px solid ${t.border}`,
        backgroundColor: t.bgInput,
        maxHeight: 240,
        overflow: "auto",
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
        fontSize: 11,
      }}
    >
      {error && <div className="px-3 py-2" style={{ color: t.textMuted }}>{error}</div>}
      {data && (
        <>
          <div className="px-3 py-1.5" style={{ borderBottom: `1px solid ${t.border}`, color: t.textMuted }}>
            {data.current}
          </div>
          <button
            onClick={() => onAscend(data.parent)}
            className="block w-full text-left px-3 py-1.5"
            style={{ color: t.textSecondary, cursor: "pointer" }}
          >
            .. (up)
          </button>
          {data.directories.length === 0 && (
            <div className="px-3 py-1.5" style={{ color: t.textMuted }}>(no subdirectories)</div>
          )}
          {data.directories.map((name) => {
            const next = joinPath(data.current, name)
            return (
              <div key={name} className="flex items-center" style={{ borderTop: `1px solid ${t.border}` }}>
                <button
                  onClick={() => onDescend(next)}
                  className="flex-1 text-left px-3 py-1.5"
                  style={{ color: t.textPrimary, cursor: "pointer" }}
                >
                  {name}
                </button>
                <button
                  onClick={() => onSelect(next)}
                  className="px-3 py-1.5 text-[10px] uppercase tracking-wider"
                  style={{ color: t.accent, cursor: "pointer" }}
                  title="Use this folder"
                >
                  Select
                </button>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

function joinPath(base: string, name: string): string {
  if (!base) return name
  if (base === "/") return "/" + name
  return base.replace(/\/+$/, "") + "/" + name
}
