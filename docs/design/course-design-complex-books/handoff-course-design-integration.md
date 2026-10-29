---
title: Course Design candidate integration and verification
date: 2026-10-29
status: candidate-ready-for-parent-integration
---

# Course Design candidate

The coordinator approved the bounded conversion and licence rendering correction after reviewing the initial inventory. The initial inventory's pending approval statements describe that earlier stage; this handoff supersedes them. The implementation changes only the three Course Design JSON files, four Course Design interactive folders and this design folder. No shared registry, core, schema, sandbox protocol, exporter, release or source changes were made. No commits, push or deployment.

## Candidate files

- `apps/reader-demo/src/books/next-books/course-design-frameworks.book.json`: nine ordered sections; semantic HTML, all original headings, paragraphs, lists, checklist items and matrix/planner cells.
- Adjacent `course-design-frameworks-provenance.json`: original file SHA-256 hashes, complete source string inventory, ordered rendered values with source property paths, conversion input hashes, metadata dispositions and the approved placeholder omission.
- Adjacent `course-design-frameworks-embed-manifest.json`: standalone PublicationEmbeds object with four descriptors.
- `apps/reader-demo/interactives/course-design-frameworks/{qa-checklist,activity-planner,modular-planner,building-checklist}/index.html`: self-contained local resources. Existing embed-child helper bundled into each. No network, added sandbox grants or persistence.

All planner cells remain editable, including row labels. Native labelled textareas replace contentEditable. Checklists use native labelled checkboxes, progress output and Reset. The visible notice states that entries are not saved and reloading/leaving may clear them. The written version contains the complete source worksheets independently of user entries. No user entries enter the canonical book or generated agent/EPUB inputs.

The source image at `data.ts:sections[0].data[2].content` is omitted under coordinator approval. Its exact label “Creative Commons Licence” links to https://creativecommons.org/licenses/by-sa/4.0/. The source metadata date “Nov 2025” is retained in provenance. No cover or canonical edition URL is supplied.

## Parent integration

These are proposed shared edits for the parent, not changes made by this parcel:

```ts
import courseDesign from './next-books/course-design-frameworks.book.json';
import courseEmbeds from './next-books/course-design-frameworks-embed-manifest.json';
// Add courseDesign as PublicationBook to demoBooks.
// If keeping the combined manifest, add the following entry to its books object:
const entry = {
  bookFile: 'course-design-frameworks.book.json',
  interactivesDir: 'interactives/course-design-frameworks',
  items: courseEmbeds.items,
};
// books['course-design-frameworks'] = entry;
```

The existing registry derives `root: embedRootOf(bookId)` (currently `embeds/<book-id>/`) and drops the explanatory placement field. Use `courseEmbeds.items` with that existing mechanism. Copy the four interactive subfolders under that chosen root using the existing demo/release asset mechanism. The standalone manifest's `interactives/course-design-frameworks/` root is for the isolated fixture; do not blindly carry it into an edition served under `embeds/`. No `base` or edition URL is invented. Publication and cover/edition identity remain with the parent. No release eligibility is asserted.

## Reproduction

Run from the reader repository, using its existing installed dependencies:

```sh
apps/reader-demo/node_modules/.bin/tsx docs/design/course-design-complex-books/convert-course-design.ts
apps/reader-demo/node_modules/.bin/tsx docs/design/course-design-complex-books/test-course-design.ts
node docs/design/course-design-complex-books/test-course-design-browser.mjs
```

The converter reads the sibling Course Design repository only. No new dependencies. Interface copy is editable in `copy-course-design-interactions.md`; original author content remains sourced directly from read-only `data.ts`. Browser fixtures import the real PublicationReader and existing content/embed/EPUB/text-model implementations; no shared registry is involved. The browser runner uses the existing book-engine Python environment and installed Chromium headless shell 1228 explicitly because that Python Playwright version's default browser build is absent. Browser profile scratch is created under this design directory and removed in finally. The in-process localhost fixture server stops after the run.

## Verification and limits

- Independent traversal of source data matches the converter's 311 rendered values in exact order. Empty worksheet cells and newline content are retained. Source-file hashes are checked against provenance.
- Rendered HTML and agent export coverage pass; agent exporter returns 12 files. Table captions, column header scope and row header scope survive sanitisation. List items remain lists inside their table cells.
- 78 real-browser checks pass at 390 px and 1280 px: sandbox is exactly allow-scripts; keyboard checkbox toggles; progress and Reset; labelled editable planner cells; clearing on reload; keyboard-focusable table scroll regions; no document overflow in all nine reader sections; written alternatives present; no external requests.
- The actual EPUB generator produces nine chapters. All 311 values survive in source order through EPUB and publicationTextModel (the read-aloud DOM pathway). EPUB test extraction respects br separators. This is content coverage, not epubcheck certification or a listening-quality assessment.
- Full browser results are in `evidence-course-design-browser.json`. The fixture bundle is built in memory. No screenshot artefact or server remains.
- Search and assist share the complete written content; no new code changed their behaviour. Dedicated search UI, note persistence and assist UI acceptance were not exercised in this parcel. Existing-book live checks and full release gates remain the parent's integration work. Five published editions were not modified by this parcel.

A fixture-only browser bundle initially selected JSZip's Node entry; using its installed browser bundle resolved that test setup error. Another test initially concatenated XML br text; explicit separator handling corrected the test, without exporter changes. No shared seam defect was reproduced.

## Reuse for Instructional Videos

Supported here: ordered source-to-content derivation with property provenance; semantic tables containing lists; complete written alternatives; optional same-origin sandbox resources using existing descriptors and height reporting; temporary local checklist/planner interaction; export/read-aloud content coverage without frame content or user entries. These are available patterns for a later conversion, not a claim that Instructional Videos is supported in full.

Untested for Instructional Videos: its source inventory and exact author text, video playback/provider policies, captions/transcripts, time-linked references, media rights and offline/export alternatives, diagrams or interactions absent from Course Design, and responsive/keyboard behaviour of those new resources. Instructional Videos has not been converted. No new worksheet, persistence, graph or schema API is proposed.
