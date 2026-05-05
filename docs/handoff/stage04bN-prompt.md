# Stage 04bN Kickoff Prompt — Next.js Client Wiring

## Non-Negotiable Rules
- No free-styling. Implement exactly what is specified here. Stop and ask if something is ambiguous.
- No em dash (—). Use hyphen with spaces ( - ) instead.
- No code in chat. Write to files.
- No deploy step. CC runs on Dev-Web where `/mnt/sc-development` is NFS-mounted. Files are live after write.
- Commit to Forgejo on completion.

---

## Context

The Stage 01 design preview (`docs/v1.1/design/stage01a-dark-light/`) is a full Next.js app with all v1.1 UI components built against mock data. This stage wires it as the CCC runtime:

- Move the Next.js source to `client/` at the repo root
- Configure it to build as a static export
- Have Express serve `client/out/` instead of `public/`
- Replace all mock data (dummy-data.ts) with real CCC API calls
- Wire terminal sessions (xterm.js + WebSocket)
- Wire settings panel
- Wire basic file reader (markdown viewer)

After this stage, CCC on Dev-Web serves from `client/out/` and is fully functional for development use.

**What is NOT in scope for this stage (explicitly deferred):**
- Sub-project hierarchy in the treeview (04c)
- Grouped test files under Testing section (04b01)
- Drag-drop project reordering
- Add/remove/edit project modals
- Version management actions (create version, git tag, migrate)
- New project wizard (04d)
- Diode health checks (Stage 10)
- Authentication and login (Stage 05)
- "New" group / unregistered project scanner (Stage 11)

---

## Task 1 — Build Pipeline

### 1a. Move the Next.js app

```
cd /mnt/sc-development/CCC
git mv docs/v1.1/design/stage01a-dark-light client
```

Then clean up SMB artefact files that appeared during Mac-side editing:

```
find client/components -name '.smb*' -delete
```

### 1b. Update `client/next.config.mjs`

Replace the entire file with:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
```

### 1c. Update `client/package.json`

- Change `"name"` from `"my-project"` to `"ccc-client"`
- Remove `"@vercel/analytics"` from dependencies

### 1d. Update `client/app/layout.tsx`

- Remove `import { Analytics } from '@vercel/analytics/next'` and the `<Analytics />` element
- Remove the `Inter` and `JetBrains_Mono` imports from `next/font/google`
- Replace the font variable classes on `<body>` with just `className="font-sans antialiased"`
- Add this to `client/app/globals.css` (at the top, before the existing CSS):

```css
:root {
  --font-inter: 'Inter', system-ui, -apple-system, sans-serif;
  --font-jetbrains-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
}
```

This keeps the CSS variable names that Tailwind/components reference, but loads fonts from the system rather than Google CDN.

### 1e. Add build script to root `package.json`

Add to the `"scripts"` section:

```json
"build:client": "cd client && pnpm build"
```

### 1f. Update `server.js` static serving

Find the line serving `public/` (e.g., `app.use(express.static('public'))` or `app.use(express.static(path.join(__dirname, 'public')))`) and replace it with:

```js
app.use(express.static(path.join(__dirname, 'client', 'out')));
```

### 1g. Update `.gitignore`

Add:

```
client/out/
client/.next/
client/node_modules/
```

Remove `client/out/` from git tracking if it was tracked:

```
git rm -r --cached client/out/ 2>/dev/null || true
git rm -r --cached client/.next/ 2>/dev/null || true
```

---

## Task 2 — Remove Preview Artefacts

### 2a. Remove docs/v1.1/design/preview/

```
rm -rf docs/v1.1/design/preview/
```

Keep `docs/v1.1/design/stage01a-dark-light/` as a frozen reference snapshot in git history (the `git mv` already handled this by replacing it with `client/`).

### 2b. Disable Apache design-preview alias

On Dev-Web, disable and remove the Apache alias config:

```
sudo a2disconf CCC-design-preview-alias
sudo rm /etc/apache2/conf-available/CCC-design-preview-alias.conf
sudo systemctl reload apache2
```

### 2c. Remove demo controls from `client/components/dashboard-main.tsx`

- Delete the entire "Demo controls strip" `<div>` block (the dashed-border preview controls section)
- Remove `PreviewBtn` function
- Remove `Overlay` function (it will be used for real modals later; if needed it can be in a shared utils file — for now just remove it along with its usages)
- Remove `editOpen`, `registerOpen` state and the `ProjectEditModal`, `RegisterDialog` imports from `component-gallery`
- Keep `watchdog` and `reconnecting` state and the banner components — those will be wired to real events
- The terminal placeholder div stays for now (replaced in Task 5)

---

## Task 3 — Wire Projects API (Treeview)

### 3a. API shape

`GET /api/projects` returns:

```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "CCC",
      "path": "CCC",
      "group_name": "Active",
      "type": "code",
      "active_version": "1.1",
      "evaluated": true,
      "parent_id": null,
      "children": [],
      "lock_user_id": null,
      "lock_session_id": null,
      "sort_order": 0
    }
  ],
  "groups": ["Active", "Parked"]
}
```

### 3b. Update `client/lib/dummy-data.ts`

Do not delete this file yet — other components may still import from it. Instead, comment out or keep the type exports (`Status`, `Project`, `SubProject`, etc.) since components still use these types. Remove only the data constants that will be replaced by API calls.

Create a new file `client/lib/api.ts` with:

```ts
export const API_BASE = process.env.NEXT_PUBLIC_BASE_PATH || ''

