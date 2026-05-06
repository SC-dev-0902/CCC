"use client"

import { useEffect, useRef, useState } from "react"
import {
  buildMigrateUrl,
  fetchMigratePreview,
  type ApiProject,
  type MigratePreview,
} from "@/lib/api"
import { tokens } from "./theme-context"

interface MigrationModalProps {
  project: ApiProject
  targetGroup: string
  targetParentId: string | null
  theme: "dark" | "light"
  onComplete: () => void
  onCancel: () => void
}

type Phase = "preview" | "running" | "done" | "error"

export function MigrationModal({
  project,
  targetGroup,
  targetParentId,
  theme,
  onComplete,
  onCancel,
}: MigrationModalProps) {
  const t = tokens(theme)
  const [phase, setPhase] = useState<Phase>("preview")
  const [preview, setPreview] = useState<MigratePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [logLines, setLogLines] = useState<string[]>([])
  const [streamError, setStreamError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMigratePreview(project.id)
      .then((p) => { if (!cancelled) setPreview(p) })
      .catch((e: Error) => { if (!cancelled) setPreviewError(e.message || "Preview failed") })
    return () => { cancelled = true }
  }, [project.id])

  useEffect(() => {
    if (!logRef.current) return
    logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logLines])

  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [])

  function handleConfirm() {
    if (phase !== "preview") return
    setPhase("running")
    setLogLines([])
    setStreamError(null)
    const url = buildMigrateUrl(project.id, targetGroup, targetParentId)
    const es = new EventSource(url)
    esRef.current = es
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (typeof data.message === "string") {
          setLogLines((prev) => [...prev, data.message])
        } else if (data.error) {
          setStreamError(String(data.error))
          setPhase("error")
          es.close()
          esRef.current = null
        } else if (data.done) {
          setPhase("done")
          es.close()
          esRef.current = null
        }
      } catch {
        // Ignore malformed events.
      }
    }
    es.onerror = () => {
      if (phase === "running") {
        setStreamError("Connection lost during migration.")
        setPhase("error")
      }
      es.close()
      esRef.current = null
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== "running") onCancel()
      }}
    >
      <div
        style={{
          width: 520,
          backgroundColor: t.bgCard,
          border: `1px solid ${t.border}`,
          color: t.textPrimary,
        }}
      >
        <div className="px-5 py-3" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="text-sm font-medium">
            {phase === "preview" || phase === "error" && !logLines.length
              ? `Migrate: ${project.name}`
              : `Migrating: ${project.name}`}
          </div>
          {phase === "preview" && (
            <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
              Destination: {targetParentId ? "container" : targetGroup}
            </div>
          )}
        </div>

        {phase === "preview" && (
          <PreviewBody
            preview={preview}
            error={previewError}
            theme={theme}
          />
        )}

        {(phase === "running" || phase === "done" || phase === "error") && (
          <RunningBody
            logRef={logRef}
            logLines={logLines}
            streamError={streamError}
            theme={theme}
          />
        )}

        <div
          className="px-5 py-3 flex items-center justify-end gap-2"
          style={{ borderTop: `1px solid ${t.border}` }}
        >
          {phase === "preview" && (
            <>
              <button
                onClick={onCancel}
                className="text-xs px-4 py-1.5"
                style={{
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgInput,
                  color: t.textPrimary,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!preview}
                className="text-xs px-4 py-1.5"
                style={{
                  border: `1px solid ${t.accent}`,
                  backgroundColor: preview ? t.accent : "transparent",
                  color: preview ? "#FFFFFF" : t.textMuted,
                  cursor: preview ? "pointer" : "not-allowed",
                  opacity: preview ? 1 : 0.5,
                }}
              >
                Confirm
              </button>
            </>
          )}
          {phase === "running" && (
            <div className="text-[11px]" style={{ color: t.textMuted }}>
              Working...
            </div>
          )}
          {(phase === "done" || phase === "error") && (
            <button
              onClick={phase === "done" ? onComplete : onCancel}
              className="text-xs px-4 py-1.5"
              style={{
                border: `1px solid ${t.accent}`,
                backgroundColor: t.accent,
                color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PreviewBody({
  preview,
  error,
  theme,
}: {
  preview: MigratePreview | null
  error: string | null
  theme: "dark" | "light"
}) {
  const t = tokens(theme)
  if (error) {
    return (
      <div className="px-5 py-4 text-[12px]" style={{ color: "#dc2626" }}>{error}</div>
    )
  }
  if (!preview) {
    return (
      <div className="px-5 py-4 text-[12px]" style={{ color: t.textMuted }}>Loading preview...</div>
    )
  }
  return (
    <div className="px-5 py-4 flex flex-col gap-3">
      <div className="text-[11px]" style={{ color: t.textSecondary }}>
        Project root: <span style={{ fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" }}>{preview.rootPath}</span>
      </div>
      <div className="text-[11px]" style={{ color: t.textSecondary }}>
        Version: v{preview.version}
      </div>
      <div className="text-[11px]" style={{ color: t.textSecondary }}>
        The following will be created:
      </div>
      <div
        style={{
          border: `1px solid ${t.border}`,
          backgroundColor: t.bgInput,
          maxHeight: 240,
          overflow: "auto",
          fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
          fontSize: 11,
          color: t.textPrimary,
        }}
      >
        {preview.toCreate.length === 0 ? (
          <div className="px-3 py-2" style={{ color: t.textMuted }}>
            Nothing to create. The structure already exists. CCC will still register the project.
          </div>
        ) : (
          preview.toCreate.map((p) => (
            <div key={p} className="px-3 py-1">{p}</div>
          ))
        )}
      </div>
    </div>
  )
}

function RunningBody({
  logRef,
  logLines,
  streamError,
  theme,
}: {
  logRef: React.MutableRefObject<HTMLDivElement | null>
  logLines: string[]
  streamError: string | null
  theme: "dark" | "light"
}) {
  const t = tokens(theme)
  return (
    <div className="px-5 py-4">
      <div
        ref={logRef}
        style={{
          border: `1px solid ${t.border}`,
          backgroundColor: t.bgInput,
          height: 260,
          overflow: "auto",
          fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
          fontSize: 11,
          color: t.textPrimary,
        }}
      >
        {logLines.length === 0 && !streamError && (
          <div className="px-3 py-2" style={{ color: t.textMuted }}>Connecting...</div>
        )}
        {logLines.map((line, i) => (
          <div key={i} className="px-3 py-0.5">{line}</div>
        ))}
        {streamError && (
          <div className="px-3 py-1" style={{ color: "#dc2626" }}>error: {streamError}</div>
        )}
      </div>
    </div>
  )
}
