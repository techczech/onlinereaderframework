
  import assert from 'node:assert/strict';
  for (const name of ['window', 'document', 'DOMParser', 'XMLSerializer']) assert.equal(typeof globalThis[name], 'undefined');
  const api = await import('reader-core');
  for (const name of ['PublicationReader', 'ReaderShell', 'parseMarkdownToSections', 'generateEpub', 'generatePublicationEpub', 'downloadPublicationEpub', 'publicationDisplayTitle']) {
    assert.equal(typeof api[name], 'function', name + ' must remain exported');
  }
  assert.ok(api.renderPublicationContent('**Available**').includes('<strong>Available</strong>'));
  assert.equal(api.publicationDisplayTitle({title:'Building Your',subtitle:'Language Muscle'}), 'Building Your Language Muscle');
  const book = {id:'native-import', title:'Native import', author:'Verification', sections:[]};
  await assert.rejects(api.generatePublicationEpub(book), /requires browser DOMParser and XMLSerializer/);
  await assert.rejects(api.downloadPublicationEpub(book), /requires browser DOMParser and XMLSerializer/);
  console.log('Native Node tarball import and browser-only EPUB rejection passed.');
  