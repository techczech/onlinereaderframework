Online Reader Framework 1.1.0 adds interactive examples and a runnable example book. Books and code written for 1.0.0 work without changes.

**Interactive examples.** A host can place a self-contained HTML document, such as a diagram or a simulator, before a passage of a chapter. It runs in a frame with `sandbox="allow-scripts"` only, so it has no access to the page, the reader's notes, storage, cookies, pop-ups or the network. The passage is its written text version, and search, notes, read-aloud, EPUB and agent files use that text. New exports: `checkPublicationEmbeds`, `validatePublicationEmbeds`, `resolvePublicationEmbedUrl`, `readPublicationEmbedHeight`, `PublicationEmbedFrame`, `PublicationEmbedSlots`, and `reader-core/embed-child` for use inside an embed.

**Hosting.** The embed folder must be served with a `Content-Security-Policy` header that includes `sandbox allow-scripts` and blocks network access, so that an embed opened on its own stays sandboxed. The example build writes this header for Cloudflare Pages in `_headers`, and its local preview sends it. GitHub Pages cannot send custom headers; build without embeds for it (`npm run example:no-embeds`).

**Example book.** `examples/reader-example` is a short book of invented demonstration text under the MIT licence, with chapters inside chapters, formatting, one interactive example, an EPUB download and agent files. `npm run setup`, `npm run build`, `npm run example`, `npm run example:preview`.

**Also changed.** Front-page actions show icons; a link to a passage taller than the screen scrolls to its start. The README and project page list five live editions, including [Increasing Reading Productivity](https://dominiklukes.net/books/academic-reading/) and [Foundations of Readability](https://dominiklukes.net/books/readability/).

The package is still not on npm. Software: MIT. Fonts: SIL Open Font License 1.1. Published books are not included and not covered. Full list: [CHANGELOG.md](CHANGELOG.md).
