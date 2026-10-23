import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../packages/reader-core/', import.meta.url));
const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
import assert from 'node:assert/strict';
for (const name of ['window', 'document', 'DOMParser', 'XMLSerializer']) assert.equal(typeof globalThis[name], 'undefined');
const api = await import('reader-core');
for (const name of ['PublicationReader', 'ReaderShell', 'parseMarkdownToSections', 'generateEpub', 'generatePublicationEpub', 'downloadPublicationEpub']) assert.equal(typeof api[name], 'function', name);
assert.ok(api.renderPublicationContent('**Available**').includes('<strong>Available</strong>'));
const book = { id: 'native-import', title: 'Native import', author: 'Verification', sections: [] };
await assert.rejects(api.generatePublicationEpub(book), /requires browser DOMParser and XMLSerializer/);
await assert.rejects(api.downloadPublicationEpub(book), /requires browser DOMParser and XMLSerializer/);
console.log('Native package-name import, existing/new APIs and browser-only EPUB boundary passed.');
`], { cwd, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
