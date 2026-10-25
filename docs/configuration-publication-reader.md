---
title: Configure a book's reader identity, contents and listening
date: 2026-10-24
register: FOR DOMINIK
status: local-working-preview
---

# Configure a publication reader

The shared reader accepts each book's own appearance and interface wording. The demo applies these settings outside the manuscript snapshot, in `apps/reader-demo/src/App.tsx`.

```tsx
const configuredBook: PublicationBook = {
  ...book,
  appearance: {
    accent: '#187060', paper: '#f7f6e9', ink: '#203d35',
    masthead: 'literary',
    cover: { src: '/covers/book.jpg', alt: 'Description of this book cover' }
  },
  labels: {
    search: 'Search', tableOfContents: 'Table of contents',
    readingSettings: 'Reading settings', listen: 'Listen'
  },
  navigation: { homeDepth: 2, sidebarDepth: 3, showHomeContents: true }
};
<PublicationReader book={configuredBook} />
```

`masthead` accepts `editorial`, `practical` or `literary`. Colour values are validated as colours, not arbitrary CSS. Dark mode retains its own readable surfaces. Cover images are host-supplied assets; their rights and final selection remain separate from configuring the reader.

Home and sidebar contents use `book.sections` and recursive `children` in their declared order. Depth counts section-tree levels, with top-level sections at one. Home defaults to two levels and the sidebar includes all levels unless limited. Zero depth hides entries. `showHomeContents: false` hides the home contents. Local chapter navigation omits the title heading and disappears when there are no lower headings.

The explicit Table of contents label takes precedence over a legacy home overview title. The framework defaults are neutral; a host can override the labels for a course, reference book or other publication.

## Reading support

The toolbar has five icon-only controls: Listen, Formatting, Assist and Notes (the reading controls) and, set apart after a divider, Theme. A control's name appears on hover and on keyboard focus (and is its accessible name, with its current state where it has one); no text sits in the toolbar. Text size, line height, paragraph spacing, letter spacing, serif/sans type and article width are in Formatting. Preferences are saved per book.

