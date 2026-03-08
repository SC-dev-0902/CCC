/**
 * Generate USER_MANUAL.pdf from USER_MANUAL.md with embedded screenshots.
 *
 * Requires: Playwright (dev dependency)
 *
 * Usage:
 *   node tools/manual-pdf.js
 *
 * Output: docs/USER_MANUAL.pdf
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const MD_PATH = path.join(DOCS_DIR, 'USER_MANUAL.md');
const PDF_PATH = path.join(DOCS_DIR, 'USER_MANUAL.pdf');
const SCREENSHOTS_DIR = path.join(DOCS_DIR, 'screenshots');

async function main() {
  console.log('Reading USER_MANUAL.md...');
  const md = fs.readFileSync(MD_PATH, 'utf8');

  console.log('Rendering Markdown to HTML...');
  const htmlBody = marked(md);

  // Replace screenshot references with base64-embedded images
  const htmlWithImages = htmlBody.replace(
    /<img\s+src="screenshots\/([^"]+)"\s+alt="([^"]*)"\s*\/?>/g,
    (match, filename, alt) => {
      const imgPath = path.join(SCREENSHOTS_DIR, filename);
      if (fs.existsSync(imgPath)) {
        const data = fs.readFileSync(imgPath).toString('base64');
        const ext = path.extname(filename).slice(1);
        const mime = ext === 'png' ? 'image/png' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
        return `<img src="data:${mime};base64,${data}" alt="${alt}" />`;
      }
      console.warn(`  Warning: screenshot not found: ${filename}`);
      return match;
    }
  );

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
    }
    h1 { font-size: 28px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
    h2 { font-size: 22px; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-top: 40px; }
    h3 { font-size: 17px; margin-top: 28px; }
    img { max-width: 100%; border: 1px solid #ddd; border-radius: 6px; margin: 16px 0; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
    pre { background: #f4f4f4; padding: 14px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f8f8f8; font-weight: 600; }
    blockquote { border-left: 4px solid #ddd; margin: 16px 0; padding: 8px 16px; color: #555; }
    hr { border: none; border-top: 1px solid #eee; margin: 32px 0; }
    em { color: #555; }
  </style>
</head>
<body>
${htmlWithImages}
</body>
</html>`;

  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle' });

  console.log('Generating PDF...');
  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    printBackground: true
  });

  await browser.close();
  console.log(`PDF saved: ${PDF_PATH}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
