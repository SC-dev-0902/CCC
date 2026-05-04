"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Hexagon, Moon, Sun, X } from "lucide-react"
import { TreeviewShell } from "./treeview-shell"
import { INTEGRATIONS } from "@/lib/dummy-data"
import { tokens, useTheme } from "./theme-context"

function Diode({ name, connected, url }: { name: string; connected: boolean; url: string }) {
  const { theme } = useTheme()
  const t = tokens(theme)
  const [hover, setHover] = useState(false)
  return (
    <div
      className="relative flex items-center gap-1.5 cursor-default"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span
        className="inline-block"
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          backgroundColor: connected ? t.statusCompleted : t.statusWaiting,
        }}
      />
      <span className="text-xs" style={{ color: t.textPrimary }}>{name}</span>
      {hover && (
        <div
          className="absolute top-full right-0 mt-2 px-3 py-2 text-[11px] z-30 whitespace-nowrap"
          style={{
            backgroundColor: t.bgCard,
            color: t.textPrimary,
            border: `1px solid ${t.border}`,
            minWidth: 220,
          }}
        >
          <div className="font-medium">{name} - {connected ? "Connected" : "Disconnected"}</div>
          <div style={{ color: t.textMuted, marginTop: 2 }}>Last checked 14s ago</div>
          <div className="font-mono mt-1" style={{ color: t.textMuted, fontSize: 10 }}>{url}</div>
        </div>
      )}
    </div>
  )
}

interface Tab {
  id: string
  label: string
  status: "running" | "completed" | "unknown" | "error" | "waiting"
  reconnecting?: boolean
  href?: string
}

function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
}: {
  tabs: Tab[]
  activeId: string
  onSelect: (id: string) => void
  onClose?: (id: string) => void
}) {
  const { theme } = useTheme()
  const t = tokens(theme)
  const dotFor: Record<Tab["status"], string> = {
    running: t.statusRunning,
    completed: t.statusCompleted,
    unknown: t.statusUnknown,
    error: t.statusError,
    waiting: t.statusWaiting,
  }
  return (
    <div className="flex items-stretch" style={{ backgroundColor: t.bgTabBar, borderBottom: `1px solid ${t.border}` }}>
      {tabs.map((tab) => {
        const active = tab.id === activeId
        const dimmed = tab.reconnecting
        const inner = (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className="flex items-center gap-2 px-4 py-2 text-xs cursor-pointer"
            style={{
              backgroundColor: active ? t.bgApp : "transparent",
              color: dimmed ? t.textMuted : t.textPrimary,
              borderTop: active ? `2px solid ${t.accent}` : "2px solid transparent",
              borderRight: `1px solid ${t.border}`,
              opacity: dimmed ? 0.6 : 1,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: dotFor[tab.status] }} />
            <span>{tab.label}</span>
            {tab.reconnecting && <span style={{ fontSize: 10, color: t.textMuted }}>(reconnecting)</span>}
            {onClose && (
              <X
                size={11}
                style={{ color: t.textMuted }}
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(tab.id)
                }}
              />
            )}
          </div>
        )
        return tab.href ? <Link key={tab.id} href={tab.href}>{inner}</Link> : inner
      })}
    </div>
  )
}

function AppHeader() {
  const { theme, toggle } = useTheme()
  const t = tokens(theme)
  return (
    <header
      className="flex items-center px-4 py-2.5 shrink-0"
      style={{ backgroundColor: t.bgSidebar, borderBottom: `1px solid ${t.border}` }}
    >
      <div className="flex items-center gap-2">
        <Hexagon size={16} style={{ color: t.textPrimary }} />
        <span className="text-sm font-medium" style={{ color: t.textPrimary }}>
          Claude Command Center
        </span>
      </div>
      <div className="flex items-center gap-5 ml-auto">
        {INTEGRATIONS.map((i) => (
          <Diode key={i.name} name={i.name} connected={i.status === "connected"} url={i.url} />
        ))}
        <button
          onClick={toggle}
          className="ml-2 flex items-center justify-center"
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
      </div>
    </header>
  )
}

export interface AppShellProps {
  children: ReactNode
  tabs?: Tab[]
  activeTabId?: string
  onSelectTab?: (id: string) => void
  onCloseTab?: (id: string) => void
}

const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 600
const SIDEBAR_DEFAULT = 320
const SIDEBAR_STORAGE_KEY = "ccc-sidebar-width"

export function AppShell({ children, tabs, activeTabId, onSelectTab, onCloseTab }: AppShellProps) {
  const { theme } = useTheme()
  const t = tokens(theme)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(SIDEBAR_STORAGE_KEY) : null
    if (stored) {
      const n = parseInt(stored, 10)
      if (!isNaN(n) && n >= SIDEBAR_MIN && n <= SIDEBAR_MAX) setSidebarWidth(n)
    }
  }, [])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const w = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX))
      setSidebarWidth(w)
    }
    const onUp = () => {
      setDragging(false)
      try { window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth)) } catch {}
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [dragging, sidebarWidth])

  return (
    <div
      className="flex flex-col"
      style={{ backgroundColor: t.bgApp, color: t.textPrimary, height: "100vh", minHeight: 700 }}
    >
      <AppHeader />
      {tabs && tabs.length > 0 && activeTabId && onSelectTab && (
        <TabBar tabs={tabs} activeId={activeTabId} onSelect={onSelectTab} onClose={onCloseTab} />
      )}
      <div className="flex flex-1 overflow-hidden">
        <aside
          className="shrink-0 overflow-hidden"
          style={{ width: sidebarWidth, borderRight: `1px solid ${t.border}` }}
        >
          <TreeviewShell theme={theme} />
        </aside>
        <div
          onMouseDown={(e) => { e.preventDefault(); setDragging(true) }}
          onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT)}
          title="Drag to resize - double-click to reset"
          style={{
            width: 4,
            cursor: "col-resize",
            backgroundColor: dragging ? t.accent : "transparent",
            transition: dragging ? "none" : "background-color 0.15s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { if (!dragging) (e.currentTarget as HTMLDivElement).style.backgroundColor = t.border }}
          onMouseLeave={(e) => { if (!dragging) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent" }}
        />
        <main className="flex-1 overflow-auto" style={{ backgroundColor: t.bgMain }}>
          {children}
        </main>
      </div>
    </div>
  )
}
