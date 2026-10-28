# Review-mode home pages: short visual check (28 Oct 2026)

Scope: the home page of each book with `review=1`, at 1280 × 900 and 390 × 844. One chapter link per book at 1280. One phone check of the Academic cognition map, as a known limitation. This is a visual look, not a test verdict. It is not a security, content or copying review, and it does not give a security verdict. It is not a broad test run.

## Target and driver

- Preview: `http://100.85.55.122:8773/` (the parent's authorised preview; left running, not started or stopped here).
- Driver: `driver.mjs` in this folder. It loads Playwright from the sibling `dlnet` checkout and uses the bundled headless shell (build 1243). It does not use an installed Chrome.
- The first run found no contents links because the driver looked for `#/` anchors. Chapter entries are buttons. The corrected driver is the one saved here and the source of every number below.
- Every number below comes from the corrected run. The run exited 0 with no stderr output.

## Screenshots

| File | URL | What it shows |
|---|---|---|
| `academic-reading-review-home-1280.png` | `?book=academic-reading&review=1` | Title, subtitle, author, description, Start Reading / Search / Download eBook, contents in two columns. No demo chooser. |
| `academic-reading-review-home-390.png` | `?book=academic-reading&review=1` | Icon toolbar with the truncated title above it, title block, buttons wrapping onto two rows, contents in one column. No demo chooser. |
| `readability-foundations-review-home-1280.png` | `?book=readability-foundations&review=1` | Title, subtitle, author, description, buttons, contents in two columns. No demo chooser. |
| `readability-foundations-review-home-390.png` | `?book=readability-foundations&review=1` | Icon toolbar, title block, buttons, contents starting in one column. No demo chooser. |

## Measured

| Check | Academic reading | Readability foundations |
|---|---|---|
| `.demo-book-chooser` / `.demo-frontpage-chooser` in DOM, 1280 and 390 | 0 / 0 | 0 / 0 |
| Title (h1 element text) | "Increasing Reading Productivity Framework for Improving Academic Reading" | "Foundations of Readability Create accessible, easy-to-process documents and presentations" (the h1 element text includes the subtitle) |
| Author | Dominik Lukeš | Dominik Lukeš |
| Toolbar visible, 1280 and 390 | yes; 10 controls, including Start Reading, Search, Download eBook | yes; same set |
| Contents entries checked (under "Table of contents") | 17 | 22 |
| Contents entries covered by another element at their left point | 0 | 0 |
| Page horizontal overflow, 1280 and 390 | 0 px | 0 px |
| Console errors or warnings, page errors, non-preview requests | none | none |

Two things to note about the contents count. The 17 and 22 include the front-page buttons (Start Reading, Search, Download eBook) because the driver scoped to the section that holds the heading. The coverage result is the same either way.

## Chapter link (1280 only)

- The driver clicked the first entry in the scoped list, which was "Start Reading", not a contents entry.
- Academic reading: URL became `?book=academic-reading&review=1&section=overview`. Heading became "Overview & Framework". `review=1` kept. Demo selectors 0 in DOM.
- Readability foundations: URL became `?book=readability-foundations&review=1&section=five-principles`. Heading became "Five principles of readability". `review=1` kept. Demo selectors 0 in DOM.
- No contents-entry click was done. The chapter-link check therefore covers navigation from the front page, not a contents row.

## Academic cognition map at 390 (known limitation, DOM read only)

- URL: `?book=academic-reading&review=1#/cognition-explorer`.
- Frame width 332 px at 390 px viewport.
- Inside the frame, the map scroller (`overflow-x-auto`) has scrollWidth 560 and clientWidth 274. The map scrolls sideways on the phone.
- Outside the frame: "Skip to text version" and "Open full view (opens in a new tab)" are present.
- Inside the frame: "Reset View" is present.
- No demo selectors in DOM. No errors. No outside requests.
- This matches the known limitation. No new defect is claimed.

## Observations

**Working as expected**

- Demo selectors absent at both widths on both books.
- Title, author and toolbar visible at both widths on both books.
- Contents are not covered by any element at either width on either book.
- No page-level horizontal overflow at either width.
- `review=1` persists through a front-page navigation on both books.

**Looked at, not counted as defects**

- At 390, the toolbar title is truncated with an ellipsis. The full title is in the page's `<title>`.
- At 390, the Academic front-page buttons wrap to two rows, with Download eBook alone on the second row.
- The Readability h1 and subtitle sit close together at 1280. This is typography, not overlap.

**Not checked here**

- No keyboard pass, no screen reader, no Safari or Firefox, no phone hardware.
- Contents-row clicks were not tested.
- Full-view and text-alternative content was not opened.
- Light mode only.
