/** Adapted from the actual Language Muscle EPUB 3 service and DP EPUB generator. See README.md. */
import JSZip from 'jszip';
import { publicationDisplayTitle } from '../../original/publication-model.js';
import { validateEpubReferences } from './epub-references.js';
import type { PublicationBook, PublicationSection } from '../../original/types.js';
import { addTextElement, appendPublicationContent, createXhtml, escapeXml, MATH_NS, parseXml, requireBrowserXml, serializeXml, SVG_NS, XHTML_NS } from './epub-xhtml.js';
import { assertTotalAssetSize, prepareAsset, type PreparedAsset, type PublicationEpubOptions } from './epub-assets.js';
export type { PublicationEpubAsset, PublicationEpubImageType, PublicationEpubOptions } from './epub-assets.js';

interface Chapter {
  section: PublicationSection;
  filename: string;
  id: string;
  children: Chapter[];
  document?: Document;
  properties?: string[];
}

// Language Muscle's preorder flattening and recursive TOC are retained. Paths
// and manifest IDs now come from traversal positions, never source identifiers.
function flattenSectionsForEpub(sections: PublicationSection[]): { roots: Chapter[]; flat: Chapter[]; byId: Map<string, Chapter> } {
  const flat: Chapter[] = [];
  const byId = new Map<string, Chapter>();
  const visit = (items: PublicationSection[]): Chapter[] => items.map(section => {
    if (!section.id || byId.has(section.id)) throw new Error(`Duplicate or empty publication section ID: ${section.id}`);
    const id = `chapter-${String(flat.length + 1).padStart(4, '0')}`;
    const chapter: Chapter = { section, id, filename: `Text/${id}.xhtml`, children: [] };
    byId.set(section.id, chapter);
    flat.push(chapter);
    chapter.children = visit(section.children ?? []);
    return chapter;
  });
  return { roots: visit(sections), flat, byId };
}

const stylesheet = `
body { font-family: serif; line-height: 1.5; margin: 0; padding: 1em; }
h1 { color: #047857; font-size: 2em; margin-bottom: .5em; }
h2 { color: #334155; font-size: 1.5em; margin-top: 1.5em; }
h3 { color: #334155; font-size: 1.25em; margin-top: 1.2em; }
p, ul, ol { margin-bottom: 1em; } ul, ol { padding-left: 1.5em; }
li { margin-bottom: .5em; }
blockquote { border-left: 4px solid #6ee7b7; padding-left: 1em; color: #475569; font-style: italic; margin: 1em 0; }
a { color: #059669; text-decoration: underline; }
table { width: 100%; border-collapse: collapse; margin: 1em 0; }
th, td { border: 1px solid #cbd5e1; padding: .5em; text-align: left; }
th { background-color: #f1f5f9; }
aside, .aside { background-color: #f3f4f6; border-left: 4px solid #6366f1; padding: 1em; margin: 2em 0; font-style: italic; color: #4b5563; break-inside: avoid; }
img, svg { max-width: 100%; height: auto; } pre { white-space: pre-wrap; overflow-wrap: anywhere; }
.footnotes { font-size: .9em; } .title-page { text-align: center; }
`;

