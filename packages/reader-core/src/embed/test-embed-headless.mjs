/** Embed seam in headless Chromium: real reader, real release `_headers` policy, sandboxed frames and hostile messages. Served by an in-process HTTP
 * server on an ephemeral 127.0.0.1 port (Playwright's route.fulfill skips Chromium's header-level sandbox and framing checks), from in-memory pages only;
 * no build output and no storage outside the browser's temporary profile. Usage: node src/embed/test-embed-headless.mjs (needs dist/reader.css). */
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { build } from '../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../../..');
const alias = { react: resolve(root, 'apps/reader-demo/node_modules/react'), 'react-dom': resolve(root, 'apps/reader-demo/node_modules/react-dom') };
const bundle = async (contents, format = 'iife') => (await build({ absWorkingDir: root, stdin: { contents, resolveDir: directory }, alias, bundle: true, write: false, format, platform: 'browser', logLevel: 'error' })).outputFiles[0].text;

const fixture = await bundle("import * as fixture from './test-embed-fixture-browser.mjs'; window.embedFixture = fixture;");
const child = await bundle("import { startReaderEmbedHeightReporting } from './embed-child.ts'; window.readerEmbedChild = { startReaderEmbedHeightReporting };");
const scratch = mkdtempSync(resolve(directory, '.test-headless-'));
let headers;
try {
  const headerModule = resolve(scratch, 'headers.mjs');
  writeFileSync(headerModule, await bundle("export { securityHeaders } from '../../../../apps/reader-demo/scripts/release/headers.ts';", 'esm'));
  const { securityHeaders } = await import(pathToFileURL(headerModule).href);
  headers = { withEmbeds: securityHeaders({ embedRoot: 'embeds/' }), withoutEmbeds: securityHeaders() };
} finally { rmSync(scratch, { recursive: true, force: true }); }

