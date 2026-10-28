/** Browser check for the nine embeds, with no dependencies: Chrome is driven over its debugging port.
 *  Usage: node check-embeds.mjs <interactives-dir> <scratch-dir> <report.json> */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
const [interactives, scratch, reportPath] = process.argv.slice(2).map(p => resolve(p));
const browserCache = resolve(homedir(), 'Library/Caches/ms-playwright');
const bundledShells = readdirSync(browserCache).filter(name => name.startsWith('chromium_headless_shell-')).sort().reverse().map(name => resolve(browserCache, name, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'));
const CHROME = process.env.CHROME || bundledShells.find(file => existsSync(file));
if (!CHROME || basename(CHROME) !== 'chrome-headless-shell' || !existsSync(CHROME)) throw new Error('A bundled chrome-headless-shell executable is required');
const profile = resolve(scratch, 'chrome-profile'); rmSync(profile, { recursive: true, force: true }); mkdirSync(profile, { recursive: true });
const oracle = JSON.parse(readFileSync(resolve(scratch, 'oracle-states.json'), 'utf8'));
const academic = JSON.parse(readFileSync(resolve(scratch, 'academic-diagrams.json'), 'utf8'));
const port = 9300 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const results = []; const record = (name, ok, detail = '') => { results.push({ name, ok, detail }); if (!ok) console.log('FAIL', name, detail); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function connect() {
  for (let i = 0; i < 60; i++) { try { const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const page = list.find(t => t.type === 'page'); if (page) return page.webSocketDebuggerUrl; } catch {} await sleep(250); }
  throw new Error('Chrome did not start');
}
const ws = new WebSocket(await connect()); await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else events.push(d); });
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Log.enable');
const viewport = (width, height = 900) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
async function open(file, width = 900) {
  events.length = 0; await viewport(width);
  await send('Page.navigate', { url: pathToFileURL(resolve(interactives, file)).href });
  for (let i = 0; i < 40; i++) { if (await evaluate('document.readyState') === 'complete') break; await sleep(100); }
  await sleep(150);
}
const problems = () => {
  const external = events.filter(e => e.method === 'Network.requestWillBeSent').map(e => e.params.request.url).filter(u => !/^(file:|data:|about:)/.test(u));
  const errors = events.filter(e => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map(e => JSON.stringify(e.params).slice(0, 200));
  return { external, errors };
};
const key = async (k, code = k) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, text: k === 'Enter' ? '\r' : k === ' ' ? ' ' : undefined }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code }); };

// Normalised structure used to compare an embed with the original component's server-rendered output.
const NORMALISE = `(() => {
  const walk = n => {
    if (n.nodeType === 8) return '';
    if (n.nodeType === 3) { const t = n.textContent.replace(/\\s+/g, ' ').trim(); return t ? JSON.stringify(t) : ''; }
    if (n.hidden || n.hasAttribute?.('hidden')) return '';
    const tag = n.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') return '';
    const classes = [...n.classList].sort().join('.');
    const extra = [n.disabled ? 'disabled' : '', tag === 'p' && n.style && n.style.fontSize ? 'fs=' + n.style.fontSize : '', tag === 'textarea' ? 'value=' + JSON.stringify(n.value) : ''].filter(Boolean).join(',');
    const kids = tag === 'textarea' ? '' : [...n.childNodes].map(walk).filter(Boolean).join(' ');
    return tag + '.' + classes + (extra ? '[' + extra + ']' : '') + '(' + kids + ')';
  };
  window.__walk = walk;
})()`;
async function setup() { await evaluate(NORMALISE); }
const embedSignature = () => evaluate(`window.__walk(document.querySelector('body > div.p-2'))`);
const oracleSignature = html => evaluate(`(() => { const d = document.createElement('div'); d.className = 'p-2'; d.innerHTML = ${JSON.stringify(html)}; return window.__walk(d); })()`);
const firstDiff = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return `at ${i}: embed=…${a.slice(Math.max(0, i - 80), i + 120)}… original=…${b.slice(Math.max(0, i - 80), i + 120)}…`; };
const R = 'readability-foundations', A = 'academic-reading-framework';
const files = [`${A}/cognition-explorer`, `${A}/reading-articulation-layers`, `${A}/reading-simplified-summary`, `${R}/cramped-text-reveal`, `${R}/font-spacing-adjuster`, `${R}/readability-checker`, `${R}/slides-one-bullet`, `${R}/slides-extraneous-text`, `${R}/slides-zooming-images`];

