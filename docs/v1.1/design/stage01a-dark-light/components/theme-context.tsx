"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
  set: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children, initial = "dark" }: { children: React.ReactNode; initial?: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("ccc-theme") as Theme | null
      if (stored === "dark" || stored === "light") setTheme(stored)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ccc-theme", theme)
      document.documentElement.classList.toggle("dark", theme === "dark")
    }
  }, [theme])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
        set: setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return { theme: "dark", toggle: () => {}, set: () => {} }
  }
  return ctx
}

export function tokens(theme: Theme) {
  const isDark = theme === "dark"
  return {
    isDark,
    bgApp: isDark ? "#111918" : "#F7F8F9",
    bgSidebar: isDark ? "#1B2021" : "#FFFFFF",
    bgMain: isDark ? "#111918" : "#F7F8F9",
    bgTabBar: isDark ? "#1B2021" : "#F0F2F4",
    bgHover: isDark ? "#242b2c" : "#D8F3DC",
    bgInput: isDark ? "#242b2c" : "#F0F2F4",
    bgCard: isDark ? "#1B2021" : "#FFFFFF",
    textPrimary: isDark ? "#F7F8F9" : "#1B2021",
    textSecondary: isDark ? "#A0AEC0" : "#4A5568",
    textMuted: isDark ? "#4A5568" : "#A0AEC0",
    border: isDark ? "#2d3535" : "#D1D9E0",
    accent: "#2D6A4F",
    accentHover: "#52B788",
    accentBg: "#D8F3DC",
    statusWaiting: "#9B2335",
    statusRunning: "#B7791F",
    statusCompleted: "#276749",
    statusError: "#7A1828",
    statusUnknown: "#A0AEC0",
  }
}
