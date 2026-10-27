/** Hostile-input builds of the release plugin and the build script's guard, run only inside a fresh scratch folder under build/ (review 2026-10-27).
 * Every output directory, symlink and victim folder lives inside that scratch folder; the scratch folder is deleted in `finally`.
 * Writes only hostile-builds.json beside this file. Run from the repository root:
 *   apps/reader-demo/node_modules/.bin/tsx docs/evidence-review-reader-book-release-2026-10-27/hostile-builds.mts */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { PublicationBook, PublicationSection } from '../../packages/reader-core/src/original/types';
import { buildAgentBook, canonicalSiteUrl } from '../../packages/reader-core/src/agent-export/index';
import publications from '../../apps/reader-demo/src/books/original-publications.json';
import { releasePlugin } from '../../apps/reader-demo/scripts/release/release-plugin';
import { verifyEdition } from '../../apps/reader-demo/scripts/release/verify-edition';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const { build } = await import(pathToFileURL(path.join(repo, 'apps/reader-demo/node_modules/vite/dist/node/index.js')).href) as typeof import('vite');
const scratch = path.join(repo, 'build', `review-reader-book-release-scratch-2026-10-27-${process.pid}`);
const books = publications as PublicationBook[];
const SITE = 'https://example.test/';
const results: Record<string, unknown>[] = [];

function list(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() && !e.isSymbolicLink() ? list(full) : [path.relative(scratch, full) + (e.isSymbolicLink() ? ' (symlink)' : '')];
  });
}
function setup(): string {
  const app = path.join(scratch, 'app');
  fs.mkdirSync(app, { recursive: true });
  fs.writeFileSync(path.join(app, 'index.html'), '<!doctype html>\n<html lang="en">\n<head><title>Online Reader Framework</title>\n<meta name="robots" content="noindex, nofollow" />\n</head>\n<body><div id="root"></div><script type="module" src="/main.js"></script></body></html>\n');
  fs.writeFileSync(path.join(app, 'main.js'), 'document.body.dataset.ok = "1";\n');
  return app;
}
const viteBuild = (app: string, outDir: string, plugins: import('vite').Plugin[] = []) => build({
  configFile: false, root: app, base: '/', publicDir: false, logLevel: 'silent', plugins, build: { outDir, emptyOutDir: true, sourcemap: false },
});
/** The guard of scripts/build-release.ts:43, and a physical version of it. */
const lexicalGuard = (root: string, outDir: string): boolean => outDir.startsWith(root + path.sep);
/** A physical guard: no component from the trusted base down to the edition folder may be a symlink. */
const physicalGuard = (base: string, outDir: string): boolean => {
  const parts = path.relative(base, outDir).split(path.sep);
  let cur = base;
  for (const part of parts) { cur = path.join(cur, part); if (fs.lstatSync(cur, { throwIfNoEntry: false })?.isSymbolicLink()) return false; }
  return true;
};
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function symlinkCases(app: string): Promise<void> {
  // 1. The edition folder itself is a symlink to another folder holding unrelated work.
  const root1 = path.join(scratch, 'case1', 'release-books');
  const victim1 = path.join(scratch, 'case1', 'victim-unrelated-work');
  fs.mkdirSync(root1, { recursive: true }); fs.mkdirSync(victim1, { recursive: true });
  fs.writeFileSync(path.join(victim1, 'keep-me.txt'), 'unrelated work\n');
  fs.symlinkSync(victim1, path.join(root1, 'linguistics'));
  const out1 = path.join(root1, 'linguistics');
  const before1 = list(victim1);
  let error1: string | undefined;
  try { await viteBuild(app, out1); } catch (e) { error1 = String(e).slice(0, 300); }
  results.push({ case: 'edition folder is a symlink (emptyOutDir follows it)', lexicalGuardPasses: lexicalGuard(root1, out1), physicalGuardPasses: physicalGuard(path.join(scratch, 'case1'), out1),
    victimBefore: before1, victimAfter: list(victim1), keepMeSurvived: fs.existsSync(path.join(victim1, 'keep-me.txt')), error: error1 });

  // 2. The release root (build/release-books) is a symlink: every edition and the manifest land in the target.
  const real2 = path.join(scratch, 'case2', 'elsewhere');
  const build2 = path.join(scratch, 'case2', 'build');
  fs.mkdirSync(real2, { recursive: true }); fs.mkdirSync(build2, { recursive: true });
  fs.mkdirSync(path.join(real2, 'linguistics'), { recursive: true });
  fs.writeFileSync(path.join(real2, 'linguistics', 'keep-me.txt'), 'unrelated work\n');
  fs.symlinkSync(real2, path.join(build2, 'release-books'));
  const root2 = path.join(build2, 'release-books');
  const out2 = path.join(root2, 'linguistics');
  let error2: string | undefined;
  try { await viteBuild(app, out2); } catch (e) { error2 = String(e).slice(0, 300); }
  results.push({ case: 'release root is a symlink', lexicalGuardPasses: lexicalGuard(root2, out2), physicalGuardPasses: physicalGuard(path.join(scratch, 'case2'), out2),
    targetAfter: list(real2), keepMeSurvived: fs.existsSync(path.join(real2, 'linguistics', 'keep-me.txt')), error: error2 });
}

