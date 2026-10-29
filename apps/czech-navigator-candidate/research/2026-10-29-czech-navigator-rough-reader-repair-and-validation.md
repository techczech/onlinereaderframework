---
status: "source-recovery-blocked"
updated: "2026-10-29"
title: "Czech Navigator rough reader repair and validation"
kind: "evidence"
created: "2026-10-29T18:30:12Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/czech-navigator-candidate"
sources:
  - file: scripts/build-czech-navigator.py
  - file: research/validation-czech-navigator-epub.txt
---

# Czech Language Navigator reference candidate

This candidate uses the actual Online Reader Framework PublicationReader. It is built from the preserved Czech materials archive extraction, **not a verified latest Word manuscript**. It is a local reference candidate, not an accepted publication or store package.

Run from this directory with `npm run dev`; build with `npm run build`. The existing sibling reader-demo dependencies supply the toolchain through a local node_modules symlink. No dependencies were installed or shared reader files changed.

The generated book has 12 ordered sections, 308 HTML tables and 9,652 table cells. The EPUB contains the same number of tables and cells. Section splitting preserves the complete generated HTML byte for byte. The source Markdown is copied unchanged; only derivative media paths change. Table borders, alternating rows and horizontal scrolling are added separately from manuscript text.

## Source and fidelity

The archive's onedrive-manifest.json records the main Word manuscript at 880,134 bytes, modified 4 December 2025. The alternative copy is dated 11 February 2025; the PDF is dated 30 October 2021. These are historical manifest observations, not live source verification. Direct folder enumeration and direct reading of the exact main Word path both failed with OneDrive TimeoutError, including an unsandboxed read. The archived extraction is dated 17 January 2026. No Word original was changed or recovered successfully. No canonical writing Folio was created, because its source cannot yet be verified.

The reader description labels the source uncertainty. The original credits for Dominik Lukeš and Jitka Kauerová and CC BY-NC-SA 4.0 licence are retained. Existing draft markers, spelling and Czech diacritics were not editorially changed.

## Validation and limitations

The Vite production build succeeded. The shared content renderer's 23 tests passed, including sanitisation and complex table support. The generated book contains no absolute /Users paths or file URLs. Unique chapter identifiers and lossless section segmentation passed.

EPUBCheck failed with 22 errors. Nineteen WMF figures lack compatible fallbacks; other errors include unresolved source fragments. ImageMagick could not decode WMF because its LibreOffice delegate failed. The generated EPUB is retained as a diagnostic candidate and must not be used as an Amazon or Lulu replacement. No browser interaction or screenshot verification was performed, so this is a build-verified candidate only. The original Word merged-cell structure, chapter completeness and exact text have not been verified. Security harvest reported zero critical/high and two medium findings for the existing framework.

The framework checkout already contained concurrent release work. An initial pull refused because it was dirty; no stash, reset, branch change or shared-file edits were made. All candidate work is isolated here.

## Resume

Restore access to the exact Word source in personal OneDrive, preserve its bytes and metadata, then compare it with the archived extraction and PDF before declaring the canonical Folio. Rebuild from the verified manuscript, resolve vector figures and source fragment targets, run EPUBCheck and browser checks, and then file the candidate review in Dev Traffic Control. No candidate review has been requested while the latest-source requirement remains unmet. DNS, store publication, audio and editorial rewriting remain outside this candidate work.

## Rough candidate repair — 29 October 2026

The initial blocked state above is retained as history. Latest Word comparison remains pending, but it is not a prerequisite for trying this rough reader.

The candidate now includes the reader's Tailwind/PostCSS configuration. All 19 preserved WMF figures were opened directly by LibreOffice Draw and exported as PNG, then whitespace-cropped deterministically with ImageMagick. Originals remain in public/media; converted names end in -wmf.png to avoid overwriting unrelated archive rasters. Conversion diagnostics are in research/validation-czech-navigator-wmf.txt. No image was guessed, redrawn or removed.

EPUB metadata uses en because the explanatory prose is English, with Czech examples. EPUB chapter splitting uses level 2, producing 12 chapter files. EPUBCheck now reports one error, zero warnings: the original Collocation bookmark in the complete contents has no defined target in the extraction. The source explicitly contains “Error! Bookmark not defined.” No substitute target was invented. This EPUB remains a diagnostic rough candidate, not a store-ready package.

The production build passes and the 23 existing publication renderer tests pass. Coverage confirms 308 tables, 9,652 cells, identical ordered cell text, and lossless HTML section segmentation. The text-token comparison preserves the manuscript vocabulary but reports three generated footnote-marker differences (one numeric 2 and two return arrows); it is not byte equality of EPUB text. The original Markdown hash remains 15cd2e53891ee72399775be88900e9ba867c54302894467545500ed5e187633f.

Hidden bundled Chromium checks exercise chapter selection, Czech search and desktop/mobile tables. Screenshots and diagnostics live in research/. Use npm run dev for a local reader or npm run build followed by npm run preview for the built edition. The test script records the installed bundled Chromium path and its local preview port. No real Chrome was used. No publication, DNS, store or audio work was done. No shared framework changes were made. Independent review belongs to the parent session.
