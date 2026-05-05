"use client"

import { useEffect, useState } from "react"
import { Folder } from "lucide-react"
import { USERS, INTEGRATIONS, MIGRATION_FAMILIES } from "@/lib/dummy-data"
import { fetchSettings, saveSettings, type SettingsPayload } from "@/lib/api"
import { tokens, useTheme } from "./theme-context"

const SECTIONS = ["General", "Integrations", "User Management", "Migration Tool"] as const
type Section = typeof SECTIONS[number]

export function SettingsShell({ theme, initialSection = "General", initialMigrationStep = 1 }: {
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
        {section === "General" && <GeneralPanel theme={theme} />}
        {section === "Integrations" && <IntegrationsPanel theme={theme} />}
        {section === "User Management" && <UserManagementPanel theme={theme} />}
        {section === "Migration Tool" && <MigrationPanel theme={theme} initialStep={initialMigrationStep} />}
      </div>
    </div>
  )
}

function GeneralPanel({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  const { set: setThemeCtx } = useTheme()
  const [settings, setSettings] = useState<SettingsPayload | null>(null)
  const [draft, setDraft] = useState<SettingsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setSettings(s)
        setDraft(s)
      })
      .catch((e) => setError(e.message || "Failed to load settings"))
  }, [])

  const dirty = !!(settings && draft) && JSON.stringify(settings) !== JSON.stringify(draft)

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      await saveSettings(draft)
      setSettings(draft)
      setSavedAt(Date.now())
      // Apply theme change immediately if it changed.
      if (draft.theme && draft.theme !== theme) setThemeCtx(draft.theme)
    } catch (e: any) {
      setError(e.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (!draft) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-1" style={{ color: t.textPrimary }}>General</h3>
        <div className="text-xs" style={{ color: t.textMuted }}>{error || "Loading settings..."}</div>
      </div>
    )
  }

  const fieldStyle: React.CSSProperties = {
    backgroundColor: t.bgInput,
    color: t.textPrimary,
    border: `1px solid ${t.border}`,
    padding: "6px 10px",
    fontSize: 13,
    width: "100%",
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: t.textPrimary }}>General</h3>
      <div className="text-xs mb-5" style={{ color: t.textMuted }}>Core CCC settings stored in MariaDB</div>

      <div className="grid grid-cols-1 gap-5 max-w-xl">
        <Field label="PROJECT ROOT" hint="Base path for all project paths. Project paths in projects.json are stored relative to this root." theme={theme}>
          <input
            type="text"
            value={draft.projectRoot}
            onChange={(e) => setDraft({ ...draft, projectRoot: e.target.value })}
            style={fieldStyle}
          />
        </Field>

        <Field label="EXTERNAL EDITOR" hint="Used by `Open in Editor` buttons throughout CCC." theme={theme}>
          <input
            type="text"
            value={draft.editor}
            onChange={(e) => setDraft({ ...draft, editor: e.target.value })}
            placeholder="CotEditor / code / vim ..."
            style={fieldStyle}
          />
        </Field>

        <Field label="DEFAULT SHELL" hint="Shell used for new terminal sessions. Defaults to $SHELL if empty." theme={theme}>
          <input
            type="text"
            value={draft.shell}
            onChange={(e) => setDraft({ ...draft, shell: e.target.value })}
            placeholder="/bin/zsh"
            style={fieldStyle}
          />
        </Field>

        <Field label="THEME" theme={theme}>
          <select
            value={draft.theme}
            onChange={(e) => setDraft({ ...draft, theme: e.target.value as "dark" | "light" })}
            style={fieldStyle}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </Field>

        <Field label="CONCEPT FILE PATTERN" hint="{PROJECT} = project folder name, {VERSION} = version number (e.g. 1.0)." theme={theme}>
          <input
            type="text"
            value={draft.filePatterns?.concept || ""}
            onChange={(e) => setDraft({ ...draft, filePatterns: { ...draft.filePatterns, concept: e.target.value } })}
            style={{ ...fieldStyle, fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" }}
          />
        </Field>

        <Field label="TASKLIST FILE PATTERN" theme={theme}>
          <input
            type="text"
            value={draft.filePatterns?.tasklist || ""}
            onChange={(e) => setDraft({ ...draft, filePatterns: { ...draft.filePatterns, tasklist: e.target.value } })}
            style={{ ...fieldStyle, fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" }}
          />
        </Field>

        <Field label="GITHUB TOKEN" hint="Used for auto-filing degraded-parser issues. Stored encrypted." theme={theme}>
          <input
            type="password"
            value={draft.githubToken}
            onChange={(e) => setDraft({ ...draft, githubToken: e.target.value })}
            placeholder="ghp_..."
            style={fieldStyle}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="text-xs px-4 py-1.5"
          style={{
            border: `1px solid ${t.accent}`,
            backgroundColor: dirty && !saving ? t.accent : "transparent",
            color: dirty && !saving ? "#FFFFFF" : t.textMuted,
            opacity: dirty ? 1 : 0.5,
            cursor: dirty && !saving ? "pointer" : "not-allowed",
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {savedAt && !dirty && (
          <span className="text-[11px]" style={{ color: t.textMuted }}>Saved.</span>
        )}
        {error && (
          <span className="text-[11px]" style={{ color: t.statusError }}>{error}</span>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
  theme,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  theme: "dark" | "light"
}) {
  const t = tokens(theme)
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>{label}</div>
      {children}
      {hint && (
        <div className="text-[11px] mt-1" style={{ color: t.textMuted }}>{hint}</div>
      )}
    </div>
  )
}

function IntegrationsPanel({ theme }: { theme: "dark" | "light" }) {
  const t = tokens(theme)
  return (
    <div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: t.textPrimary }}>Integrations</h3>
      <div className="text-xs mb-5" style={{ color: t.textMuted }}>External services CCC can talk to. Diode wiring lands in Stage 10.</div>
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
  return (
    <div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: t.textPrimary }}>User Management</h3>
      <div className="text-xs mb-5" style={{ color: t.textMuted }}>Lands in Stage 05 (Authentication & Multi-User).</div>
      <div style={{ border: `1px solid ${t.border}` }}>
        {USERS.map((u, idx) => (
          <div
            key={u.username}
            className="flex items-center gap-4 px-4 py-3"
            style={{ borderTop: idx > 0 ? `1px solid ${t.border}` : undefined }}
          >
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: t.textPrimary }}>{u.username}</div>
              <div className="text-[11px]" style={{ color: t.textMuted }}>{u.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MigrationPanel({ theme, initialStep }: { theme: "dark" | "light"; initialStep: number }) {
  const t = tokens(theme)
  return (
    <div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: t.textPrimary }}>Migration Tool</h3>
      <div className="text-xs mb-5" style={{ color: t.textMuted }}>v1.0 to v1.1 nested-structure migration. Wires up in Stage 08.</div>
      <div className="text-[12px]" style={{ color: t.textSecondary }}>
        Detected families: {MIGRATION_FAMILIES.length}
      </div>
    </div>
  )
}
