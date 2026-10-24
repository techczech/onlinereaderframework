---
title: Reading support DOM module and integration
date: 2026-10-24
status: implemented-module-awaiting-parent-integration
register: for-dominik
scope: packages/reader-core/src/original/reading-support only
---

The reader now has a reusable **Text and focus** settings module. It supplies typography, paragraph focus, a line window and a reading ruler. The parent still needs to insert the components and include the separate stylesheet. No shared reader files, manifests or build outputs were edited.

## Integration and exact API

Import from `./reading-support/index.js` within `src/original`. The source entry is `reading-support/index.ts`; all relative runtime imports use explicit `.js` extensions for native ESM. This task does not add exports to the shared package entry or manifest.

```tsx
import {
  ReadingSupportControls,
  ReadingSupportSurface,
  useReadingSupport,
} from './reading-support/index.js';

// Inside the parent's existing accessible Reading settings dialog:
<ReadingSupportControls bookId={book.id} inline />

// Around the article renderer, preserving its existing children:
<ReadingSupportSurface bookId={book.id} sectionId={section.id}>
  {article}
</ReadingSupportSurface>

// In a parent reset handler, call the hook at component level first:
const readingSupport = useReadingSupport(book.id);
// Then coordinate this with the parent's width/theme reset:
readingSupport.reset();
```

The exports are:

- `ReadingSupport({bookId, sectionId, children})` renders the standalone named disclosure followed by the content surface.
- `ReadingSupportControls({bookId, inline?: boolean})` renders a **Text and focus** button by default. With `inline`, it renders the fields immediately, without an inner disclosure or Close button. Escape then remains available to the parent dialog.
- `ReadingSupportSurface({bookId, sectionId, children})` applies the preferences and focus behaviour to the supplied content.
- `useReadingSupport(bookId)` returns `{preferences, update(patch), reset(), storageStatus}`. Multiple consumers with the same book ID share updates immediately. `storageStatus` is `saved` or `unavailable`; a refused write retains usable settings in memory and shows a status message in the controls.
- `DEFAULT_READING_PREFERENCES` supplies the frozen defaults. The entry also exports `ReadingSupportProps`, `ReadingSupportControlsProps`, `ReadingSupportSurfaceProps`, `ReadingSupportController` and `ReadingSupportPreferences` as types.

Append `packages/reader-core/src/original/reading-support/support.css` through `scripts/build-reader-styles.mjs`, **after the original reader stylesheet**. There is no runtime CSS import, embedded CSS string or new dependency. The parent should retain width, theme and navigation-focus controls and remove its duplicate font, size and spacing controls. This module deliberately exposes no theme or page tint.

## Preferences and behaviour

`ReadingSupportPreferences` contains `fontFamily: 'serif' | 'sans'`, `fontSize: number` from 16 to 28 px, `lineHeight: number` from 1.2 to 2.4, `paragraphSpacing: number` from 0 to 40 px, `letterSpacing: number` from 0 to 0.12 em, `focus: 'off' | 'paragraph'`, `overlay: 'off' | 'line-window' | 'ruler'`, `lines: 1 | 3 | 5`, and `dim: number` from 0.1 to 0.6. Defaults are serif, 20 px, 1.7 line height, 16 px paragraph spacing, zero letter spacing, focus and overlay off, three lines and 0.35 dimming. The ruler is a thin rule; window height applies to the line window.

Preferences use `publication-reader:${encodeURIComponent(bookId)}:reading-support:v1` in localStorage. Reading malformed JSON, invalid types, non-finite numbers or out-of-range values restores safe defaults for the affected fields. Storage access and writes are guarded. Reset restores and persists the defaults for the current book only. Book changes select that book's preferences; section changes reset the active reading position. Storage events refresh other mounted tabs.

Paragraph focus fades other prose blocks to 45% opacity. Pointer movement or a click chooses a paragraph and reading position; pointer movement freezes while dragging a selection. A keyboard user can focus the named reading region and use Up/Down or Home/End to choose a paragraph. Escape within the reading region turns paragraph focus and overlays off. Inline settings leave Escape handling to the parent dialog.

The line window leaves a band of one, three or five computed line heights clear and dims the article above and below it. The ruler draws a thin line beneath the current reading row. A single overlay enum makes the two exclusive. The overlays use `pointer-events: none`, a local stacking context and article bounds; they do not cover the reader toolbar, including a toolbar placed inside the wrapper but outside the article. The surface recognises `[data-publication-content]` or `.publication-content`; otherwise it treats its own content as the article. Keep settings and navigation outside that fallback surface.

## Source fidelity and provenance

The module never replaces innerHTML, wraps words, splits text nodes or inserts markup inside the article. It adds its own paragraph attributes, changes CSS properties and paints sibling overlays. Its mutation observer handles replacement annotation descendants without observing its own attribute changes. MathML, code, links, footnotes and existing annotation markup remain in place. Text support CSS uses the existing publication content selectors; arbitrary custom renderers should retain the recognised content marker.

The preference bounds and validation approach adapt ReadFlex's `apps/shell/src/renderer/reading-preferences.ts`. Its `use-reading-settings.ts` and `reading-controls-popover.tsx` informed reset, explicit labels and focus return. The local implementation adds per-book state and guarded writes, uses native inputs/selects, and supports inline rendering instead of copying its modal containment.

WriteFlex's `src/renderer/src/editor/line-overlay.ts` supplies the line/ruler exclusion contract and 1/3/5 line choices. `normaliseLineFocusSize` is copied directly apart from formatting and TypeScript return annotation. Its CodeMirror painting is adapted to a DOM surface with CSS and measured block rectangles, without importing CodeMirror. `focus-modes.ts` and the pure `sentences.ts` were inspected; sentence segmentation and `leadLength` are not copied because their modes are not implemented here. Source checkouts are the ReadFlex and WriteFlex desktop paths named in `audit-reading-support-reuse-2026-10-24.md`.

**Unsupported modes:** active sentence, sentence breakup, segment focus, anchored word beginnings, read-aloud following and editor typewriter following. No controls imply that these work. The line window uses a paragraph's computed line-height grid; it does not identify exact visual rows around mixed-height inline maths or images. Keyboard movement chooses paragraphs rather than individual visual lines. No new font assets are bundled; font stacks use the parent's fonts with system fallbacks.

## Verification

These checks passed against the isolated module, without installing dependencies or running a shared root build:

```sh
node --test packages/reader-core/src/original/reading-support/test-reading-preferences.mjs
node packages/reader-core/src/original/reading-support/test-reading-support-browser.mjs
packages/reader-core/node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2020 --lib ES2020,DOM,DOM.Iterable --module NodeNext --moduleResolution NodeNext --jsx react-jsx packages/reader-core/src/original/reading-support/index.ts
```

The three pure tests cover invalid storage, range validation, per-book round trips and overlay normalisation. The browser harness follows the repository's existing headless workflow with the installed book-engine Python/Playwright environment and bundled Chromium headless shell. It bundles only this module in memory and removes its scratch directory in `finally`.

Chromium 153.0.8010.12 passed checks for immediately visible inline settings, rendered typography, text-node identity and a live selection across preference changes, unchanged article text and MathML, existing annotation markup, links, paragraph pointer focus, both overlays and their exclusion, toolbar access and bounds, keyboard focus movement and Escape, per-book isolation, reload, section position reset, Reset and refused storage writes. It observed no page errors. These are module fixture results; the parent reader integration and the final combined stylesheet have not been tested here.

No Git, commit, deployment or shared build operation was performed. No action is needed from Dominik; the parent implementation can use the API and stylesheet above.
