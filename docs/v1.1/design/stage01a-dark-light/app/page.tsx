"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { DashboardMain } from "@/components/dashboard-main"

export default function Page() {
  const router = useRouter()
  const [activeTabId, setActiveTabId] = useState("leadsieve")
  const [tabs, setTabs] = useState([
    { id: "leadsieve", label: "LeadSieve", status: "running" as const },
    { id: "ccc", label: "CCC", status: "completed" as const, reconnecting: true },
    { id: "settings", label: "settings", status: "unknown" as const, href: "/settings" },
  ])

  return (
    <AppShell
      tabs={tabs}
      activeTabId={activeTabId}
      onSelectTab={(id) => {
        const tab = tabs.find((t) => t.id === id)
        if (tab?.href) router.push(tab.href)
        else setActiveTabId(id)
      }}
      onCloseTab={(id) => setTabs((ts) => ts.filter((t) => t.id !== id))}
    >
      <DashboardMain />
    </AppShell>
  )
}
