/** Local preview of dist/ with the same response headers that `_headers` gives a Cloudflare Pages host, including the embed sandbox.
 * Usage: node serve.mjs [--port 4173]. Listens on 127.0.0.1 only. Read-only: serves regular files inside dist/, never through a link. */
import { createServer } from 'node:http';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { headerRules, headersFor } from './hosting-headers.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

/** The regular file a request path names inside `root`, or null. Refuses encoded separators, dot segments, hidden names and links. */
export function fileFor(root, pathname) {
  root = resolve(root);
  // Include the root and every ancestor; checking only its descendants follows a linked dist/.
  try { if (!lstatSync(root).isDirectory() || realpathSync(root) !== root) return null; } catch { return null; }
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (!decoded.startsWith('/') || /[\\\0]/.test(decoded)) return null;
  const parts = decoded.slice(1).split('/');
  if (decoded.endsWith('/')) parts[parts.length - 1] = 'index.html';
  if (parts.some(part => !part || part.startsWith('.'))) return null;
  const target = resolve(root, ...parts);
  if (!target.startsWith(root + sep)) return null;
  for (let at = target; at !== root; at = dirname(at)) {
    try { if (lstatSync(at).isSymbolicLink()) return null; } catch { return null; }
  }
  return lstatSync(target).isFile() ? target : null;
}

export function createPreviewServer(root = resolve(here, 'dist')) {
  root = resolve(root);
  const metadata = fileFor(root, '/example-build.json');
  if (!metadata) throw new Error('Refusing a missing or linked preview root or build metadata');
  const built = JSON.parse(readFileSync(metadata, 'utf8'));
  const rules = headerRules({ embeds: built.embeds === true });
  return createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    const file = fileFor(root, url.pathname);
    const headers = Object.fromEntries(headersFor(rules, url.pathname));
    if (!file) { response.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found\n'); return; }
    const body = readFileSync(file);
    response.writeHead(200, { ...headers, 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const at = process.argv.indexOf('--port');
  const port = at < 0 ? 4173 : Number(process.argv[at + 1]);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('--port must be a number from 0 to 65535');
  const server = createPreviewServer();
  server.listen(port, '127.0.0.1', () => console.log(`Previewing dist/ at http://127.0.0.1:${server.address().port}/ (press Ctrl+C to stop)`));
}
