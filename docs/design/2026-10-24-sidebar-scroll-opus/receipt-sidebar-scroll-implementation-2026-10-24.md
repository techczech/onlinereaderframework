---
title: Sidebar and scrolling, recommendation A — implementation receipt
register: FOR DOMINIK
date: 2026-10-24
status: implemented-and-verified-locally
design: report-sidebar-scroll-opus-2026-10-24.md (recommendation A, agreed by Dominik)
base: 3c58041 (production b415202)
builder: Muse Wonder Full 1.0, resuming partial uncommitted work by Claude Sonnet
---

**No action needed.** Recommendation A for the shared book reader (Linguistics, Deliberate Practice, Language Muscle) is implemented in the working tree and verified locally. Nothing is committed, pushed or deployed; the public site still runs the old framework.

## What the reader now does

- **Pinned compact header (118 px measured):** small cover and book title linking to the book home, Search, and a thin "N of 253 read" progress line counting chapters only. The duplicated Home and Notes & Highlights sidebar buttons are gone; Notes remains in the toolbar.
- **One contents scroller** below the header, with overscroll contained. The first topic row now starts under 200 px (was about 480 px).
- **Whole topic rows open and close the topic; only chapter rows open pages** (Language Muscle's original behaviour). A topic's own page stays reachable from the now-linked breadcrumb and the home contents. Empty topic groups are skipped by Previous/Next; meaningful parent pages, including Language Muscle's short introductions, stay in the sequence. Start Reading skips an empty first topic.
- **Open topics follow the reading path:** the current topic opens automatically and closes again when left, unless the reader opened it. Arriving inside a topic the reader had closed reopens it.
- **The current row is revealed:** centred on a deep link, revealed on reopening, and moved by Previous/Next only when it would otherwise be hidden. Clicking a row never moves the list under the pointer.
- **Focus follows a chosen chapter** to its heading (without scrolling), so Space, Page Down and the arrows read the text; the chapter starts at the top at once. Focus is never taken from search typing, notes, or an open settings dialogue.
- **The sidebar is hidden, not removed:** open topics and list position survive closing, the home page, and chapter changes, and are kept per book for the session. A desktop sidebar the reader closed stays closed across navigation. Below 1024 px the drawer closes after a choice. Desktop and drawer remember their open/closed choices separately.
- **Long titles** take at most two lines with the full title as a tooltip; the current row always shows its full title.
- **Contents depth** follows each book's actual section tree (top level = 1); an explicit `navigation.sidebarDepth` still wins. Chapter headings appear only in "On this page", and only when a chapter has two or more useful headings.
- The wide desktop article is unchanged (795 px at 1440 px wide, sidebar open, in both Linguistics and Deliberate Practice). No public API, schema or dependency changed: the edited sidebar is the reader's internal one, not the package's exported component.

## Changed files

- `packages/reader-core/src/original/Sidebar.tsx` — pinned header, one list, topic-toggle rows, reveal and per-book session state.
- `packages/reader-core/src/original/sidebar-model.ts` (new) — readable sections, ancestors, tree depth, neighbours, progress, expansion rules.
- `packages/reader-core/src/original/ReaderLayout.tsx` — sidebar always mounted, linked breadcrumb topics, Start Reading skips empty groups.
- `packages/reader-core/src/original/use-publication-reader.ts` — separate desktop/drawer choices at 1024 px, drawer closes on choice, instant top, heading focus with a no-steal guard, readable Previous/Next.
- `packages/reader-core/src/original/TableOfContents.tsx` — "On this page" hides below two useful headings.
- `packages/reader-core/src/original/reader-original.css` — hidden-not-removed sidebar, pinned header, single contained scroller, two-line titles.
- `scripts/check-reader-sidebar-scroll.py` (new) — the 45-check three-book browser regression script.
- Tests updated to the agreed behaviour: `test-publication-navigation.mjs` (new sidebar-model and row tests), `test-reader-layout-navigation-headless.mjs` (two-heading fixture; focus mode now hides rather than removes the sidebar; drawer opened before closing at 320 px), `test-original-reader-headless.mjs` (opens notes from the toolbar button that replaced the removed sidebar duplicate).

## Verification (all run 2026-10-24 against a fresh build)

- `npm test` — exit 0: publication content 23, original reader + navigation + reading preferences + listening 40, real books 5.
- `npm run build` — exit 0, including TypeScript checks for the package and the demo; three-book demo rebuilt.
- `../book-engine/.venv/bin/python scripts/check-reader-sidebar-scroll.py` — exit 0, 45 checks passed, 0 page errors, at 1440×900 and 390 px across all three books. This covers the four measured Opus faults, deep-link visibility, topic toggling without empty navigation, keyboard reading, retained close/reopen, Previous/Next, per-book session keys, and title wrapping. Output: `evidence/observations-sidebar-scroll-after-2026-10-24.json` and six screenshots in `evidence/`.
- `node packages/reader-core/src/original/test-reader-layout-navigation-headless.mjs` — exit 0 (layout, heading rail, settings, responsive overflow at 1473/1024/768/390/320).
- `node packages/reader-core/src/original/test-original-reader-headless.mjs` — exit 0, 160 checks across browser, annotation, MathML, quote-identity and selection suites, including highlight/note save, note navigation and full reload.
- Extra probe (since removed): a manually opened Linguistics topic survived switching to Language Muscle and back with no state leaking between books; Deliberate Practice's flat 21-row list navigates, focuses the heading and pages with the keyboard.
- T3 preview: the tab loaded the deep link and an in-page check confirmed the current row visible under a 118 px header, but `preview_snapshot` failed with the historical raw error "Preview automation snapshot timed out after 15000ms.", so screenshots come from the bundled headless Chromium workflow instead. The T3 tab's viewport also reported 1280×800 rather than the requested 1440×900, so the 1440×900 evidence is from the headless run.

## Decisions and limits

- On reopening, the list keeps its retained scroll position and centres the current row only if it is hidden; centring unconditionally would destroy the retained position the design also requires. Deep links always centre.
- Until the reader makes an explicit desktop choice, the sidebar follows the page (open on chapters, closed on the home page), matching the previous initial behaviour; the first explicit choice then sticks.
- Not verified: real mobile Safari, the T3 preview pane's own scrolling feel, and the installed-package/React compatibility matrix (`verify:package` not run — no public API or dependency changed, and the build's TypeScript pass covers the package surface).
- Scratch from the earlier partial attempt (`build/sidebar-scratch/`) and this session's probe were removed. The pre-existing server on port 8773 was left running.

Ownership of this parcel is released. Nothing is committed; committing, publishing and deploying remain with the coordinating session.
