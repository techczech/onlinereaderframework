"""Provisional screenshots of the built demo (headless Chromium shell only). Usage: python probe-screens.py [base] """
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
base=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8773'
out=Path(__file__).parent/'screens'
shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
with sync_playwright() as p:
  b=p.chromium.launch(headless=True,executable_path=str(shell))
  for scheme in ('light','dark'):
    pg=b.new_page(viewport={'width':1440,'height':900},color_scheme=scheme)
    for lay in ('opus-colour-band','opus-search-map','sol-open-contents'):
      pg.goto(f'{base}/?book=deliberate-practice&frontpage={lay}');pg.wait_for_timeout(500)
      pg.screenshot(path=out/f'front-{lay}-{scheme}.png')
    if scheme=='light':
      pg.goto(f'{base}/?book=linguistics&frontpage=opus-colour-band');pg.wait_for_timeout(500)
      pg.locator('.publication-front-contents').scroll_into_view_if_needed();pg.screenshot(path=out/'front-linguistics-band.png')
      pg.goto(f'{base}/?book=deliberate-practice&section=fluency');pg.wait_for_timeout(600)
      pg.screenshot(path=out/'chapter-outline-open.png')
      pg.locator('.publication-outline-rail-toggle').click();pg.wait_for_timeout(300)
      pg.screenshot(path=out/'chapter-outline-collapsed.png')
  b.close()
