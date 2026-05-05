"use client"

import { useEffect, useState } from "react"
import { marked } from "marked"
import { fetchFile } from "@/lib/api"
import { tokens } from "./theme-context"

interface Props {
  projectId: string
  filePath: string
  theme: "dark" | "light"
}

export function FileReaderPanel({ projectId, filePath, theme }: Props) {
  const t = tokens(theme)
  const [content, setContent] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchFile(projectId, filePath)
      .then(setContent)
      .catch((e) => setError(e.message || "Failed to read file"))
      .finally(() => setLoading(false))
  }, [projectId, filePath])

  const isMarkdown = /\.(md|markdown)$/i.test(filePath)
  const html = isMarkdown ? marked.parse(content || "") : null

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex items-center gap-3 px-5 py-2 shrink-0"
        style={{ borderBottom: `1px solid ${t.border}`, backgroundColor: t.bgSidebar }}
      >
        <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>File</span>
        <span className="text-xs font-mono" style={{ color: t.textPrimary }}>{filePath}</span>
      </div>

      <div
        className="flex-1 overflow-auto"
        style={{ backgroundColor: t.bgMain, color: t.textPrimary }}
      >
        {loading && <div className="p-6 text-xs" style={{ color: t.textMuted }}>Loading...</div>}
        {error && (
          <div className="p-6 text-xs" style={{ color: t.statusError }}>{error}</div>
        )}
        {!loading && !error && isMarkdown && (
          <div
            className="prose-sm p-6 max-w-3xl"
            style={{
              color: t.textPrimary,
              fontSize: 14,
              lineHeight: 1.6,
            }}
            dangerouslySetInnerHTML={{ __html: html as string }}
          />
        )}
        {!loading && !error && !isMarkdown && (
          <pre
            className="p-6 font-mono text-[12px] whitespace-pre-wrap"
            style={{ color: t.textPrimary }}
          >
            {content}
          </pre>
        )}
      </div>
    </div>
  )
}
