// Per-project WebSocket pool.
//
// The CCC server scopes every WebSocket to a single project (the path is
// /ws?projectId=<id>) and emits messages typed: output | state | claudeStatus
// | usage | degraded | exit. Treeview status dots update via claudeStatus +
// state events from any open connection - the pool exposes a "*" wildcard
// subscription for tree-level listeners and per-project subscriptions for the
// terminal panel.

const API_BASE = process.env.NEXT_PUBLIC_BASE_PATH || ""

export type WSMessage =
  | { type: "output"; data: string }
  | { type: "state"; state: string }
  | { type: "claudeStatus"; status: string }
  | { type: "usage"; usage: any }
  | { type: "degraded" }
  | { type: "exit" }
  | { type: string; [k: string]: any }

type Listener = (msg: WSMessage & { projectId: string }) => void

type Connection = {
  ws: WebSocket
  retry: number
  closed: boolean
}

class WSPool {
  private connections = new Map<string, Connection>()
  private listeners = new Map<string, Set<Listener>>() // key: projectId or "*"

  open(projectId: string): WebSocket {
    const existing = this.connections.get(projectId)
    if (existing && (existing.ws.readyState === WebSocket.OPEN || existing.ws.readyState === WebSocket.CONNECTING)) {
      return existing.ws
    }

    const protocol = typeof location !== "undefined" && location.protocol === "https:" ? "wss:" : "ws:"
    const host = typeof location !== "undefined" ? location.host : ""
    const url = `${protocol}//${host}${API_BASE}/ws?projectId=${encodeURIComponent(projectId)}`
    const ws = new WebSocket(url)
    const conn: Connection = { ws, retry: 0, closed: false }
    this.connections.set(projectId, conn)

    ws.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(typeof evt.data === "string" ? evt.data : "") as WSMessage
        const enriched = { ...parsed, projectId }
        this.listeners.get(projectId)?.forEach((l) => l(enriched))
        this.listeners.get("*")?.forEach((l) => l(enriched))
      } catch {
        // Non-JSON or malformed - ignore
      }
    }

    ws.onclose = () => {
      this.connections.delete(projectId)
      // No auto-reconnect for now: TerminalPanel triggers reopen on remount.
      // Tree-level status will simply stop updating until next user action.
    }

    ws.onerror = () => {
      // Do nothing - browser logs to console; onclose will fire.
    }

    return ws
  }

  close(projectId: string) {
    const conn = this.connections.get(projectId)
    if (!conn) return
    conn.closed = true
    try { conn.ws.close() } catch {}
    this.connections.delete(projectId)
  }

  send(projectId: string, data: object) {
    const conn = this.connections.get(projectId)
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(data))
    }
  }

  // Subscribe to messages from one project, or "*" for any project.
  // Returns an unsubscribe function.
  subscribe(target: string, listener: Listener): () => void {
    if (!this.listeners.has(target)) this.listeners.set(target, new Set())
    this.listeners.get(target)!.add(listener)
    return () => this.listeners.get(target)?.delete(listener)
  }
}

export const wsPool = new WSPool()
