---
register: "FOR DOMINIK"
date: "2026-10-24"
status: "design-suggestion"
reviewed_code: "b415202 (docs e11876b)"
author: "Claude Opus 5.5 design consultation"
sketch: "sidebar-scroll-options-2026-10-24.html (rendered from copy-sidebar-scroll-options-2026-10-24.md)"
evidence: "evidence/"
title: "Claude Opus sidebar and scroll design consultation"
kind: "evidence"
created: "2026-10-24T02:07:08Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework"
sources:
  - file: docs/design/2026-10-24-sidebar-scroll-opus/report-sidebar-scroll-opus-2026-10-24.md
  - file: docs/design/2026-10-24-sidebar-scroll-opus/evidence/observations-sidebar-scroll-ownership-2026-10-24.json
artefact: "docs/design/2026-10-24-sidebar-scroll-opus/sidebar-scroll-options-2026-10-24.html"
---

**No action needed.** This is a design consultation on the shared book reader (Linguistics, Deliberate Practice, Language Muscle). No production code was changed.

## What is actually wrong

There is no iframe inside the reader. The browser page itself never scrolls: it was 0 in every measurement. The reader is a screen-height box with two separate scrolling areas side by side, the contents list and the text. Inside a preview pane these feel like two nested frames, which is probably what "the iframe scrolling is not right" describes. That is an inference: I could not watch the T3 preview itself. The four faults below were measured in the running reader at 1440 × 900 with the bundled headless browser (`evidence/observations-sidebar-scroll-ownership-2026-10-24.json`).

1. **The contents starts halfway down the screen.** Search, Home and Notes & Highlights form a 199-pixel block that stays put. Below it, the cover, title, subtitle and progress bar (223 px) scroll away with the list, so the first topic appears at about 480 px. On a 1024 × 768 screen only 346 px are left for the list. Source: `packages/reader-core/src/original/Sidebar.tsx:126-183` and `:241-260`. Notes & Highlights repeats the toolbar's Notes button (`ReaderLayout.tsx:106`).
2. **Clicking a topic name opens a page instead of opening the topic.** Clicking "Typology" in Linguistics opened an empty Typology page with a reflection box and ticked the topic as read (`evidence/screenshot-linguistics-1440-parent-row-navigates.png`). Only the 40-pixel chevron on the right opens and closes a topic. Topics that opened when you visited them never close again, so the list keeps growing: it went from 2,482 to 3,186 px in one click. Source: `Sidebar.tsx:322-336`. Language Muscle's original sidebar did the opposite: the whole topic row opened and closed, and only chapters navigated (`~/worktrees/guides/building-your-language-muscle/App.tsx:585-605`). The shared port says it adapted that component, but it changed this behaviour.
3. **The current answer can be off-screen when you arrive.** When the Abbot & Costello answer was opened from a link, its row sat at 1,026 px on a 900-pixel screen, and nothing scrolls it into view (`evidence/screenshot-linguistics-1440-deep-link-active-hidden.png`). Source: no reveal anywhere in `Sidebar.tsx`.
4. **After you pick a chapter, the keyboard still drives the list.** Focus stays on the clicked button. Page Down and the down arrow then scrolled the contents list (1,781 → 2,442 → 2,482 px) while the text stayed at the top. Source: `use-publication-reader.ts:82-94` never moves focus to the text.

Two smaller faults:

- Closing the sidebar removes it from the page instead of hiding it, so reopening it loses the list position and every open topic. Pressing S twice reset the list to the top and closed all topics (`ReaderLayout.tsx:73`).
- Choosing any chapter on a desktop reopens a sidebar the reader had closed (`use-publication-reader.ts:88`).

What already works: scrolling with a mouse wheel or trackpad goes to whichever area is under the pointer, and scrolling past the end of the list does not move the text. The text column measures 795 px at 1440, 772 px at 1100 and 696 px at 1024. Below 1024 px the sidebar becomes a drawer. Deliberate Practice (21 chapters in one list) and Language Muscle (12 entries) suffer less because their lists are short. The faults are the same, but Linguistics, with 9 topics and 253 answers, exposes them.

