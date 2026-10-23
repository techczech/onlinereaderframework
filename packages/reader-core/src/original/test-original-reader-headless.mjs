/** In-memory source bundle on the existing production origin; no server or build mutations. */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { build } from '../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../../..');
const qrcodeManifest = createRequire(import.meta.url).resolve('qrcode/package.json');
const qrcodeVersion = JSON.parse(readFileSync(qrcodeManifest, 'utf8')).version;
const bundle = await build({
  absWorkingDir: root, metafile: true,
  stdin: { contents: `import { runOriginalReaderBrowserChecks, runOriginalReaderAnnotationChecks } from './test-original-reader-browser.mjs'; import { runOriginalReaderQuoteIdentityChecks } from './test-original-reader-identity-browser.mjs'; window.readerChecks = { runOriginalReaderBrowserChecks, runOriginalReaderAnnotationChecks, runOriginalReaderQuoteIdentityChecks };`, resolveDir: directory },
  alias: { react: resolve(root, 'apps/reader-demo/node_modules/react'), 'react-dom': resolve(root, 'apps/reader-demo/node_modules/react-dom') },
  bundle: true, write: false, format: 'iife', platform: 'browser',
});
const qrcodeSource = resolve(dirname(qrcodeManifest), 'lib/browser.js');
if (!Object.keys(bundle.metafile.inputs).some(file => resolve(root, file) === qrcodeSource)) throw new Error('Browser check must bundle the current core QR-code runtime');
console.log(JSON.stringify({ qrcodeVersion, qrcodeSource }));
const python = String.raw`
import json, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
payload = json.load(sys.stdin)
with sync_playwright() as p:
    shells = sorted((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
    assert shells, 'Bundled headless shell is required; real Chrome is forbidden'
    browser = p.chromium.launch(headless=True, executable_path=str(shells[-1]))
    try:
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        origin = 'http://127.0.0.1:8773'
        response = page.request.get(origin)
        assert response.ok, 'Existing production preview is required on port 8773'
        styles = re.findall(r'<link[^>]*rel="stylesheet"[^>]*>', response.text())
        target = origin + '/__reader_annotation_identity_checks'
        page.route(target, lambda route: route.fulfill(content_type='text/html', body='<!doctype html><html><head>' + ''.join(styles) + '</head><body></body></html>'))
        page.goto(target)
        page.add_script_tag(content=payload['bundle'])
        failed = False
        for name in payload['suites'] or ['runOriginalReaderBrowserChecks', 'runOriginalReaderAnnotationChecks', 'runOriginalReaderQuoteIdentityChecks']:
            try:
                result = page.evaluate('async name => window.readerChecks[name]()', name)
                failures = [item for item in result if not item['pass']] if isinstance(result, list) else []
                failed = failed or bool(failures)
                print(json.dumps({'suite': name, 'checks': len(result), 'failures': failures, 'results': result}, ensure_ascii=True), flush=True)
            except Exception as error:
                failed = True
                print(json.dumps({'suite': name, 'error': str(error)}), flush=True)
        print(json.dumps({'browser': browser.version, 'executable': str(shells[-1]), 'source': 'in-memory current checkout; existing production CSS only'}), flush=True)
    finally:
        browser.close()
sys.exit(1 if failed else 0)
`;
const scratch = mkdtempSync(resolve(directory, '.test-original-reader-headless-'));
try {
  const result = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), ['-c', python], {
    input: JSON.stringify({ bundle: bundle.outputFiles[0].text, suites: process.argv.slice(2) }),
    env: { ...process.env, TMPDIR: scratch, TMP: scratch, TEMP: scratch },
    encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
