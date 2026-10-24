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

Reading settings combines article width, light/dark appearance and navigation focus with ReadFlex-style typography and WriteFlex-style paragraph focus, line window and ruler. Text size, line height, paragraph spacing, letter spacing and serif/sans type are explicit choices. Preferences are saved per book. Reset reading settings resets both the reader controls and text/focus preferences.

Focus changes decorate the view without rewriting the manuscript or saved quotation text. The line window and ruler are mutually exclusive. The current support module does not implement WriteFlex's sentence breakup or anchored word beginnings.

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
