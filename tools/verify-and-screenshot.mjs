// Loads the app in headless Chrome, enters a sample run, checks results and saves screenshots.
// Usage: node tools/verify-and-screenshot.mjs <url> [outDir]
// Needs `npm i playwright-core` somewhere resolvable and a Chrome/Chromium at CHROME_PATH (default /usr/bin/google-chrome).
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'docs/screenshots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
const page = await ctx.newPage();
const external = []; const problems = [];
page.on('request', (r) => { const u = new URL(r.url()); if (u.origin !== new URL(url).origin && !r.url().startsWith('data:')) external.push(r.url()); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });

await page.goto(url, { waitUntil: 'networkidle' });
assert.equal(await page.title(), 'Saturday 5K Pace Planner');
await page.screenshot({ path: `${out}/01-input-form.png` });

await page.fill('#pb', '24:30'); await page.fill('#target', '23:45'); await page.fill('#age', '42');
await page.selectOption('#category', 'M'); await page.selectOption('#profile', 'rolling'); await page.selectOption('#strategy', 'negative');
await page.click('button.primary[type=submit]');
await page.waitForSelector('#results:not([hidden])');
const rows = await page.$$eval('#splits tbody tr', (trs) => trs.map((t) => [...t.children].map((c) => c.textContent)));
assert.equal(rows.length, 5);
assert.equal(rows[4][3], '23:45', 'cumulative total of km 5 must equal target');
const secs = rows.map((r) => { const [m, s] = r[1].split(':').map(Number); return m * 60 + s; });
assert.equal(secs.reduce((a, b) => a + b, 0), 1425, 'splits sum');
const agT = await page.textContent('#ag-target'); const agP = await page.textContent('#ag-pb');
console.log('Age grade target / PB:', agT, agP); console.log('Splits:', rows.map((r) => r.slice(0, 4).join(' ')).join(' | '));
await page.locator('#results').screenshot({ path: `${out}/02-results-splits.png` });

// share card
const cardPng = await page.locator('#card').screenshot({ path: `${out}/03-share-card.png` });
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#download')]);
await dl.saveAs(`${out}/downloaded-card.png`);
const head = readFileSync(`${out}/downloaded-card.png`).subarray(0, 8);
assert.equal(head.toString('hex'), '89504e470d0a1a0a', 'download is a PNG');
console.log('Downloaded card filename:', dl.suggestedFilename(), 'bytes:', readFileSync(`${out}/downloaded-card.png`).length);
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(url).origin }).catch(() => {});
await page.click('#copy');
await page.waitForFunction(() => document.getElementById('copy-status').textContent.length > 0); const status = await page.textContent('#copy-status'); console.log('Copy status:', status);
const text = await page.inputValue('#share-text');
assert.match(text, /Saturday 5K Pace Planner/); assert.match(text, /Age grade/);
assert.doesNotMatch(await page.content(), /parkrun/i);

// custom profile + validation
await page.selectOption('#profile', 'custom'); await page.fill('#custom', '5, -3, 10, 0, -8'); await page.selectOption('#strategy', 'even');
await page.click('button.primary[type=submit]');
const rows2 = await page.$$eval('#splits tbody tr', (trs) => trs.map((t) => t.children[1].textContent));
console.log('Custom/even splits:', rows2.join(' '));
await page.fill('#target', 'abc'); await page.click('button.primary[type=submit]');
assert.ok(await page.isVisible('#errors'), 'validation error shows');

assert.deepEqual(external, [], 'no external requests: ' + external.join(','));
assert.deepEqual(problems, [], problems.join('; '));
console.log('External requests:', external.length, '| console/page errors:', problems.length);
writeFileSync(`${out}/.verified`, new Date().toISOString());
await browser.close();
console.log('VERIFY OK', url);
