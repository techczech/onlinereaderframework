/** Vite plugin of a pinned single-book release. It uses only Vite's own output pipeline: nothing here opens a file for writing.
 * - the demo's combined book file, address list, EPUB image table, appearance table and release embed table are replaced by this one book's, so no other manuscript,
 *   address, image or embed is bundled; the build fails unless every replacement happened (five: books, addresses, EPUB images, appearance, embeds);
 * - `index.html` gets the book's title, description, canonical address and crawler-readable text;
 * - every planned page and file (`edition-plan.ts`) is emitted, and nothing else besides Vite's own bundle. */
import path from 'node:path';
import type { Plugin } from 'vite';
import { planProblems, type EditionPlan } from './edition-plan';
import { bookIdentities } from '../../src/book-identities';
import { epubAssetsModule } from './projection';
import { releaseTemplate, renderShell } from './render-shell';
import { outputPathProblems } from './route-checks';
import { escapeHtml, headTags, type Page, type PageContext } from './static-pages';

export function releasePlugin(plan: EditionPlan, appRoot: string): Plugin {
  const { book, site } = plan;
  const context: PageContext = { book, site };
  const replacements = new Map<string, () => string>([
    // Only the combined manuscripts file, and only this book's projection.
    [path.join(appRoot, 'src', 'books', 'original-publications.json'), () => JSON.stringify([book])],
    // The public addresses of the other books are not this edition's to carry either.
    [path.join(appRoot, 'src', 'canonical-sites.ts'), () => `export const canonicalSites = ${JSON.stringify({ [book.id]: site })};`],
    // Only this book's EPUB images, by the src its release text uses.
    [path.join(appRoot, 'src', 'books', 'epub-assets.ts'), () => epubAssetsModule(plan.projection, appRoot)],
    // Only this book's appearance entry (the converted books carry theirs in their own text).
    [path.join(appRoot, 'src', 'book-identities.ts'), () => `export const bookIdentities = ${JSON.stringify(bookIdentities[book.id] ? { [book.id]: bookIdentities[book.id] } : {})};`],
    // Only this book's embed descriptors (none for the originals), with the edition folder as their base.
    [path.join(appRoot, 'src', 'release-embeds.ts'), () => `export const releaseEmbeds = ${JSON.stringify(plan.embeds ? { [book.id]: plan.embeds } : {})};`],
  ]);
  const replaced = new Set<string>();
  return {
    name: 'orf-release',
    enforce: 'pre',
    load(id) {
      const file = id.split('?')[0];
      const replacement = replacements.get(file);
      if (!replacement) return null;
      replaced.add(file);
      return replacement();
    },
    transformIndexHtml: { order: 'post', handler: html => releaseTemplate(html, escapeHtml(book.language ?? 'en')) },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const missing = [...replacements.keys()].filter(file => !replaced.has(file));
        if (missing.length) throw new Error(`The release build did not replace ${missing.map(file => path.relative(appRoot, file)).join(', ')}; refusing a bundle that may carry other books.`);
        const problems = planProblems(plan);
        if (problems.length) throw new Error(`The release plan has colliding paths:\n  ${problems.join('\n  ')}`);
        const shell = bundle['index.html'];
        if (!shell || shell.type !== 'asset' || typeof shell.source !== 'string') throw new Error('The release build has no index.html.');
        const template = shell.source;
        const render = (page: Page, alias: boolean): string => renderShell(template, escapeHtml(page.title),
          headTags(context, page, { alias, cover: plan.hasCover ? `${site}covers/${book.id}.jpg` : undefined }), page.html);
        const emitted = new Set<string>(['index.html']);
        const emit = (fileName: string, source: string | Uint8Array): void => {
          if (emitted.has(fileName) || bundle[fileName]) throw new Error(`The release build would write ${fileName} twice.`);
          emitted.add(fileName);
          this.emitFile({ type: 'asset', fileName, source });
        };
        const [root, ...sections] = plan.pages;
        if (root?.path !== 'index.html') throw new Error('The release plan does not start with the root page.');
        shell.source = render(root, false);
        for (const page of sections) emit(page.path, render(page, false));
        for (const page of plan.aliases) emit(page.path, render(page, true));
        for (const file of plan.files) emit(file.path, file.content);
        const written = outputPathProblems(Object.keys(bundle));
        if (written.length) throw new Error(`The release bundle has colliding paths:\n  ${written.join('\n  ')}`);
      },
    },
  };
}
