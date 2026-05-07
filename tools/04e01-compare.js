// Quick visual comparison: v1.0 (localhost:3000) vs v1.1 (Dev-Web).

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = '/tmp/04e01-compare';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  for (const [name, url] of [
    ['v1.0-localhost', 'http://localhost:3000/'],
    ['v1.1-devweb',   'http://kkh01vdweb01.mcsfam.local/CCC/'],
  ]) {
    console.log(`=== ${name} -> ${url} ===`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
      const title = await page.title();
      console.log(`title: "${title}"`);
    } catch (e) {
      console.log(`failed: ${e.message}`);
    }
  }

  await browser.close();
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
