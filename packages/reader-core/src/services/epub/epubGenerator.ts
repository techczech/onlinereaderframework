import JSZip from 'jszip';
import { SectionConfig } from '../../types';

export async function generateEpub(sections: SectionConfig[], title: string) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  zip.folder('META-INF')?.file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`
  );

  const oebps = zip.folder('OEBPS');
  if (!oebps) return;

  const manifestItems: string[] = [];
  const spineItems: string[] = [];
  const navPoints: string[] = [];

  sections.forEach((section, index) => {
    const fileName = `section-${index + 1}.xhtml`;
    const html = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>${section.title}</title>
  </head>
  <body>
    <h1>${section.title}</h1>
    ${section.blocks.map((block) => renderBlock(block)).join('\n')}
  </body>
</html>`;

    oebps.file(fileName, html);
    manifestItems.push(`<item id="item-${index + 1}" href="${fileName}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="item-${index + 1}"/>`);
    navPoints.push(
      `<navPoint id="nav-${index + 1}" playOrder="${index + 1}">
  <navLabel><text>${section.title}</text></navLabel>
  <content src="${fileName}"/>
</navPoint>`
    );
  });

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">urn:uuid:${crypto.randomUUID()}</dc:identifier>
  </metadata>
  <manifest>
    ${manifestItems.join('\n')}
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n')}
  </spine>
</package>`;

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${crypto.randomUUID()}" />
    <meta name="dtb:depth" content="1" />
    <meta name="dtb:totalPageCount" content="0" />
    <meta name="dtb:maxPageNumber" content="0" />
  </head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
    ${navPoints.join('\n')}
  </navMap>
</ncx>`;

  oebps.file('content.opf', contentOpf);
  oebps.file('toc.ncx', tocNcx);

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  downloadBlob(blob, `${slugify(title)}.epub`);
}

function renderBlock(block: SectionConfig['blocks'][number]) {
  if (block.type === 'text') {
    if (block.variant === 'heading') return `<h2>${escapeHtml(block.content)}</h2>`;
    if (block.variant === 'subheading') return `<h3>${escapeHtml(block.content)}</h3>`;
    if (block.variant === 'quote') return `<blockquote>${escapeHtml(block.content)}</blockquote>`;
    return `<p>${escapeHtml(block.content)}</p>`;
  }
  if (block.type === 'list') {
    const items = block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    if (block.variant === 'ordered') {
      return `<ol>${items}</ol>`;
    }
    return `<ul>${items}</ul>`;
  }
  if (block.type === 'callout') {
    return `<div><strong>${escapeHtml(block.title || '')}</strong><p>${escapeHtml(block.content)}</p></div>`;
  }
  return '';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
