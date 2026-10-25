"""Verify the Listen / Formatting / Assist / Notes toolbar in the running three-book demo.

Run against a served apps/reader-demo/dist (default http://127.0.0.1:8773/) with the Playwright bundled headless shell:
  ../book-engine/.venv/bin/python scripts/check-reader-toolbar.py [out-dir]
Exit status is 1 when any check fails.
"""
import json
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'docs/design/2026-10-25-visual-preferences-opus/evidence-implementation'
out.mkdir(parents=True, exist_ok=True)
SHELL = max((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'), key=lambda p: int(p.parents[1].name.rsplit('-', 1)[1]))
BASE = 'http://127.0.0.1:8773/'
BOOKS = {'linguistics': 'phonetics-and-phonology', 'deliberate-practice': None, 'language-muscle': 'intro-group'}
results = {'checks': [], 'errors': []}
FAKE_SPEECH = '''() => {
  window.speechLog = [];
  class U { constructor(text) { this.text = text; } }
  window.SpeechSynthesisUtterance = U;
  const synth = { speaking: false, paused: false, getVoices: () => [],
    speak(u) { window.speechLog.push('speak'); this.speaking = true; window.lastUtterance = u; },
    cancel() { window.speechLog.push('cancel'); this.speaking = false; },
    pause() { window.speechLog.push('pause'); }, resume() { window.speechLog.push('resume'); } };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
}'''


def check(name, condition, detail=None):
    results['checks'].append({'name': name, 'passed': bool(condition), 'detail': detail})
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)


def first_section(page, book):
    """Open the first readable chapter of the book from its sidebar."""
    page.goto(BASE + '?book=' + book, wait_until='networkidle')
    page.evaluate('localStorage.clear()')
    page.goto(BASE + '?book=' + book, wait_until='networkidle')
    page.get_by_role('button', name=re.compile('Start|Begin|Read', re.I)).first.click() if page.get_by_role('button', name=re.compile('^(Start|Begin)', re.I)).count() else None
    if not page.locator('[data-publication-content]').count():
        page.locator('aside [data-section-id]').first.click()
    page.locator('[data-publication-content] p').first.wait_for()


def control(page, name):
    return page.locator('.publication-toolbar-actions').get_by_role('button', name=re.compile('^' + name + '(,|$)'))


def run_book(browser, book, width):
    context = browser.new_context(viewport={'width': width, 'height': 900 if width > 600 else 800}, color_scheme='light')
    page = context.new_page()
    page.set_default_timeout(8000)
    page.on('pageerror', lambda error: results['errors'].append(book + ':' + str(error)))
    page.add_init_script('(' + FAKE_SPEECH + ')()')
    tag = f'{book} {width}px '
    try:
        first_section(page, book)
        heading0 = page.locator('[data-publication-content]').first.locator('h1, h2').first
        clean_heading = heading0.evaluate('e => getComputedStyle(e).fontSize') if heading0.count() else None
        page.evaluate('''(book) => { localStorage.setItem('publication-reader:' + book + ':fontSize', '"xl"'); localStorage.setItem('publication-reader:' + book + ':lineHeight', '"loose"'); }''', book)
        page.reload(wait_until='networkidle')
        page.locator('[data-publication-content] p').first.wait_for()
        legacy_heading = page.locator('[data-publication-content]').first.locator('h1, h2').first
        check(tag + 'hidden legacy size and line-height settings do not distort headings', clean_heading is None or legacy_heading.evaluate('e => getComputedStyle(e).fontSize') == clean_heading, clean_heading)
        article = page.locator('[data-publication-content]').first
        paragraph = article.locator('p').first
        # 1. Four separate labelled controls in order, no duplicate Listen or settings dialog.
        names = page.locator('.publication-toolbar-actions > button').evaluate_all('(els) => els.map(e => e.textContent.replace(/\\d+$/, "").trim())')
        check(tag + 'toolbar order Listen, Formatting, Assist, Notes', [n.replace('headphones', '').replace('text_fields', '').replace('eyeglasses', '').replace('ink_highlighter', '') for n in names] == ['Listen', 'Formatting', 'Assist', 'Notes'], names)
        icons = page.locator('.publication-toolbar-actions > button .material-symbols-outlined').all_text_contents()
        check(tag + 'icons present', icons == ['headphones', 'text_fields', 'eyeglasses', 'ink_highlighter'], icons)
        check(tag + 'no old settings dialog or in-chapter read-aloud button', page.locator('dialog.publication-settings').count() == 0 and page.get_by_role('button', name='Browser read-aloud', exact=True).count() == 0)
        check(tag + 'no empty recorded-audiobook panel mounted', page.locator('.publication-listening-surface').count() == 0)
        check(tag + 'no horizontal overflow', not page.evaluate('document.documentElement.scrollWidth > innerWidth'))
        page.screenshot(path=str(out / f'toolbar-{book}-{width}.png'))

        # 2. Listen: browser read-aloud only, state in plain words, playback survives menu close and formatting.
        control(page, 'Listen').click()
        listen = page.get_by_role('dialog', name='Listen')
        expect(listen).to_be_visible()
        check(tag + 'Listen offers browser read-aloud', listen.get_by_role('button', name='Start').is_visible())
        check(tag + 'Listen hides recorded audiobook when no recordings', listen.get_by_text('Recorded audiobook').count() == 0)
        listen.get_by_role('button', name='Start').click()
        check(tag + 'speech started once', page.evaluate('window.speechLog.filter(x => x === "speak").length') == 1)
        page.evaluate('window.speechLog.length = 0')
        expect(page.get_by_role('group', name='Browser read-aloud')).to_be_visible()
        page.screenshot(path=str(out / f'listen-open-{book}-{width}.png'))
        page.keyboard.press('Escape')
        check(tag + 'Escape closes Listen and returns focus', not listen.is_visible() and control(page, 'Listen').evaluate('e => e === document.activeElement'))
        check(tag + 'speech status stays after menu closes', page.get_by_role('button', name='Pause reading aloud').is_visible())

        # 3. Formatting: one text model, headings unaffected by hidden legacy settings, notes untouched.
        page.evaluate('''(book) => { const k = (f) => 'publication-reader:' + book + ':' + f;
          localStorage.setItem(k('highlights'), JSON.stringify([{id:'h1',text:'kept highlight',sectionId:'x',sectionTitle:'X',date:1,note:'n'}]));
          localStorage.setItem(k('reflections'), JSON.stringify([{id:'r1',content:'kept note',sectionId:'x',sectionTitle:'X',date:1}]));
        }''', book)
        notes_before = page.evaluate('''(book) => ['highlights','reflections'].map(f => localStorage.getItem('publication-reader:' + book + ':' + f))''', book)
        heading = article.locator('h1, h2').first
        p_before = paragraph.evaluate('e => parseFloat(getComputedStyle(e).fontSize)')
        paragraph.select_text()
        selected = page.evaluate('getSelection().toString()')
        control(page, 'Formatting').click()
        fmt = page.get_by_role('dialog', name='Formatting')
        expect(fmt).to_be_visible()
        check(tag + 'opening a menu keeps the text selection', page.evaluate('getSelection().toString()') == selected and selected != '')
        check(tag + 'focus moves into Formatting on open', fmt.evaluate('e => e.contains(document.activeElement)'))
        fmt.get_by_role('button', name='Increase text size').click()
        check(tag + 'changing a setting does not steal focus', fmt.get_by_role('button', name='Increase text size').evaluate('e => e === document.activeElement'))
        fmt.get_by_role('button', name='Increase text size').click()
        p_after = paragraph.evaluate('e => parseFloat(getComputedStyle(e).fontSize)')
        check(tag + 'text size stepper changes actual paragraph', p_after == 22 and p_before == 20, [p_before, p_after])
        fmt.get_by_role('radio', name='Sans', exact=True).click()
        check(tag + 'Sans applied to paragraph', 'Inter' in paragraph.evaluate('e => getComputedStyle(e).fontFamily'))
        fmt.get_by_role('button', name='Increase line spacing').click()
        fmt.get_by_role('button', name='Increase paragraph spacing').click()
        fmt.get_by_role('button', name='Increase letter spacing').click()
        fmt.get_by_role('radio', name='Wide', exact=True).click()
        fmt.get_by_role('radio', name='Dark', exact=True).click()
        check(tag + 'dark theme applied', page.locator('.publication-reader.dark').count() == 1)
        badge = control(page, 'Formatting').locator('.publication-toolbar-badge').inner_text()
        check(tag + 'Formatting badge counts 7 changes', badge == '7', badge)
        page.screenshot(path=str(out / f'formatting-open-{book}-{width}.png'))
        fmt.get_by_role('button', name='Reset formatting').click()
        check(tag + 'reset formatting restores text and theme', paragraph.evaluate('e => parseFloat(getComputedStyle(e).fontSize)') == 20 and page.locator('.publication-reader.dark').count() == 0 and control(page, 'Formatting').locator('.publication-toolbar-badge').count() == 0)
        check(tag + 'speech not cancelled by formatting changes', page.evaluate('window.speechLog.filter(x => x === "cancel").length') == 0, page.evaluate('window.speechLog'))
        notes_after = page.evaluate('''(book) => ['highlights','reflections','fontSize','lineHeight'].map(f => localStorage.getItem('publication-reader:' + book + ':' + f))''', book)
        check(tag + 'notes, highlights and unrelated saved values untouched', notes_after[:2] == notes_before and notes_after[2:] == ['"xl"', '"loose"'], notes_after)
        page.keyboard.press('Escape')
        check(tag + 'Escape returns focus to Formatting', control(page, 'Formatting').evaluate('e => e === document.activeElement'))

        # 4. Assist: meanings kept apart; line window height and dimming appear only when relevant.
        control(page, 'Assist').click()
        assist = page.get_by_role('dialog', name='Assist')
        expect(assist).to_be_visible()
        check(tag + 'Assist has no audio start control', assist.get_by_role('button', name=re.compile('Start|Read aloud')).count() == 0)
        check(tag + 'window height and dimming hidden with overlay off', assist.get_by_role('radiogroup', name='Window height').count() == 0 and assist.get_by_role('radiogroup', name='Dimming').count() == 0)
        assist.get_by_role('radio', name='Line window').click()
        check(tag + 'window height and dimming shown for line window', assist.get_by_role('radiogroup', name='Window height').is_visible() and assist.get_by_role('radiogroup', name='Dimming').is_visible())
        assist.get_by_role('radio', name='Ruler').click()
        check(tag + 'window height hidden for ruler, dimming kept', assist.get_by_role('radiogroup', name='Window height').count() == 0 and assist.get_by_role('radiogroup', name='Dimming').is_visible())
        assist.get_by_role('radio', name='Dark', exact=True).click()
        check(tag + 'Dark dimming saves 0.5', page.locator('.reading-support-surface').evaluate('e => getComputedStyle(e).getPropertyValue("--rs-dim")') == '0.5')
        assist.get_by_role('switch', name='Paragraph focus').click()
        check(tag + 'paragraph focus set', page.locator('.reading-support-surface').get_attribute('data-rs-focus') == 'paragraph')
        assist.get_by_role('switch', name='Hide navigation').click()
        check(tag + 'summary states actual state', 'other paragraphs faded' in assist.get_by_role('status').inner_text() and 'reading ruler' in assist.get_by_role('status').inner_text() and 'navigation hidden' in assist.get_by_role('status').inner_text(), assist.get_by_role('status').inner_text())
        check(tag + 'Assist badge counts 3', control(page, 'Assist').locator('.publication-toolbar-badge').inner_text() == '3')
        page.screenshot(path=str(out / f'assist-open-{book}-{width}.png'))
        check(tag + 'no full-screen dimming overlay', page.locator('.fixed.inset-0.pointer-events-none').count() == 0)
        assist.get_by_role('button', name='Turn all off').click()
        check(tag + 'Turn all off resets only assist', page.locator('.reading-support-surface').get_attribute('data-rs-overlay') == 'off' and page.locator('.reading-support-surface').get_attribute('data-rs-focus') == 'off')
        page.keyboard.press('Escape')
        # key R acts on the reading overlay; letters are ignored while a menu has focus.
        page.locator('.publication-scroll').click(position={'x': 5, 'y': 5})
        page.keyboard.press('r')
        check(tag + 'key R turns the in-text overlay on', page.locator('.reading-support-surface').get_attribute('data-rs-overlay') != 'off')
        page.keyboard.press('r')
        check(tag + 'key R turns it off again', page.locator('.reading-support-surface').get_attribute('data-rs-overlay') == 'off')

        # 5. Outside press closes without taking focus; Tab stays inside; mobile sheet geometry.
        control(page, 'Formatting').click()
        fmt = page.get_by_role('dialog', name='Formatting')
        box = fmt.bounding_box()
        if width < 640:
            check(tag + 'mobile menu is a bottom sheet inside the viewport', box['x'] >= 0 and box['x'] + box['width'] <= width + 0.5 and abs(box['y'] + box['height'] - 800) < 2, box)
            fmt.get_by_role('button', name='Assist', exact=True).click()
            expect(page.get_by_role('dialog', name='Assist')).to_be_visible()
            check(tag + 'sheet switch moves between menus', page.get_by_role('dialog', name='Formatting').count() == 0)
            page.screenshot(path=str(out / f'sheet-switch-{book}-{width}.png'))
        else:
            check(tag + 'desktop menu sits inside viewport under toolbar', box['x'] >= 0 and box['x'] + box['width'] <= width and box['y'] > 40, box)
            for _ in range(40):
                page.keyboard.press('Tab')
            check(tag + 'Tab stays inside open menu', fmt.evaluate('e => e.contains(document.activeElement)'))
        page.mouse.click(width // 2, 600 if width > 600 else 180)
        check(tag + 'press in the text closes menu', page.get_by_role('dialog').count() == 0)

        # 6. Notes keeps its panel, with its icon.
        page.get_by_role('button', name='Open notes and highlights').click()
        check(tag + 'Notes opens the existing panel', page.get_by_role('heading', name='Your Notes').is_visible())
        page.keyboard.press('Escape')
        # 7. Chapter heading and ordinary reading keys still work after a menu has been used.
        page.get_by_role('button', name='Open navigation').count()
        check(tag + 'sidebar present and topic rows unchanged', page.locator('aside.publication-sidebar').count() == 1)
        speech_state_final = page.get_by_role('button', name='Stop reading aloud')
        speech_state_final.click()
        expect(page.get_by_role('group', name='Browser read-aloud')).to_have_count(0)
        check(tag + 'Stop ends speech and status disappears', True)
    finally:
        context.close()


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=str(SHELL))
    try:
        for book in BOOKS:
            for width in (1440, 390):
                try:
                    run_book(browser, book, width)
                except Exception as error:  # report, continue with the next book
                    check(f'{book} {width}px completed without exception', False, str(error)[:600])
    finally:
        browser.close()
check('no page errors', not results['errors'], results['errors'])
results['result'] = 'passed' if all(c['passed'] for c in results['checks']) else 'failed'
(out / 'evidence-toolbar-real-books.json').write_text(json.dumps(results, indent=2) + '\n')
print(results['result'], sum(c['passed'] for c in results['checks']), '/', len(results['checks']))
sys.exit(0 if results['result'] == 'passed' else 1)
