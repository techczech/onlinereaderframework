# Online Reader Framework source review draft

**Unreleased review draft. No software licence has been selected.** This local candidate does not authorise publication or grant a software licence. The real public scope remains for the author to choose.

This export contains the existing React reader core, its TypeScript/TSX source, original CSS, standalone build inputs and generic Node regressions. Consumers supply their own publication data. No real books, demo application or example book is distributed.

## Install, build and check

Verified toolchain: Node 26.12.1 and npm 11.20.0. The content plugin requires Node 22 or later. Run from this source directory:

```sh
npm run setup
npm run build
npm test
npm run test:native
```

Setup installs only the core package, from its lockfile, with lifecycle scripts disabled. Build produces JavaScript, declarations, reader.css, local fonts and their notices inside packages/reader-core/dist. It does not require demos, manuscripts or original application checkouts. React and React DOM peers support ^18.3.1 or ^19.2.0. Installed consumers were verified on React 18.3.1 and 19.2.0, including strict host types and browser interactions; the core development environment remains on React 18. Both manifests retain private: true and their current versions; no registry release is configured.

## Use the built package

Import PublicationReader and its PublicationBook/PublicationSection types from reader-core. Import reader-core/reader.css once in the host. The package also retains ReaderShell, parseMarkdownToSections, parsing/search/export utilities, renderPublicationContent, publicationContentToText, getPublicationHeadings, generateEpub, generatePublicationEpub and downloadPublicationEpub. Inspect src/index.ts and exported types for their exact contracts. A host can install the built directory as a local file dependency.

PublicationReader accepts a book with a stable id, title, author, description and recursive sections. Each section supplies id, title, category, content and an optional markdown/html format. Section IDs must be unique; home is reserved. The host supplies book-specific home text, source/attribution, licence credits, download links and optional EPUB image bytes. No book's licence or text is assigned to another book.

Query section routes and legacy hash routes preserve book identity and unrelated host parameters. A host choosing among books must restore book selection on browser history changes. Progress, settings, bookmarks, highlights and reflections use book-specific browser localStorage keys. The notes drawer exports Markdown and deletes individual highlights or reflections; blocked storage retains session-only reading. Coaching appears only when the host supplies the optional render boundary; core has no credential or AI service client.

The shared renderer preserves sanitised rich HTML/Markdown, tables, footnotes, static SVG and MathML. EPUB generation needs browser DOMParser and XMLSerializer. Referenced images require explicitly supplied bytes; generation makes no network requests. Native Node can import the package, while browser-only generation rejects clearly.

## Origin and licensing

The publication reader adapts the actual Deliberate Practice application components and Language Muscle recursive navigation and EPUB construction. Existing framework components remain in place. See provenance-reader-source.json for original component-relative filenames, recorded source hashes and the exact exported input hashes. Adaptations retain the existing design while generalising book identity, persistence, content rendering and export boundaries.

See LICENSING.md for the current licensing status. Third-party font notices copied from the actual standalone build are under packages/reader-core/notices; build reproduces them with the fonts. Dependencies are fetched from the reviewed lockfile rather than vendored here. This source draft has not received final public-release approval.
