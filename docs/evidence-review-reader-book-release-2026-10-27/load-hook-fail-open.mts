/** Does the one-book swap in release-plugin.ts fail open when the app folder is reached through a different spelling of its path (a symlink)?
 * Builds a two-book fake app in a fresh scratch folder under build/, once through the real path and once through a symlink to it, and records
 * whether the second book's text reaches the bundle. Scratch is deleted in `finally`; writes only load-hook-fail-open.json beside this file.
 * Run from the repository root: apps/reader-demo/node_modules/.bin/tsx docs/evidence-review-reader-book-release-2026-10-27/load-hook-fail-open.mts */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { PublicationBook } from '../../packages/reader-core/src/original/types';
import publications from '../../apps/reader-demo/src/books/original-publications.json';
import { releasePlugin } from '../../apps/reader-demo/scripts/release/release-plugin';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const { build } = await import(pathToFileURL(path.join(repo, 'apps/reader-demo/node_modules/vite/dist/node/index.js')).href) as typeof import('vite');
const scratch = path.join(repo, 'build', `review-reader-book-release-loadhook-2026-10-27-${process.pid}`);
const real = (publications as PublicationBook[]).find(b => b.id === 'language-muscle')!;
const SECRET = 'OTHER-BOOK-MANUSCRIPT-MARKER-7f3a';
const mine: PublicationBook = { ...real, sections: [{ id: 'intro', title: 'Intro', category: 'x', content: 'Own text.' }] };
const other: PublicationBook = { ...real, id: 'other-book', title: 'Other', sections: [{ id: 'other', title: 'Other', category: 'x', content: SECRET }] };
const results: Record<string, unknown>[] = [];
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
try {
  if (fs.existsSync(scratch)) throw new Error('scratch exists');
  const app = path.join(scratch, 'app-real');
  fs.mkdirSync(path.join(app, 'src', 'books'), { recursive: true });
  fs.writeFileSync(path.join(app, 'index.html'), '<!doctype html>\n<html lang="en">\n<head><title>x</title>\n<meta name="robots" content="noindex" />\n</head>\n<body><div id="root"></div><script type="module" src="/src/main.js"></script></body></html>\n');
  fs.writeFileSync(path.join(app, 'src', 'books', 'original-publications.json'), JSON.stringify([mine, other]));
  fs.writeFileSync(path.join(app, 'src', 'canonical-sites.ts'), `export const canonicalSites = ${JSON.stringify({ 'language-muscle': 'https://a.test/', 'other-book': 'https://other-book.test/' })};\n`);
  fs.writeFileSync(path.join(app, 'src', 'main.js'), "import books from './books/original-publications.json';\nimport { canonicalSites } from './canonical-sites.ts';\ndocument.body.dataset.books = JSON.stringify(books) + JSON.stringify(canonicalSites);\n");
  fs.symlinkSync(app, path.join(scratch, 'app-link'));
  for (const [label, root] of [['real path', app], ['symlinked path', path.join(scratch, 'app-link')]] as const) {
    const outDir = path.join(scratch, 'out', label.replace(/\s+/g, '-'));
    let error: string | undefined;
    try { await build({ configFile: false, root, base: '/', publicDir: false, logLevel: 'silent', plugins: [releasePlugin(mine, 'https://a.test/', root)], build: { outDir, emptyOutDir: true } }); }
    catch (e) { error = String((e as Error).message).split('\n')[0]; }
    const js = fs.existsSync(path.join(outDir, 'assets')) ? fs.readdirSync(path.join(outDir, 'assets')).map(f => fs.readFileSync(path.join(outDir, 'assets', f), 'utf8')).join('') : '';
    results.push({ case: label, appRootGivenToPlugin: path.relative(scratch, root), error, otherManuscriptInBundle: js.includes(SECRET), otherAddressInBundle: js.includes('other-book.test') });
  }
} catch (e) {
  results.push({ case: 'harness error', error: String(e).slice(0, 400) });
} finally {
  if (scratch.startsWith(path.join(repo, 'build') + path.sep) && path.basename(scratch).startsWith('review-reader-book-release-loadhook-')) {
    await pause(1000); fs.rmSync(scratch, { recursive: true, force: true });
  }
}
fs.writeFileSync(path.join(here, 'load-hook-fail-open.json'), `${JSON.stringify({ generated: new Date().toISOString(), scratchRemoved: !fs.existsSync(scratch), results }, null, 2)}\n`);
console.log(JSON.stringify(results), 'scratchRemoved', !fs.existsSync(scratch));