export async function fetchProjects() {
  const res = await fetch(`${API_BASE}/api/projects`)
  if (!res.ok) throw new Error('Failed to fetch projects')
  return res.json() as Promise<{ projects: ApiProject[], groups: string[] }>
}

export interface ApiProject {
  id: string
  name: string
  path: string
  group_name: string | null
  type: 'code' | 'config'
  active_version: string | null
  evaluated: boolean
  parent_id: string | null
  children: ApiProject[]
  lock_user_id: string | null
  lock_session_id: string | null
  sort_order: number
}
```

### 3c. Update `client/components/treeview-shell.tsx`

Replace the dummy-data project imports with state loaded from the API.

At the component level (in `TreeviewShell`):

```tsx
const [projects, setProjects] = useState<ApiProject[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetchProjects()
    .then(({ projects }) => setProjects(projects))
    .catch(console.error)
    .finally(() => setLoading(false))
}, [])
```

Map API projects to the existing rendering logic:
- A project with `parent_id === null` is a top-level project
- Render top-level projects only for now (ignore `children` array — that is Stage 04c)
- Group by `group_name`: `"Active"` → Active group, `"Parked"` → Parked group, `null` → treat as Active
- The "New" group (unregistered projects) is not wired yet — keep the static `NEW_PROJECTS` display or hide it if empty

Map `ApiProject` to the `Project` type that `ProjectRow` expects:

```ts
function toProject(p: ApiProject): Project {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    status: 'unknown',   // real status comes from WebSocket (Task 4)
    stageProgress: undefined,  // wired later
    subProjects: [],     // populated in 04c
  }
}
```

Wire the Refresh button (↻ in the treeview header) to re-call `fetchProjects()`.

### 3d. Status dot live updates

Status updates arrive via WebSocket as `{ type: 'statusUpdate', projectId: string, status: string }`.

Keep a `Map<string, Status>` in state (e.g., `statusMap`). When a `statusUpdate` message arrives, update the map. Pass the status from the map (falling back to `'unknown'`) when rendering `StatusDot`.

The WebSocket connection is set up in Task 4 — coordinate the state so `treeview-shell.tsx` or the parent page can receive these updates.

---

## Task 4 — WebSocket + Status Updates

### 4a. Create `client/lib/ws.ts`

A singleton WebSocket manager:

```ts
type MessageHandler = (msg: any) => void

class WSManager {
  private ws: WebSocket | null = null
  private handlers: Set<MessageHandler> = new Set()

  connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const base = process.env.NEXT_PUBLIC_BASE_PATH || ''
    this.ws = new WebSocket(`${protocol}//${location.host}${base}/ws`)
    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        this.handlers.forEach(h => h(msg))
      } catch {}
    }
    this.ws.onclose = () => {
      setTimeout(() => this.connect(), 3000)  // simple reconnect
    }
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  sendRaw(data: string | ArrayBuffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    }
  }

  addHandler(h: MessageHandler) { this.handlers.add(h) }
  removeHandler(h: MessageHandler) { this.handlers.delete(h) }
}

export const wsManager = new WSManager()
```

### 4b. Connect on app load

In `client/app/page.tsx`, call `wsManager.connect()` inside a `useEffect` with `[]` deps (runs once on mount). Read `public/app.js` in the existing CCC codebase for the full WS message protocol — match it exactly for compatibility with the existing `server.js` and `src/sessions.js`.

---

## Task 5 — Terminal (xterm.js)

### 5a. Add xterm.js to client

Inside the `client/` directory:

```
pnpm add @xterm/xterm @xterm/addon-fit
```

### 5b. Create `client/components/terminal-panel.tsx`

This must be a `'use client'` component. xterm.js requires a DOM and cannot be server-rendered.

Use the `useEffect` pattern to initialize xterm.js:

```tsx
'use client'
import { useEffect, useRef } from 'react'
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'

interface Props {
  sessionId: string
  theme: 'dark' | 'light'
}

export function TerminalPanel({ sessionId, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    let fit: FitAddon
    let term: Terminal

    import('@xterm/xterm').then(({ Terminal }) => {
      return import('@xterm/addon-fit').then(({ FitAddon }) => {
        fit = new FitAddon()
        term = new Terminal({ /* options */ })
        termRef.current = term
        term.loadAddon(fit)
        term.open(containerRef.current!)
        fit.fit()

        // Wire I/O through wsManager — read public/app.js for exact message format
        // On input: wsManager.sendRaw(data) or wsManager.send({ type: 'input', sessionId, data })
        // On WS output message for this sessionId: term.write(data)

        return () => { term.dispose() }
      })
    })

    const handleResize = () => { fit?.fit() }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      termRef.current?.dispose()
    }
  }, [sessionId])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
