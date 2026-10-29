import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildSync } from '../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { courseData } from '../../../../course-design-frameworks/data.ts';
const source = new URL('../../../../course-design-frameworks/', import.meta.url);
const root = new URL('../../../', import.meta.url);
const out = new URL('apps/reader-demo/src/books/next-books/', root);
const interactiveRoot = new URL('apps/reader-demo/interactives/course-design-frameworks/', root);
const hash = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const e = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const values: any[] = [];
let sectionId = '';
function v(value: string, path: string) { values.push({ sectionId, path, value, rendered: true }); return e(value); }
function cell(value: string | string[], path: string) {
 return Array.isArray(value) ? `<ul>${value.map((x, i) => `<li>${v(x, `${path}[${i}]`)}</li>`).join('')}</ul>` : v(value, path).replace(/\n/g, '<br>');
}
function table(s: any, si: number, editable = false) {
 const d = s.data;
 const header = d.columns.map((c: any, i: number) => `<th scope="col" id="${s.id}-col-${i}">${editable ? e(c.header) : v(c.header, `sections[${si}].data.columns[${i}].header`)}</th>`).join('');
 const rows = d.rows.map((r: any, ri: number) => `<tr>${d.columns.map((c: any, ci: number) => {
  const value = r[c.key];
  const path = `sections[${si}].data.rows[${ri}].${c.key}`;
  const content = editable ? (Array.isArray(value) ? value.map(e).join('; ') : e(value)) : cell(value, path);
  if (!ci) return `<th scope="row" id="${s.id}-row-${ri}">${editable ? `<label><span class="field-label">${e(c.header)}</span><textarea aria-label="${e(s.title + ": row " + (ri+1) + " — " + c.header)}" rows="4">${content}</textarea></label>` : content}</th>`;
  const name = `${s.title}: ${r[d.columns[0].key]} — ${c.header}`;
  return `<td headers="${s.id}-row-${ri} ${s.id}-col-${ci}">${editable ? `<label><span class="field-label">${e(name)}</span><textarea aria-label="${e(name)}" rows="4">${content}</textarea></label>` : content}</td>`;
 }).join('')}</tr>`).join('');
 return `<div class="table-scroll" role="region" aria-label="${e(s.title)}" tabindex="0"><table><caption>${e(s.title)}</caption><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function checklist(s: any, si: number, interactive = false) {
 return s.data.map((cat: any, ci: number) => `<section><h2>${interactive ? e(cat.title) : v(cat.title, `sections[${si}].data[${ci}].title`)}</h2><ul>${cat.items.map((item: any, ii: number) => `<li>${interactive ? `<label><input type="checkbox" name="${e(item.id)}"> ${e(item.text)}</label>` : `<span id="${e(item.id)}">${v(item.text, `sections[${si}].data[${ci}].items[${ii}].text`)}</span>`}</li>`).join('')}</ul></section>`).join('');
}
const style = `:root{font-family:system-ui,sans-serif;color:#1e293b;background:#fff;font-size:16px}*{box-sizing:border-box}body{margin:0;padding:1rem;line-height:1.6}h1{font-size:1.5rem}h2{font-size:1.2rem}li{margin:.7rem 0}label{display:block}input{width:1.2rem;height:1.2rem;vertical-align:middle}button{font:inherit;padding:.5rem 1rem;margin:.5rem 0}textarea{font:inherit;width:100%;min-width:12rem;resize:vertical;padding:.5rem}table{border-collapse:collapse;width:100%;min-width:42rem}td,th{border:1px solid #94a3b8;padding:.75rem;text-align:left;vertical-align:top;white-space:pre-wrap}caption{font-weight:bold;text-align:left}.table-scroll{overflow-x:auto;max-width:100%}:focus-visible{outline:3px solid #4338ca;outline-offset:3px}.field-label{display:block;font-size:.8rem}progress{max-width:100%}`;
const copy = readFileSync(new URL('./copy-course-design-interactions.md', import.meta.url), 'utf8').split('---')[2].trim().split(/\n\n+/);
const [notice, resetLabel, progressLabel] = copy;
const heightScript = buildSync({stdin:{contents:"import { startReaderEmbedHeightReporting } from './packages/reader-core/src/embed/embed-child.ts'; startReaderEmbedHeightReporting();",resolveDir:new URL('../../../',import.meta.url).pathname},bundle:true,write:false,format:'iife',platform:'browser',minify:true}).outputFiles[0].text;
const items: any[] = [];
const sections = courseData.sections.map((s: any, si: number) => {
 sectionId = s.id;
 let html = `<h1>${v(s.title, `sections[${si}].title`)}</h1><p>${v(s.shortDescription, `sections[${si}].shortDescription`)}</p>`;
 let body = '';
 if (s.type === 'text') body = s.data.map((b: any, bi: number) => {
  const path = `sections[${si}].data[${bi}]`;
  if (b.type === 'image') return `<p><a href="${e(b.url)}">${v(b.alt, `${path}.alt`)}</a></p>`;
  if (b.type === 'list') return `<ul>${b.content.map((x: string, i: number) => `<li>${v(x, `${path}.content[${i}]`)}</li>`).join('')}</ul>`;
  if (!['p','h2','h3'].includes(b.type)) throw new Error(`Unsupported block ${b.type}`);
  return `<${b.type}>${v(b.content, `${path}.content`)}</${b.type}>`;
 }).join('');
 else if (s.type === 'checklist') body = checklist(s, si);
 else body = table(s, si);
 html += `<div id="${s.id}-text">${body}</div>`;
 if (s.type === 'checklist' || s.type === 'planner') {
  const folder = new URL(s.id + '/', interactiveRoot); mkdirSync(folder, { recursive: true });
  const checks = s.type === 'checklist';
  const controls = checks ? `<p><output id="progress" aria-live="polite">0%</output> <progress id="bar" value="0" max="100" aria-label="${e(progressLabel)}"></progress></p><button type="reset">${e(resetLabel)}</button>` : '';
  const script = checks ? `const form=document.querySelector('form');function update(){const all=[...form.querySelectorAll('input[type=checkbox]')];const n=all.filter(x=>x.checked).length;const p=Math.round(n/all.length*100);document.querySelector('output').textContent=p+'%';document.querySelector('progress').value=p}form.addEventListener('change',update);form.addEventListener('reset',()=>setTimeout(update,0));update();` : '';
  writeFileSync(new URL('index.html', folder), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; form-action 'none'; base-uri 'none'"><title>${e(s.title)}</title><style>${style}</style></head><body><h1>${e(s.title)}</h1><p>${e(notice)}</p><form autocomplete="off">${controls}${checks ? checklist(s, si, true) : table(s, si, true)}</form><script>${script}${heightScript}</script></body></html>\n`);
  items.push({id:s.id, sectionId:s.id, anchor:`${s.id}-text`, src:`${s.id}/index.html`, title:s.title, caption:'Entries are not saved. Reloading or leaving this section can clear them.', height:{initial:600,min:300,max:1600}, resize:true});
 }
 return {id:s.id,title:s.title,category:courseData.title,format:'html',content:html};
});
const book = {id:'course-design-frameworks',title:courseData.title,author:courseData.author,description:courseData.sections[0].shortDescription,language:'en',home:{license:{label:'Creative Commons Licence',href:'https://creativecommons.org/licenses/by-sa/4.0/'}},sections};
const sourceStrings: any[] = [];
function inventory(value: any, path: string) { if(typeof value==='string') sourceStrings.push({path,value}); else if(Array.isArray(value)) value.forEach((x,i)=>inventory(x,`${path}[${i}]`)); else if(value && typeof value==='object') Object.entries(value).forEach(([k,x])=>inventory(x,path ? `${path}.${k}` : k)); }
inventory(courseData,'');
const files=['data.ts','types.ts','App.tsx','components/SectionView.tsx','components/Dashboard.tsx','components/Navigation.tsx'];
const provenance={sourceRepository:'course-design-frameworks',sourceFiles:files.map(path=>({path,sha256:hash(readFileSync(new URL(path,source)))})),sourceMetadata:{title:courseData.title,author:courseData.author,website:courseData.website,lastUpdated:courseData.lastUpdated},conversion:'docs/design/course-design-complex-books/convert-course-design.ts',conversionInputs:['docs/design/course-design-complex-books/convert-course-design.ts','docs/design/course-design-complex-books/copy-course-design-interactions.md','packages/reader-core/src/embed/embed-child.ts'].map(path=>({path,sha256:hash(readFileSync(new URL(path,root)))})),values,sourceStrings,omissions:[{path:'sections[0].data[2].content',value:'https://picsum.photos/800/200',reason:'Coordinator-approved random-photo placeholder omission; source alt label and exact licence URL retained.'}],dispositions:{'section ids/checklist ids':'retained as section/content identifiers','icon':'source UI metadata only','table column keys/widths':'keys retained through cell associations; widths are presentation metadata','empty cells':'retained as empty table cells','website/lastUpdated':'source metadata only; no canonical edition URL inferred'},outputs:{bookSha256:hash(JSON.stringify(book,null,2)+'\n')}};
for (const [name,value] of Object.entries({'course-design-frameworks.book.json':book,'course-design-frameworks-provenance.json':provenance,'course-design-frameworks-embed-manifest.json':{root:'interactives/course-design-frameworks/',items}})) writeFileSync(new URL(name,out),JSON.stringify(value,null,2)+'\n');
console.log('Generated nine sections and four self-contained interactions.');
