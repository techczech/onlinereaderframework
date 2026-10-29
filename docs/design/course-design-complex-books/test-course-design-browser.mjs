import { build } from '../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url)), root=resolve(here,'../../..');
const scratch=mkdtempSync(resolve(here,'.browser-scratch-'));
try {
 const fixture=(await build({absWorkingDir:root,entryPoints:[resolve(here,'fixture-course-design.tsx')],alias:{react:resolve(root,'apps/reader-demo/node_modules/react'),'react-dom':resolve(root,'apps/reader-demo/node_modules/react-dom')},bundle:true,write:false,format:'iife',globalName:'courseFixture',platform:'browser',logLevel:'error'})).outputFiles[0].text;
 const python=String.raw`
import json,sys,threading
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
p=json.load(sys.stdin)
checks=[]
def check(name,ok):
 checks.append({'name':name,'pass':bool(ok)})
 if not ok: raise AssertionError(name)
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_GET(self):
  path=self.path.split('?')[0]
  if path=='/fixture.js':body=p['fixture'];mime='text/javascript'
  elif path=='/reader.css':body=Path(p['root']+'/packages/reader-core/dist/reader.css').read_text();mime='text/css'
  elif path.startswith('/interactives/course-design-frameworks/'):
   suffix=path.removeprefix('/interactives/course-design-frameworks/')
   if suffix not in [x['src'] for x in p['embeds']['items']]:self.send_error(404);return
   body=Path(p['root']+'/apps/reader-demo'+path).read_text();mime='text/html'
  else:body='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/reader.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>';mime='text/html'
  self.send_response(200);self.send_header('Content-Type',mime);self.end_headers();self.wfile.write(body.encode())
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_port)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=str(Path.home()/'Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
  try:
   for width in [390,1280]:
    context=browser.new_context(viewport={'width':width,'height':900})
    page=context.new_page()
    external=[]
    def route(r):
     if not r.request.url.startswith(base):external.append(r.request.url);r.abort()
     else:r.continue_()
    page.route('**/*',route)
    for item in p['embeds']['items']:
     page.goto(base+'/?section='+item['sectionId'])
     locator=page.locator('iframe')
     locator.wait_for()
     check(str(width)+' '+item['id']+' sandbox',locator.get_attribute('sandbox')=='allow-scripts')
     frame=page.frame_locator('iframe')
     frame.get_by_text('Entries are not saved.',exact=False).wait_for()
     if item['id'].endswith('checklist'):
      control=frame.locator('input[type=checkbox]').first
      control.focus();page.keyboard.press('Space')
      check(str(width)+' '+item['id']+' keyboard toggle',control.is_checked())
      check(str(width)+' '+item['id']+' progress',frame.locator('output').inner_text()!='0%')
      frame.get_by_role('button',name='Reset',exact=True).click()
      check(str(width)+' '+item['id']+' reset',not control.is_checked())
      check(str(width)+' '+item['id']+' reset progress',frame.locator('output').inner_text()=='0%')
     else:
      textarea=frame.locator('textarea').first
      check(str(width)+' '+item['id']+' labelled',bool(textarea.get_attribute('aria-label')))
      textarea.focus();page.keyboard.type('Private planning probe')
      check(str(width)+' '+item['id']+' editable', 'Private planning probe' in textarea.input_value())
      page.reload();page.locator('iframe').wait_for()
      check(str(width)+' '+item['id']+' cleared on reload','Private planning probe' not in page.frame_locator('iframe').locator('textarea').first.input_value())
     child=page.frames[1]
     check(str(width)+' '+item['id']+' no page overflow',child.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
     if 'planner' in item['id']:
      region=frame.get_by_role('region',name=item['title'])
      region.focus();page.keyboard.press('ArrowRight')
      check(str(width)+' '+item['id']+' keyboard scroll region',child.evaluate('document.activeElement.className')=='table-scroll')
     check(str(width)+' '+item['id']+' written alternative',page.locator('#reader-content-'+item['anchor']).inner_text().strip()!='')
    for section in p['sectionIds']:
     page.goto(base+'/?section='+section)
     page.locator('[data-publication-content]').wait_for()
     check(str(width)+' '+section+' reader has no document overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    if width==390:
     exported=page.evaluate('courseFixture.exportsCheck()')
     check('EPUB all nine chapters',exported['chapters']==9)
     check('all read-aloud and EPUB source values in order',len(exported['results'])==9)
     p['exportResults']=exported
    check(str(width)+' no external requests',not external)
    context.close()
  finally:browser.close()
finally:server.shutdown();server.server_close()
print(json.dumps({'checks':checks,'exports':p.get('exportResults')},indent=2))
`;
 const run=spawnSync(resolve(root,'../book-engine/.venv/bin/python'),['-c',python],{input:JSON.stringify({fixture,root,sectionIds:JSON.parse(readFileSync(resolve(root,'apps/reader-demo/src/books/next-books/course-design-frameworks.book.json'),'utf8')).sections.map(s=>s.id),embeds:JSON.parse(readFileSync(resolve(root,'apps/reader-demo/src/books/next-books/course-design-frameworks-embed-manifest.json'),'utf8'))}),encoding:'utf8',maxBuffer:4*1024*1024,env:{...process.env,TMPDIR:scratch}});
 process.stdout.write(run.stdout??'');process.stderr.write(run.stderr??'');
 if(run.status===0)writeFileSync(resolve(here,'evidence-course-design-browser.json'),run.stdout);
 process.exitCode=run.status??1;
} finally {rmSync(scratch,{recursive:true,force:true});}
