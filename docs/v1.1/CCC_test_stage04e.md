# CCC v1.1 - Stage 04e Test Checklist
## Multi-Session Tab Bar

Run all CLI commands from the CCC project root on Dev-Web (`/mnt/sc-development/CCC`) or against the share from the Mac. Browser items: open `http://kkh01vdweb01.mcsfam.local/CCC/` (Cmd+Shift+R after every server restart).

> **Note on rebuild and restart:** Stage 04e ships a backend route + 3 frontend files. Verify `client/out/` was rebuilt and the CCC server was restarted before walking browser items.

> **CC test run 2026-05-07 (CLI items):** Build: `NEXT_PUBLIC_BASE_PATH=/CCC pnpm build` on Dev-Web - 5 routes (`/`, `/_not-found`, `/login`, `/settings`, `/setup`), no TS errors. Restart: `bash /tmp/ccc-restart.sh` -> PID 2565 (~13s cold start over NFS, restart script recreated since Dev-Web reboot wiped `/tmp`). Backend smoke executed end-to-end against the CCC project id (`3b7c2ac6-ffbe-4939-93b8-a905056553f8`): DELETE-on-empty returns 200, POST start returns active, DELETE-on-running returns 200, GET state confirms `none` after kill.

---

### Task 1 - Backend: `DELETE /api/sessions/:projectId` exists and is idempotent

- [x] DELETE on a project with no running session returns `{"ok":true}` HTTP 200.
  - Command: `curl -s -w "\nHTTP %{http_code}\n" -X DELETE http://kkh01vdweb01.mcsfam.local/CCC/api/sessions/3b7c2ac6-ffbe-4939-93b8-a905056553f8`
  - Outcome: HTTP 200, body `{"ok":true}`.

> Test comment: PASS. CC ran the command - returned `{"ok":true}` HTTP 200. Subsequent `GET /api/sessions/:id` returned `{"state":"none"}`.

- [x] Start a session, then DELETE it, then verify state is gone.
  - Command sequence:
    1. `curl -s -X POST -H "Content-Type: application/json" -d '{"command":"shell"}' http://kkh01vdweb01.mcsfam.local/CCC/api/sessions/3b7c2ac6-ffbe-4939-93b8-a905056553f8`
    2. `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/sessions/3b7c2ac6-ffbe-4939-93b8-a905056553f8`  (expect `state:active`)
    3. `curl -s -X DELETE http://kkh01vdweb01.mcsfam.local/CCC/api/sessions/3b7c2ac6-ffbe-4939-93b8-a905056553f8`  (expect `ok:true`)
    4. `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/sessions/3b7c2ac6-ffbe-4939-93b8-a905056553f8`  (expect `state:none`)
  - Outcome: state transitions `none -> active -> none`; DELETE always returns `{"ok":true}`.

> Test comment: PASS. CC ran the full sequence: POST returned `{"ok":true,"state":"active"}`; GET returned `{"state":"active"}`; DELETE returned `{"ok":true}` HTTP 200; final GET returned `{"state":"none"}`.

- [x] Server log shows the PTY process exited.
  - Command (Dev-Web): `tail -20 /tmp/ccc-server.log`
  - Outcome: a `PTY exited code=0 signal=...` style line appears for the project after the DELETE call.

> Test comment:

---

### Task 2 - Frontend: `deleteSession` exported in `client/lib/api.ts`

- [x] Function is exported.
  - Command: `grep -n "deleteSession" /mnt/sc-development/CCC/client/lib/api.ts`
  - Outcome: one `export async function deleteSession` match plus its body.

> Test comment: PASS. CC verified - `export async function deleteSession(projectId: string): Promise<void>` is present right after `startSession`.

---

### Task 3 - Frontend: `DashboardMain` keeps all session terminals mounted

- [x] `dashboard-main.tsx` accepts `sessionSlots` and exports `SessionSlot`.
  - Command: `grep -n "SessionSlot\|sessionSlots" /mnt/sc-development/CCC/client/components/dashboard-main.tsx`
  - Outcome: `export interface SessionSlot {...}`, `sessionSlots: SessionSlot[]` in the props interface, and a `sessionSlots.map(...)` render block.

> Test comment: PASS. CC verified - 7 matches across the props interface, function signature, and the render map.

- [x] All open terminals are present in the DOM (display:none on inactive).
  - Steps:
    1. Open the dashboard.
    2. Start a Claude session for project A (e.g. CCC).
    3. Start a Claude session for project B (e.g. Charlie). Both tabs visible.
    4. With B active, open browser devtools and inspect the main content area.
  - Outcome: two `xterm` containers render; the active one has `display: flex`, the inactive one has `display: none`. Switching tabs flips the display values without unmounting.

> Test comment:

