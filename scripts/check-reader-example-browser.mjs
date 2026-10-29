/** Private release check (not exported): builds examples/reader-example with and without embeds, serves each build with its own preview server
 * (the `_headers` policies) on an ephemeral 127.0.0.1 port, and drives it in Playwright's bundled chrome-headless-shell (never an installed Chrome).
 * Writes results JSON to the path given with --out (inside docs/). A failing check exits 1; nothing is relabelled.
 * Usage: node scripts/check-reader-example-browser.mjs --out docs/release-reader-v1-1-2026-10-29/check-example-browser.json */
import { spawn, spawnSync } from 'node:child_process';
import { lstatSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const example = resolve(root, 'examples/reader-example');
const at = process.argv.indexOf('--out');
const out = resolve(root, at < 0 ? '' : process.argv[at + 1] ?? '');
const rel = relative(resolve(root, 'docs'), out);
if (at < 0 || rel.startsWith('..') || !rel.endsWith('.json')) throw new Error('--out must name a .json file inside docs/');
for (let path = dirname(out); path !== root; path = dirname(path)) if (lstatSync(path).isSymbolicLink()) throw new Error('linked output folder');
const python = resolve(root, '../book-engine/.venv/bin/python');

const driver = String.raw`
import json, sys, zipfile, io
from pathlib import Path
from playwright.sync_api import sync_playwright
payload = json.load(sys.stdin)
base, embeds = payload['base'], payload['embeds']
results = []
def check(name, ok, detail=None): results.append({'name': name, 'pass': bool(ok), 'detail': detail})
ALT = 'Text version of the interactive example.'
with sync_playwright() as p:
    shells = sorted((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
    assert shells, 'bundled headless shell is required'
    browser = p.chromium.launch(headless=True, executable_path=str(shells[-1]))
    check('browser is bundled chrome-headless-shell', 'ms-playwright/chromium_headless_shell' in str(shells[-1]), shells[-1].parent.parent.name)
    try:
        for width in [1280, 375]:
            context = browser.new_context(viewport={'width': width, 'height': 900}, accept_downloads=True)
            page = context.new_page()
            page.set_default_timeout(10000)
            errors, requests, popups = [], [], []
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('request', lambda r: requests.append(r.url))
            page.on('popup', lambda o: popups.append(o.url))  # windows the reader or a frame opens; the checker's own full-view tab is not one
            page.goto(base + '/')
            page.get_by_role('heading', name='A Short Tour of the Reader').first.wait_for()
            check(f'{width}: home shows the book title', True)
            if width == 1280:
                with page.expect_download() as info: page.get_by_role('button', name='Download eBook').click()
                download = info.value
                data = Path(download.path()).read_bytes()
                archive = zipfile.ZipFile(io.BytesIO(data))
                names = archive.namelist()
                text = ' '.join(archive.read(n).decode('utf8', 'ignore') for n in names if n.endswith('.xhtml'))
                check('EPUB download is a valid-looking EPUB with the text version and no frame', names[0] == 'mimetype' and archive.read('mimetype') == b'application/epub+zip' and ALT in text and '<iframe' not in text, {'file': download.suggested_filename, 'bytes': len(data), 'entries': len(names)})
                link = page.locator('a[href*="agent/reader-example"]').first
                href = link.get_attribute('href') if link.count() else None
                status = page.request.get(href if href and href.startswith('http') else base + '/' + (href or '').lstrip('./')).status if href else None
                check('agent files are linked from the reader and served', href is not None and status == 200, {'href': href, 'status': status})
            page.goto(base + '/?section=line-spacing')
            page.get_by_text(ALT).wait_for()
            check(f'{width}: text version is visible', True)
            for name in ['Listen', 'Formatting', 'Assist', 'Notes']:
                check(f'{width}: toolbar control {name}', page.get_by_role('button', name=name).count() >= 1)
            frames = page.locator('iframe')
            if embeds:
                frames.first.wait_for()
                attrs = frames.first.evaluate("f => ({sandbox: f.getAttribute('sandbox'), src: f.getAttribute('src'), title: f.getAttribute('title'), referrer: f.getAttribute('referrerpolicy'), allow: f.getAttribute('allow')})")
                check(f'{width}: one frame, sandbox allow-scripts only, same-origin embeds/ address', frames.count() == 1 and attrs['sandbox'] == 'allow-scripts' and attrs['src'].startswith(base + '/embeds/line-spacing.html') and attrs['referrer'] == 'no-referrer', attrs)
                page.wait_for_function("() => { const f = document.querySelector('iframe'); return f && f.getBoundingClientRect().height > 250; }")
                frame = page.frame_locator('iframe')
                frame.get_by_label('Line spacing').fill('2.2')
                height = frames.first.evaluate('f => Math.round(f.getBoundingClientRect().height)')
                check(f'{width}: frame grew from 240 px to the height the embed reported', 250 < height <= 900, height)
                inner = [f for f in page.frames if f.url.endswith('/embeds/line-spacing.html')][0]
                probe = inner.evaluate("""() => { const r = { origin: self.origin, lineHeight: document.getElementById('sample').style.lineHeight };
                  for (const [k, fn] of Object.entries({ storage: () => localStorage.length, cookie: () => document.cookie, parent: () => parent.document.title })) {
                    try { fn(); r[k] = 'allowed'; } catch (e) { r[k] = 'blocked'; } }
                  return r; }""")
                check(f'{width}: frame has an opaque origin and no storage, cookies or parent DOM', probe['origin'] == 'null' and probe['storage'] == 'blocked' and probe['cookie'] == 'blocked' and probe['parent'] == 'blocked' and probe['lineHeight'] == '2.2', probe)
                overflow = page.evaluate('document.documentElement.scrollWidth - innerWidth')
                check(f'{width}: no horizontal page overflow', overflow <= 0, overflow)
                full = context.new_page()
                response = full.goto(base + '/embeds/line-spacing.html')
                direct = full.evaluate("() => { let s; try { localStorage.length; s = 'allowed'; } catch (e) { s = 'blocked'; } return { origin: self.origin, storage: s }; }")
                check(f'{width}: full view opened directly stays sandboxed by the response header', response.status == 200 and 'sandbox allow-scripts' in response.headers.get('content-security-policy', '') and direct == {'origin': 'null', 'storage': 'blocked'}, direct)
                full.close()
            else:
                check(f'{width}: build without embeds shows no frame', frames.count() == 0)
                check(f'{width}: build without embeds serves no embed document', page.request.get(base + '/embeds/line-spacing.html').status == 404)
            outside = sorted({u for u in requests if not u.startswith(base) and not u.startswith('data:') and not u.startswith('blob:')})
            check(f'{width}: no requests outside the preview origin', not outside, outside)
            check(f'{width}: no console errors', not errors, errors)
            check(f'{width}: no popups', not popups, popups)
            context.close()
    finally:
        browser.close()
print(json.dumps(results))
`;

async function runMode(withEmbeds) {
  const built = spawnSync(process.execPath, ['build.mjs', ...(withEmbeds ? [] : ['--without-embeds'])], { cwd: example, encoding: 'utf8' });
  if (built.status !== 0) throw new Error(`example build failed: ${built.stderr}`);
  const { createPreviewServer } = await import(pathToFileURL(resolve(example, 'serve.mjs')).href);
  const server = createPreviewServer(resolve(example, 'dist'));
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const child = spawn(python, ['-c', driver], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.stdin.end(JSON.stringify({ base, embeds: withEmbeds }));
    const code = await new Promise(done => child.on('close', done));
    if (code !== 0) return [{ name: `${withEmbeds ? 'with' : 'without'} embeds: driver`, pass: false, detail: stderr.split(base).join('[preview]').slice(-3000) }];
    return JSON.parse(stdout.trim().split('\n').at(-1)).map(result => ({ ...result, name: `${withEmbeds ? 'with' : 'without'} embeds: ${result.name}` }));
  } finally { await new Promise(done => server.close(done)); }
}

const results = [...await runMode(true), ...await runMode(false)];
// Leave the default build (with embeds) in dist/.
spawnSync(process.execPath, ['build.mjs'], { cwd: example, stdio: 'ignore' });
const failed = results.filter(result => !result.pass);
writeFileSync(out, JSON.stringify({ date: new Date().toISOString(), node: process.version, passed: results.length - failed.length, failed: failed.length, results }, null, 2) + '\n');
console.log(`${results.length - failed.length}/${results.length} browser checks passed${failed.length ? '; FAILED: ' + failed.map(f => f.name).join('; ') : ''}`);
process.exitCode = failed.length ? 1 : 0;