const intro: PublicationSection = { id: 'intro', title: 'Introduction', category: 'Guide', content: '# Introduction\n\nOrdinary text.' };
function bookWith(base: string, sections: PublicationSection[], extra: Partial<PublicationBook> = {}): PublicationBook {
  const real = books.find(b => b.id === base)!;
  return { ...real, ...extra, sections };
}

async function pluginCase(app: string, name: string, book: PublicationBook, inspect?: (outDir: string) => Record<string, unknown>): Promise<void> {
  const root = path.join(scratch, 'plugin', name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40), 'deep', 'release-books');
  const outDir = path.join(root, book.id);
  fs.mkdirSync(root, { recursive: true });
  // A previous good edition and a manifest from an earlier run, to see what a failed build leaves behind.
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), 'previous good edition\n');
  fs.writeFileSync(path.join(root, `${book.id}.manifest.json`), '{"previous":"manifest"}\n');
  const caseRoot = path.dirname(path.dirname(root));
  let error: string | undefined;
  try { await viteBuild(app, outDir, [releasePlugin(book, SITE, app)]); } catch (e) { error = String((e as Error).message ?? e).split('\n')[0].slice(0, 300); }
  if (error) await pause(1500); // writes still in flight when the build promise rejected
  try {
    const inside = list(outDir).map(p => path.relative(path.relative(scratch, outDir), p));
    const outsideOut = list(caseRoot).filter(p => !p.startsWith(path.relative(scratch, outDir) + path.sep) && !p.endsWith('.manifest.json'));
    let failures: string[] | undefined;
    if (!error) {
      try { failures = verifyEdition({ book, others: books.filter(o => o.id !== book.id), site: SITE, outDir, expected: buildAgentBook(book, { siteUrl: SITE }) }); }
      catch (e) { failures = [`verifyEdition threw: ${String(e).slice(0, 200)}`]; }
    }
    const previous = path.join(outDir, 'index.html');
    results.push({ case: name, error, filesInOutDir: inside.length, filesInOutDirSample: inside.slice(0, 20), filesOutsideOutDir: outsideOut,
      previousEditionRemains: fs.statSync(previous, { throwIfNoEntry: false })?.isFile() === true && fs.readFileSync(previous, 'utf8') === 'previous good edition\n',
      staleManifestRemains: fs.readFileSync(path.join(root, `${book.id}.manifest.json`), 'utf8').includes('previous'), verifyFailures: failures?.slice(0, 8), verifyFailureCount: failures?.length,
      ...(inspect && !error ? inspect(outDir) : {}) });
  } catch (e) { results.push({ case: name, error, inspectionError: String(e).slice(0, 300) }); }
}

