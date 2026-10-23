import { generatePublicationEpub, downloadPublicationEpub } from './index.js';
import JSZip from 'jszip';
import { validateEpubReferences } from './epub-references.js';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const readXml = async (zip, path) => new DOMParser().parseFromString(await zip.file(path).async('string'), 'application/xml');
const chapter = (id, content) => ({ id, title: id, category: 'Test', format: 'html', content });
const book = sections => ({ id: 'test-book', title: 'Test book', author: 'Test author', description: '', sections });
const rejection = async (publication, expected, options) => {
  let message = '';
  try { await generatePublicationEpub(publication, options); } catch (error) { message = String(error); }
  assert(message.includes(expected), `Expected explicit ${expected} rejection; got ${message || 'successful archive'}`);
};
const archive = async publication => JSZip.loadAsync(await (await generatePublicationEpub(publication)).arrayBuffer());

export const runPublicationEpubRegressions = async () => {
  const results = [];
  const check = async (name, run) => {
    try { await run(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: String(error) }); }
  };
  for (const sourceUrl of [undefined, 'https://example.org/reader?book=test-book&host=keep']) {
    await check(`query routes, legacy queries and encoded fragments (${sourceUrl ? 'source URL' : 'no source URL'})`, async () => {
      const publication = { ...book([
        chapter('a', '<a href="?section=b">query</a><a href="#/b?text=target">legacy</a><a href="?section=b&amp;text=target#target-%C4%8D">fragment</a><a href="#/b%2Fc?text=target">encoded chapter</a>'),
        chapter('b', '<h2 id="target-č">Target</h2>'), chapter('b/c', '<p>Encoded chapter</p>'),
      ]), sourceUrl };
      const zip = await archive(publication);
      const doc = await readXml(zip, 'OEBPS/Text/chapter-0001.xhtml');
      assert(JSON.stringify([...doc.querySelectorAll('a')].map(a => a.getAttribute('href'))) === JSON.stringify([
        'chapter-0002.xhtml', 'chapter-0002.xhtml', 'chapter-0002.xhtml#reader-content-target-%C4%8D', 'chapter-0003.xhtml',
      ]), 'All supported routes must resolve to included chapters');
    });
  }
  await check('book identity, unrelated host parameters, home route and genuine external links', async () => {
    const publication = { ...book([chapter('a', [
      '<a href="?book=test-book&amp;section=b&amp;host=changed">own</a>',
      '<a href="?book=other-book&amp;section=b">other book</a>',
      '<a href="https://elsewhere.org/reader?section=b">other host</a>',
      '<a href="https://example.org/elsewhere?section=b">other path</a>',
      '<a href="https://example.org/reader?section=b&amp;host=changed">same host route</a>',
      '<a href="?book=test-book&amp;host=changed">home</a>',
      '<a href="mailto:reader@example.org">email</a>',
    ].join('')), chapter('b', '<p>B</p>')]), sourceUrl: 'https://example.org/reader?book=test-book&host=keep' };
    const zip = await archive(publication);
    const doc = await readXml(zip, 'OEBPS/Text/chapter-0001.xhtml');
    assert(JSON.stringify([...doc.querySelectorAll('a')].map(a => a.getAttribute('href'))) === JSON.stringify([
      'chapter-0002.xhtml', 'https://example.org/reader?book=other-book&section=b', 'https://elsewhere.org/reader?section=b',
      'https://example.org/elsewhere?section=b', 'chapter-0002.xhtml', '../intro.xhtml', 'mailto:reader@example.org',
    ]), 'Same-book identity must be separate from host parameters and external links');
  });
  await check('external URLs retain fragments and never use the route parser fallback as host identity', async () => {
    const publication = book([chapter('a', '<a href="https://epub.invalid/elsewhere#target">External fragment</a><a href="https://publication.invalid/reader?section=absent">External route</a>')]);
    const doc = await readXml(await archive(publication), 'OEBPS/Text/chapter-0001.xhtml');
    assert(doc.querySelector('a').getAttribute('href') === 'https://epub.invalid/elsewhere#target', 'External fragment must remain external');
    assert(doc.querySelectorAll('a')[1].getAttribute('href') === 'https://publication.invalid/reader?section=absent', 'Fallback base must never identify an external book');
  });
  await check('XML-forbidden IDs a+U+0001+b versus ab reject before collapsing', () => rejection(book([
    chapter('a', '<p id="a\u0001b">One</p><p id="ab">Two</p><a href="#a%01b">One</a>'),
  ]), 'XML-forbidden'));
  await check('XML-forbidden SVG gradient IDs reject before collapsing', () => rejection(book([
    chapter('a', '<svg><defs><linearGradient id="a\u0001b"/><linearGradient id="ab"/></defs><path fill="url(#ab)" d="M0 0L1 1"/></svg>'),
  ]), 'XML-forbidden'));
  await check('entity-decoded XML-forbidden IDs reject explicitly', () => rejection(book([
    chapter('a', '<p id="a&#1;b">One</p><p id="ab">Two</p><a href="#a%01b">One</a>'),
  ]), 'XML-forbidden'));
  await check('missing local fragment rejects explicitly', () => rejection(book([chapter('a', '<a href="#missing">Missing footnote</a>')]), 'missing fragment'));
  await check('missing chapter fragment rejects explicitly', () => rejection(book([
    chapter('a', '<a href="?section=b#missing">Missing</a>'), chapter('b', '<p>B</p>'),
  ]), 'missing fragment'));
  await check('missing query chapter rejects explicitly', () => rejection(book([chapter('a', '<a href="?section=absent">Missing</a>')]), 'absent'));
  await check('encoded local fragments and repeated footnote backlinks remain paired', async () => {
    const publication = book([{ ...chapter('a', '# Notes\n\nTwice.[^same] Again.[^same]\n\n[^same]: Return to both.\n\n<p id="č">Czech</p><a href="#%C4%8D">Czech target</a>'), format: 'markdown' }]);
    const doc = await readXml(await archive(publication), 'OEBPS/Text/chapter-0001.xhtml');
    const ids = [...doc.querySelectorAll('[id]')].map(element => element.id);
    assert(ids.length === new Set(ids).size, 'Final IDs must be unique');
    const links = [...doc.querySelectorAll('a[href^="#"]')];
    assert(doc.querySelectorAll('a.footnote-backref').length === 2, 'Both footnote backlinks must remain');
    assert(links.every(link => ids.includes(decodeURIComponent(link.getAttribute('href').slice(1)))), 'Every final fragment must resolve');
  });
  await check('SVG paint references resolve to final gradient IDs', async () => {
    const doc = await readXml(await archive(book([chapter('a', '<svg><defs><linearGradient id="gradient"/><linearGradient id="reader-content-gradient"/></defs><path fill="url(#gradient)" stroke="url(#reader-content-gradient)" d="M0 0L1 1"/></svg>')])), 'OEBPS/Text/chapter-0001.xhtml');
    const gradients = [...doc.getElementsByTagName('linearGradient')].map(element => element.id);
    const path = doc.getElementsByTagName('path')[0];
    assert(gradients.length === 2 && new Set(gradients).size === 2, 'Both gradients must remain distinct');
    assert(['fill', 'stroke'].every(name => gradients.includes(path.getAttribute(name).slice(5, -1))), 'Paint references must resolve after all transformations');
    assert(path.getAttribute('fill') !== path.getAttribute('stroke'), 'Paint references must retain their distinct targets');
  });
  await check('supplied SVG missing fragment rejects explicitly', async () => {
    await rejection(book([chapter('a', '<img src="diagram.svg" alt="Diagram">')]), 'Missing SVG fragment', { assets: [{ href: 'diagram.svg', mediaType: 'image/svg+xml', data: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(#missing)" d="M0 0L1 1"/></svg>') }] });
  });
  await check('final validation rejects duplicate IDs and unresolved SVG paint after serialisation', async () => {
    const finalDocuments = [
      ['<p id="ab"/><p id="ab"/>', 'Duplicate'],
      ['<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(#missing)"/></svg>', 'missing fragment'],
      ['<svg xmlns="http://www.w3.org/2000/svg"><use href="#missing"/></svg>', 'missing fragment'],
    ];
    for (const [body, expected] of finalDocuments) {
      const doc = new DOMParser().parseFromString(`<html xmlns="http://www.w3.org/1999/xhtml"><body>${body}</body></html>`, 'application/xml');
      let failure;
      try { validateEpubReferences(new Map([['OEBPS/Text/chapter-0001.xhtml', doc]])); } catch (error) { failure = String(error); }
      assert(failure?.includes(expected), `Final XML must reject ${expected}: ${failure}`);
    }
  });
  for (const identity of [
    { title: 'Building Your', subtitle: 'Language Muscle', expected: 'Building Your Language Muscle' },
    { title: 'Deliberate Practice:', subtitle: 'A Universal Learning Method', expected: 'Deliberate Practice: A Universal Learning Method' },
    { title: 'Introduction to Key Issues in Language Through Stack Exchange Answers', subtitle: 'Answers from Linguistics Stack Exchange, 2013–2016', expected: 'Introduction to Key Issues in Language Through Stack Exchange Answers from Linguistics Stack Exchange, 2013–2016' },
    { title: 'Linguistics', expected: 'Linguistics' },
    { title: 'Building Your Language Muscle', subtitle: 'Language Muscle', expected: 'Building Your Language Muscle' },
  ]) await check(`full book identity: ${identity.expected} (${identity.title})`, async () => {
    const publication = { ...book([]), ...identity };
    const zip = await archive(publication);
    const opf = await readXml(zip, 'OEBPS/content.opf');
    const intro = await readXml(zip, 'OEBPS/intro.xhtml');
    const nav = await readXml(zip, 'OEBPS/nav.xhtml');
    assert(opf.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'title')[0].textContent === identity.expected, 'EPUB metadata must contain full title');
    assert(intro.querySelector('head title').textContent === identity.expected, 'Introduction metadata must contain full title');
    assert(nav.querySelector('head title').textContent.includes(identity.expected), 'Navigation metadata must identify the full book');
    assert(nav.querySelector('a[href="intro.xhtml"]').textContent === identity.expected, 'Navigation must identify the full book');
    assert(intro.querySelector('h1').textContent === identity.title, 'Authored introduction title must remain');
    assert((intro.querySelector('h2')?.textContent ?? '') === (identity.subtitle ?? ''), 'Separate authored subtitle must remain');
    let filename;
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { filename = this.download; };
    try { await downloadPublicationEpub(publication); } finally { HTMLAnchorElement.prototype.click = click; }
    const expectedName = identity.expected.normalize('NFKC').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-').slice(0, 100) + '.epub';
    assert(filename === expectedName, `Download filename must use full title: ${filename}`);
  });
  return results;
};

window.runPublicationEpubRegressions = runPublicationEpubRegressions;
