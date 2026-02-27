/**
 * CCC Screenshot Automation — Playwright
 *
 * Captures every meaningful CCC UI state for the User Manual.
 * Requires: CCC running on localhost:PORT (default 3000)
 *
 * Usage:
 *   node tools/screenshot.js
 *
 * Output: docs/screenshots/*.png
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// --- Configuration ---

// Read PORT from .env if available, otherwise default to 3000
let PORT = 3000;
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  const match = envContent.match(/^PORT=(\d+)/m);
  if (match) PORT = parseInt(match[1], 10);
} catch (e) { /* use default */ }

const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
const VIEWPORT = { width: 1440, height: 900 };

// Ensure screenshot directory exists
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Helper: save screenshot with descriptive name
async function snap(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  ✓ ${name}.png`);
}

// Helper: wait for UI to settle after navigation or interaction
async function settle(page, ms = 500) {
  await page.waitForTimeout(ms);
}

// --- Main ---

(async () => {
  console.log(`\nCCC Screenshot Automation`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Output: ${SCREENSHOT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  try {
    // =============================================
    // 1. MAIN DASHBOARD — Default state after load
    // =============================================
    console.log('1. Main Dashboard');

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await settle(page, 1000);

    // Check if onboarding screen is showing (Claude CLI not detected)
    const onboarding = await page.$('.onboarding-overlay');
    if (onboarding) {
      console.log('  → Onboarding screen detected — capturing it');
      await snap(page, '01-onboarding');

      // Click retry to dismiss (or it may not dismiss — capture what we get)
      const retryBtn = await page.$('.onboarding-retry');
      if (retryBtn) {
        await retryBtn.click();
        await settle(page, 1000);
      }
    }

    // Main dashboard — sidebar + main panel
    await snap(page, '02-main-dashboard');

    // =============================================
    // 2. TREE VIEW — Expanded project with versions
    // =============================================
    console.log('2. Tree View');

    // Expand first project (CCC) by clicking the project row
    const projectRow = await page.$('.tree-project-row');
    if (projectRow) {
      await projectRow.click();
      await settle(page);

      // Click the Versions header to expand it
      const versionsHeader = await page.$('.tree-versions-header');
      if (versionsHeader) {
        await versionsHeader.click();
        await settle(page);
      }

      await snap(page, '03-tree-expanded');

      // Expand a version to show its files
      const versionRow = await page.$('.tree-version-row');
      if (versionRow) {
        await versionRow.click();
        await settle(page);
        await snap(page, '04-tree-version-files');
      }
    }

    // =============================================
    // 3. SESSION TAB — "No active session" prompt
    // =============================================
    console.log('3. Session Tab');

    // Click active version to open session tab
    const activeVersionRow = await page.$('.tree-version-row.active-version');
    if (activeVersionRow) {
      await activeVersionRow.click();
      await settle(page, 800);
    }

    // Capture the "no active session" prompt
    const noSession = await page.$('.no-session');
    if (noSession) {
      await snap(page, '05-no-active-session');
    }

    // =============================================
    // 4. READ PANEL — Markdown file rendered
    // =============================================
    console.log('4. Read Panel');

    // Click a file in the tree to open Read panel
    const fileLink = await page.$('.tree-file-link');
    if (fileLink) {
      await fileLink.click();
      await settle(page, 1000);
      await snap(page, '06-read-panel');
    }

    // =============================================
    // 5. STATUS DOTS — Close-up of sidebar
    // =============================================
    console.log('5. Status Dots');

    // The status dots are visible in the tree view — capture sidebar only
    const sidebar = await page.$('#sidebar');
    if (sidebar) {
      await sidebar.screenshot({ path: path.join(SCREENSHOT_DIR, '07-status-dots-sidebar.png') });
      console.log('  ✓ 07-status-dots-sidebar.png');
    }

    // =============================================
    // 6. NEW PROJECT WIZARD
    // =============================================
    console.log('6. New Project Wizard');

    // Click the + button to open the wizard
    const addBtn = await page.$('#addProjectBtn');
    if (addBtn) {
      await addBtn.click();
      await settle(page, 500);
      await snap(page, '08-new-project-wizard');

      // Fill in a sample name to show the form in use
      const nameInput = await page.$('#wizardName');
      if (nameInput) {
        await nameInput.fill('MyNewProject');
      }

      // Select a template card (Web App)
      const webAppCard = await page.$('.template-card[data-key="web-app"]');
      if (webAppCard) {
        await webAppCard.click();
        await settle(page, 300);
      }

      await snap(page, '09-wizard-filled');

      // Close the wizard
      const closeBtn = await page.$('.modal-close');
      if (closeBtn) {
        await closeBtn.click();
        await settle(page);
      }
    }

    // =============================================
    // 7. IMPORT MODAL — Phase 1 (scan)
    // =============================================
    console.log('7. Import Modal');

    // Re-open wizard, then click the import link
    const addBtn2 = await page.$('#addProjectBtn');
    if (addBtn2) {
      await addBtn2.click();
      await settle(page, 500);

      const importLink = await page.$('#wizardImportLink');
      if (importLink) {
        await importLink.click();
        await settle(page, 500);
        await snap(page, '10-import-phase1');

        // Close import modal
        const closeBtn = await page.$('.modal-close');
        if (closeBtn) {
          await closeBtn.click();
          await settle(page);
        }
      } else {
        // Close wizard if import link not found
        const closeBtn = await page.$('.modal-close');
        if (closeBtn) {
          await closeBtn.click();
          await settle(page);
        }
      }
    }

    // =============================================
    // 8. SETTINGS PANEL
    // =============================================
    console.log('8. Settings Panel');

    const settingsEntry = await page.$('#settingsEntry');
    if (settingsEntry) {
      await settingsEntry.click();
      await settle(page, 500);
      await snap(page, '11-settings-panel');
    }

    // =============================================
    // 9. TEST RUNNER — If test file exists
    // =============================================
    console.log('9. Test Runner');

    // Navigate back to project tree and look for a test file
    // Expand project → version → Testing section
    const projectRow2 = await page.$('.tree-project-row');
    if (projectRow2) {
      // Make sure project is expanded
      const isExpanded = await projectRow2.evaluate(el => {
        return el.nextElementSibling && el.nextElementSibling.classList.contains('tree-project-files');
      });

      if (!isExpanded) {
        await projectRow2.click();
        await settle(page);
      }

      // Find and expand Versions header if not already
      const versionsHeader = await page.$('.tree-versions-header');
      if (versionsHeader) {
        await versionsHeader.click();
        await settle(page);
      }

      // Find version row and expand it
      const verRow = await page.$('.tree-version-row.active-version');
      if (verRow) {
        const chevron = await verRow.$('.tree-version-chevron');
        if (chevron) {
          await chevron.click();
          await settle(page);
        }
      }

      // Find and click Testing header
      const testingHeader = await page.$('.tree-testing-header');
      if (testingHeader) {
        await testingHeader.click();
        await settle(page);

        // Click the test file link
        const testFileLink = await page.$('.tree-test-file');
        if (testFileLink) {
          await testFileLink.click();
          await settle(page, 1000);
          await snap(page, '12-test-runner');
        }
      }
    }

    // =============================================
    // 10. TAB BAR — Multiple tabs open
    // =============================================
    console.log('10. Tab Bar');

    // By now we should have multiple tabs open — capture the tab bar area
    const tabBar = await page.$('#tabBar');
    if (tabBar) {
      // Get the tab bar + a bit of content
      const mainPanel = await page.$('.main-panel');
      if (mainPanel) {
        await snap(page, '13-tab-bar-multiple');
      }
    }

    // =============================================
    // 11. THEME VARIANTS
    // =============================================
    console.log('11. Theme Variants');

    // Switch to light theme via settings
    await page.click('#settingsEntry');
    await settle(page, 500);

    const themeSelect = await page.$('#settingsTheme');
    if (themeSelect) {
      await themeSelect.selectOption('light');
      await settle(page, 300);

      // Save settings to apply theme
      const saveBtn = await page.$('#settingsSave');
      if (saveBtn) {
        await saveBtn.click();
        await settle(page, 500);
      }
    }

    // Navigate to dashboard view for light theme screenshot
    const projectRow3 = await page.$('.tree-project-row');
    if (projectRow3) {
      // Click the active version to get a session tab
      const activeVer = await page.$('.tree-version-row.active-version');
      if (activeVer) {
        await activeVer.click();
        await settle(page, 500);
      }
    }
    await snap(page, '14-light-theme');

    // Switch back to dark theme
    await page.click('#settingsEntry');
    await settle(page, 500);
    const themeSelect2 = await page.$('#settingsTheme');
    if (themeSelect2) {
      await themeSelect2.selectOption('dark');
      const saveBtn2 = await page.$('#settingsSave');
      if (saveBtn2) {
        await saveBtn2.click();
        await settle(page, 500);
      }
    }

    // =============================================
    // 12. DEGRADED STATE BANNER (simulated)
    // =============================================
    console.log('12. Degraded Banner');

    // Inject the degraded banner via JavaScript to capture its appearance
    await page.evaluate(() => {
      // Only inject if not already present
      if (!document.getElementById('degradedBanner')) {
        const banner = document.createElement('div');
        banner.id = 'degradedBanner';
        banner.className = 'degraded-banner';
        banner.innerHTML = `
          <span>Status detection is degraded. Claude Code output format may have changed.</span>
          <a href="https://github.com/Phet/CCC/issues" target="_blank" rel="noopener">View issues</a>
          <button class="degraded-dismiss" title="Dismiss warning">&times;</button>
        `;
        const mainPanel = document.querySelector('.main-panel');
        if (mainPanel) {
          mainPanel.insertBefore(banner, mainPanel.firstChild);
        }
      }
    });
    await settle(page, 300);
    await snap(page, '15-degraded-banner');

    // Remove the injected banner
    await page.evaluate(() => {
      const banner = document.getElementById('degradedBanner');
      if (banner) banner.remove();
    });

    // =============================================
    // 13. VERSION MANAGEMENT — New version modal
    // =============================================
    console.log('13. Version Management');

    // Look for the "New Version" action — it's available when Versions header is expanded
    // First make sure project is expanded with versions visible
    const newVersionBtn = await page.$('.new-version-btn');
    if (newVersionBtn) {
      await newVersionBtn.click();
      await settle(page, 500);
      await snap(page, '16-new-version-modal');

      // Close modal
      const closeBtn = await page.$('.modal-close');
      if (closeBtn) {
        await closeBtn.click();
        await settle(page);
      }
    }

    // =============================================
    // 14. DRAG & DROP VISUAL (static capture)
    // =============================================
    console.log('14. Drag & Drop');

    // Navigate to show both groups in the sidebar
    // Collapse all expanded items first for a clean tree view
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await settle(page, 1000);

    // Expand both groups to show drag & drop targets
    const groupHeaders = await page.$$('.tree-group-header');
    for (const header of groupHeaders) {
      // Click collapsed groups to expand them
      const parent = await header.evaluate(el => el.parentElement.classList.contains('collapsed'));
      if (parent) {
        await header.click();
        await settle(page, 200);
      }
    }
    await snap(page, '17-drag-drop-groups');

    // =============================================
    // DONE
    // =============================================
    console.log(`\n✓ All screenshots saved to ${SCREENSHOT_DIR}`);
    console.log('  Review them and reshoot any that need adjustment.\n');

  } catch (err) {
    console.error('\n✗ Screenshot automation failed:', err.message);
    console.error('  Make sure CCC is running on', BASE_URL);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
