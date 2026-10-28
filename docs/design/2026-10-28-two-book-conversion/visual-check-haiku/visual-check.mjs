// Hidden visual screenshot pass of the built two-book preview (Haiku ui-checker lane). Not a test verdict.
// Serves apps/reader-demo/dist on an ephemeral 127.0.0.1 port; /embeds/* gets the contract's embed CSP.
// Bundled headless shell only. Writes screenshots and observations.json next to this file.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet/node_modules/playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const dist = path.join(root, 'apps/reader-demo/dist');
const shell = path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const CSP = "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'";
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.epub': 'application/epub+zip' };

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(dist, p);
  if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' };
  if (p.startsWith('/embeds/')) headers['Content-Security-Policy'] = CSP;
  res.writeHead(200, headers); fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true, executablePath: shell });
const obs = [];
const shots = [];
const frameOf = (page, id) => page.frames().find(f => f.url().endsWith(`/${id}/index.html`));
async function waitFrame(page, id) {
  for (let i = 0; i < 60; i++) {
    const f = frameOf(page, id);
    if (f) { try { if (await f.evaluate("document.readyState") === 'complete' && (await f.evaluate('document.body.innerText.length')) > 20) return f; } catch {} }
    await page.waitForTimeout(150);
  }
  return null;
}
async function view(context, name, url, width, height, scrollSel) {
  const errors = []; const outside = [];
  const page = await context.newPage();
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('about:')) outside.push(r.url()); });
  await page.goto(url);
  await page.waitForSelector('[data-publication-content], .publication-front, .publication-home', { timeout: 15000 });
  await page.waitForTimeout(1500);
  if (scrollSel) await page.evaluate(sel => { const el = document.querySelector(sel); el && el.scrollIntoView({ block: 'start' }); }, scrollSel);
  await page.waitForTimeout(700);
  const file = `${name}-${width}.png`;
  await page.screenshot({ path: path.join(here, file) });
  const facts = await page.evaluate(() => {
    const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const controls = [...document.querySelectorAll('button,a,[role=button],[role=radio],select')].filter(vis).map(e => (e.getAttribute('aria-label') || e.innerText || e.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 50)).filter(Boolean);
    const offRight = [...document.querySelectorAll('body *')].filter(vis).filter(e => e.getBoundingClientRect().right > innerWidth + 2 && !e.closest('figure[data-publication-embed]')).slice(0, 5).map(e => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)} right=${Math.round(e.getBoundingClientRect().right)}`);
    const fig = document.querySelector('figure[data-publication-embed]');
    const fr = fig && fig.querySelector('iframe');
    const p = document.querySelector('[data-publication-content] p');
    const heads = [...document.querySelectorAll('[data-publication-content] h1,[data-publication-content] h2,[data-publication-content] h3')].map(h => `h${h.tagName[1]}: ${h.innerText.trim().slice(0, 60)}`);
    return {
      title: document.title,
      h1: document.querySelector('h1') && document.querySelector('h1').innerText.trim(),
      headingsInChapter: heads.slice(0, 14),
      visibleControls: [...new Set(controls)].slice(0, 40),
      viewport: innerWidth,
      pageOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      elementsPastRightEdge: offRight,
      bodyFontPx: p && getComputedStyle(p).fontSize,
      bodyLineHeight: p && getComputedStyle(p).lineHeight,
      figure: fig && { width: Math.round(fig.getBoundingClientRect().width), left: Math.round(fig.getBoundingClientRect().left), iframeHeight: fr && Math.round(fr.getBoundingClientRect().height), iframeWidth: fr && Math.round(fr.getBoundingClientRect().width), caption: (fig.querySelector('figcaption') || {}).innerText },
    };
  });
  obs.push({ view: name, width, url, file, errors, outside: outside.slice(0, 5), ...facts });
  shots.push(file);
  return page;
}

for (const [width, height] of [[1280, 900], [390, 844]]) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const tag = `${width}`;
  let page = await view(context, 'academic-home', `${base}/?book=academic-reading`, tag, height);
  await page.close();
  page = await view(context, 'academic-cognition-section', `${base}/?book=academic-reading#/cognition-explorer`, tag, height, 'figure[data-publication-embed="cognition-explorer"]');
  await waitFrame(page, 'cognition-explorer');
  if (width === 1280) {
    const f = await waitFrame(page, 'cognition-explorer');
    await f.locator('#node-scanning').click({ timeout: 5000 }).catch(e => obs.push({ action: 'click cognition node failed', error: e.message.slice(0, 200) }));
    await page.waitForTimeout(600);
    const after = await f.evaluate("({panelHidden: document.getElementById('panel').hidden, title: document.getElementById('panel-title').textContent})");
    obs.push({ action: 'clicked cognition node (scanning) at 1280', after });
    await page.evaluate(() => document.querySelector('figure[data-publication-embed="cognition-explorer"]').scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(here, 'academic-cognition-after-node-click-1280.png') });
    shots.push('academic-cognition-after-node-click-1280.png');
  } else {
    const f = await waitFrame(page, 'cognition-explorer');
    await f.locator('#node-scanning').click({ timeout: 5000 }).catch(e => obs.push({ action: 'click cognition node failed (390)', error: e.message.slice(0, 200) }));
    await page.waitForTimeout(600);
    obs.push({ action: 'clicked cognition node (scanning) at 390', after: await f.evaluate("({panelHidden: document.getElementById('panel').hidden, title: document.getElementById('panel-title').textContent})") });
  }
  await page.close();

  page = await view(context, 'readability-home', `${base}/?book=readability-foundations`, tag, height);
  await page.close();
  page = await view(context, 'readability-formatting-section', `${base}/?book=readability-foundations#/formatting-examples`, tag, height, 'figure[data-publication-embed="cramped-text-reveal"]');
  await waitFrame(page, 'cramped-text-reveal');
  await waitFrame(page, 'font-spacing-adjuster');
  if (width === 1280) {
    const f = await waitFrame(page, 'cramped-text-reveal');
    await f.locator('[data-cramped-box]').click({ timeout: 5000 }).catch(e => obs.push({ action: 'click cramped box failed', error: e.message.slice(0, 200) }));
    await page.waitForTimeout(600);
    obs.push({ action: 'clicked cramped text reveal box at 1280', afterText: (await f.evaluate('document.body.innerText')).slice(0, 300) });
    await page.evaluate(() => document.querySelector('figure[data-publication-embed="cramped-text-reveal"]').scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(here, 'readability-cramped-after-click-1280.png') });
    shots.push('readability-cramped-after-click-1280.png');
  }
  await page.close();
  await context.close();
}

await browser.close();
server.close();
fs.writeFileSync(path.join(here, 'observations.json'), JSON.stringify(obs, null, 2));
console.log(JSON.stringify({ shots, count: shots.length }, null, 1));
