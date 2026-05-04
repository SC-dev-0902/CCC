"use client"

import { useState } from "react"
import { Settings as SettingsIcon, Terminal, AlertTriangle, RefreshCw, X } from "lucide-react"
import Link from "next/link"
import { tokens, useTheme } from "./theme-context"
import { ProjectEditModal, RegisterDialog, WatchdogBanner, ReconnectingBanner } from "./component-gallery"

export function DashboardMain() {
  const { theme } = useTheme()
  const t = tokens(theme)
  const [editOpen, setEditOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [watchdog, setWatchdog] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  return (
    <div className="flex flex-col h-full">
      {/* Active sub-project context strip */}
      <div
        className="flex items-center gap-3 px-5 py-2 shrink-0"
        style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgSidebar }}
      >
        <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>Active</span>
        <span className="text-xs" style={{ color: t.textSecondary }}>LeadSieve</span>
        <span style={{ color: t.textMuted }}>/</span>
        <span className="text-xs font-medium" style={{ color: t.textPrimary }}>leadsieve-service</span>
        <span
          className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 ml-2"
          style={{ backgroundColor: t.bgHover, color: t.accent, border: `1px solid ${t.accent}` }}
        >
          You hold the lock
        </span>
        <Link
          href="/settings"
          className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1"
          style={{ border: `1px solid ${t.border}`, color: t.textSecondary }}
        >
          <SettingsIcon size={12} />
          Settings
        </Link>
      </div>

      {/* Banners */}
      {watchdog && (
        <div className="px-5 pt-3 shrink-0">
          <WatchdogBanner theme={theme} onRestart={() => setWatchdog(false)} />
        </div>
      )}
      {reconnecting && (
        <div className="px-5 pt-3 shrink-0">
          <ReconnectingBanner theme={theme} />
        </div>
      )}

      {/* Terminal placeholder */}
      <div className="flex-1 flex flex-col p-5 gap-3 overflow-auto">
        <div
          className="flex-1 p-4 font-mono text-[12px] leading-relaxed"
          style={{
            backgroundColor: theme === "dark" ? "#0a0a0a" : "#FFFFFF",
            color: t.textSecondary,
            border: `1px solid ${t.border}`,
            minHeight: 280,
          }}
        >
          <div style={{ color: t.textMuted }}>{"# leadsieve-service - Stage 04 in progress"}</div>
          <div className="mt-2">
            <span style={{ color: t.accent }}>$</span> /continue
          </div>
          <div style={{ color: t.textMuted, marginTop: 4 }}>
            reading docs/handoff/leadsieve-service_shp.md ...
          </div>
          <div style={{ color: t.textMuted }}>
            reading parent SHP docs/handoff/LeadSieve_shp.md ...
          </div>
          <div style={{ color: t.textPrimary, marginTop: 6 }}>
            Stage 04 - Auth middleware. Last session left off at express-session config.
          </div>
          <div className="mt-3 flex items-center gap-1">
            <span style={{ color: t.accent }}>{">"}</span>
            <span
              className="inline-block"
              style={{
                width: 7, height: 14,
                backgroundColor: t.textPrimary,
                animation: "blink 1s step-end infinite",
                marginLeft: 4,
              }}
            />
          </div>
          <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
        </div>

        {/* Demo controls strip */}
        <div
          className="p-3 shrink-0"
          style={{ border: `1px dashed ${t.border}`, backgroundColor: t.bgSidebar }}
        >
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>
            Preview controls (not part of the production UI)
          </div>
          <div className="flex flex-wrap gap-2">
            <PreviewBtn onClick={() => setEditOpen(true)}>Open project edit modal</PreviewBtn>
            <PreviewBtn onClick={() => setRegisterOpen(true)}>Open register dialog</PreviewBtn>
            <PreviewBtn onClick={() => setWatchdog((v) => !v)}>{watchdog ? "Hide" : "Show"} watchdog banner</PreviewBtn>
            <PreviewBtn onClick={() => setReconnecting((v) => !v)}>{reconnecting ? "Hide" : "Show"} reconnecting banner</PreviewBtn>
            <Link href="/login">
              <PreviewBtn>Go to /login</PreviewBtn>
            </Link>
            <Link href="/setup">
              <PreviewBtn>Go to /setup</PreviewBtn>
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      {editOpen && (
        <Overlay onClose={() => setEditOpen(false)}>
          <ProjectEditModal theme={theme} />
        </Overlay>
      )}
      {registerOpen && (
        <Overlay onClose={() => setRegisterOpen(false)}>
          <RegisterDialog theme={theme} />
        </Overlay>
      )}
    </div>
  )
}

function PreviewBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const { theme } = useTheme()
  const t = tokens(theme)
  return (
    <button
      onClick={onClick}
      className="text-[11px] px-3 py-1.5"
      style={{ border: `1px solid ${t.border}`, color: t.textSecondary, backgroundColor: t.bgInput }}
    >
      {children}
    </button>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}
