"use client"

import { useState } from "react"
import { AlertTriangle, Folder, RefreshCw, X } from "lucide-react"
import { tokens } from "./theme-context"

export function ProjectEditModal({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  const [path, setPath] = useState("Projects/LeadSieve/leadsieve-service")
  const [type, setType] = useState<"code" | "config">("code")
  const [showBrowser, setShowBrowser] = useState(true)
  const pathInvalid = path.startsWith("Projects/LeadSieve/leadsieve-service")

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_320px] items-start">
      <div className="p-0" style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${t.border}` }}>
          <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>Edit Project</span>
          <X size={16} style={{ color: t.textMuted, cursor: "pointer" }} />
        </div>
        <div className="p-4">
          <Field label="Name" theme={theme}>
            <input
              defaultValue="leadsieve-service"
              className="w-full px-3 py-2 text-sm bg-transparent outline-none"
              style={{ color: t.textPrimary, border: `1px solid ${t.border}`, backgroundColor: t.bgInput }}
            />
          </Field>
          <Field label="Path" theme={theme}>
            <div className="flex">
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
                style={{
                  color: t.textPrimary,
                  border: `1px solid ${pathInvalid ? t.statusWaiting : t.border}`,
                  backgroundColor: t.bgInput,
                }}
              />
              <button
                onClick={() => setShowBrowser(!showBrowser)}
                className="px-3 text-xs"
                style={{ border: `1px solid ${t.border}`, borderLeft: 0, color: t.textSecondary }}
              >
                Browse
              </button>
            </div>
            {pathInvalid && (
              <div className="text-[11px] mt-1" style={{ color: t.statusWaiting }}>x Path does not exist on server.</div>
            )}
            <div className="text-[10px] mt-1" style={{ color: t.textMuted }}>Relative to PROJECT_ROOT. Must exist on server.</div>
          </Field>
          <Field label="Group" theme={theme}>
            <select
              defaultValue="Active"
              className="w-full px-3 py-2 text-sm outline-none"
              style={{ color: t.textPrimary, border: `1px solid ${t.border}`, backgroundColor: t.bgInput }}
            >
              <option>Active</option>
              <option>Parked</option>
              <option>New</option>
            </select>
          </Field>
          <Field label="Type" theme={theme}>
            <div className="flex items-center gap-4">
              <Checkbox checked={type === "code"} onChange={() => setType("code")} label="Code" theme={theme} />
              <Checkbox checked={type === "config"} onChange={() => setType("config")} label="Config" theme={theme} />
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button className="px-4 py-2 text-sm" style={{ border: `1px solid ${t.border}`, color: t.textSecondary }}>
              Cancel
            </button>
            <button className="px-4 py-2 text-sm font-medium" style={{ backgroundColor: t.accent, color: "#FFFFFF" }}>
              Save
            </button>
          </div>
        </div>
      </div>

      {showBrowser && (
        <div style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }}>
          <div className="px-3 py-2 font-mono text-xs" style={{ color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>
            Projects/LeadSieve/
          </div>
          {["..  (parent)", "leadsieve-service", "leadsieve-admin", "leadsieve-web"].map((row, idx) => {
            const selected = idx === 1
            return (
              <div
                key={row}
                className="px-3 py-2 text-sm cursor-pointer"
                style={{
                  backgroundColor: selected ? t.bgHover : "transparent",
                  color: selected ? t.textPrimary : t.textSecondary,
                  borderBottom: idx < 3 ? `1px solid ${t.border}` : undefined,
                }}
              >
                {row}
              </div>
            )
          })}
          <div className="flex justify-end gap-2 px-3 py-3">
            <button className="px-3 py-1.5 text-xs" style={{ border: `1px solid ${t.border}`, color: t.textSecondary }}>Cancel</button>
            <button className="px-3 py-1.5 text-xs" style={{ backgroundColor: t.accent, color: "#FFFFFF" }}>Select</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function WatchdogBanner({ theme, onRestart }: { theme: "dark" | "light"; onRestart?: () => void }) {
  const t = tokens(theme)
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ backgroundColor: t.bgCard, border: `1px solid ${t.statusWaiting}`, color: t.textPrimary }}
    >
      <AlertTriangle size={16} style={{ color: t.statusWaiting }} />
      <span className="text-sm flex-1">Session unresponsive - no output for 90s.</span>
      <button
        onClick={onRestart}
        className="px-3 py-1.5 text-xs font-medium"
        style={{ backgroundColor: t.accent, color: "#FFFFFF" }}
      >
        Restart Session
      </button>
      <X size={14} style={{ color: t.textMuted, cursor: "pointer" }} />
    </div>
  )
}

export function ReconnectingBanner({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}`, color: t.textPrimary }}
    >
      <RefreshCw size={14} style={{ color: t.statusRunning }} className="animate-spin" />
      <span className="text-sm">Reconnecting... (attempt 2 of 5)</span>
    </div>
  )
}

