import { chromium } from '/Users/dominiklukes/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='apps/czech-navigator-candidate/';
const book=JSON.parse(fs.readFileSync(base+'book-czech-navigator.json'));
const reviews=book.appearance.tableReviews;
const units=book.sections.flatMap(s=>[s,...s.children||[]]);
const browser=await chromium.launch({headless:true,executablePath:'/Users/dominiklukes/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const results=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 for(const review of reviews){
  const unit=units.find(s=>s.content.includes(`id="${review.id}"`));
  await page.goto('http://127.0.0.1:5191/?section='+unit.id);
  console.log('opened',review.id);
  const table=page.locator('#reader-content-'+review.id);await table.waitFor();
  const panel=table.locator('xpath=ancestor::section[contains(@class,"publication-table")]');
  await panel.getByLabel('Sort table',{exact:true}).waitFor();
  const original=await table.textContent();
  assert.ok(await table.locator('[headers]').count()>0);
  await panel.getByLabel('Sort table',{exact:true}).selectOption('1');
  await panel.getByLabel('Filter rows',{exact:true}).fill('impossible');
  await panel.getByRole('button',{name:'Reset / source',exact:true}).click();
  assert.equal(await table.textContent(),original);
  console.log('reset',review.id);
  const boxes=panel.getByRole('checkbox');
  for(let i=0;i<await boxes.count();i++) await boxes.nth(i).click();
  assert.equal(await boxes.evaluateAll(nodes=>nodes.filter(n=>n.checked).length),1);
  await panel.getByRole('button',{name:'Reset / source',exact:true}).click();
  await panel.getByRole('button',{name:'Swap axes',exact:true}).click();
  await panel.getByRole('button',{name:'Reset / source',exact:true}).click();
  assert.equal(await table.textContent(),original);
  await panel.getByRole('button',{name:'Full width',exact:true}).click();
  await panel.getByRole('button',{name:'Close focus',exact:true}).press('Escape');
  assert.equal(await panel.getByRole('button',{name:'Full width',exact:true}).evaluate(e=>e===document.activeElement),true);
  results.push(review.id);console.log(review.id);
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const fallback=await page.evaluate(async ({review,content})=>{
  const {attachTableSurfaces}=await import('/@fs/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/packages/reader-core/src/original/table-surface.ts');
  const cases=[];
  for(const mutation of ['text','id','shape','span']) {
   const root=document.createElement('div');root.innerHTML=content; const table=root.querySelector('#'+review.id);root.replaceChildren(table);
   if(mutation==='text')table.rows[1].cells[1].append('^');
   if(mutation==='id')table.id='wrong-source';
   if(mutation==='shape')table.rows[1].deleteCell(1);
   if(mutation==='span')table.rows[1].cells[1].colSpan=2;
   document.body.append(root);const cleanup=attachTableSurfaces(root,[review]);
   cases.push(!root.querySelector('select'));cleanup();root.remove();
  }return cases;
 },{review:reviews[0],content:units.find(s=>s.content.includes('id="'+reviews[0].id+'"')).content});
 assert.deepEqual(fallback,[true,true,true,true]);
 fs.writeFileSync(base+'research/validation-czech-semantic-browser.json',JSON.stringify({tables:results,alternateColumnSort:true,resetExactText:true,transposeReset:true,keyboardFocusReturn:true,lastContextGuard:true,mobile390Text200:true,invalidFallback:fallback},null,2));
 console.log('20 semantic table browser checks passed');
} finally {await browser.close();}
