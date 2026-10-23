import { generatePublicationEpub, downloadPublicationEpub } from './index.ts';
import JSZip from 'jszip';
import { renderPublicationContent } from '../../publication-content/index.ts';

function assert(value, message) { if (!value) throw new Error(message); }
const xml = source => {
  const doc = new DOMParser().parseFromString(source, 'application/xml');
  assert(!doc.querySelector('parsererror'), `Malformed XML: ${doc.documentElement.textContent}`);
  return doc;
};
const asBase64 = async blob => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};
const fixture = () => ({
  id: '../book & "identity"', title: 'Export <book> & “quotes”', author: 'Lukeš & Co', language: 'cs',
  subtitle: 'Rich <content>', description: 'A & B < C', sourceUrl: 'https://example.org/book?a=1&b=2',
  home: { authorNote: 'Original author note.', license: { label: 'CC BY & SA', href: 'https://example.org/license' } },
  sections: [{ id: '../unsafe/parent', title: 'Parent & <chapter>', category: 'Test', content: '', children: [
    { id: 'child"/&', title: 'Rich child', category: 'Test', content: '# Heading\n\nA note.[^one]\n\n[^one]: Footnote text & more.\n\n| First | Second |\n| --- | --- |\n| one | two |\n\n```js\nconst x = a < b;\n```\n\n$x^2$\n\n<a href="#/sibling">Next section</a>\n\n<script>alert(1)</script>' },
  ] }, { id: 'sibling', title: 'Sibling', category: 'Test', format: 'html', content: '<p>Text &nbsp; &amp; <br><img src="icon.png" width="40px" alt="Icon & text" onerror="alert(1)"></p><svg viewBox="0 0 10 10"><defs><linearGradient id="gradient"><stop offset="0" stop-color="red"/></linearGradient></defs><path fill="url(#gradient)" d="M0 0L1 1"/></svg><p><a href="#/child%22%2F%26#heading">Child heading</a></p><input type="checkbox" disabled checked><p><a href="http://%20Lucien%20Tensiere%27s">Malformed source reference</a></p>' }],
});
const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1;
const png = Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]), c => c.charCodeAt(0));

