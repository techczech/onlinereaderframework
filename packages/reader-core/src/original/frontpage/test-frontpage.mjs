import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { build } from '../../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root = fileURLToPath(new URL('../../../../..', import.meta.url));
const result = await build({ absWorkingDir: root, stdin: { contents: `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Home } from '../Home.tsx';
export * from './frontpage-layouts.ts';
export * from './frontpage-model.ts';
export function render(book, props = {}) {
 const noop = () => {};
 return renderToStaticMarkup(React.createElement(Home, {book, onStart:noop, onSelectSection:noop, onOpenSearch:noop, onDownloadEbook:noop, ...props}));
}`, resolveDir: resolve(root, 'packages/reader-core/src/original/frontpage') }, bundle: true, write: false, platform: 'node', format: 'esm', packages: 'external' });
const require = createRequire(new URL('../../../../../apps/reader-demo/package.json', import.meta.url));
const source = result.outputFiles[0].text.replace(/from "([^".][^"]*)"/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`);
const m = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const { render, FRONT_PAGE_LAYOUTS, frontPageLayoutKey, frontPageContents, defaultFullContents, frontPageMatches, frontPageTargets, frontPageProgress, frontPageTitle } = m;

const section = (id, title, category = title, children, content = '# ' + title) => ({ id, title, category, content, ...(children ? { children } : {}) });
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const ids = html => [...html.matchAll(/data-section-id="([^"]+)"/g)].map(match => match[1]);
const flatBook = {
  id: 'flat', title: 'Flat Book', author: 'Author', description: 'Description',
  sections: [section('a', 'Alpha', 'Basics'), section('b', 'Beta', 'Basics'), section('c', 'Gamma', 'Advanced'), section('solo', 'On its own', 'On its own'), section('guide', 'Reader Guide', 'App Guide')],
  navigation: { homeDepth: 2 },
};
const treeBook = {
  id: 'tree', title: 'Tree Book', author: 'Author', description: 'Description',
  sections: [
    section('intro', 'Introduction', 'Introduction', [section('i1', 'One'), section('i2', 'Two')], 'A landing sentence.'),
    section('empty', 'Empty topic', 'Empty topic', [section('e1', 'Hidden child')], ''),
    section('noread', 'Nothing here', 'Nothing here', [section('n1', 'Deep', 'Deep', [section('n2', 'Deeper')], '')], ''),
    section('lone', 'Standalone', 'Standalone'),
  ],
  navigation: { homeDepth: 2 },
};

test('the six layout keys are exact and invalid values fall back to no layout', () => {
  assert.deepEqual(FRONT_PAGE_LAYOUTS.map(layout => layout.key), ['sol-jacket', 'sol-reading-desk', 'sol-open-contents', 'opus-title-contents', 'opus-search-map', 'opus-colour-band']);
  assert.deepEqual(FRONT_PAGE_LAYOUTS.map(layout => layout.label), ['Jacket', 'Reading desk', 'Open contents', 'Title beside contents', 'Search and topic map', 'Colour band']);
  for (const { key } of FRONT_PAGE_LAYOUTS) assert.equal(frontPageLayoutKey(key), key);
  for (const bad of [undefined, null, '', 'Colour band', 'opus-colour-bands', 42, {}]) assert.equal(frontPageLayoutKey(bad), undefined);
});

test('an omitted or invalid layout renders the classic home page; a valid one renders that layout', () => {
  const classic = render(flatBook);
  assert.match(classic, /publication-masthead/);
  assert.doesNotMatch(classic, /data-front-layout/);
  assert.equal(render({ ...flatBook, appearance: { frontPageLayout: 'nonsense' } }), classic);
  for (const { key } of FRONT_PAGE_LAYOUTS) {
    const html = render({ ...flatBook, appearance: { frontPageLayout: key } });
    assert.match(html, new RegExp(`data-front-layout="${key}"`));
    assert.doesNotMatch(html, /publication-masthead/);
    assert.match(text(html), /Start reading/);
    assert.match(text(html), /Download eBook/);
  }
});

test('flat books group runs of one category for display only; ids and order are preserved', () => {
  const contents = frontPageContents(flatBook);
  assert.deepEqual(contents.groups.map(group => [group.kind, group.title]), [['category', 'Basics'], ['category', 'Advanced'], ['single', 'On its own'], ['category', 'App Guide']]);
  assert.deepEqual(contents.groups.flatMap(group => group.entries.map(entry => entry.section.id)), ['a', 'b', 'c', 'solo', 'guide']);
  assert.equal(contents.total, 5);
  assert.deepEqual(contents.groups.map(group => group.numbered), [true, true, true, false]);
  assert.equal(contents.hasDepth, true);
  assert.equal(frontPageContents({ ...flatBook, navigation: { homeDepth: 1 } }).groups.every(group => group.kind === 'single'), true);
  assert.equal(frontPageContents({ ...flatBook, navigation: { homeDepth: 1 } }).hasDepth, false);
  assert.equal(frontPageContents({ ...flatBook, navigation: { homeDepth: 0 } }).groups.length, 0);
});

test('tree books group by top-level section; empty groups are skipped and group pages with text stay reachable', () => {
  const contents = frontPageContents(treeBook);
  assert.deepEqual(contents.groups.map(group => group.title), ['Introduction', 'Empty topic', 'Nothing here', 'Standalone']);
  const intro = contents.groups[0];
  assert.equal(intro.section.id, 'intro');
  assert.equal(intro.count, 3);
  assert.equal(contents.groups[1].section, undefined);
  assert.equal(contents.total, 3 + 1 + 1 + 1);
  const deep = frontPageContents({ ...treeBook, navigation: { homeDepth: 3 } });
  const nothing = deep.groups.find(group => group.key === 'noread');
  assert.deepEqual(nothing.entries.map(entry => [entry.section.id, entry.readable, entry.depth]), [['n1', false, 0], ['n2', true, 1]]);
  assert.equal(frontPageContents({ ...treeBook, navigation: { homeDepth: 1 } }).groups[0].entries.length, 0);
});

test('an explicit depth cap never removes a structural topic whose subtree has readable pages', () => {
  const structural = { id: 's', title: 'Structural', author: 'A', description: 'D', navigation: { homeDepth: 1 }, sections: [
    section('group', 'Group topic', 'Group topic', [section('g1', 'Child page')], ''),
    section('meaningful', 'Meaningful topic', 'Meaningful topic', [section('m1', 'Under meaningful')], 'Own text.'),
    section('deep', 'Deep topic', 'Deep topic', [section('d1', 'Heading', 'Heading', [section('d2', 'Buried page')], '')], ''),
  ] };
  for (const depth of [1, 2, 3]) {
    const contents = frontPageContents({ ...structural, navigation: { homeDepth: depth } });
    assert.deepEqual(contents.groups.map(group => group.title), ['Group topic', 'Meaningful topic', 'Deep topic'], 'depth ' + depth);
    assert.ok(contents.groups.every(group => group.count > 0 && group.entries.some(entry => entry.readable) || group.section), 'no empty level at depth ' + depth);
  }
  const one = frontPageContents(structural);
  assert.deepEqual(one.groups[0].entries.map(entry => [entry.section.id, entry.depth, entry.readable]), [['g1', 0, true]]);
  assert.deepEqual(one.groups[1].entries, [], 'a topic with its own page keeps the cap');
  assert.deepEqual(one.groups[2].entries.map(entry => entry.section.id), ['d2']);
  assert.equal(one.total, 1 + 1 + 1);
  assert.equal(frontPageContents({ ...structural, navigation: { homeDepth: 0 } }).groups.length, 0);
  assert.match(render(structural, { appearance: { frontPageLayout: 'opus-colour-band' } }), /Group topic/);
});

test('Full contents opens first only for a short list; filtering finds entries in closed groups', () => {
  assert.equal(defaultFullContents(frontPageContents(treeBook)), true);
  const many = { ...flatBook, sections: Array.from({ length: 41 }, (_, i) => section('s' + i, 'Section ' + i, 'Group')) };
  assert.equal(defaultFullContents(frontPageContents(many)), false);
  assert.deepEqual(frontPageMatches(frontPageContents(treeBook), 'TWO').map(match => [match.entry.section.id, match.context]), [['i2', 'Introduction']]);
  assert.deepEqual(frontPageMatches(frontPageContents(treeBook), 'introduction').map(match => match.entry.section.id), ['intro']);
  assert.deepEqual(frontPageMatches(frontPageContents(treeBook), '  '), []);
});

test('Start is the first readable page; Continue needs a real, readable, stored page', () => {
  assert.equal(frontPageTargets(treeBook).start.id, 'intro');
  assert.equal(frontPageTargets(treeBook).resume, undefined);
  assert.equal(frontPageTargets(treeBook, 'i2').resume.id, 'i2');
  assert.equal(frontPageTargets(treeBook, 'gone').resume, undefined);
  assert.equal(frontPageTargets(treeBook, 'empty').resume, undefined);
  assert.equal(frontPageTargets(flatBook, 'guide').resume, undefined);
  assert.equal(frontPageTargets(treeBook, null).resume, undefined);
  const withLayout = { ...treeBook, appearance: { frontPageLayout: 'sol-jacket' } };
  const first = text(render(withLayout));
  assert.match(first, /Start reading/); assert.doesNotMatch(first, /Continue reading|Start from the beginning/);
  const again = text(render(withLayout, { lastSectionId: 'i2' }));
  assert.match(again, /Continue reading/); assert.match(again, /Start from the beginning/);
  const stale = text(render(withLayout, { lastSectionId: 'gone' }));
  assert.match(stale, /Start reading/); assert.doesNotMatch(stale, /Continue reading/);
});

test('progress counts read chapters with the sidebar rule and stays hidden until something is read', () => {
  assert.equal(frontPageProgress(flatBook, new Set()), null);
  assert.deepEqual(frontPageProgress(flatBook, new Set(['a', 'c', 'guide'])), { read: 2, total: 4 });
  const html = text(render({ ...flatBook, appearance: { frontPageLayout: 'opus-colour-band' } }, { readSections: new Set(['a', 'c']) }));
  assert.match(html, /2 of 4 read/);
  assert.doesNotMatch(text(render({ ...flatBook, appearance: { frontPageLayout: 'opus-colour-band' } })), / of 4 read/);
});

test('titles use the established display title and split only for layout', () => {
  assert.deepEqual(frontPageTitle({ title: 'Building Your', subtitle: 'Language Muscle' }), { full: 'Building Your Language Muscle', title: 'Building Your', continuation: 'Language Muscle' });
  assert.deepEqual(frontPageTitle({ title: 'Deliberate Practice:', subtitle: 'A Universal Learning Method' }), { full: 'Deliberate Practice: A Universal Learning Method', title: 'Deliberate Practice:', subtitle: 'A Universal Learning Method' });
  assert.equal(frontPageTitle({ title: 'Plain' }).full, 'Plain');
  const html = render({ ...flatBook, title: 'Building Your', subtitle: 'Language Muscle', appearance: { frontPageLayout: 'sol-jacket' } });
  assert.match(text(html), /Building Your Language Muscle/);
  const repeated = render({ ...flatBook, subtitle: 'Sub', description: 'Sub', appearance: { frontPageLayout: 'sol-jacket' } });
  assert.equal((text(repeated).match(/Sub/g) || []).length, 1);
});

test('depth labels are Contents and Full contents, overridable, and absent when nothing differs', () => {
  const html = render({ ...flatBook, appearance: { frontPageLayout: 'sol-open-contents' } });
  assert.match(html, />Contents<\/button><button[^>]*>Full contents</);
  assert.match(render({ ...flatBook, labels: { contents: 'Přehled', fullContents: 'Celý obsah' }, appearance: { frontPageLayout: 'sol-open-contents' } }), />Přehled<\/button><button[^>]*>Celý obsah</);
  assert.doesNotMatch(render({ ...flatBook, navigation: { homeDepth: 1 }, appearance: { frontPageLayout: 'sol-open-contents' } }), /Full contents/);
  assert.doesNotMatch(render({ ...flatBook, navigation: { showHomeContents: false }, appearance: { frontPageLayout: 'sol-open-contents' } }), /Full contents|publication-front-contents/);
});

test('colour band numbers groups but not the app guide', () => {
  const html = render({ ...flatBook, appearance: { frontPageLayout: 'opus-colour-band' } });
  assert.deepEqual([...html.matchAll(/publication-front-numeral" aria-hidden="true">(\d+)</g)].map(match => match[1]), ['01', '02', '03']);
});

// The three real books, every layout.
const books = JSON.parse(readFileSync(resolve(root, 'apps/reader-demo/src/books/original-publications.json'), 'utf8'));
const readable = list => list.flatMap(item => [...(item.content.trim() || !item.children?.length ? [item.id] : []), ...readable(item.children ?? [])]);
test('real books list every readable page once, in tree order, in every layout', () => {
  const expected = { linguistics: [9, 253], 'deliberate-practice': [8, 21], 'language-muscle': [4, 12] };
  for (const book of books) {
    const contents = frontPageContents({ ...book, navigation: { homeDepth: 2 } });
    const listed = contents.groups.flatMap(group => [...(group.section ? [group.section.id] : []), ...group.entries.filter(entry => entry.readable).map(entry => entry.section.id)]);
    assert.deepEqual(listed, readable(book.sections), book.id);
    assert.deepEqual([contents.groups.length, contents.total], expected[book.id], book.id);
    for (const { key } of FRONT_PAGE_LAYOUTS) {
      const html = render({ ...book, navigation: { homeDepth: 2 }, appearance: { frontPageLayout: key } });
      const shown = ids(html);
      assert.equal(new Set(shown).size, shown.length, `${book.id} ${key} duplicates`);
      if (defaultFullContents(contents) && key !== 'opus-search-map') assert.deepEqual(shown, readable(book.sections), `${book.id} ${key}`);
    }
  }
});
