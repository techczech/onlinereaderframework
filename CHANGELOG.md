# Changelog

## 1.3.0 (2026-11-08)

Books and code written for 1.2.0 keep working without changes. Most of the changes apply only to books that choose the atlas layout (`appearance.readerLayout: 'atlas'`).

### Added

- **Atlas reading mode.** In the atlas layout the book's front page is a plain landing page, with no reading toolbar and no contents panel. Opening a chapter adds a slim toolbar and opens the contents beside the text on wide windows.
- **Panel controls in the atlas layout.** Each side panel (the contents and "On this page") closes with a small close button in its own header. While a panel is closed, a single icon in the toolbar reopens it: the standard menu icon at the left for the contents and a list icon at the right for the outline. Below 1024 pixels both panels open as overlays with a dimmed background and close with Escape.
- **A quieter toolbar in the atlas layout.** The reading tools are small borderless icons at the right, with their names on hover and keyboard focus. The toolbar slides away while the reader scrolls down and returns on any scroll up. A chevron folds the tools into one "more" button, and the reader's choice is kept for that book on that device.
- **Word-form markup in tables.** A book can mark endings that are added, changed or removed with `form-*` spans inside a `.form-word` element, and give a changed piece the replaced letters in `data-form-from`. Tables that contain such markup get a button that hides the markup or shows it again; showing it replays the changes as a short animation, which is skipped when the reader has asked for reduced motion. The book supplies the colours.

### Fixed

- Choosing an entry in "On this page", or following a link to a heading, puts the heading at the top of the window instead of the middle. When the last section of a chapter is shorter than the window, room is added after the chapter so its heading can still reach the top.
- The table search count no longer reports "No matches" when inline markup splits a matching word across elements.
- The breadcrumb no longer shows an empty segment ("Home / / chapter") for a chapter without a category.

### Changed

- In the atlas layout, the chapter number and title are slightly smaller on laptop-size windows (narrower than 1600 pixels or shorter than 900 pixels). The "Share" and "Save" page actions are plain text buttons.
- The atlas layout no longer repeats the masthead (book title, authors and "Reading edition") above each chapter; the book's title card is at the top of the contents panel.
- In the atlas layout the read-aloud controls sit just below the toolbar and move up with it when it slides away.
- In every layout, the contents list opens at its top when the current chapter is visible there; otherwise it scrolls so the current chapter's row is shown whole. Closing the contents from inside it returns keyboard focus to the button that reopens it.

## 1.2.0 (2026-11-07)

Additive release. Books and code written for 1.1.0 keep working without changes; the new table tools are off unless a book switches them on.

### Added

- **Table tools.** Set `appearance: { tableControls: true }` on a book to give each table a small row of icon buttons: search, swap rows and columns, collapse and full width. Search opens a box above the table; typing narrows it to the matching rows and highlights the matches (tables with merged rows are highlighted only, so their layout stays intact). A reset button returns the table to its original layout. The tools are part of the reader: search across the book, read-aloud, EPUB and agent files still use the table as written.
- Optional `appearance.tableReviews` for regular tables whose header structure the host has checked: they also get sorting and column choice.
- Table styling ships with the framework, in `reader-core/reader.css`. A new book gets the table toolbar, search box and scroll area styles without copying any CSS.
- Optional `role: 'cover'` asset for `downloadPublicationEpub`: adds a cover image, a cover page and the EPUB 3 `cover-image` property.
- Optional `compatibility` settings for a book whose chapters have been split: links to old anchors and saved highlights and notes are moved to the chapter that now holds them, after a backup of the saved data. A front-page button offers to continue reading where the reader left off.
- Optional `appearance.readerLayout: 'atlas'`, a book layout with a masthead, chapter numbers and a ruled outline.
- The example book switches the table tools on and has a new chapter, "Large tables", with a table to try them on.

### Fixed

- On phones, table cells keep whole words; a wide table scrolls sideways instead of squeezing its columns to single letters.
- In the outline, the current entry keeps its indent, and its marker and text share one colour.
- Search results open at the matching text, and each result has an accessible name.
- Reader controls inside a chapter, such as the table toolbar, are ignored when the reader collects the chapter text.

### Changed

- The atlas layout has four distinct heading levels and an outline that mirrors them. This applies only to books that choose that layout.
- The native-import test also checks that the packaged stylesheet carries the table styles; the example tests check that the table tools are on.

### Not changed

- The package is still not published to npm (`"private": true`).
- No dependency of `reader-core` changed.

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
