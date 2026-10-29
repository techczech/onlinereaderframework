---
title: Optional EPUB covers implementation and verification
status: awaiting-independent-review
date: 2026-10-29
---

Implemented optional `PublicationEpubAsset.role: 'cover'`. The existing assets option supplies vetted bytes; no new options object or exported type is needed. A cover uses existing image validation, counts towards existing limits, receives `cover-image`, and is referenced by a cover XHTML page, first spine item and navigation landmark. Duplicate roles, duplicate hrefs and unknown roles reject. A chapter can reuse the cover resource without embedding it twice. No cover means the existing introduction-first structure.

The app imports only the two selected JPEGs as inline data. Compile-time release guards exclude the other book's bytes. A memo keyed by book ID decodes the selected data once per selection, with no fetching or effects. The app keeps the existing asset mapping and existing reader download error handling (use-publication-reader.ts catches rejection and displays its existing toast). No UI changes were made. The imported JPEGs match selected-covers.json exactly.

Changed source paths:

- apps/reader-demo/src/App.tsx
- packages/reader-core/src/services/publication-epub/index.ts
- packages/reader-core/src/services/publication-epub/epub-assets.ts
- packages/reader-core/src/services/publication-epub/README.md
- packages/reader-core/src/services/publication-epub/publication-epub-covers.browser-test.mjs (new)

All other new files from this work are in this evidence folder. diff-epub-cover.patch includes the new test. source-hashes.json pins source, exact selected JPEGs and actual downloaded ZIPs. baseline-diff.patch records the separate pre-existing packaging changes; a final byte comparison confirmed they were unchanged. No commits, pushes, agents, deployment, dependency changes or production release writes.

Verification commands from repository root (final exits all 0):

- `node packages/reader-core/node_modules/typescript/bin/tsc -p packages/reader-core/tsconfig.json --noEmit` — log-core-typecheck.txt.
- `npm run check --prefix apps/reader-demo` — log-app-typecheck.txt.
- `node packages/reader-core/src/services/publication-epub/verify-publication-epub-regressions.mjs` — log-existing-regressions.txt, 19 passing checks, no network requests.
- `node docs/release-practical-guides-2026-10-29/epub-cover/verify-covers.mjs` — log-covers.txt. Uses existing esbuild, sibling book-engine Python environment and bundled chrome-headless-shell. Real download events save the two EPUBs; the downloaded ZIPs are reopened for MIME/signature/exact image hash, manifest, XHTML references, first spine item, landmark, 7/9 chapter counts and every chapter's source-rendered text. Seven no-cover controls include all five existing published books. Twelve negative/shared-resource checks cover duplicate roles/hrefs, invalid/empty/oversized/undecodable data, SVG scripting/missing fragments, raster dimensions, aggregate bytes and cover/chapter deduplication. Zero network requests.
- `apps/reader-demo/node_modules/.bin/tsx docs/release-practical-guides-2026-10-29/epub-cover/check-bundles.mts` — log-bundles.txt. Actual Vite release plugin and projection, in-memory builds with write:false/publicDir:false: both new editions contain their own complete base64 cover and exclude the other's; Academic Reading contains neither. These are focused integration builds, not clean production builds.
- Core TypeScript `--emitDeclarationOnly` to an owned .declarations scratch folder, followed by a noEmit TypeScript consumer of the emitted service declarations with the exact README example and typed PublicationEpubAsset cover — log-declarations.txt. Both exit 0. Generated declarations and consumer scratch removed.
- Installed `epubcheck` on each final downloaded EPUB — log-epubcheck-productivity.txt and log-epubcheck-competence.txt. Both report 0 fatals/errors/warnings/infos. This is archive validation, not certification.
- `git diff --check` — exit 0.

The cover harness was corrected during development for an import-depth error and a shared-image fixture using a source scheme the renderer intentionally excludes. The bundle harness was switched to .mts to support top-level await. Final logs reflect successful runs. ZIP timestamps and modification metadata change ZIP hashes across runs; downloadSha256 in log-covers.txt is the actual saved ZIP hash, while zipSha256 is a JSZip reserialisation hash. Use source-hashes.json for final archive identity.

Parent review: inspect the pinned patch and hashes, independently review the public optional role and byte-validation seam, and rerun focused checks. Check app compilation continues to exclude unselected cover bytes if release configuration changes. The parent owns clean source-tree production builds, full app download UI/error interaction, imports and acceptance. The download rejection route was inspected in source; the full app UI was not exercised here. Inline JPEG bytes increase each new edition's JavaScript by its own base64 cover size. Existing asset limits and SVG policy are unchanged. No acceptance verdict is claimed.
