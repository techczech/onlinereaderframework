import {build} from '../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import {mkdtempSync,rmSync} from 'node:fs';import {resolve} from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const out=fileURLToPath(new URL('.',import.meta.url)),root=resolve(out,'../../..');
const fixture=`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {MarkdownRenderer} from './MarkdownRenderer.tsx';
import {ReadAloudController} from './read-aloud/read-aloud-controller.ts';
import {buildPublicationSpeakable} from './read-aloud/read-aloud-speakable.ts';
window.controllers={};window.states={};
function App(){const [a,setA]=useState(true);window.removeA=()=>setA(false);return <>{a&&<MarkdownRenderer bookId="review-a" content={'# A\\n\\nAlpha first. Alpha second.'} onReadAloudChange={(s,a)=>{window.states.a=s;window.controllers.a=a}}/>}<MarkdownRenderer bookId="review-b" content={'# B\\n\\nBeta first. Beta second.'} onReadAloudChange={(s,a)=>{window.states.b=s;window.controllers.b=a}}/></>};
window.mount=()=>createRoot(document.getElementById('root')).render(<App/>);
window.longProbe=()=>{const controller=new ReadAloudController({capability:{sourceKind:'live',busy:()=>true,cancel(){},pause(){},resume(){},setRate(){},voices:()=>[],speak(){}},silenceMs:30,storage:{read:()=>({voiceURI:null,rate:1,follow:false}),write:()=>true}});const el=document.createElement('div');el.innerHTML='<p>A long sentence spoken without boundary events.</p>';controller.load(buildPublicationSpeakable(el));controller.start();window.longController=controller;};
`;
const bundle=await build({absWorkingDir:root,stdin:{resolveDir:resolve(root,'packages/reader-core/src/original'),contents:fixture,loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',alias:{react:resolve(root,'apps/reader-demo/node_modules/react'),'react-dom':resolve(root,'apps/reader-demo/node_modules/react-dom')}});
const py=String.raw`
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
cfg=json.load(sys.stdin);results={}
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 browser=p.chromium.launch(headless=True,executable_path=str(shell))
 try:
  context=browser.new_context(viewport={'width':1280,'height':800});page=context.new_page();page.set_default_timeout(6000)
  page.route('https://review.test/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'))
  page.goto('https://review.test/')
  page.evaluate('''()=>{window.events=[];window.utterances=[];window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,getVoices:()=>[],addEventListener(){},removeEventListener(){},cancel(){window.events.push('cancel');this.speaking=false},speak(u){window.events.push('speak '+u.text);window.utterances.push(u);this.speaking=true},pause(){this.paused=true},resume(){this.paused=false}}})}''')
  page.add_script_tag(content=cfg['bundle']);page.evaluate('window.mount()');page.wait_for_function('window.controllers.a&&window.controllers.b')
  page.evaluate('window.controllers.a.start()');page.wait_for_timeout(40)
  page.evaluate('window.controllers.b.start()');page.wait_for_timeout(40)
  results['twoAfterB']=page.evaluate('({a:window.states.a.status,b:window.states.b.status,busy:speechSynthesis.speaking,events:window.events})')
  page.evaluate('window.removeA()');page.wait_for_timeout(60)
  results['afterUnmountA']=page.evaluate('({b:window.states.b.status,busy:speechSynthesis.speaking,events:window.events})')
  page.evaluate('window.controllers.b.stop();window.longProbe()');page.wait_for_timeout(140)
  results['busyNoBoundaryAfterThreeWatchdogs']=page.evaluate('window.longController.getSnapshot()')
  page.evaluate('window.longController.dispose()')
  context.close()
  context=browser.new_context(viewport={'width':1280,'height':800});page=context.new_page();page.set_default_timeout(6000)
  page.goto('http://127.0.0.1:8773/?book=deliberate-practice&section=schemas');page.locator('#toc-container a').first.wait_for();page.wait_for_timeout(250)
  def state():return page.evaluate('''()=>({hash:location.hash,focus:document.activeElement?.id,current:[...document.querySelectorAll('#toc-container a[aria-current="location"]')].map(a=>a.hash),compactCurrent:[...document.querySelectorAll('#toc-container-compact a[aria-current="location"]')].map(a=>a.hash),scroll:document.querySelector('.publication-scroll').scrollTop})''')
  page.locator('#toc-container a').nth(1).click();page.wait_for_timeout(1400);results['navFirst']=state()
  page.locator('#toc-container a').nth(5).click();page.wait_for_timeout(1400);results['navSecond']=state()
  page.go_back();page.wait_for_timeout(1400);results['navBack']=state()
  page.go_forward();page.wait_for_timeout(1400);results['navForward']=state()
  page.set_viewport_size({'width':1024,'height':768});page.wait_for_timeout(300);page.keyboard.press('n');page.wait_for_timeout(100)
  results['afterResponsiveShortcut']=state()
  results['outlineVisible']=page.locator('nav[aria-label="On this page"]').evaluate_all('els=>els.filter(e=>e.getClientRects().length).map(e=>e.id)')
  context.close()
 finally:browser.close()
print(json.dumps(results,ensure_ascii=False,indent=2))
`;
const scratch=mkdtempSync(resolve(out,'.review-seams-'));
try{const run=spawnSync(resolve(root,'../book-engine/.venv/bin/python'),['-c',py],{input:JSON.stringify({bundle:bundle.outputFiles[0].text}),encoding:'utf8',timeout:30000,env:{...process.env,TMPDIR:scratch,TMP:scratch,TEMP:scratch}});process.stdout.write(run.stdout??'');process.stderr.write(run.stderr??'');if(run.error)throw run.error;process.exitCode=run.status??1;}finally{rmSync(scratch,{recursive:true,force:true})}
