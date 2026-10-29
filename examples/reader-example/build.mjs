/** Builds the example into dist/: the reader (Vite), the interactive embed with the height helper inlined, the agent files and `_headers`.
 * Usage: node build.mjs [--without-embeds]
 * --without-embeds registers no embed and writes no embeds/ folder: use it for hosts that cannot send the embed headers, such as GitHub Pages.
 * Writes only inside this folder's dist/, and refuses a linked dist/ or embeds/ folder. Reads the built reader-core package, so build the core first. */
import { closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { buildAgentBook } from 'reader-core/agent';
import { checkPublicationEmbeds } from 'reader-core';
import { exampleBook, exampleEmbeds } from './src/example-book.mjs';
import { EMBED_ROOT, headerRules, renderHeaders } from './hosting-headers.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, 'dist');
const args = process.argv.slice(2);
for (const arg of args) if (arg !== '--without-embeds') throw new Error(`Unknown option: ${arg}`);
const withEmbeds = !args.includes('--without-embeds');

const notLinked = path => {
  try { if (lstatSync(path).isSymbolicLink()) throw new Error(`Refusing a linked path: ${relative(here, path)}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
};
/** A path inside dist/ whose every existing part is a real directory or file, never a link. */
function inside(path) {
  const target = resolve(dist, path);
  if (!target.startsWith(dist + sep)) throw new Error(`Refusing to write outside dist/: ${path}`);
  for (let at = target; at !== here; at = dirname(at)) notLinked(at);
  return target;
}
/** Read an authored embed only below its real source directory; output guards do not protect source reads. */
function readEmbedSource(name) {
  const sourceRoot = resolve(here, 'embeds');
  const target = resolve(sourceRoot, name);
  if (!target.startsWith(sourceRoot + sep)) throw new Error('Refusing an embed source outside embeds/');
  for (let at = target; at !== here; at = dirname(at)) notLinked(at);
  const fd = openSync(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!fstatSync(fd).isFile()) throw new Error('Embed source must be a regular file');
    return readFileSync(fd, 'utf8');
  } finally { closeSync(fd); }
}
function write(path, content) {
  const target = inside(path);
  mkdirSync(dirname(target), { recursive: true });
  inside(path);
  writeFileSync(target, content);
}

notLinked(here); notLinked(dist);
if (realpathSync(here) !== here) throw new Error('Run the build from the example folder\'s real path, not through a link.');

const problems = withEmbeds ? checkPublicationEmbeds(exampleBook, exampleEmbeds) : [];
if (problems.length) throw new Error(`Embed check failed:\n${problems.join('\n')}`);
// Refuse linked sources before the previous output can be replaced.
const embedSources = withEmbeds ? exampleEmbeds.items.map(item => ({ item, source: readEmbedSource(item.src) })) : [];

rmSync(dist, { recursive: true, force: true });
await build({
  root: here, base: './', configFile: false, logLevel: 'warn',
  define: { __EXAMPLE_EMBEDS__: JSON.stringify(withEmbeds) },
  esbuild: { jsx: 'automatic' },
  resolve: { dedupe: ['react', 'react-dom'] },
  build: { outDir: dist, emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});

if (withEmbeds) {
  // The embed document may contain only inline script: inline the package's height helper, which must be a plain module with no imports.
  const helper = readFileSync(fileURLToPath(import.meta.resolve('reader-core/embed-child')), 'utf8');
  if (/^\s*import\b|\bimport\s*\(/m.test(helper)) throw new Error('reader-core/embed-child must not import anything');
  const plain = helper.replace(/^export (function|const) /gm, '$1 ').replace(/^export \{\};?$/gm, '').replace(/^\/\/# sourceMappingURL=.*$/gm, '');
  if (/^\s*export\b/m.test(plain)) throw new Error('Unexpected export form in reader-core/embed-child');
  for (const { item, source } of embedSources) {
    const marker = '<!-- reader-embed-child -->';
    if (source.split(marker).length !== 2) throw new Error(`${item.src} needs exactly one ${marker} line`);
    write(EMBED_ROOT + item.src, source.replace(marker, `<script>\n${plain.trim()}\nstartReaderEmbedHeightReporting();\n</script>`));
  }
}

const agent = buildAgentBook(exampleBook, { directory: 'agent' });
for (const file of agent.files) write(file.path, file.content);
write('_headers', renderHeaders(headerRules({ embeds: withEmbeds })));
write('example-build.json', JSON.stringify({ embeds: withEmbeds, agentFiles: agent.files.map(file => file.path) }, null, 2) + '\n');
console.log(`Built the example in dist/ ${withEmbeds ? 'with' : 'without'} embeds; ${agent.files.length} agent files.`);
