// Focused offline mockup checks, following the repo's bundled headless-shell route.
// node docs/design/2026-10-25-frontpage-sol/evidence/check-frontpage-mockups.mjs
import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import os from 'node:os';
const here=dirname(fileURLToPath(import.meta.url));
const base=dirname(here);
const md=readFileSync(join(base,'sources-frontpage-books.md'),'utf8');
const books=JSON.parse(md.match(/```json\n([\s\S]*?)\n```/)[1]);
const variants=['jacket','desk','contents'];
const shells=readdirSync(join(os.homedir(),'Library/Caches/ms-playwright')).filter(n=>n.startsWith('chromium_headless_shell-')).sort();
const executablePath=join(os.homedir(),'Library/Caches/ms-playwright',shells.at(-1),'chrome-headless-shell-mac-arm64/chrome-headless-shell');
const browser=await chromium.launch({headless:true,executablePath});
const results=[];let assertions=0;
const check=(cond,msg)=>{assert.ok(cond,msg);assertions++};
const flat=ss=>ss.flatMap(s=>[s,...flat(s.children??[])]);
try{
 const page=await browser.newPage({viewport:{width:728,height:1000}});
 const errors=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
 for(const width of [360,728])for(const variant of variants)for(const b of books)for(const returning of [false,true]){
  await page.setViewportSize({width,height:1000});
  const url=pathToFileURL(join(base,'frontpage-designs-sol-2026-10-25.html'));
  url.search=new URLSearchParams({design:variant,book:b.id,frame:width===360?'phone':'desktop',state:returning?'returning':'new'});
  await page.goto(url.href);
  const frame=page.frames().find(f=>f.parentFrame());
  await frame.waitForFunction(()=>window.FRONT_PAGE_FRAME);
  await page.waitForTimeout(80);
  const data=await frame.evaluate(()=>({state:window.FRONT_PAGE_FRAME,tools:[...document.querySelectorAll('.tool span')].map(n=>n.textContent),title:document.querySelector('h1').textContent,ids:[...document.querySelectorAll('[data-section-id]')].map(n=>n.dataset.sectionId),overflow:document.documentElement.scrollWidth>innerWidth+1,height:document.documentElement.scrollHeight,images:[...document.images].map(i=>({loaded:i.complete&&i.naturalWidth>0,w:i.width,h:i.height}))}));
  const source=flat(b.sections);
  check(data.state.entries===source.length,`${b.id} exact recursive entry count`);
  check(data.state.roots===b.sections.length,`${b.id} exact top-level count`);
  if(!returning)check(data.state.targetId===source.find(s=>s.hasContent).id,'Start opens the first actual content section, including parent introductions');
  check(data.state.variant===variant&&data.state.returning===returning,'Selected design and history scenario');
  check(JSON.stringify(data.tools)===JSON.stringify(['Listen','Formatting','Assist','Notes']),'Four separate icon + label controls');
  check(data.title.includes(b.title)&&(!b.subtitle||data.title.includes(b.subtitle)),'Current book title retained');
  check(JSON.stringify(data.ids)===JSON.stringify(source.map(s=>s.id)),'All real entries, exact source order, no invented or duplicate IDs');
  check(!data.overflow,'No horizontal overflow inside frame');
  check(data.images.every(i=>i.loaded&&Math.abs(i.w/i.h-1248/1996)<.02),'Embedded cover loads with correct proportions');
  const outer=await page.evaluate(()=>({height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth+1}));
  check(!outer.overflow,'No horizontal overflow in comparison');
  check(await page.evaluate(()=>{const s=document.querySelector('.preview-stage').getBoundingClientRect(),f=document.querySelector('iframe').getBoundingClientRect();return f.bottom<=s.bottom+1}),'Frame is contained before a screenshot is accepted');
  check(outer.height<2000,`Comparison below 2000px: ${outer.height}`);
  results.push({width,variant,book:b.id,returning,outerHeight:outer.height,frameHeight:data.height,entries:data.state.entries,roots:data.state.roots});
  if(!returning)await page.screenshot({path:join(here,`screenshot-${variant}-${b.id}-${width}.png`),fullPage:true});
 }
 // Exercise actual mock interactions in all three geometries.
 for(const variant of variants){
  const url=pathToFileURL(join(base,'frontpage-designs-sol-2026-10-25.html'));
  url.search=new URLSearchParams({design:variant,book:'linguistics',frame:'phone'});
  await page.goto(url.href);
  const f=page.frames().find(f=>f.parentFrame());
  await f.waitForFunction(()=>window.FRONT_PAGE_FRAME);
  const toggle=f.locator('.toc-toggle').first();
  await toggle.click();check(await toggle.getAttribute('aria-expanded')==='true','TOC branch expands');
  await toggle.click();check(await toggle.getAttribute('aria-expanded')==='false','TOC branch collapses');
  await f.locator('#contents-depth').selectOption('1');check(await f.locator('.toc-children').count()===0,'Depth 1 shows only roots');
  await f.locator('#contents-depth').selectOption('2');check(await f.locator('[data-section-id]').count()===262,'Depth 2 restores complete tree');
  await f.locator('#contents-query').fill('phonetics');
  check(await f.locator('[data-section-id]').count()>0,'Contents search finds real titles');
  const expected=await f.locator('.toc-link').last().innerText();
  await f.locator('.toc-link').last().click();
  check((await f.locator('#destination-title').innerText()).includes(expected.split('\n').at(-1)),'Section action previews the selected real title');
  await page.keyboard.press('Escape');check(!(await f.locator('dialog').evaluate(el=>el.open)),'Escape closes mock destination');
  await f.locator('#search-clear').click();check(await f.locator('[data-section-id]').count()===262,'Clear restores contents');
  await f.locator('#contents-query').fill('zzzz-no-title');check(await f.locator('.empty').count()===1,'Search has truthful empty state');
  await f.locator('#search-clear').click();
  await f.locator('[data-mock="listen"]').click();check((await f.locator('#destination-body').innerText()).includes('No recorded audiobook'),'Listen does not claim recordings');
  await page.keyboard.press('Escape');
  await f.locator('[data-mock="ebook"]').click();check((await f.locator('#destination-body').innerText()).includes('does not generate a file'),'Download does not claim EPUB implementation');
  await page.keyboard.press('Escape');
  await page.locator('#state-picker').selectOption('returning');
  const f2=page.frames().find(f=>f.parentFrame());await f2.waitForFunction(()=>window.FRONT_PAGE_FRAME?.returning);
  check(await f2.locator('button[data-destination]').first().innerText()==='Resume reading','Returning-reader state offers Resume');
  check(await f2.locator('.action.subtle').first().innerText()==='Start from the beginning','Returning reader can restart');
  await page.locator('#book-picker').selectOption('language-muscle');
  const f3=page.frames().find(f=>f.parentFrame());await f3.waitForFunction(()=>window.FRONT_PAGE_FRAME?.bookId==='language-muscle');
  check((await f3.locator('h1').innerText()).includes('Language Muscle'),'Book selector changes title and tree');
  await page.locator(`[data-design="${variant}"]`).focus();await page.keyboard.press('ArrowRight');
  check((await page.evaluate(()=>window.FRONT_PAGE_STATE.variant))!==variant,'Design tabs support arrow keys');
 }
 check(errors.length===0,`No page errors: ${errors.join(';')}`);
 check(network.length===0,'No external network requests');
 writeFileSync(join(here,'results-frontpage-mockups.json'),JSON.stringify({status:'pass',assertions,cases:results,errors,network,executablePath},null,2)+'\n');
 console.log(JSON.stringify({status:'pass',assertions,combinations:results.length,maxOuterHeight:Math.max(...results.map(r=>r.outerHeight)),screenshots:18,errors,externalRequests:network.length}));
}finally{await browser.close();}
