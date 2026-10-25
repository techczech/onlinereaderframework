/** Install the actual tarball in an isolated consumer; remove installation scratch on every exit. */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, cpSync, symlinkSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework";
const online = process.argv.includes('--online');
const reactOption = process.argv.indexOf('--react-version');
const reactVersion = reactOption < 0 ? '18.3.1' : process.argv[reactOption + 1];
const typeVersions = {
  '18.3.1': { react: '18.3.27', reactDOM: '18.3.7' },
  '19.2.0': { react: '19.2.2', reactDOM: '19.2.2' },
};
assert.ok(Object.hasOwn(typeVersions, reactVersion), '--react-version must be 18.3.1 or 19.2.0');
// This switch changes only the scratch package, allowing proof before a peer-range edit.
const candidatePeers = process.argv.includes('--candidate-react19-peers');
const suffix = reactOption < 0 ? '' : `-react-${reactVersion}`;
const buildRoot = "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/docs/design/2026-10-25-configurable-frontpages/evidence-review/package-output";
mkdirSync(buildRoot, { recursive: true });
const scratch = mkdtempSync(resolve(buildRoot, 'package-consumer-'));
try {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  // Build a monorepo containing only core and its build scripts. The demo, manuscripts
  // and original worktrees are deliberately absent; shared dist is never touched.
  const isolatedRoot = resolve(scratch, 'standalone');
  const isolatedCore = resolve(isolatedRoot, 'packages/reader-core');
  cpSync(resolve(root, 'packages/reader-core'), isolatedCore, {
    recursive: true,
    filter: source => !['node_modules', 'dist'].includes(source.split(/[\\/]/).at(-1)),
  });
  if (candidatePeers) {
    for (const filename of ['package.json', 'package-lock.json']) {
      const path = resolve(isolatedCore, filename);
      const manifest = JSON.parse(readFileSync(path, 'utf8'));
      const target = filename === 'package.json' ? manifest : manifest.packages[''];
      target.peerDependencies = { react: '^18.3.1 || ^19.2.0', 'react-dom': '^18.3.1 || ^19.2.0' };
      writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
    }
  }
  mkdirSync(resolve(isolatedRoot, 'scripts'), { recursive: true });
  for (const script of ['build-reader-core.mjs', 'build-reader-styles.mjs']) {
    cpSync(resolve(root, 'scripts', script), resolve(isolatedRoot, 'scripts', script));
  }
  symlinkSync(resolve(root, 'packages/reader-core/node_modules'), resolve(isolatedCore, 'node_modules'), 'dir');
  execFileSync(npm, ['--prefix', 'packages/reader-core', 'run', 'build'], { cwd: isolatedRoot, stdio: 'inherit' });
  assert.ok(existsSync(resolve(isolatedCore, 'dist/reader.css')), 'Standalone core build must create its exported reader.css');
  const css = readFileSync(resolve(isolatedCore, 'dist/reader.css'), 'utf8');
  const fontURLs = [...css.matchAll(/url\((?:['"])?(\.\/fonts\/[^)'"]+)/g)].map(match => match[1]);
  assert.ok(fontURLs.length > 0, 'Standalone build must emit bundled font references');
  for (const url of fontURLs) assert.ok(existsSync(resolve(isolatedCore, 'dist', url)), `Missing font: ${url}`);
  assert.ok(!/https?:\/\//.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'Packaged CSS must not fetch external resources');
  for (const family of ['inter', 'merriweather', 'material-symbols-outlined']) {
    assert.ok(existsSync(resolve(isolatedCore, `dist/fonts/LICENSE-${family}.txt`)), `Missing ${family} notice`);
  }
  const originalCSS = readFileSync(resolve(isolatedCore, 'src/original/reader-original.css'), 'utf8');
  assert.ok(css.includes(originalCSS), 'Original reader CSS must be copied without alteration');
  for (const selector of ['.antialiased', '.prose', '.animate-fade-in-up', '.animate-bounce-in', '.text-emerald-800', '.border-emerald-300', '.dark\\:']) {
    assert.ok(css.includes(selector), `Missing original reader styling: ${selector}`);
  }
  const fixtureClasses = readFileSync(resolve(isolatedCore, 'styles/publication-classes.txt'), 'utf8')
    .split('\n').filter(line => !line.startsWith('#')).join(' ').trim().split(/\s+/);
  assert.ok(fixtureClasses.length >= 66, 'Publication class fixture must supply the extracted HTML classes');
  for (const className of fixtureClasses) {
    const selector = '.' + className.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
    assert.ok(css.includes(selector), `Missing publication HTML class: ${className}`);
  }
  if (process.argv.includes('--standalone-only')) {
    console.log(`Standalone core build passed: CSS, ${fontURLs.length} local font references and three font notices.`);
    process.exitCode = 0;
  } else {
    const packed = JSON.parse(execFileSync(npm, ['pack', '--json', '--ignore-scripts', '--pack-destination', scratch], { cwd: isolatedCore, encoding: 'utf8' }))[0];
    const tarball = resolve(scratch, packed.filename);
    const sha256 = createHash('sha256').update(readFileSync(tarball)).digest('hex');
    const auditRun = spawnSync(process.execPath, [resolve(root, 'scripts/audit-reader-distribution.mjs'), '--summary', '--pack', tarball], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    assert.ok([0, 1].includes(auditRun.status), `Distribution auditor failed to run: ${auditRun.stderr}`);
    const audit = JSON.parse(auditRun.stdout);
    assert.equal(audit.pack.sha256, sha256);
    assert.deepEqual(audit.pack.issues, [], 'Actual tarball must pass source/private/manuscript exclusions');
    console.log(`Packed file exclusions passed; installed notice inventory has ${audit.issues.filter(issue => issue.code !== 'optional-not-installed').length} findings (recorded separately).`);
    const contents = packed.files.map(file => file.path);
    for (const required of ['dist/index.js', 'dist/index.d.ts', 'dist/reader.css']) {
      if (!contents.includes(required)) throw new Error(`Package is missing ${required}`);
    }
    if (contents.some(name => /original-publications|\.env|^src\/|\.map$|^styles\/|^docs\/|^research\//.test(name))) throw new Error('Private/demo input leaked into package');
    writeFileSync(resolve(scratch, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
    execFileSync(npm, ['install', ...(online ? ['--registry=https://registry.npmjs.org'] : ['--offline']), '--ignore-scripts', '--no-audit', '--no-fund', '--min-release-age=7', '--strict-peer-deps', '--legacy-peer-deps=false', '--force=false', tarball, `react@${reactVersion}`, `react-dom@${reactVersion}`, `@types/react@${typeVersions[reactVersion].react}`, `@types/react-dom@${typeVersions[reactVersion].reactDOM}`, 'typescript@5.9.3'], { cwd: scratch, stdio: 'inherit' });
    const dependencyTree = JSON.parse(execFileSync(npm, ['ls', '--all', '--json'], { cwd: scratch, encoding: 'utf8' }));
    const installed = name => JSON.parse(readFileSync(resolve(scratch, 'node_modules', name, 'package.json'), 'utf8'));
    const dependencyVersions = Object.fromEntries(['react', 'react-dom', '@types/react', '@types/react-dom', 'typescript', 'qrcode'].map(name => [name, installed(name).version]));
    assert.equal(dependencyVersions.react, reactVersion);
    assert.equal(dependencyVersions['react-dom'], reactVersion);
    assert.equal(dependencyVersions['@types/react'], typeVersions[reactVersion].react);
    assert.equal(dependencyVersions['@types/react-dom'], typeVersions[reactVersion].reactDOM);
    assert.equal(dependencyVersions.qrcode, '1.5.4');
    assert.equal(installed('reader-core').dependencies.qrcode, '1.5.4');
    assert.equal(dependencyTree.dependencies['reader-core'].dependencies.react.version, reactVersion);
    assert.equal(dependencyTree.dependencies['reader-core'].dependencies['react-dom'].version, reactVersion);
    for (const filename of ['consumer-types.tsx', 'tsconfig.json']) {
      cpSync(resolve(root, `scripts/templates/reader-package-consumer/${filename}`), resolve(scratch, filename));
    }
    writeFileSync(resolve(scratch,'consumer-types.tsx'), readFileSync(resolve(scratch,'consumer-types.tsx'),'utf8') + "\nimport {FRONT_PAGE_LAYOUTS, frontPageLayoutKey, type FrontPageLayoutKey} from 'reader-core';\nconst layout: FrontPageLayoutKey = 'opus-colour-band';\nbook.appearance = {frontPageLayout:layout}; book.labels={contents:'Contents',fullContents:'Full contents'};\n// @ts-expect-error Invalid layouts must be rejected.\nconst invalid: FrontPageLayoutKey='wrong';\nvoid [FRONT_PAGE_LAYOUTS,frontPageLayoutKey,invalid];\n");
    assert.ok(css.includes('.pf-band') && css.includes('.pf-open-layout') && css.includes('.pf-b-map'));
    execFileSync(process.execPath, [resolve(scratch, 'node_modules/typescript/bin/tsc'), '--project', resolve(scratch, 'tsconfig.json')], { cwd: scratch, stdio: 'inherit' });
    console.log(`Host TypeScript checks passed with React ${reactVersion}: PublicationReader/props and legacy ReaderShell, skipLibCheck=false.`);
    // Execute native ESM in a fresh Node process: no bundler or DOM globals.
    execFileSync(process.execPath, ['--input-type=module', '-e', readFileSync(resolve(root, 'scripts/templates/reader-package-consumer/test-reader-native-import.mjs'), 'utf8') + "\nconst React=await import('react');const {renderToString}=await import('react-dom/server');\nfor(const {key} of api.FRONT_PAGE_LAYOUTS){const html=renderToString(React.createElement(api.PublicationReader,{book:{...book,description:'',appearance:{frontPageLayout:key},sections:[{id:'one',title:'One',category:'Text',content:'Text'}]},epub:false}));assert.ok(html.includes('data-front-layout=\"'+key+'\"'));}\nassert.equal(api.frontPageLayoutKey('wrong'),undefined);\nconsole.log('Six installed layouts SSR and public config passed.');\n"], { cwd: scratch, stdio: 'inherit' });
    writeFileSync(resolve(scratch, 'index.html'), readFileSync(resolve(root, 'scripts/templates/reader-package-consumer/index.html')));
    writeFileSync(resolve(scratch, 'consumer.jsx'), readFileSync(resolve(root,'scripts/templates/reader-package-consumer/consumer.jsx'),'utf8').replace('const reader=', "book.appearance={frontPageLayout:new URLSearchParams(location.search).get('frontpage')||'opus-colour-band',accent:'#b84b2d',paper:'#fffaf1',ink:'#282723'};Object.assign(book,globalThis.reviewBook||{});const reader="));
    const { build } = await import(pathToFileURL(resolve(root, 'apps/reader-demo/node_modules/vite/dist/node/index.js')).href);
    await build({ logLevel: 'warn', configFile: false, root: scratch, base: './', build: { outDir: resolve(buildRoot, `packaged-consumer${suffix}-dist`), emptyOutDir: true }, resolve: { dedupe: ['react', 'react-dom'] } });
    const retainedArtifact = resolve(buildRoot, 'reader-core-verified.tgz');
    cpSync(tarball, retainedArtifact);
    const versionedArtifact = `docs/design/2026-10-25-configurable-frontpages/evidence-review/package-output/reader-core-react-${reactVersion}-verified.tgz`;
    cpSync(tarball, resolve(root, versionedArtifact));
    const evidence = { reactVersion, candidatePeers, dependencyVersions, peerDependencies: installed('reader-core').peerDependencies, dependencyTreeValid: true, hostTypeCheck: { skipLibCheck: false, apis: ['PublicationReader', 'PublicationReaderProps', 'PublicationCoaching', 'ReaderShell', 'ReaderProps', 'SectionConfig'] }, browserDist: `build/packaged-consumer${suffix}-dist`, versionedArtifact, artifact: 'build/reader-core-verified.tgz', name: packed.name, version: packed.version, node: process.version, npm: execFileSync(npm, ['--version'], { encoding: 'utf8' }).trim(), sha256, integrity: packed.integrity, files: contents, fontReferences: fontURLs.length, stylesheetSha256: createHash('sha256').update(css).digest('hex'), coreLockSha256: createHash('sha256').update(readFileSync(resolve(isolatedCore, 'package-lock.json'))).digest('hex'), packIssues: audit.pack.issues, installedInventoryIssues: audit.issues, uncompressedBytes: packed.unpackedSize, standaloneCoreBuild: true, nativeNodeImport: true, browserOnlyEpubRejection: true, result: `tarball installed ${online ? 'with registry access' : 'offline'} and consumer production build passed` };
    for (const filename of ['evidence-reader-package.json', `evidence-reader-package-react-${reactVersion}.json`]) {
      writeFileSync(resolve(buildRoot, filename), JSON.stringify(evidence, null, 2) + '\n');
    }
    console.log('Installed package consumer built successfully; installation scratch removed.');
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
