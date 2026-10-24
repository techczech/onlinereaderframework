"""Verify the author-reported book identity, navigation and desktop measure regressions."""
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright, expect
import json
import sys
import io
import subprocess
import wave

root = Path(__file__).resolve().parents[1]
out = root / 'docs/design/2026-10-24-reader-corrections/verification'
closure_only = '--closure-only' in sys.argv
if not closure_only:
    out.mkdir(parents=True, exist_ok=True)
books = json.loads((root / 'apps/reader-demo/src/books/original-publications.json').read_text())
results = {'checks': [], 'errors': []}
base = 'http://127.0.0.1:8773/'

def check(name, condition, detail=None):
    results['checks'].append({'name': name, 'passed': bool(condition), 'detail': detail})

def check_correction_closure(browser):
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, color_scheme='light')
    try:
        page = context.new_page()
        page.on('pageerror', lambda error: results['errors'].append(str(error)))
        page.goto(base + '?' + urlencode({'book': 'language-muscle', 'section': 'intro-group'}), wait_until='networkidle')
        article = page.locator('[data-publication-content]').first
        paragraph = article.locator('p').first
        expect(paragraph).to_contain_text('Welcome to your new language learning journey.')
        measure = '(el) => ({size:getComputedStyle(el).fontSize, font:getComputedStyle(el).fontFamily, height:el.getBoundingClientRect().height})'
        before = paragraph.evaluate(measure)
        page.evaluate("window.closureParagraph = document.querySelector('[data-publication-content] p'); window.closureText = window.closureParagraph.firstChild")
        original_text = article.text_content()
        settings = page.get_by_role('button', name='Reading settings', exact=True)
        settings.click()
        page.get_by_label('Text size', exact=True).fill('28')
        page.get_by_label('Typeface', exact=True).select_option('sans')
        page.get_by_role('button', name='Close reading settings', exact=True).click()
        after = paragraph.evaluate(measure)
        check('LM actual intro paragraph follows 28px preference', after['size'] == '28px' and before['size'] != after['size'], {'before': before, 'after': after})
        check('LM actual intro paragraph follows sans preference', 'Inter' in after['font'], after)
        check('LM source text and paragraph nodes survive settings', article.text_content() == original_text and paragraph.evaluate('(el) => el === window.closureParagraph && el.firstChild === window.closureText'))
        paragraph.select_text()
        check('LM paragraph remains selectable', page.evaluate('getSelection().toString()') == paragraph.text_content())
        listen = page.get_by_role('button', name='Listen', exact=True)
        surface = page.locator('.publication-listening-surface')
        for attempt in ['initial', 'reopened']:
            listen.focus()
            listen.press('Enter')
            expect(surface).to_be_visible()
            page.evaluate('new Promise(requestAnimationFrame)')
            check('Listen ' + attempt + ' Enter focuses player', surface.evaluate('(el) => el.contains(document.activeElement)'))
            page.keyboard.press('Escape')
            check('Listen ' + attempt + ' Escape hides player', not surface.is_visible())
            check('Listen ' + attempt + ' Escape focuses trigger', listen.evaluate('(el) => el === document.activeElement'))
            if surface.is_visible():
                page.get_by_role('button', name='Close recorded audiobook', exact=True).click()
        listen.focus()
        listen.press('Enter')
        settings.click()
        size = page.get_by_label('Text size', exact=True)
        size.fill('26')
        check('Text setting rerender does not steal focus into player', size.evaluate('(el) => el === document.activeElement'))
        page.keyboard.press('Escape')
        page.get_by_role('button', name='Close recorded audiobook', exact=True).click()
    finally:
        context.close()

