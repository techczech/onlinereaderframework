// Short visual check of the review-mode home pages (review=1) on the parent's authorised preview.
// Not a test verdict and not a security or content review. Bundled headless shell only.
// Writes the four home screenshots next to this file; prints observations as JSON to stdout.
// The preview server is started and owned by the parent; this driver does not start or stop it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet/node_modules/playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const base = 'http://100.85.55.122:8773';
const shell = path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const books = ['academic-reading', 'readability-foundations'];
const widths = [[1280, 900], [390, 844]];
const DEMO = '.demo-book-chooser, .demo-frontpage-chooser';

const browser = await chromium.launch({ headless: true, executablePath: shell });
const obs = [];

async function openPage(context, url, errors, outside) {
  const page = await context.newPage();
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('about:')) outside.push(r.url()); });
  await page.goto(url);
  await page.waitForSelector('[data-publication-content], .publication-front, .publication-home', { timeout: 15000 });
  await page.waitForTimeout(1500);
  return page;
}

// Demo selectors: count in DOM and visible.
const demoState = page => page.evaluate(sel => [...document.querySelectorAll(sel)].map(el => {
  const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
  return { cls: el.className, visible: r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' };
}), DEMO);

for (const book of books) {
  for (const [width, height] of widths) {
    const errors = []; const outside = [];
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const url = `${base}/?book=${book}&review=1`;
    const page = await openPage(context, url, errors, outside);
    const file = `${book}-review-home-${width}.png`;
    await page.screenshot({ path: path.join(here, file) });

    const facts = await page.evaluate(() => {
      const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const text = el => (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      const h1 = document.querySelector('h1');
      const author = [...document.querySelectorAll('[class*=author], [class*=byline]')].filter(vis).map(text)[0] || null;
      const toolbar = [...document.querySelectorAll('[role=toolbar], header, [class*=toolbar]')].filter(vis);
      const toolbarButtons = [...new Set(toolbar.flatMap(t => [...t.querySelectorAll('button,a,[role=button]')]).filter(vis).map(e => (e.getAttribute('aria-label') || e.innerText || e.title || '').trim().replace(/\s+/g, ' ').slice(0, 40)).filter(Boolean))];
      // Contents: chapter entries under the "Table of contents" heading, tagged so the node side can click one.
      // Coverage: whether the topmost element at each entry's left-hand point is that entry.
      const tocHead = [...document.querySelectorAll('h1,h2,h3,h4')].find(h => /table of contents/i.test(h.innerText));
      const tocRoot = tocHead && (tocHead.closest('section') || tocHead.parentElement.parentElement);
      const links = tocRoot ? [...tocRoot.querySelectorAll('button, a')].filter(vis).filter(a => a.innerText.trim().length > 1) : [];
      links.forEach((a, i) => a.setAttribute('data-visual-toc', String(i)));
      const at = a => { const r = a.getBoundingClientRect(); return document.elementFromPoint(r.left + Math.min(r.width / 2, 20), r.top + r.height / 2); };
      const covered = links.filter(a => { const hit = at(a); return hit && !(a === hit || a.contains(hit)); });
      const coverers = [...new Set(covered.map(a => { const hit = at(a); return hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).slice(0, 60)}` : null; }).filter(Boolean))];
      return {
        title: document.title,
        h1: h1 && text(h1),
        author,
        toolbarVisible: toolbar.length > 0,
        toolbarButtons: toolbarButtons.slice(0, 20),
        contentsLinksChecked: links.length,
        contentsLinksSample: links.map(text).slice(0, 8),
        contentsLinksCovered: covered.length,
        coverers: coverers.slice(0, 6),
        viewportScrollWidthOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    const demo = await demoState(page);
    obs.push({ kind: 'home', book, width, url, finalUrl: page.url(), file, demoSelectorsInDom: demo.length, demoSelectorsVisible: demo.filter(d => d.visible).length, demo, errors, outside: outside.slice(0, 5), ...facts });

    // One chapter link per book, at 1280 only: review=1 should persist and demo selectors stay absent.
    if (width === 1280) {
      const link = page.locator('[data-visual-toc="0"]');
      const linkInfo = { text: (await link.innerText({ timeout: 5000 }).catch(() => '')).trim().slice(0, 80), tag: await link.evaluate(e => e.tagName.toLowerCase()).catch(() => null) };
      await link.click({ timeout: 5000 }).catch(e => { linkInfo.clickError = e.message.slice(0, 200); });
      await page.waitForTimeout(1500);
      const after = await demoState(page);
      obs.push({
        kind: 'chapter-link', book, linkInfo, urlAfterClick: page.url(), reviewParamKept: new URL(page.url()).searchParams.get('review') === '1',
        demoSelectorsInDomAfter: after.length, demoSelectorsVisibleAfter: after.filter(d => d.visible).length,
        h1After: await page.evaluate(() => { const h = document.querySelector('h1'); return h ? h.innerText.trim().slice(0, 80) : null; }),
        errorsSoFar: [...errors],
      });
    }
    await context.close();
  }
}

// Academic cognition map at phone width, review=1: scroll behaviour and text/full-view alternatives (known limitation; DOM read only).
{
  const errors = []; const outside = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await openPage(context, `${base}/?book=academic-reading&review=1#/cognition-explorer`, errors, outside);
  await page.evaluate(() => document.querySelector('figure[data-publication-embed="cognition-explorer"]')?.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(1000);
  let frameFacts = null;
  const f = page.frames().find(fr => fr.url().endsWith('/cognition-explorer/index.html'));
  if (f) {
    frameFacts = await f.evaluate(() => {
      const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const scroller = [...document.querySelectorAll('*')].filter(e => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== 'visible').map(e => ({ tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 40), scrollWidth: e.scrollWidth, clientWidth: e.clientWidth }))[0] || null;
      const links = [...document.querySelectorAll('a,button')].filter(vis).map(e => (e.innerText || e.getAttribute('aria-label') || '').trim()).filter(Boolean);
      return { scroller, textAndFullViewControls: links.filter(t => /full view|text version|skip|reset/i.test(t)).slice(0, 6) };
    });
  }
  const outer = await page.evaluate(() => {
    const fig = document.querySelector('figure[data-publication-embed="cognition-explorer"]');
    const fr = fig && fig.querySelector('iframe');
    const links = [...document.querySelectorAll('a,button')].map(e => (e.innerText || e.getAttribute('aria-label') || '').trim()).filter(t => /full view|text version/i.test(t));
    return { frameWidth: fr && Math.round(fr.getBoundingClientRect().width), outerControls: [...new Set(links)].slice(0, 6) };
  });
  obs.push({ kind: 'cognition-phone-dom', url: page.url(), frameFound: !!f, ...outer, frameFacts, errors, outside: outside.slice(0, 5), demo: await demoState(page) });
  await context.close();
}

await browser.close();
console.log(JSON.stringify(obs, null, 2));
