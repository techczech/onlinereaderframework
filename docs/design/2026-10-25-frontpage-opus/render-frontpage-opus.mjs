// Renders frontpage-designs-opus-2026-10-25.html from the canonical copy, the extracted book data, the lucide sprite, CSS, JS and cover thumbnails.
// Usage: node render-frontpage-opus.mjs   (macOS: makes 420 px cover copies with sips in a temporary folder, from apps/reader-demo/public/covers, read only)
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = name => readFileSync(join(here, name), 'utf8');
const coverDir = mkdtempSync(join(tmpdir(), 'frontpage-covers-'));
const md = read('copy-frontpage-opus-2026-10-25.md');
const data = JSON.parse(read('data-books-frontpage-2026-10-25.json'));
const icons = read('icons-frontpage-opus.svg').replace(/<!--[\s\S]*?-->/g, '');
const css = read('style-frontpage-opus.css');
const js = read('behaviour-frontpage-opus.js');

/** "## option <id>", "## book <id>" or "## <block>" hold "key: value" lines; "### <name>" starts a "- item" list. */
function parseCopy(text) {
  const body = text.replace(/^---[\s\S]*?\n---\n/, '').replace(/<!--[\s\S]*?-->/g, '');
  const copy = { options: {}, books: {}, order: [] };
  let target = copy, list = null;
  for (const line of body.split('\n')) {
    let m;
    if ((m = /^# (.+)/.exec(line))) copy.title = m[1].trim();
    else if ((m = /^## option (\S+)/.exec(line))) { target = copy.options[m[1]] = { id: m[1] }; copy.order.push(m[1]); list = null; }
    else if ((m = /^## book (\S+)/.exec(line))) { target = copy.books[m[1]] = {}; list = null; }
    else if ((m = /^## (\w+)/.exec(line))) { target = copy[m[1]] ??= {}; list = null; }
    else if ((m = /^### (\S+)/.exec(line))) { list = target[m[1]] = []; }
    else if ((m = /^- (.+)/.exec(line)) && list) list.push(m[1].trim());
    else if ((m = /^([a-z0-9][a-z0-9-]*): (.+)/.exec(line))) { target[m[1]] = m[2].trim(); list = null; }
  }
  return copy;
}
const copy = parseCopy(md);
const ORDER = ['linguistics', 'deliberate-practice', 'language-muscle'];
data.books.sort((x, y) => ORDER.indexOf(x.id) - ORDER.indexOf(y.id));
const p = copy.page;
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const covers = Object.fromEntries(data.books.map(b => {
  const out = join(coverDir, b.cover);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '70', '--resampleWidth', '420', join(here, '../../../apps/reader-demo/public/covers', `${b.id}.jpg`), '--out', out], { stdio: 'ignore' });
  return [b.id, `data:image/jpeg;base64,${readFileSync(out).toString('base64')}`];
}));
rmSync(coverDir, { recursive: true, force: true });
for (const b of data.books) if (!copy.books[b.id]) throw new Error(`copy has no "## book ${b.id}" block`);

const seg = (set, items) => `<div class="seg">${items.map(([value, label, img]) =>
  `<button type="button" data-set="${set}" data-value="${esc(value)}" aria-pressed="false">${img ? `<img data-cover="${esc(value)}" alt="">` : ''}${esc(label)}</button>`).join('')}</div>`;
const field = (legend, set, items, cls = '') => `<fieldset class="${cls}"><legend>${esc(legend)}</legend>${seg(set, items)}</fieldset>`;
const controls = `<div class="controls">
${field(p['direction-label'], 'dir', copy.order.map(id => [id, `${copy.options[id].badge} · ${copy.options[id].name}`]))}
${field(p['book-label'], 'book', data.books.map(b => [b.id, copy.books[b.id].short, true]))}
${field(p['view-label'], 'view', [['desktop', p['view-desktop']], ['phone', p['view-phone']]])}
${field(p['visitor-label'], 'visitor', [['first', p['visitor-first']], ['returning', p['visitor-returning']]])}
${field(p['title-label'], 'title', [['current', p['title-current']], ['provisional', p['title-provisional']]], 'title-switch')}
</div>`;
const report = (copy.report?.items ?? []).length ? `<details class="report"><summary>${esc(p['report-heading'])}</summary><ul>${copy.report.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul><p>${esc(p['report-note'])}</p></details>` : '';

const payload = JSON.stringify({ data, copy, covers }).replace(/</g, '\\u003c');
const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(copy.title)}</title><style>${css}</style></head>
<body>${icons}<div class="page"><h1>${esc(copy.title)}</h1>
<p class="intro">${esc(p.intro)}</p><p class="recommendation">${esc(p.recommendation)}</p>
<p class="banner"><svg class="ic" aria-hidden="true"><use href="#i-info"/></svg>${esc(p['mock-banner'])}</p>
${controls}
<div class="optinfo"><h2 class="opt-name"></h2><p class="opt-summary"></p><p class="width-note"></p></div>
<div class="stage"></div>
<ul class="opt-facts"></ul>
${report}</div>
<script>window.SKETCH = ${payload};</script><script>${js}</script></body></html>
`;
writeFileSync(join(here, 'frontpage-designs-opus-2026-10-25.html'), html);
console.log('wrote frontpage-designs-opus-2026-10-25.html', html.length, 'bytes;', copy.order.length, 'layouts;', data.books.length, 'books');
