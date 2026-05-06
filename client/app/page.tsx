"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { DashboardMain } from "@/components/dashboard-main"
import { fetchSettings, startSession, type ApiProject } from "@/lib/api"
import { wsPool } from "@/lib/ws"

type TabStatus = "running" | "completed" | "unknown" | "error" | "waiting"

interface Tab {
  id: string
  label: string
  status: TabStatus
  reconnecting?: boolean
  href?: string
  kind: "session" | "file" | "external"
  projectId?: string
  projectName?: string
  sessionId?: string
  filePath?: string
}

const SETTINGS_TAB: Tab = {
  id: "__settings__",
  label: "settings",
  status: "unknown",
  href: "/settings",
  kind: "external",
}

export default function Page() {
  const router = useRouter()
  const [tabs, setTabs] = useState<Tab[]>([SETTINGS_TAB])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [statusByProject, setStatusByProject] = useState<Map<string, TabStatus>>(new Map())

  // First-run redirect: send the user to /setup until projectRoot is configured.
  useEffect(() => {
    fetchSettings()
      .then((s) => {
        if (!s.projectRoot) router.push("/setup")
      })
      .catch(() => {})
  }, [router])

  // Translate WS events into tab statuses (for the tab dot).
  useEffect(() => {
    const unsub = wsPool.subscribe("*", (msg) => {
      let next: TabStatus | null = null
      if (msg.type === "claudeStatus") {
        const s = String((msg as any).status || "").toUpperCase()
        if (s === "WAITING_FOR_INPUT") next = "waiting"
        else if (s === "RUNNING") next = "running"
        else if (s === "COMPLETED") next = "completed"
        else if (s === "ERROR") next = "error"
      } else if (msg.type === "state") {
        if ((msg as any).state === "active") next = "running"
        else if ((msg as any).state === "exited" || (msg as any).state === "none") next = "unknown"
      } else if (msg.type === "exit") {
        next = "unknown"
      }
      if (!next) return
      setStatusByProject((prev) => {
        const m = new Map(prev)
        m.set(msg.projectId, next!)
        return m
      })
    })
    return unsub
  }, [])

  // Keep tabs in sync with the per-project status map.
  useEffect(() => {
    setTabs((curr) => curr.map((tab) => {
      if (tab.kind !== "session" || !tab.projectId) return tab
      const s = statusByProject.get(tab.projectId)
      return s && s !== tab.status ? { ...tab, status: s } : tab
    }))
  }, [statusByProject])

  const handleStartSession = useCallback(async (project: ApiProject) => {
    const tabId = `session:${project.id}`
    // If a tab already exists for this project, just activate it.
    setTabs((curr) => {
      if (curr.some((t) => t.id === tabId)) return curr
      const newTab: Tab = {
        id: tabId,
        label: project.name,
        status: "unknown",
        kind: "session",
        projectId: project.id,
        projectName: project.name,
        sessionId: tabId,
      }
      return [newTab, ...curr.filter((t) => t.id !== "__settings__"), SETTINGS_TAB]
    })
    setActiveTabId(tabId)
    try {
      await startSession(project.id, "claude")
      // Connection is established by TerminalPanel via wsPool when it mounts.
    } catch (e) {
      console.error("startSession failed", e)
    }
  }, [])

  const handleOpenFile = useCallback((projectId: string, projectName: string, filePath: string) => {
    const tabId = `file:${projectId}:${filePath}`
    setTabs((curr) => {
      if (curr.some((t) => t.id === tabId)) return curr
      const newTab: Tab = {
        id: tabId,
        label: filePath.split("/").pop() || filePath,
        status: "unknown",
        kind: "file",
        projectId,
        projectName,
        filePath,
      }
      return [newTab, ...curr.filter((t) => t.id !== "__settings__"), SETTINGS_TAB]
    })
    setActiveTabId(tabId)
  }, [])

  const handleSelectTab = useCallback((id: string) => {
    const tab = tabs.find((t) => t.id === id)
    if (tab?.href) {
      router.push(tab.href)
    } else {
      setActiveTabId(id)
    }
  }, [tabs, router])

  const handleCloseTab = useCallback((id: string) => {
    setTabs((curr) => curr.filter((t) => t.id !== id))
    setActiveTabId((prev) => (prev === id ? null : prev))
  }, [])

  const activeTab = tabs.find((t) => t.id === activeTabId) || null

  const dashActive = activeTab && activeTab.kind === "session"
    ? {
        kind: "terminal" as const,
        projectId: activeTab.projectId,
        projectName: activeTab.projectName,
        sessionId: activeTab.sessionId,
      }
    : activeTab && activeTab.kind === "file"
    ? {
        kind: "file" as const,
        projectId: activeTab.projectId,
        projectName: activeTab.projectName,
        filePath: activeTab.filePath,
      }
    : { kind: "none" as const }

  const visibleTabs = tabs
    .filter((t) => t.kind !== "external" || t.id === "__settings__")
    .map((t) => ({
      id: t.id,
      label: t.label,
      status: t.status,
      reconnecting: t.reconnecting,
      href: t.href,
    }))

  return (
    <AppShell
      tabs={visibleTabs}
      activeTabId={activeTabId || "__settings__"}
      onSelectTab={handleSelectTab}
      onCloseTab={handleCloseTab}
      onStartSession={handleStartSession}
      onOpenFile={handleOpenFile}
    >
      <DashboardMain
        active={dashActive}
        watchdog={false}
        reconnecting={false}
      />
    </AppShell>
  )
}
