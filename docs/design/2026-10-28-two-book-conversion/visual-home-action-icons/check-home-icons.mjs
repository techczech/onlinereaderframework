// Hidden ui-checker pass: home action icons (arrow_forward, search, download) beside their labels.
// Observation only, not a test verdict. Headless bundled shell only; reads the running parent preview.
// Writes home-1280.png and home-390.png next to this file and prints a JSON summary to stdout.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet/node_modules/playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const shell = path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const origin = 'http://100.85.55.122:8773';
const url = `${origin}/?book=academic-reading&review=1`;

// Runs inside the page. Returns plain facts only.
function probe() {
  const ICONS = ['arrow_forward', 'search', 'download'];
  const LABELS = ['Start Reading', 'Search', 'Download eBook'];
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const rect = r => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) });
  const parseRGB = c => {
    const m = (c || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bgOf = el => {
    for (let e = el; e; e = e.parentElement) {
      const c = parseRGB(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0.5) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const contrast = (fg, bg) => {
    if (!fg) return null;
    const a = lum(fg), b = lum(bg);
    return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2);
  };
  // Label text only: text nodes outside icon elements and not icon ligature names.
  const labelNodes = el => {
    const out = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = norm(n.textContent);
      if (!t || ICONS.includes(t)) continue;
      if (n.parentElement.closest('svg,[aria-hidden=true]')) continue;
      out.push(n);
    }
    return out;
  };
  const iconEls = el => [...el.querySelectorAll('*')].filter(d =>
    ICONS.includes(norm(d.textContent)) && d.children.length === 0 ||
    d.tagName.toLowerCase() === 'svg' ||
    d.tagName.toLowerCase() === 'img' ||
    /material|icon/i.test(String(d.className.baseVal ?? d.className))
  );

  const cands = [...document.querySelectorAll('a,button,[role=button]')]
    .map(el => ({ el, label: norm(labelNodes(el).map(n => n.textContent).join(' ')) }))
    .filter(c => LABELS.includes(c.label));

  const results = cands.map(({ el, label }) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const nodes = labelNodes(el);
    const lr = document.createRange();
    if (nodes.length) { lr.setStart(nodes[0], 0); lr.setEnd(nodes[nodes.length - 1], nodes[nodes.length - 1].length); }
    const labelRects = nodes.length ? [...lr.getClientRects()] : [];
    const labelBox = labelRects.length ? {
      x: Math.min(...labelRects.map(x => x.left)), y: Math.min(...labelRects.map(x => x.top)),
      right: Math.max(...labelRects.map(x => x.right)), bottom: Math.max(...labelRects.map(x => x.bottom)),
    } : null;
    const icons = iconEls(el).map(d => {
      const ic = getComputedStyle(d);
      const ir = d.getBoundingClientRect();
      const overlapsLabel = labelBox && ir.width > 0 && !(ir.right <= labelBox.x || ir.left >= labelBox.right || ir.bottom <= labelBox.y || ir.top >= labelBox.bottom);
      let fontOk = null;
      try { fontOk = document.fonts.check(`${ic.fontSize} ${ic.fontFamily}`); } catch { fontOk = 'n/a'; }
      return {
        tag: d.tagName.toLowerCase(),
        cls: String(d.className.baseVal ?? d.className).slice(0, 60),
        text: norm(d.textContent).slice(0, 30),
        ariaHidden: !!d.closest('[aria-hidden=true]'),
        fontFamily: ic.fontFamily.slice(0, 60),
        fontSize: ic.fontSize,
        fontCheck: fontOk,
        rect: rect(ir),
        insideButton: ir.left >= r.left - 1 && ir.right <= r.right + 1 && ir.top >= r.top - 1 && ir.bottom <= r.bottom + 1,
        overlapsLabel: !!overlapsLabel,
        // Negative gap means the icon box and the label box overlap horizontally.
        gapToLabelPx: labelBox ? Math.round(labelBox.x - ir.right) : null,
        rawGlyphWidthSuspect: ICONS.includes(norm(d.textContent)) && ir.width > 40,
      };
    });
    const fg = parseRGB(cs.color);
    return {
      label, tag: el.tagName.toLowerCase(), href: el.getAttribute('href'),
      ariaLabel: el.getAttribute('aria-label'),
      innerTextRaw: norm(el.innerText).slice(0, 80),
      rect: rect(r),
      scrollOverflowX: el.scrollWidth - el.clientWidth,
      labelLineRects: labelRects.length,
      labelBox: labelBox && rect({ left: labelBox.x, top: labelBox.y, right: labelBox.right, bottom: labelBox.bottom, width: labelBox.right - labelBox.x, height: labelBox.bottom - labelBox.y }),
      font: { size: cs.fontSize, lineHeight: cs.lineHeight, weight: cs.fontWeight, family: cs.fontFamily.slice(0, 60) },
      contrastApprox: contrast(fg, bgOf(el)),
      icons,
    };
  });

  const docW = document.documentElement.clientWidth;
  const offRight = [...document.querySelectorAll('body *')]
    .filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > innerWidth + 2; })
    .slice(0, 5).map(e => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 40)} right=${Math.round(e.getBoundingClientRect().right)}`);
  const rawGlyphNodes = [...document.querySelectorAll('body *')]
    .filter(e => e.children.length === 0 && ICONS.includes(norm(e.textContent)) && e.getBoundingClientRect().width > 0)
    .map(e => ({ text: norm(e.textContent), tag: e.tagName.toLowerCase(), width: Math.round(e.getBoundingClientRect().width), family: getComputedStyle(e).fontFamily.slice(0, 50) }));
  return {
    viewport: innerWidth,
    pageOverflowX: document.documentElement.scrollWidth - docW,
    offRight,
    fonts: [...document.fonts].map(f => `${f.family} ${f.weight} ${f.status}`).slice(0, 20),
    rawGlyphNodes,
    results,
  };
}

const browser = await chromium.launch({ headless: true, executablePath: shell });
const summary = { url, shell: 'chrome-headless-shell (bundled)', views: [] };

for (const [width, height] of [[1280, 900], [390, 844]]) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  const hosts = new Set();
  const failedStatus = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text().slice(0, 160)}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message.slice(0, 160)}`));
  page.on('request', r => { try { hosts.add(new URL(r.url()).host); } catch {} });
  page.on('response', r => { if (r.status() >= 400) failedStatus.push(`${r.status()} ${r.url().slice(0, 120)}`); });
  const view = { width, height, navigatedTo: url };
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => document.body.innerText.includes('Start Reading'), null, { timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    Object.assign(view, await page.evaluate(probe));
    await page.screenshot({ path: path.join(here, `home-${width}.png`), fullPage: true });
    view.screenshot = `home-${width}.png`;
  } catch (e) {
    view.error = e.message.slice(0, 300);
  }
  view.consoleErrors = errors.slice(0, 10);
  view.failedResponses = failedStatus.slice(0, 10);
  view.requestHosts = [...hosts];
  summary.views.push(view);
  await context.close();
}

await browser.close();
console.log(JSON.stringify(summary, null, 1));
