"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Moon, Sun } from "lucide-react"
import { API_BASE, fetchSettings, saveSettings, scanHome } from "@/lib/api"
import { tokens, useTheme } from "@/components/theme-context"

export default function Page() {
  const { theme, toggle } = useTheme()
  const t = tokens(theme)
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: t.bgApp, color: t.textPrimary }}
    >
      <header
        className="flex items-center px-5 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgSidebar }}
      >
        <span className="text-sm font-medium">Claude Command Center - First-run setup</span>
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
        <ProjectRootCard theme={theme} />
      </div>
      <footer
        className="px-5 py-3 text-center text-[11px] shrink-0"
        style={{ borderTop: `1px solid ${t.border}`, color: t.textMuted }}
      >
        Set this once. You can change it later under Settings.
      </footer>
    </div>
  )
}

interface BrowseResponse {
  current: string
  parent: string
  directories: string[]
}

function ProjectRootCard({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  const router = useRouter()
  const [pathValue, setPathValue] = useState("")
  const [browseOpen, setBrowseOpen] = useState(false)
  const [browseData, setBrowseData] = useState<BrowseResponse | null>(null)
  const [browseError, setBrowseError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<"idle" | "saving" | "scanning">("idle")

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        if (s.projectRoot) setPathValue(s.projectRoot)
      })
      .catch(() => {})
  }, [])

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
    if (browseOpen) {
      setBrowseOpen(false)
      return
    }
    setBrowseOpen(true)
    await loadBrowse(pathValue || "/")
  }

  async function handleSaveAndScan() {
    setError(null)
    if (!pathValue.trim()) {
      setError("Project home folder is required.")
      return
    }
    setBusy("saving")
    try {
      await saveSettings({ projectRoot: pathValue.trim() })
    } catch (e: any) {
      setError(e.message || "Save failed")
      setBusy("idle")
      return
    }
    setBusy("scanning")
    try {
      await scanHome()
    } catch (e: any) {
      setError(e.message || "Scan failed")
      setBusy("idle")
      return
    }
    setBusy("idle")
    router.push("/")
  }

  const fieldStyle: React.CSSProperties = {
    backgroundColor: t.bgInput,
    color: t.textPrimary,
    border: `1px solid ${t.border}`,
    padding: "6px 10px",
    fontSize: 13,
    width: "100%",
  }

  return (
    <div
      style={{
        width: 560,
        border: `1px solid ${t.border}`,
        backgroundColor: t.bgCard,
      }}
    >
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${t.border}` }}>
        <div className="text-sm font-medium" style={{ color: t.textPrimary }}>
          Project Home Folder
        </div>
        <div className="text-[11px] mt-1" style={{ color: t.textMuted }}>
          The root directory that contains all your projects. CCC will scan it and
          list found projects under "To Be Migrated" for you to register.
        </div>
      </div>

      <div className="px-5 py-5 flex flex-col gap-4">
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={pathValue}
              onChange={(e) => setPathValue(e.target.value)}
              placeholder="/mnt/sc-development"
              style={{ ...fieldStyle, fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" }}
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
              title="Browse directories"
            >
              {browseOpen ? "Hide" : "Browse"}
            </button>
          </div>

          {browseOpen && (
            <div
              className="mt-2"
              style={{
                border: `1px solid ${t.border}`,
                backgroundColor: t.bgInput,
                maxHeight: 220,
                overflow: "auto",
                fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
                fontSize: 11,
              }}
            >
              {browseError && (
                <div className="px-3 py-2" style={{ color: t.textMuted }}>{browseError}</div>
              )}
              {browseData && (
                <>
                  <div
                    className="px-3 py-1.5"
                    style={{ borderBottom: `1px solid ${t.border}`, color: t.textMuted }}
                  >
                    {browseData.current}
                  </div>
                  <button
                    onClick={() => loadBrowse(browseData.parent)}
                    className="block w-full text-left px-3 py-1.5"
                    style={{ color: t.textSecondary, cursor: "pointer" }}
                  >
                    .. (up)
                  </button>
                  {browseData.directories.length === 0 && (
                    <div className="px-3 py-1.5" style={{ color: t.textMuted }}>
                      (no subdirectories)
                    </div>
                  )}
                  {browseData.directories.map((name) => {
                    const next = joinPath(browseData.current, name)
                    return (
                      <div key={name} className="flex items-center" style={{ borderTop: `1px solid ${t.border}` }}>
                        <button
                          onClick={() => {
                            setPathValue(next)
                            loadBrowse(next)
                          }}
                          className="flex-1 text-left px-3 py-1.5"
                          style={{ color: t.textPrimary, cursor: "pointer" }}
                        >
                          {name}
                        </button>
                        <button
                          onClick={() => {
                            setPathValue(next)
                            setBrowseOpen(false)
                          }}
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
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveAndScan}
            disabled={busy !== "idle"}
            className="text-xs px-4 py-1.5"
            style={{
              border: `1px solid ${t.accent}`,
              backgroundColor: busy !== "idle" ? "transparent" : t.accent,
              color: busy !== "idle" ? t.textMuted : "#FFFFFF",
              cursor: busy !== "idle" ? "not-allowed" : "pointer",
              opacity: busy !== "idle" ? 0.5 : 1,
            }}
          >
            {busy === "saving" ? "Saving..." : busy === "scanning" ? "Scanning..." : "Save & Scan"}
          </button>
          {error && (
            <div className="text-[11px]" style={{ color: "#dc2626" }}>{error}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function joinPath(base: string, name: string): string {
  if (!base) return name
  if (base === "/") return "/" + name
  return base.replace(/\/+$/, "") + "/" + name
}