function safeSourceLink(document: Document, parent: Element, label: string, href: string): void {
  const paragraph = addTextElement(document, parent, 'p', label + ' ');
  try {
    const url = new URL(href);
    if (!['https:', 'http:'].includes(url.protocol) || /[%\s"'<>\\^|]/.test(url.hostname)) throw new Error();
    const anchor = addTextElement(document, paragraph, 'a', href);
    anchor.setAttribute('href', url.href);
  } catch { addTextElement(document, paragraph, 'span', href); }
}

function createIntroduction(book: PublicationBook, language: string): string {
  const document = createXhtml(publicationDisplayTitle(book), language, 'style.css');
  const body = document.getElementsByTagNameNS(XHTML_NS, 'body')[0];
  const titlePage = addTextElement(document, body, 'div', '');
  titlePage.setAttribute('class', 'title-page');
  addTextElement(document, titlePage, 'h1', book.title);
  if (book.subtitle) addTextElement(document, titlePage, 'h2', book.subtitle);
  addTextElement(document, titlePage, 'p', book.author);
  if (book.description) addTextElement(document, body, 'p', book.description);
  if (book.home?.authorNote) addTextElement(document, body, 'p', book.home.authorNote);
  if (book.sourceUrl) safeSourceLink(document, body, 'Source:', book.sourceUrl);
  if (book.home?.license) safeSourceLink(document, body, book.home.license.label, book.home.license.href);
  return serializeXml(document);
}

function rewriteChapterLinks(chapter: Chapter, byId: Map<string, Chapter>, book: PublicationBook): void {
  // A base is only needed to interpret routes. It never becomes an external URL
  // when the host has not supplied its real source URL.
  const base = new URL(book.sourceUrl ?? 'https://publication.invalid/reader');
  for (const anchor of Array.from(chapter.document!.getElementsByTagNameNS(XHTML_NS, 'a'))) {
    const href = anchor.getAttribute('href') ?? '';
    if (href.startsWith('#') && !href.startsWith('#/')) continue;
    if (!href) { anchor.removeAttribute('href'); continue; }
    let url: URL;
    try { url = new URL(href, base); } catch { anchor.removeAttribute('href'); continue; }
    const sameBook = !url.searchParams.has('book') || url.searchParams.get('book') === book.id;
    const sameLocation = book.sourceUrl ? url.origin === base.origin && url.pathname === base.pathname
      : href.startsWith('?') || href.startsWith('#/');
    const legacy = url.hash.startsWith('#/');
    const route = sameBook && sameLocation && (href.startsWith('?') || legacy || url.searchParams.has('section') || url.searchParams.has('book'));
    if (!route) {
      try {
        if (!book.sourceUrl) new URL(href);
        if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) throw new Error();
        if (['http:', 'https:'].includes(url.protocol) && /[%\s"'<>\\^|]/.test(url.hostname)) throw new Error();
        anchor.setAttribute('href', url.href);
      } catch {
        // Retain the real source's malformed citation text without an invalid URL.
        anchor.removeAttribute('href');
      }
      continue;
    }
    let id = url.searchParams.get('section');
    let requested = legacy ? '' : url.hash.slice(1);
    if (legacy) {
      const [encodedId, ...fragments] = url.hash.slice(2).split('#');
      try { id = decodeURIComponent(encodedId.split('?')[0]); }
      catch { throw new Error(`Invalid publication chapter link: ${href}`); }
      requested = fragments.join('#');
    }
    if (!id || id === 'home') {
      if (requested) throw new Error(`Publication home link targets a missing fragment: ${href}`);
      anchor.setAttribute('href', '../intro.xhtml');
      continue;
    }
    const target = byId.get(id);
    if (!target) throw new Error(`Publication chapter link targets a section outside the EPUB: ${id}`);
    let fragment = '';
    if (requested) {
      try { requested = decodeURIComponent(requested); } catch { throw new Error(`Invalid publication fragment: ${href}`); }
      const targets = Array.from(target.document!.querySelectorAll('[id]'));
      const found = targets.find(element => element.id === requested) ?? targets.find(element => element.id === 'reader-content-' + requested);
      if (!found) throw new Error(`Publication chapter link targets a missing fragment: ${href}`);
      fragment = '#' + encodeURIComponent(found.id);
    }
    anchor.setAttribute('href', target.filename.slice('Text/'.length) + fragment);
  }
}

/** Generate a self-contained EPUB 3 Blob in a browser, with no network requests. */
export async function generatePublicationEpub(book: PublicationBook, options: PublicationEpubOptions = {}): Promise<Blob> {
  requireBrowserXml();
  if (!book.id.trim() || !book.title.trim() || !book.author.trim()) throw new Error('Publication EPUB requires a book ID, title and author.');
  const language = book.language ?? 'en';
  if (!/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(language)) throw new Error(`Invalid publication language: ${language}`);
  const { roots, flat, byId } = flattenSectionsForEpub(book.sections);
  const supplied = new Map((options.assets ?? []).map(asset => [asset.href, asset]));
  if (supplied.size !== (options.assets ?? []).length) throw new Error('Duplicate EPUB supplied asset href.');
  const embedded = new Map<string, PreparedAsset>();

  for (const chapter of flat) {
    chapter.document = createXhtml(chapter.section.title, language, '../style.css');
    appendPublicationContent(chapter.document, chapter.section.content ?? '', chapter.section.format ?? 'markdown');
    if (!chapter.section.content.trim()) {
      addTextElement(chapter.document, chapter.document.getElementsByTagNameNS(XHTML_NS, 'body')[0], 'h1', chapter.section.title);
    }
    chapter.properties = [];
    if (chapter.document.getElementsByTagNameNS(SVG_NS, 'svg').length) chapter.properties.push('svg');
    if (chapter.document.getElementsByTagNameNS(MATH_NS, 'math').length) chapter.properties.push('mathml');
    for (const image of Array.from(chapter.document.getElementsByTagNameNS(XHTML_NS, 'img'))) {
      const href = image.getAttribute('src');
      if (!href) throw new Error(`EPUB image has no safe source in section: ${chapter.section.id}`);
      if (!embedded.has(href)) {
        const asset = supplied.get(href);
        if (!asset) throw new Error(`EPUB image requires explicitly supplied bytes; no network request was made: ${href}`);
        embedded.set(href, await prepareAsset(asset, embedded.size));
        assertTotalAssetSize([...embedded.values()]);
      }
      image.setAttribute('src', '../' + embedded.get(href)!.filename);
      image.removeAttribute('loading');
      for (const dimension of ['width', 'height']) {
        const value = image.getAttribute(dimension);
        if (value === null) continue;
        const pixels = value.match(/^(\d+)(?:px)?$/);
        if (pixels) image.setAttribute(dimension, pixels[1]);
        else image.removeAttribute(dimension);
      }
      if (!image.hasAttribute('alt')) image.setAttribute('alt', '');
    }
  }
  for (const chapter of flat) rewriteChapterLinks(chapter, byId, book);

  const zip = new JSZip();
  // Language Muscle/DP: mimetype first and stored, followed by the container.
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.folder('META-INF')!.file('container.xml', `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  const oebps = zip.folder('OEBPS')!;
  oebps.file('style.css', stylesheet);
  oebps.file('intro.xhtml', createIntroduction(book, language));
  for (const chapter of flat) oebps.file(chapter.filename, serializeXml(chapter.document!));
  for (const asset of embedded.values()) oebps.file(asset.filename, asset.bytes);

  // Original Language Muscle createNavLi recursion, using escaped labels and
  // traversal-generated hrefs instead of interpolating unsafe section IDs.
  const createNavLi = (chapter: Chapter): string => `<li><a href="${chapter.filename}">${escapeXml(chapter.section.title)}</a>${chapter.children.length ? `<ol>${chapter.children.map(createNavLi).join('')}</ol>` : ''}</li>`;
  oebps.file('nav.xhtml', `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="${XHTML_NS}" xmlns:epub="http://www.idpf.org/2007/ops" lang="${escapeXml(language)}" xml:lang="${escapeXml(language)}"><head><title>${escapeXml(publicationDisplayTitle(book))} — Table of Contents</title></head><body><nav epub:type="toc" id="toc"><h1>Table of Contents</h1><ol><li><a href="intro.xhtml">${escapeXml(publicationDisplayTitle(book))}</a></li>${roots.map(createNavLi).join('')}</ol></nav></body></html>`);
  const manifestItems = flat.map(chapter => `<item id="${chapter.id}" href="${chapter.filename}" media-type="application/xhtml+xml"${chapter.properties!.length ? ` properties="${chapter.properties!.join(' ')}"` : ''}/>`).join('\n');
  const assetItems = [...embedded.values()].map((asset, index) => `<item id="asset-${index + 1}" href="${asset.filename}" media-type="${asset.mediaType}"/>`).join('\n');
  const spineItems = flat.map(chapter => `<itemref idref="${chapter.id}"/>`).join('\n');
  const modified = new Date().toISOString().split('.')[0] + 'Z';
  oebps.file('content.opf', `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escapeXml(publicationDisplayTitle(book))}</dc:title><dc:creator>${escapeXml(book.author)}</dc:creator><dc:language>${escapeXml(language)}</dc:language><dc:identifier id="BookId">urn:publication:${escapeXml(encodeURIComponent(book.id))}</dc:identifier><dc:description>${escapeXml(book.description)}</dc:description>${book.sourceUrl ? `<dc:source>${escapeXml(book.sourceUrl)}</dc:source>` : ''}${book.home?.license ? `<dc:rights>${escapeXml(book.home.license.label)}</dc:rights>` : ''}<meta property="dcterms:modified">${modified}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="style" href="style.css" media-type="text/css"/><item id="intro" href="intro.xhtml" media-type="application/xhtml+xml"/>${manifestItems}${assetItems}</manifest><spine><itemref idref="intro"/>${spineItems}</spine></package>`);
  // Validate the final serialised documents, after content, route and asset rewrites.
  const documents = new Map<string, Document>();
  for (const [path, file] of Object.entries(zip.files)) {
    if (/\.(xhtml|svg)$/.test(path)) documents.set(path, parseXml(await file.async('string'), path));
  }
  validateEpubReferences(documents);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE' });
}

/** Download the generated Blob; rejection is left to the host UI to display. */
export async function downloadPublicationEpub(book: PublicationBook, options: PublicationEpubOptions = {}): Promise<void> {
  const blob = await generatePublicationEpub(book, options);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const name = publicationDisplayTitle(book).normalize('NFKC').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-').slice(0, 100) || 'publication';
  anchor.href = url;
  anchor.download = `${name}.epub`;
  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Give browser download consumers a turn to read the object URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
