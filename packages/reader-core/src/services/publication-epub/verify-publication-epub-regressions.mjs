import { mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build } from '../../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../../../..');
const scratch = mkdtempSync(resolve(directory, '.epub-regressions-'));
try {
  const bundle = resolve(scratch, 'browser-check.js');
  await build({ entryPoints: [resolve(directory, 'publication-epub-regressions.browser-test.mjs')], bundle: true, format: 'iife', platform: 'browser', outfile: bundle });
  const python = `
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    shells = sorted((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
    browser = p.chromium.launch(headless=True, executable_path=str(shells[-1]) if shells else None)
    try:
        page = browser.new_page()
        requests = []
        page.route('**/*', lambda route: (requests.append(route.request.url), route.abort()))
        page.set_content('<!doctype html><html><body></body></html>')
        page.add_script_tag(path=sys.argv[1])
        results = page.evaluate('window.runPublicationEpubRegressions()')
        print(json.dumps({'checks': results, 'network_requests': requests, 'chromium': browser.version}, indent=2, ensure_ascii=False))
        sys.exit(0 if all(result['passed'] for result in results) and not requests else 1)
    finally:
        browser.close()
`;
  const result = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), ['-c', python, bundle], { stdio: 'inherit', env: { ...process.env, TMPDIR: scratch } });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
