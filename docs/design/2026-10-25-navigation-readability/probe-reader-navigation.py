"""Read-only review of source heading trees and existing :8773 build; no build or profile reuse."""
import hashlib, json, os, subprocess, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
os.chdir(ROOT)
js = r'''
import {readFileSync} from 'node:fs';
import {getPublicationHeadings,renderPublicationContent} from './packages/reader-core/src/publication-content/index.ts';
const books=JSON.parse(readFileSync('apps/reader-demo/src/books/original-publications.json','utf8'));
const result=books.map(book=>{const sections=[];function walk(nodes,depth=1){for(const s of nodes){sections.push({id:s.id,title:s.title,category:s.category,depth,readable:!!s.content.trim(),headings:getPublicationHeadings(s.content,s.format)});walk(s.children||[],depth+1)}}walk(book.sections);return {id:book.id,roots:book.sections.length,sections}});
const special='<h2>Equation $x^2$</h2><p>Text</p><h3>Child</h3>';
console.log(JSON.stringify({books:result,mathProbe:{html:renderPublicationContent('## Equation $x^2$\n\n### Child'),headings:getPublicationHeadings('## Equation $x^2$\n\n### Child')}}));
'''
inventory=json.loads(subprocess.check_output(['node','--import','./apps/reader-demo/node_modules/tsx/dist/loader.mjs','--input-type=module'],input=js,text=True))
(OUT/'evidence-reader-heading-trees.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n')
files=['packages/reader-core/src/original/'+n for n in ['Sidebar.tsx','TableOfContents.tsx','ReaderLayout.tsx','reader-original.css','use-publication-reader.ts','publication-navigation.ts','frontpage/frontpage-model.ts']]
result={'server':'http://127.0.0.1:8773','sourceSha256':{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in files},'measurements':[]}
measure=r'''() => {const root=document.querySelector('[data-publication-content]'),rail=document.querySelector('#toc-container'),article=root?.getBoundingClientRect(),side=document.querySelector('aside');return {url:location.href,viewport:innerWidth,articleWidth:article?.width,mainWidth:document.querySelector('main')?.clientWidth,sidebarOpen:side?.dataset.open,outlinePresent:!!rail,outlineDisplay:rail&&getComputedStyle(rail).display,outlineLinks:rail?Array.from(rail.querySelectorAll('a')).map(a=>({text:a.textContent.trim(),href:a.getAttribute('href'),height:a.getBoundingClientRect().height,current:a.getAttribute('aria-current')})):[],headings:root?Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h=>({id:h.id,text:h.textContent.trim(),level:Number(h.tagName[1])})):[],overflow:document.documentElement.scrollWidth>innerWidth,sidebarText:side?.innerText,focus:document.activeElement?.outerHTML.slice(0,300)}}'''
with tempfile.TemporaryDirectory(prefix='.probe-scratch-',dir=OUT) as scratch:
 tempfile.tempdir=scratch
 with sync_playwright() as p:
  shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
  browser=p.chromium.launch(headless=True,executable_path=str(shell))
  try:
   context=browser.new_context(viewport={'width':1440,'height':900})
   page=context.new_page()
   page.goto('http://127.0.0.1:8773/?book=deliberate-practice&section=fluency')
   page.locator('[data-publication-content]').wait_for()
   for width in [1440,1366,1280,1200,1024,768,390]:
    page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(350)
    result['measurements'].append(page.evaluate(measure))
    if width in [1440,1280,1024]:page.screenshot(path=str(OUT/f'screenshot-fluency-{width}.png'))
    if width in [1280,1200,1024]:
     page.keyboard.press('n');page.wait_for_timeout(100)
     result[f'shortcut{width}']=page.evaluate(measure)
     toggle=page.get_by_role('button',name='Close navigation',exact=True)
     if toggle.count():
      toggle.click();page.wait_for_timeout(400);result[f'sidebarClosed{width}']=page.evaluate(measure)
      page.get_by_role('button',name='Open navigation',exact=True).click();page.wait_for_timeout(400)
   page.set_viewport_size({'width':1440,'height':900})
   page.goto('http://127.0.0.1:8773/?book=deliberate-practice&section=schemas')
   page.locator('#toc-container a').first.wait_for();page.wait_for_timeout(200)
   result['schemasBefore']=page.evaluate(measure)
   page.locator('#toc-container a').nth(3).click();page.wait_for_timeout(700)
   result['schemasAfterClick']=page.evaluate(measure)
   result['historyAfterOutlineClick']=page.evaluate('history.length')
   page.screenshot(path=str(OUT/'screenshot-schemas-1440.png'))
   page.goto('http://127.0.0.1:8773/?book=language-muscle&section=about-guide')
   page.locator('[data-publication-content]').wait_for();page.wait_for_timeout(200)
   result['singleHeading']=page.evaluate(measure)
   result['mathDomText']=page.evaluate('(html)=>{const d=document.createElement("div");d.innerHTML=html;return Array.from(d.querySelectorAll("h2,h3")).map(h=>h.textContent)}',inventory['mathProbe']['html'])
  finally:browser.close()
(OUT/'evidence-reader-runtime.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'measurements':[{k:r[k] for k in ['viewport','articleWidth','mainWidth','outlinePresent','outlineDisplay','sidebarOpen','overflow']} for r in result['measurements']], 'singleHeading':result['singleHeading']['outlinePresent'],'outlineClickUrl':result['schemasAfterClick']['url'],'mathDomText':result['mathDomText']}))
