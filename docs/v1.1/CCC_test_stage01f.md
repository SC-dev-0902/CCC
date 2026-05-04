# CCC v1.1 - Test Checklist: Stage 01f (Wired Design Preview)

## Pre-conditions
- [x] CCC v1.1 is running on Dev-Web (`nohup env PORT=3000 node server.js` from `/mnt/sc-development/CCC`)
- [x] Apache alias `/CCC/design-preview` is enabled on 172.16.10.6
- [x] `curl http://172.16.10.6/CCC/design-preview/` returns HTTP 200

## Base URL
http://172.16.10.6/CCC/design-preview/

---

## Test 1 - App shell loads (route /)
- [x] Page loads with no console errors
- [x] Header shows "Claude Command Center" on the left, three diodes (PatchPilot / Forgejo / GitHub) on the right, all green
- [x] Theme toggle button (sun/moon icon) is visible at the far right of the header
- [x] Tab bar below header shows three tabs: LeadSieve (active, yellow dot), CCC (reconnecting, dimmed), settings
- [x] Left sidebar renders the project tree
- [x] Main area renders the terminal placeholder with a fake `/continue` session

## Test 2 - Theme toggle
- [x] Click the theme toggle in the header
- [x] Whole app switches between dark and light - sidebar, header, main, banners, modals all follow
- [x] Reload the page - selected theme persists (stored in localStorage as `ccc-theme`)
- [x] Navigate to `/login`, `/setup`, `/settings` - theme stays the same across routes

## Test 3 - Diode hover tooltips
- [x] Hover any diode (PatchPilot / Forgejo / GitHub) in the header
- [x] Tooltip appears showing service name, connection state, last-checked time, and URL
- [x] Tooltip disappears on mouse leave

## Test 4 - Tab bar
- [x] Click the X on the LeadSieve tab - tab disappears from the bar
- [x] Click the "settings" tab - app navigates to `/settings`
- [x] On the settings page, the LeadSieve and CCC tabs are still in the bar; clicking either returns to `/`

## Test 5 - Treeview interactions
- [x] Type "lead" in the filter input above the tree
- [x] Only LeadSieve and its sub-projects remain visible; CCC project is filtered out
- [x] Press Escape - filter clears, full tree returns
- [x] Click the chevron on the LeadSieve parent - sub-projects collapse
- [x] Click again - sub-projects expand
- [x] Click the chevron on `leadsieve-service` - file rows (CLAUDE.md, SHP) expand
- [x] Hover the lock badge on `leadsieve-service` - tooltip shows "Locked by Phet"
- [x] Status legend at the bottom of the sidebar lists waiting / running / completed / error / unknown with matching dot colours

## Test 6 - Preview controls (in-context components)
- [x] In the dashed "Preview controls" strip below the terminal, click "Open project edit modal"
- [x] Modal appears centered with overlay; shows Edit Project form with Path validation error and side path browser
- [x] Type a different path - error clears
- [x] Click outside the modal or the X - modal closes
- [x] Click "Open register dialog" - register-project dialog appears with dummy "analytics-service" content; close it
- [x] Click "Show watchdog banner" - red-bordered banner "Session unresponsive - no output for 90s" appears above the terminal with a green Restart Session button
- [x] Click Restart Session in the banner - banner disappears
- [x] Click "Show reconnecting banner" - rotating-spinner banner "Reconnecting... (attempt 2 of 5)" appears above the terminal; toggle to hide

## Test 7 - Login screen (route /login)
- [x] Click "Go to /login" in the preview controls (or open the URL directly)
- [x] Standalone login screen renders, no app shell, no sidebar
- [x] Header shows "Claude Command Center" + theme toggle
- [x] Centered Sign-in card has Username and Password fields and a green Sign in button
- [x] Type into the fields - characters appear (text in username, dots in password)
- [x] Click Sign in - dummy "Invalid credentials" error appears below the password field
- [x] Footer shows links to "/setup" and "/" - clicking each navigates correctly

## Test 8 - First-run setup (route /setup)
- [x] Open `/setup` (link from /login footer or preview-controls "Go to /setup")
- [x] Standalone screen with "Create admin account" card - Username, Password, Confirm password
- [x] Type into Password and Confirm with mismatched values - "Passwords do not match" error appears under Confirm and submit button is disabled
- [x] Make Confirm match Password - error clears, submit button activates (green)

## Test 9 - Settings page (route /settings)
- [x] Click the settings tab in the dashboard tab bar
- [x] App shell remains, main area replaced by Settings panel with three left-rail sections: Integrations, User Management, Migration Tool
- [x] Click each section - main pane content swaps accordingly
- [x] In User Management: three users (phet ADMIN, anna DEV, marco DEV) listed; "Add account" form on the right
- [x] In Migration Tool: 4-step stepper (Scan / Review / Diff / Confirm) - click any step circle to jump; Back / Review buttons cycle through steps
- [x] In Integrations: PatchPilot, Forgejo, GitHub each shown with green dot, URL, last-checked timestamp, Configure button

## Test 10 - Cross-route navigation
- [x] From dashboard, navigate to /settings (via tab) - app shell persists
- [x] From /settings click LeadSieve or CCC tab - returns to dashboard
- [x] From dashboard, navigate to /login - app shell disappears (standalone screen)
- [x] From /login footer, click "Back to dashboard" - returns to /
- [x] All routes have a working theme toggle in the header

## Notes
(Phet fills this in during testing)
