---
title: Three frontpage designs for the shared book reader
register: FOR DOMINIK
date: 2026-10-25
status: provisional-designs-awaiting-parent-presentation
author: Sol 6.1
scope: docs/design/2026-10-25-frontpage-sol only
---

# Three frontpage designs for the book reader

**No action needed.** Three interactive frontpage designs are ready for the parent session to present. **Jacket is my recommendation:** it gives each book a recognisable opening while keeping reading, search, download and contents together.

- **Jacket** pairs a large cover with a title page and places the contents underneath.
- **Reading desk** uses a compact app-style masthead and puts the next reading destination beside the contents.
- **Open contents** places a narrow book column beside a broad, searchable contents list.

Open [the interactive designs](frontpage-designs-sol-2026-10-25.html). Each design has its own tab. The book selector switches between the three actual publications; the frame selector switches between desktop and phone. The reading-state selector demonstrates a first visit and a returning visit. It reads no saved history.

## Why these differ

**Jacket** uses paper, a generous cover, book typography and a horizontal rule to separate the opening from the contents. The cover and title share the first row; the primary reading action sits with the title. On phones, the cover becomes a small companion to the title, followed by full-width reading actions and contents. It is the clearest middle ground between the books and the original apps. Its cost is vertical space, particularly with the current long Linguistics title.

**Reading desk** takes the compact header, sans-serif hierarchy, rounded action and restrained icon treatment from the original apps. The cover sits at the end of the masthead. A tinted reading panel names the next destination and changes from Start reading to Resume reading in the sample returning state. The searchable contents occupy the adjoining column. This is the strongest option for frequent return visits; it gives the cover less prominence.

**Open contents** gives the section tree the most space. A compact cover, title, author and download form the left column. The right column begins with a large contents heading, search and the actual ordered tree. On phones, the book column becomes a compact introduction above the list. This particularly suits Linguistics, whose 253 answers invite browsing. It gives the two sequential guides a less deliberate opening.

These are different geometries and entry priorities. Each also adopts the selected book's existing colours and cover.

## How each book adapts

**Linguistics** keeps the current title, Introduction to Key Issues in Language Through Stack Exchange Answers, and its existing subtitle. The repeated description is not printed again. Its terracotta accent and red-and-blue voices cover remain. The contents contain nine actual topic nodes and 253 answer nodes. Topic counts count answer leaves, not the nine topic containers. The long title is most comfortable in Jacket's wide desktop column and most space-consuming on the phone.

**Deliberate Practice** keeps Deliberate Practice: A Universal Learning Method. Jacket uses a stronger sans-serif title and the existing red accent with the ink-correction cover. Its 21 top-level entries are kept in source order. They include appendices, License and Reader Guide, so the interface says **21 entries**, rather than claiming 21 substantive chapters. Jacket arranges this flat list in two columns on desktop and one on the phone; the other designs retain a single scanning column.

**Language Muscle** keeps Building Your Language Muscle, its green accent and woven cover. Its source tree has four top-level nodes and 12 entries in total; nine are leaves. Parent sections also contain text. Start reading therefore opens the actual Introduction parent, rather than skipping to its first child. The contents preserve the four roots and all eight child entries. The interface says **12 entries · 4 top-level sections**.

The proposed title Language Beyond Grammar is not used. The unimported Medium and Metaphor Hacker essays do not appear in these designs.

## What is interactive

The mockups implement design comparison, book switching, frame switching, sample reading state, contents search, branch expansion and contents depth. Search matches the current book's section titles. A search finds matching entries at either level, even when the branch is closed. Search is a mockup of the entry point, not the production reader's full-text search.

The toolbar displays four separate icon-and-label controls: **Listen, Formatting, Assist and Notes**. Their actions show a design-only notice. They do not implement or alter the other builder's menus. Listen explicitly says no recorded audiobook is configured. Reading actions and contents links show the selected real destination in a dialogue; the eBook action explains the reader's EPUB destination without generating a file.

