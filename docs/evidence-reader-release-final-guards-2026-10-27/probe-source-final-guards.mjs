/** Independent review probe of the source exporter guards (2026-10-27). Run from the repository root:
 *   node docs/evidence-reader-release-final-guards-2026-10-27/probe-source-final-guards.mjs
 * Loads COPIES of the exporter's own functions (sliced by marker from the hashed file, with every helper and fs import it uses,
 * including realpathSync and isAbsolute) into a module in owned scratch under build/, with `root` replaced by a fake repository.
 * Exit 0 = every required-safety assertion held. "observations" are recorded, not asserted. Scratch is removed in finally. */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, linkSync, readdirSync, existsSync, lstatSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const repo = process.cwd();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const exporterPath = resolve(repo, 'scripts/prepare-reader-source-release.mjs');
const exporter = readFileSync(exporterPath, 'utf8');
const EXPECTED = 'fa80b10f827935e86ab9d473de7d00f8757f0f3f39498e7aa1fece0f85f70021';
const results = { exporterSha256: sha(exporter), node: process.version, required: [], observations: [] };
if (results.exporterSha256 !== EXPECTED) throw Error(`exporter changed: ${results.exporterSha256}`);
const need = (name, ok, detail = {}) => { results.required.push({ name, ok: !!ok, ...detail }); };
const slice = (from, to) => { const a = exporter.indexOf(from), b = exporter.indexOf(to, a + 1); if (a < 0 || b < 0) throw Error(`marker missing: ${from}`); return exporter.slice(a, b); };

const ROOT_LINE = "const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');";
if (!exporter.includes(ROOT_LINE)) throw Error('root line changed');
const head = slice('/** Local-only', '\nguardReleaseOutputs();\nconst previousEvidence').replace(ROOT_LINE, 'const root = process.env.PROBE_ROOT;');
const moduleText = [
  head,
  slice('function input(path) {', 'function selfTest() {'),
  slice('function materialise(destination) {', 'let scratch;'),
  'function finalWrite(bytes, manifest) {\n' + slice('  // Replace only the named generated source candidate', '  const written = new Map();') + '}\n',
  'export { assertProjectPath, guardReleaseOutputs, input, walk, audit, manuscriptAnchors, inspectArchive, materialise, finalWrite, files, build, candidate, REVIEWED_LITERALS };\n',
].join('\n');

