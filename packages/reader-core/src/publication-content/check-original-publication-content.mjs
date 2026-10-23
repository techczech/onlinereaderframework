// Read-only source checks. All bundles stay in memory; originals are never built in place.
import { build } from '../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { fromHtml } from 'hast-util-from-html';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const bundle = await build({ entryPoints: ['src/publication-content/index.ts'], bundle: true, platform: 'browser', format: 'iife', globalName: 'PublicationContent', write: false, target: 'es2020' });
const context = {};
runInNewContext(bundle.outputFiles[0].text, context);
const api = context.PublicationContent;
assert.equal(typeof api.renderPublicationContent('**Browser**'), 'string');
assert.match(api.renderPublicationContent('**Browser**'), /<strong>Browser<\/strong>/);
assert.equal(api.publicationContentToText('working **memory**'), 'working memory');
console.log(JSON.stringify({ check: 'Browser bundle executes without Node or DOM globals', bytes: bundle.outputFiles[0].contents.length }));

function elements(tree) {
  const found = [];
  function visit(node) {
    if (node.type === 'element') found.push(node);
    node.children?.forEach(visit);
  }
  visit(tree);
  return found;
}
for (const [label, file, symbol, format] of [
  ['Language Muscle', '/Users/dominiklukes/worktrees/guides/building-your-language-muscle/bookContent.ts', 'BOOK_CONTENT', 'html'],
  ['Deliberate Practice', '/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/data.ts', 'GUIDE_CONTENT', 'markdown'],
]) {
  const original = await build({ entryPoints: [file], bundle: true, platform: 'neutral', format: 'iife', globalName: 'OriginalContent', write: false, target: 'es2020' });
  const originalContext = {};
  runInNewContext(original.outputFiles[0].text, originalContext);
  const chapters = [];
  function flatten(sections) {
    for (const section of sections) {
      if (section.content) chapters.push(section);
      if (section.children) flatten(section.children);
    }
  }
  flatten(originalContext.OriginalContent[symbol]);
  let headings = 0;
  let characters = 0;
  let classCount = 0;
  let diagrams = 0;
  for (const chapter of chapters) {
    const html = api.renderPublicationContent(chapter.content, format);
    assert.ok(html.length > 0, chapter.id);
    assert.equal(api.renderPublicationContent(html, 'html'), html, 'idempotence: ' + chapter.id);
    const nodes = elements(fromHtml(html, { fragment: true }));
    const ids = nodes.map(node => node.properties.id).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, chapter.id);
    assert.ok(api.publicationContentToText(chapter.content, format).length > 0, chapter.id);
    headings += api.getPublicationHeadings(chapter.content, format).length;
    characters += html.length;
    classCount += nodes.filter(node => node.properties.className).length;
    diagrams += nodes.filter(node => node.tagName === 'svg').length;
    if (format === 'html') {
      const sourceNodes = elements(fromHtml(chapter.content, { fragment: true }));
      const classes = list => list.filter(node => node.properties.className).map(node => node.properties.className.join(' '));
      assert.deepEqual(classes(nodes), classes(sourceNodes), 'original HTML classes: ' + chapter.id);
      const svgTags = ['svg', 'path', 'line', 'text', 'marker', 'linearGradient', 'stop'];
      for (const tag of svgTags) assert.equal(nodes.filter(node => node.tagName === tag).length, sourceNodes.filter(node => node.tagName === tag).length, 'original diagram ' + tag);
    }
  }
  console.log(JSON.stringify({ check: label, chapters: chapters.length, headings, renderedCharacters: characters, elementsWithClasses: classCount, diagrams, sourceSha256: createHash('sha256').update(readFileSync(file)).digest('hex') }));
}

// These are adapter checks, distinct from the original-source comparisons above.
const books = JSON.parse(readFileSync('../../apps/reader-demo/src/books/original-publications.json', 'utf8'));
for (const book of books) {
  let sectionsWithContent = 0;
  let headings = 0;
  let links = 0;
  let images = 0;
  function inspect(sections) {
    for (const section of sections) {
      if (section.content) {
        const format = section.format ?? 'markdown';
        const html = api.renderPublicationContent(section.content, format);
        assert.equal(api.renderPublicationContent(html, 'html'), html, section.id);
        assert.ok(api.publicationContentToText(section.content, format).length > 0, section.id);
        const nodes = elements(fromHtml(html, { fragment: true }));
        const ids = nodes.map(node => node.properties.id).filter(Boolean);
        assert.equal(new Set(ids).size, ids.length, section.id);
        links += nodes.filter(node => node.tagName === 'a').length;
        images += nodes.filter(node => node.tagName === 'img').length;
        headings += api.getPublicationHeadings(section.content, format).length;
        sectionsWithContent++;
      }
      if (section.children) inspect(section.children);
    }
  }
  inspect(book.sections);
  console.log(JSON.stringify({ check: 'Demo adapter: ' + book.id, sectionsWithContent, headings, links, images }));
}
