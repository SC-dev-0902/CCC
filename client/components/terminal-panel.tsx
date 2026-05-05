"use client"

import { useEffect, useRef } from "react"
import { wsPool } from "@/lib/ws"
import "@xterm/xterm/css/xterm.css"

interface Props {
  projectId: string
  sessionId: string
  theme: "dark" | "light"
}

export function TerminalPanel({ projectId, sessionId, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let disposed = false
    let term: any = null
    let fit: any = null
    let unsubWS: (() => void) | null = null
    let resizeListener: (() => void) | null = null

    ;(async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ])
      if (disposed || !containerRef.current) return

      const isDark = theme === "dark"
      term = new Terminal({
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
        fontSize: 13,
        cursorBlink: true,
        theme: {
          background: isDark ? "#0a0a0a" : "#FFFFFF",
          foreground: isDark ? "#e6e6e6" : "#1a1a1a",
          cursor: isDark ? "#e6e6e6" : "#1a1a1a",
        },
        scrollback: 5000,
      })
      fit = new FitAddon()
      term.loadAddon(fit)
      term.open(containerRef.current)
      try { fit.fit() } catch {}

      // Open the WS for this project (server scopes by projectId).
      const ws = wsPool.open(projectId)

      // When the socket opens, sync the terminal size to the PTY.
      const sendResize = () => {
        if (!term || !fit) return
        try { fit.fit() } catch {}
        const cols = term.cols
        const rows = term.rows
        wsPool.send(projectId, { type: "resize", cols, rows })
      }
      if (ws.readyState === WebSocket.OPEN) sendResize()
      else ws.addEventListener("open", sendResize, { once: true })

      // Pipe keystrokes -> server.
      term.onData((data: string) => {
        wsPool.send(projectId, { type: "input", data })
      })

      // Pipe server output -> terminal. Subscribe to messages for this project only.
      unsubWS = wsPool.subscribe(projectId, (msg) => {
        if (msg.type === "output" && term) {
          term.write((msg as any).data)
        } else if (msg.type === "exit" && term) {
          term.write("\r\n[session exited]\r\n")
        }
      })

      // Re-fit on window resize.
      resizeListener = () => sendResize()
      window.addEventListener("resize", resizeListener)
    })().catch((err) => {
      console.error("TerminalPanel init failed", err)
    })

    cleanupRef.current = () => {
      disposed = true
      if (resizeListener) window.removeEventListener("resize", resizeListener)
      if (unsubWS) unsubWS()
      if (term) {
        try { term.dispose() } catch {}
      }
    }

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
      // Do not close the WS here - other consumers may still be subscribed,
      // and re-mounts (theme change, etc.) should reuse the connection.
    }
    // sessionId is included so a brand-new session forces a fresh terminal mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, sessionId])

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: theme === "dark" ? "#0a0a0a" : "#FFFFFF",
        padding: 8,
      }}
    />
  )
}