export function TabReconnectingState({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  return (
    <div className="flex items-stretch" style={{ border: `1px solid ${t.border}` }}>
      <div className="flex items-center gap-2 px-3 py-2 text-xs" style={{ backgroundColor: t.bgCard, color: t.textPrimary, borderRight: `1px solid ${t.border}` }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: t.statusCompleted }} />
        LeadSieve
        <X size={11} style={{ color: t.textMuted }} />
      </div>
      <div className="flex items-center gap-2 px-3 py-2 text-xs" style={{ backgroundColor: t.bgCard, color: t.textMuted, opacity: 0.6 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: t.statusUnknown }} />
        CCC
        <span style={{ fontSize: 10 }}>(reconnecting)</span>
        <X size={11} />
      </div>
    </div>
  )
}

export function RegisterDialog({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  const [type, setType] = useState<"code" | "config">("code")
  return (
    <div className="w-full max-w-[460px]" style={{ backgroundColor: t.bgCard, border: `1px solid ${t.border}` }}>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${t.border}` }}>
        <span className="text-sm font-semibold" style={{ color: t.textPrimary }}>Register Project</span>
      </div>
      <div className="p-4">
        <p className="text-sm mb-4" style={{ color: t.textPrimary }}>Register this directory as a CCC project?</p>
        <div className="p-3 mb-4" style={{ backgroundColor: t.bgInput, border: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-2 mb-1">
            <Folder size={14} style={{ color: t.textMuted }} />
            <span className="font-mono text-sm" style={{ color: t.textPrimary }}>analytics-service</span>
          </div>
          <div className="text-[11px] font-mono" style={{ color: t.textMuted }}>Projects/analytics-service</div>
        </div>
        <Field label="Display name" theme={theme}>
          <input
            defaultValue="analytics-service"
            className="w-full px-3 py-2 text-sm bg-transparent outline-none"
            style={{ color: t.textPrimary, border: `1px solid ${t.border}`, backgroundColor: t.bgInput }}
          />
        </Field>
        <Field label="Type" theme={theme}>
          <div className="flex items-center gap-4">
            <Checkbox checked={type === "code"} onChange={() => setType("code")} label="Code" theme={theme} />
            <Checkbox checked={type === "config"} onChange={() => setType("config")} label="Config" theme={theme} />
          </div>
        </Field>
        <Field label="Dropping into" theme={theme}>
          <span
            className="text-[10px] uppercase tracking-wider px-2 py-1"
            style={{ backgroundColor: t.accent, color: "#FFFFFF" }}
          >
            ACTIVE
          </span>
        </Field>
      </div>
      <div className="flex justify-end gap-2 px-4 py-3" style={{ borderTop: `1px solid ${t.border}` }}>
        <button className="px-4 py-2 text-sm" style={{ border: `1px solid ${t.border}`, color: t.textSecondary }}>Cancel</button>
        <button className="px-4 py-2 text-sm font-medium" style={{ backgroundColor: t.accent, color: "#FFFFFF" }}>Register Project</button>
      </div>
    </div>
  )
}

function Field({ label, theme, children }: { label: string; theme: "dark" | "light"; children: React.ReactNode }) {
  const t = tokens(theme)
  return (
    <div className="mb-3">
      <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>{label}</div>
      {children}
    </div>
  )
}

function Checkbox({ checked, onChange, label, theme }: {
  checked: boolean; onChange: () => void; label: string; theme: "dark" | "light"
}) {
  const t = tokens(theme)
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: t.textPrimary }}>
      <span
        onClick={onChange}
        className="inline-flex items-center justify-center"
        style={{
          width: 14, height: 14,
          border: `1px solid ${checked ? t.accent : t.border}`,
          backgroundColor: checked ? t.accent : "transparent",
        }}
      >
        {checked && <span style={{ width: 6, height: 6, backgroundColor: "#FFFFFF" }} />}
      </span>
      {label}
    </label>
  )
}
