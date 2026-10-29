import json, threading, functools, tempfile, shutil
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[4]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root/'apps/reader-demo/dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=str(Path.home()/'Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
  try:
   page=browser.new_page(viewport={'width':1280,'height':900})
   page.set_default_timeout(4000)
   base='http://127.0.0.1:'+str(server.server_port)
   book=json.loads((root/'apps/reader-demo/src/books/next-books/course-design-frameworks.book.json').read_text())
   prov=json.loads((root/'apps/reader-demo/src/books/next-books/course-design-frameworks-provenance.json').read_text())
   checks=[]
   def check(name,ok,detail=None): checks.append(dict(name=name,passed=bool(ok),detail=detail))
   for section in book['sections']:
    page.goto(base+'/?book=course-design-frameworks&section='+section['id'])
    page.locator('[data-publication-content]').wait_for()
    text=page.locator('[data-publication-content]').inner_text()
    import re
    normal=lambda x:re.sub(r'\s+',' ',x).strip()
    cursor=0; missing=[]
    for v in [v for v in prov['values'] if v['sectionId']==section['id']]:
     i=normal(text).find(normal(v['value']),cursor)
     if i<0: missing.append(v['path'])
     else: cursor=i+len(normal(v['value']))
    check(section['id']+' served ordered source values',not missing,missing)
    check(section['id']+' table associations',page.locator('[data-publication-content]').evaluate('(r)=>[...r.querySelectorAll("td[headers]")].every(e=>e.getAttribute("headers").split(" ").every(id=>document.getElementById(id)))'))
    if page.locator('iframe').count():
     frame=page.frame_locator('iframe'); frame.locator('form').wait_for()
     check(section['id']+' root and sandbox', '/embeds/course-design-frameworks/' in page.locator('iframe').get_attribute('src') and page.locator('iframe').get_attribute('sandbox')=='allow-scripts')
     check(section['id']+' unsaved notice','not saved' in frame.locator('body').inner_text())
     if frame.locator('input[type=checkbox]').count():
      c=frame.locator('input[type=checkbox]').first;c.focus();page.keyboard.press('Space');check(section['id']+' keyboard toggle',c.is_checked());frame.get_by_role('button',name='Reset',exact=True).click();check(section['id']+' reset',not c.is_checked())
     else:
      c=frame.locator('textarea').last;c.fill('PRIVATE_REVIEW_ENTRY');check(section['id']+' editable',c.input_value()=='PRIVATE_REVIEW_ENTRY')
     check(section['id']+' written version',bool(page.locator('[data-publication-content] table, [data-publication-content] li').count()))
    page.set_viewport_size({'width':390,'height':844})
    check(section['id']+' narrow overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    page.set_viewport_size({'width':1280,'height':900})
   page.goto(base+'/?book=course-design-frameworks&section=engagement-matrix');page.locator('[data-publication-content]').wait_for()
   page.get_by_role('button',name='Assist',exact=True).click()
   for mode in ['Paragraph','Line window','Ruler']:
    page.get_by_role('radio',name=mode,exact=True).click()
    page.get_by_role('button',name='Assist',exact=False).click()
    cell=page.locator('[data-publication-content] td').first;cell.hover();page.wait_for_timeout(150)
    check('assist '+mode+' table unit',page.locator('[data-rs-active]').count()>0, page.locator('[data-rs-active]').evaluate_all('(es)=>es.map(e=>e.tagName)'))
    page.get_by_role('button',name='Assist',exact=False).click()
   page.get_by_role('radio',name='Off',exact=True).click();page.get_by_role('button',name='Assist',exact=True).click()
   page.goto(base+'/?book=course-design-frameworks&section=about');page.locator('[data-publication-content]').wait_for()
   page.evaluate('localStorage.clear()');page.reload();page.locator('[data-publication-content]').wait_for()
   for term,chapter in [('Wikipedia editathons','Learning Activity Matrix'),('The overall objective of the course','Quality Assurance Checklist')]:
    search=page.get_by_label('Search',exact=True);search.fill(term)
    page.wait_for_timeout(200)
    check('search '+term,chapter in page.locator('aside').inner_text())
    page.locator('aside').get_by_role('button',name=chapter,exact=True).click()
    check('search destination '+term,term in page.locator('[data-publication-content]').inner_text())
    search.fill('')
   page.goto(base+'/?book=course-design-frameworks&section=about');page.locator('[data-publication-content]').wait_for()
   page.get_by_role('textbox',name='Key lessons and reflections').fill('REVIEW_NOTE_SEMANTIC_ABOUT')
   page.get_by_role('button',name='Save Reflection').click()
   page.reload();page.locator('[data-publication-content]').wait_for()
   page.get_by_role('button',name='Open notes and highlights').click()
   check('reflection persisted after reload','REVIEW_NOTE_SEMANTIC_ABOUT' in page.locator('body').inner_text() or page.locator('textarea').evaluate_all('(es)=>es.some(e=>e.value.includes("REVIEW_NOTE_SEMANTIC_ABOUT"))'))
   page.get_by_role('button',name='Close notes').click()
   page.locator('[data-publication-content] p').nth(1).evaluate('(e)=>{let r=document.createRange();r.selectNodeContents(e);let s=getSelection();s.removeAllRanges();s.addRange(r)}')
   page.get_by_title('Save Highlight (h)',exact=True).click()
   page.get_by_placeholder('Add a note...').fill('REVIEW_ANCHORED_NOTE')
   page.get_by_placeholder('Add a note...').blur();page.wait_for_timeout(200)
   page.reload();page.locator('[data-publication-content]').wait_for()
   page.get_by_role('button',name='Open notes and highlights').click()
   check('anchored semantic note persisted',page.get_by_placeholder('Add a note...').input_value()=='REVIEW_ANCHORED_NOTE')
   page.get_by_role('button',name='Close notes').click()
   page.locator('select').first.select_option('academic-productivity');page.wait_for_timeout(150)
   page.get_by_role('button',name='Open notes and highlights').click()
   check('no cross book note leakage','REVIEW_ANCHORED_NOTE' not in page.locator('body').inner_text() and page.get_by_placeholder('Add a note...').count()==0)
   page.get_by_role('button',name='Close notes').click()
   page.locator('select').first.select_option('course-design-frameworks');page.wait_for_timeout(150)
   with page.expect_download() as dl: page.get_by_role('button',name='Download eBook',exact=False).click()
   import zipfile,xml.etree.ElementTree as ET
   scratch=Path(tempfile.mkdtemp(prefix='.scratch-',dir=Path(__file__).parent))
   try:
    dest=scratch/'course.epub';dl.value.save_as(dest)
    with zipfile.ZipFile(dest) as z:
     chapters=[n for n in z.namelist() if re.search(r'chapter-.*\.xhtml$',n)]
     check('integrated EPUB nine chapters',len(chapters)==9)
     for section,n in zip(book['sections'],chapters):
      xml=z.read(n).decode();el=ET.fromstring(xml.replace('<br />',' ').replace('<br/>',' ').replace('<br>',' '));text=normal(''.join(el.itertext()));cursor=0;missing=[]
      for v in [v for v in prov['values'] if v['sectionId']==section['id']]:
       i=text.find(normal(v['value']),cursor)
       if i<0:missing.append(v['path'])
       else:cursor=i+len(normal(v['value']))
      check('EPUB '+section['id']+' ordered values',not missing,missing)
     check('EPUB excludes private entries',all(b'PRIVATE_REVIEW_ENTRY' not in z.read(n) and b'REVIEW_ANCHORED_NOTE' not in z.read(n) for n in chapters))
   finally:shutil.rmtree(scratch)
   agent=page.request.get(base+'/agent/course-design-frameworks/full.md').text()
   check('served agent excludes private entries','PRIVATE_REVIEW_ENTRY' not in agent and 'REVIEW_ANCHORED_NOTE' not in agent)
   for section in book['sections']:
    cursor=0;missing=[]
    from html import unescape
    plain=normal(unescape(re.sub('<[^>]+>',' ',agent)))
    for v in [v for v in prov['values'] if v['sectionId']==section['id']]:
     i=plain.find(normal(v['value']),cursor)
     if i<0:missing.append(v['path'])
     else:cursor=i+len(normal(v['value']))
    check('served agent '+section['id']+' ordered values',not missing,missing)
   manifest=json.loads((root/'apps/reader-demo/src/books/next-books/course-design-frameworks-embed-manifest.json').read_text())
   for item in manifest['items']:
    response=page.request.get(base+'/embeds/course-design-frameworks/'+item['src'])
    check('asset exact '+item['id'],response.status==200 and response.body()==(root/'apps/reader-demo/interactives/course-design-frameworks'/item['src']).read_bytes())
   for section,rows,cols in [('engagement-matrix',5,4),('icap-framework',4,3),('activity-planner',10,4),('learning-matrix',6,3),('modular-planner',5,3)]:
    page.goto(base+'/?book=course-design-frameworks&section='+section);page.locator('[data-publication-content]').wait_for()
    r=page.locator('[data-publication-content] table')
    check(section+' row structure',r.locator('tbody tr').count()==rows)
    check(section+' scoped columns',r.locator('th[scope=col]').count()==cols,r.locator('th[scope=col]').count())
    check(section+' scoped rows',r.locator('th[scope=row]').count()==rows)
   page.goto(base+'/?book=course-design-frameworks&section=about');page.locator('[data-publication-content]').wait_for()
   page.get_by_role('button',name='Assist',exact=False).click();page.get_by_role('radio',name='Paragraph',exact=True).click();page.get_by_role('button',name='Assist',exact=False).click()
   page.locator('[data-publication-content] p').nth(1).hover()
   check('assist own paragraph',page.locator('[data-publication-content] p[data-rs-active]').count()>0)
   page.goto(base+'/?book=course-design-frameworks&section=modular-planner');page.locator('iframe').wait_for()
   frame=page.frame_locator('iframe');c=frame.locator('textarea').first;c.focus();page.keyboard.press('ControlOrMeta+A');page.keyboard.type('KEYBOARD_PRIVATE_ENTRY');check('planner keyboard entry',c.input_value()=='KEYBOARD_PRIVATE_ENTRY')
   page.reload();page.frame_locator('iframe').locator('textarea').first.wait_for();check('planner clears after reload','KEYBOARD_PRIVATE_ENTRY' not in page.frame_locator('iframe').locator('textarea').first.input_value())
   page.route('**/embeds/course-design-frameworks/**',lambda route:route.abort())
   page.reload();page.locator('[data-publication-content] table').wait_for()
   check('written alternative with failed frame','Course expectations page' in page.locator('[data-publication-content]').inner_text())
   page.set_viewport_size({'width':390,'height':844})
   page.locator('[data-publication-content] table').scroll_into_view_if_needed()
   page.locator('body').click(position={'x':2,'y':2})
   reached=False
   for _ in range(45):
    page.keyboard.press('Tab')
    if page.evaluate('document.activeElement.tagName==="TABLE"'):
     reached=True;break
   check('written table keyboard reachable or fits at narrow width',reached or page.locator('[data-publication-content] table').evaluate('(e)=>e.scrollWidth<=e.clientWidth'),page.locator('[data-publication-content] table').evaluate('(e)=>({clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,tabindex:e.getAttribute("tabindex"),wrapper:e.parentElement.outerHTML.slice(0,180)})'))
   (Path(__file__).parent/'evidence-course-design-integrated.json').write_text(json.dumps(checks,indent=2))
  finally: browser.close()
finally: server.shutdown();server.server_close()
