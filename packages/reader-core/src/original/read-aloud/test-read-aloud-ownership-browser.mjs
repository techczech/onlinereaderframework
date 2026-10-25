/** Two real MarkdownRenderer readers over ONE browser speech engine: the newer reader owns the speech; the older one can neither stop nor hear it.
 * Also: the engine's own start event reaches the controller, and the page's speechSynthesis.speak is restored after each utterance.
 * The engine is SYNTHETIC (an object that records calls and emits only the events the test asks for), never audible. Headless Chromium shell only. */
import { build } from '../../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(directory, '../../../..');
const bundle = await build({ absWorkingDir: root, stdin: { resolveDir: directory, loader: 'tsx', contents: `
import React,{useState} from 'react'; import {createRoot} from 'react-dom/client';
import {MarkdownRenderer} from './MarkdownRenderer.tsx';
window.api={};window.states={};
function App(){const [a,setA]=useState(true);window.removeA=()=>setA(false);return <>{a&&<MarkdownRenderer bookId="own-a" content={'# A\\n\\nAlpha first. Alpha second.'} onReadAloudChange={(s,x)=>{window.states.a=s;window.api.a=x}}/>}<MarkdownRenderer bookId="own-b" content={'# B\\n\\nBeta first. Beta second.'} onReadAloudChange={(s,x)=>{window.states.b=s;window.api.b=x}}/></>};
window.mount=()=>createRoot(document.getElementById('root')).render(<App/>);
` }, bundle: true, write: false, format: 'iife', platform: 'browser', alias: { react: resolve(root, 'apps/reader-demo/node_modules/react'), 'react-dom': resolve(root, 'apps/reader-demo/node_modules/react-dom') } });
const python = String.raw`
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
cfg=json.load(sys.stdin);checks=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'passed':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
# SYNTHETIC engine. mode 'silent': cancel reports nothing. mode 'late': cancel reports 'canceled' on the old utterance 40 ms later.
ENGINE='''(mode)=>{window.events=[];window.utterances=[];window.SpeechSynthesisUtterance=class{constructor(t){this.text=t;this.l={}}addEventListener(n,f){(this.l[n]??=[]).push(f)}};
 const engine={speaking:false,getVoices:()=>[],addEventListener(){},removeEventListener(){},
  cancel(){window.events.push('cancel');const old=window.utterances.at(-1);this.speaking=false;if(mode==='late'&&old&&!old.done){old.done=true;setTimeout(()=>old.onerror&&old.onerror({error:'canceled'}),40)}},
  speak(u){window.events.push('speak '+u.text);window.utterances.push(u);this.speaking=true},pause(){},resume(){}};
 window.originalSpeak=engine.speak;Object.defineProperty(window,'speechSynthesis',{configurable:true,value:engine})}'''
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 browser=p.chromium.launch(headless=True,executable_path=str(shell))
 try:
  for mode in ['silent','late']:
   page=browser.new_context(viewport={'width':1280,'height':800}).new_page();page.set_default_timeout(6000)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.route('https://own.test/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'))
   page.goto('https://own.test/');page.evaluate(ENGINE,mode)
   page.add_script_tag(content=cfg['bundle']);page.evaluate('window.mount()');page.wait_for_function('window.api.a&&window.api.b')
   page.evaluate('window.api.a.start()');page.wait_for_timeout(30)
   check(mode+': A is reading',page.evaluate('window.states.a.status')=='speaking')
   page.evaluate('window.api.b.start()');page.wait_for_timeout(120)
   check(mode+': B takes over and A is idle, whether or not the engine reported A cancelled',page.evaluate('[window.states.a.status,window.states.b.status]')==['idle','speaking'],page.evaluate('[window.states.a.status,window.states.b.status,window.events]'))
   check(mode+': A shows no problem message for being replaced',page.evaluate('window.states.a.problem')is None)
   cancels=page.evaluate('window.events.filter(e=>e==="cancel").length')
   page.evaluate('window.api.a.stop()');page.wait_for_timeout(40)
   check(mode+': stopping the older reader leaves B reading and does not cancel the engine',page.evaluate('window.states.b.status')=='speaking' and page.evaluate('window.speechSynthesis.speaking') and page.evaluate('window.events.filter(e=>e==="cancel").length')==cancels)
   page.evaluate('window.removeA()');page.wait_for_timeout(120)
   check(mode+': unmounting the older reader leaves B reading and the engine speaking',page.evaluate('window.states.b.status')=='speaking' and page.evaluate('window.speechSynthesis.speaking') and page.evaluate('window.events.filter(e=>e==="cancel").length')==cancels,page.evaluate('[window.states.b.status,window.speechSynthesis.speaking,window.events]'))
   check(mode+': B has no problem after the old utterance reported',page.evaluate('window.states.b.problem')is None)
   page.evaluate('window.api.b.stop()');page.wait_for_timeout(40)
   check(mode+': B can still stop its own speech',page.evaluate('window.states.b.status')=='idle' and page.evaluate('window.speechSynthesis.speaking')==False)
   check(mode+': no page errors',not errors,errors)
   if mode=='silent':
    # The engine's own start event reaches the controller via the utterance listener, and the page's speak function is left as it was.
    check('speechSynthesis.speak is the original function after speaking',page.evaluate('window.speechSynthesis.speak===window.originalSpeak'))
    check('the utterance carries a start listener',page.evaluate('(window.utterances.at(-1).l.start||[]).length')==1,page.evaluate('window.utterances.map(u=>Object.keys(u.l))'))
 finally:browser.close()
failed=[c for c in checks if not c['passed']]
print(json.dumps({'passed':len(checks)-len(failed),'total':len(checks),'failed':failed}))
sys.exit(1 if failed else 0)
`;
const scratch = mkdtempSync(resolve(directory, '.test-ownership-'));
try {
  const result = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), ['-c', python], { input: JSON.stringify({ bundle: bundle.outputFiles[0].text }), encoding: 'utf8', timeout: 60000, env: { ...process.env, TMPDIR: scratch, TMP: scratch, TEMP: scratch }, maxBuffer: 4 * 1024 * 1024 });
  process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? ''); if (result.error) throw result.error; process.exitCode = result.status ?? 1;
} finally { rmSync(scratch, { recursive: true, force: true }); }
