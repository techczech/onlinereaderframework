/** Unit checks of the release routes and static pages. Run: npm run test:release */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { PublicationBook, PublicationSection } from '../../../../packages/reader-core/src/original/types';
import { sectionFromUrl } from '../../../../packages/reader-core/src/original/publication-model';
import publications from '../../src/books/original-publications.json';
import { canonicalSites } from '../../src/canonical-sites';
import { aliasRoutes, releaseLocation, sectionForPath, sectionIdsOf, sectionPath } from '../../src/release-routes';
import { allPages, headTags, sitemap } from './static-pages';

const books = publications as PublicationBook[];
const flat = (sections: PublicationSection[]): PublicationSection[] => sections.flatMap(s => [s, ...flat(s.children ?? [])]);
const linguistics = books.find(book => book.id === 'linguistics')!;
const ids = sectionIdsOf(linguistics.sections);

test('a section path and the previous Linguistics addresses open the section; nothing else does', () => {
  const answer = ids.find(id => !id.startsWith('theme-'))!;
  assert.equal(sectionForPath('linguistics', sectionPath(answer), ids), answer);
  assert.equal(sectionForPath('linguistics', sectionPath(answer).slice(0, -1), ids), answer);
  assert.equal(sectionForPath('linguistics', `/answers/${answer}/`, ids), answer);
  assert.equal(sectionForPath('linguistics', '/sections/morphology-syntax-lexicon/', ids), 'theme-morphology-syntax-lexicon');
  assert.equal(sectionForPath('linguistics', '/', ids), undefined);
  assert.equal(sectionForPath('linguistics', '/answers/nonsense/', ids), undefined);
  assert.equal(sectionForPath('linguistics', '/../etc/passwd', ids), undefined);
  assert.equal(sectionForPath('deliberate-practice', '/answers/x/', ['x']), undefined, 'previous-site routes belong to Linguistics only');
});
test('every Linguistics section has exactly one previous-site route', () => {
  const routes = aliasRoutes('linguistics', ids);
  assert.equal(routes.length, ids.length);
  assert.equal(new Set(routes.map(route => route.path)).size, ids.length);
  assert.equal(aliasRoutes('language-muscle', ['a']).length, 0);
});
test('release location drops demo parameters, keeps section and hash, and ignores an unknown book', () => {
  assert.equal(releaseLocation('linguistics', 'https://x.test/?book=deliberate-practice&frontpage=classic&homedepth=3', ids), '/');
  assert.equal(releaseLocation('linguistics', 'https://x.test/?section=a&text=b', ids), undefined);
  assert.equal(releaseLocation('linguistics', `https://x.test/${ids[1]}/?book=linguistics#h`, ids), `/?section=${encodeURIComponent(ids[1])}#h`);
});
test('hash routes of the original single-page books still open their sections', () => {
  for (const book of books) {
    const [section] = flat(book.sections).slice(-1);
    assert.equal(sectionFromUrl(`https://x.test/#/${encodeURIComponent(section.id)}`, book.id, flat(book.sections)), section.id);
  }
});
for (const book of books) {
  test(`${book.id}: one static page per section, a root page, aliases only where routes exist`, () => {
    const site = canonicalSites[book.id];
    const { pages, aliases } = allPages({ book, site });
    const all = flat(book.sections);
    assert.equal(pages.length, all.length + 1);
    assert.equal(aliases.length, aliasRoutes(book.id, all.map(s => s.id)).length);
    assert.equal(new Set(pages.map(page => page.path)).size, pages.length);
    for (const page of pages) {
      assert.ok(page.canonical.startsWith(site) && page.description.length > 0 && page.title.length > 0, page.path);
      assert.ok(!/<script|onerror=|javascript:/i.test(page.html), `unsafe markup in ${page.path}`);
    }
    assert.ok(pages[0].html.includes('<h1>') && pages[0].html.includes(`${site}llms.txt`));
    assert.equal((sitemap({ book, site }, pages).match(/<loc>/g) ?? []).length, pages.length);
    assert.ok(headTags({ book, site }, aliases[0] ?? pages[0], { alias: !!aliases[0] }).includes(aliases[0] ? 'noindex, follow' : 'index, follow'));
  });
}
