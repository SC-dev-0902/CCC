"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { SettingsShell } from "@/components/settings-shell"
import { useTheme } from "@/components/theme-context"

export default function Page() {
  const router = useRouter()
  const { theme } = useTheme()
  const [tabs] = useState([
    { id: "leadsieve", label: "LeadSieve", status: "running" as const, href: "/" },
    { id: "ccc", label: "CCC", status: "completed" as const, reconnecting: true, href: "/" },
    { id: "settings", label: "settings", status: "unknown" as const },
  ])

  return (
    <AppShell
      tabs={tabs}
      activeTabId="settings"
      onSelectTab={(id) => {
        const tab = tabs.find((t) => t.id === id)
        if (tab?.href) router.push(tab.href)
      }}
    >
      <div className="p-5">
        <SettingsShell theme={theme} initialSection="User Management" />
      </div>
    </AppShell>
  )
}
