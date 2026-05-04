"use client"

import { useState } from "react"
import { Folder } from "lucide-react"
import { USERS, INTEGRATIONS, MIGRATION_FAMILIES } from "@/lib/dummy-data"
import { tokens } from "./theme-context"

const SECTIONS = ["Integrations", "User Management", "Migration Tool"] as const
type Section = typeof SECTIONS[number]

export function SettingsShell({ theme, initialSection = "User Management", initialMigrationStep = 1 }: {
  theme: "dark" | "light"
  initialSection?: Section
  initialMigrationStep?: number
}) {
  const t = tokens(theme)
  const [section, setSection] = useState<Section>(initialSection)

  return (
    <div className="flex" style={{ border: `1px solid ${t.border}`, backgroundColor: t.bgApp, minHeight: 540 }}>
      <aside className="w-[200px] shrink-0" style={{ backgroundColor: t.bgSidebar, borderRight: `1px solid ${t.border}` }}>
        <div className="text-[10px] uppercase tracking-wider px-4 pt-4 pb-2" style={{ color: t.textMuted }}>
          Settings
        </div>
        {SECTIONS.map((s) => {
          const active = section === s
          return (
            <button
              key={s}
              onClick={() => setSection(s)}
              className="w-full text-left px-4 py-2.5 text-sm"
              style={{
                color: active ? t.textPrimary : t.textSecondary,
                backgroundColor: active ? t.bgHover : "transparent",
                borderLeft: active ? `2px solid ${t.accent}` : "2px solid transparent",
              }}
            >
              {s}
            </button>
          )
        })}
      </aside>

      <div className="flex-1 p-6 overflow-auto">
        {section === "Integrations" && <IntegrationsPanel theme={theme} />}
        {section === "User Management" && <UserManagementPanel theme={theme} />}
        {section === "Migration Tool" && <MigrationPanel theme={theme} initialStep={initialMigrationStep} />}
      </div>
    </div>
  )
}

