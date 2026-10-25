"""Short real-engine journey (about 5 seconds of speech) in the demo: Start, real word boundary, skip, pause, resume, stop. Bundled headless shell only."""
import json, os, re, time
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = os.environ.get('READER_BASE', 'http://127.0.0.1:8773/')
SHELL = max((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'), key=lambda p: int(p.parents[1].name.rsplit('-', 1)[1]))
HL = "(n) => { const h = CSS.highlights.get(n); return h ? [...h].map(r => r.toString()).join('|').slice(0, 90) : null; }"
log = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=str(SHELL))
    page = browser.new_context(viewport={'width': 1280, 'height': 800}).new_page(); page.set_default_timeout(8000)
    page.goto(BASE + '?book=linguistics', wait_until='networkidle'); page.evaluate('localStorage.clear()'); page.goto(BASE + '?book=linguistics', wait_until='networkidle')
    page.get_by_role('button', name=re.compile('^(Start|Continue)', re.I)).first.click(); page.locator('[data-publication-content] p').first.wait_for()
    page.wait_for_timeout(1800)
    page.locator('.publication-toolbar-actions').get_by_role('button', name=re.compile('^Listen')).click()
    page.get_by_role('dialog', name='Listen').get_by_role('button', name='Start', exact=True).click()
    page.get_by_role('button', name='Pause reading aloud').wait_for(); time.sleep(1.6)
    log.append(['reading', {'sentence': page.evaluate(HL, 'publication-read-aloud'), 'word': page.evaluate(HL, 'publication-read-aloud-word')}])
    page.get_by_role('button', name='Next sentence').click(); time.sleep(1.0)
    log.append(['after next sentence', {'sentence': page.evaluate(HL, 'publication-read-aloud'), 'word': page.evaluate(HL, 'publication-read-aloud-word')}])
    page.get_by_role('button', name='Pause reading aloud').click(); time.sleep(0.4)
    log.append(['paused', {'sentence': page.evaluate(HL, 'publication-read-aloud'), 'engineSpeakingFlag': page.evaluate('speechSynthesis.speaking'), 'engineSaysPaused': page.evaluate('speechSynthesis.paused')}])
    page.get_by_role('button', name='Resume reading aloud').click(); time.sleep(0.8)
    log.append(['resumed', {'sentence': page.evaluate(HL, 'publication-read-aloud'), 'word': page.evaluate(HL, 'publication-read-aloud-word')}])
    page.get_by_role('button', name='Stop reading aloud').click(); time.sleep(0.4)
    log.append(['stopped', {'dock': page.locator('.publication-read-aloud-dock').count(), 'sentence': page.evaluate(HL, 'publication-read-aloud'), 'word': page.evaluate(HL, 'publication-read-aloud-word'), 'engineSpeaking': page.evaluate('speechSynthesis.speaking')}])
    browser.close()
print(json.dumps(log, indent=1)); Path(__file__).with_name('real-engine-journey.json').write_text(json.dumps(log, indent=1))
