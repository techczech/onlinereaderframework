---
title: Reusable publication EPUB export
status: implemented-and-verified
date: 2026-10-23
---

# Reusable publication EPUB export

- The exporter adapts the actual Language Muscle EPUB 3 algorithm and selected Deliberate Practice code.
- Rich content comes from the shared sanitised publication renderer, and all embedded images require supplied bytes.
- All three real publications and two rich-content fixtures passed archive, XML and EPUBCheck validation on 23 October 2026.

## API

This folder's `index.ts` exports:

```ts
generatePublicationEpub(book: PublicationBook, options?: PublicationEpubOptions): Promise<Blob>
downloadPublicationEpub(book: PublicationBook, options?: PublicationEpubOptions): Promise<void>

interface PublicationEpubOptions {
  assets?: readonly PublicationEpubAsset[];
}
interface PublicationEpubAsset {
  href: string;
  role?: 'cover';
  mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/svg+xml';
  data: Blob | Uint8Array | ArrayBuffer;
}
```

`PublicationEpubOptions`, `PublicationEpubAsset` and `PublicationEpubImageType` are exported types. `PublicationBook` comes from `../../original/types.ts`. The optional language field supplies OPF and XHTML language; the default is `en`. The exporter creates one stable `urn:publication:` identifier from the book ID. The introduction preserves the supplied title, subtitle, author, description, author note, source URL and licence credit.

**Generation requires a browser.** DOMParser and XMLSerializer create and validate namespace-aware XHTML. Raster validation also uses createImageBitmap. Importing the module without DOM globals succeeds; generation then rejects with a browser requirement. The download function uses a temporary object URL and a filename derived from the book title. Errors propagate to the host reader's UI.

## Actual source reuse

The read-only original Language Muscle file is `/Users/dominiklukes/worktrees/guides/building-your-language-muscle/services/epubService.ts`. This module retains its JSZip EPUB 3 construction sequence: first uncompressed mimetype, container, OEBPS chapters, recursive navigation, OPF manifest and preorder spine, followed by Blob generation. `flattenSectionsForEpub` preserves the recursive preorder algorithm. `createNavLi` preserves the recursive nested-list algorithm, including chapters for empty parent sections. The serif typography, green headings and links, blockquotes and table rules derive from its `createChapterContent` stylesheet. Browser object-URL download also derives from this source.

The read-only original Deliberate Practice file is `/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/utils/epubGenerator.ts`. Its five-character XML escaping is retained in `escapeXml`, with invalid XML 1.0 characters removed first. Its separate stylesheet, generalised introduction/title page, and aside styling are adapted here. Source-file SHA-256 values are retained in `report-publication-epub-verification.json`.

Necessary adaptations replace hardcoded book identity with `PublicationBook`; source-derived ZIP paths and manifest IDs with stable traversal-generated names; the original regex XHTML cleanup and Markdown conversion with `renderPublicationContent` plus DOM-to-XML copying; and the original EPUB 2 NCX with Language Muscle's EPUB 3 navigation. No second Markdown renderer or new dependency was introduced.

The XHTML copy preserves tables, code, paired footnote IDs and backlinks, inline SVG and MathML namespaces. SVG and MathML chapters receive the corresponding OPF manifest properties. Footnote references and notes also receive EPUB semantic types. `#/section` and encoded section routes become links to included chapter files; optional heading fragments resolve to the shared renderer's IDs. Missing chapter or heading targets and duplicate section IDs produce explicit errors.

