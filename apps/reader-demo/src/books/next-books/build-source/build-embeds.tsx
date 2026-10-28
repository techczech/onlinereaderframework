/** Build the self-contained HTML embeds. Markup comes from the ORIGINAL components (server-rendered, read-only),
 *  styled with the original Tailwind classes compiled locally; the scripts reproduce the original state changes.
 *  Usage: tsx build-embeds.tsx <readability-source> <scratch-dir> <interactives-dir> */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { makeOracle } from './oracle.js';

const here = dirname(fileURLToPath(import.meta.url));
const [src, scratch, outRoot] = process.argv.slice(2).map(p => resolve(p));
const embedsDir = resolve(here, 'embeds');
const tailwind = resolve(here, '../../../../node_modules/.bin/tailwindcss');
const read = (f: string) => readFileSync(resolve(embedsDir, f), 'utf8');
const readability = JSON.parse(readFileSync(resolve(scratch, 'readability-sections.json'), 'utf8'));
const academic = JSON.parse(readFileSync(resolve(scratch, 'academic-diagrams.json'), 'utf8'));
const oracle = await makeOracle(src);

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#94a3b8"/><stop offset="1" stop-color="#475569"/></linearGradient></defs><rect width="400" height="225" fill="url(#g)"/><circle cx="300" cy="70" r="26" fill="#e2e8f0" opacity=".7"/><path d="M0 225V160l90-60 80 50 70-40 160 90v25z" fill="#1e293b" opacity=".55"/></svg>');

function page(title: string, body: string, scripts: string[], brand: boolean): { html: string; cssSource: string } {
  return { html: `<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="color-scheme" content="light dark">\n<title>${title.replace(/</g, '&lt;')}</title>\n<style>/*CSS*/</style>\n</head>\n<body>\n${body}\n<script>\n${scripts.join('\n')}\n</script>\n</body>\n</html>\n`, cssSource: brand ? 'brand' : 'plain' };
}
function compile(html: string, brand: boolean, id: string): string {
  const tmp = resolve(scratch, `${id}.tw.html`), cfg = resolve(scratch, `${id}.tailwind.cjs`), input = resolve(scratch, 'base.css'), out = resolve(scratch, `${id}.css`);
  writeFileSync(tmp, html); writeFileSync(input, read('base.css'));
  writeFileSync(cfg, `module.exports = { content: [${JSON.stringify(tmp)}], theme: { extend: ${brand ? `{ colors: { brand: { 50:'#f0f9ff',100:'#e0f2fe',200:'#bae6fd',300:'#7dd3fc',400:'#38bdf8',500:'#0ea5e9',600:'#0284c7',700:'#0369a1',800:'#075985',900:'#0c4a6e',950:'#082f49' } } }` : '{}'} }, plugins: [], corePlugins: {} };`);
  execFileSync(tailwind, ['-c', cfg, '-i', input, '-o', out, '--minify'], { stdio: ['ignore', 'ignore', 'pipe'] });
  return readFileSync(out, 'utf8');
}
const built: { id: string; book: string; file: string; bytes: number }[] = [];
function emit(book: string, id: string, title: string, body: string, scripts: string[], brand = false) {
  const { html } = page(title, body, scripts, brand);
  const css = compile(html, brand, id);
  const final = html.replace('/*CSS*/', () => css.trim()).replace('<body>', () => `<body data-reader-interactive="${id}">`);
  const dir = resolve(outRoot, book, id); mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), final);
  built.push({ id, book, file: `${book}/${id}/index.html`, bytes: Buffer.byteLength(final) });
}
const heightJs = read('height.js');
const cls = (html: string, re: RegExp) => { const m = html.match(re); if (!m) throw new Error(`pattern not found: ${re}`); return m[1]; };

// ---- Academic ----
const NODES = JSON.stringify(academic.nodes), EDGES = JSON.stringify(academic.edges);
emit('academic-reading-framework', 'cognition-explorer', 'Cognition Explorer', read('explorer.body.html').replace('__NODES__', () => NODES).replace('__EDGES__', () => EDGES), [heightJs], true);
for (const [id, title] of [['reading-articulation-layers', 'Articulation of Reading'], ['reading-simplified-summary', 'Simplified graphical summary']] as const) {
  // The diagram markup is the original JSX rendered as it stands (including its caption).
  emit('academic-reading-framework', id, title, `<div class="p-2">${academic.diagrams[id]}</div>`, [heightJs], true);
}

