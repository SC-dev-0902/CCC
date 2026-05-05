"use client"

import { useState } from "react"
import { tokens } from "./theme-context"

export function SignInCard({ theme, withError = false }: { theme: "dark" | "light"; withError?: boolean }) {
  const t = tokens(theme)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState(withError ? "wrongpass" : "")
  const [submitted, setSubmitted] = useState(withError)

  return (
    <div
      className="w-full max-w-[440px] p-7"
      style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }}
    >
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
        Claude Command Center
      </div>
      <h2 className="text-2xl font-semibold mb-5" style={{ color: t.textPrimary }}>Sign in</h2>

      <Field label="Username" theme={theme}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-transparent outline-none"
          style={{ color: t.textPrimary, border: `1px solid ${t.border}`, backgroundColor: t.bgInput }}
        />
      </Field>

      <Field label="Password" theme={theme}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-transparent outline-none"
          style={{ color: t.textPrimary, border: `1px solid ${t.border}`, backgroundColor: t.bgInput }}
        />
      </Field>

      {submitted && (
        <div className="text-[11px] mb-4 flex items-center gap-1" style={{ color: t.statusWaiting }}>
          <span>x Invalid credentials. Please try again.</span>
        </div>
      )}

      <button
        onClick={() => setSubmitted(true)}
        className="w-full py-2.5 text-sm font-medium"
        style={{ backgroundColor: t.accent, color: "#FFFFFF" }}
      >
        Sign in
      </button>

      <div className="text-[10px] text-center mt-5" style={{ color: t.textMuted }}>
        CCC v1.1.0 - Internal use only
      </div>
    </div>
  )
}

export function CreateAdminCard({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  const [u, setU] = useState("")
  const [p, setP] = useState("")
  const [c, setC] = useState("")
  const mismatch = c.length > 0 && c !== p

  return (
    <div
      className="w-full max-w-[440px] p-7"
      style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }}
    >
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
        Claude Command Center
      </div>
      <h2 className="text-2xl font-semibold mb-1" style={{ color: t.textPrimary }}>Create admin account</h2>
      <div className="text-xs mb-6" style={{ color: t.textSecondary }}>
        This is a one-time setup. No other accounts exist yet.
      </div>

      <Field label="Username" theme={theme}>
        <input
          type="text"
          value={u}
          onChange={(e) => setU(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-transparent outline-none"
          style={{ color: t.textPrimary, border: `1px solid ${t.border}`, backgroundColor: t.bgInput }}
        />
      </Field>
      <Field label="Password" theme={theme}>
        <input
          type="password"
          value={p}
          onChange={(e) => setP(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-transparent outline-none"
          style={{ color: t.textPrimary, border: `1px solid ${t.border}`, backgroundColor: t.bgInput }}
        />
      </Field>
      <Field label="Confirm password" theme={theme}>
        <input
          type="password"
          value={c}
          onChange={(e) => setC(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-transparent outline-none"
          style={{
            color: t.textPrimary,
            border: `1px solid ${mismatch ? t.statusWaiting : t.border}`,
            backgroundColor: t.bgInput,
          }}
        />
        {mismatch && (
          <div className="text-[11px] mt-1" style={{ color: t.statusWaiting }}>Passwords do not match</div>
        )}
      </Field>

      <button
        className="w-full py-2.5 text-sm font-medium mt-2"
        style={{
          backgroundColor: u && p && p === c ? t.accent : t.bgInput,
          color: u && p && p === c ? "#FFFFFF" : t.textMuted,
          cursor: u && p && p === c ? "pointer" : "not-allowed",
        }}
      >
        Create admin account
      </button>
    </div>
  )
}

function Field({ label, theme, children }: { label: string; theme: "dark" | "light"; children: React.ReactNode }) {
  const t = tokens(theme)
  return (
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
        {label}
      </div>
      {children}
    </div>
  )
}
