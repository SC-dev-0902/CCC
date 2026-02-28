/**
 * Converts USER_MANUAL.md to PDF using marked + Playwright.
 *
 * Usage:
 *   node tools/manual-to-pdf.js
 *
 * Output: docs/USER_MANUAL.pdf
 */

const { chromium } = require('playwright');
const { marked } = require('marked');
const path = require('path');
const fs = require('fs');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const MD_PATH = path.join(DOCS_DIR, 'USER_MANUAL.md');
const PDF_PATH = path.join(DOCS_DIR, 'USER_MANUAL.pdf');
const TEMP_HTML = path.join(DOCS_DIR, '_manual_preview.html');

(async () => {
  console.log('Converting USER_MANUAL.md → PDF\n');

  // 1. Read and render Markdown
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const body = marked.parse(md, { gfm: true, breaks: false });

  // 2. Wrap in styled HTML (temp file lives in docs/ so image paths resolve)
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 { font-size: 28px; border-bottom: 2px solid #ddd; padding-bottom: 8px; }
    h2 { font-size: 22px; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-top: 32px; }
    h3 { font-size: 17px; margin-top: 24px; }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 13px;
    }
    pre {
      background: #f4f4f4;
      padding: 12px 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
    pre code { background: none; padding: 0; }
    img {
      max-width: 100%;
      border: 1px solid #ddd;
      border-radius: 6px;
      margin: 12px 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    th { background: #f4f4f4; font-weight: 600; }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 12px 0;
      padding: 8px 16px;
      color: #555;
    }
    hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
  </style>
</head>
<body>
${body}
</body>
</html>`;

  fs.writeFileSync(TEMP_HTML, html);
  console.log('  ✓ HTML rendered');

  // 3. Open in Playwright and print to PDF
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${TEMP_HTML}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    printBackground: true,
  });

  await browser.close();
  console.log('  ✓ PDF generated');

  // 4. Clean up temp HTML
  fs.unlinkSync(TEMP_HTML);

  console.log(`\n→ ${PDF_PATH}\n`);
})();
