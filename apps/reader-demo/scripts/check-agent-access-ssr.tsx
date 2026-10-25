/** Server-render check of the "Ask an agent" box: the configured public address, the unconfigured fallback and a bad configuration. Run from apps/reader-demo: npx tsx scripts/check-agent-access-ssr.tsx */
import React from '../../../packages/reader-core/node_modules/react';
import { renderToString } from '../../../packages/reader-core/node_modules/react-dom/server';
import { AgentAccess } from '../../../packages/reader-core/src/original/agent/AgentAccess';
import books from '../src/books/original-publications.json';
import { canonicalSites } from '../src/canonical-sites';
let failures = 0;
const check = (ok: boolean, message: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`); if (!ok) failures++; };
const book = (books as any[])[0];
const html = (siteUrl?: string, variant: 'panel' | 'quiet' = 'panel', section?: any) => renderToString(<AgentAccess book={book} access={{ path: '/agent/', siteUrl }} variant={variant} section={section} />);
const configured = html(canonicalSites[book.id]);
check(configured.includes(`${canonicalSites[book.id]}agent/${book.id}/index.md`) && configured.includes('Copy'), 'configured: renders on the server with the public address');
check(!/100\.85|localhost|127\.0\.0\.1|ts\.net/.test(configured), 'configured: no private address');
const chapter = html(canonicalSites[book.id], 'quiet', book.sections[0].children?.[0] ?? book.sections[0]);
check(/chapters\/[^"]+\.md/.test(chapter) && chapter.includes('publication-agent--quiet'), 'configured quiet variant names the chapter file');
for (const bad of [undefined, '', 'nonsense', 'http://100.85.55.122:8773/', 'https://u:p@example.org/', 'javascript:alert(1)', 'http://[::ffff:127.0.0.1]/', 'https://localhost./', 'https:example.org/']) check(html(bad) === '', `no usable address (${String(bad)}): nothing is rendered before the browser knows where it is`);
const withPath = (path: string) => renderToString(<AgentAccess book={book} access={{ path, siteUrl: canonicalSites[book.id] }} variant="panel" />);
const custom = withPath('static/agent/');
check(custom.includes(`${canonicalSites[book.id]}static/agent/${book.id}/index.md`) && !custom.includes(`${canonicalSites[book.id]}agent/`), 'custom folder: the prompt and links name the generated folder under the public address');
for (const unsafe of ['javascript:alert(1);void(0)//x', '../agent/', '%2e%2e/agent/', 'https://evil.example/agent/']) {
  const out = withPath(unsafe);
  check(!/javascript:|evil\.example|%2e/i.test(out) && out.includes(`${canonicalSites[book.id]}agent/${book.id}/index.md`), `unsafe folder ${unsafe}: ignored for the default folder, no active unsafe link`);
}
process.exit(failures ? 1 : 0);
