"use client"

import { useState } from "react"
import { Settings as SettingsIcon } from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { tokens, useTheme } from "./theme-context"
import { WatchdogBanner, ReconnectingBanner } from "./component-gallery"

const TerminalPanel = dynamic(
  () => import("./terminal-panel").then((m) => m.TerminalPanel),
  { ssr: false, loading: () => <div className="text-xs opacity-60 p-4">Loading terminal...</div> }
)

const FileReaderPanel = dynamic(
  () => import("./file-reader-panel").then((m) => m.FileReaderPanel),
  { ssr: false, loading: () => <div className="text-xs opacity-60 p-4">Loading file...</div> }
)

interface ActiveTab {
  kind: "terminal" | "file" | "none"
  projectId?: string
  projectName?: string
  sessionId?: string
  filePath?: string
}

interface DashboardMainProps {
  active: ActiveTab
  watchdog: boolean
  reconnecting: boolean
}

export function DashboardMain({ active, watchdog, reconnecting }: DashboardMainProps) {
  const { theme } = useTheme()
  const t = tokens(theme)

  return (
    <div className="flex flex-col h-full">
      {/* Active sub-project context strip */}
      <div
        className="flex items-center gap-3 px-5 py-2 shrink-0"
        style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgSidebar }}
      >
        <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>Active</span>
        <span className="text-xs font-medium" style={{ color: t.textPrimary }}>
          {active.projectName || "No project"}
        </span>
        <Link
          href="/settings"
          className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1"
          style={{ border: `1px solid ${t.border}`, color: t.textSecondary }}
        >
          <SettingsIcon size={12} />
          Settings
        </Link>
      </div>

      {/* Banners */}
      {watchdog && (
        <div className="px-5 pt-3 shrink-0">
          <WatchdogBanner theme={theme} onRestart={() => { /* wired later */ }} />
        </div>
      )}
      {reconnecting && (
        <div className="px-5 pt-3 shrink-0">
          <ReconnectingBanner theme={theme} />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {active.kind === "terminal" && active.sessionId && active.projectId ? (
          <TerminalPanel sessionId={active.sessionId} projectId={active.projectId} theme={theme} />
        ) : active.kind === "file" && active.projectId && active.filePath ? (
          <FileReaderPanel projectId={active.projectId} filePath={active.filePath} theme={theme} />
        ) : (
          <NoActiveSession theme={theme} />
        )}
      </div>
    </div>
  )
}

function NoActiveSession({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  return (
    <div className="flex-1 flex items-center justify-center p-10">
      <div
        className="text-center max-w-sm"
        style={{ color: t.textMuted }}
      >
        <div className="text-xs uppercase tracking-wider mb-2">No active session</div>
        <div className="text-sm" style={{ color: t.textSecondary }}>
          Pick a project in the treeview, then click <span style={{ color: t.textPrimary }}>Start Session</span> to launch a Claude Code terminal.
        </div>
      </div>
    </div>
  )
}
