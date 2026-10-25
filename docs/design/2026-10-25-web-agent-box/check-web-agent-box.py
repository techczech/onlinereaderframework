"""Browser check of the Ask-an-agent box on the built demo (default http://127.0.0.1:8773): 3 books x classic + 6 front-page layouts at 1440 and 390 px.
Checks containment, public prompt, no private address, local downloads, footer source link absent, licence present, copy (keyboard and click), chapter box.
Usage: ../book-engine/.venv/bin/python check-web-agent-box.py [baseUrl] [screenshotDir]"""
import sys, re, json
from pathlib import Path
from playwright.sync_api import sync_playwright
base = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8773').rstrip('/')
shots = sys.argv[2] if len(sys.argv) > 2 else None
SITES = {'linguistics': 'https://linguistics.dominiklukes.net/', 'deliberate-practice': 'https://deliberatepractice.dominiklukes.net/', 'language-muscle': 'https://buildingyourlanguagemuscle.edutools.fyi/'}
LAYOUTS = ['classic', 'sol-jacket', 'sol-reading-desk', 'sol-open-contents', 'opus-title-contents', 'opus-search-map', 'opus-colour-band']
fails = []; n = 0
def check(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
with sync_playwright() as p:
    shell = sorted((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
    b = p.chromium.launch(executable_path=str(shell))
    for width in (1440, 390):
        page = b.new_page(viewport={'width': width, 'height': 900})
        for book, site in SITES.items():
            for layout in LAYOUTS:
                tag = f'{book}/{layout}/{width}'
                page.goto(f'{base}/?book={book}&frontpage={layout}'); page.wait_for_selector('[data-publication-agent]')
                box = page.locator('[data-publication-agent]').first
                box.scroll_into_view_if_needed()
                r = box.bounding_box(); text = box.inner_text()
                check(r['x'] >= 15 and r['x'] + r['width'] <= width - 15, f'{tag}: box inside margins {r}')
                check(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{tag}: no horizontal overflow')
                check(r['width'] <= 46 * 16 + 1, f'{tag}: compact width')
                prompt = box.locator('.publication-agent-prompt p').inner_text()
                check(site + 'agent/' + book + '/index.md' in prompt, f'{tag}: prompt names its own public address')
                others = [s for k, s in SITES.items() if k != book]
                check(not any(o in text for o in others), f'{tag}: no other book address')
                check(not re.search(r'100\.85|127\.0\.0\.1|localhost|ts\.net|tailscale|hosted at', text + prompt, re.I), f'{tag}: no private host or network warning')
                check(box.locator('.publication-agent-try[open]').count() == 0, f'{tag}: questions closed by default')
                check(box.locator('.publication-agent-prompt p[tabindex]').count() == 0, f'{tag}: prompt text takes no focus rectangle')
                href = box.locator('a[download]').get_attribute('href')
                check(href.startswith(f'{base}/agent/{book}/') or href.startswith(f'agent/{book}/') or href.startswith(f'/agent/{book}/'), f'{tag}: download is local ({href})')
                check(page.evaluate("href => fetch(href).then(r => r.status)", href) == 200, f'{tag}: local full text served')
                check(page.locator('a', has_text='Publication source').count() == 0, f'{tag}: no publication-source footer link')
                check(page.locator('footer a[rel~=license]').count() >= 1 or book != 'deliberate-practice', f'{tag}: licence link kept')
                if width == 1440 and shots and layout in ('classic', 'opus-colour-band'):
                    box.screenshot(path=f'{shots}/{book}-{layout}-{width}-box.png')
                if width == 390 and shots and layout in ('classic', 'opus-colour-band') and book == 'linguistics':
                    page.screenshot(path=f'{shots}/{book}-{layout}-{width}-view.png')
        # copy, keyboard and focus (linguistics classic)
        page.goto(f'{base}/?book=linguistics&frontpage=classic'); page.wait_for_selector('[data-publication-agent]')
        box = page.locator('[data-publication-agent]').first
        btn = box.locator('.publication-agent-prompt button'); btn.focus(); page.keyboard.press('Enter')
        page.wait_for_function("document.querySelector('.publication-agent-status').textContent.length>0")
        s = box.locator('.publication-agent-status').inner_text()
        check(s in ('Prompt copied.', 'Copying is not available here. Select the text and copy it.'), f'copy status {s}')
        outline = btn.evaluate("e => getComputedStyle(e).outlineStyle + ' ' + getComputedStyle(e).outlineWidth")
        check(outline.startswith('solid'), f'copy button keeps a visible keyboard focus outline ({outline})')
        box.locator('.publication-agent-try summary').click()
        check(box.locator('.publication-agent-try li').count() == 3, 'three small question rows after opening')
        box.locator('.publication-agent-try li button').first.click()
        page.wait_for_function("/Prompt and question/.test(document.querySelector('.publication-agent-status').textContent) || /not available/.test(document.querySelector('.publication-agent-status').textContent)")
        if shots and width == 1440: box.screenshot(path=f'{shots}/linguistics-classic-1440-open.png')
        # chapter
        page.goto(f'{base}/?book=linguistics&section=theme-semantics-and-pragmatics'); page.wait_for_timeout(800)
        sec = page.evaluate("document.querySelector('[data-publication-agent]') && document.querySelector('[data-publication-agent]').tagName")
        print(width, 'chapter box:', sec)
        page.close()
    b.close()
print(f'{n} checks, {len(fails)} failures'); sys.exit(1 if fails else 0)
