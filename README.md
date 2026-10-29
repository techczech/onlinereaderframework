# Online Reader Framework

Online Reader Framework is a React library that turns a book, guide or long manual into a web edition that is comfortable to read. You give it a book as plain data (title, author, and a tree of sections written in Markdown or sanitised HTML). It supplies the reader: contents, search, reading settings, highlights, notes, bookmarks, progress, read-aloud, sandboxed interactive examples, EPUB export and Markdown files for AI agents.

Version 1.1.0 ([changes](CHANGELOG.md)). Licence: [MIT](LICENSE) for the software (see [LICENSING.md](LICENSING.md) for what the licence does and does not cover). Project page: <https://techczech.github.io/onlinereaderframework/>.

The framework carries no published book; the small example book in `examples/reader-example` was written for this repository. Five editions built on the framework are live: [Deliberate Practice](https://deliberatepractice.dominiklukes.net/), [Building Your Language Muscle](https://buildingyourlanguagemuscle.edutools.fyi/), [Key Issues in Language](https://linguistics.dominiklukes.net/), [Increasing Reading Productivity](https://dominiklukes.net/books/academic-reading/) and [Foundations of Readability](https://dominiklukes.net/books/readability/). Their text is not in this repository and is not covered by its licence.

## What the reader does

- **Navigation.** A nested contents tree in a sidebar and on the front page, previous/next links, and addresses that open a section directly (`?section=<id>`). Six front-page layouts are available per book.
- **Search.** Full-text search across every section, including nested ones.
- **Reading settings.** Light, dark or system theme; font family, size, line height, paragraph and letter spacing, and text width.
- **Reading assists.** Dim other paragraphs, show a window of lines, or lay a ruler under the current line; optional anchored reading, which emphasises the first letters of each word.
- **Notes.** Highlights with notes, reflections per section, bookmarks, a progress record, Markdown export of notes, and quote images with a QR code. All of it is saved in the reader's own browser, separately for each book.
- **Listening.** Read aloud with the browser's speech synthesis, with the spoken passage highlighted. A separate panel plays audio tracks that the host supplies, with optional word alignment.
- **EPUB.** Builds an EPUB 3 file of the book in the browser.
- **Agent files.** Generates, at build time, a Markdown copy of the book (an index, one file per section, a full-text file and a JSON manifest) and a prompt, so a reader can ask an AI agent about it. The reader links to the files; it does not call any AI service.
- **Rich content.** Sanitised HTML and Markdown, tables, footnotes, static SVG and MathML.
- **Interactive examples.** A host can place a self-contained HTML document, such as a diagram or a simulator, before a passage of a chapter. It runs in a sandboxed frame. The passage is its written text version, and search, notes, read-aloud, EPUB and agent files use that text. See [Interactive examples](#interactive-examples-embeds).
- **Optional extension.** A host can mount its own coaching panel through a render function. The framework has no AI client and no credentials.

## Limits

- The reader is a front-end library. It has no server, accounts or sync: notes and progress stay in the browser's local storage, and blocked storage gives a session-only reading state.
- Read-aloud depends on the voices the reader's browser provides.
- EPUB generation needs a browser (`DOMParser` and `XMLSerializer`). Under plain Node the generator rejects with a clear error. Images are included only if the host supplies their bytes; generation makes no network requests.
- The package is not published to npm in this release. Use it from source, as described below.
- Browser-interaction checks are not part of this source release; the Node tests listed below are.
- Interactive examples need a host that can send a response header for their folder (see [Hosting](#hosting)). GitHub Pages cannot, so a GitHub Pages site should leave them out.

## Requirements

Node 22.12 or later and npm. React and React DOM, version 18.3.1 or later, or 19.2.0 or later, are peer dependencies of the host.

## Build and test from source

```sh
npm run setup      # installs packages/reader-core and examples/reader-example from their lockfiles, with lifecycle scripts disabled
npm run build      # compiles to packages/reader-core/dist: JavaScript, declarations, reader.css and local fonts
npm test           # Node tests for content, agent files, embeds, reading settings, read-aloud, listening and more
npm run test:native
```

`npm run test:native` imports the built package by name in plain Node, checks the embed functions and `reader-core/embed-child`, generates agent files for a small book and checks the browser-only EPUB boundary.

`npm run setup` passes `--min-release-age=7`, so npm refuses package versions published in the last seven days.

## Run the example book

`examples/reader-example` is a small book with a working reader. Its text is invented demonstration text, released under the MIT licence with the code. It shows chapters inside chapters, headings, lists, a table, a quotation and a footnote, the reading settings and assists, notes, read-aloud, one interactive example with its text version, an EPUB download and agent files.

```sh
npm run build            # the example uses the built package, so build it first
npm run example          # builds the example into examples/reader-example/dist
npm run test:example     # Node checks of the built example
npm run example:preview  # serves the build at http://127.0.0.1:4173/ with its hosting headers
```

`npm run example:no-embeds` builds the same book without the interactive example, for GitHub Pages and other hosts that cannot send headers. The build is static; copy `dist/` to a host. Rebuild the example after you change the package.

To make your own book, copy the folder, replace `src/example-book.mjs` with your book, and change or remove the embed registry at the end of that file.

## Use the built package

Copy or link the built `packages/reader-core` directory into your project, for example as a local file dependency:

```sh
npm install file:../onlinereaderframework/packages/reader-core
```

Import the stylesheet once and mount the reader:

```tsx
import { PublicationReader, type PublicationBook } from 'reader-core';
import 'reader-core/reader.css';

const book: PublicationBook = {
  id: 'my-guide',              // stable; namespaces every saved setting
  title: 'My Guide',
  author: 'A. Author',
  description: 'One sentence about the book.',
  sections: [
    { id: 'start', title: 'Start here', category: 'Basics', content: '# Start here\n\nSome **Markdown**.' },
    { id: 'part-1', title: 'Part one', category: 'Basics', content: 'Opening text.', children: [
      { id: 'part-1-detail', title: 'A detail', category: 'Basics', content: '<p>HTML works too.</p>', format: 'html' },
    ] },
  ],
};

export default function App() {
  return <PublicationReader book={book} />;
}
```

Section ids must be unique across the whole tree, and `home` is reserved. Each section takes `content` and an optional `format` of `markdown` (the default) or `html`. `PublicationBook` also accepts `subtitle`, `language`, `downloads`, `sourceUrl`, `labels`, `navigation` (home and sidebar depth), `appearance` (accent, paper and ink colours, masthead, cover image, front-page layout) and `home` (badge, overview text, feature cards, author note, licence link). Anything you omit gets a default. Read `packages/reader-core/src/original/types.ts` for the exact contract.

### Props

- `coaching`: optional `{ label, render }` to mount a host-owned panel.
- `audio`: optional list of audio tracks with optional alignment, for the listening panel.
- `epub`: options for EPUB export (`assets` carries image bytes), or `false` to turn the export off.
- `agent`: `{ path, siteUrl }` to show a link to generated agent files, or `false`. Off by default.
- `embeds`: a registry of interactive examples (below), or `false`. Off by default.

### The simpler Markdown reader

The package also keeps an earlier, smaller reader. `parseMarkdownToSections` splits one Markdown document into block-based sections, and `ReaderShell` displays them:

```tsx
import { ReaderShell, parseMarkdownToSections } from 'reader-core';
import 'reader-core/reader.css';

const sections = parseMarkdownToSections(markdownText, { sectionHeadingLevel: 'auto' });
export default function App() { return <ReaderShell sections={sections} />; }
```

It has its own section type and fewer features than `PublicationReader`, which is the full reader used for the live editions and the one this document describes.

### Generate agent files at build time

Run this in Node, for example in a build script. The function is pure; you decide where to write the files.

```js
import { buildAgentBook } from 'reader-core/agent';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const out = buildAgentBook(book, { siteUrl: 'https://books.example.org/reader/', directory: 'agent' });
for (const file of out.files) {
  const target = join('dist', file.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, file.content);
}
```

`siteUrl` must be a public http(s) address; credentials, queries, fragments and private hosts are refused before any file is produced. Without it, links are relative. Markdown sections are written exactly as authored; HTML sections go through the reader's sanitiser. Nothing from a reader's browser state can reach the files.

### Interactive examples (embeds)

The book's text holds the text version as one block element with an `id`. The host registers the interactive document for that element:

```tsx
import { PublicationReader, type PublicationBook, type PublicationEmbeds } from 'reader-core';

const book: PublicationBook = {
  id: 'my-guide', title: 'My Guide', author: 'A. Author', description: 'One sentence about the book.',
  sections: [{ id: 'spacing', title: 'Line spacing', category: 'Reading', format: 'html',
    content: '<div id="spacing-text"><p>A full written description of what the interactive example shows and what the reader can try in it.</p></div>' }],
};
const embeds: PublicationEmbeds = { root: 'embeds/', items: [
  { id: 'spacing', sectionId: 'spacing', anchor: 'spacing-text', src: 'spacing.html', title: 'Line spacing explorer' },
] };

export default function App() {
  return <PublicationReader book={book} embeds={embeds} />;
}
```

The file `embeds/spacing.html` is then served from the folder of the page.

The reader places a frame before the element, with a visible title, a link to skip to the text version and a link to a full view. The frame has `sandbox="allow-scripts"` and nothing else, so the document runs in an opaque origin with no access to the page, storage, cookies or pop-ups. `src` must be a plain relative `.html` path under `root` on the page's own origin. The only message the reader accepts is the frame's content height. Run `checkPublicationEmbeds(book, embeds)` at build time: it reports invalid entries, missing sections or anchors, and text versions shorter than 80 characters. The text of a chapter cannot create a frame, because the sanitiser removes `iframe` and `script`.

Write each embed as one HTML file with its script and styles inline and no network requests. To let the frame follow its height, inline `startReaderEmbedHeightReporting` from `reader-core/embed-child`; the example's `build.mjs` shows how. The full contract is in `packages/reader-core/src/embed/README.md`.

#### Hosting

The frame attribute protects the embed inside the reader, but the same file can also be opened directly. Serve the embed folder with this response header, which keeps it sandboxed when opened directly and blocks network access:

```
Content-Security-Policy: sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'
```

- **Cloudflare Pages:** the example build writes a `_headers` file with this rule, the stricter policy for the reader pages, and `!` lines that remove the reader policy from the embed folder. The live Increasing Reading Productivity and Foundations of Readability editions are served on Cloudflare Pages with the same policies. The example itself was checked with the local preview, not on Cloudflare.
- **Your own server:** send the same headers; `examples/reader-example/hosting-headers.mjs` lists them, and `serve.mjs` shows them applied.
- **Netlify:** it reads `_headers` but not the `!` lines, so it needs its own rule.
- **GitHub Pages:** it cannot send custom headers and does not read `_headers`. Use `npm run example:no-embeds`, or leave `embeds` out of your own build, so the site holds no interactive documents and every chapter shows its text version.

### Export an EPUB

```ts
import { downloadPublicationEpub } from 'reader-core';
await downloadPublicationEpub(book, { assets: [] }); // browser only
```

### Other exports

`renderPublicationContent`, `publicationContentToText`, `getPublicationHeadings`, `generatePublicationEpub`, `publicationDisplayTitle`, `FRONT_PAGE_LAYOUTS`, `ListeningPanel`, `ReadingSupportControls`, `exportHighlightsToMarkdown`, `buildLlmsText`, and for embeds `checkPublicationEmbeds`, `validatePublicationEmbeds`, `resolvePublicationEmbedUrl`, `readPublicationEmbedHeight`, `PublicationEmbedFrame`, `PublicationEmbedSlots` and `PUBLICATION_EMBED_SANDBOX`. `reader-core/embed-child` exports `startReaderEmbedHeightReporting` and `postReaderEmbedHeight` for use inside an embed document. Read `packages/reader-core/src/index.ts`.

## Repository layout

- `packages/reader-core`: the library, its lockfile and the font licence notices.
- `examples/reader-example`: the example book, its build, preview server and hosting headers.
- `scripts`: the build scripts for JavaScript, declarations, the stylesheet and fonts, and the native-import test.
- `docs`: the static project page, published with GitHub Pages from the `docs` folder of `main`.
- `provenance-reader-source.json`: where reused parts come from, and the SHA-256 of every exported file.
- `CHANGELOG.md`: what changed in each release.

## Where it comes from

The reader is the author's own work, assembled from his earlier applications: the interface of the Deliberate Practice guide, the recursive navigation and EPUB construction of the Building Your Language Muscle guide, the speech contract of ReadFlex and the anchored-reading rule of WriteFlex. `provenance-reader-source.json` records the original file names and hashes. The reading design also draws on the author's readability guidance: [Foundations of Readability](https://dominiklukes.net/books/readability/), [Increasing Reading Productivity](https://dominiklukes.net/books/academic-reading/) (the Academic Reading Framework) and [Principles of Readability](https://readabilityprinciples.notion.site).

## Licence

Software: MIT, copyright 2026 Dominik Lukeš. Example book text: MIT, like the code. Fonts: separate open licences, reproduced in `packages/reader-core/notices`. Published books: not included, and not covered. See [LICENSING.md](LICENSING.md).