const read = (outDir: string, rel: string): string => { try { return fs.readFileSync(path.join(outDir, rel), 'utf8'); } catch { return ''; } };
try {
  if (fs.existsSync(scratch)) throw new Error('scratch exists');
  const app = setup();
  await symlinkCases(app);

  // Hostile section ids: dot segments, empty, slashes, encoded dots, reserved names and a case pair.
  for (const id of ['..', '.', '', 'a/../../escape', '%2e%2e', 'index.html', 'llms.txt', 'agent', 'assets'])
    await pluginCase(app, `section id ${JSON.stringify(id)} (language-muscle)`, bookWith('language-muscle', [intro, { id, title: 'Hostile', category: 'x', content: 'Text.' }]));
  await pluginCase(app, 'section ids differing only in case', bookWith('language-muscle', [intro, { id: 'CaseA', title: 'Upper', category: 'x', content: 'UPPER text.' }, { id: 'casea', title: 'Lower', category: 'x', content: 'lower text.' }]),
    out => ({ upperPage: read(out, 'CaseA/index.html').includes('UPPER text'), lowerPage: read(out, 'casea/index.html').includes('lower text') }));
  // Linguistics alias routes: theme-.. becomes /sections/../ and theme-. becomes /sections/./
  for (const id of ['theme-..', 'theme-.'])
    await pluginCase(app, `linguistics alias from section id ${JSON.stringify(id)}`, bookWith('linguistics', [intro, { id, title: 'Hostile theme', category: 'x', content: 'Theme text.' }]),
      out => ({ rootIndexIsAliasPage: /http-equiv="refresh"/.test(read(out, 'index.html')), rootIndexNoindex: /noindex/.test(read(out, 'index.html')), sectionsIndex: fs.existsSync(path.join(out, 'sections', 'index.html')) }));

  // String.replace replacement patterns in content, title and description.
  const dollarText = 'Price: $& and $\' and $` and $$ end.';
  await pluginCase(app, 'dollar replacement patterns in content and title', bookWith('language-muscle', [intro, { id: 'money', title: 'Costs $\' and $&', category: 'x', content: dollarText }]),
    out => {
      const page = read(out, 'money/index.html');
      return { literalContentKept: page.includes('Price: $&amp; and $\' and $` and $$ end.') || page.includes('Price: $& and $\' and $` and $$ end.'),
        pageHasMarker: page.includes('<!--ORF_BODY-->'), pageHtmlTagCount: (page.match(/<html/g) ?? []).length, pageHeadCount: (page.match(/<head>/g) ?? []).length,
        pageTitleTag: page.match(/<title>[\s\S]*?<\/title>/)?.[0]?.slice(0, 200), contentExcerpt: page.slice(page.indexOf('Price'), page.indexOf('Price') + 200) };
    });

  // Hostile markup in titles, description, language and content (both formats).
  const xss = '<script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">j</a><iframe src="https://evil.test/"></iframe><svg onload=alert(4)></svg><a href=" JaVaScRiPt:alert(7)">k</a>';
  await pluginCase(app, 'hostile markup in metadata and content', bookWith('language-muscle', [
    { ...intro, title: '</title><script>alert(10)</script>"\'' },
    { id: 'html-part', title: 'H"><script>alert(11)</script>', category: 'x', content: xss, format: 'html' },
    { id: 'md-part', title: 'M', category: 'x', content: `[x](javascript:alert(5))\n\n${xss}\n\n<style>body{display:none}</style>` },
  ], { description: '"><script>alert(6)</script> desc', language: 'en"><script>alert(8)</script>', title: 'T</title><script>alert(9)</script>' }), out => {
    const files = list(out).filter(f => f.endsWith('.html'));
    const bad: string[] = [];
    for (const f of files) {
      const text = fs.readFileSync(path.join(scratch, f), 'utf8');
      for (const m of text.matchAll(/<script\b[^>]*>/gi)) if (!/^<script type="module" crossorigin src="\/assets\//.test(m[0]) && m[0] !== '<script type="application/ld+json">') bad.push(`${path.basename(path.dirname(f))}: ${m[0]}`);
      for (const m of text.matchAll(/<[a-z][^>]*\son[a-z]+\s*=/gi)) bad.push(`${path.basename(path.dirname(f))}: ${m[0].slice(0, 80)}`);
      for (const m of text.matchAll(/(?:href|src)\s*=\s*["']?\s*javascript:/gi)) bad.push(`${path.basename(path.dirname(f))}: ${m[0]}`);
      for (const m of text.matchAll(/<(iframe|style)\b/gi)) bad.push(`${path.basename(path.dirname(f))}: <${m[1]}`);
      const ld = text.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      if (ld && /<\/script/i.test(ld[1])) bad.push('JSON-LD breaks out');
    }
    return { htmlFiles: files.length, unsafeFindings: bad };
  });
} catch (e) {
  results.push({ case: 'harness error', error: String(e).slice(0, 500) });
} finally {
  // Scratch only: a fresh folder under this repository's build/, created by this run.
  if (scratch.startsWith(path.join(repo, 'build') + path.sep) && path.basename(scratch).startsWith('review-reader-book-release-scratch-')) {
    await pause(2000);
    fs.rmSync(scratch, { recursive: true, force: true });
    await pause(3000);
    if (fs.existsSync(scratch)) { results.push({ case: 'late writes after removal', files: list(scratch) }); fs.rmSync(scratch, { recursive: true, force: true }); }
  }
}

// The public address validator the build relies on for its canonical site.
const siteInputs = ['https://linguistics.dominiklukes.net/', 'https://x.test/"><script>', 'javascript:alert(1)', 'https://x.test/a b/', 'https://127.0.0.1/', 'https://x.test/?q=1', 'https://user@x.test/', 'https://x.test/../', 'http://localhost/', 'https://x.test/%2e%2e/'];
const siteResults = Object.fromEntries(siteInputs.map(input => [input, canonicalSiteUrl(input) ?? null]));
fs.writeFileSync(path.join(here, 'hostile-builds.json'), `${JSON.stringify({ generated: new Date().toISOString(), scratch, scratchRemoved: !fs.existsSync(scratch), results, canonicalSiteUrl: siteResults }, null, 2)}\n`);
console.log(JSON.stringify({ scratchRemoved: !fs.existsSync(scratch), cases: results.length }));