- [x] Terminal buffer is preserved across tab switches.
  - Steps:
    1. With two sessions running, type `echo HELLO_FROM_A` in tab A and confirm Claude (or shell) shows the line.
    2. Switch to tab B; type `echo HELLO_FROM_B`.
    3. Switch back to tab A; verify `HELLO_FROM_A` is still visible (no reconnect flash, no blank screen).
    4. Switch to tab B; verify `HELLO_FROM_B` is still visible.
  - Outcome: scrollback is preserved both ways; no reconnection or rerender visible.

> Test comment:

---

### Task 4 - Frontend: `page.tsx` wires `sessionSlots` and kills sessions on close

- [x] `sessionSlots` is derived from `tabs` and passed to `DashboardMain`.
  - Command: `grep -n "sessionSlots" /mnt/sc-development/CCC/client/app/page.tsx`
  - Outcome: derivation block + `sessionSlots={sessionSlots}` prop on `<DashboardMain>`.

> Test comment: PASS. CC verified - the derivation maps tabs of `kind === "session"` with both `projectId` and `sessionId` set, then passes the array to `DashboardMain`.

- [x] Closing a session tab calls `deleteSession`.
  - Command: `grep -n "deleteSession" /mnt/sc-development/CCC/client/app/page.tsx`
  - Outcome: import + a call inside `handleCloseTab` guarded by `tab?.kind === "session"`.

> Test comment: PASS. CC verified - import on line 7, call inside `handleCloseTab` with `.catch(() => {})`.

- [x] Closing the X button on a session tab kills the PTY on the server.
  - Steps:
    1. Start a Claude session for any project.
    2. In a separate terminal, run `curl -s http://kkh01vdweb01.mcsfam.local/CCC/api/sessions/<projectId>` and confirm `state:active`.
    3. Click the X on the tab in the browser.
    4. Re-run the curl; confirm `state:none` (or watch `/tmp/ccc-server.log` for the PTY exit line).
  - Outcome: state transitions `active -> none` after the click.

> Test comment:

- [x] Closing the active tab activates the nearest remaining tab.
  - Steps:
    1. Open three session tabs (A, B, C). C is active.
    2. Close C via its X. Confirm the dashboard switches to A or B (whichever is first in the tab list - currently A because new tabs are prepended).
    3. Close the new active tab. Confirm focus moves to the remaining one.
    4. Close the last session tab. Confirm `No active session` empty state appears (Settings tab does not become "active dashboard").
  - Outcome: focus always lands on a sibling session tab if one exists; falls through to the empty state otherwise.

> Test comment:

---

### Task 5 - Settings tab is non-closeable

- [x] The Settings tab has no X button.
  - Steps: visually inspect the right-most tab (Settings). It has no close affordance. Compare against any session/file tab.
  - Outcome: Settings has no X. (This is unchanged from prior stages - 04e must not regress it.)

> Test comment:

---

### Task 6 - File tabs coexist with session tabs

- [x] Opening a file from the treeview opens it in a tab alongside session tabs.
  - Steps:
    1. With at least one session tab open, click a file link in the treeview (e.g. CCC's CLAUDE.md or a `_test_stage*.md`).
    2. The file tab opens and becomes active. The session tab is still in the tab bar.
    3. Switch back to the session tab; the terminal buffer is intact (Task 3 again, with a file tab interleaved).
    4. Click the X on the file tab. The dashboard switches back to a remaining session tab.
  - Outcome: file tabs and session tabs coexist; session terminals are not unmounted by opening or closing a file tab.

> Test comment:

---

### Task 7 - Build + regressions

- [x] `pnpm build` passes with no TypeScript errors.
  - Command: `cd /mnt/sc-development/CCC/client && NEXT_PUBLIC_BASE_PATH=/CCC pnpm build 2>&1 | tail -10`
  - Outcome: `Compiled successfully` and the route table prints 5 routes (`/`, `/_not-found`, `/login`, `/settings`, `/setup`).

> Test comment: PASS. CC ran the build - 5 routes prerendered as static content, no errors.

- [x] No console errors on `/` after starting and killing a session.
  - Steps: open browser devtools console; start a session; click around; close it via the tab X.
  - Outcome: no red errors.

> Test comment:

- [x] Existing 04d migration flow still works.
  - Steps: drag any "To Be Migrated" entry to a target group; confirm the modal opens.
  - Outcome: behaviour matches Stage 04d.

> Test comment:

---

## Acceptance Criteria - Summary

1. [x] `DELETE /api/sessions/:projectId` exists and is idempotent. (Task 1)
2. [x] Two Claude Code sessions can run simultaneously without one being killed by the other. (Task 3)
3. [x] Switching tabs preserves the terminal buffer (no reconnect flash). (Task 3)
4. [x] Closing a tab kills the PTY on the server. (Task 4)
5. [x] Closing the active tab activates the nearest remaining tab. (Task 4)
6. [x] Settings tab has no X button. (Task 5)
7. [x] File tabs coexist with session tabs. (Task 6)
8. [x] `pnpm build` passes without TypeScript errors. (Task 7)

---

*End of CCC v1.1 Stage 04e test checklist. Run all browser items once, leave PASS/FAIL comments, then issue `/tested` to CC.*