const python = String.raw`
import json, re, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
payload = json.load(sys.stdin)
results = []
def check(name, actual, expected):
    results.append({'name': name, 'pass': actual == expected, 'actual': actual if actual != expected else None, 'expected': expected if actual != expected else None})

def parse_headers(text):
    rules, current = [], None
    for line in text.splitlines():
        if not line.strip(): continue
        if not line.startswith(' '):
            current = (line.strip(), []); rules.append(current); continue
        entry = line.strip()
        if entry.startswith('! '): current[1].append(('detach', entry[2:].strip().lower(), None))
        else:
            name, value = entry.split(':', 1); current[1].append(('set', name.strip(), value.strip()))
    return rules
def headers_for(rules, path):
    found = {}
    for pattern, entries in rules:
        if not re.fullmatch(re.escape(pattern).replace(r'\*', '.*'), path): continue
        for op, name, value in entries:
            if op == 'detach': found = {k: v for k, v in found.items() if k.lower() != name}
            else: found.setdefault(name, []).append(value)
    return {k: ', '.join(v) for k, v in found.items()}

rules = parse_headers(payload['headers']['withEmbeds'])
site_rules = parse_headers(payload['headers']['withoutEmbeds'])
child = payload['child']
attack = '''
const results = {};
try { results.parentDocument = String(!!parent.document.body); } catch (e) { results.parentDocument = 'blocked'; }
try { localStorage.setItem('embed-probe', '1'); results.storage = 'allowed'; } catch (e) { results.storage = 'blocked'; }
try { document.cookie = 'probe=1'; results.cookie = document.cookie ? 'allowed' : 'blocked'; } catch (e) { results.cookie = 'blocked'; }
try { results.popup = window.open('/popup.html') ? 'opened' : 'blocked'; } catch (e) { results.popup = 'blocked'; }
// Only framed: opened as a full view the document is its own top, and navigating itself is not an attack.
if (window.top !== window) { try { top.location.href = '/hijacked.html'; results.topNavigation = 'no exception'; } catch (e) { results.topNavigation = 'blocked'; } }
results.origin = self.origin;
parent.postMessage({ type: 'reader-embed:height', version: 1, height: 777, extra: 'x' }, '*');
parent.postMessage('{"type":"reader-embed:height","version":1,"height":777}', '*');
parent.postMessage({ type: 'reader-embed:height', version: 1, height: 1e9 }, '*');
parent.postMessage({ type: 'reader-embed:height', version: 1, height: '777' }, '*');
fetch('/embeds/good/data.json').then(() => 'allowed', () => 'blocked').then(value => { results.fetch = value; parent.postMessage({ type: 'fixture:results', results }, '*'); });
'''
pages = {
  '/': '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/reader.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>',
  '/fixture.js': payload['fixture'],
  '/reader.css': Path(payload['css']).read_text(),
  '/embeds/good/index.html': '<!doctype html><html><head><style>body{margin:0;font:16px sans-serif}#tall{height:640px;background:#eef}</style></head><body><button id="node">Decoding</button><div id="tall">Diagram</div><script>' + child + ';readerEmbedChild.startReaderEmbedHeightReporting();' + attack + '</script></body></html>',
  '/embeds/good/data.json': '{}',
  '/embeds/blocked/index.html': '<!doctype html><html><body><script>parent.postMessage({ type: "fixture:loaded" }, "*"); parent.postMessage({ type: "reader-embed:height", version: 1, height: 555 }, "*");</script></body></html>',
  '/embeds/spoof/index.html': '<!doctype html><html><body><script>setInterval(() => parent.postMessage({ type: "reader-embed:height", version: 1, height: 333 }, "*"), 50);</script></body></html>',
  '/popup.html': 'popup', '/hijacked.html': 'hijacked', '/outside.html': 'outside',
}
types = {'.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'}
requests = []
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0].split('#')[0]
        if path not in pages:
            self.send_response(404); self.end_headers(); return
        # The blocked embed is served as if no embed rule existed (site-wide policy only).
        policy = site_rules if path.startswith('/embeds/blocked/') else rules
        suffix = next((s for s in types if path.endswith(s)), '')
        body = pages[path].encode()
        self.send_response(200)
        for name, value in {**headers_for(policy, path), 'Content-Type': types.get(suffix, 'text/html; charset=utf-8')}.items(): self.send_header(name, value)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
base = f'http://127.0.0.1:{server.server_address[1]}'
threading.Thread(target=server.serve_forever, daemon=True).start()

def wait_until(page, expression, timeout=8.0):
    # wait_for_function evaluates strings with eval, which the reader page CSP forbids; poll with evaluate instead.
    deadline = time.time() + timeout
    while time.time() < deadline:
        if page.evaluate(expression): return True
        time.sleep(0.05)
    raise AssertionError('timed out waiting for ' + expression)
def frames_of(snapshot, embed): return [frame for frame in snapshot['frames'] if frame['embed'] == embed]
with sync_playwright() as p:
    shells = sorted((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
    assert shells, 'Bundled headless shell is required'
    browser = p.chromium.launch(headless=True, executable_path=str(shells[-1]))
    try:
        for width in [1280, 375]:
            context = browser.new_context(viewport={'width': width, 'height': 900})
            page = context.new_page()
            page.on('request', lambda request: requests.append(request.url))
            page.set_default_timeout(8000)
            warnings, errors, popups = [], [], []
            page.on('console', lambda message: (warnings if message.type == 'warning' else errors if message.type == 'error' else []).append(message.text))
            context.on('page', lambda opened: popups.append(opened.url))
            page.goto(base + '/?section=cognition')
            page.evaluate('embedFixture.mount()')
            page.wait_for_selector('[data-publication-embed="good"] iframe')
            page.evaluate('embedFixture.addSpoofFrame()')
            wait_until(page, 'embedFixture.snapshot().seen.some(m => m.data && m.data.type === "fixture:results")')
            wait_until(page, '(() => { const f = document.querySelector(\'[data-publication-embed="good"] iframe\'); return !!f && Math.round(f.getBoundingClientRect().height) !== 300; })()')
            time.sleep(0.6)
            s = page.evaluate('embedFixture.snapshot()')
            label = f'{width}px: '
            good = frames_of(s, 'good')
            check(label + 'exactly the two valid descriptors produce frames; manuscript iframe and refused descriptors produce none', sorted(f['embed'] or 'manuscript' for f in s['frames']), ['blocked', 'good'])
            check(label + 'manuscript script never ran', s['bad'], False)
            check(label + 'refused descriptors are reported', any('embeds refused' in w and 'outside' in w and 'remote' in w for w in warnings), True)
            g = good[0] if good else {}
            check(label + 'sandbox is scripts only', g.get('sandbox'), 'allow-scripts')
            check(label + 'powerful features denied', all(f"{feature} 'none'" in (g.get('allow') or '') for feature in ['camera', 'microphone', 'geolocation', 'fullscreen', 'clipboard-read']), True)
            check(label + 'no referrer', g.get('referrer'), 'no-referrer')
            check(label + 'accessible title', g.get('title'), 'Cognition Explorer: interactive diagram')
            check(label + 'frame is placed before its prose alternative', g.get('nextId'), 'reader-content-explorer-text')
            check(label + 'src resolved on the page origin inside the embed folder', g.get('src'), base + '/embeds/good/index.html')
            check(label + 'height follows the embed document, not spoofed (333) or malformed (777) values', round(g.get('height', 0)) in range(640, 700), True)
            results.append({'name': label + 'observed frame height (record only)', 'pass': True, 'observed': round(g.get('height', 0))})
            check(label + 'blocked frame keeps its initial height', round(frames_of(s, 'blocked')[0]['height']) if frames_of(s, 'blocked') else None, 480)
            check(label + 'site-wide frame policy blocks an embed served without the embed rule', any(m['from'] == 'blocked' for m in s['seen']), False)
            check(label + 'spoof frame messages reached the page but changed nothing', any(m['from'] == 'spoof' for m in s['seen']), True)
            probe = next((m['data']['results'] for m in s['seen'] if isinstance(m['data'], dict) and m['data'].get('type') == 'fixture:results'), {})
            check(label + 'embed origin is opaque', probe.get('origin'), 'null')
            check(label + 'embed messages arrive with origin "null"', all(m['origin'] == 'null' for m in s['seen'] if m['from'] == 'good'), True)
            check(label + 'embed cannot reach the reader DOM', probe.get('parentDocument'), 'blocked')
            check(label + 'embed cannot use storage', probe.get('storage'), 'blocked')
            check(label + 'embed cannot set cookies', probe.get('cookie'), 'blocked')
            check(label + 'embed cannot open popups', probe.get('popup'), 'blocked')
            check(label + 'embed network blocked by embed CSP', probe.get('fetch'), 'blocked')
            check(label + 'no popup page opened', popups, [])
            check(label + 'reader page was not navigated by the embed', s['location'], base + '/?section=cognition')
            check(label + 'no request left the fixture origin', [u for u in requests if not u.startswith(base + '/') and not u.startswith('data:')], [])
            check(label + 'no request for refused paths', [u for u in requests if 'outside.html' in u or 'evil.test' in u or 'popup.html' in u or 'hijacked.html' in u], [])
            text = s['text']
            check(label + 'text model keeps the prose alternative', 'decoding turns letters into words' in text, True)
            check(label + 'text model excludes frame chrome', any(word in text for word in ['Skip to text version', 'Open full view', 'Cognition Explorer: interactive diagram', 'Select a node.']), False)
            check(label + 'forged manuscript chrome stays in the text model', 'Forged chrome stays readable.' in text, True)
            links = [l for l in s['links'] if l['text'].startswith('Open full view')]
            check(label + 'full view link opens a new tab without opener or referrer', (links[0]['target'], links[0]['rel'], links[0]['href']) if links else None, ('_blank', 'noopener noreferrer', base + '/embeds/good/index.html'))
            check(label + 'frame fills the text column', abs(g.get('width', 0) - s['contentWidth']) <= 2, True)
            check(label + 'frame causes no horizontal page overflow', s['scrollWidth'] <= s['viewport'], True)
            skip = page.locator('[data-publication-embed="good"] a', has_text='Skip to text version')
            skip.focus()
            page.keyboard.press('Enter')
            page.wait_for_timeout(300)
            check(label + 'keyboard skip link moves focus to the text version', page.evaluate('embedFixture.snapshot().focusedId'), 'reader-content-explorer-text')
            page.evaluate('embedFixture.unmount()')
            check(label + 'every message listener added by the reader is removed on unmount', page.evaluate('embedFixture.snapshot().activeMessageListeners'), 0)
            context.close()
        context = browser.new_context(viewport={'width': 800, 'height': 600})
        page = context.new_page()
        response = page.goto(base + '/embeds/good/index.html')
        check('full view: response carries the embed policy and no frame denial', (response.headers.get('content-security-policy', '').startswith('sandbox allow-scripts;'), 'x-frame-options' in response.headers), (True, False))
        page.wait_for_timeout(300)
        check('full view: page stayed on the embed', page.url, base + '/embeds/good/index.html')
        check('full view: the embed CSP sandbox keeps a direct top-level open opaque', page.evaluate('self.origin'), 'null')
        check('full view: storage of the reader origin is unreachable', page.evaluate('(() => { try { localStorage.length; return "allowed"; } catch (e) { return "blocked"; } })()'), 'blocked')
        context.close()
    finally:
        browser.close()
        server.shutdown()
print(json.dumps(results, indent=1))
sys.exit(0 if results and all(r['pass'] for r in results) else 1)
`;
const result = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), ['-c', python], {
  input: JSON.stringify({ fixture, child, headers, css: resolve(root, 'packages/reader-core/dist/reader.css') }), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
});
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
const parsed = (() => { try { return JSON.parse(result.stdout); } catch { return []; } })();
console.log(`embed browser checks: ${parsed.filter(r => r.pass).length}/${parsed.length} pass`);
process.exitCode = result.status ?? 1;
