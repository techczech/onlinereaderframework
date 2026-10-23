"""Check each installed tarball bundle using only Playwright's bundled headless shell."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlparse, parse_qs
import importlib.metadata
import json
import re
import sys
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--react-version', required=True, choices=['18.3.1', '19.2.0'])
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
metadata = json.loads((root / f'build/evidence-reader-package-react-{args.react_version}.json').read_text())
dist = root / metadata['browserDist']
output = root / f'build/reader-react-{args.react_version}-browser'
output.mkdir(parents=True, exist_ok=True)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(dist)))
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
results = {'result': 'failed', 'reactVersion': args.react_version, 'tarballSha256': metadata['sha256'],
           'python': sys.version.split()[0], 'playwright': importlib.metadata.version('playwright')}
try:
    with sync_playwright() as pw:
        shell = max((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'), key=lambda p: int(p.parents[1].name.rsplit('-', 1)[1]))
        browser = pw.chromium.launch(headless=True, executable_path=str(shell))
        try:
            results.update({'browser': browser.version, 'executable': str(shell)})
            context = browser.new_context(viewport={'width': 1440, 'height': 1000}, permissions=['clipboard-read', 'clipboard-write'])
            page = context.new_page()
            page.set_default_timeout(10000)
            errors, console_errors, external, failed_requests, bad_responses = [], [], [], [], []
            base = f'http://127.0.0.1:{server.server_port}/'
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
            page.on('request', lambda request: external.append(request.url) if not request.url.startswith(base) and not request.url.startswith(('data:', 'blob:')) else None)
            page.on('requestfailed', lambda request: failed_requests.append(request.url))
            page.on('response', lambda response: bad_responses.append({'url': response.url, 'status': response.status}) if response.status >= 400 else None)
            page.goto(base, wait_until='networkidle')
            page.get_by_role('button', name='Start Reading', exact=True).click()
            page.get_by_role('heading', name='Rich content', exact=True).wait_for()
            page.evaluate('document.fonts.ready')
            assert page.locator('.prose-content table').count() == 1
            expect(page.locator('.prose-content strong')).to_have_text('working memory')
            styles = page.locator('.prose-content').evaluate('(el) => ({font: getComputedStyle(el).fontFamily, size: getComputedStyle(el).fontSize})')
            assert 'Merriweather' in styles['font'], styles
            loaded_fonts = page.evaluate('Array.from(document.fonts).filter(f => f.status === "loaded").map(f => f.family)')
            assert any('Merriweather' in name for name in loaded_fonts)
            assert any('Inter' in name for name in loaded_fonts)

            # Exercise real selection, state updates, persisted notes and clipboard sharing.
            page.locator('.prose-content strong').select_text()
            page.get_by_title('Save Highlight (h)', exact=True).click()
            note = page.get_by_role('textbox', name='Note on Introduction', exact=True)
            note.fill(f'Persisted with React {args.react_version}.')
            page.get_by_title('Copy Link to Highlight', exact=True).click()
            expect(page.get_by_text('Link copied!', exact=True)).to_be_visible()
            shared = page.evaluate('navigator.clipboard.readText()')
            shared_query = parse_qs(urlparse(shared).query)
            assert shared_query['book'] == ['package-verification']
            assert shared_query['section'] == ['introduction']
            assert shared_query['text'] == ['working memory']
            page.get_by_title('Share as Image', exact=True).click()
            quote = page.get_by_role('dialog', name='Share quote', exact=True)
            image = quote.locator('img')
            expect(image).to_be_visible()
            assert image.get_attribute('src').startswith('data:image/png;base64,')
            expect(quote.get_by_role('link', name='Download')).to_have_attribute('download', 'package-verification-quote.png')
            page.get_by_role('button', name='Close quote sharing', exact=True).click()
            page.reload(wait_until='networkidle')
            page.get_by_role('button', name=re.compile(r'Notes & Highlights$')).click()
            expect(note).to_have_value(f'Persisted with React {args.react_version}.')
            assert page.locator('[data-publication-highlight]').count() >= 1
            page.get_by_role('button', name='Close notes', exact=True).click()
            page.get_by_role('button', name=re.compile(r'^Next\s+Next section')).click()
            page.get_by_role('heading', name='Second chapter', exact=True).wait_for()
            assert parse_qs(urlparse(page.url).query)['section'] == ['next-section']
            page.get_by_title('Copy Link to Page (l)', exact=True).click()
            expect(page.get_by_text('Link copied!', exact=True)).to_be_visible()
            shared_page = parse_qs(urlparse(page.evaluate('navigator.clipboard.readText()')).query)
            assert shared_page['section'] == ['next-section'] and 'text' not in shared_page
            page.screenshot(path=str(output / 'publication-reader-desktop.png'))
            page.set_viewport_size({'width': 390, 'height': 844})
            page.reload(wait_until='networkidle')
            page.get_by_role('heading', name='Second chapter', exact=True).wait_for()
            page.get_by_role('button', name='Open navigation', exact=True).click()
            page.get_by_role('button', name='Close navigation', exact=True).click()
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            page.screenshot(path=str(output / 'publication-reader-mobile.png'))

            page.set_viewport_size({'width': 1440, 'height': 1000})
            page.goto(base + '?legacy=1', wait_until='networkidle')
            expect(page.get_by_text('Legacy consumer content.', exact=True)).to_be_visible()
            page.get_by_role('button', name='Legacy next section', exact=True).click()
            page.get_by_role('heading', name='Legacy second chapter', exact=True).wait_for()
            assert not errors, errors
            assert not console_errors, console_errors
            assert not external, external
            assert not failed_requests, failed_requests
            assert not bad_responses, bad_responses
            results.update({'result': 'passed', 'strictMode': True, 'styles': styles,
                            'loadedFontFamilies': sorted(set(loaded_fonts)), 'pageErrors': errors,
                            'consoleErrors': console_errors, 'externalRequests': external,
                            'failedRequests': failed_requests, 'badResponses': bad_responses,
                            'publicationReader': ['rich content', 'real text selection', 'saved highlight',
                                                  'note edit and reload persistence', 'highlight clipboard link',
                                                  'QR quote PNG generation', 'section navigation and reload',
                                                  'page clipboard link', 'mobile navigation and no overflow'],
                            'legacyReaderShell': ['render', 'section navigation']})
        except Exception:
            results['failureUrl'] = page.url
            results['failureButtons'] = page.locator('button').all_text_contents()
            page.screenshot(path=str(output / 'failure-reader-react-browser.png'))
            raise
        finally:
            browser.close()
except Exception as error:
    results['error'] = str(error)
    raise
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)
    (output / 'evidence-reader-react-browser.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results))
