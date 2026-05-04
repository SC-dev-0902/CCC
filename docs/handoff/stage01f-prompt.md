# Stage 01f — Design Preview Site
## CCC v1.1 | Sub-Stage of Stage 01

---

## Rules (mandatory, read before starting)

- No free-styling. Build exactly what is described here. If anything is ambiguous, stop and ask.
- No deploy step. Dev-Web has `/mnt/sc-development` mounted via NFS. CCC runs from that path. Edit files directly — changes are live.
- All tasks complete before presenting results. No "shall I continue?" between tasks.

---

## Context

Stage 01 (UI Design) is complete. All v1.1 design mockups are captured as screenshots and V0 source in `docs/v1.1/design/`.

Stage 01f goal: build a self-contained static design preview site so that Phet (and CC in Stage 02+) can view all v1.1 designs in one place in a browser - organised by sub-stage, with the live interactive 01a component and screenshots for 01b-01e.

This preview is a design reference only. It has no relation to the CCC application itself.

---

## Design assets inventory

All files are in `docs/v1.1/design/`:

| Sub-stage | What | Format |
|-----------|------|--------|
| 01a | Dark/light theme - main dashboard layout | V0 Next.js source in `stage01a-dark-light/` + screenshot `stage01-dark-light.png` |
| 01b | Tree view - project hierarchy | Screenshot `stage01-Treeview.png` |
| 01c | Top menu | Screenshot `stage01-Top menu.png` |
| 01d | Login screen + first run / migration | Screenshots `stage01- Log On.png`, `stage01 - Migration.png` |
| 01e | Settings + account + components | Screenshots `stage01 - Account.png`, `stage01 - Components - 01.png`, `stage01 - Components - 02.png`, `stage01 - Coponent 1.png`, `stage01 - Coponent 2_3png.png`, `stage01 - Coponent 4.png` |

---

## Tasks

### Task 1 - Build the 01a Next.js component as static HTML

The V0 source at `docs/v1.1/design/stage01a-dark-light/` is a Next.js app.

Steps:
1. Open `docs/v1.1/design/stage01a-dark-light/next.config.mjs`
2. Add `output: 'export'` to the nextConfig object so the file reads:
   ```js
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'export',
     typescript: {
       ignoreBuildErrors: true,
     },
     images: {
       unoptimized: true,
     },
   }
   export default nextConfig
   ```
3. In `docs/v1.1/design/stage01a-dark-light/`, run: `pnpm install`
4. Then run: `pnpm build`
5. Confirm that an `out/` directory is produced inside `stage01a-dark-light/`

If pnpm is not available, use npm. If the build fails, report the error and stop.

---

### Task 2 - Create the preview directory and index

Create directory: `docs/v1.1/design/preview/`

Create file: `docs/v1.1/design/preview/index.html`

This is a self-contained static HTML page (no external CDN dependencies, no frameworks). It must:

- Display a page title: "CCC v1.1 - Design Preview"
- Use SC colour tokens: background #1B2021 (sc-charcoal), text #F5F0EB (off-white), accent #2D6A4F (sc-green)
- Use Inter font via a Google Fonts `<link>` (acceptable for a dev-only preview tool)
- Use zero border-radius and no soft shadows (hard shadows or none only)
- Have a clear header with: title "CCC v1.1 Design Preview", the build date (hardcoded to today: 2026-05-04)

The page layout is a simple vertical list of sections, one per sub-stage:

**Section 01a - Main Layout (Dark / Light)**
- Brief label: "01a - Main Layout (Dark / Light)"
- A link/button: "Open live component" - links to `/design-preview/01a/index.html`
- Below: display the screenshot `stage01-dark-light.png` inline (using a relative path `../stage01-dark-light.png`)

**Section 01b - Tree View**
- Label: "01b - Tree View"
- Inline screenshot: `../stage01-Treeview.png`

**Section 01c - Top Menu**
- Label: "01c - Top Menu"
- Inline screenshot: `../stage01-Top menu.png`

**Section 01d - Login and First Run**
- Label: "01d - Login and First Run"
- Two inline screenshots: `../stage01- Log On.png` and `../stage01 - Migration.png`

**Section 01e - Settings and Components**
- Label: "01e - Settings and Components"
- Inline screenshots: `../stage01 - Account.png`, `../stage01 - Components - 01.png`, `../stage01 - Components - 02.png`, `../stage01 - Coponent 1.png`, `../stage01 - Coponent 2_3png.png`, `../stage01 - Coponent 4.png`

All screenshot images: `width: 100%; max-width: 1200px; display: block; margin: 0 auto;`

Section headings use the SC green accent. Each section has a 1px solid border in a muted grey (#3A4042) separating it from the next.

---

### Task 3 - Copy the built Next.js output into the preview folder

Create directory: `docs/v1.1/design/preview/01a/`

Copy the entire contents of `docs/v1.1/design/stage01a-dark-light/out/` into `docs/v1.1/design/preview/01a/`

Use a shell copy command. Do not symlink.

---

### Task 4 - Add a static route to CCC's Express server

Open `server.js` (project root).

Find the existing static middleware line (likely `app.use(express.static(path.join(__dirname, 'public')))`).

Add a new static route immediately after it:

```js
app.use('/design-preview', express.static(path.join(__dirname, 'docs/v1.1/design/preview')));
```

Do not modify any other lines in server.js. Do not change the existing static route.

---

### Task 5 - Generate test file

Create file: `docs/v1.1/CCC_test_stage01f.md`

Content:

```markdown
# CCC v1.1 - Test Checklist: Stage 01f (Design Preview Site)

## Pre-conditions
- [ ] CCC server has been restarted after server.js edit

## Test 1 - Preview index loads
- [ ] Open http://localhost:PORT/design-preview/index.html in browser
- [ ] Page title "CCC v1.1 Design Preview" is visible
- [ ] SC charcoal background (#1B2021) is applied
- [ ] All 5 sections are visible (01a through 01e)

## Test 2 - Screenshots display
- [ ] 01a screenshot (stage01-dark-light.png) renders
- [ ] 01b screenshot (stage01-Treeview.png) renders
- [ ] 01c screenshot (stage01-Top menu.png) renders
- [ ] 01d screenshots both render (Log On + Migration)
- [ ] 01e screenshots all render (Account + all 4 Components)

## Test 3 - Live 01a component
- [ ] "Open live component" link opens /design-preview/01a/index.html
- [ ] The interactive dark/light dashboard component loads and renders
- [ ] Theme toggle works (dark/light switch)

## Notes
(Phet fills this in during testing)
```

---

## Completion

When all tasks are done, report:
- Whether the Next.js build succeeded or had warnings
- The URL for the preview (http://localhost:PORT/design-preview/index.html - substitute actual PORT from .env)
- Confirm server.js was changed (one line added only)

**Restart required:** The server.js change requires a CCC server restart before the /design-preview route is active. Instruct Phet to restart CCC (npm start or equivalent) before testing.

Do not make any other changes to the codebase.
