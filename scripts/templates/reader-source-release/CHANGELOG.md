# Changelog

## 1.1.0 (2026-10-29)

Additive release. Existing books and code written for 1.0.0 keep working without changes.

### Added

- **Interactive examples (embeds).** `PublicationReader` takes an optional `embeds` registry. Each entry places one self-contained HTML document in a sandboxed frame (`sandbox="allow-scripts"` only) before a passage of a chapter. The passage is the written text version, used by search, notes, read-aloud, reading assists, EPUB and agent files. The reader accepts one message from the frame, its content height, and sends nothing to it.
- `checkPublicationEmbeds`, `validatePublicationEmbeds`, `resolvePublicationEmbedUrl`, `readPublicationEmbedHeight`, `PublicationEmbedFrame`, `PublicationEmbedSlots` and the embed constants, exported from `reader-core`.
- `reader-core/embed-child`: `startReaderEmbedHeightReporting` and `postReaderEmbedHeight`, for use inside an embed document.
- Embed styles in `reader-core/reader.css`.
- `examples/reader-example`: a runnable example book with invented MIT-licensed text, one interactive example with its text version, EPUB download, agent files, a static build, a local preview server and the hosting headers the embeds need.
- Hosting guidance: the embed folder must be served with a `Content-Security-Policy` that includes `sandbox allow-scripts` and blocks network access. GitHub Pages cannot send that header, so builds for it leave the embeds out (`npm run example:no-embeds`).
- Node tests for the embed model and check.

### Changed

- The front-page actions (Start Reading, Search, Download eBook and host download links) show an icon before their label.
- A link to a passage taller than the reading area scrolls to the start of the passage instead of its middle.
- `npm run setup` also installs the example; `npm test` also runs the embed tests; the native-import test also checks the embed functions, `reader-core/embed-child` and the packaged stylesheet.
- The README and project page list five live editions and the current addresses of Foundations of Readability and Increasing Reading Productivity.

### Not changed

- The package is still not published to npm (`"private": true`).
- No dependency of `reader-core` changed.

## 1.0.0 (2026-10-27)

First public release: `PublicationReader` with navigation, search, reading settings and assists, notes, read-aloud and listening, EPUB export and agent files; the smaller `ReaderShell`; MIT licence.
