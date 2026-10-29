import { generatePublicationEpub, downloadPublicationEpub } from './index.js';
import { assertTotalAssetSize } from './epub-assets.js';
import JSZip from 'jszip';
import { renderPublicationContent } from '../../publication-content/index.js';
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const xml = async (zip, name) => new DOMParser().parseFromString(await zip.file(name).async('string'), 'application/xml');
const text = html => { const div = document.createElement('div'); div.innerHTML = html; return div.textContent.replace(/\s+/g, ' ').trim(); };
const digest = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
const flatten = sections => sections.flatMap(s => [s, ...flatten(s.children ?? [])]);
window.coverOptions = id => ({ assets: [{ href: `cover:${id}`, role: 'cover', mediaType: 'image/jpeg', data: Uint8Array.from(atob(window.coverFixtures[id].base64), c => c.charCodeAt(0)) }] });
window.downloadCoverBook = id => downloadPublicationEpub(window.coverFixtures[id].book, window.coverOptions(id));
window.checkCoverZip = async (base64, id, covered = true) => {
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const fixture = window.coverFixtures[id];
  const opf = await xml(zip, 'OEBPS/content.opf');
  const cover = opf.querySelector('item[properties="cover-image"]');
  assert(Boolean(cover) === covered, 'Cover manifest role');
  if (covered) {
    assert(cover.getAttribute('media-type') === 'image/jpeg', 'JPEG MIME');
    const bytes = await zip.file('OEBPS/' + cover.getAttribute('href')).async('uint8array');
    assert(bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255, 'JPEG signature');
    assert(await digest(bytes) === fixture.sha256, 'Exact selected cover hash');
    const page = await xml(zip, 'OEBPS/cover.xhtml');
    assert(page.querySelector('img').getAttribute('src') === cover.getAttribute('href'), 'Cover XHTML image reference');
    assert(opf.querySelector('item[id="cover-page"]').getAttribute('href') === 'cover.xhtml', 'Cover page manifest');
    assert(opf.querySelector('spine itemref').getAttribute('idref') === 'cover-page', 'Cover first in spine');
    const nav = await xml(zip, 'OEBPS/nav.xhtml');
    assert(nav.querySelector('a[href="cover.xhtml"]'), 'Cover landmark');
  } else assert(!zip.file('OEBPS/cover.xhtml'), 'No cover page by default');
  const sections = flatten(fixture.book.sections);
  assert(sections.length === fixture.chapters, 'Expected actual chapter count');
  assert(Object.keys(zip.files).filter(p => /^OEBPS\/Text\/chapter-\d+.xhtml$/.test(p)).length === fixture.chapters, 'Archive chapter count');
  for (const [i, section] of sections.entries()) {
    const doc = await xml(zip, `OEBPS/Text/chapter-${String(i + 1).padStart(4, '0')}.xhtml`);
    assert(text(doc.documentElement.querySelector('body').innerHTML) === text(renderPublicationContent(section.content, section.format ?? 'markdown')), `Source text ${section.id}`);
  }
  return { id, covered, chapters: sections.length, zipSha256: await digest(await zip.generateAsync({ type: 'arraybuffer' })) };
};
window.coverNegatives = async () => {
  const fixture = Object.values(window.coverFixtures)[0];
  const asset = window.coverOptions(fixture.book.id).assets[0];
  const reject = async (assets, expected) => {
    let error = '';
    try { await generatePublicationEpub(fixture.book, { assets }); } catch (e) { error = String(e); }
    assert(error.includes(expected), `Expected ${expected}: ${error}`);
  };
  await reject([asset, { ...asset, href: 'other' }], 'Duplicate EPUB cover role');
  await reject([asset, asset], 'Duplicate EPUB supplied asset href');
  await reject([{ ...asset, data: new Uint8Array() }], 'must contain');
  await reject([{ ...asset, data: new Uint8Array(20 * 1024 * 1024 + 1) }], 'must contain');
  await reject([{ ...asset, data: new Uint8Array([255, 216, 255]) }], 'cannot be decoded');
  await reject([{ ...asset, data: new Uint8Array([1, 2, 3]) }], 'do not match');
  await reject([{ ...asset, role: 'unknown' }], 'Unsupported EPUB asset role');
  await reject([{ ...asset, mediaType: 'image/svg+xml', data: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>') }], 'Unsafe SVG');
  await reject([{ ...asset, mediaType: 'image/svg+xml', data: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><use href="#missing"/></svg>') }], 'Missing SVG fragment');
  const canvas = document.createElement('canvas'); canvas.width = 32769; canvas.height = 1;
  const oversized = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  await reject([{ ...asset, mediaType: 'image/png', data: oversized }], 'pixel limit');
  let totalError = '';
  try { assertTotalAssetSize([{ bytes: new Uint8Array(100 * 1024 * 1024 + 1) }]); } catch (e) { totalError = String(e); }
  assert(totalError.includes('100 MiB'), 'Aggregate limit');
  const shared = { ...fixture.book, sections: [{ id: 'shared', title: 'Shared', content: `<img src="shared-cover.jpg" alt="">`, format: 'html' }] };
  const zip = await JSZip.loadAsync(await (await generatePublicationEpub(shared, { assets: [{ ...asset, href: 'shared-cover.jpg' }] })).arrayBuffer());
  assert(Object.keys(zip.files).filter(p => /^OEBPS\/Assets\/image-/.test(p)).length === 1, 'Shared cover/chapter embedded once');
  return { passed: true, checks: 12 };
};

window.noCoverControls = async () => {
  const results = [];
  for (const book of [...window.coverControls.books, ...Object.values(window.coverFixtures).map(f => f.book)]) {
    const assets = book.id === 'deliberate-practice' ? [{ href: 'https://www.notion.so/icons/command-line_gray.svg', mediaType: 'image/svg+xml', data: new TextEncoder().encode(window.coverControls.svg) }] : [];
    const zip = await JSZip.loadAsync(await (await generatePublicationEpub(book, { assets })).arrayBuffer());
    const opf = await xml(zip, 'OEBPS/content.opf');
    assert(!opf.querySelector('[properties="cover-image"]') && !zip.file('OEBPS/cover.xhtml'), 'Default no-cover structure');
    assert(opf.querySelector('spine itemref').getAttribute('idref') === 'intro', 'Default spine');
    assert(Object.keys(zip.files).filter(p => /^OEBPS\/Text\/chapter-\d+.xhtml$/.test(p)).length === flatten(book.sections).length, 'Control chapters');
    results.push({ id: book.id, noCover: true, chapters: flatten(book.sections).length });
  }
  return { controls: results };
};
