/** Independent review probes. No production writes; scratch and evidence stay beside this file. */
import {readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const evidence = dirname(fileURLToPath(import.meta.url));
const root = resolve(evidence, '../../..');
const original = resolve(root, 'packages/reader-core/src/embed');
const scratch = mkdtempSync(resolve(evidence, '.review-embed-scratch-'));
const results = [];
function run(label, cmd, args, options={}) {
 const p=spawnSync(cmd,args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,TMPDIR:scratch},...options});
 const item={label,exit:p.status,stdout:p.stdout,stderr:p.stderr,error:p.error?.message};results.push(item);return item;
}
try {
 const unit=readFileSync(resolve(original,'test-embed.mjs'),'utf8')
  .replace('const directory = path.dirname(fileURLToPath(import.meta.url));',`const directory = ${JSON.stringify(original)};`)
  .replace("mkdtempSync(path.join(directory, '.test-build-'))",`mkdtempSync(${JSON.stringify(resolve(scratch,'unit-'))})`)
  .replace('mkdtempSync, rmSync', 'mkdtempSync, rmSync, symlinkSync')
  .replace('try {', `try { symlinkSync(${JSON.stringify(resolve(root,'packages/reader-core/node_modules'))}, path.join(output,'node_modules'));`);


 let harness=readFileSync(resolve(original,'test-embed-headless.mjs'),'utf8')
  .replace("from '../../../../apps/reader-demo/node_modules/esbuild/lib/main.js'",`from ${JSON.stringify(pathToFileURL(resolve(root,'apps/reader-demo/node_modules/esbuild/lib/main.js')).href)}`)
  .replace('const directory = dirname(fileURLToPath(import.meta.url));',`const directory = ${JSON.stringify(original)};`)
  .replace("mkdtempSync(resolve(directory, '.test-headless-'))",`mkdtempSync(${JSON.stringify(resolve(scratch,'baseline-'))})`);

 const {build}=await import(pathToFileURL(resolve(root,'apps/reader-demo/node_modules/esbuild/lib/main.js')).href);
 const alias={react:resolve(root,'apps/reader-demo/node_modules/react'),'react-dom':resolve(root,'apps/reader-demo/node_modules/react-dom')};
 const bundle=async(contents,platform='browser',format='iife')=>(await build({stdin:{contents,resolveDir:root},alias,bundle:true,write:false,platform,format,logLevel:'error'})).outputFiles[0].text;
 const source=`
 import React from './apps/reader-demo/node_modules/react/index.js';
 import {createRoot} from './apps/reader-demo/node_modules/react-dom/client.js';
 import {buildAgentBook} from './packages/reader-core/src/agent-export/agent-export.ts';
 import {createXhtml,appendPublicationContent,serializeXml} from './packages/reader-core/src/services/publication-epub/epub-xhtml.ts';
 import {anchoredRangeSets} from './packages/reader-core/src/original/reading-support/anchored-reading.ts';
 import {buildPublicationSpeakable} from './packages/reader-core/src/original/read-aloud/read-aloud-speakable.ts';
 import {PublicationReader} from './packages/reader-core/src/original/PublicationReader.tsx';
 import {MarkdownRenderer} from './packages/reader-core/src/original/MarkdownRenderer.tsx';
 import {renderPublicationContent} from './packages/reader-core/src/publication-content/index.ts';
 import {publicationTextModel,preparePublicationHTML,findPublicationTextRange} from './packages/reader-core/src/original/publication-html.ts';
 import {validatePublicationEmbeds,resolvePublicationEmbedUrl,readPublicationEmbedHeight} from './packages/reader-core/src/embed/embed-model.ts';
 const prose='Canonical alternative explains the complete local interactive diagram and preserves every relationship for search, speech and highlighting.';
 let root;let setHighlights;
 window.probe={
 mount(src='good.html', anchorTag='div'){
   const embeds=validatePublicationEmbeds({items:[{id:'probe',sectionId:'section',anchor:'alternative',src,title:'Independent interactive',height:{initial:300,min:200,max:900}}]}).embeds;
   function App(){const [highlights,set]=React.useState([]);setHighlights=set;return React.createElement(MarkdownRenderer,{content:'<'+anchorTag+' id="alternative">'+prose+'</'+anchorTag+'>',format:'html',highlights,embeds});}
   root=createRoot(document.getElementById('root'));root.render(React.createElement(App));
 },mountFull(tag='div'){root=createRoot(document.getElementById('root'));root.render(React.createElement(PublicationReader,{book:{id:'review',title:'Review',author:'Author',description:'Review',sections:[{id:'section',title:'Section',category:'Part',format:'html',content:'<'+tag+' id="alternative">'+prose+'</'+tag+'>'}]},embeds:{items:[{id:'probe',sectionId:'section',anchor:'alternative',src:'good.html',title:'Independent interactive'}]},epub:false}));},annotate(){setHighlights([{id:'highlight',text:'complete local interactive diagram',sectionId:'section',sectionTitle:'Section',date:0}]);},
 unmount(){root.unmount();},
 snapshot(){const r=document.querySelector('[data-publication-content]');return {text:r?publicationTextModel(r).text:null,frames:r?.querySelectorAll('iframe').length,marks:r?.querySelectorAll('mark').length,height:document.querySelector('iframe')?.style.height,src:document.querySelector('iframe')?.src,links:[...document.querySelectorAll('.publication-embed-links a')].map(a=>a.href),focus:document.activeElement?.id,overflow:document.documentElement.scrollWidth>innerWidth};},
 forgery(){const variants=['data-publication-embed','DATA-PUBLICATION-EMBED','data-publicationEmbed','dataPublicationEmbed','data-publication-embed="x" data-footnotes','data&#45;publication-embed'];return variants.map(a=>{const html=renderPublicationContent('<div '+a+'="x">FORGED VISIBLE PROSE</div>','html');const t=document.createElement('template');t.innerHTML=html;return {a,html,text:publicationTextModel(t.content).text};});},
 prosePaths(){const r=document.querySelector('[data-publication-content]');const content='<div id="alternative">'+prose+'</div>';const b={id:'synthetic',title:'Synthetic',author:'Author',description:'Description',sections:[{id:'section',title:'Section',category:'Part',content,format:'html'}]};const a=buildAgentBook(b).files;const xml=createXhtml('Synthetic','en','style.css');appendPublicationContent(xml,content,'html');const x=serializeXml(xml);return {speech:buildPublicationSpeakable(r).speakable.text,assist:anchoredRangeSets(r).lead.map(range=>range.toString()).join(''),agent:a.filter(f=>f.path.endsWith('/full.md')||f.path.includes('/chapters/')).every(f=>f.content.includes(prose)&&!f.content.includes('Open full view')&&!f.content.includes('<iframe')),epub:x.includes(prose)&&!x.includes('<iframe')&&!x.includes('Open full view'),search:findPublicationTextRange(r,'complete local interactive diagram')?.toString()};},
 urls(){return ['https://reader.invalid/sub/index.html','https://other.invalid/sub/','https://reader.invalid/a/%2e%2e/sub/','https://reader.invalid/sub/?q#f'].map(base=>({base,url:resolvePublicationEmbedUrl('embeds/good.html','embeds/',base)?.href}));},
 payloads(){return [NaN,Infinity,-1,100001,'400',null,{},[],400].map(height=>({input:String(height),output:readPublicationEmbedHeight('null',{type:'reader-embed:height',version:1,height},{min:200,max:900})}));}
 };
 `;
 const fixture=await bundle(source);
 const hdr=resolve(scratch,'headers.mjs');writeFileSync(hdr,await bundle("export * from './apps/reader-demo/scripts/release/headers.ts'",'node','esm'));
 const {EMBED_CONTENT_SECURITY_POLICY,CONTENT_SECURITY_POLICY}=await import(pathToFileURL(hdr).href);
 const python=String.raw`
import json, threading, sys, time
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
p=json.load(sys.stdin); checks=[]; loads=[]
def check(name,actual,expected): checks.append(dict(name=name,actual=actual,expected=expected,passed=actual==expected))
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?')[0];loads.append(dict(port=self.server.server_port,path=path))
  body='';typ='text/html';status=200;policy=None
  if path=='/fixture.js': body=p['fixture'];typ='text/javascript'
  elif path=='/reader.css':body=Path(p['css']).read_text();typ='text/css'
  elif path=='/foreign-base.html':body=f'<base href="http://127.0.0.1:{other.server_port}/"><link rel="stylesheet" href="{base}/reader.css"><div id="root"></div><script src="{base}/fixture.js"></script>'
  elif path=='/':body='<link rel="stylesheet" href="/reader.css"><div id="root"></div><script src="/fixture.js"></script>';policy=p['site']
  elif path=='/embeds/good.html':
   policy=p['embed'];body='''<button id="state" onclick="this.textContent=\'Changed\'">Initial</button><script>window.token=Math.random();parent.postMessage({type:'reader-embed:height',version:1,height:650},'*');</script>'''
  elif path=='/embeds/blocked.html':policy=p['site'];body='<script>window.ran=true</script>'
  else:status=404;body='Missing asset'
  self.send_response(status)
  self.send_header('Content-Type',typ)
  if policy:self.send_header('Content-Security-Policy',policy)
  self.end_headers();self.wfile.write(body.encode())
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);other=ThreadingHTTPServer(('127.0.0.1',0),Handler)
base=f'http://127.0.0.1:{server.server_port}'
for s in [server,other]:threading.Thread(target=s.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
  browser=pw.chromium.launch(headless=True,executable_path=str(shells[-1]))
  try:
   context=browser.new_context(viewport=dict(width=320,height=800));page=context.new_page();page.goto(base)
   print('BROWSER '+browser.version,file=sys.stderr)
   print('URL_VARIANTS '+json.dumps(page.evaluate('probe.urls()')),file=sys.stderr)
   print('PAYLOAD_VARIANTS '+json.dumps(page.evaluate('probe.payloads()')),file=sys.stderr)
   forged=page.evaluate('probe.forgery()');check('manuscript attribute spelling variants keep canonical prose',all(v['text']=='FORGED VISIBLE PROSE' for v in forged),True)
   page.evaluate('probe.mount()');page.wait_for_selector('iframe');page.wait_for_timeout(500)
   s=page.evaluate('probe.snapshot()');check('320px no horizontal overflow',s['overflow'],False);check('reported height accepted',s['height'],'650px')
   check('canonical live text omits chrome',s['text'].startswith('Canonical alternative') and 'Open full view' not in s['text'],True)
   paths=page.evaluate('probe.prosePaths()');check('speech preserves canonical prose and excludes chrome',paths['speech'].startswith('Canonical alternative') and 'Open full view' not in paths['speech'],True);check('assist excludes chrome words',bool(paths['assist']) and 'Open' not in paths['assist'],True);check('agent chapter and full exports preserve prose without frame',paths['agent'],True);check('EPUB XHTML preserves prose without frame',paths['epub'],True);check('search range targets prose beside frame',paths['search'],'complete local interactive diagram')
   f=page.frames[1];f.locator('#state').click();before=f.evaluate('window.token');page.evaluate('probe.annotate()');page.wait_for_timeout(700)
   after=page.frames[1].evaluate('window.token');s=page.evaluate('probe.snapshot()')
   check('highlight survives frame insertion/reload',s['marks'],1);check('annotation retains canonical prose',s['text'].startswith('Canonical alternative'),True)
   check('annotation reload observed as documented',before!=after,True);check('last height retained across annotation',s['height'],'650px')
   check('state resets as documented',page.frames[1].locator('#state').inner_text(),'Initial')
   page.evaluate('probe.unmount()');page.goto(base+'/?section=section');page.evaluate('probe.mountFull()');page.wait_for_selector('iframe');
   page.locator('a',has_text='Skip to text version').focus();page.keyboard.press('Enter');page.wait_for_timeout(200)
   check('keyboard skip for div anchor',page.evaluate('probe.snapshot().focus'),'reader-content-alternative')
   page.evaluate('probe.unmount()');page.goto(base)
   page.evaluate('probe.mount()');page.wait_for_selector('iframe')
   for src in ['missing.html','blocked.html']:
    page.evaluate('probe.unmount()');page.evaluate('(src)=>probe.mount(src)',src);page.wait_for_selector('iframe');page.wait_for_timeout(300)
    check(src+' fallback text remains readable',page.evaluate('probe.snapshot().text').startswith('Canonical alternative'),True)
    check(src+' skip remains keyboard accessible',page.locator('a',has_text='Skip to text version').is_visible(),True)
   page.goto(base+'/foreign-base.html');page.evaluate('probe.mount()');page.wait_for_selector('iframe');page.wait_for_timeout(400)
   s=page.evaluate('probe.snapshot()');expected=base+'/embeds/good.html'
   check('SPEC: foreign document base cannot move frame off page origin',s['src'],expected)
   check('SPEC: foreign document base cannot move full-view link off page origin',s['links'][1],expected)
   print('FOREIGN_BASE_REQUESTS '+json.dumps([r for r in loads if r['port']==other.server_port]),file=sys.stderr)
   context.close()
  finally:browser.close()
finally:
 server.shutdown();other.shutdown();server.server_close();other.server_close()
print(json.dumps(checks,indent=2));sys.exit(1 if any(not c['passed'] for c in checks) else 0)
`;
 run('independent edge probes',resolve(root,'../book-engine/.venv/bin/python'),['-c',python],{input:JSON.stringify({fixture,css:resolve(root,'packages/reader-core/dist/reader.css'),embed:EMBED_CONTENT_SECURITY_POLICY,site:CONTENT_SECURITY_POLICY})});
} finally {
 rmSync(scratch,{recursive:true,force:true});
 const files=['packages/reader-core/src/embed/embed-model.ts','packages/reader-core/src/embed/PublicationEmbedFrame.tsx','packages/reader-core/src/embed/embed-child.ts','packages/reader-core/src/embed/embed-check.ts','packages/reader-core/src/original/MarkdownRenderer.tsx','packages/reader-core/src/original/publication-html.ts','packages/reader-core/src/original/PublicationReader.tsx','packages/reader-core/src/original/ReaderLayout.tsx','packages/reader-core/src/original/types.ts','packages/reader-core/src/index.ts','packages/reader-core/package.json','scripts/build-reader-styles.mjs','apps/reader-demo/scripts/release/headers.ts','scripts/prepare-reader-source-release.mjs','packages/reader-core/src/publication-content/publication-schema.ts'];
 const hashes=files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex')}));
 const output={results,hashes,scratchRemoved:!readdirSync(evidence).some(n=>n.startsWith('.review-embed-scratch-'))};
 writeFileSync(resolve(evidence,'evidence-review-embed-sol-prose-2026-10-28.json'),JSON.stringify(output,null,2)+'\n');
 for(const r of results)console.log(r.label+': exit '+r.exit+'\n'+r.stdout.slice(-1500)+'\n'+r.stderr.slice(-1500));
 process.exitCode=results.every(r=>r.exit===0)?0:1;
}