def check_playing_closure(browser):
    # Reuse the listening test's 24-second silent WAV with the actual reader host.
    fixture = """
import React from 'react';
import {createRoot} from 'react-dom/client';
import {PublicationReader} from './packages/reader-core/src/original/PublicationReader.tsx';
window.media=[];
const NativeAudio=window.Audio;
window.Audio=function(...args){const media=new NativeAudio(...args);window.media.push(media);return media;};
createRoot(document.getElementById('root')).render(<PublicationReader book={window.closureBook} epub={false}
 audio={[{sectionId:'intro-group',src:'/closure-listening.wav'}]}/>);
"""
    build = """
import {build} from './apps/reader-demo/node_modules/esbuild/lib/main.js';
import {resolve} from 'node:path';
let contents='';for await (const chunk of process.stdin) contents+=chunk;
const result=await build({stdin:{contents,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',
 alias:{react:resolve('apps/reader-demo/node_modules/react'),'react-dom':resolve('apps/reader-demo/node_modules/react-dom')}});
process.stdout.write(result.outputFiles[0].text);
"""
    bundle = subprocess.run(['node', '--input-type=module', '-e', build], input=fixture, text=True, cwd=root, capture_output=True, check=True).stdout
    stream = io.BytesIO()
    with wave.open(stream, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(8000)
        wav.writeframes(b'\x00\x00' * 8000 * 24)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    try:
        page = context.new_page()
        page.on('pageerror', lambda error: results['errors'].append(str(error)))
        page.route(base + 'closure-listening.wav', lambda route: route.fulfill(content_type='audio/wav', body=stream.getvalue(), headers={'Accept-Ranges': 'bytes'}))
        page.route(base + 'closure-listening?*', lambda route: route.fulfill(content_type='text/html', body='<html><body><div id="root"></div></body></html>'))
        page.goto(base + 'closure-listening?book=language-muscle&section=intro-group')
        css = next((root / 'apps/reader-demo/dist/assets').glob('index-*.css'))
        page.add_style_tag(url=base + 'assets/' + css.name)
        page.evaluate('(book) => window.closureBook = book', next(book for book in books if book['id'] == 'language-muscle'))
        page.add_script_tag(content=bundle)
        page.locator('[data-publication-content] p').first.wait_for()
        listen = page.get_by_role('button', name='Listen', exact=True)
        surface = page.locator('.publication-listening-surface')
        listen.focus()
        listen.press('Enter')
        expect(page.get_by_role('button', name='Close recorded audiobook', exact=True)).to_be_focused()
        page.get_by_role('button', name='Play recording', exact=True).click()
        expect(surface.get_by_role('status')).to_have_text('Playing')
        page.evaluate('window.playingMedia = window.media.at(-1); window.mediaCount = window.media.length; window.playingMedia.currentTime = 2')
        for attempt in ['first', 'second']:
            page.keyboard.press('Escape')
            expect(surface).to_be_hidden()
            expect(listen).to_be_focused()
            check('Playing audio survives ' + attempt + ' keyboard close', page.evaluate('window.media.at(-1) === window.playingMedia && window.media.length === window.mediaCount && !window.playingMedia.paused && window.playingMedia.currentTime >= 2'))
            listen.press('Enter')
            expect(page.get_by_role('button', name='Close recorded audiobook', exact=True)).to_be_focused()
            check('Playing audio survives ' + attempt + ' keyboard reopen', page.evaluate('window.media.at(-1) === window.playingMedia && window.media.length === window.mediaCount && !window.playingMedia.paused && window.playingMedia.currentTime >= 2'))
        page.get_by_role('button', name='Reading settings', exact=True).click()
        size = page.get_by_label('Text size', exact=True)
        size.fill('28')
        check('Playing audio and settings focus survive text rerender', size.evaluate('(el) => el === document.activeElement') and page.evaluate('window.media.at(-1) === window.playingMedia && window.media.length === window.mediaCount && !window.playingMedia.paused && window.playingMedia.currentTime >= 2'))
    finally:
        context.close()

with sync_playwright() as pw:
    shell = max((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'), key=lambda p: int(p.parents[1].name.rsplit('-', 1)[1]))
    browser = pw.chromium.launch(headless=True, executable_path=str(shell))
    if closure_only:
        try:
            check_correction_closure(browser)
            check_playing_closure(browser)
            check('no page errors', not results['errors'], results['errors'])
            results['result'] = 'passed' if all(c['passed'] for c in results['checks']) else 'failed'
            print(json.dumps(results, indent=2))
            assert results['result'] == 'passed'
        finally:
            browser.close()
        raise SystemExit(0)
    try:
        check_correction_closure(browser)
        check_playing_closure(browser)
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