function IntegrationsPanel({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  return (
    <div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: t.textPrimary }}>Integrations</h3>
      <div className="text-xs mb-5" style={{ color: t.textMuted }}>External services CCC can talk to</div>
      <div style={{ border: `1px solid ${t.border}` }}>
        {INTEGRATIONS.map((i, idx) => (
          <div
            key={i.name}
            className="flex items-center gap-4 px-4 py-3"
            style={{ borderTop: idx > 0 ? `1px solid ${t.border}` : undefined }}
          >
            <span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: t.statusCompleted }} />
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: t.textPrimary }}>{i.name}</div>
              <div className="text-[11px] font-mono" style={{ color: t.textMuted }}>{i.url}</div>
            </div>
            <div className="text-xs" style={{ color: t.textSecondary }}>Last checked {i.lastChecked}</div>
            <button className="text-xs px-3 py-1" style={{ border: `1px solid ${t.border}`, color: t.textSecondary }}>
              Configure
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function UserManagementPanel({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  const [adding, setAdding] = useState(true)
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div>
        <h3 className="text-lg font-semibold mb-1" style={{ color: t.textPrimary }}>User Management</h3>
        <div className="text-xs mb-5" style={{ color: t.textMuted }}>Admin only - Manage developer accounts</div>
        <div style={{ border: `1px solid ${t.border}` }}>
          <div
            className="grid grid-cols-[1fr_80px_60px] px-4 py-2 text-[10px] uppercase tracking-wider"
            style={{ color: t.textMuted, borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgSidebar }}
          >
            <span>Username</span>
            <span>Role</span>
            <span></span>
          </div>
          {USERS.map((u, idx) => (
            <div
              key={u.username}
              className="grid grid-cols-[1fr_80px_60px] items-center px-4 py-2.5"
              style={{ borderTop: idx > 0 ? `1px solid ${t.border}` : undefined, color: t.textPrimary }}
            >
              <span className="text-sm">{u.username}</span>
              <span
                className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 inline-block w-fit"
                style={{
                  backgroundColor: u.role === "admin" ? t.accent : t.bgInput,
                  color: u.role === "admin" ? "#FFFFFF" : t.textSecondary,
                }}
              >
                {u.role === "admin" ? "ADMIN" : "DEV"}
              </span>
              {u.role !== "admin" && (
                <button className="text-[11px]" style={{ color: t.statusWaiting }}>Delete</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {adding && (
        <div className="p-4" style={{ border: `1px solid ${t.border}`, backgroundColor: t.bgSidebar, height: "fit-content" }}>
          <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Add account</div>
          <Field label="Username" theme={theme}>
            <input
              className="w-full px-3 py-2 text-sm bg-transparent outline-none"
              style={{ color: t.textPrimary, border: `1px solid ${t.border}`, backgroundColor: t.bgInput }}
            />
          </Field>
          <Field label="Password" theme={theme}>
            <input
              type="password"
              className="w-full px-3 py-2 text-sm bg-transparent outline-none"
              style={{ color: t.textPrimary, border: `1px solid ${t.border}`, backgroundColor: t.bgInput }}
            />
          </Field>
          <Field label="Role" theme={theme}>
            <select
              className="w-full px-3 py-2 text-sm outline-none"
              style={{ color: t.textPrimary, border: `1px solid ${t.border}`, backgroundColor: t.bgInput }}
            >
              <option>Developer</option>
              <option>Admin</option>
            </select>
          </Field>
          <button
            className="w-full py-2.5 text-sm font-medium mt-2"
            style={{ backgroundColor: t.accent, color: "#FFFFFF" }}
            onClick={() => setAdding(false)}
          >
            Add account
          </button>
        </div>
      )}
    </div>
  )
}

function MigrationPanel({ theme, initialStep = 1 }: { theme: "dark" | "light"; initialStep?: number }) {
  const t = tokens(theme)
  const [step, setStep] = useState(initialStep)
  const steps = ["Scan", "Review", "Diff", "Confirm"]

  return (
    <div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: t.textPrimary }}>Migration Tool</h3>
      <div className="text-xs mb-5" style={{ color: t.textMuted }}>
        Admin only - Migrate v1.0 flat project structure to v1.1 nested structure
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-3 mb-6">
        {steps.map((s, idx) => {
          const done = idx < step
          const active = idx === step
          return (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => setStep(idx)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    backgroundColor: done || active ? t.accent : "transparent",
                    border: `1px solid ${done || active ? t.accent : t.border}`,
                  }}
                />
                <span className="text-xs" style={{ color: active ? t.textPrimary : t.textMuted }}>{s}</span>
              </button>
              {idx < steps.length - 1 && (
                <div style={{ width: 60, height: 1, backgroundColor: idx < step ? t.accent : t.border }} />
              )}
            </div>
          )
        })}
      </div>

      {step === 0 && <ScanStep theme={theme} onNext={() => setStep(1)} />}
      {step === 1 && <ReviewStep theme={theme} />}
      {step === 2 && <DiffStep theme={theme} />}
      {step === 3 && <ConfirmStep theme={theme} />}

      <div className="flex justify-between mt-6">
        <button
          className="px-5 py-2 text-sm"
          style={{ border: `1px solid ${t.border}`, color: t.textSecondary, opacity: step === 0 ? 0.4 : 1 }}
          disabled={step === 0}
          onClick={() => setStep(Math.max(0, step - 1))}
        >
          Back
        </button>
        <button
          className="px-5 py-2 text-sm font-medium"
          style={{ backgroundColor: t.accent, color: "#FFFFFF" }}
          onClick={() => setStep(Math.min(3, step + 1))}
        >
          {step === 3 ? "Run migration" : `Review ${steps[step + 1] || ""} ->`}
        </button>
      </div>
    </div>
  )
}

function ScanStep({ theme, onNext }: { theme: "dark" | "light"; onNext: () => void }) {
  const t = tokens(theme)
  return (
    <div className="text-sm" style={{ color: t.textSecondary }}>
      <p className="mb-4">Scan the project root for v1.0 flat-structure projects to migrate.</p>
      <button
        className="px-4 py-2 text-sm"
        style={{ backgroundColor: t.accent, color: "#FFFFFF" }}
        onClick={onNext}
      >
        Run scan
      </button>
    </div>
  )
}

function ReviewStep({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  return (
    <div>
      <p className="text-sm mb-4" style={{ color: t.textSecondary }}>
        Review detected project families. Drag to adjust groupings.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {MIGRATION_FAMILIES.map((f) => (
          <div key={f.parent} className="p-3" style={{ border: `1px solid ${t.border}`, backgroundColor: t.bgSidebar }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Folder size={14} style={{ color: t.textMuted }} />
                <span className="text-sm font-medium" style={{ color: t.textPrimary }}>{f.parent}</span>
              </div>
              <span className="text-[10px]" style={{ color: t.textMuted }}>{f.children.length} projects</span>
            </div>
            {f.children.map((c) => (
              <div key={c} className="text-[12px] font-mono pl-4" style={{ color: t.textSecondary }}>L {c}</div>
            ))}
            <div className="text-[10px] mt-2" style={{ color: t.textMuted }}>:: drag to regroup</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DiffStep({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  const ops = [
    { op: "MOVE", from: "Projects/leadsieve-service", to: "Projects/LeadSieve/leadsieve-service" },
    { op: "MOVE", from: "Projects/leadsieve-admin", to: "Projects/LeadSieve/leadsieve-admin" },
    { op: "CREATE", from: "", to: "Projects/LeadSieve/v1.0/docs/" },
    { op: "MOVE", from: "Projects/leadsieve-service/docs/v1.0", to: "Projects/LeadSieve/leadsieve-service/v1.0" },
  ]
  return (
    <div>
      <p className="text-sm mb-4" style={{ color: t.textSecondary }}>
        Planned filesystem operations. No changes are written until Confirm.
      </p>
      <div style={{ border: `1px solid ${t.border}`, backgroundColor: t.bgSidebar }}>
        {ops.map((o, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[60px_1fr_1fr] gap-3 items-center px-3 py-2 text-[12px] font-mono"
            style={{ borderTop: idx > 0 ? `1px solid ${t.border}` : undefined }}
          >
            <span
              className="text-[10px] px-2 py-0.5 w-fit"
              style={{ color: t.accent, border: `1px solid ${t.accent}` }}
            >
              {o.op}
            </span>
            <span style={{ color: t.textMuted }}>{o.from || "-"}</span>
            <span style={{ color: t.textPrimary }}>{o.to}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConfirmStep({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  return (
    <div className="p-4" style={{ border: `1px solid ${t.statusWaiting}`, color: t.textSecondary, fontSize: 13 }}>
      About to run 4 file operations. Originals will be kept as <span className="font-mono" style={{ color: t.textPrimary }}>.ccc-backup-&lt;timestamp&gt;/</span>.
      Click <strong style={{ color: t.textPrimary }}>Run migration</strong> to proceed.
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
