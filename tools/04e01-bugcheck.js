// Stage 04e01 — automated bug reproduction via Playwright.
// Loads CCC in a headless Brave/Chromium, clicks Start Session on two projects,
// screenshots the result so we can see what the tab bar renders.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'http://kkh01vdweb01.mcsfam.local/CCC/';
const OUT_DIR = '/tmp/04e01-shots';
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    const text = m.text();
    if (text.includes('[04e01]')) console.log('PAGE:', text);
  });

  console.log('=== loading CCC ===');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '01-initial.png'), fullPage: true });
  console.log('saved 01-initial.png');

  // Find Start Session buttons in the treeview
  const startBtns = await page.locator('button', { hasText: /Start Session/i }).all();
  console.log(`found ${startBtns.length} Start Session button(s)`);

  if (startBtns.length < 2) {
    // Try expanding nodes that are collapsed
    const chevrons = await page.locator('[role="button"], button').all();
    console.log('total clickable nodes:', chevrons.length);
  }

  // Click first Start Session
  if (startBtns.length >= 1) {
    console.log('=== clicking first Start Session ===');
    await startBtns[0].click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '02-after-first.png'), fullPage: true });
    console.log('saved 02-after-first.png');
  }

  // Re-query Start Session buttons (DOM may have changed)
  const startBtns2 = await page.locator('button', { hasText: /Start Session/i }).all();
  console.log(`after first click, ${startBtns2.length} Start Session button(s) remain`);

  if (startBtns2.length >= 2) {
    console.log('=== clicking second Start Session (DIFFERENT project) ===');
    await startBtns2[1].click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, '03-after-second.png'), fullPage: true });
    console.log('saved 03-after-second.png');

    // Inspect the tab bar specifically
    const tabBarHTML = await page.evaluate(() => {
      // Find the tab bar — first flex container after the header
      const all = document.querySelectorAll('div');
      for (const el of all) {
        if (el.className && typeof el.className === 'string' && el.className.includes('flex items-stretch')) {
          return el.outerHTML.slice(0, 4000);
        }
      }
      return '(tab bar not found)';
    });
    console.log('=== tab bar HTML ===');
    console.log(tabBarHTML);

    // Now click the inactive tab (CCC) to verify the terminal swap works
    console.log('=== clicking CCC tab to verify swap ===');
    await page.locator('div.flex.items-center.gap-2', { hasText: /^\s*CCC\s*$/ }).first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '04-after-tab-swap.png'), fullPage: true });
    console.log('saved 04-after-tab-swap.png');
  }

  await browser.close();
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
