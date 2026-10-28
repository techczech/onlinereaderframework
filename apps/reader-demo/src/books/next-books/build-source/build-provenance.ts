/** Machine-readable provenance: every original file the conversion read (sha256), source commits, licence notices found, outputs (sha256).
 *  Usage: tsx build-provenance.ts <scratch-dir> */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative, basename } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { sha256 } from './lib.js';

const here = dirname(fileURLToPath(import.meta.url));
const books = resolve(here, '..');
const demo = resolve(books, '../../..');
const scratch = resolve(process.argv[2]);
const A = '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/academic-reading-framework';
const R_WT = '/Users/dominiklukes/worktrees/guides/readability-foundations';
const R = '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/readability-foundations';
const FOLIO = '/Users/dominiklukes/gitrepos/02_writing-creation/writing/books/web-published';
const git = (repo: string, ...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
const listFiles = (root: string, dir: string, ext: RegExp) => readdirSync(resolve(root, dir)).filter(f => ext.test(f)).map(f => `${dir}/${f}`);

const academicFiles = ['constants.tsx', 'types.ts', 'components/CognitionExplorer.tsx', 'components/DetailSection.tsx', 'components/Hero.tsx', 'App.tsx', 'metadata.json', 'README.md', 'tailwind.config.cjs'];
const readabilityFiles = ['types.ts', 'components/Home.tsx', 'components/Content.tsx', 'components/Navigation.tsx', 'components/Section.tsx', 'components/blocks/BlockRenderer.tsx', 'components/blocks/RichText.tsx',
  ...listFiles(R_WT, 'data/content', /\.tsx$/), ...listFiles(R_WT, 'components/interactive', /\.tsx$/), ...listFiles(R_WT, 'components/tools', /\.tsx$/), ...listFiles(R_WT, 'components/sections', /\.tsx$/), ...listFiles(R_WT, 'components/layouts', /\.tsx$/), 'context/NavigationContext.tsx', 'README.md', 'metadata.json'];
const hashes = (root: string, files: string[]) => files.map(f => ({ file: f, sha256: sha256(resolve(root, f)) }));

// The Readability sources were read from the guide worktree (it has node_modules). Prove the canonical checkout holds the same content files.
const identical: string[] = [], different: string[] = [];
for (const f of readabilityFiles) { if (!existsSync(resolve(R, f))) { different.push(`${f} (absent in canonical checkout)`); continue; } (sha256(resolve(R, f)) === sha256(resolve(R_WT, f)) ? identical : different).push(f); }

const grepNotices = (root: string, files: string[]) => files.flatMap(f => readFileSync(resolve(root, f), 'utf8').split('\n').map((l, i) => ({ f, i: i + 1, l })).filter(x => /CC BY|licen[cs]e|©|copyright/i.test(x.l) && !/package-lock/.test(x.f)).map(x => ({ file: x.f, line: x.i, text: x.l.trim().slice(0, 200) })));
const readabilityNotices = grepNotices(R_WT, ['README.md', 'components/Home.tsx', 'components/Navigation.tsx', 'readable/config.ts']);
const academicNotices = grepNotices(A, ['README.md', 'App.tsx', 'constants.tsx', 'components/Hero.tsx', 'components/Navigation.tsx', 'metadata.json']);
const folioLicence = (slug: string) => readFileSync(resolve(FOLIO, slug, 'book.toml'), 'utf8').split('\n').filter(l => /^licence/.test(l));
const outputs = (dir: string) => { const out: any[] = []; const walk = (d: string) => { for (const f of readdirSync(d, { withFileTypes: true })) { const p = resolve(d, f.name); if (f.isDirectory()) walk(p); else out.push({ file: relative(demo, p), sha256: sha256(p), bytes: readFileSync(p).length }); } }; walk(dir); return out; };

const browserCache = resolve(homedir(), 'Library/Caches/ms-playwright');
const bundledShells = readdirSync(browserCache).filter(name => name.startsWith('chromium_headless_shell-')).sort().reverse().map(name => resolve(browserCache, name, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'));
const CHROME = process.env.CHROME || bundledShells.find(file => existsSync(file));
if (!CHROME || basename(CHROME) !== 'chrome-headless-shell' || !existsSync(CHROME)) throw new Error('A bundled chrome-headless-shell executable is required');

const record = {
  description: 'Provenance of the Academic Reading Framework and Foundations of Readability conversions. All sources are read-only; no source repository was modified.',
  generated: new Date().toISOString(),
  tools: { node: process.version, pandoc: execFileSync('pandoc', ['--version'], { encoding: 'utf8' }).split('\n')[0], tailwindcss: JSON.parse(readFileSync(resolve(demo, 'node_modules/tailwindcss/package.json'), 'utf8')).version, esbuild: JSON.parse(readFileSync(resolve(demo, 'node_modules/esbuild/package.json'), 'utf8')).version, chrome: execFileSync(CHROME, ['--version'], { encoding: 'utf8' }).trim() },
  books: {
    'academic-reading': {
      repository: A, commit: git(A, 'rev-parse', 'HEAD'), branch: git(A, 'rev-parse', '--abbrev-ref', 'HEAD'),
      otherBranches: { 'guides/readable-subdomain': git(A, 'rev-parse', 'guides/readable-subdomain'), main: git(A, 'rev-parse', 'main') },
      contentFilesUnchangedBetweenBranches: git(A, 'diff', '--stat', 'main', 'HEAD', '--', 'constants.tsx', 'components/CognitionExplorer.tsx', 'components/DetailSection.tsx', 'types.ts') === '' ? true : 'see git diff main..HEAD',
      files: hashes(A, academicFiles),
      licenceNoticesInOriginal: academicNotices,
      licenceFinding: 'No licence or copyright statement exists in the original source, its README, its metadata or its git history. The draft Folio book.toml states CC BY-SA 4.0 (set from the earlier brief, not from the original). No licence is printed in the converted book.',
      folioDraftLicence: folioLicence('academic-reading-framework'),
      authorLine: 'Developed by Dominik Lukeš for the Reading and Writing Innovation Lab (App.tsx and the overview section)'
    },
    'readability-foundations': {
      repository: R, readFrom: R_WT, commitReadFrom: git(R_WT, 'rev-parse', 'HEAD'), branchReadFrom: git(R_WT, 'rev-parse', '--abbrev-ref', 'HEAD'), canonicalCheckoutCommit: git(R, 'rev-parse', 'HEAD'),
      contentFilesIdenticalToCanonicalCheckout: { identical: identical.length, different },
      files: hashes(R_WT, readabilityFiles),
      licenceNoticesInOriginal: readabilityNotices,
      licenceFinding: 'Every notice in the original (README twice, Home page twice, footer, readable-page config), in its git history, and in the main-site catalogue says "CC BY". "BY-SA" and "ShareAlike" occur nowhere in the original source or its history. CC BY-SA 4.0 appears only in the draft Folio book.toml. The converted book preserves "CC BY" and links the version-neutral CC BY landing address; no licence version is inferred.',
      folioDraftLicence: folioLicence('readability-foundations'),
      imagesNotBundled: ['https://images.unsplash.com/photo-1578916171728-46686eac8d58 (used at 400 and 800 px in the slide demonstration; replaced by an inline placeholder picture)']
    }
  },
  folioFiles: ['academic-reading-framework', 'readability-foundations'].flatMap(slug => readdirSync(resolve(FOLIO, slug)).filter(f => /\.(md|json|toml)$/.test(f)).map(f => ({ file: `${slug}/${f}`, sha256: sha256(resolve(FOLIO, slug, f)) }))),
  coordinationRecordsRead: [
    '/Users/dominiklukes/gitrepos/_COORDINATION/webapps-websites/research/2026-10-24-confirmed-edutools-books-and-semantic-machines-destinations.md',
    '/Users/dominiklukes/gitrepos/_COORDINATION/webapps-websites/research/2026-10-24-execution-order-for-the-agreed-app-migrations.md',
    '/Users/dominiklukes/gitrepos/_COORDINATION/webapps-websites/_TASK-LOG/2026-10-22-guides-under-one-address.md',
    '/Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet/src/content/guides.json',
    '/Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet/src/content/showcase.json'
  ],
  academicRoute: {
    decision: 'Confirmed by Dominik on 24 October 2026: Academic Reading becomes one of his books within dominiklukes.net, through the existing book system; supersedes academicreading.dominiklukes.net; redirect academicreading.edutools.fyi after publication; "do not invent the canonical book path before inspecting the book system".',
    foundInDlnet: 'No book route exists yet. guides.json lists "academic-reading" at https://academicreading.edutools.fyi (placement writing); showcase.json links it to /resources/academic-reading and Readability to /resources/readability-foundations (internal resource pages). The converted book id is "academic-reading" and sourceUrl keeps the current catalogue address until the route is chosen.',
    competingPublication: 'None created. No website file was edited.'
  },
  derivations: {
    'cognition-explorer': { from: ['components/CognitionExplorer.tsx'], method: 'NODES and EDGES arrays evaluated from the original source text; getEdgePath, label positions, colours and selection logic ported line for line; verified against the original server-rendered SVG (15 paths, 15 labels, 9 nodes).' },
    'reading-articulation-layers': { from: ['constants.tsx (COGNITION_POINT)'], method: 'The original JSX element is rendered as it stands and styled with the original Tailwind classes.' },
    'reading-simplified-summary': { from: ['constants.tsx (COGNITION_POINT)'], method: 'As above.' },
    'cramped-text-reveal': { from: ['components/interactive/DyslexiaSimulator.tsx'], method: 'Original component rendered in both states; the two class sets are read from those renders.' },
    'font-spacing-adjuster': { from: ['components/interactive/FontSpacingAdjuster.tsx'], method: 'Original component rendered; stepping rules (14 to 40 px in steps of 2, reset to 20) as in the source.' },
    'readability-checker': { from: ['components/tools/ReadabilityChecker.tsx'], method: 'The analysis function is the original useMemo body, type-stripped by esbuild and inlined, not retyped; markup from the original render.' },
    'slides-one-bullet / slides-extraneous-text / slides-zooming-images': { from: ['components/interactive/SlideSimulation.tsx', 'components/blocks/BlockRenderer.tsx', 'data/content/slideFormattingExamplesData.tsx'], method: 'The original BlockRenderer renders the original comparison blocks; only the remote photograph is replaced.' }
  },
  outputs: [...outputs(resolve(demo, 'interactives')), ...['academic-reading-framework.book.json', 'readability-foundations.book.json', 'embed-manifest.json'].map(f => ({ file: relative(demo, resolve(books, f)), sha256: sha256(resolve(books, f)), bytes: readFileSync(resolve(books, f)).length }))]
};
writeFileSync(resolve(books, 'next-books-provenance.json'), JSON.stringify(record, null, 2) + '\n');
console.log('provenance written;', record.outputs.length, 'outputs;', identical.length, 'readability files identical to canonical checkout;', different.length, 'different');
