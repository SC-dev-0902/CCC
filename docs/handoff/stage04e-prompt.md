# Stage 04e — Multi-Session Tab Bar
*CCC v1.1 | Read and execute this file in full before writing a single line of code.*

---

## Context

The tab bar UI and tab state model are already in place from 04bN/04c/04d. `AppShell` renders a `TabBar`, `page.tsx` manages `tabs[]` and `activeTabId`, and `handleStartSession` already opens a new tab without replacing the current one.

Two gaps remain before this feature is complete:

1. `DashboardMain` conditionally renders ONE terminal (the active tab). Switching tabs unmounts the old xterm instance and mounts a fresh one — losing the buffer and reconnecting. Fix: render ALL open session terminals at once and CSS-hide the inactive ones.
2. Closing a tab only removes it from React state. No API call is made. Fix: call `DELETE /api/sessions/:projectId` before removing the tab.

---

## Scope — exactly 4 files + 1 test file

### Task 1 — `server.js`: add DELETE /api/sessions/:projectId

Add one new route. Place it next to the existing `GET /api/sessions` and `GET /api/sessions/:projectId` routes.

```js
app.delete('/api/sessions/:projectId', (req, res) => {
  const { projectId } = req.params;
  destroySession(projectId);
  res.json({ ok: true });
});
```

`destroySession` is already imported from `src/sessions.js`. It is safe to call on a non-existent session (it returns early). Always respond 200 with `{ ok: true }` — the client does not need to distinguish "was running" from "was already gone".

---

### Task 2 — `client/lib/api.ts`: add deleteSession

Add one function:

```ts
export async function deleteSession(projectId: string): Promise<void> {
  await fetch(api(`/api/sessions/${projectId}`), { method: "DELETE" });
}
```

No return value needed. Caller does not await success.

---

### Task 3 — `client/components/dashboard-main.tsx`: multi-terminal rendering

Replace the single-active-terminal approach with a slot-based render that keeps all session terminals mounted.

**New props interface:**

```ts
interface SessionSlot {
  projectId: string
  projectName: string
  sessionId: string
}

interface DashboardMainProps {
  sessionSlots: SessionSlot[]   // all open session tabs, regardless of which is active
  active: ActiveTab             // same shape as before: { kind, projectId, projectName, sessionId, filePath }
  watchdog: boolean
  reconnecting: boolean
}
```

**Render logic for the main content area:**

```tsx
<div className="flex-1 flex flex-col overflow-hidden" style={{ position: "relative" }}>

  {/* Render every session terminal — hide all except the active one */}
  {sessionSlots.map((slot) => {
    const isActive =
      active.kind === "terminal" && active.sessionId === slot.sessionId
    return (
      <div
        key={slot.sessionId}
        style={{
          display: isActive ? "flex" : "none",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <TerminalPanel
          sessionId={slot.sessionId}
          projectId={slot.projectId}
          theme={theme}
        />
      </div>
    )
  })}

  {/* File reader — unmount/remount is fine (stateless) */}
  {active.kind === "file" && active.projectId && active.filePath && (
    <FileReaderPanel
      projectId={active.projectId}
      filePath={active.filePath}
      theme={theme}
    />
  )}

  {/* Empty state — shown when no session slots exist and no file is active */}
  {sessionSlots.length === 0 && active.kind !== "file" && (
    <NoActiveSession theme={theme} />
  )}

</div>
```

Keep the "Active sub-project context strip" header exactly as it is. Keep the watchdog and reconnecting banner slots as they are.

---

### Task 4 — `client/app/page.tsx`: wire sessionSlots + kill on close

**Derive sessionSlots from tabs state:**

```ts
const sessionSlots: SessionSlot[] = tabs
  .filter((t) => t.kind === "session" && t.projectId && t.sessionId)
  .map((t) => ({
    projectId: t.projectId!,
    projectName: t.projectName!,
    sessionId: t.sessionId!,
  }))
```

Import `SessionSlot` from `dashboard-main` (or define it locally — whichever avoids a circular import; prefer importing from `dashboard-main`).

**Update handleCloseTab to kill the session:**

```ts
const handleCloseTab = useCallback((id: string) => {
  const tab = tabs.find((t) => t.id === id)
  if (tab?.kind === "session" && tab.projectId) {
    deleteSession(tab.projectId).catch(() => {})
  }
  setTabs((curr) => curr.filter((t) => t.id !== id))
  setActiveTabId((prev) => {
    if (prev !== id) return prev
    // Activate the nearest remaining tab (excluding the one being closed)
    const remaining = tabs.filter((t) => t.id !== id)
    return remaining.length > 0 ? remaining[0].id : null
  })
}, [tabs])
```

Import `deleteSession` from `@/lib/api`.

**Pass sessionSlots to DashboardMain:**

```tsx
<DashboardMain
  sessionSlots={sessionSlots}
  active={dashActive}
  watchdog={false}
  reconnecting={false}
/>
```

`dashActive` derivation is unchanged.

---

### Task 5 — Test file: `docs/v1.1/CCC_test_stage04e.md`

Generate the pre-GoNoGo test file after all implementation tasks are complete. Format matches prior test files in the same folder. Cover:

- Backend: `DELETE /api/sessions/:projectId` with curl (running session, non-existent session)
- Multi-terminal: open two sessions, switch between them, verify both xterm instances are present in the DOM (display:none on inactive), verify terminal buffer is preserved after switch
- Tab close: verify session is killed on the server after tab X is clicked
- Active-tab fallback: close the active tab, verify a remaining tab becomes active
- Settings tab: verify it has no X button
- File tab: open a file link, verify it opens in a tab alongside terminal tabs

---

## What NOT to build

- Do NOT change the tab bar position or visual design
- Do NOT add keyboard shortcuts for tab switching
- Do NOT add tab reordering
- Do NOT add a "max tabs" limit
- Do NOT change the settings tab behaviour

---

## Acceptance criteria

1. Two Claude Code sessions can run simultaneously in separate tabs without either being killed.
2. Switching tabs restores the terminal buffer exactly as left — no re-render, no reconnect flash.
3. Closing a tab kills the PTY on the server (verify with `GET /api/sessions/:projectId` returning empty or with curl hitting the DELETE endpoint directly).
4. Closing the active tab activates the nearest remaining tab automatically.
5. The Settings tab has no X button and cannot be closed.
6. File reader tabs open alongside terminal tabs and are closeable.
7. `pnpm build` passes with no TypeScript errors.

---

## Build + restart

```bash
cd /mnt/sc-development/CCC/client
NEXT_PUBLIC_BASE_PATH=/CCC pnpm build
bash /tmp/ccc-restart.sh
```

Server restart is required (new DELETE route). Cmd+Shift+R in the browser after restart.