Two source defects required narrow EPUB adaptations. Deliberate Practice's image width `40px` becomes the valid XHTML integer `40`. Linguistics includes the malformed URL `http://%20Lucien%20Tensiere's`; its visible citation text is retained and its invalid hyperlink removed. Other malformed external links follow the same rule. Relative hyperlinks resolve against the supplied source URL; links that cannot be resolved retain their text without an href.

## Supplied images and limits

**The exporter makes no network requests.** Each rendered image `src` must match an asset's `href` exactly. Referenced images without supplied bytes reject the export and report their source href. Supplied but unreferenced assets are not embedded. Each referenced resource is embedded once, under a generated filename, and added to the OPF manifest. Data-URI images are excluded by the shared renderer's policy.

PNG, JPEG and GIF bytes must have matching signatures and decode successfully in the browser. Each resource is limited to 20 MiB; embedded resources together are limited to 100 MiB. Raster dimensions are limited to 64 million pixels and 32768 pixels per side.

SVG assets are validated as UTF-8 XML against a static diagram subset. Paths, shapes, text, groups, gradients, clipping, masks, patterns, markers and local fragment references are supported. Scripts, events, styles, animation, embedded HTML, external references, entity declarations and processing instructions are rejected. This intentionally excludes SVG files that require CSS or external resources. Inline SVG and MathML continue to follow the shared content renderer's sanitisation policy.

The complete image inventory from the current real publications is:

- Deliberate Practice references `https://www.notion.so/icons/command-line_gray.svg`.
- Language Muscle has no referenced image resources; its inline SVG remains in the chapter XHTML.
- Linguistics has no referenced image resources.

The parent supplied the original Notion icon bytes through `build/reader-epub-assets.json`. Its current demo source is `apps/reader-demo/src/books/assets/command-line_gray.svg`. The test does not fetch this URL. The parent retains source/rights provenance; public redistribution of that icon remains a release decision. Fonts, audio, video and other media types are outside this asset contract.

## Verification receipt

From the repository root, run:

```sh
node packages/reader-core/src/services/publication-epub/verify-publication-epub.mjs build/reader-epub-assets.json
```

The optional JSON argument maps exact source hrefs to `{ mediaType, base64 }`. Without that argument, the test verifies Deliberate Practice's explicit missing-resource error and still exports the two publications without external images. The harness uses the existing demo esbuild dependency, the sibling book-engine Python venv, existing bundled Chromium headless shell, and installed EPUBCheck. Scratch bundles and archives are created inside this folder and removed on success or failure.

The final run passed all five archives: the rich XHTML fixture, the standalone supplied-SVG fixture, Deliberate Practice (21 sections), Language Muscle (12 sections), and Linguistics (262 sections, including its nine theme containers). Each archive passed ZIP structure, manifest/resource presence, XML parsing and EPUBCheck, with **zero fatals, errors, warnings or informational messages**. Every real chapter retained exactly the shared renderer's text and counts of tables, images, code blocks, SVG and MathML elements. The fixture also verified escaped metadata, unique safe chapter paths, nested navigation, encoded cross-chapter heading links, paired footnotes and their backlinks, and valid image dimensions.

Negative checks rejected missing image bytes, invalid raster bytes, unsupported media types, duplicate section IDs, unknown chapter routes, and SVG script/event/CSS/external-resource/entity payloads. Blob, Uint8Array and ArrayBuffer asset inputs worked. A real browser download event completed, and the browser recorded **zero network requests**. A bundled Node import succeeded without DOM globals, and browser-only generation rejected clearly. A no-emit core TypeScript check passed during implementation.

`report-publication-epub-verification.json` records runtime versions, source hashes, archive hashes/sizes, exact image hrefs and full EPUBCheck results. ZIP timestamps and OPF modification time mean separate exports need not have identical hashes. Temporary test archives were removed after inspection. These checks verify the service and generated ebooks; the parent owns package integration and reader UI acceptance. Only files in this service folder were changed by this implementation, with no dependency, shared manifest, original-source or Git changes.

## Optional cover

Supply one asset with `role: 'cover'` to add a cover image, a first spine XHTML page and a navigation landmark. The image receives the EPUB 3 `cover-image` manifest property. The href is a host-owned identifier, never fetched. Cover bytes pass the same format, SVG, dimension and size validation as chapter images and count towards the total limit. A cover also used by a chapter is embedded once. Duplicate cover roles and duplicate hrefs reject. Without a cover role the existing output structure is preserved.

```ts
await downloadPublicationEpub(book, { assets: [{
  href: 'cover:my-book', role: 'cover', mediaType: 'image/jpeg',
  data: vettedJpegBytes, // Uint8Array supplied by the host
}] });
```
