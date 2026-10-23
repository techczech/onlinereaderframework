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
  stdin: { contents: `import { runOriginalReaderBrowserChecks, runOriginalReaderAnnotationChecks, runOriginalReaderMathMLChecks, mountOriginalReaderSelectionFixture, originalReaderSelectionSnapshot } from './test-original-reader-browser.mjs'; import { runOriginalReaderQuoteIdentityChecks } from './test-original-reader-identity-browser.mjs'; window.readerChecks = { runOriginalReaderBrowserChecks, runOriginalReaderAnnotationChecks, runOriginalReaderMathMLChecks, runOriginalReaderQuoteIdentityChecks, mountOriginalReaderSelectionFixture, originalReaderSelectionSnapshot };`, resolveDir: directory },
  alias: { react: resolve(root, 'apps/reader-demo/node_modules/react'), 'react-dom': resolve(root, 'apps/reader-demo/node_modules/react-dom') },
  bundle: true, write: false, format: 'iife', platform: 'browser',
});
const qrcodeSource = resolve(dirname(qrcodeManifest), 'lib/browser.js');
if (!Object.keys(bundle.metafile.inputs).some(file => resolve(root, file) === qrcodeSource)) throw new Error('Browser check must bundle the current core QR-code runtime');
console.log(JSON.stringify({ qrcodeVersion, qrcodeSource }));
const python = String.raw`
import json, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
payload = json.load(sys.stdin)
with sync_playwright() as p:
    shells = sorted((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
    assert shells, 'Bundled headless shell is required; real Chrome is forbidden'
    browser = p.chromium.launch(headless=True, executable_path=str(shells[-1]))
    try:
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.set_default_timeout(10000)
        origin = 'http://127.0.0.1:8773'
        response = page.request.get(origin)
        assert response.ok, 'Existing production preview is required on port 8773'
        styles = re.findall(r'<link[^>]*rel="stylesheet"[^>]*>', response.text())
        target = origin + '/__reader_annotation_identity_checks'
        page.route(target + '**', lambda route: route.fulfill(content_type='text/html', body='<!doctype html><html><head>' + ''.join(styles) + '</head><body></body></html>'))
        page.goto(target)
        page.add_script_tag(content=payload['bundle'])
        def selection_checks():
            results = []
            key = 'publication-reader:reader-mathml-selection-check:highlights'
            def check(name, actual, expected):
                results.append({'name': name, 'actual': actual, 'expected': expected, 'pass': actual == expected})
                if actual != expected:
                    print(json.dumps({'regressionFailure': results[-1]}), flush=True)
            def stored():
                return page.evaluate('key => JSON.parse(localStorage.getItem(key) || "[]")', key)
            cases = [
                ('simple', 'Simple maths', 'Before x after.', None, None),
                ('rich', 'Rich maths', 'İ 😀 Before bold x+1 and linked after.', 'bold', 'https://example.test'),
                ('ordinary', 'Ordinary markup', 'Working memory and a link boundary', 'memory', 'https://example.test'),
                ('math-only', 'Maths only', 'x', None, None),
            ]
            page.evaluate('localStorage.clear()')
            for section, title, quote, strong, link in cases:
                page.goto(target + '?book=reader-mathml-selection-check&section=' + section)
                page.add_script_tag(content=payload['bundle'])
                page.evaluate('window.readerChecks.mountOriginalReaderSelectionFixture()')
                content = page.locator('[data-publication-content]')
                content.wait_for()
                page.evaluate('document.fonts.ready')
                content.locator('p').first.scroll_into_view_if_needed()
                page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                before = page.evaluate('window.readerChecks.originalReaderSelectionSnapshot()')
                native = content.evaluate("""(root, quote) => {
                    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
                    const nodes = []; let node;
                    while ((node = walk.nextNode())) {
                        if (!node.parentElement.closest('annotation, annotation-xml, mphantom')) nodes.push(node);
                    }
                    const full = nodes.map(node => node.data).join('');
                    const start = full.indexOf(quote); if (start < 0) throw new Error('Fixture quote missing');
                    const range = document.createRange(); let offset = 0;
                    for (const node of nodes) {
                        if (start >= offset && start < offset + node.length) range.setStart(node, start - offset);
                        if (start + quote.length > offset && start + quote.length <= offset + node.length) {
                            range.setEnd(node, start + quote.length - offset); break;
                        }
                        offset += node.length;
                    }
                    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
                    return { selection: selection.toString(), range: range.toString() };
                }""", quote)
                page.get_by_title('Save Highlight (h)', exact=True).wait_for()
                page.get_by_title('Save Highlight (h)', exact=True).click()
                note = page.get_by_role('textbox', name='Note on ' + title, exact=True)
                note.fill('Saved note for ' + section)
                expect(note).to_have_value('Saved note for ' + section)
                page.wait_for_function('([key, section]) => JSON.parse(localStorage.getItem(key)).some(h => h.sectionId === section && h.note === "Saved note for " + section)', arg=[key, section])
                highlight = next(h for h in stored() if h['sectionId'] == section)
                check(section + ': actual Highlight button persists canonical quotation', highlight['text'], quote)
                results[-1]['native'] = native
                check(section + ': note is persisted by React input', highlight['note'], 'Saved note for ' + section)
                def inspect(stage):
                    page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                    after = page.evaluate('window.readerChecks.originalReaderSelectionSnapshot()')
                    check(section + ': ' + stage + ' preserves formula and annotation tree', after['math'], before['math'])
                    check(section + ': ' + stage + ' contains no foreign HTML in MathML', after['foreignMath'], [])
                    check(section + ': ' + stage + ' preserves canonical visible text', after['text'], before['text'])
                    check(section + ': ' + stage + ' decorates the exact quotation', after['paintedText'], quote)
                    check(section + ': ' + stage + ' preserves formula dimensions', after['mathGeometry'], before['mathGeometry'])
                    marks = after['decorated']
                    check(section + ': ' + stage + ' paints restored quotation yellow', bool(marks) and all(m['width'] > 0 and m['height'] > 0 and m['color'] != 'rgba(0, 0, 0, 0)' for m in marks), True)
                    check(section + ': ' + stage + ' retains bold and link source', [after['strong'], after['link']], [strong, link])
                    check(section + ': ' + stage + ' shows margin note', page.locator('.publication-margin-note').filter(has_text='Saved note for ' + section).count() > 0, True)
                inspect('initial save')
                page.get_by_role('button', name='Close notes', exact=True).click()
                # Real reader navigation away, then the persisted note navigates back.
                if section == 'math-only':
                    page.get_by_role('button', name=re.compile(r'^Previous\s+Ordinary markup$')).click()
                else:
                    page.get_by_role('button', name=re.compile(r'^Next\s+')).click()
                page.get_by_role('button', name=re.compile(r'Notes & Highlights$')).click()
                page.get_by_role('textbox', name='Note on ' + title, exact=True).locator('xpath=../../..').get_by_role('button', name=title, exact=True).click()
                page.wait_for_function('section => new URL(location.href).searchParams.get("section") === section', arg=section)
                content.wait_for()
                check(section + ': note navigation includes canonical quote', page.evaluate('new URL(location.href).searchParams.get("text")'), quote)
                inspect('note navigation')
                page.reload()
                page.add_script_tag(content=payload['bundle'])
                page.evaluate('window.readerChecks.mountOriginalReaderSelectionFixture()')
                content.wait_for()
                page.evaluate('document.fonts.ready')
                inspect('full page reload')
                page.get_by_role('button', name=re.compile(r'Notes & Highlights$')).click()
                expect(page.get_by_role('textbox', name='Note on ' + title, exact=True)).to_have_value('Saved note for ' + section)
                check(section + ': full reload restores saved note input', True, True)
            return results
        failed = False
        for name in payload['suites'] or ['runOriginalReaderBrowserChecks', 'runOriginalReaderAnnotationChecks', 'runOriginalReaderMathMLChecks', 'runOriginalReaderQuoteIdentityChecks', 'runOriginalReaderSelectionChecks']:
            try:
                result = selection_checks() if name == 'runOriginalReaderSelectionChecks' else page.evaluate('async name => window.readerChecks[name]()', name)
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
