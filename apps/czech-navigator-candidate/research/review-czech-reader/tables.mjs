import {chromium} from '/Users/dominiklukes/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import fs from 'node:fs';import ts from '../../../../packages/reader-core/node_modules/typescript/lib/typescript.js';
const base='apps/czech-navigator-candidate/', book=JSON.parse(fs.readFileSync(base+'book-czech-navigator.json'));
const code=ts.transpileModule(fs.readFileSync('packages/reader-core/src/original/table-surface.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const browser=await chromium.launch({headless:true,executablePath:'/Users/dominiklukes/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
try { const page=await browser.newPage();await page.goto('about:blank');const result=await page.evaluate(async({code,book})=>{
const {attachTableSurfaces}=await import(URL.createObjectURL(new Blob([code],{type:'text/javascript'})));
const units=book.sections.flatMap(s=>[s,...s.children??[]]);const outcomes=[];
for(const review of book.appearance.tableReviews){const root=document.createElement('div');root.innerHTML=units.find(u=>u.content.includes(`id="${review.id}"`)).content;const table=root.querySelector('#'+review.id);root.replaceChildren(table);document.body.append(root);const original=[...table.rows].map(r=>[...r.cells].map(c=>c.textContent));const cleanup=attachTableSurfaces(root,[review]);const select=root.querySelector('select');let sorts=true;
for(let c=0;c<review.columns.length;c++){select.value=String(c);select.dispatchEvent(new Event('change'));const values=[...table.rows].slice(1).map(r=>r.cells[c].textContent);sorts&&=values.every((v,i)=>i===0||values[i-1].localeCompare(v,'cs')<=0);}
[...root.querySelectorAll('button')].find(b=>b.textContent==='Reset / source').click();const reset=JSON.stringify(original)===JSON.stringify([...table.rows].map(r=>[...r.cells].map(c=>c.textContent)));
const invalid=[];cleanup();root.remove();
for(const mutation of ['missingHeaders','badReference','collision','reshuffle']){const rr=structuredClone(review),r=document.createElement('div');r.innerHTML=table.outerHTML;const t=r.querySelector('table');if(mutation==='missingHeaders')delete rr.headers;if(mutation==='badReference')rr.headers[Object.keys(rr.headers)[0]]=['r999c999'];if(mutation==='collision'){const span=document.createElement('span');span.id='reader-content-'+rr.cellPrefix+'-r1c1';r.prepend(span);}if(mutation==='reshuffle'){const a=t.rows[1].cells[0],b=t.rows[1].cells[1];a.append(...b.childNodes);}// keeps exact concatenated text and width but changes cell identity
 document.body.append(r);const clean=attachTableSurfaces(r,[rr]);invalid.push({mutation,enabled:!!r.querySelector('select'),dangling:[...t.querySelectorAll('[headers]')].some(c=>c.getAttribute('headers').split(' ').some(id=>!r.querySelector('[id="'+id+'"]'))),duplicates:[...r.querySelectorAll('[id]')].map(e=>e.id).some((id,i,all)=>all.indexOf(id)!==i)});clean();r.remove();}
outcomes.push({id:review.id,sorts,reset,invalid});}
return outcomes;},{code,book});console.log(JSON.stringify(result,null,2));}finally{await browser.close();}
