import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from '../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root = fileURLToPath(new URL('../../../..', import.meta.url));
const result = await build({ absWorkingDir: root, stdin: { contents: `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Home } from './Home.tsx';
import { Sidebar } from './Sidebar.tsx';
export { publicationColour } from './publication-navigation.ts';
export * from './sidebar-model.ts';
export function render(book, sidebar = false) {
 const noop = () => {};
 return renderToStaticMarkup(sidebar ? React.createElement(Sidebar, {book, currentSectionId:'leaf', onSelectSection:noop, isOpen:true, onClose:noop, readSections:new Set(), bookmarkedSections:new Set()}) : React.createElement(Home, {book, onStart:noop, onSelectSection:noop, onOpenSearch:noop}));
}`, resolveDir: resolve(root, 'packages/reader-core/src/original') }, bundle: true, write: false, platform: 'node', format: 'esm', packages:'external' });
// Resolve external React from the demo's established dependencies.
const require = createRequire(new URL('../../package.json', import.meta.url));
const source = result.outputFiles[0].text.replace(/from "([^".][^"]*)"/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`);
const { render, publicationColour, isReadableSection, sectionAncestors, sectionTreeDepth, sidebarDepth, readableNeighbours, chapterProgress, sidebarExpanded, dropClosedOnPath } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const section = (id, title, children) => ({id, title, category:title, content:'# ' + title, children});
const book = {id:'tree', title:'Actual Book', author:'Author', description:'Description', sections:[section('part','Part One',[section('chapter','Chapter One',[section('leaf','Leaf One')])]),section('next','Next Part')]};
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g,' ');
test('home shows two actual tree levels in original order without category duplicates', () => {
 const html = text(render(book));
 assert.equal((html.match(/Part One/g) || []).length, 1);
 assert.ok(html.indexOf('Part One') < html.indexOf('Chapter One'));
 assert.ok(html.indexOf('Chapter One') < html.indexOf('Next Part'));
 assert.ok(!html.includes('Leaf One'));
});
test('home depth and visibility are configurable', () => {
 assert.ok(text(render({...book,navigation:{homeDepth:3}})).includes('Leaf One'));
 assert.ok(!text(render({...book,navigation:{showHomeContents:false}})).includes('Part One'));
 assert.ok(!text(render({...book,navigation:{homeDepth:1}})).includes('Chapter One'));
});
test('neutral labels and custom labels are rendered by home and sidebar', () => {
 for (const sidebar of [false,true]) {
  assert.ok(text(render(book,sidebar)).includes('Table of contents'));
  assert.ok(!text(render(book,sidebar)).includes('Search Guide'));
  const custom = render({...book,labels:{search:'Find words',tableOfContents:'Book map'}},sidebar);
  assert.ok(custom.includes('Find words'));
  assert.ok(custom.includes('Book map'));
 }
});
test('sidebar uses original tree exactly once and respects depth', () => {
 assert.equal((text(render(book,true)).match(/Part One/g) || []).length,1);
 assert.ok(text(render(book,true)).includes('Leaf One'));
 assert.ok(!text(render({...book,navigation:{sidebarDepth:1}},true)).includes('Chapter One'));
});
test('home uses supplied real cover and masthead variant', () => {
 const html = render({...book,appearance:{masthead:'literary',cover:{src:'/real-cover.jpg',alt:'Original cover'}}});
 assert.ok(html.includes('/real-cover.jpg'));
 assert.ok(html.includes('Original cover'));
 assert.ok(html.includes('publication-masthead--literary'));
});

test('appearance rejects invalid and injected colours without losing valid values', () => {
 for (const value of ['notacolour','#12345','#1234567','rgb(bad)','url(https://bad.test)','red;display:none','var(--secret)','rgb(1., 2, 3)','rgb(1 2 3 / 0.)','hsl(20. 40% 50%)']) assert.equal(publicationColour(value),undefined,value);
 for (const value of ['#123','#1234','#123456','#12345678','red','rebeccapurple','rgb(20, 30, 40)','hsl(20 40% 50%)']) assert.equal(publicationColour(value),value,value);
});
test('explicit contents label wins over legacy home copy', () => {
 const html = text(render({...book, labels:{tableOfContents:'Table of contents'},home:{overviewTitle:'Course overview'}}));
 assert.ok(!html.includes('Course overview'));
});

test('sidebar depth follows the book tree unless the author sets one', () => {
 assert.equal(sectionTreeDepth(book.sections), 3);
 assert.equal(sidebarDepth(book.sections), 3);
 assert.equal(sidebarDepth(book.sections, 1), 1);
 assert.equal(sidebarDepth([section('flat','Flat')]), 1);
 assert.ok(text(render(book,true)).includes('Leaf One'));
});
test('empty topic groups are skipped by previous and next but meaningful parents stay', () => {
 const group = {...section('group','Group',[section('a','A'),section('b','B')]), content:''};
 const intro = section('intro','Intro',[section('c','C')]);
 const flat = [group, group.children[0], group.children[1], intro, intro.children[0]];
 assert.equal(isReadableSection(group), false);
 assert.equal(isReadableSection(intro), true);
 assert.deepEqual(readableNeighbours(flat,'a'), {prev:null,next:flat[2]});
 assert.equal(readableNeighbours(flat,'b').next.id, 'intro');
 assert.equal(readableNeighbours(flat,'c').prev.id, 'intro');
 assert.equal(readableNeighbours(flat,'group').next.id, 'a');
});
test('progress counts chapters with text, not empty groups', () => {
 const group = {...section('group','Group',[section('a','A')]), content:''};
 const flat = [group, group.children[0]];
 assert.deepEqual(chapterProgress(flat,new Set(['group','a'])), {read:1,total:1});
});
test('topic rows follow the current path, manual toggles win, and arriving reopens a closed topic', () => {
 const part = book.sections[0];
 assert.deepEqual(sectionAncestors(book.sections,'leaf').map(item => item.id), ['part','chapter']);
 assert.equal(sidebarExpanded(part,true,{}), true);
 assert.equal(sidebarExpanded(part,false,{}), false);
 assert.equal(sidebarExpanded(part,true,{part:false}), false);
 assert.equal(sidebarExpanded(part,false,{part:true}), true);
 assert.deepEqual(dropClosedOnPath({part:false,other:false,kept:true},['part']), {other:false,kept:true});
});
test('sidebar rows: a topic row only toggles, a chapter row navigates, and every row names its full title', () => {
 const html = render(book,true);
 assert.match(html, /aria-expanded="true"[^>]*>[^]*Part One/);
 assert.match(html, /data-section-id="leaf"[^>]*aria-current="page"/);
 assert.ok(!html.includes('Expand Part One'));
 assert.ok(html.includes('title="Leaf One"'));
 assert.ok(html.includes('data-open="true"'));
 assert.ok(!text(html).includes('Notes & Highlights'));
 assert.match(text(html), /\d+ of \d+ read/);
});