The returning state uses an explicitly labelled sample last-opened section from the current tree. It displays Resume reading and Start from the beginning, without inventing percentages, dates, completion or saved notes.

## Source map and reuse

The original sources were inspected read-only. These mockups reuse their visual patterns and source text, rather than importing their production components.

| Source | Reuse in these designs |
| --- | --- |
| `apps/reader-demo/src/App.tsx` | The three existing accents, paper/ink identities and cover descriptions establish the book adaptations. |
| `apps/reader-demo/src/books/original-publications.json` | Exact titles, author, descriptions, section IDs, categories, source order, hierarchy and presence of section content drive the snapshot. |
| `packages/reader-core/src/original/Home.tsx` | The book-first masthead, start/search/eBook actions and automatic recursive contents establish the shared home responsibilities. |
| `docs/configuration-publication-reader.md` | The existing section-tree depth contract and distinction between recordings and browser read-aloud inform the mockup. |
| Original Deliberate Practice `components/Home.tsx` | The direct start/search/eBook action group, compact action hierarchy and author identity inform Reading desk. Its marketing feature cards are not carried over. |
| Original Language Muscle `App.tsx`, Home and Layout | The green serif identity, small book icon, rounded primary action and labelled icon controls inform the adaptations. The original audit and AI-coach promises are not added to the current book snapshot. |
| `apps/reader-demo/public/covers/` | All three existing provisional cover images are copied into this folder and resized for the offline mockup. Their production files are untouched. |
| Original Language Muscle's installed `lucide-react` 0.554.0 | Eighteen actual icon node definitions are embedded. The local licence notice accompanies the copied paths. No letter or hand-drawn substitute icons are used. |
| Existing visual-preferences design report and the parent brief | The brief's latest four-button toolbar instruction supersedes the earlier report's combined assistance proposal. |
| The reader's existing Dev Traffic Control roadmap | Distinct book identity, automatic configurable contents and the unresolved scrolling design inform the boundaries. |

The original apps are `/Users/dominiklukes/worktrees/guides/deliberate-practice-guide` and `/Users/dominiklukes/worktrees/guides/building-your-language-muscle`. The current snapshot's source hash is preserved in [the editable book source](sources-frontpage-books.md). No project-root CONTEXT file or local ADR directory was present; the current configuration, upgrade plan and reader roadmap supplied the available decisions.

## Checks and limits

The focused offline browser check passed **461 assertions over 36 combinations**: three designs, three books, two frame sizes and two reading states. It checked exact contents IDs/order/counts, current titles, four separate toolbar labels, first reading destinations, image proportions, horizontal fit, search, expansion, depth, mock destinations, Escape, book switching and keyboard tab switching. Eighteen first-visit screenshots are saved in `evidence/`.

At comparison widths of **360 and 728 pixels**, every checked state stays below 2,000 pixels. The maximum was **1,872 pixels**. Desktop frames represent 1,120 pixels, scaled to the available comparison width; phone frames use the available width up to 390 pixels. Contents lists scroll within a bounded area to keep the comparison compact. That device-frame treatment does not settle the production reader's scrolling design.

The final HTML is self-contained. The structural audit found no blockers or warnings, and the browser observed no external requests or page errors. A representative Markdown copy edit reached the rebuilt HTML, was restored, and produced the same output bytes. These are mockup checks, not production reader, accessibility conformance, EPUB or release acceptance tests. No separate reviewer or model was called.

**ReportScout registration remains pending.** The installed registration function runs Git pull, add and commit operations in the report inbox, including for `--in-place`. The parcel explicitly prohibits Git. It was inspected, not run; the handoff includes the exact command for the parent to run under its own authority.

All authored files are inside the assigned design folder. No production, manuscript or original-app file was changed. No Git operation, publication, deployment, root build or production test was run. No preview server was started. Ownership of this folder is released to the parent session; the parent's next step is presentation and registration, followed by the user's design choice before production work.
