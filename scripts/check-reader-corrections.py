"""Verify the author-reported book identity, navigation and desktop measure regressions."""
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright, expect
import json

root = Path(__file__).resolve().parents[1]
out = root / 'docs/design/2026-10-24-reader-corrections/verification'
out.mkdir(parents=True, exist_ok=True)
books = json.loads((root / 'apps/reader-demo/src/books/original-publications.json').read_text())
results = {'checks': [], 'errors': []}
base = 'http://127.0.0.1:8773/'

def check(name, condition, detail=None):
    results['checks'].append({'name': name, 'passed': bool(condition), 'detail': detail})

with sync_playwright() as pw:
    shell = max((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'), key=lambda p: int(p.parents[1].name.rsplit('-', 1)[1]))
    browser = pw.chromium.launch(headless=True, executable_path=str(shell))
    try:
        for book in books:
            context = browser.new_context(viewport={'width': 1440, 'height': 1000}, color_scheme='light')
            page = context.new_page()
            page.on('pageerror', lambda error: results['errors'].append(str(error)))
            page.goto(base + '?' + urlencode({'book': book['id']}), wait_until='networkidle')
            page.evaluate('document.fonts.ready')
            cover = page.locator('img[src*="/covers/"]').first
            check(book['id'] + ' cover loaded', cover.count() == 1 and cover.evaluate('(img) => img.complete && img.naturalWidth > 0'))
            check(book['id'] + ' neutral search label', page.get_by_role('button', name='Search', exact=True).count() > 0)
            check(book['id'] + ' contents label', page.get_by_role('heading', name='Table of contents', exact=True).count() > 0)
            def count_tree(nodes, depth):
                return sum(1 + (count_tree(n.get('children', []), depth - 1) if depth > 1 else 0) for n in nodes)
            check(book['id'] + ' automatic home contents', page.locator('.publication-home-contents button').count() == count_tree(book['sections'], 2))
            page.screenshot(path=str(out / (book['id'] + '-home-desktop.png')))
            context.close()
        linguistics = next(book for book in books if book['id'] == 'linguistics')
        section = next(section for group in linguistics['sections'] for section in group.get('children', []) if 'Costello' in section['title'])
        for width in [1440, 1920, 1024, 390]:
            context = browser.new_context(viewport={'width': width, 'height': 1000}, color_scheme='light')
            page = context.new_page()
            page.on('pageerror', lambda error: results['errors'].append(str(error)))
            page.goto(base + '?' + urlencode({'book': 'linguistics', 'section': section['id']}), wait_until='networkidle')
            article = page.locator('[data-publication-content]').first
            article.wait_for()
            box = article.bounding_box()
            check(str(width) + ' article visible', box and box['width'] > 0, box)
            if width >= 1440:
                check(str(width) + ' desktop article width', box['width'] >= 560, box)
            check(str(width) + ' no horizontal overflow', page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
            check(str(width) + ' no repeated local chapter title', page.locator('#toc-container').get_by_text(section['title'], exact=True).count() == 0)
            page.screenshot(path=str(out / ('linguistics-article-' + str(width) + '.png')))
            context.close()
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, color_scheme='light')
        page = context.new_page()
        page.goto(base + '?' + urlencode({'book': 'linguistics', 'section': section['id']}), wait_until='networkidle')
        article = page.locator('[data-publication-content]').first
        original_text = article.inner_text()
        settings = page.get_by_role('button', name='Reading settings', exact=True)
        settings.click()
        dialog = page.get_by_role('dialog')
        page.get_by_label('Text size', exact=True).fill('26')
        page.get_by_label('Typeface', exact=True).select_option('sans')
        page.get_by_label('Reading overlay', exact=True).select_option('line-window')
        dialog.screenshot(path=str(out / 'reading-settings.png'))
        page.get_by_role('button', name='Close reading settings', exact=True).click()
        check('numeric text size applied', article.evaluate('(el) => getComputedStyle(el).fontSize') == '26px')
        check('sans serif applied', 'Inter' in article.evaluate('(el) => getComputedStyle(el).fontFamily'))
        check('line window active', page.locator('.reading-support-surface').get_attribute('data-rs-overlay') == 'line-window')
        check('settings do not change content', article.inner_text() == original_text)
        settings.click()
        page.get_by_role('button', name='Reset reading settings', exact=True).click()
        expect(page.get_by_label('Text size', exact=True)).to_have_value('20')
        check('combined reset restores text size', page.get_by_label('Text size', exact=True).input_value() == '20')
        check('combined reset disables overlay', page.get_by_label('Reading overlay', exact=True).input_value() == 'off')
        page.keyboard.press('Escape')
        check('Escape returns focus to settings', settings.evaluate('(el) => el === document.activeElement'))
        before_width = article.bounding_box()['width']
        page.get_by_role('button', name='Listen', exact=True).click()
        check('recordings are explicit', page.get_by_text('No recording for this book yet', exact=True).is_visible())
        check('listening does not squeeze article', abs(article.bounding_box()['width'] - before_width) < 1)
        page.locator('.publication-listening-surface').screenshot(path=str(out / 'recorded-audiobook-empty.png'))
        page.get_by_role('button', name='Close recorded audiobook', exact=True).click()
        check('listening close returns focus', page.get_by_role('button', name='Listen', exact=True).evaluate('(el) => el === document.activeElement'))
        first_paragraph = article.locator('p').first
        first_paragraph.select_text()
        page.get_by_title('Save Highlight (h)', exact=True).click()
        check('highlight still works with support wrapper', article.locator('[data-publication-highlight]').count() > 0)
        context.close()
        check('no page errors', not results['errors'], results['errors'])
        results['result'] = 'passed' if all(c['passed'] for c in results['checks']) else 'failed'
    finally:
        browser.close()
        (out / 'evidence-reader-corrections.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, indent=2))
assert results["result"] == "passed"
