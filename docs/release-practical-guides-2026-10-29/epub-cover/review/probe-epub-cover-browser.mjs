import './packages/reader-core/src/services/publication-epub/publication-epub-covers.browser-test.mjs';
import { generatePublicationEpub } from './packages/reader-core/src/services/publication-epub/index.ts';
import JSZip from './packages/reader-core/node_modules/jszip/lib/index.js';
window.independentCoverChecks = async () => {
 const results=[];
 const assert=(v,m)=>{if(!v)throw Error(m)};
 const fixture=Object.values(window.coverFixtures)[0];
 const asset=window.coverOptions(fixture.book.id).assets[0];
 const book={...fixture.book, title:'Title < & "', sections:[{id:'math',title:'Math',format:'html',content:'<p>Unchanged &amp; text</p><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>+</mo><mn>1</mn></math>'}]};
 const zip=async assets=>JSZip.loadAsync(await(await generatePublicationEpub(book,{assets})).arrayBuffer());
 const plain=await zip([]);
 for(const [label,data] of [['uint8',asset.data],['buffer',asset.data.buffer],['blob',new Blob([asset.data])]]) {
  const z=await zip([{...asset,data}]);
  assert(await z.file('OEBPS/Text/chapter-0001.xhtml').async('string')===await plain.file('OEBPS/Text/chapter-0001.xhtml').async('string'),'Chapter XML/MathML changed');
  const opf=new DOMParser().parseFromString(await z.file('OEBPS/content.opf').async('string'),'application/xml');
  assert(opf.querySelector('item[properties="mathml"]'),'MathML property lost');
  assert(opf.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/','title')[0].textContent===book.title,'Escaped metadata');
  results.push({label,passed:true});
 }
 for(const [label,changes] of [['null-role',{role:null}],['object-role',{role:{}}],['array-role',{role:['cover']}],['case-role',{role:'Cover'}],['number-role',{role:1}],['null-data',{data:null}],['string-data',{data:'jpeg'}],['object-data',{data:{}}],['array-data',{data:[255,216,255]}],['wrong-mime',{mediaType:'text/html'}]]) {
  const outcome=await Promise.race([zip([{...asset,...changes}]).then(()=>({accepted:true}),e=>({error:String(e)})),new Promise(r=>setTimeout(()=>r({timeout:true}),3000))]);
  assert(outcome.error,`${label}: ${JSON.stringify(outcome)}`); results.push({label,...outcome});
 }
 for(const href of ['../../escape.jpg','https://evil.invalid/cover.jpg','x"/><script>bad</script>']) {
  const z=await zip([{...asset,href}]);
  assert(Object.keys(z.files).every(p=>!p.includes('escape')&&!p.includes('evil')&&!p.includes('script')),'Host identifier leaked to archive path');
  assert(!(await z.file('OEBPS/cover.xhtml').async('string')).includes(href),'Host href leaked');
  results.push({label:'opaque-href',href,passed:true});
 }
 return {independent:results};
};
