import { chromium } from '/Users/dominiklukes/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='apps/czech-navigator-candidate/';
const book=JSON.parse(fs.readFileSync(base+'book-czech-navigator.json'));
const units=book.sections.flatMap(s=>[s,...s.children||[]]);
const url=process.env.TABLE_CHECK_URL || 'http://127.0.0.1:5191/';
const out=base+'research/refine-czech-visuals/';
const live=url.startsWith('https:')?'live':'local';
const browser=await chromium.launch({headless:true,executablePath:'/Users/dominiklukes/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const results=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const targets=[['two-row',units.find(s=>s.content.includes('hodně')&&s.content.includes('velmi')&&s.content.includes('moc'))],['regular',units.find(s=>s.content.includes('id="czech-table-10"'))],['merged',units.find(s=>/colspan|rowspan/.test(s.content))]];
 for(const [kind,unit] of targets){
  assert.ok(unit,kind);await page.goto(url+'?section='+unit.id);
  await page.locator('table').first().waitFor();
  const table=kind==='two-row'?page.locator('table').filter({hasText:'hodně'}).filter({hasText:'velmi'}).filter({hasText:'moc'}).first():kind==='regular'?page.locator('#reader-content-czech-table-10'):page.locator('table:has([colspan]),table:has([rowspan])').first();
  const panel=table.locator('xpath=ancestor::section[contains(@class,"publication-table")]');
  const text=await table.textContent();const id=await table.getAttribute('id');
  const toggle=panel.getByRole('button',{name:'Table tools',exact:true});
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await panel.locator('.publication-table-controls').isVisible(),false);
  assert.equal(await panel.getByRole('button',{name:'Collapse',exact:true}).getAttribute('aria-expanded'),'true');
  await table.scrollIntoViewIfNeeded();
  const headerHeight=await panel.locator('header').evaluate(e=>e.getBoundingClientRect().height);
  if(kind==='two-row')assert.ok(headerHeight<(await table.boundingBox()).height/2,`header ${headerHeight}`);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await table.scrollIntoViewIfNeeded();await panel.screenshot({path:out+`${live}-chrome-${kind}-${width}.png`});
   assert.equal(await panel.locator('.publication-table-controls').isVisible(),false);
   await toggle.focus();await toggle.press('Enter');assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   const find=panel.getByLabel('Find in this table (case-insensitive)',{exact:true});await find.fill(kind==='two-row'?'hodně':text.trim().split(/\s+/)[0]);assert.ok(await table.locator('mark').count()>0);
   await find.press('Escape');assert.equal(await toggle.evaluate(e=>e===document.activeElement),true);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   await toggle.press('Space');await panel.getByRole('button',{name:'Clear search',exact:true}).click();assert.equal(await table.locator('mark').count(),0);await toggle.click();
   await panel.getByRole('button',{name:'Collapse',exact:true}).click();assert.equal(await table.isVisible(),false);await panel.getByRole('button',{name:'Show table',exact:true}).click();
   await panel.getByRole('button',{name:'Full width',exact:true}).click();assert.equal(await panel.locator('.publication-table-controls').isVisible(),false);await panel.getByRole('button',{name:'Close focus',exact:true}).press('Escape');assert.equal(await panel.getByRole('button',{name:'Full width',exact:true}).evaluate(e=>e===document.activeElement),true);
   assert.equal(await table.textContent(),text);
  }
  await toggle.click();
  await panel.getByRole('button',{name:'Reset / source',exact:true}).click();
  assert.equal(await table.textContent(),text);assert.equal(await panel.getByRole('button',{name:'Table tools',exact:true}).count(),1);assert.equal(await panel.locator('.publication-table-controls').count(),1);assert.equal(await panel.locator('.publication-table-controls').isVisible(),false);
  assert.ok(!(await page.locator('body').innerText()).includes('Source layout preserved.'));
  if(kind!=='regular')assert.equal(await panel.locator('select').count(),0);
  results.push({kind,id,headerHeight,textUnchanged:true,keyboardDisclosure:true,phone390:true,focusEscape:true});
 }
 fs.writeFileSync(out+`${live}-chrome-results.json`,JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close();}