## Recommendation: A, a pinned header and one contents list

Keep the present layout and each book's identity, and change only how the sidebar and focus behave. Every part of this comes from the two original guides or from standard reading-app behaviour.

- **Sidebar header (pinned, about 110 px):** a small cover and the book title, which go to the book's home page and replace the separate Home button; Search; and a thin progress line reading "N of 253 read". Notes stays in the toolbar only.
- **One scrolling area:** the contents list only, with `overscroll-behavior: contain` so it never passes scrolling on to the text or to a host page.
- **Topic rows open and close the topic; only chapters open pages.** This is Language Muscle's behaviour. The whole row is the target, so there is no small chevron to aim at. The topic page still exists and is reached from the breadcrumb, which should become a link, and from the home page's contents. Language Muscle's two short topic introductions stay in Previous/Next order.
- **Which topics are open:** the topic you are reading in opens automatically. When you leave it, it closes again, unless you opened it yourself.
- **Showing the current chapter:** opening the book at a chapter, or reopening the sidebar or drawer, centres the current row. Previous and Next move the list only when the row would otherwise be hidden. Clicking a row in the list never moves the list.
- **Focus:** after you choose a chapter, focus moves to the chapter heading without scrolling, so Space, Page Down and the arrows read the text. The text box should start at the top immediately, not with the smooth scroll it uses now (`use-publication-reader.ts:93`).
- **Keeping your place:** the sidebar is hidden, not removed, so it keeps its position and open topics through the home page, closing and reopening, and chapter changes. The position is also saved per book for the session.
- **Long titles:** two lines with the full title on hover, except the current row, which shows its full title.
- **Contents depth:** set automatically. The sidebar shows every level of the book's own sections. Headings inside a chapter appear only in the "On this page" column, and only when a chapter has two or more of them. A number in `navigation.sidebarDepth` overrides this. The current fixed value of 3 deepens nothing in these books (largest depth 1).
- **Window size:** 1024 px and wider shows the sidebar beside the text and keeps the reader's own open or closed choice, which navigation no longer overrides. Narrower windows show the drawer, kept on the page while closed, with the current row centred on opening. Choosing a chapter closes it and moves focus to the heading. Moving between the two remembers each layout's choice separately.

## The other two arrangements

- **B, the page scrolls:** the browser page scrolls the text, and the contents sticks beside it. Native keys, Back and find-in-page all work without managing focus. This is right only if the reader must sit inside other websites that size it to the full text height. It is a large change, because scroll-to-highlight, heading tracking and the reading ruler all measure the text box today (`TableOfContents.tsx:65`, `use-publication-reader.ts:93,262`).
- **C, topics first, then answers:** the list shows the nine topics, and choosing one replaces the list with its answers and a row back to all topics. It suits phones and very long books. It is new to these books, and Deliberate Practice would see no difference.

## Files

- Sketch: `sidebar-scroll-options-2026-10-24.html`, generated by `render-sidebar-scroll-options.mjs` from `copy-sidebar-scroll-options-2026-10-24.md` (all wording), `excerpts-linguistics-sidebar-mock-2026-10-24.json` (real titles and text from the snapshot), `style-sidebar-scroll-options.css` and `behaviour-sidebar-scroll-options.js`. Tabs show one arrangement at a time. The frames have fixed heights, so the page stays under 2,000 px at 390 and 1100 px wide.
- Evidence: `evidence/observations-sidebar-scroll-ownership-2026-10-24.json`, two screenshots and the probe script that produced them.
- Not inspected: ReadFlex and WriteFlex navigation code, the T3 preview pane itself, and real mobile Safari.

## Next step

The parent session presents A, B and C to you. If you choose A, a Sonnet builder changes `Sidebar.tsx`, `ReaderLayout.tsx` and `use-publication-reader.ts` only, and the four measured faults become its checks.
