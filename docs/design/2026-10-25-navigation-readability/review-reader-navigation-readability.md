---
title: Reader navigation and structure restoration review
register: FOR DOMINIK
date: 2026-10-25
status: ready-for-builder
reviewer: Codex gpt-6.1-sol
scope: Independent read-only source and product review; report and probes only
---

No action needed. FOR DOMINIK.

- **Restore category grouping and keep chapter navigation reachable at every width.** The manuscript structure survives; its navigation is partly suppressed by presentation rules.
- **Keep the current comfortable article width.** The existing preview already shows a useful chapter rail at 1,280 and 1,366 pixels; final sizing remains with the current builder. Its confirmed responsive failure begins below the available-area threshold, not at all laptop widths.
- **Make outline links behave like locations.** They currently scroll without updating the URL or moving keyboard focus into the passage.
- The bounded plan below is ready for the builder after the current read-aloud, Assist and responsive work. No author decision is required for this restoration.

## Evidence and limits

Source inspection covered the current original-derived reader, both original guide implementations, and all three imported books through the actual `getPublicationHeadings` rendering pipeline. The complete ordered heading trees, IDs, levels, titles and categories are in [the heading evidence](evidence-reader-heading-trees.json). [Runtime evidence](evidence-reader-runtime.json) records DOM measurements and inspected-source hashes. [The probe](probe-reader-navigation.py) reproduces those observations without building the application.

Runtime checks used the **existing built preview on port 8773**, with a fresh isolated browser context. This is evidence of that served build, not proof that Sonnet's current working edits were integrated. No production file, original guide, manuscript, build output, Git state or user browser profile was changed. Browser scratch was confined here and removed in `finally`.

T3 preview opened, but two snapshot attempts each returned `Preview automation snapshot timed out after 15000ms.` Its review tab was closed. The fallback used the installed Playwright Python environment and bundled Chromium headless shell, without Chrome. Four screenshots were saved; the 1,280-pixel fluency view and 1,440-pixel schemas view were visually inspected. A final source-hash check detected concurrent changes only in `reader-original.css`: the normal article measure changed from 70ch to 52ch (and the alternate measures changed), while the outline hiding rules at lines 120–124 remained the same. The measurements below describe the served build, not those subsequent sizing edits. This review does not reopen that ongoing sizing work. No real screen reader, physical phone, live speech or release validation was performed.

Readability judgement follows the requested local skill and its five-principles, web-readability, reading-strategies and accessibility references: meaningful chunks, visible structure, scanning guides and current location take priority over fonts. This review does not assess or rewrite manuscript language.

## What survives and what was lost

Paths below are relative to the owning reader repository unless prefixed with an original guide name. Original guide roots are `/Users/dominiklukes/worktrees/guides/deliberate-practice-guide` and `/Users/dominiklukes/worktrees/guides/building-your-language-muscle`.

| Feature | Original source | Current source and result |
|---|---|---|
| Deliberate Practice category groups | Original DP `components/Sidebar.tsx:348–356` renders category headings and spaced groups. | `packages/reader-core/src/original/Sidebar.tsx:334–339` maps section nodes directly. `publication-navigation.ts:19–23` deliberately preserves only the actual tree. All 21 entries are roots, so the eight surviving category labels disappear from the sidebar. |
| Rich chapter outline | Original DP `components/TableOfContents.tsx:48–68,130–146` extracts Markdown headings and indents levels; original Language Muscle `App.tsx:407–430,550–570` extracts HTML h2–h4. | Current `TableOfContents.tsx:39–49` reads rendered h2–h6 IDs and levels. This supports both formats and avoids a separate slugger. The renderer has retained the content: DP has 156 headings, including 135 below h1; Language Muscle has 99, including 96 below h1. |
| A meaningful single subheading | Original Language Muscle `App.tsx:550` renders its outline whenever any extracted heading exists. | Current `TableOfContents.tsx:111–112` returns null below two headings. Confirmed at runtime for “1. About this guide”, whose single h2 is “What is this”. “2. How to read this” and “3. The Good News” have the same source condition. |
| Laptop and smaller-screen outline | Original DP `TableOfContents.tsx:136` and original Language Muscle `App.tsx:551` use `hidden xl:block`. | Current `reader-original.css:101,120–124` instead requires the **main container** to be at least 1,000 pixels wide. Neither original supplies a small-screen chapter disclosure in these inspected components; merely restoring their CSS would retain that limitation. |
| Nested book navigation and landing pages | Original Language Muscle `App.tsx:581–629` uses expandable parent rows and linked leaf pages; `509–518` links children on parent pages. | Current `Sidebar.tsx:349–385` retains expandable parent rows, with `aria-expanded` and current-page state. `ReaderLayout.tsx:161–162,216–217` retains linked ancestor breadcrumbs and child navigation. Parent pages remain reachable from home and breadcrumbs. Do not add duplicate parent titles or turn every parent click into page navigation. |
| Home contents depth and category presentation | Current home implementation already supports this independently. | `frontpage/frontpage-model.ts:61–106` preserves nested branches and groups contiguous category runs for flat books, with duplicate-title suppression. `109–111` chooses full contents for short books. `frontpage/layouts.tsx:176–204` separates readable parent-page links from disclosure controls. Preserve these behaviours and the existing Contents / Full contents labels. |
| Chapter location, reading sequence and progress | Original DP `App.tsx:944–956,1012–1040` provides breadcrumb, Previous/Next and outline. | Current `ReaderLayout.tsx:152–166,223–255` retains these. `sidebar-model.ts:28–41` skips empty groups for neighbours and excludes App Guide from progress. Category restoration must not manufacture chapters or change progress totals. |

