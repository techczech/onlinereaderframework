/** Current source fixture, original generated utility styles, headless Chromium only. */
import { build } from '../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(directory,'../../../..');
const bundle = await build({absWorkingDir:root,stdin:{resolveDir:directory,contents:`
import React from 'react'; import {createRoot} from 'react-dom/client';
import {PublicationReader} from './PublicationReader.tsx';
window.mount = (hasContents=true) => { window.root?.unmount(); document.body.innerHTML='<div id="root"></div>'; window.root=createRoot(document.getElementById('root')); window.root.render(React.createElement(PublicationReader,{epub:false,book:{id:'layout-fixture',title:'A real publication',author:'Author',description:'Description',appearance:{accent:'#9e352a',paper:'#fff9ee',ink:'#202a31'},sections:[{id:'chapter',title:'Chapter title',category:'Chapter title',content:'# Chapter title\\n\\n'+(hasContents?'## Local heading\\n\\n':'')+'A readable chapter. '.repeat(200)},{id:'other',title:'Other chapter',category:'Other',content:'# Other chapter'}]}}));};
`},bundle:true,write:false,format:'iife',platform:'browser',alias:{react:resolve(root,'apps/reader-demo/node_modules/react'),'react-dom':resolve(root,'apps/reader-demo/node_modules/react-dom')}});
const css = readFileSync(resolve(root,'packages/reader-core/dist/reader.css'),'utf8')+'\n'+readFileSync(resolve(directory,'reader-original.css'),'utf8');
const python=String.raw`
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
payload=json.load(sys.stdin)
results=[]
with sync_playwright() as p:
 shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
 assert shells,'Headless Chromium shell required'
 browser=p.chromium.launch(headless=True,executable_path=str(shells[-1]))
 try:
  page=browser.new_page(viewport={'width':1440,'height':900})
  page.route('https://reader.test/**',lambda route:route.fulfill(content_type='text/html',body='<html><body></body></html>'))
  page.goto('https://reader.test/?book=layout-fixture&section=chapter')
  page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle'])
  page.evaluate('window.mount()');page.locator('[data-publication-content]').wait_for()
  page.wait_for_timeout(150)
  def measure():
   return page.evaluate('''() => { const article=document.querySelector('[data-publication-content]'); const rail=document.querySelector('#toc-container');return {article:article.getBoundingClientRect().width,rail:rail&&getComputedStyle(rail).display!=='none',overflow:document.documentElement.scrollWidth>innerWidth,bodyOverflow:document.querySelector('main').scrollWidth>document.querySelector('main').clientWidth}; }''')
  desktop=measure();results.append({'desktop1440':desktop});print(json.dumps(results[-1]),flush=True);assert desktop['article']>=600,desktop
  assert desktop['rail'],desktop
  assert page.locator('#toc-container a').all_text_contents()==['Local heading']
  page.get_by_role('button',name='Reading settings',exact=True).click()
  dialog=page.get_by_role('dialog',name='Reading settings');expect(dialog).to_be_visible()
  page.keyboard.press('b');page.keyboard.press('a')
  assert page.evaluate('JSON.parse(localStorage.getItem("publication-reader:layout-fixture:bookmarkedSections") || "[]")')==[]
  dialog.get_by_label('Article width',exact=True).select_option('sm')
  page.get_by_role('button',name='Close reading settings',exact=True).click()
  narrow=measure();assert narrow['article']<desktop['article'],narrow
  page.get_by_role('button',name='Reading settings',exact=True).click()
  dialog.get_by_role('button',name='Reset reading settings',exact=True).click()
  expect(dialog.get_by_label('Article width',exact=True)).to_have_value('md')
  page.keyboard.press('Escape');expect(dialog).not_to_be_visible()
  expect(page.get_by_role('button',name='Reading settings',exact=True)).to_be_focused()
  page.get_by_role('button',name='Reading settings',exact=True).click()
  dialog.get_by_label('Focus mode hides navigation',exact=True).check()
  page.keyboard.press('Escape');assert page.locator('aside').count()==0
  page.get_by_role('button',name='Reading settings',exact=True).click()
  dialog.get_by_label('Focus mode hides navigation',exact=True).uncheck()
  dialog.get_by_label('Colour theme',exact=True).select_option('dark')
  assert page.locator('.publication-reader').evaluate('e => e.classList.contains("dark")')
  assert page.locator('.publication-scroll').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(17, 24, 39)'
  dialog.get_by_label('Colour theme',exact=True).select_option('light')
  page.keyboard.press('Escape')
  page.evaluate('window.mount(false)');page.locator('[data-publication-content]').wait_for();page.wait_for_timeout(100)
  assert page.locator('#toc-container').count()==0
  results.append({'emptyRail':measure()})
  page.evaluate('window.mount()');page.locator('[data-publication-content]').wait_for()
  for width,height in [(1473,900),(1024,600),(768,600),(390,480),(320,480)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
   value=measure();results.append({'viewport':[width,height],**value});assert not value['overflow'] and not value['bodyOverflow'],value
   if width<1280:assert not value['rail'],value
  page.locator('aside').get_by_role('button',name='Close navigation',exact=True).click()
  assert page.get_by_title('Copy Link to Page (l)',exact=True).is_visible()
  assert page.get_by_title('Bookmark (b)',exact=True).is_visible()
  page.get_by_role('button',name='Reading settings',exact=True).click()
  expect(dialog).to_be_visible();assert dialog.bounding_box()['width']<=320
  page.keyboard.press('Escape')
  print(json.dumps({'checks':'layout, heading rail, explicit settings, reset, escape, narrow setting, responsive overflow','results':results}))
 finally:browser.close()
`;
const scratch=mkdtempSync(resolve(directory,'.test-layout-'));
try {
 const result=spawnSync(resolve(root,'../book-engine/.venv/bin/python'),['-c',python],{input:JSON.stringify({bundle:bundle.outputFiles[0].text,css}),encoding:'utf8',env:{...process.env,TMPDIR:scratch,TMP:scratch,TEMP:scratch},maxBuffer:2*1024*1024});
 process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');if(result.error)throw result.error;process.exitCode=result.status??1;
} finally {rmSync(scratch,{recursive:true,force:true});}
