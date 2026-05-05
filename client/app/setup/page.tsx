"use client"

import Link from "next/link"
import { Moon, Sun } from "lucide-react"
import { CreateAdminCard } from "@/components/auth-card"
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
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <CreateAdminCard theme={theme} />
      </div>
      <footer
        className="px-5 py-3 text-center text-[11px] shrink-0"
        style={{ borderTop: `1px solid ${t.border}`, color: t.textMuted }}
      >
        <Link href="/login" style={{ color: t.accent }}>Already have an account?</Link>
      </footer>
    </div>
  )
}