The actual book models require different presentations. **DP has 21 flat chapters and eight display categories**, not eight extra parent pages. **Linguistics has nine empty topic containers and 253 authored answers**, with 259 rendered headings: 253 answer h1 titles and six subheadings across two answers. **Language Muscle has four root sections and 12 readable pages in total**, including meaningful parent landing pages. Do not flatten either nested book or duplicate category headings already expressed by its real parents.

## Prioritised findings

### 1. High: chapter navigation becomes unavailable instead of adapting

**Confirmed source and DOM failure.** `TableOfContents.tsx:111–112` drops meaningful single headings. `reader-original.css:120–124` hides larger outlines without another presentation. `ReaderLayout.tsx:255` mounts only that outline, and the `N` shortcut in `use-publication-reader.ts:309` tries to focus it without making a hidden outline reachable.

For the screenshot's actual chapter, **Fluency as Target**, the source contains three h2 sections. “Schemas & Chunks” has four h2 sections and three nested h3 sections. Those are useful scanning routes, not redundant title entries.

| Viewport | Main area with book sidebar open | Article width | Chapter rail |
|---|---:|---:|---|
| 1,440 | 1,176 | 795 | Visible |
| 1,366 | 1,102 | 795 | Visible |
| 1,280 | 1,016 | 728 | Visible |
| 1,200 | 936 | 795 | Hidden |
| 1,024 | 760 | 696 | Hidden |
| 768 | 768; sidebar closed | 704 | Hidden |
| 390 | 390; sidebar closed | 350 | Hidden |

Measurements are CSS pixels at fresh default settings; no document-wide horizontal overflow was observed. [The 1,280-pixel screenshot](screenshot-fluency-1280.png) confirms the existing article is not phone-width. [The 1,024-pixel screenshot](screenshot-fluency-1024.png) records the absent rail. Closing the book sidebar makes the rail appear at 1,200 and 1,024 pixels; it remains hidden at smaller container widths. Thus sidebar closure does **not** inherently remove chapter navigation, but also does not solve its smaller-screen availability.

**Restore:** show an outline for one or more useful subheadings, omitting the duplicate chapter h1. Keep the rail where it fits. Below that budget, expose the same outline as a compact, collapsible “On this page” block above the chapter text, using the existing disclosure interaction and heading-link presentation. Do not introduce another global menu or reduce the article to the rejected narrow layout. `N` must open/focus the available presentation. Preserve deliberate immersive-mode hiding as a separate reader choice.

### 2. High: DP's sidebar has lost its information hierarchy

**Confirmed source and screenshot failure.** The original grouped sidebar supplies visible boundaries between theory, practice and appendices. The current flat mapping removes those boundaries even though every `category` survives in the imported book. The breadcrumb names the current category, but cannot replace an overview of the whole book.

**Restore:** add display-only headings and spacing for contiguous category runs in flat books. Follow the current home model's treatment at `frontpage-model.ts:88–104`: source order is authoritative; do not regroup distant repeated categories or duplicate a solitary category/title pair. Keep real nested trees unchanged. Category headings must not get routes, read state or chapter counts. Preserve existing sidebar scroll position, automatic current-path expansion, full active-row title and search behaviour.

### 3. Medium: outline clicks lose URL and reading-focus semantics

**Confirmed source and runtime failure; inherited in part from the originals.** `TableOfContents.tsx:83–89,133–138` prevents native navigation and calls only `scrollIntoView` plus local active state. Clicking “Why embodied” scrolls in the served build, but the URL remains `?book=deliberate-practice&section=schemas`, with no fragment; keyboard focus stays on the outline link. This prevents copying the selected subsection location and leaves subsequent keyboard reading in the navigation.

The existing manuscript-anchor handler already updates the fragment, focuses the target and preserves book/chapter identity (`use-publication-reader.ts:271–282`), but ignores a prevented event at line 259. Therefore the outline bypasses it. The originals also prevented default for scroll-only navigation; this is a current restoration requirement, not a newly invented historical regression.

