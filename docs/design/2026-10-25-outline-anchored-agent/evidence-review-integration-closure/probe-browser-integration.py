import json,mimetypes,re,sys,traceback
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent
payload=json.loads((HERE/'scratch/browser-fixture.json').read_text())
checks=[]
def check(name,passed,detail=None):
 checks.append(dict(name=name,passed=bool(passed),detail=detail));print(('PASS ' if passed else 'FAIL ')+name+' '+json.dumps(detail,ensure_ascii=False),flush=True)
SPEECH='''()=>{window.utterances=[];window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};const listeners={};Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,paused:false,getVoices:()=>[{default:true,lang:'en-GB',name:'SYNTHETIC British',voiceURI:'syn-gb',localService:true}],addEventListener(t,f){(listeners[t]??=[]).push(f)},removeEventListener(t,f){listeners[t]=(listeners[t]||[]).filter(x=>x!==f)},speak(u){window.utterances.push(u);this.speaking=true},cancel(){this.speaking=false},pause(){this.paused=true},resume(){this.paused=false}}})}'''
try:
 with sync_playwright() as p:
  shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
  browser=p.chromium.launch(headless=True,executable_path=str(shell))
  try:
   context=browser.new_context(viewport={'width':1440,'height':900})
   page=context.new_page();page.set_default_timeout(6000)
   page.route('https://fixture.example/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'))
   page.goto('https://fixture.example/sub/?book=fixture&section=one');page.evaluate(SPEECH);page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle']);page.evaluate('mount()')
   page.locator('[data-publication-content] p').first.wait_for();page.wait_for_timeout(200)
   check('framework agent access defaults off',page.locator('[data-publication-agent]').count()==0)
   page.evaluate("mount('fixture',{path:'/sub/custom/'})");page.wait_for_timeout(200)
   page.locator('[data-publication-agent] summary').click()
   prompt=page.locator('[data-publication-agent] code').inner_text()
   check('configured framework chapter prompt uses public book-specific URL and citations','https://fixture.example/sub/custom/fixture/chapters/one.md' in prompt and 'Cite chapter titles' in prompt,prompt)
   # Exercise plain-HTTP clipboard fallback deterministically; do not touch the system clipboard.
   page.evaluate("()=>{window.copied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});document.execCommand=cmd=>{window.copied=document.querySelector('textarea[aria-hidden]').value;return cmd==='copy'};return null}")
   page.locator('.publication-agent-prompt button').click();page.wait_for_timeout(80)
   check('clipboard fallback copies complete prompt and restores focus',page.evaluate('window.copied')==prompt and page.locator('.publication-agent-prompt button').evaluate('(e)=>document.activeElement===e'))
   page.locator('[data-publication-agent] summary').click()
   before=page.evaluate("(()=>{const c=document.querySelector('[data-publication-content]');const math=c.querySelector('math');return {html:c.innerHTML,text:reviewModel(c).text,mathColour:getComputedStyle(math).color,mathText:math.textContent}})()")
   page.get_by_role('button',name='Assist',exact=True).click();page.get_by_role('switch',name='Anchored reading',exact=True).click();page.keyboard.press('Escape');page.wait_for_timeout(180)
   info=page.evaluate("(()=>{const c=document.querySelector('[data-publication-content]'),h=CSS.highlights.get('publication-anchored-lead'),m=reviewModel(c);return {html:c.innerHTML,text:m.text,mathColour:getComputedStyle(c.querySelector('math')).color,pri:h.priority,excluded:[...h].filter(r=>r.startContainer.parentElement.closest('code,math')).length,split:[...h].filter(r=>r.toString()==='emph').map(r=>({text:r.toString(),from:m.points.findIndex(x=>x&&x.node===r.startContainer&&x.offset===r.startOffset)}))}})()")
   check('anchored reading preserves canonical text, markup and inline word offsets',info['html']==before['html'] and info['text']==before['text'] and info['split']==[{'text':'emph','from':before['text'].index('emphasised')}],info)
   check('anchored ranges skip code and MathML',info['excluded']==0)
   check('contrast leaves ignored MathML colour unchanged',info['mathColour']==before['mathColour'],{'before':before['mathColour'],'after':info['mathColour']})
   page.evaluate("document.querySelector('.publication-scroll').style.scrollBehavior='auto';document.querySelector('.publication-scroll').scrollTop=0");page.wait_for_timeout(200)
   page.get_by_role('button',name='Listen',exact=True).click();page.get_by_role('dialog',name='Listen',exact=True).get_by_role('button',name='Start',exact=True).click();page.wait_for_timeout(100)
   for i in range(5):
    if 'emphasised' in page.evaluate('window.utterances.at(-1).text'):break
    page.evaluate('window.utterances.at(-1).onend()');page.wait_for_timeout(80)
   page.evaluate("(()=>{const u=window.utterances.at(-1);u.onboundary({charIndex:u.text.indexOf('emphasised'),charLength:10,name:'word'})})()")
   page.wait_for_timeout(100)
   spoken=page.evaluate("(()=>{const h=n=>{const x=CSS.highlights.get(n);return x?{text:[...x].map(r=>r.toString()).join('|'),priority:x.priority}:null};const c=document.querySelector('[data-publication-content]'),m=reviewModel(c),word=CSS.highlights.get('publication-read-aloud-word');const r=word?[...word][0]:null;return {sentence:h('publication-read-aloud'),word:h('publication-read-aloud-word'),anchored:h('publication-anchored-lead'),offset:r?m.points.findIndex(x=>x&&x.node===r.startContainer&&x.offset===r.startOffset):-1,html:c.innerHTML,text:m.text}})()")
   check('synthetic speech word means the canonical inline word while anchored is active',spoken['word'] is not None and spoken['word']['text']=='emphasised' and spoken['offset']==before['text'].index('emphasised') and spoken['html']==before['html'] and spoken['text']==before['text'],{k:v for k,v in spoken.items() if k not in ['html','text','anchored']})
   check('speech and anchored highlights coexist in correct priority order',spoken['anchored'] is not None and spoken['word'] is not None and spoken['anchored']['priority']<spoken['word']['priority'])
   page.get_by_role('button',name='Stop reading aloud',exact=True).click()
   # Inject saved preferences, remount, and compare both bare-text and inline dimming.
   page.evaluate("localStorage.setItem('publication-reader:mixed:reading-support:v1',JSON.stringify({anchored:true,leadStyle:'colour',overlay:'paragraph',dim:1,dimVersion:3}));history.replaceState(null,'','?book=mixed&section=one');mount('mixed')")
   page.wait_for_timeout(250)
   mixed=page.evaluate("(()=>{const b=document.querySelector('[data-publication-content] blockquote'),h=CSS.highlights.get('rs-dim');return {colour:getComputedStyle(b,'::highlight(rs-dim)').color,anchored:getComputedStyle(b,'::highlight(publication-anchored-lead)').color,priority:h?.priority,dim:h?[...h].map(r=>r.toString()):[],overlay:document.querySelector('.reading-support-surface').dataset.rsOverlay,html:document.querySelector('[data-publication-content]').innerHTML}})()")
   check('mixed paragraph dimming takes priority over anchored colour on bare text',mixed['priority']==0 and any('BEFOREALPHA' in x for x in mixed['dim']) and mixed['colour'].endswith('/ 0)'),mixed)
   page.locator('.reading-support-surface').focus();page.keyboard.press('Escape');page.wait_for_timeout(150)
   first=page.locator('#toc-container a').first;second=page.locator('#toc-container a').nth(1)
   first.click();page.wait_for_timeout(150);first_url=page.url
   second.click();page.wait_for_timeout(150);second_url=page.url
   page.go_back();page.wait_for_timeout(150)
   back_ok=page.url==first_url and page.locator('#toc-container a[aria-current="location"]').count()==1 and first.get_attribute('aria-current')=='location'
   page.go_forward();page.wait_for_timeout(150)
   check('outline links, history and single current-location marker stay aligned',back_ok and page.url==second_url and page.locator('#toc-container a[aria-current="location"]').count()==1 and second.get_attribute('aria-current')=='location',{'first':first_url,'second':second_url,'current':page.url})
   # Outline choice persists separately per book, even when persistent storage is denied.
   page.evaluate("Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('blocked','SecurityError')}})")
   toggle=page.locator('.publication-outline-rail-toggle');toggle.click();page.wait_for_timeout(100)
   check('blocked-storage outline collapses with a usable article',toggle.get_attribute('aria-expanded')=='false' and page.locator('.publication-reading-column').evaluate('(e)=>e.getBoundingClientRect().width')>500)
   page.evaluate("history.replaceState(null,'','?book=other&section=one');mount('other')");page.wait_for_timeout(150)
   check('outline collapse is isolated to its book',toggle.get_attribute('aria-expanded')=='true')
   page.evaluate("history.replaceState(null,'','?book=mixed&section=one');mount('mixed')");page.wait_for_timeout(150)
   check('blocked-storage outline choice restores on return',toggle.get_attribute('aria-expanded')=='false')
   page.keyboard.press('n');page.wait_for_timeout(150)
   check('N restores outline and focuses a visible heading link',toggle.get_attribute('aria-expanded')=='true' and page.evaluate("document.activeElement.matches('#toc-container a')"))
   page.keyboard.press('Escape');page.wait_for_timeout(100)
   check('Escape collapses outline and returns focus',toggle.get_attribute('aria-expanded')=='false' and toggle.evaluate('(e)=>e===document.activeElement'))
   context.close()
   # Actual isolated Vite build under /sub/, using its emitted JS/CSS and generated agent files.
   context=browser.new_context(viewport={'width':1440,'height':900});page=context.new_page();page.set_default_timeout(8000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def serve(route):
    u=urlparse(route.request.url)
    if u.netloc!='books.example.test' or not u.path.startswith('/sub/'):
     route.abort();return
    relative=unquote(u.path[len('/sub/'):]) or 'index.html';target=(HERE/'scratch/sub'/relative).resolve()
    if not target.is_relative_to((HERE/'scratch/sub').resolve()) or not target.is_file():route.fulfill(status=404,body='Missing');return
    route.fulfill(content_type=mimetypes.guess_type(target.name)[0] or 'application/octet-stream',body=target.read_bytes())
   page.route('**/*',serve)
   page.goto('https://books.example.test/sub/?book=language-muscle&section=step-2');page.locator('[data-publication-agent] summary').wait_for();page.locator('[data-publication-agent] summary').click()
   prompt=page.locator('[data-publication-agent] code').inner_text();href=page.locator('.publication-agent-links a').first.get_attribute('href')
   response=page.evaluate("async u=>{const r=await fetch(u);return {status:r.status,text:await r.text()}}",href)
   fixture_path=json.loads((HERE/'agent-review-results.json').read_text())['encodedFixtureChapterPath']
   fixture_response=page.evaluate("async u=>{const r=await fetch(u);return {status:r.status,text:await r.text()}}",'/sub/'+fixture_path)
   check('actual subpath server resolves Unicode and malicious-id escaped filenames',fixture_response['status']==200 and '../a b/?#é' in fixture_response['text'],{'path':fixture_path,'status':fixture_response['status']})
   check('actual Vite subpath build: chapter prompt and full download resolve', '/sub/agent/language-muscle/chapters/step-2.md' in prompt and response['status']==200 and 'SMART Objectives' in response['text'],{'prompt':prompt,'download':href,'status':response['status']})
   page.goto('https://books.example.test/sub/?book=deliberate-practice&frontpage=sol-open-contents');row=page.locator('.publication-front-entry > button').first;row.wait_for();page.keyboard.press('Tab');row.focus()
   focused=row.evaluate("e=>({visible:e.matches(':focus-visible'),outline:getComputedStyle(e).outlineStyle,width:getComputedStyle(e).outlineWidth,colour:getComputedStyle(e).outlineColor,border:getComputedStyle(e).borderRadius})")
   check('quiet chapter rows retain visible keyboard focus',focused['visible'] and focused['outline']!='none' and focused['width']!='0px' and focused['border']=='0px',focused)
   check('actual subpath build has no browser page errors',not errors,errors)
   context.close()
   for url in ['http://100.64.0.1/sub/?book=fixture&section=one','http://100.127.255.254/sub/?book=fixture&section=one','http://mac.ts.net/sub/?book=fixture&section=one']:
    context=browser.new_context();page=context.new_page();page.route('**/*',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'));page.goto(url);page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle']);page.evaluate("mount('fixture',{})");page.locator('[data-publication-agent] summary').wait_for();page.locator('[data-publication-agent] summary').click()
    prompt=page.locator('[data-publication-agent] code').inner_text();text=page.locator('[data-publication-agent]').inner_text()
    check('private host offers attachment prompt and download: '+url,'cannot open' in text and 'http' not in prompt and page.locator('.publication-agent-links a').first.get_attribute('download') is not None,{'prompt':prompt,'download':page.locator('.publication-agent-links a').first.get_attribute('href')});context.close()
   local=HERE/'scratch/private.html';local.write_text('<div id="root"></div>')
   context=browser.new_context();page=context.new_page();page.goto(local.as_uri()+'?book=fixture&section=one');page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle']);page.evaluate("mount('fixture',{})");page.locator('[data-publication-agent] summary').wait_for();page.locator('[data-publication-agent] summary').click()
   text=page.locator('[data-publication-agent]').inner_text();prompt=page.locator('[data-publication-agent] code').inner_text()
   check('file URL with default agent base gives attachment prompt and local download','cannot open' in text and 'file:' not in prompt and page.locator('.publication-agent-links a').first.get_attribute('href').startswith('file:'),prompt);context.close()
  finally:browser.close()
except Exception:
 traceback.print_exc();check('probe completed without harness exception',False,traceback.format_exc())
finally:
 (HERE/'browser-review-results.json').write_text(json.dumps({'checks':checks,'failures':sum(not x['passed'] for x in checks)},ensure_ascii=False,indent=2)+'\n')
sys.exit(1 if any(not x['passed'] for x in checks) else 0)
