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
export function render(book, sidebar = false) {
 const noop = () => {};
 return renderToStaticMarkup(sidebar ? React.createElement(Sidebar, {book, currentSectionId:'leaf', onSelectSection:noop, isOpen:true, onClose:noop, readSections:new Set(), bookmarkedSections:new Set()}) : React.createElement(Home, {book, onStart:noop, onSelectSection:noop, onOpenSearch:noop}));
}`, resolveDir: resolve(root, 'packages/reader-core/src/original') }, bundle: true, write: false, platform: 'node', format: 'esm', packages:'external' });
// Resolve external React from the demo's established dependencies.
const require = createRequire(new URL('../../package.json', import.meta.url));
const source = result.outputFiles[0].text.replace(/from "([^".][^"]*)"/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`);
const { render, publicationColour } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
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
