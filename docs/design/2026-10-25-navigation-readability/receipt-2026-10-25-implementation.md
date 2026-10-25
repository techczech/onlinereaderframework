---
title: Navigation and structure restoration, implementation receipt
date: 2026-10-25
register: for-dominik
status: built and verified in headless Chromium
follows: review-reader-navigation-readability.md
---

No action needed. This receipt records what was restored in the online reader's book contents and chapter outline, and how it was checked. **Deliberate Practice shows its eight categories again, every chapter's subheadings are reachable at every window width, and an outline link is a real location.** Where each point sits against the review's findings is below.

## Restored

1. **Deliberate Practice categories in the left contents.** The eight categories (Introduction, Principles & Theory, Practice Principles, Practice Approaches, Targeting Practice, Improving Practice, Appendices, App Guide) appear as headings over their chapters, using the front page's rules: source order is authoritative, a category that returns later starts its own group, a lone chapter named like its category is not labelled twice. They are display headings only: no row, route, read mark or count. All 21 entries remain; the progress total is still 20 chapters. License stays in Appendices, and the Reader Guide stays under the app-guide category, not among the book's chapters. A book with any nested section is left as it was: Linguistics keeps its nine topics and Language Muscle its real hierarchy, with no extra headings. (`Sidebar.tsx`, `categoryRuns` in `publication-navigation.ts`.)
2. **Chapter outline at every width.** Every heading after the chapter's own title is listed, even a single one (so "What is this" in Language Muscle now appears). The side rail stays where it fits. Where it does not, below 1000 px of reading width, the same links appear as a collapsed "On this page" block above the chapter, using the same disclosure pattern as the front page: a button with `aria-expanded`, Enter or click to open, Escape to close and return focus. Exactly one of the two is on screen at any width. The article keeps its width (590 px at Normal) and nothing overflows. Immersive mode still hides both. The `N` shortcut opens and focuses whichever is available. (`TableOfContents.tsx`, `ReaderLayout.tsx`, `reader-original.css`.)
3. **Outline links are locations.** A click or Enter now goes through the reader's existing anchor handling: the URL gets the subsection fragment, keyboard focus moves into the heading, and the page itself does not scroll. Modified clicks keep the browser's behaviour. Back and Forward between two subsections of one chapter now return to the subsection (the old handler always jumped to the top). A copied subsection URL opens at that subsection. The marker follows the chosen link and is not taken over by headings passed on the way. (`use-publication-reader.ts`.)
4. **Rich headings.** Labels come from the renderer's canonical heading text, so a formula heading reads "Equation x^2", not its TeX and MathML twice. Link targets are the rendered ids, percent-encoded; repeated titles are de-duplicated ("same-title", "same-title-2"); ids are the same across reloads. Authored levels are kept and indentation is measured from the shallowest level listed, so an outline that starts at h3 is not pushed right. The active link carries `aria-current="location"`, with a 40 px link in the compact block and a full-title tooltip. The outline re-reads the chapter when annotations replace its markup, so highlights inside a heading, notes, MathML and read-aloud do not break it.

## Not changed

- Front page, its Contents / Full contents controls, the four toolbar controls and the audio transport, book data and manuscripts. Reading settings and notes are untouched by navigating (checked).
- No public API was added. `TableOfContents` in the original-derived reader gains two optional props used only by the layout; the exported `components/reader/TableOfContents` is a different file and was not touched. `docs/configuration-publication-reader.md` has one new paragraph describing the contents headings and the outline.

## Checked

| Check | Command | Result |
|---|---|---|
| Fixture book with a formula heading, Unicode and repeated headings, a link and an annotation in headings, one subheading, h3-only chapter, none, read-aloud running | `node packages/reader-core/src/original/test-navigation-fixture-browser.mjs` | 49/49 |
| The three real books on the built demo (8773): eight DP categories and 21 entries, 20-chapter progress, Fluency and Schemas outlines, outline at 1440, 1366, 1280, 1200, 1024, 768 and 390 with the book sidebar open and closed, URL, focus, Back and Forward, deep link, Language Muscle single heading and hierarchy, Linguistics topics | `node packages/reader-core/src/original/test-navigation-books-browser.mjs` | 47/47 |
| Build, then unit suite once | `npm run build`, `npm test` | build passed; 23 + 79 + 5 tests, 0 failures |
| Read-aloud, assist, width and scale, toolbar repair and recorded audio, front pages (six layouts, three books) | the browser suites of the previous parcel | 46/46, 37/37, 23/23, 11/11, 279 checks with no failures |
| Original reader, and the reading-support suite (maths, annotations, selection under the overlay) | `test-original-reader-browser.mjs`, `reading-support/test-reading-support-browser.mjs` | both pass |

Screenshots: `evidence-implementation/dp-schemas-1280.png`, `-1024.png`, `-390.png` (and the sidebar categories in the 1280 view). The review's own runtime evidence described the served build before these edits; the table in its finding 1 (rail hidden at 1200 and 1024) no longer holds: the compact block is shown there.

## One earlier test corrected

The reading-support suite still expected two shades from the line window. Since the previous parcel the window shades only what lies outside its band, so at the top of a chapter, with nothing above, one shade is correct. I changed the assertion to check that no shade covers the active line, and had missed running that suite then. The behaviour was right; the test was stale.

## Limits

- No real screen reader and no physical phone. Touch size was checked by measured link height (40 px or more in the compact block); the rail's links keep the compact desktop size.
- The rail threshold (1000 px of reading width) is the original reader's and was kept; the compact block covers everything below it.
- The formula heading's id is `reader-content-equation-x2x2`: the renderer slugs the text including both MathML and TeX. It is stable and unique, and the label is clean; I did not change the renderer's id scheme.
- Two outline instances (rail and compact) each read the chapter's headings once; the cost is small, but a shared outline hook is the obvious refinement if a third presentation is ever added.
- No new renderer seam was introduced, so no independent review is flagged beyond the usual one for this change set.
