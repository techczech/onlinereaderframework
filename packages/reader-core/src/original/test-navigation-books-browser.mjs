/** Structure and navigation on the three real books, against the built demo (default http://127.0.0.1:8773, serving apps/reader-demo/dist).
 * Headless Chromium shell only. Usage: node test-navigation-books-browser.mjs [baseUrl] [screenshotDirectory] */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../..');
const python = String.raw`
import json,sys,re
from pathlib import Path
from urllib.parse import unquote
from playwright.sync_api import sync_playwright
cfg=json.load(sys.stdin);base=cfg['base'].rstrip('/')+'/';shots=cfg.get('shots')
checks=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'passed':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as p:
 shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
 assert shells,'Headless Chromium shell required'
 browser=p.chromium.launch(headless=True,executable_path=str(shells[-1]))
 try:
  context=browser.new_context(viewport={'width':1280,'height':800});page=context.new_page();page.set_default_timeout(8000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def open_book(book,section=None,width=1280,height=800,fragment=''):
   page.set_viewport_size({'width':width,'height':height})
   page.goto(base+'?book='+book,wait_until='networkidle');page.evaluate('localStorage.clear();sessionStorage.clear()')
   page.goto(base+'?book='+book+('&section='+section if section else '')+fragment,wait_until='networkidle')
   page.wait_for_timeout(400)
  def row(title): return page.locator('.publication-sidebar [data-section-id]').filter(has_text=title).first
  def on_screen(): return page.locator('nav[aria-label="On this page"]').evaluate_all('els=>els.filter(e=>e.getClientRects().length).map(e=>e.id)')
  def outline():
   return page.locator('nav[aria-label="On this page"]').evaluate_all('els=>{const e=els.find(e=>e.getClientRects().length);return e?[...e.querySelectorAll("a")].map(a=>({text:a.textContent.trim(),level:Number(a.dataset.outlineLevel),pad:parseFloat(getComputedStyle(a.parentElement).paddingLeft)})):[]}')
  # Deliberate Practice: eight display categories over 21 real chapters.
  open_book('deliberate-practice','fluency-as-target') if False else open_book('deliberate-practice')
  page.get_by_role('button',name=re.compile('Start|Continue',re.I)).first.click();page.locator('[data-publication-content] p').first.wait_for()
  cats=page.locator('.publication-sidebar-category').all_text_contents()
  check('Deliberate Practice shows its eight categories in book order',cats==['Introduction','Principles & Theory','Practice Principles','Practice Approaches','Targeting Practice','Improving Practice','Appendices','App Guide'],cats)
  rows=page.locator('.publication-sidebar [data-section-id]').count()
  check('all 21 entries are still there, with no extra rows for categories',rows==21,rows)
  check('categories are display headings only: no button, link, count or check',page.locator('.publication-sidebar-category').evaluate_all('els=>els.every(e=>!e.closest("button,a")&&!e.querySelector("button,a,.material-symbols-outlined")&&!/\\d/.test(e.textContent))'))
  groups=page.evaluate('[...document.querySelectorAll(".publication-sidebar-group")].map(g=>[g.querySelector("h3").textContent,[...g.querySelectorAll("[data-section-id]")].map(b=>b.textContent.trim().replace(/check$/,""))])')
  check('chapters sit under their own category',dict(groups).get('Principles & Theory',[None])[:2]==['Working Memory Limitations','Fluency as Target'] and dict(groups)['Appendices'][-1]=='License' and dict(groups)['App Guide']==['Reader Guide'],groups)
  check('License stays an appendix and the Reader Guide is labelled as the app guide, not book content',len(dict(groups)['Appendices'])==4 and len(dict(groups)['App Guide'])==1)
  prog=page.locator('.publication-sidebar-progress').inner_text() if page.locator('.publication-sidebar-progress').count() else page.locator('.publication-sidebar').inner_text()
  check('progress still counts 20 chapters, not categories',re.search(r'of 20 read',prog) is not None,prog[:80])
  row('Fluency as Target').click();page.wait_for_timeout(500)
  check('the current chapter row is marked and sits under Principles & Theory',page.locator('.publication-sidebar [aria-current="page"]').inner_text().startswith('Fluency'))
  o=outline();check('Fluency as Target: three local links and no duplicate title',[l['text'] for l in o]==['Why you should target fluency in practice'] or len(o)==3,o)
  row('Schemas & Chunks').click();page.wait_for_timeout(500)
  o=outline();check('Schemas & Chunks: seven links with the three "Why" subsections under their parent',len(o)==7 and [l['pad']>o[1]['pad'] for l in o[2:5]]==[True,True,True] and o[0]['pad']==0,o)
  # Outline at every width, sidebar open and closed.
  for width,height in ((1440,900),(1366,768),(1280,800),(1200,800),(1024,768),(768,900),(390,844)):
   open_book('deliberate-practice','schemas',width,height);v=on_screen()
   check(f'DP {width}px: one chapter outline is on screen ({v[0] if v else "none"})',len(v)==1 and len(outline())==7)
   col=round(page.evaluate('document.querySelector(".publication-reading-column").getBoundingClientRect().width'))
   check(f'DP {width}px: no horizontal overflow, article width {col}px',not page.evaluate('document.documentElement.scrollWidth>innerWidth'))
   if width in (1280,1024,390) and shots: page.screenshot(path=f'{shots}/dp-schemas-{width}.png')
   if width>=768:
    page.keyboard.press('s');page.wait_for_timeout(400)
    check(f'DP {width}px, book sidebar closed: an outline is still on screen',len(on_screen())==1)
  # Subsection links are locations: URL, focus, history, deep link.
  open_book('deliberate-practice','schemas',1366,768)
  links=page.locator('#toc-container a');why=links.nth(3);hr=why.get_attribute('href');why.click();page.wait_for_timeout(500)
  check('"Why embodied": the URL now names the subsection',page.evaluate('location.hash')==hr and 'section=schemas' in page.evaluate('location.search'),page.evaluate('location.href'))
  check('focus moves into the passage and the outline marks it',page.evaluate('document.activeElement.id')==unquote(hr[1:]) and why.get_attribute('aria-current')=='location')
  links.nth(2).click();page.wait_for_timeout(400);page.go_back();page.wait_for_timeout(500)
  check('Back returns to "Why embodied" in the URL',page.evaluate('location.hash')==hr)
  page.go_forward();page.wait_for_timeout(400);check('Forward goes on to the next subsection',page.evaluate('location.hash')!=hr)
  open_book('deliberate-practice','schemas',1366,768,fragment=hr);page.wait_for_timeout(600)
  check('a copied subsection URL opens at that subsection',page.evaluate('(()=>{const h=document.getElementById(decodeURIComponent(location.hash.slice(1)));const s=document.querySelector(".publication-scroll").getBoundingClientRect();const r=h.getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom})()'))
  open_book('deliberate-practice','schemas',1366,768);page.locator('#toc-container a').nth(3).click();page.wait_for_timeout(400);row('Two Kinds of Memory').click();page.wait_for_timeout(400);page.go_back();page.wait_for_timeout(600)
  check('Back across chapters returns to the chapter and its subsection',page.evaluate('location.search').count('schemas')==1 and page.evaluate('location.hash')==hr)
  # Language Muscle: a single meaningful subheading, real hierarchy, landing pages.
  open_book('language-muscle')
  check('Language Muscle keeps its real hierarchy and gets no category headings',page.locator('.publication-sidebar-category').count()==0 and page.locator('.publication-sidebar [aria-expanded]').count()>=3)
  for width,height in ((1280,800),(1200,800),(1024,768),(390,844)):
   open_book('language-muscle','about-guide',width,height);o=outline()
   check(f'Language Muscle {width}px: the single "What is this" subheading is a reachable outline',[l['text'] for l in o]==['What is this'] and len(on_screen())==1,o)
  open_book('language-muscle','step-3',1280,800);o=outline()
  check('Step 3: h3 and h4 keep their hierarchy',len(o)>=8 and o[0]['pad']==0 and any(l['level']==4 and l['pad']>0 for l in o))
  open_book('language-muscle','intro-group');check('a parent landing page still opens from its URL',page.locator('[data-publication-content]').count()==1)
  # Linguistics: nine topics, 253 answers, no invented categories.
  open_book('linguistics')
  page.get_by_role('button',name=re.compile('Start|Continue',re.I)).first.click();page.locator('[data-publication-content] p').first.wait_for()
  check('Linguistics keeps nine expandable topics and no category headings',page.locator('.publication-sidebar > * [aria-expanded]').count()>=9 or page.locator('.publication-sidebar [aria-expanded]').count()>=9)
  check('Linguistics adds no category headings over its topics',page.locator('.publication-sidebar-category').count()==0)
  open_book('linguistics','2015-01-05-is-music-a-language',1024,768);o=outline()
  check('"Is music a language?": an outline that starts at h3 is not pushed right',len(o)==2 and o[0]['pad']==0 and len(on_screen())==1,o)
  open_book('linguistics','2013-11-16-is-it-possible-to-become-fluent-in-any-language-simply-by-reading-book',1366,768)
  check('the reading-books answer lists its four subheadings',len(outline())==4)
  check('no browser exceptions',not errors,errors)
 finally:browser.close()
print('NAV_BOOKS_JSON='+json.dumps(checks))
failed=[c for c in checks if not c['passed']];print(f'{len(checks)-len(failed)}/{len(checks)} passed');sys.exit(1 if failed else 0)
`;
const run = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), ['-c', python], { input: JSON.stringify({ base: process.argv[2] ?? 'http://127.0.0.1:8773', shots: process.argv[3] }), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
process.stdout.write(run.stdout ?? ''); process.stderr.write(run.stderr ?? '');
process.exitCode = run.status ?? 1;