window.runPublicationEpubChecks = async (books, realAssets = {}) => {
  const checks = [];
  const book = fixture();
  let missing;
  try { await generatePublicationEpub(book); } catch (error) { missing = String(error); }
  assert(missing?.includes('icon.png'), 'Missing image must fail with its exact source href');
  checks.push('missing asset reported without fetching');
  const blob = await generatePublicationEpub(book, { assets: [{ href: 'icon.png', mediaType: 'image/png', data: png }] });
  assert(blob.type === 'application/epub+zip', 'Blob media type');
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const opf = xml(await zip.file('OEBPS/content.opf').async('string'));
  assert(opf.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'identifier').length === 1, 'Single book identifier');
  assert(opf.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'title')[0].textContent === book.title, 'Escaped title roundtrip');
  assert(opf.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'language')[0].textContent === 'cs', 'Typed book language');
  const chapters = Object.keys(zip.files).filter(name => /Text\/chapter-\d+\.xhtml$/.test(name));
  assert(chapters.length === 3, 'Every recursive section included once');
  assert(!Object.keys(zip.files).some(name => name.includes('unsafe') || name.includes('child"')), 'Source IDs never enter archive paths');
  const nav = xml(await zip.file('OEBPS/nav.xhtml').async('string'));
  assert(nav.querySelectorAll('nav > ol > li > ol > li').length === 1, 'Hierarchical navigation preserved');
  const rich = xml(await zip.file(chapters[1]).async('string'));
  assert(rich.querySelector('table') && rich.querySelector('pre code'), 'Tables and code retained');
  assert(rich.getElementsByTagNameNS('http://www.w3.org/1998/Math/MathML', 'math').length, 'MathML namespace retained');
  const reference = rich.querySelector('.footnote-ref a');
  assert(reference && [...rich.querySelectorAll('[id]')].some(node => node.id === decodeURIComponent(reference.getAttribute('href').slice(1))), 'Footnote target retained: ' + new XMLSerializer().serializeToString(rich));
  const back = rich.querySelector('a.footnote-backref');
  assert(back && [...rich.querySelectorAll('[id]')].some(node => node.id === decodeURIComponent(back.getAttribute('href').slice(1))), 'Footnote backlink retained');
  assert(rich.querySelector('a[href="chapter-0003.xhtml"]'), 'Chapter route rewritten');
  const last = xml(await zip.file(chapters[2]).async('string'));
  assert(last.querySelector('a[href="chapter-0002.xhtml#reader-content-heading"]'), 'Encoded chapter and heading route rewritten');
  assert(last.getElementsByTagNameNS('http://www.w3.org/2000/svg', 'svg').length, 'SVG namespace retained');
  assert(last.querySelector('img').getAttribute('src').startsWith('../Assets/'), 'Provided image embedded');
  assert(last.querySelector('img').getAttribute('width') === '40', 'Original pixel dimensions become valid EPUB integers');
  assert([...last.querySelectorAll('a')].find(a => a.textContent === 'Malformed source reference')?.getAttribute('href') === null, 'Invalid source URL retains text without a broken hyperlink: ' + new XMLSerializer().serializeToString(last));
  for (const [name, file] of Object.entries(zip.files)) {
    if (/\.(xml|opf|xhtml)$/.test(name)) {
      const doc = xml(await file.async('string'));
      assert(!doc.querySelector('script, [onerror], [onclick]'), `Unsafe content removed from ${name}`);
    }
  }
  checks.push('metadata, safe paths, nested navigation, XHTML, images, code, tables, paired notes, SVG, MathML, routes');
  const duplicate = fixture(); duplicate.sections[1].id = duplicate.sections[0].id;
  await rejects(() => generatePublicationEpub(duplicate), 'Duplicate', 'Duplicate section IDs must be rejected');
  const brokenRoute = { ...book, sections: [{ id: 'one', title: 'One', category: 'Test', content: '[Missing](#/absent)' }] };
  await rejects(() => generatePublicationEpub(brokenRoute), 'absent', 'Missing chapter routes must be reported');
  await rejects(() => generatePublicationEpub(book, { assets: [{ href: 'icon.png', mediaType: 'toString', data: png }] }), 'Unsupported', 'Inherited object keys cannot bypass image type validation');
  const malformedImage = { assets: [{ href: 'icon.png', mediaType: 'image/png', data: new Uint8Array([1, 2, 3]) }] };
  await rejects(() => generatePublicationEpub(book, malformedImage), 'image', 'Invalid raster signature must be rejected');
  const svgBook = { ...book, sections: [{ id: 'svg', title: 'SVG image', category: 'Test', content: '![A diagram](diagram.svg)' }] };
  const svgSource = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><path d="M0 0L2 2" stroke="red"/></svg>';
  const svgBlob = await generatePublicationEpub(svgBook, { assets: [{ href: 'diagram.svg', mediaType: 'image/svg+xml', data: new TextEncoder().encode(svgSource) }] });
  const unsafeSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><image href="https://example.org/tracker.png"/></svg>';
  await rejects(() => generatePublicationEpub(svgBook, { assets: [{ href: 'diagram.svg', mediaType: 'image/svg+xml', data: new TextEncoder().encode(unsafeSvg) }] }), 'SVG', 'Unsafe SVG assets must be rejected');
  for (const unsafe of [
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
    '<svg xmlns="http://www.w3.org/2000/svg"><path style="fill:red"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://example.org/a.svg#x"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(https://example.org/a.svg#x)"/></svg>',
    '<!DOCTYPE svg [<!ENTITY x "text">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>',
  ]) await rejects(() => generatePublicationEpub(svgBook, { assets: [{ href: 'diagram.svg', mediaType: 'image/svg+xml', data: new TextEncoder().encode(unsafe) }] }), 'SVG', 'SVG event/CSS/external/entity payload rejected');
  await generatePublicationEpub(svgBook, { assets: [{ href: 'diagram.svg', mediaType: 'image/svg+xml', data: new Blob([svgSource]) }] });
  await generatePublicationEpub(book, { assets: [{ href: 'icon.png', mediaType: 'image/png', data: png.buffer }] });
  checks.push('duplicate IDs, unknown chapter routes, invalid image bytes, SVG scripts/events/CSS/external references/entities rejected; Blob and ArrayBuffer assets supported');
  const archives = [{ name: 'rich-fixture', base64: await asBase64(blob) }, { name: 'svg-asset', base64: await asBase64(svgBlob) }];
  const imageReferences = [];
  for (const original of books) {
    const hrefs = new Set();
    const walk = sections => { for (const section of sections) {
      const doc = new DOMParser().parseFromString(renderPublicationContent(section.content, section.format), 'text/html');
      for (const image of doc.querySelectorAll('img[src]')) hrefs.add(image.getAttribute('src'));
      walk(section.children ?? []);
    } };
    walk(original.sections);
    imageReferences.push({ book: original.id, hrefs: [...hrefs] });
    const assets = Object.entries(realAssets).map(([href, value]) => ({ href, mediaType: value.mediaType, data: Uint8Array.from(atob(value.base64), c => c.charCodeAt(0)) }));
    if ([...hrefs].every(href => realAssets[href])) {
      const realBlob = await generatePublicationEpub(original, { assets });
      const realZip = await JSZip.loadAsync(await realBlob.arrayBuffer());
      const sections = [];
      const flatten = values => { for (const section of values) { sections.push(section); flatten(section.children ?? []); } };
      flatten(original.sections);
      for (let index = 0; index < sections.length; index++) {
        const section = sections[index];
        const expected = new DOMParser().parseFromString(renderPublicationContent(section.content, section.format), 'text/html').body;
        const actual = xml(await realZip.file(`OEBPS/Text/chapter-${String(index + 1).padStart(4, '0')}.xhtml`).async('string')).getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'body')[0];
        assert(actual.textContent === (section.content.trim() ? expected.textContent : section.title), `Exact sanitised chapter text retained: ${original.id}/${section.id}`);
        for (const tag of ['table', 'img', 'pre', 'svg', 'math']) assert(actual.getElementsByTagName(tag).length === expected.getElementsByTagName(tag).length, `Rich element count retained: ${original.id}/${section.id}/${tag}`);
      }
      archives.push({ name: original.id, base64: await asBase64(realBlob) });
      checks.push(`real book exported with exact chapter text and rich element counts: ${original.id} (${sections.length} sections)`);
    } else {
      await rejects(() => generatePublicationEpub(original), [...hrefs].find(href => !realAssets[href]), 'Real-book missing resources must be explicit');
      checks.push(`real book reports missing assets: ${original.id}`);
    }
  }
  // Exercise the real download action with one browser-created object URL.
  await downloadPublicationEpub({ ...book, sections: [] });
  checks.push('download action completed');
  return { checks, imageReferences, archives };
};
async function rejects(fn, expected, message) {
  let error; try { await fn(); } catch (failure) { error = String(failure); }
  assert(error?.toLowerCase().includes(expected.toLowerCase()), `${message}: ${error ?? 'resolved unexpectedly'}`);
}
