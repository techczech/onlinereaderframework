/** Local-only source export. Never publishes, changes Git, or reads environment files. */
import { readFileSync, writeFileSync, readdirSync, lstatSync, mkdirSync, mkdtempSync, rmSync, cpSync, symlinkSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const build = resolve(root, 'build');
const candidate = resolve(build, 'public-reader-source');
const prefix = 'packages/reader-core';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const sourceInputs = new Map();
const files = new Map();
const transformations = [];
const evidence = { status: 'preliminary-local-review-draft', publicationAuthorised: false, node: process.version, checks: [], limits: [
  'Concurrent working-tree snapshot; parent must rerun after its final checkpoint and review the exact file list.',
  'No software licence or public scope has been selected. Technical checks do not authorise publication.',
  'Private-path and manuscript-span matching are heuristics; no browser, visual, EPUBCheck or rights acceptance is claimed here.',
] };
const previousEvidence = resolve(build, 'reader-source-release.evidence.json');
if (existsSync(previousEvidence)) {
  const previous = JSON.parse(readFileSync(previousEvidence, 'utf8'));
  evidence.priorInstallationAttempts = [...(previous.priorInstallationAttempts ?? []),
    ...previous.checks.filter(check => check.label === 'actual-isolated-npm-ci' && check.exitCode !== 0)
      .map(check => ({ mode: previous.installMode, exitCode: check.exitCode, stderr: check.stderr, scratchRemoved: previous.scratchRemoved }))];
}
const args = new Set(process.argv.slice(2));
for (const arg of args) if (!['--self-test', '--online', '--help'].includes(arg)) throw Error(`Unknown option: ${arg}`);
if (args.has('--help')) {
  console.log('node scripts/prepare-reader-source-release.mjs [--online | --self-test]\nDefault: linked-core smoke, then actual offline npm ci, build, Node tests and native package import in isolated scratch.\n--online permits normal registry fetch for the isolated npm ci (lifecycle scripts stay disabled).');
  process.exit(0);
}
function input(path) {
  const full = resolve(root, path);
  assert.ok(lstatSync(full).isFile() && !lstatSync(full).isSymbolicLink(), `Not a regular source file: ${path}`);
  const bytes = readFileSync(full);
  sourceInputs.set(path, hash(bytes));
  return bytes;
}
function add(path, bytes) {
  assert.ok(!files.has(path), `Duplicate export path: ${path}`);
  files.set(path, Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));
}
function copy(path) { add(path, input(path)); }
function walk(directory) {
  const result = [];
  for (const entry of readdirSync(resolve(root, directory), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const path = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) throw Error(`Source tree contains a link: ${path}`);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue;
      result.push(...walk(path));
    } else if (entry.isFile() && /\.(?:ts|tsx|css)$/.test(entry.name)) result.push(path);
  }
  return result;
}
function omitTest(path, title) {
  const source = input(path).toString('utf8');
  const start = source.indexOf(`test('${title}',`);
  assert.ok(start >= 0, `Expected private fixture test not found: ${path}`);
  const next = source.indexOf('\ntest(', start + 1);
  assert.ok(next >= 0, `Expected following test not found: ${path}`);
  const output = source.slice(0, start) + source.slice(next + 1);
  transformations.push({ path, operation: 'omit-one-real-book-test', test: title, sourceSha256: hash(source), exportedSha256: hash(output) });
  add(path, output);
}
function manuscriptAnchors(books) {
  const found = new Map();
  function visit(section, book) {
    const text = (section.content ?? '').replace(/\r/g, '');
    for (const run of text.split(/\n|<[^>]*>/).filter(s => s.trim().length >= 120)) {
      const value = run.trim().slice(0, 120);
      found.set(value, { book, value, sha256: hash(value) });
    }
    // Whole 160-character windows also catch literal markup copied from long fixtures.
    for (let at = 0; at + 160 <= text.length; at += 80) {
      const value = text.slice(at, at + 160);
      found.set(value, { book, value, sha256: hash(value) });
    }
    for (const child of section.children ?? []) visit(child, book);
  }
  for (const book of books) for (const section of book.sections) visit(section, book.id);
  assert.ok(found.size, 'No real-manuscript exclusion anchors available');
  return [...found.values()];
}
function decoded(text) {
  return text.replace(/\\\\/g, '\\').replace(/\\u([a-f0-9]{4})/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/\\x([a-f0-9]{2})/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\//g, '/');
}
const fixedPaths = new Set([
  '.gitignore', '.node-version', 'README.md', 'LICENSING.md', 'package.json', 'provenance-reader-source.json',
  ...['build-reader-core.mjs', 'build-reader-styles.mjs', 'test-reader-native-import.mjs'].map(name => `scripts/${name}`),
  ...['package.json', 'package-lock.json', 'tsconfig.json', 'styles/reader.css', 'styles/tailwind.config.cjs', 'styles/publication-classes.txt',
    'src/publication-content/test-publication-content.mjs', 'src/publication-content/publication-content.test.mjs', 'src/original/test-original-reader.mjs',
    'notices/LICENSE-inter.txt', 'notices/LICENSE-merriweather.txt', 'notices/LICENSE-material-symbols-outlined.txt'].map(name => `${prefix}/${name}`),
]);
function allowed(path) {
  return fixedPaths.has(path) || /^packages\/reader-core\/src\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:ts|tsx|css)$/.test(path);
}
function audit(entries, anchors) {
  const issues = [], reviewed = [];
  for (const [path, bytes] of entries) {
    if (!allowed(path)) issues.push({ path, code: 'outside-source-allowlist' });
    if (/^(?:\/|\.\.)|(?:^|\/)(?:node_modules|\.git|apps|research|dist)(?:\/|$)|\.map$|(?:^|\/)\.env|original-publications|bookContent|(?:^|\/)(?:\.npmrc|\.netrc|credentials|config\.json)$/i.test(path)) {
      issues.push({ path, code: 'forbidden-export-path' });
    }
    let text = decoded(bytes.toString('utf8'));
    // Only this exact generic security fixture is exempt, never its entire test file.
    const genericFileURL = 'file:///etc/passwd';
    if (path === `${prefix}/src/publication-content/publication-content.test.mjs`) {
      const occurrences = text.split(genericFileURL).length - 1;
      if (occurrences === 1 && text.includes("'<a href=\"file:///etc/passwd\">file</a><img src=\"blob:bad\">")) {
        text = text.replace(genericFileURL, '[reviewed generic unsafe URL fixture]');
        reviewed.push({ path, rule: 'file-url', literal: genericFileURL, count: 1, reason: 'Generic adversarial HTML input; assertions reject unsafe URL schemes.' });
      }
    }
    const privatePattern = /(?:(?:^|[\s"'=(:])\/(?:Users|home)\/[^\s/"']+|[A-Z]:[\\/](?:Users|home)[\\/]|file:\/\/|nexus-onedrive|_COORDINATION|_MACHINECONFIG|_CONTEXT|_DTC|_BACKLOG|_agent-work-space)/i;
    if (privatePattern.test(text)) issues.push({ path, code: 'private-path-or-context' });
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:sk-[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,})|https?:\/\/[^\s/:]+:[^\s/@]+@/i.test(text)) issues.push({ path, code: 'credential-shaped-literal' });
    for (const anchor of anchors) {
      if (text.includes(anchor.value)) {
        issues.push({ path, code: 'real-manuscript-span', book: anchor.book, anchorSha256: anchor.sha256 });
        break;
      }
    }
  }
  return { filesScanned: entries.size, manuscriptAnchors: anchors.length, reviewedFalsePositives: reviewed, issues };
}
function archive(entries) {
  const parts = [];
  for (const [path, bytes] of [...entries].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const full = `public-reader-source/${path}`;
    const header = Buffer.alloc(512);
    let name = full, parent = '';
    if (Buffer.byteLength(full) > 100) {
      const slash = full.lastIndexOf('/');
      name = full.slice(slash + 1); parent = full.slice(0, slash);
    }
    assert.ok(Buffer.byteLength(name) <= 100 && Buffer.byteLength(parent) <= 155, 'Archive path exceeds ustar limits');
    header.write(name, 0, 100);
    const octal = (n, offset, length) => header.write(n.toString(8).padStart(length - 1, '0') + '\0', offset, length);
    octal(0o644, 100, 8); octal(0, 108, 8); octal(0, 116, 8); octal(bytes.length, 124, 12); octal(0, 136, 12);
    header.fill(32, 148, 156); header.write('0', 156); header.write('ustar\0', 257, 6); header.write('00', 263, 2); header.write(parent, 345, 155);
    const checksum = header.reduce((sum, value) => sum + value, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
    parts.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  return gzipSync(Buffer.concat([...parts, Buffer.alloc(1024)]), { level: 9, mtime: 0 });
}
function inspectArchive(bytes, entries) {
  const tar = gunzipSync(bytes); let offset = 0; const paths = [];
  while (tar.subarray(offset, offset + 512).some(Boolean)) {
    const header = tar.subarray(offset, offset + 512);
    const string = (at, length) => header.subarray(at, at + length).toString().replace(/\0.*$/s, '');
    const parent = string(345, 155), name = string(0, 100);
    const full = parent ? parent + '/' + name : name;
    assert.ok(full.startsWith('public-reader-source/'));
    const path = full.slice('public-reader-source/'.length);
    const size = parseInt(string(124, 12), 8);
    assert.equal(header[156], 48, 'Archive must contain only regular files');
    assert.ok(entries.has(path) && !paths.includes(path), 'Unexpected or repeated archive member');
    assert.deepEqual(tar.subarray(offset + 512, offset + 512 + size), entries.get(path));
    paths.push(path); offset += 512 + Math.ceil(size / 512) * 512;
  }
  assert.equal(paths.length, entries.size);
  return paths;
}
function selfTest() {
  for (const value of ['/Users/example/private', 'C:\\Users\\example\\private', String.raw`\u002fUsers\u002fexample`, 'file:///private/book']) {
    assert.ok(audit(new Map([[`${prefix}/src/check.ts`, Buffer.from(JSON.stringify(value))]]), []).issues.length, value);
  }
  const securityPath = `${prefix}/src/publication-content/publication-content.test.mjs`;
  const generic = "'<a href=\"file:///etc/passwd\">file</a><img src=\"blob:bad\">'";
  assert.equal(audit(new Map([[securityPath, Buffer.from(generic)]]), []).issues.length, 0);
  assert.ok(audit(new Map([[securityPath, Buffer.from(generic + ' file:///private/book')]]), []).issues.length);
  assert.ok(audit(new Map([[`${prefix}/src/check.ts`, Buffer.from('A long private manuscript span')]]), [{ value: 'private manuscript span', book: 'test', sha256: 'test' }]).issues.length);
  assert.equal(audit(new Map([[`${prefix}/src/check.ts`, Buffer.from("export * from './components/home/Home.js';")]]), []).issues.length, 0);
  assert.ok(audit(new Map([['node_modules/leak.ts', Buffer.from('')]]), []).issues.length);
  const sample = new Map([['packages/reader-core/src/' + 'long-folder/'.repeat(6) + 'entry.ts', Buffer.from('export {};')]]);
  const bytes = archive(sample); inspectArchive(bytes, sample); assert.deepEqual(bytes, archive(sample));
  console.log('Source export self-tests passed: paths, one exact generic URL exception, manuscript spans, forbidden members and deterministic archive.');
}
selfTest();
if (args.has('--self-test')) process.exit(0);

function run(label, command, argv, cwd) {
  const result = spawnSync(command, argv, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 240000 });
  // Tool output remains local evidence; redact private paths from diagnostics.
  const redact = text => (text ?? '').split(root).join('[owning-repository]').replace(/\/Users\/[^\s'"\n]+/g, '[local-path]');
  const check = { label, command: [command === process.execPath ? 'node' : command, ...argv], cwd: relative(cwd.startsWith(build) ? build : root, cwd) || '.', exitCode: result.status, stdout: redact(result.stdout), stderr: redact(result.stderr), error: result.error?.code };
  evidence.checks.push(check);
  console.log(`${label}: ${result.status === 0 ? 'passed' : 'FAILED'}`);
  if (result.status !== 0) throw Error(`${label} failed; see build/reader-source-release.evidence.json`);
  return result.stdout;
}
function seedOfflineCache(destination, lock) {
  // Copy only this lock's public-registry cache records; npm never writes to the shared cache.
  const located = spawnSync(npm, ['config', 'get', 'cache'], { cwd: root, encoding: 'utf8' });
  assert.equal(located.status, 0, 'Cannot locate npm cache');
  const cache = resolve(located.stdout.trim(), '_cacache');
  const target = resolve(destination, '_cacache');
  const urls = new Set();
  let copied = 0;
  function blob(integrity) {
    for (const token of (integrity ?? '').split(/\s+/)) {
      const match = /^(sha512|sha256|sha1)-([A-Za-z0-9+/=]+)$/.exec(token);
      if (!match) continue;
      const digest = Buffer.from(match[2], 'base64').toString('hex');
      const name = `content-v2/${match[1]}/${digest.slice(0, 2)}/${digest.slice(2, 4)}/${digest.slice(4)}`;
      const source = resolve(cache, name), output = resolve(target, name);
      if (!existsSync(source) || existsSync(output)) continue;
      mkdirSync(dirname(output), { recursive: true });
      cpSync(source, output); copied++;
    }
  }
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path) continue;
    if (entry.resolved?.startsWith('https://registry.npmjs.org/')) urls.add(entry.resolved);
    const name = path.split('node_modules/').at(-1);
    for (const spelling of [name, name.replace('/', '%2f'), name.replace('/', '%2F')]) urls.add('https://registry.npmjs.org/' + spelling);
    blob(entry.integrity);
  }
  function indexes(directory, at = '') {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const source = resolve(directory, entry.name), name = posix.join(at, entry.name);
      if (entry.isDirectory()) indexes(source, name);
      else if (entry.isFile()) {
        const lines = readFileSync(source, 'utf8').split('\n').filter(line => {
          const start = line.indexOf('\t');
          if (start < 0) return false;
          const record = JSON.parse(line.slice(start + 1));
          const key = record.key?.replace(/^make-fetch-happen:request-cache:/, '');
          if (!urls.has(key)) return false;
          blob(record.integrity);
          return true;
        });
        if (lines.length) {
          const output = resolve(target, 'index-v5', name);
          mkdirSync(dirname(output), { recursive: true });
          writeFileSync(output, '\n' + lines.join('\n') + '\n');
        }
      }
    }
  }
  indexes(resolve(cache, 'index-v5'));
  return { copiedContentObjects: copied, scope: 'lockfile-matched public npm registry entries only' };
}
function materialise(destination) {
  for (const [path, bytes] of files) {
    mkdirSync(dirname(resolve(destination, path)), { recursive: true });
    writeFileSync(resolve(destination, path), bytes);
    assert.deepEqual(readFileSync(resolve(destination, path)), bytes);
  }
}
let scratch;
try {
  for (const path of walk(`${prefix}/src`)) copy(path);
  for (const name of ['package.json', 'package-lock.json', 'tsconfig.json', 'styles/reader.css', 'styles/tailwind.config.cjs', 'styles/publication-classes.txt']) copy(`${prefix}/${name}`);
  for (const name of ['build-reader-core.mjs', 'build-reader-styles.mjs']) copy(`scripts/${name}`);
  copy(`${prefix}/src/publication-content/test-publication-content.mjs`);
  omitTest(`${prefix}/src/publication-content/publication-content.test.mjs`, 'preserves the original Language Muscle static SVG with paired gradient and marker IDs');
  omitTest(`${prefix}/src/original/test-original-reader.mjs`, 'full publication identity uses actual adapter words without added punctuation or duplicates');
  const originalRootPackage = JSON.parse(input('package.json'));
  const corePackage = JSON.parse(files.get(`${prefix}/package.json`));
  assert.equal(originalRootPackage.private, true); assert.equal(corePackage.private, true);
  assert.ok(!originalRootPackage.license && !corePackage.license, 'Software licence changed: review export policy before proceeding');
  add('package.json', json({ name: originalRootPackage.name, private: true, version: originalRootPackage.version, scripts: {
    setup: 'npm ci --prefix packages/reader-core --ignore-scripts --min-release-age=7',
    build: 'npm run build --prefix packages/reader-core',
    test: 'npm run test:publication-content --prefix packages/reader-core && node --test packages/reader-core/src/original/test-original-reader.mjs',
    'test:native': 'node scripts/test-reader-native-import.mjs',
  } }));
  add('.gitignore', 'node_modules/\ndist/\n');
  add('.node-version', '26.12.1\n');
  add('scripts/test-reader-native-import.mjs', input('scripts/templates/reader-source-release/test-reader-native-import.mjs'));
  add('README.md', input('scripts/templates/reader-source-release/README.md'));
  add('LICENSING.md', input('scripts/templates/reader-source-release/LICENSING.md'));
  const extractionPath = `${prefix}/src/original/report-original-reader-extraction.md`;
  const extraction = input(extractionPath).toString('utf8');
  const origins = [...extraction.matchAll(/^- (Deliberate Practice|Language Muscle) \x60([^\x60]+)\x60 supplies \x60([^\x60]+)\x60\. SHA-256: \x60([a-f0-9]{64})\x60\./gm)].map(m => ({ project: m[1], file: m[2], supplies: m[3], sha256: m[4] }));
  assert.equal(origins.length, 13, 'Original component provenance changed; review the curated projection');
  const epubReportPath = `${prefix}/src/services/publication-epub/report-publication-epub-verification.json`;
  const epub = JSON.parse(input(epubReportPath));
  for (const [marker, project, file] of [['building-your-language-muscle/services/epubService.ts', 'Language Muscle', 'services/epubService.ts'], ['deliberate-practice-guide/utils/epubGenerator.ts', 'Deliberate Practice', 'utils/epubGenerator.ts']]) {
    const source = epub.sources.find(s => s.path.endsWith(marker));
    assert.match(source?.sha256 ?? '', /^[a-f0-9]{64}$/);
    origins.push({ project, file, supplies: 'services/publication-epub', sha256: source.sha256 });
  }
  const books = JSON.parse(input('apps/reader-demo/src/books/original-publications.json'));
  const anchors = manuscriptAnchors(books);
  evidence.manuscriptInputSha256 = sourceInputs.get('apps/reader-demo/src/books/original-publications.json');
  input('scripts/prepare-reader-source-release.mjs');
  const head = () => {
    const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, 'Cannot record the local source commit');
    return result.stdout.trim();
  };
  evidence.headAtStart = head();
  const changes = spawnSync('git', ['diff', '--name-only', '--', ...sourceInputs.keys()], { cwd: root, encoding: 'utf8' });
  assert.equal(changes.status, 0);
  evidence.trackedInputChangesAtStart = changes.stdout.trim().split('\n').filter(Boolean);
  const initialAudit = audit(files, anchors);
  evidence.initialAudit = initialAudit;
  assert.deepEqual(initialAudit.issues, [], 'Source audit failed before verification');
  mkdirSync(build, { recursive: true });
  scratch = mkdtempSync(resolve(build, 'reader-source-release.scratch-'));
  const isolated = resolve(scratch, 'candidate');
  materialise(isolated);
  const isolatedCore = resolve(isolated, prefix);
  const dependencyLink = resolve(isolatedCore, 'node_modules');
  assert.ok(existsSync(resolve(root, prefix, 'node_modules')), 'Linked smoke requires existing core dependencies');
  symlinkSync(resolve(root, prefix, 'node_modules'), dependencyLink, 'dir');
  run('linked-core-only-build', npm, ['run', 'build'], isolated);
  run('linked-core-only-native-import', npm, ['run', 'test:native'], isolated);
  rmSync(dependencyLink); // Unlink only: never remove the shared dependency directory.
  rmSync(resolve(isolatedCore, 'dist'), { recursive: true, force: true });
  evidence.installMode = args.has('--online') ? 'registry-fetch-allowed' : 'offline';
  evidence.cacheSeed = seedOfflineCache(resolve(scratch, 'npm-cache'), JSON.parse(files.get(`${prefix}/package-lock.json`)));
  run('actual-isolated-npm-ci', npm, ['ci', '--prefix', prefix, ...(args.has('--online') ? [] : ['--offline']), '--ignore-scripts', '--no-audit', '--no-fund', '--min-release-age=7', '--cache', resolve(scratch, 'npm-cache')], isolated);
  run('installed-core-only-build', npm, ['run', 'build'], isolated);
  run('installed-node-unit-checks', npm, ['test'], isolated);
  run('installed-native-package-import', npm, ['run', 'test:native'], isolated);
  const css = readFileSync(resolve(isolatedCore, 'dist/reader.css'), 'utf8');
  const fontURLs = [...css.matchAll(/url\((?:['"])?(\.\/fonts\/[^)'"\s]+)/g)].map(m => m[1]);
  assert.ok(fontURLs.length > 0);
  for (const url of fontURLs) assert.ok(existsSync(resolve(isolatedCore, 'dist', url)), 'Missing generated font');
  assert.ok(css.includes(files.get(`${prefix}/src/original/reader-original.css`).toString('utf8')));
  assert.ok(!/https?:\/\//.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'External generated stylesheet resource');
  const notices = [];
  for (const family of ['inter', 'merriweather', 'material-symbols-outlined']) {
    const filename = `LICENSE-${family}.txt`;
    const bytes = readFileSync(resolve(isolatedCore, 'dist/fonts', filename));
    add(`${prefix}/notices/${filename}`, bytes);
    notices.push({ path: `${prefix}/notices/${filename}`, sha256: hash(bytes), from: `@fontsource/${family}/LICENSE` });
  }
  evidence.generatedStyle = { sha256: hash(css), localFontReferences: fontURLs.length, notices };
  const inputManifest = [...files].map(([path, bytes]) => ({ path, sha256: hash(bytes), bytes: bytes.length }));
  add('provenance-reader-source.json', json({ status: 'unreleased-review-draft-no-selected-software-licence', origins, adaptations: [
    'Original application markup/styles remain; book identity and optional coaching use supplied contracts.',
    'Persistence and routes are book-specific; rich content and EPUB use the shared sanitised renderer.',
    'Only generic Node regressions are exported; real-book identity and original SVG manuscript fixture tests are omitted.',
  ], transformations, exportedInputs: inputManifest }));
  const finalAudit = audit(files, anchors);
  evidence.audit = finalAudit;
  assert.deepEqual(finalAudit.issues, [], 'Final source audit failed');
  const bytes = archive(files);
  const members = inspectArchive(bytes, files);
  assert.deepEqual(bytes, archive(files), 'Archive changed with identical inputs');
  evidence.headAtEnd = head();
  evidence.changedInputsDuringRun = [...sourceInputs].filter(([path, sha256]) => hash(readFileSync(resolve(root, path))) !== sha256).map(([path]) => path);
  evidence.inputHashes = [...sourceInputs].map(([path, sha256]) => ({ path, sha256 }));
  evidence.exportTransformations = transformations;
  const manifest = { format: 1, status: evidence.status, archive: 'reader-source-release.tar.gz', sha256: hash(bytes), bytes: bytes.length, fileCount: files.size, files: members.map(path => ({ path, bytes: files.get(path).length, sha256: hash(files.get(path)) })) };
  // Replace only the named generated source candidate, after every audit/check passes.
  if (existsSync(candidate)) assert.ok(!lstatSync(candidate).isSymbolicLink(), 'Candidate destination cannot be a link');
  rmSync(candidate, { recursive: true, force: true });
  materialise(candidate);
  writeFileSync(resolve(build, 'reader-source-release.tar.gz'), bytes);
  writeFileSync(resolve(build, 'reader-source-release.manifest.json'), json(manifest));
  writeFileSync(resolve(build, 'reader-source-release.sha256'), `${manifest.sha256}  reader-source-release.tar.gz\n`);
  const written = new Map();
  function readBack(directory, at = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = posix.join(at, entry.name), full = resolve(directory, entry.name);
      assert.ok(!entry.isSymbolicLink(), 'Unexpected link in candidate read-back');
      if (entry.isDirectory()) readBack(full, path);
      else {
        assert.ok(entry.isFile() && files.has(path), 'Unexpected candidate member');
        written.set(path, readFileSync(full));
        assert.deepEqual(written.get(path), files.get(path));
      }
    }
  }
  readBack(candidate);
  assert.equal(written.size, files.size);
  const savedArchive = readFileSync(resolve(build, 'reader-source-release.tar.gz'));
  assert.equal(hash(savedArchive), manifest.sha256);
  inspectArchive(savedArchive, written);
  evidence.postWriteVerification = { exactFileCount: written.size, allFileHashesMatch: true, savedArchiveMatches: true };
  evidence.archive = { path: 'build/reader-source-release.tar.gz', sha256: manifest.sha256, fileCount: files.size, bytes: bytes.length };
  evidence.npm = run('npm-version', npm, ['--version'], isolated).trim();
  evidence.result = 'passed-local-source-preparation';
  console.log(`Prepared ${files.size} source files. Archive SHA-256: ${manifest.sha256}`);
} catch (error) {
  evidence.result = 'failed';
  evidence.error = error.message;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  evidence.scratchRemoved = !scratch || !existsSync(scratch);
  mkdirSync(build, { recursive: true });
  writeFileSync(resolve(build, 'reader-source-release.evidence.json'), json(evidence));
}