// ---- every embed: loads offline without errors, fits 320px, reports height from inside a sandboxed frame ----
for (const f of files) {
  for (const w of [320, 900]) {
    await open(`${f}/index.html`, w);
    const { external, errors } = problems();
    const overflow = await evaluate('document.documentElement.scrollWidth - window.innerWidth');
    record(`${f} @${w}px loads offline, no errors`, !external.length && !errors.length, JSON.stringify({ external, errors }));
    record(`${f} @${w}px no page-level horizontal overflow`, overflow <= 1, `overflow=${overflow}`);
  }
  const html = readFileSync(resolve(interactives, f, 'index.html'), 'utf8');
  record(`${f} self-contained (no src/href/url() to other resources)`, !/\s(?:src|href)="(?!data:|#)/.test(html) && !/url\((?!["']?data:|["']?#|["']?%23)/.test(html) && !/@import|<link /.test(html), '');
  record(`${f} avoids storage/popups/forms`, !/localStorage|sessionStorage|document\.cookie|window\.open|alert\(|confirm\(|prompt\(|<form|fullscreen/i.test(html.replace(/color-scheme/g, '')), '');
  // frame: sandbox allow-scripts only, parent receives the height message
  const harness = resolve(scratch, 'frame-harness.html');
  writeFileSync(harness, `<!doctype html><body><iframe id="f" sandbox="allow-scripts" style="width:700px;height:300px" src="${pathToFileURL(resolve(interactives, f, 'index.html')).href}"></iframe><script>window.msgs=[];addEventListener('message',e=>msgs.push({origin:e.origin,source:e.source===document.getElementById('f').contentWindow,data:e.data}));</script>`);
  events.length = 0; await viewport(900);
  await send('Page.navigate', { url: pathToFileURL(harness).href }); await sleep(1200);
  const msgs = await evaluate('window.msgs');
  const m = msgs.find(x => x.data && x.data.type === 'reader-embed:height');
  record(`${f} posts {type,version:1,height} from a sandboxed frame`, !!m && m.origin === 'null' && m.source && m.data.version === 1 && Object.keys(m.data).sort().join() === 'height,type,version' && m.data.height > 100, JSON.stringify(msgs.slice(0, 2)));
}

// ---- Cognition Explorer ----
{
  const f = `${A}/cognition-explorer/index.html`;
  await open(f, 1000); await setup();
  const ssr = academic.explorerSsr.slice(academic.explorerSsr.indexOf('<svg class="absolute inset-0'), academic.explorerSsr.indexOf('</svg>', academic.explorerSsr.indexOf('<svg class="absolute inset-0')));
  const ssrFull = academic.explorerSsr;
  const ssrPaths = [...ssr.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
  const ssrLabels = [...ssr.matchAll(/<text x="([^"]+)" y="([^"]+)"[^>]*>([^<]*)<\/text>/g)].map(m => `${m[1]},${m[2]},${m[3]}`);
  const dom = await evaluate(`({paths:[...document.querySelectorAll('#edges path')].map(p=>p.getAttribute('d')), labels:[...document.querySelectorAll('#edges text')].map(t=>t.getAttribute('x')+','+t.getAttribute('y')+','+t.textContent), dashes:[...document.querySelectorAll('#edges path')].map(p=>p.getAttribute('stroke-dasharray'))})`);
  record('explorer edge geometry equals the original SSR output (15 paths)', ssrPaths.length === 15 && JSON.stringify(ssrPaths) === JSON.stringify(dom.paths), JSON.stringify({ ssrPaths, dom: dom.paths }).slice(0, 300));
  record('explorer edge labels and positions equal the original (15 labels)', ssrLabels.length === 15 && JSON.stringify(ssrLabels) === JSON.stringify(dom.labels), JSON.stringify({ ssrLabels, dom: dom.labels }).slice(0, 300));
  const ssrDash = [...ssr.matchAll(/stroke-dasharray="([^"]+)"/g)].map(m => m[1]);
  record('explorer dashed/solid edges equal the original', JSON.stringify(ssrDash) === JSON.stringify(dom.dashes), '');
  const ssrNodes = [...ssrFull.matchAll(/style="left:([\d.]+)%;top:([\d.]+)%;width:140px;height:50px;opacity:1;scale:1"[^>]*><span class="font-bold text-sm">([^<]*)</g)].map(m => `${m[1]},${m[2]},${m[3]}`);
  const domNodes = await evaluate(`[...document.querySelectorAll('#nodes button')].map(b=>parseFloat(b.style.left)+','+parseFloat(b.style.top)+','+b.textContent)`);
  const near = (a, b) => a.length === b.length && a.every((x, i) => { const [l1, t1, n1] = x.split(','), [l2, t2, n2] = b[i].split(','); return n1 === n2 && Math.abs(l1 - l2) < 1e-3 && Math.abs(t1 - t2) < 1e-3; });
  record('explorer nodes (position, label) equal the original', ssrNodes.length === 9 && near(ssrNodes, domNodes), JSON.stringify({ ssrNodes, domNodes }).slice(0, 300));
  for (const node of academic.nodes) {
    await evaluate(`document.getElementById('node-${node.id}').click()`);
    const s = await evaluate(`({title:document.getElementById('panel-title').textContent, text:document.getElementById('panel-text').textContent, type:document.getElementById('panel-type').textContent, shown:!document.getElementById('panel').hidden, resetEnabled:!document.getElementById('reset').disabled,
      related:[...document.querySelectorAll('#edges g')].filter(g=>g.dataset.related==='1').map(g=>g.dataset.source+'>'+g.dataset.target).sort(), dimmed:[...document.querySelectorAll('#edges g')].filter(g=>g.style.opacity==='0.2').length,
      pressed:[...document.querySelectorAll('#nodes button')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.node), faded:[...document.querySelectorAll('#nodes button')].filter(b=>b.style.opacity==='0.5').map(b=>b.dataset.node).sort()})`);
    const incident = academic.edges.filter(e => e.source === node.id || e.target === node.id).map(e => e.source + '>' + e.target).sort();
    const neighbours = new Set(academic.edges.flatMap(e => e.source === node.id ? [e.target] : e.target === node.id ? [e.source] : []));
    const expectFaded = academic.nodes.filter(n => n.id !== node.id && !neighbours.has(n.id)).map(n => n.id).sort();
    record(`explorer: selecting ${node.label} shows its definition and highlights its ${incident.length} arrows`,
      s.shown && s.title === node.label && s.text === node.description && s.type === (node.type === 'mode' ? 'Cognitive Mode' : 'Activity') && s.resetEnabled && JSON.stringify(s.related) === JSON.stringify(incident) && s.dimmed === 15 - incident.length && s.pressed.join() === node.id && JSON.stringify(s.faded) === JSON.stringify(expectFaded), JSON.stringify(s).slice(0, 400));
  }
  await evaluate(`document.getElementById('reset').click()`);
  const cleared = await evaluate(`({shown:!document.getElementById('panel').hidden, resetDisabled:document.getElementById('reset').disabled, dim:[...document.querySelectorAll('#edges g')].filter(g=>g.style.opacity!=='1').length, fade:[...document.querySelectorAll('#nodes button')].filter(b=>b.style.opacity!=='1').length})`);
  record('explorer: Reset View clears selection', !cleared.shown && cleared.resetDisabled && !cleared.dim && !cleared.fade, JSON.stringify(cleared));
  await evaluate(`document.getElementById('node-skimming').focus()`); await key('Enter');
  record('explorer: Enter on a focused node selects it (keyboard)', await evaluate(`document.getElementById('panel-title').textContent`) === 'Skimming', '');
  await key('Escape');
  record('explorer: Escape clears selection', await evaluate(`document.getElementById('panel').hidden`), '');
  const focusables = await evaluate(`[...document.querySelectorAll('button')].every(b=>b.tabIndex>=0)`);
  record('explorer: every control is a focusable button', focusables, '');
  await open(f, 320); await setup();
  const narrow = await evaluate(`({scale:document.getElementById('stage').style.transform, hint:!document.getElementById('hint').hidden, w:document.documentElement.scrollWidth, iw:innerWidth})`);
  record('explorer @320px: stage scales to 70% and offers sideways scrolling, page itself does not overflow', narrow.scale === 'scale(0.7)' && narrow.hint && narrow.w <= narrow.iw + 1, JSON.stringify(narrow));
  await open(f, 720); await setup();
  const mid = await evaluate(`document.getElementById('stage').style.transform`);
  record('explorer @720px (typical reading column): scales to fit without scrolling', /scale\(0\.[89]/.test(mid) && !(await evaluate(`!document.getElementById('hint').hidden`)), mid);
}

// ---- Cramped text ----
{
  const f = `${R}/cramped-text-reveal/index.html`;
  await open(f); await setup();
  record('cramped text: initial state equals the original (cramped)', await embedSignature() === await oracleSignature(oracle.dyslexia.false), '');
  await evaluate(`document.querySelector('[data-cramped-box]').click()`);
  record('cramped text: click reveals the clear state equal to the original', await embedSignature() === await oracleSignature(oracle.dyslexia.true), '');
  await evaluate(`document.querySelector('[data-cramped-box]').click()`);
  record('cramped text: second click returns to cramped', await embedSignature() === await oracleSignature(oracle.dyslexia.false), '');
  await evaluate(`document.querySelector('[data-cramped-box]').focus()`); await key('Enter');
  const afterEnter = await embedSignature() === await oracleSignature(oracle.dyslexia.true);
  await key(' ', 'Space');
  const afterSpace = await embedSignature() === await oracleSignature(oracle.dyslexia.false);
  record('cramped text: Enter and Space operate the box (keyboard)', afterEnter && afterSpace && await evaluate(`document.querySelector('[data-cramped-box]').getAttribute('role')`) === 'button', `${afterEnter} ${afterSpace}`);
}
// ---- Font and spacing ----
{
  const f = `${R}/font-spacing-adjuster/index.html`;
  await open(f); await setup();
  const check = async (label, size) => record(`font adjuster: ${label} equals the original at ${size}px`, await embedSignature() === await oracleSignature(oracle.font[size]), '');
  await check('initial state', 20);
  const click = i => evaluate(`document.querySelectorAll('[data-font-control]')[${i}].click()`);
  await click(1); await click(1); await click(1); await check('after 3 increases', 26);
  for (let i = 0; i < 6; i++) await click(0); await check('after 6 decreases', 14);
  await click(0); await check('decrease at minimum does nothing', 14);
  for (let i = 0; i < 13; i++) await click(1); await check('increase to maximum', 40);
  await click(1); await check('increase at maximum does nothing', 40);
  await click(2); await check('reset', 20);
  record('font adjuster: buttons are native buttons with titles', await evaluate(`[...document.querySelectorAll('[data-font-control]')].every(b=>b.tagName==='BUTTON'&&b.title)`), '');
}
// ---- Readability checker ----
{
  const f = `${R}/readability-checker/index.html`;
  await open(f); await setup();
  record('checker: initial state equals the original', await embedSignature() === await oracleSignature(oracle.checker[0].html), '');
  for (let i = 1; i < oracle.checker.length; i++) {
    const { text, html } = oracle.checker[i];
    await evaluate(`(() => { const t = document.getElementById('text-input'); t.focus(); t.select(); })()`);
    if (text) await send('Input.insertText', { text }); else await evaluate(`document.execCommand('delete')`);
    const mine = await embedSignature(), theirs = await oracleSignature(html), ok = mine === theirs;
    record(`checker: text #${i} (${JSON.stringify(text.slice(0, 28))}) analysed exactly as the original`, ok, ok ? '' : firstDiff(mine, theirs));
  }
  await evaluate(`document.getElementById('clear').click()`);
  record('checker: Clear equals the original empty state', await embedSignature() === await oracleSignature(oracle.checker[1].html), '');
  record('checker: textarea has an accessible name; controls focusable', await evaluate(`!!document.getElementById('text-input').getAttribute('aria-label') && document.getElementById('clear').tabIndex>=0`), '');
}
// ---- Slides ----
for (const f of ['slides-one-bullet', 'slides-extraneous-text', 'slides-zooming-images']) {
  await open(`${R}/${f}/index.html`); await setup();
  const text = await evaluate(`document.body.innerText.replace(/\\s+/g,' ')`);
  const expected = { 'slides-one-bullet': ['Crowded & Overwhelming', 'Collaborative thinking to further the overall value proposition', 'Too much text in one place', 'Structured Sequence', 'Broken down into Intro, Summary, and Detail slides', 'Leverage agile frameworks to provide a robust synopsis.'], 'slides-extraneous-text': ['Small Graphic & Small Text', 'Nanotechnology immersion along the highway', 'The audience strains to read the small text', 'Zoomed In & Clear', 'The graphic fills the screen and speaks for itself'], 'slides-zooming-images': ['Split Attention', 'Text competes with image', 'Immersive & Focused', 'Maximising minimums', '(Carls, Chunk, Hendersson 2016)', 'Image sets the context instantly'] }[f];
  const missing = expected.filter(e => !text.toLowerCase().includes(e.toLowerCase()));
  record(`${f}: shows the original slide texts, titles and captions`, !missing.length, JSON.stringify(missing));
  const imgs = await evaluate(`[...document.images].map(i=>i.complete&&i.naturalWidth>0)`);
  record(`${f}: images are inline and load`, imgs.every(Boolean), JSON.stringify(imgs));
}

// ---- served under the release policy for /embeds/* (embed-contract.md section 6): no CSP violations, and the interactions still work ----
{
  const POLICY = "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'";
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/embeds\//, '');
    try { const body = readFileSync(resolve(interactives, path)); res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': POLICY }); res.end(body); } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/embeds/`;
  for (const f of files) {
    events.length = 0; await viewport(900);
    await send('Page.navigate', { url: `${base}${f}/index.html` }); await sleep(900);
    const violations = events.filter(e => e.method === 'Log.entryAdded' && /Content Security Policy|Refused to/i.test(e.params.entry.text)).map(e => e.params.entry.text.slice(0, 160));
    const rendered = await evaluate(`document.body.innerText.length`);
    record(`${f} under the release CSP: no violations, content renders`, !violations.length && rendered > 40, JSON.stringify(violations));
  }
  // interactions under the policy
  await send('Page.navigate', { url: `${base}${A}/cognition-explorer/index.html` }); await sleep(700);
  await evaluate(`document.getElementById('node-scanning').click()`);
  record('explorer under the release CSP: selecting a node works', await evaluate(`document.getElementById('panel-title').textContent`) === 'Scanning', '');
  await send('Page.navigate', { url: `${base}${R}/readability-checker/index.html` }); await sleep(700);
  await evaluate(`(() => { const t = document.getElementById('text-input'); t.focus(); t.select(); })()`); await send('Input.insertText', { text: 'One two three. Four five six seven eight.' });
  record('checker under the release CSP: typing updates the figures', await evaluate(`document.getElementById('stat-sentences').textContent`) === '2' && await evaluate(`document.getElementById('stat-words').textContent`) === '8', '');
  server.close();
}


ws.close(); chrome.kill('SIGTERM'); await sleep(300); rmSync(profile, { recursive: true, force: true }); rmSync(resolve(scratch, 'frame-harness.html'), { force: true });
const failed = results.filter(r => !r.ok);
writeFileSync(reportPath, JSON.stringify({ date: new Date().toISOString(), chrome: CHROME, passed: results.length - failed.length, failed: failed.length, results }, null, 1));
console.log(`${results.length - failed.length}/${results.length} browser checks passed`);
process.exit(failed.length ? 1 : 0);
