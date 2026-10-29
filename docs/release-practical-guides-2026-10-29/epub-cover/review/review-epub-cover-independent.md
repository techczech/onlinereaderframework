---
title: Independent focused review of EPUB covers and practical-guide integration
date: 2026-10-29
reviewer: Codex GPT-6.1 Sol, medium effort
status: clean-in-scope
scope: Optional EPUB cover API and Academic Productivity / Developing Competence integration
---

**Verdict: clean in scope. No actionable P1, P2 or P3 findings.** The optional cover role preserves the existing byte-validation boundary and produces valid EPUB cover references. This conclusion applies to the exact five source hashes in `pins-epub-cover-independent.json`. It permits the parent to continue its authorised build, import and publishing work; it does not establish public release acceptance.

## Independent source review

The review read `../receipt-epub-cover.md`, `../diff-epub-cover.patch`, `../source-hashes.json` and the current implementation. All nine supplied hashes match, including five source files, the two selected JPEGs and the builder's two archives. The scoped patch hash is recorded alongside them.

- In `packages/reader-core/src/services/publication-epub/index.ts:139–148`, duplicate hrefs, unsupported roles and duplicate cover roles reject before archive creation. The cover goes through `prepareAsset` and the existing aggregate limit. Role values are compared strictly; caller identifiers never become archive paths.
- In `packages/reader-core/src/services/publication-epub/epub-assets.ts:30–55`, cover bytes retain the existing media-type allowlist, signature/decode checks, raster dimensions, SVG policy and size limits. The only patch here adds the optional public role. Invalid JavaScript inputs can reject with a TypeError rather than a customised message; they do not bypass validation or leave the tested promise pending. This is consistent with the existing typed API and host error catch.
- In `packages/reader-core/src/services/publication-epub/index.ts:190–215`, the cover XHTML uses namespace-aware DOM construction, generated resource names and escaped metadata. Its manifest item, first spine item and landmark point to the generated files. A chapter referencing the same supplied href reuses the prepared cover asset. No-cover branches preserve the previous structure. The content renderer and MathML handling are unchanged.
- In `apps/reader-demo/src/App.tsx:1–2,69–77`, the two inline imports are selected by constant release identity and current book ID. The memo retains existing chapter assets and decodes once per selected ID. No fetch or effect is added. Other book IDs cannot receive a cover through this mapping. The README example accurately describes the public API.
- In `packages/reader-core/src/original/use-publication-reader.ts:286–299`, the existing async download handler awaits generation inside its try/catch and displays the existing failure toast. This was inspected in source. The full app toast interaction was not exercised.

## Fresh focused validation

From the repository root:

```sh
node docs/release-practical-guides-2026-10-29/epub-cover/review/verify-epub-cover-independent.mjs
```

Exit 0. The review harness reuses the builder's browser assertions and adds an independently written probe. It uses existing esbuild, the sibling book-engine Python environment and bundled `chrome-headless-shell` (browser 149.0.7827.55), with no dependency installation and zero recorded network requests. See `log-covers.txt` and the retained harness/probe.

Both real browser downloads passed exact selected-image hashing, cover MIME/signature, archive references, first-spine checks, chapter counts (7 and 9), and every chapter's source-rendered text comparison. Seven no-cover controls passed, including all five existing books. The twelve existing negative/shared-resource controls passed, including duplicate roles/hrefs, byte and dimension limits, SVG checks and deduplication. The aggregate-size control exercises the limit helper directly; it is not a full 100 MiB archive integration test.

The sixteen additional cases passed: all three supported byte containers; five malformed role values; four invalid data values and an unsupported MIME type; and three hostile-looking opaque identifiers. Each invalid-input check raced against a three-second timeout and rejected. For each supported container, a synthetic chapter's entire XHTML matched its no-cover counterpart byte for byte, including MathML; the MathML manifest property and XML-escaped title survived.

Installed EPUBCheck independently validated both review-owned downloaded EPUBs, each exit 0 with zero fatals, errors, warnings or infos:

```sh
epubcheck docs/release-practical-guides-2026-10-29/epub-cover/review/academic-productivity.epub
epubcheck docs/release-practical-guides-2026-10-29/epub-cover/review/developing-competence.epub
```

The two validation logs are retained. Actual downloaded archive hashes are in `log-covers.txt`; ZIP timestamps explain differences from builder archive hashes.

## Inherited evidence and limits

The builder's 19 existing EPUB regressions, declaration/README consumer check, typechecks and three actual release-plugin in-memory bundle checks remain inherited evidence. The bundle harness was inspected: it checks both complete selected base64 covers in each new edition and Academic Reading, asserting that only the selected edition contains its own cover. The constant gates additionally exclude both covers for every other release ID. These focused builds were not repeated. The independent packaging review remains inherited and its unchanged release/write-path patches were excluded.

No clean production build, import, deployment, live public test or full application error interaction was conducted. No public release acceptance is claimed. No agents, Git writes, commits or pushes were used. Review writes stayed in this folder; production sources, unrelated Czech Navigator work and dirty site files were not edited. Initial review-harness bundle attempts failed on dependency resolution; only the review harness was corrected before the successful run. Its scratch directory and browser were cleaned in finally blocks; no scratch directory remained.
