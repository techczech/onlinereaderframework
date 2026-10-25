/** Current source fixture, original generated utility styles, headless Chromium only. */
import { build } from '../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = resolve(process.cwd(),'packages/reader-core/src/original');
const root = resolve(directory,'../../../..');
const bundle = await build({absWorkingDir:root,stdin:{resolveDir:directory,contents:`
import React from 'react'; import {createRoot} from 'react-dom/client';
import {PublicationReader} from './PublicationReader.tsx';
window.mount = (hasContents=true) => { window.root?.unmount(); document.body.innerHTML='<div id="root"></div>'; window.root=createRoot(document.getElementById('root')); window.root.render(React.createElement(PublicationReader,{epub:false,book:{id:'layout-fixture',title:'A real publication',author:'Author',description:'Description',appearance:{accent:'#9e352a',paper:'#fff9ee',ink:'#202a31'},sections:[{id:'chapter',title:'Chapter title',category:'Chapter title',content:'# Chapter title\\n\\n'+(hasContents?'## Local heading\\n\\nSome text.\\n\\n## Second heading\\n\\n':'')+'A readable chapter. '.repeat(200)},{id:'other',title:'Other chapter',category:'Other',content:'# Other chapter'}]}}));};
`},bundle:true,write:false,format:'iife',platform:'browser',alias:{react:resolve(root,'apps/reader-demo/node_modules/react'),'react-dom':resolve(root,'apps/reader-demo/node_modules/react-dom')}});
const css = readFileSync(resolve(root,'packages/reader-core/dist/reader.css'),'utf8')+'\n'+readFileSync(resolve(directory,'reader-original.css'),'utf8');
const python=String.raw`
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
v=json.load(sys.stdin);results=[]
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 b=p.chromium.launch(headless=True,executable_path=str(shell))
 try:
  for fonts in [False,True]:
   pg=b.new_page(viewport={'width':1440,'height':900});requests=[]
   def serve(route):
    name=route.request.url.split('?')[0].rsplit('/',1)[-1];f=Path(v['fonts'])/name
    if '/fonts/' in route.request.url:
     requests.append({'name':name,'served':fonts and f.is_file()})
     if fonts and f.is_file():route.fulfill(content_type='font/woff2',body=f.read_bytes());return
    route.fulfill(content_type='text/html',body='<html><body></body></html>')
   pg.route('https://reader.test/**',serve);pg.goto('https://reader.test/?book=layout-fixture&section=chapter');pg.add_style_tag(content=v['css']);pg.add_script_tag(content=v['bundle']);pg.evaluate('window.mount()');pg.locator('[data-publication-content]').wait_for();pg.evaluate('document.fonts.ready');pg.wait_for_timeout(200)
   measure="""()=>({article:document.querySelector('[data-publication-content]').getBoundingClientRect().width,mainClient:document.querySelector('main').clientWidth,mainScroll:document.querySelector('main').scrollWidth,doc:document.documentElement.scrollWidth,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),actions:[...document.querySelectorAll('button[title="Copy Link to Page (l)"],button[title="Bookmark (b)"]')].map(e=>{let r=e.getBoundingClientRect();return {title:e.title,x:r.x,right:r.right}})})"""
   row={'serveFonts':fonts,'desktop':pg.evaluate(measure),'widths':{}}
   for choice in ['Narrow','Normal','Wide','Full']:
    pg.get_by_role('button',name='Formatting',exact=True).click();pg.get_by_role('dialog',name='Formatting').get_by_role('radio',name=choice,exact=True).click();pg.keyboard.press('Escape');pg.wait_for_timeout(150);row['widths'][choice]=pg.evaluate(measure)['article']
   pg.set_viewport_size({'width':320,'height':480});pg.wait_for_timeout(200);row['phone']=pg.evaluate(measure);row['requests']=requests;results.append(row);pg.close()
  # Actual served book: runtime observation only; does not attest its source provenance.
  pg=b.new_page(viewport={'width':320,'height':480});pg.goto('http://127.0.0.1:8773/?book=deliberate-practice&section=about-this-guide');pg.locator('[data-publication-content]').wait_for();pg.evaluate('document.fonts.ready');pg.wait_for_timeout(200);results.append({'servedBook320':pg.evaluate(measure)});pg.close()
 finally:b.close()
print(json.dumps(results,indent=2))
r=results[1];assert 480<=r['desktop']['article']<=600
w=r['widths'];assert w['Narrow']<w['Normal']<w['Wide']<w['Full']
assert r['phone']['mainScroll']<=r['phone']['mainClient'] and r['phone']['doc']<=320
assert all(x['x']>=0 and x['right']<=320 for x in r['phone']['actions'])
r=results[2]['servedBook320'];assert r['mainScroll']<=r['mainClient'] and r['doc']<=320 and all(x['x']>=0 and x['right']<=320 for x in r['actions'])
`;
const scratch=mkdtempSync(resolve(root,'docs/design/2026-10-25-assist-controls-followup/.closure-layout-scratch-'));
try {
 const result=spawnSync(resolve(root,'../book-engine/.venv/bin/python'),['-c',python],{input:JSON.stringify({bundle:bundle.outputFiles[0].text,css,fonts:resolve(root,'packages/reader-core/dist/fonts')}),encoding:'utf8',env:{...process.env,TMPDIR:scratch,TMP:scratch,TEMP:scratch},maxBuffer:2*1024*1024});
 process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');if(result.error)throw result.error;process.exitCode=result.status??1;
} finally {rmSync(scratch,{recursive:true,force:true});}