**Restore:** route ordinary outline activation through the existing anchor behaviour. Keep real anchor hrefs and modifier/new-tab behaviour. Reuse canonical rendered IDs; encode fragments safely. Ensure Back/Forward within one chapter restores the fragment as well as across chapters: the existing fragment effect depends on chapter/highlight/theme, not URL fragment (`use-publication-reader.ts:111–125,149–164`), so same-chapter history needs a focused integration check. Do not create a new routing scheme.

### 4. Medium: rich heading labels and current-location semantics need a narrow repair

**Confirmed source mismatch with a synthetic reproduction; not an observed corpus maths-heading failure.** `TableOfContents.tsx:42` uses raw DOM `textContent`, which includes both visible MathML and its hidden TeX annotation. A detached DOM made from the actual renderer's `## Equation $x^2$` output reads `Equation x2x^2`; `getPublicationHeadings` yields the single canonical label `Equation x^2`. The raw result is in the evidence files. Do not remove MathML or alter source headings to fix this.

**Restore:** obtain labels from the existing canonical heading helper, while resolving targets against the rendered DOM. `publication-content/index.ts:42–82` already assigns deterministic namespaced IDs, resolves collisions and rewrites local links; `165–175` returns IDs, labels and original levels. `publication-html.ts:94–110,133–145` preserves heading IDs while decorating text safely. There is no source evidence that ordinary annotation marks destroy heading hierarchy; retain this pipeline.

Keep h2/h3 relationships visible and preserve authored levels. Several actual chapters begin their useful outline at h3; normalise visual indentation to the shallowest listed level rather than inventing missing manuscript h2s. Add `aria-current="location"` to the active outline link: current links have only a visual border/colour/weight (`TableOfContents.tsx:139–143`). A one-line link measured 20 pixels high; assess its usable hit area together with spacing and add padding where needed for the compact/touch presentation. This measurement alone does not establish an accessibility-standard failure. Keep visible keyboard focus and a readable full active label.

## Bounded restoration plan

1. **Book grouping:** change `packages/reader-core/src/original/Sidebar.tsx` and, only if needed, a small grouping helper in `publication-navigation.ts`. Reuse the home model's category-run rules. Do not modify book JSON or original manuscripts.
2. **Chapter outline:** change `packages/reader-core/src/original/TableOfContents.tsx` for the one-heading threshold, canonical labels, outline disclosure, current-location semantics and consistent link activation. Reuse `frontpage/layouts.tsx:197–200` as the existing accessible disclosure pattern; do not import the whole home component. The separate `src/components/reader/TableOfContents.tsx` also contains a subheading-collapse control; do not accidentally patch that unused component instead of the original-derived reader.
3. **Placement and routing:** use `ReaderLayout.tsx` only as needed to position the small-screen disclosure; use `reader-original.css` for rail/disclosure switching with the existing article-width budget. Use `use-publication-reader.ts` for `N`, heading activation and same-chapter history restoration. Coordinate these shared files with Sonnet after its current changes; no concurrent overwrite or root build is authorised by this review.
4. **Focused verification:** extend the relevant navigation checks after implementation. Add explicit cases for zero headings, one meaningful subheading and nested subheadings; a zero-heading page should still omit its outline. Keep read-aloud, Assist, text sizing, manuscript typography and release ownership with their current builder.

## Builder acceptance journey

- **Scan the book:** on DP home, switch Contents / Full contents, then enter Fluency as Target. Confirm eight display categories in the sidebar, the current chapter within Principles & Theory, and three local links with no duplicate h1. Open Schemas & Chunks: its seven local links must show the three “Why” subsections under their actual parent. Chapter routes and the 20-chapter progress denominator must remain unchanged.
- **Read on a laptop or smaller screen:** repeat at 1,440, 1,366, 1,280, 1,200, 1,024, 768 and 390 pixels, with the book sidebar both open and closed where supported. A rail or operable chapter disclosure must remain available, including the single “What is this” link in Language Muscle. Preserve the useful article width and no horizontal overflow. Keyboard-open the outline, activate a link, read with Space/Page Down, then return to navigation; focus must remain visible and meaningful.
- **Return to a passage:** activate a deep subsection, copy its URL, open it in a fresh context and confirm book, chapter and target. Use two subsection links in the same chapter, then Back/Forward; repeat across chapters. Test Enter, normal Tab and modified link activation. The active outline location must follow reading without changing progress merely because a heading was selected.
- **Preserve the other books:** open Language Muscle's Introduction landing page from home and from a child's breadcrumb, then its child pages; parent expansion must still work without duplicate rows. In Linguistics, preserve nine expandable topics and all 253 answer identities; verify local outlines on “Is music a language?” and the answer about becoming fluent by reading books. Check a nested heading after annotation and the synthetic maths label without rewriting source content.

These journeys are **acceptance work for the restoration**, not claims that the future implementation has passed. No action is required from Dominik; the parent session can pass this report to the builder.
