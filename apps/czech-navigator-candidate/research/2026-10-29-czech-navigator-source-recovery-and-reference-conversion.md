---
status: "source-recovery-blocked"
updated: "2026-10-29"
title: "Czech Navigator source recovery and reference conversion"
kind: "evidence"
created: "2026-10-29T18:19:22Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/czech-navigator-candidate"
sources:
  - file: /Users/dominiklukes/gitrepos/08_czech-teaching-projects/czech-materials-archive/manifests/onedrive-manifest.json
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
