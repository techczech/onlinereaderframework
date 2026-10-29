/** Read-only source conversion. Run from reader-demo: npx tsx src/books/next-books/build-practical-guides.ts */
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { literalAfter, htmlToMarkdown, escapeHtml } from './build-source/lib';
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../../../..');
const evidence = resolve(repo, 'docs/design/2026-10-29-next-practical-guides');
mkdirSync(evidence, {recursive:true});
const sourceRoot = resolve(repo, '..');
const read = (book:string, file:string) => readFileSync(resolve(sourceRoot,book,file),'utf8');
const hash = (s:string) => createHash('sha256').update(s).digest('hex');
const accounting:any[]=[];
// Parse static JSX, retaining authored text and semantic HTML while discarding icons and presentation attributes.
function jsx(book:string,file:string) {
 const source=read(book,file), ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function render(n:ts.Node):string {
  if(ts.isJsxText(n)) return escapeHtml(n.text.replace(/\s+/g,' '));
  if(ts.isJsxExpression(n)) { if(!n.expression) return ''; if(ts.isStringLiteral(n.expression)) return escapeHtml(n.expression.text); return ''; }
  if(ts.isJsxElement(n)) {
   const tag=n.openingElement.tagName.getText(ast); if(/^[A-Z]/.test(tag)&&tag!=='Link') return '';
   const out=tag==='Link'?'a':tag;
   const attrs=n.openingElement.attributes.properties.filter(ts.isJsxAttribute);
   const href=attrs.find(a=>a.name.getText(ast)===(tag==='Link'?'to':'href'));
   const value=href?.initializer&&ts.isStringLiteral(href.initializer)?href.initializer.text:undefined;
   return `<${out}${value?` href="${escapeHtml(value.startsWith('/')?`https://academicproductivity.edutools.fyi/#${value}`:value)}"`:''}>${n.children.map(render).join('')}</${out}>`;
  }
  return '';
 }
 let root:ts.JsxElement|undefined;
 function visit(n:ts.Node){if(!root&&ts.isReturnStatement(n)&&n.expression){let e=n.expression;while(ts.isParenthesizedExpression(e))e=e.expression;if(ts.isJsxElement(e))root=e;}ts.forEachChild(n,visit);}
 visit(ast); if(!root)throw Error(file+' missing JSX return');
 const html=render(root);
 // Existing converter shifts headings down one; compensate so source h1 remains the section heading.
 const md=htmlToMarkdown(html.replace(/<(\/?)(h)([1-5])/g,(_,slash,h,level)=>`<${slash}${h}${Number(level)+1}`));
 return md;
}
const A='academic-productivity', D='developing-competence';
const strategies=literalAfter(read(A,'data/content.ts'),'export const strategies: Strategy[] =');
const strategyPage=jsx(A,'pages/Strategies.tsx');
const split=strategyPage.indexOf('## How It Works');
if(split<0)throw Error('explanations heading changed');
const section=(id:string,title:string,content:string)=>({id,title,format:'markdown',content});
const academicSections=[section('principle','The Single Principle of Productivity',strategyPage.slice(0,split).trim()),...strategies.map((s:any)=>section(s.id.toLowerCase(),s.title,`# ${s.title}\n\n${s.shortDescription}\n\n${s.fullDescription}\n\n## Actionable Steps\n\n${s.actionItems.map((x:string)=>`- ${x}`).join('\n')}\n`)),section('how-it-works','How It Works','# How It Works\n\n'+strategyPage.slice(split+'## How It Works'.length).trim()),section('blockers','Blockers to Productivity',jsx(A,'pages/Blockers.tsx'))];
const theory=literalAfter(read(D,'content/theory.ts'),'export const THEORY_CONTENT: ContentSection[] =');
function block(b:any):string {
 if(b.type==='paragraph')return b.content;
 if(b.type==='h3')return '## '+b.content;
 if(b.type==='callout')return '> '+b.content;
 if(b.type==='list-ul'||b.type==='list-ol')return b.items.map((s:string,i:number)=>(b.type==='list-ul'?'- ':`${i+1}. `)+s.replace(/\n/g,'\n   ')).join('\n');
 if(b.type==='table')return '| '+b.table.headers.join(' | ')+' |\n| '+b.table.headers.map(()=>'---').join(' | ')+' |\n'+b.table.rows.map((r:string[])=>'| '+r.join(' | ')+' |').join('\n');
 throw Error('unknown theory block '+b.type);
}
academicSections[academicSections.length-1].content += '\n\n[Tools, hardware and AI searches on the original app](https://academicproductivity.edutools.fyi/).\n';
const developingSections=theory.map((s:any)=>section(s.id,s.title,`# ${s.title}\n\n${s.blocks.map(block).join('\n\n')}\n`));
// The canonical book also includes these authored competency descriptions, separate from interactive assessment tools.
const areas=literalAfter(read(D,'content/competencies.ts'),'export const COMPETENCY_AREAS: CompetencyArea[] =');
for(const a of areas) developingSections.push(section(a.id,a.title,`# ${a.title}\n\n${a.description}\n\n`+a.dimensions.map((d:any)=>`## ${d.name}\n\n`+d.descriptions.map((level:any)=>`### ${level.levelName}\n\n${level.description}`).join('\n\n')).join('\n\n')+'\n'));
// Tool links deliberately target the original application's supported root; its state-based tabs have no deep-link contract.
developingSections[6].content += '\n\n[Self-assessment, framework builder and AI development planning on the original app](https://developingcompetence.edutools.fyi/).\n';
const books=[{id:A,title:'Academic Productivity',author:'Dominik Lukeš',sourceUrl:'https://academicproductivity.edutools.fyi/',description:'There is ultimately only one principle of academic productivity: decreasing cognitive load and increasing fluency.',appearance:{accent:'#2563eb',paper:'#f8fafc',ink:'#0f172a',masthead:'practical'},home:{authorNote:'Based on resources developed by Dominik Lukeš for the Reading and Writing Innovation Lab.',license:{label:'Creative Commons Attribution 4.0 International License',href:'https://creativecommons.org/licenses/by/4.0/'},resources:[{label:'Tools, hardware and AI searches on the original app',href:'https://academicproductivity.edutools.fyi/'}]},navigation:{homeDepth:2,showHomeContents:true},sections:academicSections},{id:D,title:'Developing Competence',author:'Dominik Lukeš',description:theory[0].blocks[0].content,sourceUrl:'https://developingcompetence.edutools.fyi/',appearance:{accent:'#4f46e5',paper:'#f8fafc',ink:'#0f172a',masthead:'practical'},home:{resources:[{label:'Self-assessment, framework builder and AI development planning on the original app',href:'https://developingcompetence.edutools.fyi/'}]},navigation:{homeDepth:2,showHomeContents:true},sections:developingSections}];
for(const b of books) { delete (b.home as any).resources; }
for(const b of books)writeFileSync(resolve(here,b.id+'.book.json'),JSON.stringify(b,null,2)+'\n');
function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()&&!['node_modules','.git','dist'].includes(e.name)?files(resolve(dir,e.name)):e.isFile()&&/\.(tsx?|md|html|json)$/.test(e.name)?[resolve(dir,e.name)]:[]);}
for(const book of [A,D])for(const full of files(resolve(sourceRoot,book))){
 const file=full.slice(resolve(sourceRoot,book).length+1),text=readFileSync(full,'utf8');
 let disposition=book===A?(file==='data/content.ts'?'Strategies included verbatim; tool objects retained as live directory references, including prices and pros/cons.':file==='pages/Strategies.tsx'?'Principle and How It Works included; strategy cards supplied from data/content.ts.':file==='pages/Blockers.tsx'?'All static authored text included; icons and layout removed.':file==='pages/AssistiveTech.tsx'?'Retained in accounting only: wider assistive technology landscape, outside concise four-strategy reading scope.':'Retained in accounting only: original app directory, hardware recommendations, AI searches, repeated home summaries, navigation, rendering or implementation; live source link supplied.'):(file==='content/competencies.ts'?'Both competency chapters and all six dimensions and 24 level descriptions included.':file==='content/theory.ts'?'All seven sections, every block, both tables and examples included.':'Retained in accounting only: assessment, framework builder, planning, dashboard, explanatory app UI and implementation stay on original app.');
 const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const units:any[]=[];function visit(n:ts.Node){if(ts.isJsxText(n)&&n.text.trim()||ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)){const value=(n as any).text.trim();if(value)units.push({line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,text:value});}ts.forEachChild(n,visit);}visit(ast);
 const norm=(s:string)=>s.replace(/[*_#>`|\[\]()]/g,'').replace(/\s+/g,' ').trim();
 for(const unit of units){ const matches=books.find(b=>b.id===book)!.sections.filter((s:any)=>norm(s.content).includes(norm(unit.text))); unit.sha256=hash(unit.text); unit.destinations=matches.map((s:any)=>s.id); unit.disposition=matches.length?'Included (literal text match after Markdown punctuation and whitespace normalisation).':disposition; }
 accounting.push({book,file,sha256:hash(text),disposition,sourceText:text,textUnits:units});
}
writeFileSync(resolve(evidence,'source-accounting.json'),JSON.stringify({method:'Exact source snapshots and hashes; JSX text and string literals indexed by source line. File dispositions explain excluded material. No originals modified.',files:accounting},null,2)+'\n');
console.log(books.map(b=>`${b.id}: ${b.sections.length} sections`).join('\n'));