const scratch = mkdtempSync(resolve(repo, 'build', 'review-final-guards-'));
const load = async (root, tag) => {
  process.env.PROBE_ROOT = root;
  const file = resolve(scratch, `module-${tag}.mjs`); writeFileSync(file, moduleText);
  return import(pathToFileURL(file).href);
};
const throws = (fn, re) => { try { fn(); return { threw: false }; } catch (e) { return { threw: re ? re.test(e.message) : true, message: e.message }; } };
let exitCode = 1;
try {
  // ---------- Privacy exceptions ----------
  const real = await load(repo, 'real');
  const { audit, REVIEWED_LITERALS, manuscriptAnchors, inspectArchive } = real;
  const P = 'packages/reader-core/src';
  const issues = (path, text) => audit(new Map([[path, Buffer.from(text)]]), []).issues.length;
  for (const ex of REVIEWED_LITERALS) {
    const ctx = ex.context ?? '';
    for (const literal of ex.literals) {
      const base = ctx.includes(literal) ? ctx : `a('${literal}');`;
      need(`approved single literal passes: ${literal}`, issues(ex.path, base) === 0);
      for (const tail of ['private-manuscript.md', 'x', '../Users/dominik/notes.md', '%2Fprivate']) {
        const longer = `${base}\nconst hidden = '${literal}${tail}';`;
        need(`longer address rejected: ${literal}${tail}`, issues(ex.path, longer) > 0);
      }
      need(`extra occurrence rejected: ${literal}`, issues(ex.path, `${base}\nb('${literal}');`) > 0);
      need(`unapproved literal beside approved rejected: ${literal}`, issues(ex.path, `${base}\nc('file:///private/book.md');`) > 0);
      need(`literal in another file rejected: ${literal}`, issues(`${P}/check.ts`, base) > 0);
      need(`escaped longer form rejected: ${literal}`, issues(ex.path, `${base}\nd(${JSON.stringify(literal + 'private.md').replace(/\//g, '\\u002f')});`) > 0);
    }
  }
  const pc = `${P}/publication-content/publication-content.test.mjs`;
  need('publication-content passwd without reviewed context rejected', issues(pc, "x('file:///etc/passwd')") > 0);
  // Residual: URL-token delimiters that may still sit inside one JS string literal.
  for (const tail of ['>private.md', '<private>', ' private notes.md', '`private']) {
    const agent = `${P}/agent-export/agent-export.test.mjs`;
    results.observations.push({ name: 'delimiter-separated tail after an approved literal', text: `'file:///etc/${tail}'`, issues: issues(agent, `const t = 'file:///etc/${tail}';`) });
  }
  // Bound on that residual: masking removes only the exact token, so a private signal in the tail is still caught.
  for (const tail of [' /Users/dominik/notes.md', ' /home/x/notes.md', '>file:///private/x', ' _COORDINATION/x', '<C:\\Users\\x>']) {
    need(`private signal after delimiter still caught: ${tail}`, issues(`${P}/agent-export/agent-export.test.mjs`, `const t = 'file:///Users/reader/dist/agent/${tail}';`) > 0);
  }

  // ---------- Actual candidate, archive, manifest ----------
  const cand = resolve(repo, 'build/public-reader-source');
  const files = new Map();
  (function walkAll(dir, at = '') { for (const e of readdirSync(dir, { withFileTypes: true })) { const p = at ? `${at}/${e.name}` : e.name; if (e.isSymbolicLink()) throw Error(`link ${p}`); if (e.isDirectory()) walkAll(join(dir, e.name), p); else files.set(p, readFileSync(join(dir, e.name))); } })(cand);
  const books = JSON.parse(readFileSync(resolve(repo, 'apps/reader-demo/src/books/original-publications.json'), 'utf8'));
  const anchors = manuscriptAnchors(books);
  const candAudit = audit(files, anchors);
  need('actual candidate: final audit has no issues', candAudit.issues.length === 0, { anchors: anchors.length, reviewed: candAudit.reviewedFalsePositives.map(r => r.literal) });
  let snap = JSON.parse(readFileSync(resolve(repo, 'docs/evidence-review-reader-v1-public-release-2026-10-27/snapshot-reader-source-end.json'), 'utf8')).candidate;
  if (Array.isArray(snap)) snap = Object.fromEntries(snap.map(entry => [entry.path, entry.digest]));
  const diffs = [...new Set([...Object.keys(snap), ...files.keys()])].filter(p => snap[p] !== (files.has(p) ? sha(files.get(p)) : undefined));
  need('actual candidate: 125 files byte-identical to prior review snapshot', files.size === 125 && Object.keys(snap).length === 125 && diffs.length === 0, { diffs });
  const tgz = readFileSync(resolve(repo, 'build/reader-source-release.tar.gz'));
  const manifest = JSON.parse(readFileSync(resolve(repo, 'build/reader-source-release.manifest.json'), 'utf8'));
  const sumLine = readFileSync(resolve(repo, 'build/reader-source-release.sha256'), 'utf8');
  const members = inspectArchive(tgz, files);
  need('archive: sha256 502b7a14…, matches manifest and .sha256 file', sha(tgz) === '502b7a14a3eb030a34a1038d249b2cd0f50a910a89883f365b2e6b9c29988e0b' && manifest.sha256 === sha(tgz) && sumLine === `${sha(tgz)}  reader-source-release.tar.gz\n` && manifest.bytes === tgz.length);
  need('archive: 125 regular members exactly equal candidate bytes', members.length === 125 && manifest.fileCount === 125);
  need('manifest: every listed file hash equals candidate', manifest.files.length === 125 && manifest.files.every(f => files.has(f.path) && sha(files.get(f.path)) === f.sha256 && files.get(f.path).length === f.bytes));
  const tar = gunzipSync(tgz);
  need('archive: no forbidden member names', !/node_modules|\.git\/|original-publications|apps\/reader-demo|\.env|\.map\b/.test(members.join('\n')));
  results.observations.push({ name: 'uncompressed tar sha256', sha256: sha(tar) });

  // ---------- Real tree passes the new guards (read-only) ----------
  need('real repository: guardReleaseOutputs accepts current build outputs', !throws(() => real.guardReleaseOutputs()).threw);
  const walked = throws(() => real.walk(`${P}`));
  need('real repository: source walk passes path guards', !walked.threw, walked);

  // ---------- Fake repository: aliases ----------
  const fakeRoot = resolve(scratch, 'repository'), outside = resolve(scratch, 'outside');
  mkdirSync(fakeRoot); mkdirSync(outside);
  const canary = resolve(outside, 'canary.txt'); writeFileSync(canary, 'outside canary');
  const outsideDir = resolve(outside, 'dir'); mkdirSync(outsideDir); writeFileSync(resolve(outsideDir, 'keep.txt'), 'keep');
  const fake = await load(fakeRoot, 'fake');
  const fb = resolve(fakeRoot, 'build');
  const NAMES = ['reader-source-release.tar.gz', 'reader-source-release.manifest.json', 'reader-source-release.sha256', 'reader-source-release.evidence.json'];
  // build is a link
  symlinkSync(outsideDir, fb, 'dir');
  need('build directory link refused by guardReleaseOutputs', throws(() => fake.guardReleaseOutputs(), /Symbolic link/).threw);
  need('build directory link refused by finalWrite before deletion', throws(() => fake.finalWrite(Buffer.from('x'), { sha256: 'x' }), /Symbolic link/).threw);
  rmSync(fb);
  // build is a regular file
  writeFileSync(fb, 'file'); need('build as regular file refused', throws(() => fake.guardReleaseOutputs()).threw); rmSync(fb);
  mkdirSync(fb);
  // candidate link
  symlinkSync(outsideDir, resolve(fb, 'public-reader-source'), 'dir');
  need('candidate link refused', throws(() => fake.finalWrite(Buffer.from('x'), { sha256: 'x' }), /Symbolic link/).threw);
  rmSync(resolve(fb, 'public-reader-source'));
  // each named leaf: link to an existing outside file, and a dangling link
  for (const name of NAMES) {
    for (const [kind, target] of [['existing', canary], ['dangling', resolve(outside, 'missing.txt')]]) {
      symlinkSync(target, resolve(fb, name));
      need(`${name} ${kind} link refused before any write`, throws(() => fake.finalWrite(Buffer.from('x'), { sha256: 'x' }), /Symbolic link/).threw && !existsSync(resolve(fb, 'public-reader-source')));
      rmSync(resolve(fb, name));
    }
  }
  // scratch replaced by a link: cleanup guard refuses
  const fakeScratch = resolve(fb, 'reader-source-release.scratch-probe'); symlinkSync(outsideDir, fakeScratch, 'dir');
  need('scratch link refused before cleanup', throws(() => fake.assertProjectPath(fakeScratch, 'directory'), /Symbolic link/).threw);
  rmSync(fakeScratch);
  // path outside root and ../ escape
  need('path outside root refused', throws(() => fake.assertProjectPath(outside, 'directory'), /outside/).threw);
  need('../ escape refused', throws(() => fake.assertProjectPath(resolve(fakeRoot, '../outside/canary.txt'), 'file'), /outside/).threw);
  // source ancestors and leaves
  const src = resolve(fakeRoot, P); mkdirSync(resolve(fakeRoot, 'packages/reader-core'), { recursive: true });
  symlinkSync(outsideDir, src, 'dir');
  need('linked source root refused by walk', throws(() => fake.walk(P), /Symbolic link/).threw);
  need('linked source root refused by input', throws(() => fake.input(`${P}/keep.txt`), /Symbolic link/).threw);
  rmSync(src); mkdirSync(src);
  symlinkSync(canary, resolve(src, 'leaf.ts'));
  need('linked source leaf refused by input', throws(() => fake.input(`${P}/leaf.ts`), /Symbolic link/).threw);
  need('linked source leaf refused by walk', throws(() => fake.walk(P), /link/).threw);
  rmSync(resolve(src, 'leaf.ts'));
  rmSync(resolve(fakeRoot, 'packages'), { recursive: true });
  symlinkSync(outside, resolve(fakeRoot, 'packages'), 'dir');
  need('linked higher source ancestor refused', throws(() => fake.input(`${P}/x.ts`), /Symbolic link/).threw);
  rmSync(resolve(fakeRoot, 'packages'));
  // clean path: final write succeeds inside fake build
  fake.files.set('a/b.txt', Buffer.from('member'));
  const before = throws(() => fake.finalWrite(Buffer.from('archive'), { sha256: 'abc', files: [] }));
  need('clean fake build: final write completes inside the fake repository', !before.threw && readFileSync(resolve(fb, 'public-reader-source/a/b.txt'), 'utf8') === 'member', before);
  // a nested link appearing inside an existing candidate is not followed by deletion
  symlinkSync(outsideDir, resolve(fb, 'public-reader-source/nested-link'), 'dir');
  throws(() => fake.finalWrite(Buffer.from('archive'), { sha256: 'abc', files: [] }));
  need('nested candidate link removed as a link only; outside folder kept', existsSync(resolve(outsideDir, 'keep.txt')));
  need('outside canary and folder unchanged after all alias cases', readFileSync(canary, 'utf8') === 'outside canary' && JSON.stringify(readdirSync(outsideDir)) === '["keep.txt"]');

  // Residual observation: a hard-linked output leaf is a regular file and is written through.
  const hl = resolve(fb, 'reader-source-release.sha256'); rmSync(hl); const hardCanary = resolve(outside, 'hard.txt'); writeFileSync(hardCanary, 'hard canary'); linkSync(hardCanary, hl);
  const hard = throws(() => fake.finalWrite(Buffer.from('archive'), { sha256: 'abc', files: [] }));
  results.observations.push({ name: 'hard-linked output leaf (nlink 2) accepted and written through', threw: hard.threw, outsideContentNow: readFileSync(hardCanary, 'utf8').trim(), nlink: lstatSync(hl).nlink });
  exitCode = results.required.every(r => r.ok) ? 0 : 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
  results.scratchRemoved = !existsSync(scratch);
  results.failed = results.required.filter(r => !r.ok).map(r => r.name);
  results.passedCount = results.required.filter(r => r.ok).length;
  writeFileSync(resolve(repo, 'docs/evidence-reader-release-final-guards-2026-10-27/result-source-final-guards.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(`required ${results.passedCount}/${results.required.length} held; failed: ${JSON.stringify(results.failed)}; scratch removed: ${results.scratchRemoved}`);
  for (const o of results.observations) console.log('observation', JSON.stringify(o));
  process.exitCode = exitCode;
}
