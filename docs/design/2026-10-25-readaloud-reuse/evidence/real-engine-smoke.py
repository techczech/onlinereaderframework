"""Real browser speech-engine smoke against the running demo (default http://127.0.0.1:8773/), bundled headless Chromium shell only.
Reports what this engine really exposes and how the reader presents it. A silent utterance (volume 0) is used; no long audio, no network voice.
Usage: ../../../../../book-engine/.venv/bin/python real-engine-smoke.py"""
import json, os, re, time
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = os.environ.get('READER_BASE', 'http://127.0.0.1:8773/')
SHELL = max((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'), key=lambda p: int(p.parents[1].name.rsplit('-', 1)[1]))
report = {}
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=str(SHELL))
    page = browser.new_context(viewport={'width': 1280, 'height': 800}).new_page(); page.set_default_timeout(8000)
    page.goto(BASE + '?book=linguistics', wait_until='networkidle')
    report['userAgent'] = page.evaluate('navigator.userAgent')
    report['hasSpeechSynthesis'] = page.evaluate("'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'")
    report['voicesImmediately'] = page.evaluate('speechSynthesis.getVoices().length')
    page.wait_for_timeout(1500)
    report['voicesAfter1500ms'] = page.evaluate('speechSynthesis.getVoices().map(v => ({name: v.name, lang: v.lang, default: v.default, localService: v.localService}))')
    report['rawUtterance'] = page.evaluate('''() => new Promise(done => { const events = []; const u = new SpeechSynthesisUtterance('Test.'); u.volume = 0;
      ['start','boundary','end','error'].forEach(t => u['on'+t] = e => events.push(t + (e.error ? ':' + e.error : '')));
      speechSynthesis.speak(u); setTimeout(() => { const s = {speaking: speechSynthesis.speaking, pending: speechSynthesis.pending}; speechSynthesis.cancel(); done({events, ...s}); }, 3500); })''')
    # The reader on the same engine: what does a person see?
    page.evaluate('localStorage.clear()'); page.goto(BASE + '?book=linguistics', wait_until='networkidle')
    page.get_by_role('button', name=re.compile('^(Start|Continue)', re.I)).first.click(); page.locator('[data-publication-content] p').first.wait_for()
    page.locator('.publication-toolbar-actions').get_by_role('button', name=re.compile('^Listen')).click()
    menu = page.get_by_role('dialog', name='Listen')
    report['menuVoiceOptions'] = menu.get_by_label('Voice').locator('option').all_text_contents() if menu.get_by_label('Voice').count() else None
    report['menuStatus'] = menu.locator('[role=status]').first.inner_text()
    # Silence the real engine's output for this smoke by muting the page audio path is not possible; use the shortest chapter start and stop quickly.
    menu.get_by_role('button', name='Start', exact=True).click()
    time.sleep(0.8)
    dock = page.locator('.publication-read-aloud-dock')
    report['after0.8s'] = {'dock': dock.inner_text() if dock.count() else None, 'highlight': page.evaluate("(() => { const h = CSS.highlights.get('publication-read-aloud'); return h ? [...h].map(r => r.toString()).join('|').slice(0,80) : null; })()")}
    time.sleep(7.5)
    report['after8s'] = {'dock': dock.inner_text() if dock.count() else None}
    if dock.count() and page.get_by_role('button', name='Stop reading aloud').count(): page.get_by_role('button', name='Stop reading aloud').click()
    browser.close()
print(json.dumps(report, indent=1))
Path(__file__).with_name('real-engine-smoke.json').write_text(json.dumps(report, indent=1))
