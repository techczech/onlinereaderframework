/** Vite plugin of the demo (dev server, `vite preview` and the demo build only; a single-book release builds with `configFile: false` and never loads it).
 * It serves and copies exactly the self-contained embed documents the embed manifest lists, from `interactives/<book folder>/<id>/index.html` to
 * `embeds/<book id>/<id>/index.html`, which is the `root` + `src` the demo registry hands to the reader. Nothing else under `interactives/` is reachable.
 * Served and built files carry the embed policy of the contract (sandbox, no network), the same one `scripts/release/headers.ts` emits for `/embeds/*`. */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { EMBED_CONTENT_SECURITY_POLICY } from './release/headers';

interface Entry { url: string; file: string }

export function demoEmbedAssets(appRoot: string): Plugin {
  const root = path.resolve(appRoot);
  const fail = (): never => { throw new Error('Invalid or unsafe demo embed asset configuration'); };
  if (fs.realpathSync(root) !== root) fail();
  const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
  const segment = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(v);
  const relative = (v: unknown): v is string => typeof v === 'string' && v.length <= 200 && v.split('/').every(p => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(p) && !p.includes('..'));
  const checked = (file: string): string => {
    const rel = path.relative(root, file);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) fail();
    let current = root;
    for (const part of rel.split(path.sep)) {
      current = path.join(current, part);
      if (fs.lstatSync(current).isSymbolicLink()) fail();
    }
    if (fs.realpathSync(file) !== file || !fs.statSync(file).isFile()) fail();
    return file;
  };
  const readAsset = (file: string): Buffer => {
    checked(file);
    const descriptor = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try { if (!fs.fstatSync(descriptor).isFile()) fail(); return fs.readFileSync(descriptor); }
    finally { fs.closeSync(descriptor); }
  };
  const manifest: unknown = JSON.parse(readAsset(path.join(root, 'src/books/next-books/embed-manifest.json')).toString('utf8'));
  if (!object(manifest) || !object(manifest.books)) fail();
  const entries: Entry[] = [];
  const urls = new Set<string>();
  for (const [bookId, book] of Object.entries(manifest.books)) {
    if (!segment(bookId) || !object(book) || !relative(book.interactivesDir) || !book.interactivesDir.startsWith('interactives/') || !Array.isArray(book.items)) fail();
    for (const item of book.items) {
      if (!object(item) || !segment(item.id) || !relative(item.src) || !item.src.endsWith('.html')) fail();
      const file = path.resolve(root, book.interactivesDir, item.src);
      if (!file.startsWith(path.join(root, 'interactives') + path.sep)) fail();
      checked(file);
      const url = `/embeds/${bookId}/${item.src}`;
      if (urls.has(url)) fail();
      urls.add(url); entries.push({ url, file });
    }
  }
  const byUrl = new Map(entries.map(entry => [entry.url, entry.file]));
  const middleware = (request: { url?: string }, response: { statusCode: number; setHeader(name: string, value: string): void; end(body?: Buffer | string): void }, next: () => void): void => {
    const file = byUrl.get((request.url ?? '').split('?')[0]);
    if (!file) return next();
    response.statusCode = 200;
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Content-Security-Policy', EMBED_CONTENT_SECURITY_POLICY);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    response.end(readAsset(file));
  };
  return {
    name: 'orf-demo-embed-assets',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
    buildStart() { for (const entry of entries) { this.addWatchFile(entry.file); checked(entry.file); } },
    generateBundle() { for (const entry of entries) this.emitFile({ type: 'asset', fileName: entry.url.slice(1), source: readAsset(entry.file) }); },
  };
}
