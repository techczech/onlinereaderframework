"""Independent focused corrected-preview and speech-projection checks; writes only new evidence, cleans scratch."""
import http.server,json,socketserver,threading,tempfile,shutil,subprocess,re,zipfile,html
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path.cwd(); review=root/'docs/design/2026-10-28-two-book-conversion'; dist=root/'apps/reader-demo/dist'
scratch=Path(tempfile.mkdtemp(prefix='.scratch-focused-review-',dir=review)); rows=[]
def check(name,ok,detail=None): rows.append(dict(name=name,pass_=bool(ok),detail=detail))
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**k): super().__init__(*a,directory=str(dist),**k)
 def log_message(self,*a): pass
 def end_headers(self):
  if self.path.startswith('/embeds/'): self.send_header('Content-Security-Policy',"sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'")
  super().end_headers()
class Server(socketserver.ThreadingTCPServer): allow_reuse_address=True; daemon_threads=True
server=Server(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_address[1]}'
try:
 # Bundle the actual production DOM speech projector; no audio engine is exercised.
 cmd=[str(root/'apps/reader-demo/node_modules/.bin/esbuild'),str(root/'packages/reader-core/src/original/read-aloud/read-aloud-speakable.ts'),'--bundle','--format=iife','--global-name=ReviewSpeech']
 r=subprocess.run(cmd,capture_output=True,text=True);check('speech-projector bundle exits zero',r.returncode==0,r.stderr);speech_js=r.stdout
 manifest=json.loads((root/'apps/reader-demo/src/books/next-books/embed-manifest.json').read_text())['books']
 chrome=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=str(chrome))
  try:
   for width in [1280,375]:
    context=browser.new_context(viewport={'width':width,'height':900 if width==1280 else 800},accept_downloads=True)
    page=context.new_page()
    for bid,entry in manifest.items():
     for section in sorted(set(e['sectionId'] for e in entry['items'])):
      page.goto(f'{base}/?book={bid}#/{section}');page.wait_for_selector('figure[data-publication-embed] iframe');page.wait_for_timeout(350)
      page.evaluate(speech_js + ";window.ReviewSpeech=ReviewSpeech;")
      data=page.evaluate('''() => {const root=document.querySelector('[data-publication-content]');const x=ReviewSpeech.buildPublicationSpeakable(root);return {text:x.speakable.text,anchors:[...root.querySelectorAll('[id]')].filter(n=>n.id.endsWith('-text') && !n.closest('[data-publication-embed]')).map(n=>[n.id,n.textContent.slice(0,70)])}}''')
      check(f'{width} {bid}/{section}: actual speech excludes frame chrome',not re.search(r'Skip to text version|Open full view|reader-embed:height|<iframe|data-publication-embed',data['text']),{'length':len(data['text'])})
      for aid,lead in data['anchors']: check(f'{width} speech includes alternative {aid}',re.sub(r'\s+',' ',lead).strip() in re.sub(r'\s+',' ',data['text']))
      if bid=='academic-reading' and section=='cognition-explorer':
       page.locator('figure[data-publication-embed] a[href="#reader-content-cognition-explorer-text"]').focus();page.keyboard.press('Enter');page.wait_for_timeout(1000)
       d=page.evaluate('''()=>{const t=document.getElementById('reader-content-cognition-explorer-text'),s=document.querySelector('.publication-scroll');return {top:t.getBoundingClientRect().top,scrollTop:s.getBoundingClientRect().top,height:t.getBoundingClientRect().height,area:s.clientHeight,focused:document.activeElement===t}}''')
       check(f'{width} tall skip target aligns at scroll-area start and receives focus',abs(d['top']-d['scrollTop'])<5 and d['focused'] and d['height']>d['area'],d)
     # Fresh EPUB checks reuse the UI's public export, unique scratch downloads.
     if width==1280:
      page.goto(f'{base}/?book={bid}');page.get_by_text('Download eBook').first.wait_for()
      with page.expect_download(timeout=30000) as dl: page.get_by_text('Download eBook').first.click()
      target=scratch/f'{bid}.epub';dl.value.save_as(target)
      with zipfile.ZipFile(target) as z: exported='\n'.join(z.read(n).decode('utf8','replace') for n in z.namelist() if n.endswith(('.xhtml','.html')))
      check(f'EPUB {bid}: frame and chrome absent',not re.search(r'<iframe|data-publication-embed|Skip to text version|Open full view|sandbox=',exported))
      plain=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',exported)))
      bookfile='academic-reading-framework.book.json' if bid=='academic-reading' else 'readability-foundations.book.json'
      book=json.loads((root/'apps/reader-demo/src/books/next-books'/bookfile).read_text())
      for item in entry['items']:
       section=next(s for s in book['sections'] if s['id']==item['sectionId'])
       alt=section['content'].split('id="'+item['anchor']+'">',1)[1].split('</div>',1)[0]
       expected=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',alt))).strip()
       check(f'EPUB {bid}/{item["id"]}: complete prose alternative preserved',expected in plain,{'characters':len(expected)})
    context.close()
   for eid,bid in [('reading-simplified-summary','academic-reading'),('slides-extraneous-text','readability-foundations')]:
    for width in [320,375,768]:
     page=browser.new_page(viewport={'width':width,'height':900});page.goto(f'{base}/embeds/{bid}/{eid}/index.html');page.wait_for_timeout(100)
     d=page.evaluate('({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,body:document.body.innerText})')
     check(f'{width} corrected {eid} has no page overflow',d['scroll']<=d['width']+1,{'width':d['width'],'scroll':d['scroll']})
     if eid=='slides-extraneous-text':check(f'{width} corrected graphic keeps both labelled nodes and subpoints',all(t in d['body'] for t in ['Point 1','Point 2','Subpoint','Small Graphic & Small Text','Zoomed In & Clear']))
     page.close()
  finally: browser.close()
except Exception as e: check('driver completes',False,str(e))
finally:
 server.shutdown();server.server_close();shutil.rmtree(scratch)
 evidence={'checks':rows,'passed':sum(x['pass_'] for x in rows),'failed':sum(not x['pass_'] for x in rows),'scratchRemoved':not scratch.exists()}
 (review/'evidence-review-integrated-books-focused-v4-2026-10-28.json').write_text(json.dumps(evidence,indent=2)+'\n')
 print(json.dumps({k:v for k,v in evidence.items() if k!='checks'}));print(json.dumps([x for x in rows if not x['pass_']]))
 raise SystemExit(1 if evidence['failed'] else 0)
