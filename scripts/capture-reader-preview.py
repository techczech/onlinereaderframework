"""Headless runtime capture using installed Playwright; original apps are not modified."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
from urllib.parse import urlencode

root = Path(__file__).resolve().parents[1]
out = root / 'build' / 'reader-browser-evidence'
out.mkdir(parents=True, exist_ok=True)
books = json.loads((root / 'apps/reader-demo/src/books/original-publications.json').read_text())
results = []
with sync_playwright() as pw:
    shell = max((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'), key=lambda p: int(p.parents[1].name.rsplit('-', 1)[1]))
    browser = pw.chromium.launch(headless=True, executable_path=str(shell))
    try:
        for book in books:
            page = browser.new_page(viewport={'width':1440, 'height':1000}, color_scheme='light')
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto('http://127.0.0.1:8773/?' + urlencode({'book': book['id']}), wait_until='networkidle')
            page.locator('.publication-reader').wait_for()
            page.evaluate('document.fonts.ready')
            page.screenshot(path=str(out / f"{book['id']}-home.png"))
            page.get_by_role('button', name='Start Reading', exact=True).click()
            page.locator('.publication-reader main').wait_for()
            if book['sections'][0].get('children'):
                page.get_by_role('navigation', name='Chapters in this section').get_by_role('button').first.click()
            page.locator('.prose-content').wait_for()
            page.screenshot(path=str(out / f"{book['id']}-reader-desktop.png"))
            entry = {'book':book['id'], 'url':page.url, 'title':page.title(), 'errors':errors, 'buttons':page.get_by_role('button').all_text_contents()[:35], 'content':page.locator('.prose-content').inner_text()[:1000]}
            page.set_viewport_size({'width':390,'height':844})
            page.reload(wait_until='networkidle')
            page.evaluate('document.fonts.ready')
            page.screenshot(path=str(out / f"{book['id']}-reader-mobile.png"))
            entry['horizontalOverflow'] = page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
            results.append(entry)
            print(json.dumps(entry), flush=True)
            page.close()
    finally:
        browser.close()
(out / 'browser-capture.json').write_text(json.dumps(results, indent=2) + '\n')
assert not any(result['errors'] or result['horizontalOverflow'] for result in results), results
