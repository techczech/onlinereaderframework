import {chromium} from '/Users/dominiklukes/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict'; import {renderPublicationContent} from '../../../../packages/reader-core/dist/publication-content/index.js'; import fs from 'node:fs';import ts from '../../../../packages/reader-core/node_modules/typescript/lib/typescript.js';
const base='apps/czech-navigator-candidate/', book=JSON.parse(fs.readFileSync(base+'book-czech-navigator.json'));
for(const unit of book.sections.flatMap(s=>[s,...s.children??[]])) unit.content=renderPublicationContent(unit.content,'html');
const sourceCode=ts.transpileModule(fs.readFileSync('packages/reader-core/src/original/table-surface.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
let code=process.env.MODE==='bundle'?fs.readFileSync('packages/reader-core/dist/original/table-surface.js','utf8'):sourceCode;
if(process.env.MODE==='candidate') {
 const asset=fs.readdirSync(base+'dist/assets').find(n=>n.endsWith('.js')&&fs.readFileSync(base+'dist/assets/'+n,'utf8').includes('Source layout preserved'));
 const raw=fs.readFileSync(base+'dist/assets/'+asset,'utf8'), ast=ts.createSourceFile(asset,raw,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const functions=ast.statements.filter(ts.isFunctionDeclaration), index=functions.findIndex(f=>f.getText(ast).includes('Source layout preserved'));
 const extracted=functions.slice(index-2,index+1).map(f=>f.getText(ast)).join('\n')+'\nexport { '+functions[index].name.text+' as attachTableSurfaces };';
 fs.writeFileSync(base+'research/rereview-czech-reader/candidate-table-functions.js',extracted);code=extracted;
}
const browser=await chromium.launch({headless:true,executablePath:'/Users/dominiklukes/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
try { const page=await browser.newPage();await page.goto('about:blank');const result=await page.evaluate(async({code,book})=>{
const {attachTableSurfaces}=await import(URL.createObjectURL(new Blob([code],{type:'text/javascript'})));
const units=book.sections.flatMap(s=>[s,...s.children??[]]);const outcomes=[];
for(const review of book.appearance.tableReviews){const root=document.createElement('div');root.innerHTML=units.find(u=>u.content.includes(`id="reader-content-${review.id}"`)).content;const table=root.querySelector('#reader-content-'+review.id);root.replaceChildren(table);document.body.append(root);const original=[...table.rows].map(r=>[...r.cells].map(c=>c.textContent));const cleanup=attachTableSurfaces(root,[review]);const select=root.querySelector('select');let sorts=true;if(!select)throw Error('refused valid '+review.id+' '+JSON.stringify(review.columns));
for(let c=0;c<review.columns.length;c++){select.value=String(c);select.dispatchEvent(new Event('change'));const values=[...table.rows].slice(1).map(r=>r.cells[c].textContent);sorts&&=values.every((v,i)=>i===0||values[i-1].localeCompare(v,'cs')<=0);}
[...root.querySelectorAll('button')].find(b=>b.textContent==='Reset / source').click();const reset=JSON.stringify(original)===JSON.stringify([...table.rows].map(r=>[...r.cells].map(c=>c.textContent)));
const associations=()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length && [...table.querySelectorAll('td')].every(cell=>{const refs=(cell.getAttribute('headers')||'').split(' ');const row=cell.parentElement,c=cell.cellIndex;return refs.length===2&&refs.includes(row.cells[0].id)&&refs.includes(table.rows[0].cells[c].id)&&cell.id.startsWith('reader-content-'+review.cellPrefix+'-')&&refs.every(id=>{const target=document.getElementById(id);return target?.tagName==='TH'&&target.closest('table')===table;})});};
if(!sorts||!reset||!associations())throw Error('sort/reset associations '+review.id);
const filter=root.querySelector('input[type=search][disabled]')||[...root.querySelectorAll('label')].find(l=>l.textContent==='Filter rows')?.querySelector('input');
filter.value='impossible';filter.dispatchEvent(new Event('input'));if([...table.rows].slice(1).some(r=>!r.hidden))throw Error('filter');
filter.value='';filter.dispatchEvent(new Event('input'));
const boxes=[...root.querySelectorAll('input[type=checkbox]')]; boxes.forEach(b=>b.click());
if([...table.rows].some(r=>r.cells[0].hidden)||[...table.rows[0].cells].slice(1).every(c=>c.hidden))throw Error('identity/context');
[...root.querySelectorAll('button')].find(b=>b.textContent==='Swap axes').click();
if(!associations())throw Error('transpose associations');
const transposed=[...table.rows].map(r=>[...r.cells].map(c=>c.textContent));
if(JSON.stringify(transposed)!==JSON.stringify(original[0].map((_,c)=>original.map(r=>r[c]))))throw Error('transpose text');
[...root.querySelectorAll('button')].find(b=>b.textContent==='Reset / source').click();
if(!associations()||JSON.stringify(original)!==JSON.stringify([...table.rows].map(r=>[...r.cells].map(c=>c.textContent))))throw Error('transpose reset');
const invalid=[];cleanup();root.remove();
for(const mutation of ['missingHeaders','badReference','collision','reshuffle','badPrefix','duplicatePrefix','missingCells','wrongTag','wrongRole','missingIdentity','nested','span','caret','wrongId','futureCollision','duplicateReview','missingPair','badCellRole','merge','missingColumnHeader']){const rr=structuredClone(review),r=document.createElement('div');r.innerHTML=table.outerHTML;const t=r.querySelector('table');if(mutation==='missingPair')delete rr.headers[Object.keys(rr.headers)[0]];if(mutation==='badCellRole')rr.cells[1][1].role='row';if(mutation==='merge')t.rows[1].cells[1].rowSpan=2;if(mutation==='missingColumnHeader')rr.columnHeaders.pop();if(mutation==='missingHeaders')delete rr.headers;if(mutation==='badReference')rr.headers[Object.keys(rr.headers)[0]]=['r999c999'];if(mutation==='collision'){const span=document.createElement('span');span.id='reader-content-'+rr.cellPrefix+'-r1c1';r.prepend(span);}if(mutation==='reshuffle'){const a=t.rows[1].cells[0],b=t.rows[1].cells[1];a.append(...b.childNodes);}// keeps exact concatenated text and width but changes cell identity
 if(mutation==='futureCollision'){const span=document.createElement('span');span.id='reader-content-'+rr.cellPrefix+'-r999c999';r.prepend(span);}
if(mutation==='badPrefix')rr.cellPrefix='bad prefix';
if(mutation==='missingCells')delete rr.cells;
if(mutation==='missingIdentity')delete rr.requiredColumns;
if(mutation==='wrongTag'){const cell=t.rows[0].cells[1],td=document.createElement('td');td.innerHTML=cell.innerHTML;cell.replaceWith(td);}
if(mutation==='wrongRole')t.rows[0].cells[1].setAttribute('scope','row');
if(mutation==='nested')t.rows[1].cells[1].append(document.createElement('table'));
if(mutation==='span')t.rows[1].cells[1].colSpan=1;
if(mutation==='caret')t.rows[1].cells[1].append('^');
if(mutation==='wrongId')t.id='wrong-id';
document.body.append(r);const before=t.innerHTML;const clean=attachTableSurfaces(r,mutation==='duplicateReview'?[rr,{...rr,cellPrefix:rr.cellPrefix+'other'}]:mutation==='duplicatePrefix'?[rr,{...rr,id:'other'}]:[rr]);if(r.querySelector('select')||t.innerHTML!==before)throw Error(review.id+' accepted '+mutation); invalid.push({mutation,enabled:!!r.querySelector('select'),dangling:[...t.querySelectorAll('[headers]')].some(c=>c.getAttribute('headers').split(' ').some(id=>!r.querySelector('[id="'+id+'"]'))),duplicates:[...r.querySelectorAll('[id]')].map(e=>e.id).some((id,i,all)=>all.indexOf(id)!==i)});clean();r.remove();}
outcomes.push({id:review.id,sorts,reset,invalid});}
const multi=document.createElement('div');multi.innerHTML=units.map(u=>u.content).join('');document.body.append(multi);const mc=attachTableSurfaces(multi,book.appearance.tableReviews);if(multi.querySelectorAll('select').length!==20)throw Error('simultaneous surfaces refused');for(const b of multi.querySelectorAll('button'))if(b.textContent==='Swap axes')b.click();const ids=[...multi.querySelectorAll('[id]')].map(e=>e.id);if(new Set(ids).size!==ids.length)throw Error('simultaneous duplicate');for(const t of multi.querySelectorAll('table'))for(const cell of t.querySelectorAll('[headers]'))for(const id of cell.getAttribute('headers').split(' '))if(document.getElementById(id)?.closest('table')!==t)throw Error('simultaneous wrong owner');mc();multi.remove();return outcomes;},{code,book});assert.equal(result.length,20);fs.writeFileSync(base+'research/rereview-czech-reader/table-results-'+(process.env.MODE||'source')+'.json',JSON.stringify(result,null,2));console.log('20 sanitised tables: all columns sorted, filter/identity/context, transpose/header associations/reset; 400 malformed reviews refused before attribute writes');}finally{await browser.close();}