**Theme** is one small icon with a three-choice popover: Follow computer (the default, which changes live with the computer's light or dark setting), Light and Dark. The icon shows the choice. The choice is saved per book in the `theme` field; a stored `darkMode` boolean from earlier versions is read once to seed it and is left in place. The old reader wrote that boolean on every visit starting from the computer's setting, so a stored value never proves a choice: one equal to the computer's setting now follows the computer, one that differs is kept as Light or Dark (it can also be a computer that changed since the first visit; Follow computer undoes it), and no value follows the computer.

**Assist** is one exclusive choice: Off, Paragraph, Line window or Ruler (key R toggles the last one used). Paragraph fades every paragraph but the active one; Line window shades the whole scrolling page except a window of 1, 3 or 5 lines that follows the pointer, a tap or the Up and Down keys across paragraphs; Ruler covers 1, 2 or 3 lines just below the current one. Dimming is Light .72, Medium .9 or Dark 1 (fully opaque), applied once as the shade's own alpha (for Paragraph, others fade to one minus that). While an assistance is on, navigation is hidden by default and the Key Lessons & Reflections prompt and editor are hidden (kept mounted, so drafts and saved reflections are untouched; the Notes drawer is unaffected). The Hide navigation switch and key F override the default for as long as the assistance is on; turning it off returns to the navigation choice the reader had before, without forcing it open or closed. Neither navigation state is saved, so a book opened with an assistance saved starts with navigation hidden.

Saved settings migrate on read without being rewritten until the reader changes something: the older separate paragraph focus becomes the Paragraph choice only when no overlay was saved (a saved overlay wins); first-release dimming presets (.2, .35, .5) keep their names (Light, Medium, Dark, now .72, .9, 1); version-2 dimming numbers keep their shade and take the new name for it (.9 is now Medium, .72 Light; a saved .5 is a custom value); other format settings and notes are never touched.

Focus changes decorate the view without rewriting the manuscript or saved quotation text. The current support module does not implement WriteFlex's sentence breakup or anchored word beginnings.

## Recorded audio

```tsx
<PublicationReader book={configuredBook} audio={[
  { sectionId: 'introduction', src: '/audio/introduction.mp3',
    label: 'Narrated introduction',
    alignment: [{ start: 0, end: 4.2, charStart: 0, charEnd: 36 }] }
]} />
```

The example numbers illustrate the schema; production alignment must come from measured audio and matched text. `start` and `end` are seconds. Character spans use half-open UTF-16 offsets in the canonical rendered section text, including its heading. Raw Markdown offsets are not interchangeable. Without alignment, recording playback still supports time, speed, chapters and saved position, but cannot follow measured passages.

The player saves position and speed by book and restores without autoplay. Its interface separates recordings from Browser read-aloud. Starting one pauses or stops the other. Changing reading settings or hiding the transport preserves recorded playback. Missing recordings show an explicit message. This configuration does not generate an audiobook, and the three demo books have no full recordings configured yet.

All new styles are included by the core stylesheet build. Source-linked hosts must also import the reading-support, listening and integration styles, as the demo entry does. The working branch remains local; none of this constitutes a public release.

## Front page layouts

A book can choose one of six front-page layouts. The layouts share the book data, contents, actions and saved reading state; each changes only the arrangement. The choice is per book, set by the host. Nothing changes for a book that does not set it.

```tsx
const configuredBook: PublicationBook = {
  ...book,
  appearance: { ...book.appearance, frontPageLayout: 'opus-colour-band' },
};
```

| Key | Name | Arrangement |
| --- | --- | --- |
| `sol-jacket` | Jacket | Cover and title page across the top, contents underneath. |
| `sol-reading-desk` | Reading desk | Compact masthead; a tinted start or continue panel beside the contents. |
| `sol-open-contents` | Open contents | Narrow book column beside a wide, searchable contents list. |
| `opus-title-contents` | Title beside contents | Title page on the left, kept in view, contents on the right. |
| `opus-search-map` | Search and topic map | Short masthead, a large search field, each group as a tile. |
| `opus-colour-band` | Colour band | Band in the book colour with the cover overlapping it, then numbered contents rows. |

`FRONT_PAGE_LAYOUTS` (keys, names, one-line descriptions) and `frontPageLayoutKey` are exported for a host that offers a choice. An omitted or unrecognised value keeps the classic home page; it never throws. Later changes are one value in the host's configuration: no book data or reader code changes.

**Contents and Full contents.** Two buttons set how much of the book's own contents is listed. Contents lists the top-level groups; Full contents lists every entry beneath them. They appear only when the two differ. The reader opens on Full contents when the whole list has 40 entries or fewer, and on Contents otherwise. The tree is the book's `sections`: ids, order and nesting are never changed. `navigation.homeDepth` (default 2) caps the levels Full contents shows; `0` or `showHomeContents: false` hides the list. A book with no nested sections is grouped by runs of equal `category` for display only; those headings are not pages. With `homeDepth: 1` such a book is one plain list. A group that has its own text keeps a link to that page. Groups with nothing to read are skipped. A group heading with no page of its own is kept whenever any page lies beneath it, whatever the cap: where the cap would leave it empty it lists the nearest readable pages under it instead. The app-guide category is listed but not numbered.

**Book contents (left) and chapter outline.** A book with no nested sections shows the same runs of equal `category` in the left contents as display headings over their chapters (for example the eight categories of the Deliberate Practice guide). They are not pages: no route, read mark or count, and the progress total stays the number of chapters. A book with any nested section keeps its real hierarchy and gets no extra headings. Each chapter's subheadings (every heading after the chapter's own title, even a single one) form an "On this page" outline: a side rail where the window has room, and the same links as a collapsed block above the chapter where it has not. A link opens that subsection with its own URL fragment, moves focus into the text and works with Back and Forward; the active link carries `aria-current="location"`.

**Wording.** The two buttons read "Contents" and "Full contents". A host may replace them with `labels.contents` and `labels.fullContents`. The heading uses the existing Table of contents label, and the search button the existing Search label. Counts say "entries".

**Start and Continue.** Start opens the first readable page, as before. After a reader has opened a page, the reader saves it per book (`lastSection`); the primary button then reads Continue reading with that page's title, and a second button starts from the beginning. A stored page that no longer exists, cannot be read, or belongs to the app guide is ignored. "N of M read" uses the same count as the sidebar and shows once something has been read.

**Titles.** The full title is the existing joined display title. A short subtitle that simply follows the title (Building Your / Language Muscle) is set inline in the accent colour; a longer subtitle is its own line. A description identical to the subtitle is not printed twice.

**Styles.** The layouts add `frontpage/frontpage.css`, which the core stylesheet build includes in `reader.css`. Source-linked hosts import it beside the reading-support and listening styles.

**Demo.** `apps/reader-demo` sets Colour band for Linguistics as a provisional preference; the other books keep the classic home page. A corner control and `?frontpage=<key>` preview any layout on any book (`?frontpage=classic` the classic page; an unknown value uses the book's configured layout). The control exists only in the demo.