```

**Important:** Read `public/app.js` in the CCC codebase for the exact WebSocket message protocol used for terminal I/O. Match it exactly — the existing `src/sessions.js` and `server.js` WebSocket handler is the authoritative spec.

Then import `TerminalPanel` using Next.js dynamic import in its parent component (so it is never server-rendered):

```tsx
import dynamic from 'next/dynamic'
const TerminalPanel = dynamic(
  () => import('./terminal-panel').then(m => m.TerminalPanel),
  { ssr: false, loading: () => <div>Loading terminal...</div> }
)
```

### 5c. Wire "Start Session" button

When the "Start Session" button is clicked in the treeview (on a project row), the parent page should:

1. Call `POST /api/sessions/:projectId` — returns `{ sessionId: string }`
2. Open a new tab in the tab bar for that project
3. Render `<TerminalPanel sessionId={sessionId} />` in the main area for that tab

The `StartSessionButton` in `treeview-shell.tsx` currently has `onClick` stubbed. Wire it to a callback prop passed from the parent page (`onStartSession(projectId: string)`).

### 5d. Update `dashboard-main.tsx`

Replace the terminal placeholder `<div>` with the dynamically-imported `TerminalPanel`. Pass the active `sessionId` as a prop. If no session is active for the current tab, render the "No active session" empty state (a clean prompt to start one).

---

## Task 6 — Settings Wiring

### 6a. API shape

`GET /api/settings` returns:

```json
{
  "projectRoot": "/Users/steinhoferm/SC-Development",
  "editor": "",
  "shell": "/bin/zsh",
  "theme": "dark",
  "filePatterns": { "concept": "*_concept*.md", "tasklist": "*_tasklist*.md" },
  "githubToken": ""
}
```

`PUT /api/settings` accepts a partial settings object and saves the changes.

### 6b. Update `client/components/settings-shell.tsx`

- On mount: fetch settings from `GET /api/settings`, populate the form fields
- On save: `PUT /api/settings` with the changed values
- Theme change: update both the API and the local theme context so the UI reflects the change immediately

---

## Task 7 — File Reader

### 7a. Add marked to client

```
pnpm add marked
pnpm add -D @types/marked
```

### 7b. Create `client/components/file-reader-panel.tsx`

A `'use client'` component that:
- Accepts `{ projectId: string, filePath: string }` as props
- On mount: fetches `GET /api/file/:projectId?path=<filePath>`
- Renders the response as HTML using `marked.parse(content)`
- Uses `dangerouslySetInnerHTML` (CCC is localhost-only; no XSS risk from project files)
- Applies basic prose typography matching the SC design tokens

### 7c. Wire file clicks in treeview

When a file link is clicked in the treeview (CLAUDE.md, concept, tasklist, SHP), call a parent callback `onOpenFile(projectId, filePath)`. The parent page switches the main area to show `FileReaderPanel` for that file.

The main area in `dashboard-main.tsx` already has a content region. Add state to track `activeView: 'terminal' | 'file'` and `activeFile: { projectId, filePath } | null`. Render the appropriate component based on active view.

---

## Task 8 — First Build and Verification

After all tasks above are complete:

```
# Install client dependencies (first time)
cd /mnt/sc-development/CCC/client
pnpm install

# Build
cd /mnt/sc-development/CCC
npm run build:client

# Restart CCC server
pkill -f "node server.js" || true
sleep 2
cd /mnt/sc-development/CCC
setsid nohup node server.js > /tmp/ccc-server.log 2>&1 < /dev/null &
sleep 15
curl -s http://localhost:3000/api/version
```

Verify:
- `curl http://localhost:3000` returns HTML (the Next.js app)
- CCC loads at `http://172.16.10.6:3000`
- Projects list shows real projects from DB
- Settings panel loads real settings
- Terminal session can be started for a project

---

## Acceptance Criteria

1. `client/` exists at repo root; `docs/v1.1/design/stage01a-dark-light/` no longer exists
2. `npm run build:client` succeeds from repo root (`client/out/` produced)
3. `server.js` serves from `client/out/` — `curl http://localhost:3000` returns the Next.js HTML
4. Treeview shows real projects from the DB grouped by Active/Parked (no dummy data)
5. Status dots update in real time via WebSocket `statusUpdate` messages
6. Terminal session starts when "Start Session" is clicked; xterm.js renders PTY output
7. Settings panel loads real settings from DB and saves changes via PUT
8. Clicking a file (CLAUDE.md, concept, tasklist) in the treeview opens a markdown view in the main area
9. `@vercel/analytics` is removed; no Google Fonts CDN requests
10. `docs/v1.1/design/preview/` directory no longer exists
11. Apache `/CCC/design-preview/` alias is disabled
12. No references to `dummy-data` remain in any component that is actively rendering (type exports may remain)

---

## Commit

```
git add .
git commit -m "Stage 04bN complete - Next.js client wiring"
git push origin main
```

Report the commit hash and acceptance criteria results.
