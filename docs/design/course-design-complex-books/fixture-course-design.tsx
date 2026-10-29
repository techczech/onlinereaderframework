import React from '../../../apps/reader-demo/node_modules/react/index.js';
import { createRoot } from '../../../apps/reader-demo/node_modules/react-dom/client.js';
import JSZip from '../../../packages/reader-core/node_modules/jszip/dist/jszip.min.js';
import book from '../../../apps/reader-demo/src/books/next-books/course-design-frameworks.book.json';
import embeds from '../../../apps/reader-demo/src/books/next-books/course-design-frameworks-embed-manifest.json';
import provenance from '../../../apps/reader-demo/src/books/next-books/course-design-frameworks-provenance.json';
import { PublicationReader } from '../../../packages/reader-core/src/original/PublicationReader.tsx';
import { publicationTextModel } from '../../../packages/reader-core/src/original/publication-html.ts';
import { renderPublicationContent } from '../../../packages/reader-core/src/publication-content/index.ts';
import { generatePublicationEpub } from '../../../packages/reader-core/src/services/publication-epub/index.ts';
const normal=(s:string)=>s.replace(/\s+/g,' ').trim();
export function mount(){createRoot(document.getElementById('root')!).render(<PublicationReader book={book as any} embeds={embeds} />)}
export async function exportsCheck(){
 const blob=await generatePublicationEpub(book as any);
 const zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const chapters=await Promise.all(Object.values(zip.files).filter((f:any)=>/chapter-.*\.xhtml$/.test(f.name)).map((f:any)=>f.async('string')));
 const results=[];
 for(let i=0;i<book.sections.length;i++){
  const section=book.sections[i];
  const root=document.createElement('div'); root.innerHTML=renderPublicationContent(section.content,'html');
  const spoken=normal(publicationTextModel(root).text);
  const xml=new DOMParser().parseFromString(chapters[i],'application/xhtml+xml');
  xml.querySelectorAll('br').forEach(br=>br.replaceWith(xml.createTextNode(' ')));
  const epub=normal(xml.documentElement.textContent||'');
  for(const [pathway,text] of [['read-aloud',spoken],['EPUB',epub]]){
   let cursor=0;
   for(const v of provenance.values.filter(v=>v.sectionId===section.id && v.rendered)){
    const index=text.indexOf(normal(v.value),cursor);if(index<cursor)throw Error(pathway+': '+v.path);cursor=index+normal(v.value).length;
   }
  }
  results.push({section:section.id,readAloud:true,epub:true});
 }
 return {chapters:chapters.length,results};
}
mount();
