---
name: "Online Reader Framework"
description: "Provides a reusable way to turn Markdown into a clean, readable web publication."
categories: [content-distribution, web-app, built-by-ai]
updated: 2026-10-23
deployments:
  Appsite:
    "Online Reader Framework": https://onlinereader.pages.dev/
---
# Online Reader Framework

The shared reader is being upgraded using the actual **Deliberate Practice** and **Building Your Language Muscle** application code. Their designed reading experience is the baseline: typography, navigation, reading controls, annotations and sharing. The original applications remain unchanged.

The previous generic reader API remains available for compatibility. The new publication reader accepts Markdown or HTML sections and nested books directly, without flattening rich source content into the old block format.

## Run locally

```sh
npm run setup
npm run build
npm run dev
```

The demonstration contains read-only snapshots of three real publications. Choose one with the URL query parameter:

- `?book=deliberate-practice` opens the original Deliberate Practice content.
- `?book=language-muscle` opens Language Muscle's nested HTML chapters.
- `?book=linguistics` opens nine themes and 253 answers with source attribution.

The snapshots are demonstration content, separate from the reusable software package. The source comparison script verifies every recorded hash and original chapter object; home-copy adapters refuse changed original homes until their wording is reviewed. Regeneration instructions and source hashes live beside the demo in `apps/reader-demo/src/books/` and `apps/reader-demo/scripts/`. No editorial proposals have been applied by this framework upgrade.

## Use the original publication reader

```tsx
import { PublicationReader, type PublicationBook } from 'reader-core';
import 'reader-core/reader.css';

const book: PublicationBook = {
  id: 'your-stable-book-id',
  title: 'Your book title',
  author: 'Your author name',
  description: 'Your existing introduction.',
  sections: [
    { id: 'introduction', title: 'Introduction', category: 'Getting started',
      content: '# Introduction\n\nYour existing chapter.', format: 'markdown' }
  ]
};

export default function App() {
  return <PublicationReader book={book} />;
}
```

The original ebook buttons generate a self-contained EPUB in the browser. Books with images supply their bytes through `epub={{ assets: [{ href, mediaType, data }] }}`; the exporter makes no hidden image requests. Set `epub={false}` to disable generated ebooks, or provide prebuilt links in `book.downloads`. The demo embeds the original practice-book icon explicitly. Unknown image rights remain a release question for the book distribution.

The core receives content; it does not fetch manuscripts or call AI services. Stable book IDs isolate saved reading data. Section IDs must be unique within each book; `home` is reserved. Sections may have recursive `children`; `format` may be `markdown` or `html`. Optional home copy, concept cards, downloads, attribution and licence are supplied by the publication.

## Build and verification

`npm run build` builds both the core package and the source-linked demonstration, including the original reader stylesheet and locally bundled fonts and icons. `npm test` runs the content, routing, storage and real-book regressions. `npm run test:books` checks real-book completeness, identities, internal links, source attribution and provenance. Content and interaction checks are recorded with the upgrade evidence; package-consumer verification is separate from source-linked verification.

The core remains private. This upgrade prepares a public release; it does not publish a package, deploy a site or change repository visibility. The release plan records remaining licensing and release decisions before any public distribution.

## Project map

- `packages/reader-core/src/original/` contains components extracted from the original applications and their provenance.
- `packages/reader-core/src/publication-content/` provides sanitised rich Markdown and HTML rendering.
- `apps/reader-demo/` integrates the real books.
- `scripts/build-reader-styles.mjs` packages the original reader styling, fonts, icons and font notices.
- [Original-code upgrade contract](docs/plan-original-reader-upgrade-2026-10-23.md) records the selected design and implementation boundaries.
- [Architecture review](docs/review-original-reader-architecture-2026-10-23.md) records the initial integration risks.
- [Existing API integration](docs/REUSE.md) documents the earlier block-based API; its generic interface is not the design baseline for this upgrade.

The previously deployed demo predates this work. Local build success and technical checks do not constitute author acceptance of the upgraded interface.
