"""Exercise installed-package output with a temporary loopback server and bundled headless Chromium."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright
import json

root = Path(__file__).resolve().parents[1]
output = root / 'build/reader-browser-evidence'
output.mkdir(parents=True, exist_ok=True)
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(root / 'build/packaged-consumer-dist')))
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
results = {}
try:
    with sync_playwright() as pw:
        shell = max((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'), key=lambda p:int(p.parents[1].name.rsplit('-',1)[1]))
        browser = pw.chromium.launch(headless=True, executable_path=str(shell))
        try:
            page = browser.new_page(viewport={'width':1440,'height':1000})
            errors, external = [], []
            page.on('pageerror', lambda error:errors.append(str(error)))
            page.on('request', lambda request:external.append(request.url) if not request.url.startswith(f'http://127.0.0.1:{server.server_port}/') else None)
            base = f'http://127.0.0.1:{server.server_port}/'
            page.goto(base, wait_until='networkidle')
            page.get_by_role('button', name='Start Reading', exact=True).click()
            page.get_by_role('heading', name='Rich content', exact=True).wait_for()
            page.evaluate('document.fonts.ready')
            assert page.locator('.prose-content table').count() == 1
            assert page.locator('.prose-content strong').inner_text() == 'working memory'
            styles = page.locator('.prose-content').evaluate('(el)=>({font:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize})')
            assert 'Merriweather' in styles['font'], styles
            loaded_fonts = page.evaluate('Array.from(document.fonts).filter(f=>f.status==="loaded").map(f=>f.family)')
            assert any('Merriweather' in name for name in loaded_fonts)
            assert any('Inter' in name for name in loaded_fonts)
            page.screenshot(path=str(output / 'installed-package-reader-desktop.png'))
            page.set_viewport_size({'width':390,'height':844})
            page.reload(wait_until='networkidle')
            page.get_by_role('button', name='Open navigation', exact=True).click()
            page.get_by_role('button', name='Close navigation', exact=True).click()
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            page.screenshot(path=str(output / 'installed-package-reader-mobile.png'))
            assert not errors, errors
            assert not external, external
            results = {'result':'passed','styles':styles,'loadedFontFamilies':sorted(set(loaded_fonts)),'pageErrors':errors,'externalRequests':external,'mobileNavigation':'opened and closed','mobileHorizontalOverflow':False}
        finally:
            browser.close()
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)
(output / 'installed-package-browser.json').write_text(json.dumps(results, indent=2)+'\n')
print(json.dumps(results))
