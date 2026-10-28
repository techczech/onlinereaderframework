// Hidden headless smoke check of the two-book publication preview.
// Uses the bundled Playwright Chromium (headless shell) from dlnet; never installed Chrome, never headed.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire('/Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet/package.json');
const { chromium } = require('playwright-core');

const BASE = 'https://03509e32.dominiklukes-net.pages.dev';
const EXPECTED = {
  academic: 'd56c130ac7f8c84f707e8d48aee205981f80efbc7c45866637f5b0b22b524539',
  readability: 'adbedd7db78beaf5a54e9d165b72d302158cc42ada2261745e2bd126c8e074ef',
};
const results = { startedAt: new Date().toISOString(), base: BASE, steps: {}, console: [], failedRequests: [] };
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: false });

  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') results.console.push({ type: m.type(), text: m.text().slice(0, 300), url: page.url() }); });
  page.on('pageerror', (e) => results.console.push({ type: 'pageerror', text: String(e.message).slice(0, 300), url: page.url() }));
  page.on('requestfailed', (r) => results.failedRequests.push({ url: r.url().slice(0, 200), reason: r.failure()?.errorText, type: r.resourceType() }));
  page.on('response', (r) => { if (r.status() >= 400) results.failedRequests.push({ url: r.url().slice(0, 200), status: r.status(), type: r.request().resourceType() }); });

  const settle = async (p) => { await p.waitForLoadState('load').catch(() => {}); await p.waitForTimeout(1500); };
  const coverHash = async (p, which) => {
    const src = await p.evaluate(() => [...document.images].map((i) => i.currentSrc || i.src).filter((s) => /cover/i.test(s)));
    const out = [];
    for (const s of src.slice(0, 3)) {
      const r = await page.request.get(s);
      out.push({ src: s.replace(BASE, ''), status: r.status(), sha256: sha(await r.body()), matchesExpected: sha(await r.body()) === EXPECTED[which] });
    }
    return out;
  };

  // Step 1: book landing pages at two viewports (4 screenshots)
  results.steps.step1 = {};
  for (const [vw, vh, label] of [[1280, 900, 'desktop'], [390, 844, 'mobile']]) {
    await page.setViewportSize({ width: vw, height: vh });
    for (const [slug, which] of [['academic-reading', 'academic'], ['readability', 'readability']]) {
      await page.goto(`${BASE}/books/${slug}/`, { waitUntil: 'load' });
      await settle(page);
      const info = await page.evaluate(({ vw }) => {
        const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const texts = [...document.querySelectorAll('a,button,[role=button],select,option')].filter(vis).map((el) => ({ tag: el.tagName, text: (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 60), aria: el.getAttribute('aria-label'), href: el.getAttribute('href') }));
        const interactive = [...document.querySelectorAll('a,button,[role=button]')].filter(vis);
        const rects = interactive.map((el) => [el, el.getBoundingClientRect()]);
        let overlaps = 0;
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i][1], b = rects[j][1];
          if (rects[i][0].contains(rects[j][0]) || rects[j][0].contains(rects[i][0])) continue;
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps++;
        }
        const offRight = [...document.querySelectorAll('body *')].filter((el) => vis(el) && el.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 5).map((el) => (el.className || el.tagName).toString().slice(0, 60));
        const h1 = document.querySelector('h1')?.innerText?.trim();
        const title = document.title;
        const demo = texts.filter((t) => /demo/i.test(t.text + (t.aria || '')));
        const cover = [...document.images].filter((i) => /cover/i.test(i.currentSrc || i.src)).map((i) => ({ alt: i.alt, w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height), visible: vis(i) }));
        const iconLabels = texts.filter((t) => /start|search|download/i.test(t.text + (t.aria || '')));
        return { title, h1, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, overlaps, offRight, demoControls: demo, iconLabels, cover };
      }, { vw });
      info.coverHashes = await coverHash(page, which);
      const shot = join(here, `step1-${label}-${slug}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      results.steps.step1[`${label}-${slug}`] = { ...info, screenshot: shot.split('/').pop() };
    }
  }

  // Step 2: desktop cognition explorer, click Scanning node inside the iframe
  await page.setViewportSize({ width: 1280, height: 900 });
  const consoleMark2 = results.console.length;
  await page.goto(`${BASE}/books/academic-reading/cognition-explorer/`, { waitUntil: 'load' });
  await settle(page);
  const frameEl = page.locator('iframe').first();
  const frameInfo = await frameEl.evaluate((f) => ({ src: f.getAttribute('src'), loading: f.getAttribute('loading'), title: f.getAttribute('title') })).catch((e) => ({ error: String(e.message).slice(0, 200) }));
  await frameEl.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const handle = await frameEl.elementHandle();
  const frame = await handle.contentFrame();
  const before = await frame.evaluate(() => document.body.innerText.length);
  let clicked = false, clickErr = null;
  try {
    const node = frame.getByText('Scanning', { exact: false }).first();
    await node.scrollIntoViewIfNeeded({ timeout: 5000 });
    await node.click({ timeout: 5000 });
    clicked = true;
  } catch (e) { clickErr = String(e.message).slice(0, 300); }
  await page.waitForTimeout(1500);
  const after = await frame.evaluate(() => ({ len: document.body.innerText.length, snippet: document.body.innerText.slice(0, 400), dialogs: [...document.querySelectorAll('[role=dialog],[aria-expanded=true],aside,.panel,[class*=panel],[class*=detail]')].map((el) => (el.className || el.tagName).toString().slice(0, 60)).slice(0, 10) })).catch((e) => ({ error: String(e.message).slice(0, 200) }));
  results.steps.step2 = { frameInfo, frameUrl: frame.url().replace(BASE, ''), pageUrl: page.url().replace(BASE, ''), clicked, clickErr, textLenBefore: before, after, consoleNew: results.console.slice(consoleMark2) };

  // Step 3: desktop formatting examples, activate cramped-text demo inside iframe (2 screenshots)
  await page.goto(`${BASE}/books/readability/formatting-examples/`, { waitUntil: 'load' });
  await settle(page);
  const f3 = page.locator('iframe').first();
  await f3.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  const fr3 = await (await f3.elementHandle()).contentFrame();
  await page.screenshot({ path: join(here, 'step3-desktop-formatting-before.png') });
  const ctrlState = () => fr3.evaluate(() => {
    const el = [...document.querySelectorAll('div.cursor-pointer')].find((e) => /An employer can choose/.test(e.textContent));
    return el ? { tag: el.tagName, text: el.textContent.trim().slice(0, 80), pressed: el.getAttribute('aria-pressed'), cls: el.className.toString().slice(0, 140) } : null;
  });
  const cramBefore = await ctrlState();
  const cramText = await fr3.evaluate(() => document.body.innerText.slice(0, 300));
  let cramClicked = false, cramErr = null;
  try {
    await fr3.locator('div.cursor-pointer', { hasText: 'An employer can choose' }).first().click({ timeout: 5000 });
    cramClicked = true;
  } catch (e) { cramErr = String(e.message).slice(0, 300); }
  await page.waitForTimeout(1200);
  const cramAfter = await ctrlState();
  const cramTextAfter = await fr3.evaluate(() => document.body.innerText.slice(0, 300));
  await page.screenshot({ path: join(here, 'step3-desktop-formatting-after.png') });
  results.steps.step3 = { cramBefore, cramAfter, cramClicked, cramErr, bodyTextChanged: cramText !== cramTextAfter, shots: ['step3-desktop-formatting-before.png', 'step3-desktop-formatting-after.png'] };

  // Step 4: mobile 390 inspection of the same chapter views (no screenshots beyond the four)
  await page.setViewportSize({ width: 390, height: 844 });
  results.steps.step4 = {};
  for (const path of ['/books/academic-reading/cognition-explorer/', '/books/readability/formatting-examples/']) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
    await settle(page);
    const f = page.locator('iframe').first();
    await f.scrollIntoViewIfNeeded();
    const box = await f.boundingBox();
    const fr = await (await f.elementHandle()).contentFrame();
    const pageLinks = await page.evaluate(() => [...document.querySelectorAll('a,button')].map((a) => (a.innerText || a.getAttribute('aria-label') || '').trim()).filter((t) => /full|skip|text|alternative|open|view/i.test(t)).slice(0, 12));
    const frameLinks = await fr.evaluate(() => [...document.querySelectorAll('a,button,[role=button]')].map((a) => (a.innerText || a.getAttribute('aria-label') || '').trim()).filter((t) => /full|skip|text|alternative|open|view/i.test(t)).slice(0, 12)).catch(() => ['<frame inaccessible>']);
    const pageOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    const frameOverflow = await fr.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })).catch(() => null);
    const textAlt = await page.evaluate(() => [...document.querySelectorAll('details,[class*=alt],[class*=text-version],[id*=alt]')].map((e) => (e.innerText || '').slice(0, 80)).slice(0, 5));
    results.steps.step4[path] = { iframeBox: box && { x: Math.round(box.x), width: Math.round(box.width), right: Math.round(box.x + box.width) }, pageOverflow, frameOverflow, pageLinks, frameLinks, textAlt };
  }

  // Step 5: resources and academic-productivity book cards (DOM only)
  results.steps.step5 = {};
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const path of ['/resources/', '/academic-productivity/']) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
    await settle(page);
    const cards = await page.evaluate(() => [...document.querySelectorAll('article,li,div')].filter((c) => c.querySelectorAll('img').length === 1 && /Increasing Reading Productivity|Foundations of Readability/.test(c.textContent)).filter((c, i, a) => !a.some((o) => o !== c && c.contains(o))).map((c) => ({ title: (c.querySelector('h1,h2,h3,h4')?.textContent || '').trim(), found: true, img: c.querySelector('img').currentSrc || c.querySelector('img').src, imgAlt: c.querySelector('img').alt, links: [...c.querySelectorAll('a')].map((a) => a.getAttribute('href')).slice(0, 3) })));
    for (const c of cards) {
      if (c.img) {
        const r = await page.request.get(c.img);
        c.imgSha256 = sha(await r.body());
        c.imgStatus = r.status();
        c.matchesExpected = c.imgSha256 === EXPECTED[c.title === 'Increasing Reading Productivity' ? 'academic' : 'readability'];
        c.img = c.img.replace(BASE, '');
      }
    }
    results.steps.step5[path] = cards;
  }
} catch (e) {
  results.fatal = String(e.stack || e.message).slice(0, 800);
} finally {
  results.finishedAt = new Date().toISOString();
  if (browser) await browser.close().catch(() => {});
  writeFileSync(join(here, 'smoke-two-books-results.json'), JSON.stringify(results, null, 2));
}
console.log(JSON.stringify({ fatal: results.fatal || null, steps: Object.keys(results.steps), consoleCount: results.console.length, failedRequests: results.failedRequests.length }));
