"""Measure and photograph width, UI scale and assist overlays in the running demo (default http://127.0.0.1:8773/).
Usage: ../../../../../book-engine/.venv/bin/python capture-assist-width-scale.py <label> [out-dir]
Writes <out-dir>/<label>/*.png and <label>-measurements.json. Playwright bundled headless shell only; synthetic viewports, never the user's Chrome."""
import json, re, sys, os
from pathlib import Path
from playwright.sync_api import sync_playwright
label = sys.argv[1]
here = Path(__file__).resolve().parent
out = Path(sys.argv[2]) if len(sys.argv) > 2 else here
shots = out / label; shots.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('READER_BASE', 'http://127.0.0.1:8773/')
SHELL = max((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'), key=lambda p: int(p.parents[1].name.rsplit('-', 1)[1]))
VIEWPORTS = [(1280, 800), (1366, 768), (1024, 768), (1440, 900), (390, 844)]
BOOK = 'linguistics'
def prefs_key(): return f'publication-reader:{BOOK}:reading-support:v1'
def field_key(name): return f'publication-reader:{BOOK}:{name}'
measurements = []
STUB = '''() => { window.utterances = []; const listeners = {}; window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  window.fireVoices = v => { window.__voices = v; (listeners.voiceschanged || []).forEach(f => f()); };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speaking: false, getVoices: () => window.__voices || [],
   addEventListener(t, f) { (listeners[t] ??= []).push(f); }, removeEventListener() {}, speak(u) { window.utterances.push(u); this.speaking = true; }, cancel() { this.speaking = false; }, pause() {}, resume() {} } }); }'''
VOICES = [{'default': False, 'lang': 'cs-CZ', 'name': 'SYNTHETIC Czech', 'voiceURI': 'syn-cs', 'localService': True}, {'default': True, 'lang': 'en-GB', 'name': 'SYNTHETIC British', 'voiceURI': 'syn-gb', 'localService': True}]
def open_chapter(page, seed=None):
    page.goto(BASE + '?book=' + BOOK, wait_until='networkidle')
    page.evaluate('localStorage.clear()')
    for key, value in (seed or {}).items():
        page.evaluate('([k,v])=>localStorage.setItem(k,v)', [key, value])
    page.goto(BASE + '?book=' + BOOK, wait_until='networkidle')
    page.locator('.publication-home, [data-publication-content]').first.wait_for()
    if not page.locator('[data-publication-content]').count():
        page.get_by_role('button', name=re.compile('^(Start|Continue)', re.I)).first.click()
    page.locator('[data-publication-content] p').first.wait_for()
    page.wait_for_timeout(300)
def metrics(page):
    return page.evaluate('''() => {
      const css = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null; };
      const box = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height)}; };
      const main = document.querySelector('.publication-main').getBoundingClientRect();
      const sidebar = document.querySelector('.publication-sidebar');
      return { viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, htmlFont: css('html','fontSize'),
        main: Math.round(main.width), sidebarOpen: sidebar ? sidebar.dataset.open : null,
        column: box('.publication-reading-column'), article: box('[data-publication-content]'),
        articleFont: css('[data-publication-content] p','fontSize'), articleLine: css('[data-publication-content] p','lineHeight'),
        h1: css('[data-publication-content] h1','fontSize'),
        toolbarH: box('.publication-toolbar'), toolbarFont: css('.publication-toolbar','fontSize'), controlFont: css('.publication-toolbar-control','fontSize'), controlBox: box('.publication-toolbar-control'),
        scrollOverflow: document.documentElement.scrollWidth > innerWidth };
    }''')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=str(SHELL))
    for width, height in VIEWPORTS:
        context = browser.new_context(viewport={'width': width, 'height': height}, color_scheme='light')
        page = context.new_page(); page.set_default_timeout(8000)
        tag = f'{width}x{height}'
        # Front page.
        page.goto(BASE + '?book=' + BOOK, wait_until='networkidle'); page.evaluate('localStorage.clear()'); page.goto(BASE + '?book=' + BOOK, wait_until='networkidle'); page.wait_for_timeout(300)
        page.screenshot(path=str(shots / f'home-{tag}.png'))
        home = page.evaluate('''() => { const f = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontSize : null; };
          const c = document.querySelector('.publication-home-cover'); return { h1: f('.publication-home h1'), cover: c ? Math.round(c.getBoundingClientRect().width) : null, masthead: Math.round(document.querySelector('.publication-masthead')?.getBoundingClientRect().height ?? 0), chooser: (()=>{const e=document.querySelector('.demo-frontpage-chooser'); if(!e) return null; const r=e.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};})() }; }''')
        # Widths with the sidebar as the reader leaves it, then closed.
        for choice in ['sm', 'md', 'lg', 'full']:
            open_chapter(page, {field_key('textWidth'): json.dumps(choice), field_key('maxWidth'): json.dumps(choice)})
            row = {'viewport': tag, 'width': choice, **metrics(page)}
            measurements.append(row)
            if choice in ('md',): page.screenshot(path=str(shots / f'read-{choice}-{tag}.png'))
            page.keyboard.press('s'); page.wait_for_timeout(400)
            closed = metrics(page); measurements.append({'viewport': tag, 'width': choice, 'sidebar': 'toggled', **closed})
        # UI scale independent of the article size.
        for size in (16, 28):
            open_chapter(page, {prefs_key(): json.dumps({'fontSize': size})})
            m = metrics(page); measurements.append({'viewport': tag, 'articleSizePref': size, **m})
        # Formatting menu and assist overlays.
        open_chapter(page)
        page.locator('.publication-toolbar-actions').get_by_role('button', name=re.compile('^Formatting')).click(); page.wait_for_timeout(200)
        page.screenshot(path=str(shots / f'formatting-{tag}.png'))
        page.keyboard.press('Escape')
        for overlay, lines, extra in (('ruler', 3, {}), ('line-window', 3, {}), ('ruler', 3, {'dim': 0.6})):
            seed = {'overlay': overlay, 'lines': lines, **extra}
            open_chapter(page, {prefs_key(): json.dumps(seed)})
            page.locator('[data-publication-content] p').nth(1).click(position={'x': 40, 'y': 10}); page.wait_for_timeout(300)
            page.screenshot(path=str(shots / f'overlay-{overlay}{"-dim" if extra else ""}-{tag}.png'))
        # Assist menu with the ruler chosen.
        open_chapter(page, {prefs_key(): json.dumps({'overlay': 'ruler', 'rulerLines': 2})})
        page.locator('.publication-toolbar-actions').get_by_role('button', name=re.compile('^Assist')).click(); page.wait_for_timeout(200)
        page.screenshot(path=str(shots / f'assist-{tag}.png')); page.keyboard.press('Escape')
        if os.environ.get('READALOUD'):
            # Read-aloud with a SYNTHETIC speech stub (labelled voices): the Listen menu, then the docked transport and the sentence highlight.
            page.add_init_script('(' + STUB + ')()')
            open_chapter(page)
            page.evaluate("v => window.fireVoices && window.fireVoices(v)", VOICES)
            page.locator('.publication-toolbar-actions').get_by_role('button', name=re.compile('^Listen')).click(); page.wait_for_timeout(200)
            page.screenshot(path=str(shots / f'listen-menu-{tag}.png'))
            page.get_by_role('dialog', name='Listen').get_by_role('button', name='Start', exact=True).click(); page.wait_for_timeout(200)
            page.evaluate("window.utterances.at(-1).onend()"); page.wait_for_timeout(100)
            page.evaluate("window.utterances.at(-1).onboundary({charIndex: 4})"); page.wait_for_timeout(200)
            page.screenshot(path=str(shots / f'readaloud-playing-{tag}.png'))
            page.get_by_role('button', name='Stop reading aloud').click()
        measurements.append({'viewport': tag, 'home': home})
        context.close()
    browser.close()
(out / f'{label}-measurements.json').write_text(json.dumps(measurements, indent=1))
print('wrote', out / f'{label}-measurements.json')
