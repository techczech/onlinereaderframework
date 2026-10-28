/** Everything one release edition writes besides Vite's own bundle, planned before any write. The release plugin emits exactly this plan, the
 * pre-write checks read its paths, and the verifier compares the built folder with it. Pure apart from reading the cover, the icon, the pinned
 * previous-site files and, for a converted book, its pinned cover and embed documents (edition-assets.ts).
 * An edition served from a folder (`base` other than `/`) writes no robots.txt (only a domain root's counts; the host lists the edition's sitemap) and
 * scopes its `_headers` rules to the folder, for the host to add to its own. */
import fs from 'node:fs';
import path from 'node:path';
import { buildAgentBook, buildAgentRootIndex, type AgentBookExport } from '../../../../packages/reader-core/src/agent-export/index';
import { publicationDisplayTitle } from '../../../../packages/reader-core/src/original/publication-model';
import type { PublicationEmbeds } from '../../../../packages/reader-core/src/embed/embed-model';
import type { PublicationBook } from '../../../../packages/reader-core/src/original/types';
import { sectionIdsOf } from '../../src/release-routes';
import { convertedEditionAssets, type EditionAssets } from './edition-assets';
import { securityHeaders } from './headers';
import { previousSite, type PlannedFile, type PreviousSite } from './previous-site';
import { RELEASE_ICON_FILE, releaseIconSvg, releaseProjection, type Projection } from './projection';
import { outputPathProblems, sectionIdProblems } from './route-checks';
import { convertedBookIds, editionBase } from './release-books';
import { allPages, notFoundMain, robots, sitemap, standalonePage, type Page, type PageContext } from './static-pages';

export type { PlannedFile } from './previous-site';
export interface EditionPlan {
  /** The release projection of the book; the canonical manuscript is not changed. */
  book: PublicationBook; site: string; projection: Projection; exported: AgentBookExport; hasCover: boolean;
  /** The edition's folder on its host: `/`, or `/books/<name>/` for a converted book (Vite's `base`). */
  base: string;
  /** A converted book's embed descriptors (with `base`) and the record of its pinned cover and embed files; absent for the originals. */
  embeds?: PublicationEmbeds; assets?: EditionAssets['record'];
  /** Pages built on Vite's index.html, root first; alias pages of previous-site addresses. */
  pages: Page[]; aliases: Page[];
  /** Files emitted as they are. */
  files: PlannedFile[];
  previous?: PreviousSite;
}

export function planEdition(input: { book: PublicationBook; site: string; appRoot: string; previousSiteDir: string }): EditionPlan {
  const ids = sectionIdsOf(input.book.sections);
  const idProblems = sectionIdProblems(input.book.id, ids);
  if (idProblems.length) throw new Error(`Section ids refused before any write:\n  ${idProblems.join('\n  ')}`);
  const { site } = input;
  const base = editionBase(site);
  const converted = convertedBookIds.has(input.book.id);
  if (converted === (base === '/')) throw new Error(`${input.book.id}: ${converted ? 'a converted book needs a folder address' : 'an original book keeps its domain-root address'}.`);
  const projection = releaseProjection(input.book, base);
  const { book } = projection;
  const assets = converted ? convertedEditionAssets(book, input.appRoot, base) : undefined;
  const context: PageContext = { book, site };
  const title = publicationDisplayTitle(book);
  const exported = buildAgentBook(book, { siteUrl: site });
  const cover = path.join(input.appRoot, 'public', 'covers', `${book.id}.jpg`);
  const hasCover = assets ? true : fs.existsSync(cover);
  const { pages, aliases } = allPages(context);
  const previous = previousSite(book.id, exported, ids, input.previousSiteDir);
  const files: PlannedFile[] = [
    { path: 'sitemap.xml', content: sitemap(context, pages), origin: 'generated' },
    ...(base === '/' ? [{ path: 'robots.txt', content: robots(site), origin: 'generated' }] : []),
    ...exported.files.map(file => ({ path: file.path, content: file.content, origin: 'agent export' })),
    { path: 'llms.txt', content: buildAgentRootIndex([exported], { siteUrl: site, title,
      summary: `${book.description.replace(/[.\s]*$/, '')}. The whole book is available as plain Markdown: an index, the whole text in one file, and one file per section.` }).content, origin: 'agent export' },
    { path: '_headers', content: assets ? securityHeaders({ base, embedRoot: assets.embeds.root }) : securityHeaders(), origin: 'generated' },
    { path: '404.html', content: standalonePage(context, { title: `Page not found — ${title}`, description: 'This page does not exist.', main: previous?.mains.notFound ?? notFoundMain(site) }), origin: previous ? 'previous site 404.html (main text)' : 'generated' },
    ...(assets ? assets.files : hasCover ? [{ path: `covers/${book.id}.jpg`, content: new Uint8Array(fs.readFileSync(cover)), origin: `public/covers/${book.id}.jpg` }] : []),
    ...(projection.replaced.length ? [{ path: RELEASE_ICON_FILE, content: releaseIconSvg(input.appRoot), origin: 'src/books/assets/terminal-icon.svg' }] : []),
    ...(previous ? [
      ...previous.files,
      { path: 'about/index.html', content: standalonePage(context, { title: `About this book — ${title}`, description: book.description, canonical: `${site}about/`, main: previous.mains.about }), origin: 'previous site about/index.html (main text)' },
      { path: 'download/index.html', content: standalonePage(context, { title: `Download — ${title}`, description: book.description, canonical: `${site}download/`, main: previous.mains.download }), origin: 'previous site download/index.html (main text)' },
    ] : []),
  ];
  return { book, site, base, projection, exported, hasCover, pages, aliases, files, previous, ...(assets ? { embeds: assets.embeds, assets: assets.record } : {}) };
}

/** Every path the plan writes, the root page included. */
export const plannedPaths = (plan: EditionPlan): string[] => [...plan.pages, ...plan.aliases].map(page => page.path).concat(plan.files.map(file => file.path));

/** Problems found before any write: colliding or unsafe paths, or a planned path inside Vite's own `assets/` folder. */
export function planProblems(plan: EditionPlan): string[] {
  const paths = plannedPaths(plan);
  return [...outputPathProblems(paths), ...paths.filter(name => name.toLowerCase().startsWith('assets/')).map(name => `planned path ${name} is inside Vite's assets folder`)];
}