// ---- Readability ----
const wrap = (inner: string) => `<div class="p-2">${inner}</div>`;
{ // cramped text reveal
  const hidden = oracle.dyslexia(false), revealed = oracle.dyslexia(true);
  const boxClass = (h: string) => cls(h, /<div class="(p-8 rounded-xl border mb-8[^"]*)"/);
  const textClass = (h: string) => cls(h, /<div class="p-8 rounded-xl border mb-8[^"]*"><p class="([^"]*)"/);
  const classes = { boxHidden: boxClass(hidden), boxRevealed: boxClass(revealed), textHidden: textClass(hidden), textRevealed: textClass(revealed) };
  const body = hidden.replace(/<link [^>]*>/g, '')
    .replace(/<div class="(p-8 rounded-xl border mb-8[^"]*)"/, '<div data-cramped-box role="button" tabindex="0" aria-pressed="false" class="$1"')
    .replace(/<div class="(absolute inset-x-0 bottom-4[^"]*)"/, '<div data-hint class="$1"');
  emit('readability-foundations', 'cramped-text-reveal', 'Cramped text and the same text made clear', wrap(body), [heightJs, read('dyslexia.script.js').replace('__CLASSES__', () => JSON.stringify(classes))]);
}
{ // font and spacing adjuster
  let n = 0;
  const body = oracle.font(20)
    .replace(/<button /g, () => `<button data-font-control `)
    .replace(/(<span class="mx-3 font-mono[^>]*)>/, '$1 data-font-size>')
    .replace(/<p style="font-size:20px;line-height:1.5">/, '<p data-font-sample style="font-size:20px;line-height:1.5">');
  if (!body.includes('data-font-sample') || (body.match(/data-font-control/g) || []).length !== 3) throw new Error('font adjuster markup changed');
  emit('readability-foundations', 'font-spacing-adjuster', 'The same paragraph at 12pt, 14pt and an adjustable size', wrap(body), [heightJs, read('font.script.js')]);
}
{ // readability checker
  const html = oracle.checker(readability.checkerDefault);
  const body = html
    .replace(/(<div class="text-3xl font-bold text-slate-900">)(\d+)(<\/div>)/, '<div id="stat-sentences" class="text-3xl font-bold text-slate-900">$2$3')
    .replace(/(<div class="text-3xl font-bold text-slate-900">)(\d+)(<\/div>)/, '<div id="stat-words" class="text-3xl font-bold text-slate-900">$2$3')
    .replace(/<div class="text-3xl font-bold (text-(?:amber|emerald)-600)">/, '<div id="stat-average" class="text-3xl font-bold $1">')
    .replace('<button ', '<button id="clear" type="button" ')
    .replace('<textarea ', '<textarea id="text-input" aria-label="Input text" ')
    .replace(/(<div class="p-8 leading-relaxed text-lg text-slate-800")>/, '$1 id="results" aria-live="polite">');
  for (const id of ['stat-sentences', 'stat-words', 'stat-average', 'id="clear"', 'id="text-input"', 'id="results"']) if (!body.includes(id)) throw new Error(`checker markup changed: ${id}`);
  emit('readability-foundations', 'readability-checker', 'Readability Checker', wrap(body), [heightJs, read('checker.script.js').replace('__ANALYSIS__', () => readability.analysisJs)]);
}
{ // slide comparisons, rendered by the original BlockRenderer from the original data
  const data = (await import(pathToFileURL(resolve(src, 'data/content/slideFormattingExamplesData.tsx')).href)).slideFormattingExamplesData;
  const ids: Record<string, string> = { 'one-bullet': 'slides-one-bullet', 'remove-text': 'slides-extraneous-text', zooming: 'slides-zooming-images' };
  for (const step of data.steps) {
    const comparison = step.blocks.find((b: any) => b.type === 'comparison');
    const html = oracle.blocks([comparison]).replace(/<link [^>]*>/g, '').replace(/src="https:\/\/images\.unsplash\.com[^"]*"/g, `src="${PLACEHOLDER_IMAGE}"`);
    emit('readability-foundations', ids[step.id], step.title, wrap(html), [heightJs]);
  }
}
writeFileSync(resolve(scratch, 'embeds-built.json'), JSON.stringify(built, null, 1));
console.log(built.map(b => `${b.file} ${b.bytes}`).join('\n'));
