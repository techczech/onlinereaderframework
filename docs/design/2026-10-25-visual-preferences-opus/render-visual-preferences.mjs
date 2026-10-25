// Renders visual-preferences-options-2026-10-25.html from the canonical copy, the book excerpts, the icon sprite, CSS and JS.
// Usage: node render-visual-preferences.mjs   (reads and writes beside this file)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = name => readFileSync(join(here, name), 'utf8');
const md = read('copy-visual-preferences-2026-10-25.md');
const data = JSON.parse(read('excerpts-books-visual-preferences-2026-10-25.json'));
const icons = read('icons-visual-preferences.svg').replace(/<!--[\s\S]*?-->/g, '');
const css = read('style-visual-preferences.css');
const js = read('behaviour-visual-preferences.js');

/** "## option <id>" / "## <block>" hold "key: value" lines; "### <name>" starts a "- item" list. */
function parseCopy(text) {
  const body = text.replace(/^---[\s\S]*?\n---\n/, '').replace(/<!--[\s\S]*?-->/g, '');
  const copy = { options: {}, order: [] };
  let target = copy, list = null;
  for (const line of body.split('\n')) {
    let m;
    if ((m = /^# (.+)/.exec(line))) copy.title = m[1].trim();
    else if ((m = /^## option (\S+)/.exec(line))) { target = copy.options[m[1]] = { id: m[1] }; copy.order.push(m[1]); list = null; }
    else if ((m = /^## (\w+)/.exec(line))) { target = copy[m[1]] ??= {}; list = null; }
    else if ((m = /^### (\S+)/.exec(line))) { list = target[m[1]] = []; }
    else if ((m = /^- (.+)/.exec(line)) && list) list.push(m[1].trim());
    else if ((m = /^([a-z0-9][a-z0-9-]*): (.+)/.exec(line))) { target[m[1]] = m[2].trim(); list = null; }
  }
  return copy;
}
const copy = parseCopy(md);
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const chosen = copy['default-tab'];

const cmp = copy.comparison;
const cells = row => row.split('|').map(c => c.trim());
const recIndex = cells(cmp.columns).slice(1).indexOf(chosen.toUpperCase());
const table = `<details class="compare-box" open><summary>${esc(cmp.heading)}</summary><table class="compare"><thead><tr><th></th>${cells(cmp.columns).slice(1).map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>` +
  cmp.rows.map(r => { const [h, ...v] = cells(r); return `<tr><th scope="row">${esc(h)}</th>${v.map((c, i) => `<td${i === recIndex ? ' class="rec"' : ''}>${esc(c)}</td>`).join('')}</tr>`; }).join('') + '</tbody></table></details>';
const books = `<fieldset class="bookpick"><legend>${esc(copy['book-label'])}</legend>` + data.books.map((b, i) =>
  `<label><input type="radio" name="book" value="${esc(b.id)}"${i === 0 ? ' checked' : ''}><img src="${b.cover}" alt="">${esc(b.title.split(/[:]/)[0].replace(/^Introduction to Key Issues in Language.*/, 'Linguistics'))}</label>`).join('') + '</fieldset>';
const tabs = `<div class="tabs" role="tablist" aria-label="${esc(copy['tabs-label'])}">` + copy.order.map(id => {
  const o = copy.options[id];
  return `<button role="tab" id="tab-${esc(id)}" aria-controls="option-${esc(id)}" aria-selected="${id === chosen}" tabindex="${id === chosen ? 0 : -1}"><span class="badge">${esc(o.badge)}</span>${esc(o.name)}</button>`;
}).join('') + '</div>';
const sections = copy.order.map(id => {
  const o = copy.options[id];
  return `<section class="option" role="tabpanel" id="option-${esc(id)}" aria-labelledby="tab-${esc(id)}"${id === chosen ? '' : ' hidden'}>
<div class="option-head"><span class="badge">${esc(o.badge)}</span><h2>${esc(o.name)}</h2></div><p class="summary">${esc(o.summary)}</p>
<div class="viewswitch" role="group" aria-label="${esc(copy['view-label'])}"><button type="button" data-view="phone" aria-pressed="true">${esc(copy['view-phone'])}</button><button type="button" data-view="desktop" aria-pressed="false">${esc(copy['view-desktop'])}</button></div>
<div class="stage" data-option="${esc(id)}" data-view="phone"><div class="frames"></div></div>
<ul class="facts">${(o.facts ?? []).map(f => `<li>${esc(f)}</li>`).join('')}</ul></section>`;
}).join('\n');

const payload = JSON.stringify({ data, copy }).replace(/</g, '\\u003c');
const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(copy.title)}</title><style>${css}</style></head>
<body>${icons}<main class="page"><h1>${esc(copy.title)}</h1><p class="intro">${esc(copy.intro)}</p>
<p class="recommendation">${esc(copy.recommendation)}</p>${table}
<div class="controls-row">${books}${tabs}</div>
${sections}</main>
<script>window.SKETCH = ${payload};</script><script>${js}</script></body></html>
`;
writeFileSync(join(here, 'visual-preferences-options-2026-10-25.html'), html);
console.log('wrote visual-preferences-options-2026-10-25.html', html.length, 'bytes;', copy.order.length, 'arrangements;', data.books.length, 'books');
