// Tiny visual check of the user-selected cover integration on the parent's authorised preview.
// Not a test verdict and not a security or content review. Bundled headless shell only.
// Writes four screenshots next to this file and prints observations as JSON to stdout.
// The preview server is started and owned by the parent; this driver does not start or stop it.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet/node_modules/playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const base = 'http://100.85.55.122:8773';
const shell = path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const selected = JSON.parse(fs.readFileSync(path.join(here, '..', 'selected-covers-2026-10-28.json'), 'utf8'));
const DEMO = '.demo-book-chooser, .demo-frontpage-chooser';
const widths = [[1280, 900], [390, 844]];

const browser = await chromium.launch({ headless: true, executablePath: shell });
const obs = [];

// Fetch the image bytes the page points at and hash them, so the served file can be compared with the recorded sha256.
async function hashUrl(url) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, contentType: res.headers.get('content-type'), bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
}

for (const entry of selected.books) {
  for (const [width, height] of widths) {
    const errors = []; const outside = [];
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('about:')) outside.push(r.url()); });
    const url = `${base}/?book=${entry.book}&review=1`;
    await page.goto(url);
    await page.waitForSelector('[data-publication-content], .publication-front, .publication-home', { timeout: 15000 });
    await page.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const file = `${entry.book}-selected-cover-${width}.png`;
    await page.screenshot({ path: path.join(here, file) });

    const images = await page.evaluate(() => {
      const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      return [...document.images].map(img => {
        const r = img.getBoundingClientRect(); const s = getComputedStyle(img);
        return {
          src: img.getAttribute('src'),
          alt: (img.getAttribute('alt') || '').slice(0, 80),
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          renderedWidth: Math.round(r.width),
          renderedHeight: Math.round(r.height),
          visible: vis(img),
          objectFit: s.objectFit,
          inViewportX: r.left >= -1 && r.right <= window.innerWidth + 1,
        };
      });
    });
    const cover = images.filter(i => /cover|reader-covers|connected-ideas|clear-structure/i.test(i.src || ''));

    const facts = await page.evaluate(() => {
      const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const text = el => (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      const h1 = document.querySelector('h1');
      const author = [...document.querySelectorAll('[class*=author], [class*=byline]')].filter(vis).map(text)[0] || null;
      const tocHead = [...document.querySelectorAll('h1,h2,h3,h4')].find(h => /table of contents/i.test(h.innerText));
      const tocRoot = tocHead && (tocHead.closest('section') || tocHead.parentElement.parentElement);
      const tocLinks = tocRoot ? [...tocRoot.querySelectorAll('button, a')].filter(vis).filter(a => a.innerText.trim().length > 1) : [];
      // Which element sits on top of each cover image's centre point (overlap check).
      const coverOverlaps = [...document.images].filter(vis).filter(i => i.naturalWidth > 0).map(img => {
        const r = img.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { src: img.getAttribute('src'), centreHitIsImage: hit === img || img.contains(hit), centreHit: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).slice(0, 50)}` : null };
      });
      return {
        title: document.title,
        h1: h1 && text(h1),
        author,
        tocEntriesVisible: tocLinks.length,
        tocSample: tocLinks.map(text).slice(0, 4),
        coverOverlaps,
        pageScrollWidthOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    const demo = await page.evaluate(sel => [...document.querySelectorAll(sel)].map(el => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      return { cls: el.className, visible: r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' };
    }), DEMO);

    // Hash the served cover bytes for the first cover-like image, when present.
    let served = null;
    if (cover[0] && cover[0].src) {
      const absolute = new URL(cover[0].src, base).toString();
      served = { url: absolute, ...(await hashUrl(absolute)), recordedSha256: entry.sha256, matchesRecorded: null };
      served.matchesRecorded = served.sha256 === entry.sha256;
    }

    obs.push({
      kind: 'selected-cover', book: entry.book, chosen: entry.name, variant: entry.variant, width, url, finalUrl: page.url(), file,
      coverImages: cover, servedCover: served, allImageCount: images.length,
      demoSelectorsInDom: demo.length, demoSelectorsVisible: demo.filter(d => d.visible).length,
      errors, outside: outside.slice(0, 5), ...facts,
    });
    await context.close();
  }
}

await browser.close();
const out = JSON.stringify(obs, null, 2);
fs.writeFileSync(path.join(here, 'observations.json'), out + '\n');
console.log(out);
