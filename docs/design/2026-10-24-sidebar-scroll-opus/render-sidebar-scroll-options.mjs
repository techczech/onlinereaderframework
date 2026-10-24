// Renders sidebar-scroll-options-2026-10-24.html from the canonical copy, the snapshot excerpt, CSS and JS.
// Usage: node render-sidebar-scroll-options.mjs   (run from any directory; reads and writes beside this file)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = name => readFileSync(join(here, name), 'utf8');
const md = read('copy-sidebar-scroll-options-2026-10-24.md');
const data = JSON.parse(read('excerpts-linguistics-sidebar-mock-2026-10-24.json'));
const css = read('style-sidebar-scroll-options.css');
const js = read('behaviour-sidebar-scroll-options.js');

/** "## option <id>" / "## labels" blocks hold "key: value" lines; "### <name>" starts a "- item" list. */
function parseCopy(text) {
  const body = text.replace(/^---[\s\S]*?\n---\n/, '').replace(/<!--[\s\S]*?-->/g, '');
  const copy = { options: {}, order: [], labels: {} };
  let target = copy, list = null;
  for (const line of body.split('\n')) {
    let m;
    if ((m = /^# (.+)/.exec(line))) copy.title = m[1].trim();
    else if ((m = /^## option (\S+)/.exec(line))) { target = copy.options[m[1]] = { id: m[1] }; copy.order.push(m[1]); list = null; }
    else if ((m = /^## (\w+)/.exec(line))) { target = copy[m[1]] ??= {}; list = null; }
    else if ((m = /^### (\S+)/.exec(line))) { list = target[m[1]] = []; }
    else if ((m = /^- (.+)/.exec(line)) && list) list.push(m[1].trim());
    else if ((m = /^([a-z][a-z-]*): (.+)/.exec(line))) { target[m[1]] = m[2].trim(); list = null; }
  }
  return copy;
}
const copy = parseCopy(md);
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const book = data.book;

const toolbar = `<div class="toolbar"><span>☰ Table of contents</span><b>${esc(book.title)}</b><span>Reading settings</span><span>Listen</span><span>Notes</span></div>`;
const tag = key => `<span class="tag">${esc(copy[key])}</span>`;
function side(o) {
  const header = o.id === 'today'
    ? `<div class="fixed"><div class="field">${esc(o.search)}</div><button class="metabtn" data-home>⌂ ${esc(o.home)}</button><button class="metabtn notes">${esc(o.notes)}</button></div>`
    : `<div class="fixed"><div class="identity"><div class="cover" aria-hidden="true"></div><button data-home title="${esc(book.title)}">${esc(book.title)}</button></div><div class="field">${esc(o.search)}</div><div class="bar"></div><div class="subtle">${esc(o.progress)}</div></div>`;
  return `<aside class="side">${header}<nav class="scroll-contents" aria-label="${esc(o['contents-heading'])}"></nav></aside>`;
}
function frame(o) {
  if (o.id === 'b') return `<div class="frame page-mode"><div class="scroll-page">${tag('legend-page')}<div class="page-inner">${side(o)}<div class="main">${toolbar}<div class="article"></div></div></div></div></div>`;
  return `<div class="frame ${o.id === 'today' ? 'today' : ''}">${side(o)}<div class="main">${toolbar}<div class="scroll-article">${tag('legend-article')}<div class="article"></div></div></div></div>`;
}
const chosen = copy['default-tab'];
const tabs = `<div class="tabs" role="tablist" aria-label="${esc(copy['tabs-label'])}">` + copy.order.map(id => {
  const o = copy.options[id];
  return `<button role="tab" id="tab-${esc(id)}" aria-controls="option-${esc(id)}" aria-selected="${id === chosen}" tabindex="${id === chosen ? 0 : -1}" data-tab="${esc(id)}"><span class="badge">${esc(o.badge)}</span> ${esc(o.name)}</button>`;
}).join('') + '</div>';
const cmp = copy.comparison;
const cells = row => row.split('|').map(c => c.trim());
const table = `<table class="compare"><caption>${esc(cmp.heading)}</caption><thead><tr><th></th>${cells(cmp.columns).slice(1).map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>` +
  cmp.rows.map(r => { const [h, ...v] = cells(r); return `<tr><th scope="row">${esc(h)}</th>${v.map((c, i) => `<td${i === 1 ? ' class="rec"' : ''}>${esc(c)}</td>`).join('')}</tr>`; }).join('') + '</tbody></table>';
const sections = copy.order.map(id => {
  const o = copy.options[id];
  return `<section class="option" role="tabpanel" id="option-${esc(id)}" aria-labelledby="tab-${esc(id)}" data-id="${esc(id)}"${id === chosen ? '' : ' hidden'}><div class="option-head"><span class="badge">${esc(o.badge)}</span><h2>${esc(o.name)}</h2></div>
<p class="summary">${esc(o.summary)}</p>${frame(o)}<p class="focus-note" aria-live="polite"></p>
<ul class="facts">${(o.facts ?? []).map(f => `<li>${esc(f)}</li>`).join('')}</ul></section>`;
}).join('\n');

const payload = JSON.stringify({ data, copy }).replace(/</g, '\\u003c');
const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(copy.title)}</title><style>${css}</style></head>
<body><div class="sheet"><h1>${esc(copy.title)}</h1><p class="intro">${esc(copy.intro)}</p>
<p class="recommendation">${esc(copy.recommendation)}</p>${table}${tabs}
<p class="legend"><span class="k-contents">${esc(copy['legend-contents'])}</span><span class="k-article">${esc(copy['legend-article'])}</span><span class="k-page">${esc(copy['legend-page'])}</span><span class="k-fixed">${esc(copy['legend-fixed'])}</span></p>
${sections}</div>
<script>window.SKETCH = ${payload};</script><script>${js}</script></body></html>
`;
writeFileSync(join(here, 'sidebar-scroll-options-2026-10-24.html'), html);
console.log('wrote sidebar-scroll-options-2026-10-24.html', html.length, 'bytes;', copy.order.length, 'frames');
