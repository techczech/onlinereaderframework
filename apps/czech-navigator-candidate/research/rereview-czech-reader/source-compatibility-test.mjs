import {test} from 'node:test';
import assert from 'node:assert/strict';
import {migrateReaderStorage} from './source-compatibility.mjs';
import {readerStorageKey as key} from './source-compatibility.mjs';
import {buildAgentBook} from './source-compatibility.mjs';
const sections=[{id:'old',title:'Overview',content:'<p>overview</p>'},{id:'noun',title:'Nouns',content:'<h1 id="gender">Gender</h1><p>unique quote</p>'},{id:'verb',title:'Verbs',content:'<p>ambiguous</p>'}];
const book={id:'b',title:'Book',author:'Author',description:'',sections,compatibility:{version:'one',anchorOwners:{gender:'noun'},splitSections:{old:['old','noun','verb']}}};
function store(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),m};}
test('multiple records, explicit anchor, exact quote and unknown fields; originals retained and rerun idempotent',()=>{
 const s=store(), records=[{id:'a',sectionId:'old',text:'unique quote',range:{start:100,end:112},extra:{keep:true}},{id:'b',sectionId:'old',anchor:'gender',text:'other'},{id:'c',sectionId:'old',anchor:'missing',text:'unique quote'},{id:'d',sectionId:'old',text:'unknown'},{id:'e',sectionId:'other',text:'unique quote'}];
 const raw=JSON.stringify(records);s.setItem(key('b','highlights'),raw);
 s.setItem(key('b','readSections'),'["old"]');s.setItem(key('b','bookmarkedSections'),'["old"]');s.setItem(key('b','lastSection'),'"old"');
 const migrate=()=>migrateReaderStorage(book,sections,s,x=>x.content);
 assert.equal(migrate(),true);const got=JSON.parse(s.getItem(key('b','highlights')));
 assert.deepEqual(got.map(x=>x.sectionId),['noun','noun','old','old','other']);assert.deepEqual(got[0].range,records[0].range);assert.deepEqual(got[0].extra,records[0].extra);
 assert.equal(s.getItem(key('b','compatibility:one:original:highlights')),raw);
 for(const field of ['readSections','bookmarkedSections'])assert.equal(s.getItem(key('b',field)),'["old"]');
 const before=[...s.m];assert.equal(migrate(),true);assert.deepEqual([...s.m],before);
});
test('ambiguous quote, malformed input, unrelated book and backup failure never guess or lose originals',()=>{
 const s=store();const raw='[{"sectionId":"old","text":"p>"}]';s.setItem(key('b','highlights'),raw);migrateReaderStorage(book,sections,s,x=>x.content);assert.equal(s.getItem(key('b','highlights')),raw);
 s.setItem(key('b','highlights'),'{broken');migrateReaderStorage(book,sections,s,x=>x.content);assert.equal(s.getItem(key('b','highlights')),'{broken');
 const before=[...s.m];migrateReaderStorage({...book,compatibility:undefined},sections,s,x=>x.content);assert.deepEqual([...s.m],before);
 const failing={getItem:()=> '[{"sectionId":"old","text":"unique quote"}]',setItem:()=>{throw Error('quota');}};assert.equal(migrateReaderStorage(book,sections,failing,x=>x.content),false);
});
test('agent chapter map exports all units and rewrites exact fragment owner only when configured',()=>{
 const b={...book,sections:[{...sections[0],format:'html',content:'<a href="#gender">Gender</a><a href="?section=old#gender">Legacy</a>'},...sections.slice(1)]};
 const out=buildAgentBook(b);assert.equal(out.manifest.counts.sections,3);
 const file=out.files.find(x=>x.path.endsWith('/old.md'));assert.ok(file.content.includes('href="noun.md#gender"'));assert.ok(!file.content.includes('href="#gender"'));
 const plain=buildAgentBook({...b,compatibility:undefined});assert.ok(plain.files.find(x=>x.path.endsWith('/old.md')).content.includes('href="#gender"'));
});
