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
  await page.goto('https://czechnavigator.dominiklukes.net/?section='+unit.id);
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
 fs.writeFileSync(base+'research/publication-czech-reviewed/live-20-tables.json',JSON.stringify({tables:results,resetExactText:true,transposeReset:true,keyboardFocusReturn:true,lastContextGuard:true,mobile390Text200:true},null,2));
} finally {await browser.close();}
