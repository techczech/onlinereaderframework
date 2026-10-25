/** Independent, silent repair-seam probes. Does not alter production sources or shared build output. */
import {build} from '../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import {mkdtempSync, rmSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
const out=fileURLToPath(new URL('.',import.meta.url)), root=resolve(out,'../../..');
const source=resolve(root,'packages/reader-core/src/original');
const fixture=String.raw`
import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
import {ReadAloudController,browserReadAloudCapability} from './read-aloud/read-aloud-controller.ts';
import {ListeningPanel} from './listening/ListeningPanel.tsx';
import {MarkdownRenderer} from './MarkdownRenderer.tsx';
const text='First sentence. Second sentence. Third sentence.';
const parts={speakable:{text,segments:[{blockId:'p',kind:'paragraph',sourceFrom:0,sourceTo:text.length,spokenFrom:0,spokenTo:text.length}],pieces:[{sourceFrom:0,sourceTo:text.length,spokenFrom:0,spokenTo:text.length}]},model:{text,points:[]}};
window.makeController=(options={})=>{const c=new ReadAloudController({capability:browserReadAloudCapability(),storage:{read:()=>({voiceURI:null,rate:1,follow:false}),write:()=>true},silenceMs:20,...options});c.load(parts);return c};
window.sinks={};window.regEvents=[];
window.reg={a:p=>{window.sinks.a=p;window.regEvents.push(['a',!!p])},b:p=>{window.sinks.b=p;window.regEvents.push(['b',!!p])}};
const sections=[{id:'one',title:'One',content:'# One\n\nFirst sentence.'}];
window.mountPanel=(owner)=>{window.reviewReactRoot??=createRoot(document.getElementById('root'));flushSync(()=>window.reviewReactRoot.render(<ListeningPanel bookId="closure" sections={sections} currentSectionId="one" onSelectSection={()=>{}} onClose={()=>{}} registerPause={window.reg[owner]}/>))};
window.mountRenderer=(name)=>{window.reviewReactRoot??=createRoot(document.getElementById('root'));flushSync(()=>window.reviewReactRoot.render(<MarkdownRenderer bookId="callback" content={'# One\n\nFirst sentence. Second sentence.'} onBrowserSpeechStart={()=>window.engages.push(name)} onReadAloudChange={(s,a)=>{window.rendererState=s;window.rendererActions=a}}/>))};
window.mountPair=()=>{window.pairApi={};window.pairStates={};window.reviewReactRoot??=createRoot(document.getElementById('root'));flushSync(()=>window.reviewReactRoot.render(<>{['a','b'].map(id=><MarkdownRenderer key={id} bookId={'pair-'+id} content={'# '+id+'\n\nFirst sentence. Second sentence.'} onReadAloudChange={(state,api)=>{window.pairStates[id]=state;window.pairApi[id]=api}}/>)}</>))};
window.unmount=()=>{flushSync(()=>window.reviewReactRoot?.unmount());window.reviewReactRoot=null};
`;
const bundle=await build({absWorkingDir:root,stdin:{resolveDir:source,contents:fixture,loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',alias:{react:resolve(root,'apps/reader-demo/node_modules/react'),'react-dom':resolve(root,'apps/reader-demo/node_modules/react-dom')}});
const ssr=await build({absWorkingDir:root,stdin:{resolveDir:source,contents:`import React from 'react';import {renderToString} from 'react-dom/server';import {PublicationReader} from './PublicationReader.tsx';module.exports=()=>renderToString(React.createElement(PublicationReader,{epub:false,audio:[{sectionId:'one',src:'/silent.wav'}],book:{id:'ssr-closure',title:'SSR',sections:[{id:'one',title:'One',content:'# One\\n\\nText.'}]}}));`,loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',external:['react','react-dom','react-dom/*']});
const mod={exports:{}};
new Function('require','module','exports',ssr.outputFiles[0].text)(createRequire(resolve(root,'packages/reader-core/package.json')),mod,mod.exports);
const rendered=mod.exports();
console.log(JSON.stringify({ssrWithoutWindow:typeof window==='undefined'&&rendered.length>0,renderedBytes:rendered.length}));
const python=String.raw`
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
cfg=json.load(sys.stdin)
ENGINE='''()=>{window.events=[];window.utterances=[];window.engages=[];
 window.SpeechSynthesisUtterance=class extends EventTarget{constructor(t){super();this.text=t}fireStart(){this.started=true;this.dispatchEvent(new Event('start'))}};
 const engine={paused:false,speaking:false,autoStart:true,getVoices:()=>[],addEventListener(){},removeEventListener(){},
 cancel(){window.events.push('cancel');this.speaking=false},pause(){window.events.push('pause');this.paused=true},
 resume(){window.events.push('resume');this.paused=false;let u=window.utterances.at(-1);if(this.speaking&&!u?.started&&this.autoStart)u?.fireStart()},
 speak(u){window.events.push('speak');window.utterances.push(u);this.speaking=true;if(!this.paused&&this.autoStart)u.fireStart()}};
 window.originalSpeak=engine.speak;Object.defineProperty(window,'speechSynthesis',{configurable:true,value:engine})}'''
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 browser=p.chromium.launch(headless=True,executable_path=str(shell))
 try:
  page=browser.new_page(viewport={'width':1280,'height':800});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://closure.test/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'))
  page.goto('https://closure.test/');page.evaluate(ENGINE);page.add_script_tag(content=cfg['bundle'])
  result=page.evaluate('''async()=>{
   const checks=[];const check=(name,ok,detail)=>checks.push({name,passed:!!ok,detail});const wait=ms=>new Promise(r=>setTimeout(r,ms));
   // Use an EventTarget utterance: its start event must go through the actual Web Speech adapter wrapper.
   let a=makeController(),b=makeController();a.start();let old=utterances.at(-1);b.start();
   const before=events.length, bSentence=b.getSnapshot().sentence;
   a.pause();a.resume();a.stop();a.load({speakable:{text:'Changed.',segments:[],pieces:[]},model:{text:'Changed.',points:[]}});a.dispose();
   old.fireStart();old.onboundary?.({charIndex:3});old.onend?.();old.onerror?.({error:'canceled'});
   check('superseded owner cannot pause, resume, stop, reload, dispose or deliver events',a.getSnapshot().status==='idle'&&b.getSnapshot().status==='speaking'&&events.length===before&&JSON.stringify(b.getSnapshot().sentence)===JSON.stringify(bSentence),{events:events.slice(before),a:a.getSnapshot().status,b:b.getSnapshot().status});
   b.dispose();
   // cancel() deliberately leaves the shared paused flag intact, matching the browser variation already guarded in production.
   a=makeController();b=makeController();a.start();a.pause();b.start();
   const takeover={a:a.getSnapshot().status,b:b.getSnapshot().status,enginePaused:speechSynthesis.paused,engineSpeaking:speechSynthesis.speaking,bStarted:!!utterances.at(-1).started,events:[...events]};
   check('takeover of a paused reader starts the newer utterance',!takeover.enginePaused&&takeover.bStarted&&takeover.a==='idle'&&takeover.b==='speaking',takeover);
   a.pause();a.resume();check('old pause and resume after paused takeover do not touch the engine',speechSynthesis.paused===takeover.enginePaused);
   a.dispose();b.dispose();speechSynthesis.paused=false;
   a=makeController();a.start();await wait(180);
   check('adapter onstart without boundaries stays speaking past the full start window',a.getSnapshot().status==='speaking'&&a.getSnapshot().wordTiming==='sentence',{status:a.getSnapshot().status,started:utterances.at(-1).started});
   a.pause();await wait(160);check('pause excludes watchdog wait after start',a.getSnapshot().status==='paused'&&!a.getSnapshot().problem);
   a.resume();await wait(160);check('resume rearms while started busy speech stays alive',a.getSnapshot().status==='speaking');
   speechSynthesis.speaking=false;await wait(60);check('started engine going inactive without end is reported',a.getSnapshot().status==='idle'&&/stopped reading without saying why/.test(a.getSnapshot().problem),a.getSnapshot().problem);a.dispose();
   speechSynthesis.autoStart=false;a=makeController();a.start();a.pause();await wait(160);check('never-started paused utterance does not consume wait',a.getSnapshot().status==='paused');a.resume();await wait(45);check('never-started resume receives a fresh wait',a.getSnapshot().status==='speaking');await wait(130);check('never-started adapter retains bounded failure',a.getSnapshot().status==='idle'&&/has not started/.test(a.getSnapshot().problem),a.getSnapshot().problem);a.dispose();speechSynthesis.autoStart=true;
   // Preserve the page engine method even if native submission throws. Do not request actual speech.
   check('adapter restores an own speak method',speechSynthesis.speak===originalSpeak);
   const ownSpeak=speechSynthesis.speak, proto=Object.getPrototypeOf(speechSynthesis);delete speechSynthesis.speak;proto.speak=ownSpeak;
   a=makeController();a.start();check('adapter restores inherited speak without leaving an own method',!Object.hasOwn(speechSynthesis,'speak')&&speechSynthesis.speak===ownSpeak);a.dispose();delete proto.speak;speechSynthesis.speak=ownSpeak;
   let engaged=[];a=makeController({onEngage:()=>engaged.push('old')});a.start();a.pause();a.resume();a.pause();a.skip('sentence',1);check('engage runs for start, resume and skip from pause',engaged.length===3,engaged);a.dispose();
   mountRenderer('old');await wait(40);rendererActions.start();rendererActions.pause();mountRenderer('new');await wait(40);rendererActions.resume();await wait(20);
   check('renderer uses the latest engage callback after rerender',engages.join(',')==='old,new',engages);unmount();
   mountPanel('a');await wait(40);check('recorded player registers pause after mount',typeof sinks.a==='function',[...regEvents]);
   mountPanel('b');await wait(40);
   check('changing registration owner clears old sink and registers current sink',sinks.a===null&&typeof sinks.b==='function',{a:typeof sinks.a,b:typeof sinks.b,events:[...regEvents]});
   unmount();await wait(40);check('unmount clears every registered pause sink',sinks.a===null&&sinks.b===null,{a:typeof sinks.a,b:sinks.b,events:[...regEvents]});
   mountPanel('a');await wait(30);unmount();await wait(30);check('stable recorded registration owner receives null on unmount',sinks.a===null);
   speechSynthesis.paused=false;mountPair();await wait(40);pairApi.a.start();pairApi.a.pause();pairApi.b.start();await wait(25);const pair={a:pairStates.a.status,b:pairStates.b.status,enginePaused:speechSynthesis.paused,newUtteranceStarted:!!utterances.at(-1).started};check('real renderer takeover of paused predecessor starts speech',pair.a==='idle'&&pair.b==='speaking'&&!pair.enginePaused&&pair.newUtteranceStarted,pair);unmount();
   return {checks,passed:checks.filter(c=>c.passed).length,total:checks.length};
  }''')
  result['pageErrors']=errors
  print(json.dumps(result,indent=2))
  # A second context tests the URL and both outline presentations in the existing real-book preview.
  page.close();page=browser.new_page(viewport={'width':1280,'height':800});page.set_default_timeout(8000)
  page.goto('http://127.0.0.1:8773/?book=deliberate-practice&section=schemas');page.locator('#toc-container a').first.wait_for()
  states=[]
  def state(label):
   d=page.evaluate('''()=>({hash:location.hash,focus:document.activeElement?.id,rail:[...document.querySelectorAll('#toc-container a[aria-current="location"]')].map(a=>a.hash),compact:[...document.querySelectorAll('#toc-container-compact a[aria-current="location"]')].map(a=>a.hash)})''');d['step']=label;states.append(d);return d
  page.locator('#toc-container a').nth(1).click();page.wait_for_timeout(1400);state('first')
  page.locator('#toc-container a').nth(5).click();page.wait_for_timeout(1400);state('second')
  page.go_back();page.wait_for_timeout(300);state('back')
  page.set_viewport_size({'width':1024,'height':768});page.wait_for_timeout(300);state('back then resize')
  page.go_forward();page.wait_for_timeout(300);state('forward at compact width')
  page.reload();page.locator('#toc-container a').first.wait_for(state='attached');page.wait_for_timeout(300);state('copied subsection reload')
  converged=all(s['rail']==[s['hash']] and s['compact']==[s['hash']] for s in states)
  page.locator('.publication-scroll').hover();page.mouse.wheel(0,1200);page.wait_for_timeout(600);after=state('manual wheel releases destination')
  manual=after['rail']==after['compact'] and after['rail']!=[after['hash']]
  print(json.dumps({'navigationStates':states,'urlMarkerConverged':converged,'manualReadingUpdatesMarker':manual},indent=2))
  sys.exit(0 if result['passed']==result['total'] and not errors and converged and manual else 1)
 finally:browser.close()
`;
const scratch=mkdtempSync(resolve(out,'.closure-scratch-'));
try{
 const run=spawnSync(resolve(root,'../book-engine/.venv/bin/python'),['-c',python],{input:JSON.stringify({bundle:bundle.outputFiles[0].text}),encoding:'utf8',timeout:45000,maxBuffer:4*1024*1024,env:{...process.env,TMPDIR:scratch,TMP:scratch,TEMP:scratch}});
 process.stdout.write(run.stdout??'');process.stderr.write(run.stderr??'');if(run.error)throw run.error;process.exitCode=run.status??1;
}finally{rmSync(scratch,{recursive:true,force:true})}
