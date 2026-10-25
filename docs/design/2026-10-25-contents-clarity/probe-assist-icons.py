"""Assist menu with icons, built demo on 8773, headless Chromium shell only. Writes screenshots/assist-*.png and prints radio state."""
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).parent/'screenshots'
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 br=p.chromium.launch(headless=True,executable_path=str(shell))
 for w,h in((1280,900),(390,844)):
  c=br.new_context(viewport={'width':w,'height':h});pg=c.new_page();pg.set_default_timeout(8000)
  pg.goto('http://127.0.0.1:8773/?book=deliberate-practice&section=about-this-guide');pg.locator('[data-publication-content] p').first.wait_for()
  pg.get_by_role('button',name='Assist').first.click();pg.wait_for_timeout(300)
  g=pg.get_by_role('radiogroup',name='Reading assistance')
  pg.keyboard.press('Tab') 
  g.get_by_role('radio',name='Ruler').click();pg.wait_for_timeout(300)
  print(w,[(r.inner_text().replace('\n',' '),r.get_attribute('aria-checked')) for r in g.get_by_role('radio').all()],'icons',g.locator('.material-symbols-outlined').count(),'titles',g.locator('[title]').count())
  pg.screenshot(path=str(OUT/f'assist-after-{w}.png'));c.close()
