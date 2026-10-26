// Checks the planner theme: WCAG AA contrast of the main colour pairs, in light and dark,
// and that no rendered pixel is green-ish. Usage: node tools/check-theme.mjs <url> <outDir>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const url = process.argv[2] ?? 'http://localhost:5173/', out = process.argv[3] ?? 'docs/screenshots';
const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let fail = 0;
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await ctx.newPage(); await page.goto(url, { waitUntil: 'networkidle' });
  await page.fill('#pb', '24:30'); await page.fill('#target', '23:45'); await page.fill('#age', '42');
  await page.click('button.primary[type=submit]'); await page.waitForSelector('#results:not([hidden])');
  // contrast of text colour against its effective background for every visible text element
  const pairs = await page.evaluate(() => {
    const hex = (c) => '#' + c.match(/\d+(\.\d+)?/g).slice(0, 3).map((n) => Math.round(+n).toString(16).padStart(2, '0')).join('');
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const st = getComputedStyle(e); if (st.backgroundImage.includes('gradient')) return 'rgb(18,18,16)'; const c = st.backgroundColor; if (!/rgba?\(.*, 0\)$/.test(c) && c !== 'transparent') return c; } return 'rgb(255,255,255)'; };
    const seen = new Map();
    for (const el of document.querySelectorAll('body *, input, select, textarea')) {
      const isField = ['INPUT','SELECT','TEXTAREA'].includes(el.tagName); if (!isField && (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden') continue;
      const fg = hex(cs.color), bg = hex(bgOf(el)); const k = fg + bg; if (!seen.has(k)) seen.set(k, el.tagName.toLowerCase() + '.' + el.className);
    }
    return [...seen].map(([k, who]) => [k.slice(0, 7), k.slice(7), who]);
  });
  const worst = Math.min(...pairs.map(([f, b]) => ratio(f, b)));
  for (const [f, b, who] of pairs) { const r = ratio(f, b); if (r < 4.5) { fail++; console.log('LOW', scheme, f, 'on', b, r.toFixed(2), who); } }
  console.log(scheme, 'text colour pairs:', pairs.length, 'worst contrast', worst.toFixed(2));
  mkdirSync(`${out}/${scheme}`, { recursive: true });
  await page.screenshot({ path: `${out}/${scheme}/results-top.png` });
  await page.screenshot({ path: `${out}/${scheme}/full.png`, fullPage: true });
  // green pixel check: hue 80-170, saturation > 0.25, value > 0.15
  const g = await page.evaluate(async () => { const c = document.getElementById('card'); return c.toDataURL('image/png'); });
  const png = await page.evaluate(async (d) => { const img = new Image(); img.src = d; await img.decode(); const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const x = cv.getContext('2d'); x.drawImage(img, 0, 0); const px = x.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < px.length; i += 16) { const r = px[i] / 255, gg = px[i + 1] / 255, b = px[i + 2] / 255; const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d2 = mx - mn; if (!d2 || mx < 0.15) continue; let h; if (mx === r) h = ((gg - b) / d2 + 6) % 6; else if (mx === gg) h = (b - r) / d2 + 2; else h = (r - gg) / d2 + 4; h *= 60; if (h > 80 && h < 170 && d2 / mx > 0.25) n++; } return n; }, g);
  console.log(scheme, 'green-ish pixels in share card:', png); if (png) fail++;
  const shot = await page.screenshot({ fullPage: true }); const gp = await page.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const x = cv.getContext('2d'); x.drawImage(img, 0, 0); const px = x.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < px.length; i += 16) { const r = px[i] / 255, gg = px[i + 1] / 255, b2 = px[i + 2] / 255; const mx = Math.max(r, gg, b2), mn = Math.min(r, gg, b2), d2 = mx - mn; if (!d2 || mx < 0.15) continue; let h; if (mx === r) h = ((gg - b2) / d2 + 6) % 6; else if (mx === gg) h = (b2 - r) / d2 + 2; else h = (r - gg) / d2 + 4; h *= 60; if (h > 80 && h < 170 && d2 / mx > 0.25) n++; } return n; }, shot.toString('base64'));
  console.log(scheme, 'green-ish pixels in full page:', gp); if (gp) fail++;
  await ctx.close();
}
await browser.close(); console.log(fail ? 'THEME CHECK FAILED' : 'THEME CHECK OK'); process.exit(fail ? 1 : 0);
