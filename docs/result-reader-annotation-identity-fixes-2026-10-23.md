---
title: Reader annotation, publication identity and native import fixes
date: 2026-10-23
register: FOR DOMINIK
status: implementation-complete-ownership-released
review_checkpoint: cbcb1cb6d688e25f922fd4821ba498f0f1cfbd41
implementation_base: 08324558cd38c0f05467522be4fe0940fe8854e7
source_sha256_original_module:
  publication-html.ts: 7bee6cfbd656bdb80971f6aa86ba92e6b71e15edc4d64b2b5dd1276bcf0fc98b
  publication-model.ts: ac8d7633b770e0a39df57db4b4afb1ea2947ac462450be333a2f36a1d6c0d826
  ReaderLayout.tsx: a68173a796794c452e5def831f5422f141d844a30e00deb09ee97f36463fe3fd
  test-original-reader.mjs: ed48e13b4f82ae5a3f0e9d0b4ac9f4ab991b206307b6adb9e392f05837a07ac9
  test-original-reader-browser.mjs: 89d7399e844e827798d5a388dbca2feccae6eeeca0d1f3382361122913eb2e8a
  test-original-reader-identity-browser.mjs: e2132d6277b84323e4e6d8f36e0c52373bc716afbf509aaa2fe7753483552282
  test-original-reader-headless.mjs: 4945843feced62ad36f1686bc8bd433e7313021203aba00e2305960e4bbb592d
---

No action needed. FOR DOMINIK.

- **Both demonstrated review defects are repaired.** Unicode quotations restore and paint the intended text, and quote images include the complete authored book name.
- **The original reader module now supports native ESM resolution.** Its relative TypeScript imports and exports use explicit JavaScript paths.
- **All checks passed:** 36 repository tests, 28 browser checks and the demo TypeScript check. The parent retains final package and release acceptance.

## Unicode annotation offsets

The original code searched a lowercased string and applied its offsets to the original UTF-16 text-point array. U+0130 expands from one code unit to two during lowercasing, shifting subsequent positions. Expansion inside a quotation also made its end position too long.

[publication-html.ts](../packages/reader-core/src/original/publication-html.ts) now supplies one internal `publicationTextMatcher` to both decoration and range restoration. It lowercases the complete search text, retaining contextual Greek sigma behaviour, and maps lowercased code-point boundaries back to original UTF-16 positions. It rejects a match that cuts a surrogate pair or an expanded character. Both consumers continue to use `publicationTextModel`; the original markup, classes, whitespace model and longest-overlapping-highlight priority are retained.

The browser regressions were written and run **before the production repair**. With `<p>İ first. Working <strong>memory</strong> later.</p>`, both the actual DOM range and painted mark text were `orking memory ` instead of `Working memory`. With expansion inside the phrase, both included a trailing space. With expansion before and inside it, both returned `orking İ memory l`. Ten of the twelve added annotation cases failed before the repair; all twelve now pass.

The passing cases cover expansion before, inside, and both before and inside the quotation; supplementary Deseret case conversion with an emoji prefix; decomposed combining text across markup; a decomposed quotation matching U+0130; contextual Greek lowercasing; rejection of partial expansions and surrogate pairs; missing and empty quotations; and repeated occurrences with overlapping selections. Each ordinary fixture checks `Range.toString()`, the joined mark text, unchanged surrounding text, non-zero rendered range geometry and visible mark backgrounds. The overlap fixture also retains its original paragraph class, emphasis and link destination, paints both longer occurrences and suppresses the shorter overlap.

## Full publication identity in quote images

[publication-model.ts](../packages/reader-core/src/original/publication-model.ts) exports:

```ts
publicationDisplayTitle(book: Pick<PublicationBook, 'title' | 'subtitle'>): string
```

The helper joins the authored title and subtitle with a space, retains supplied punctuation and removes a repeated suffix/prefix word overlap. It does not change book IDs, authors or adapter data. Tests use the actual adapter and also cover absent subtitles, whitespace and duplicate title/subtitle words.

The actual quote-modal callsite in [ReaderLayout.tsx](../packages/reader-core/src/original/ReaderLayout.tsx) now passes `publicationDisplayTitle(book)`. `QuoteImageModal.tsx` already paints the supplied value correctly and needed no modification. All visual markup and styles remain intact.

Before the repair, the real selection toolbar and canvas produced `Building Your` for Language Muscle and `Deliberate Practice:` for Deliberate Practice. After the repair, actual canvas `fillText` calls include:

```text
Dominik Lukeš
Fine-tuning your aims
Building Your Language Muscle
```

```text
Dominik Lukeš
About This Guide
Deliberate Practice: A Universal Learning Method
```

These probes mount the public `PublicationReader` with the real adapter books, select an actual paragraph and activate its **Share as Image** button. Both generated PNG previews decode to a width of 1080 pixels, and both execute the actual 150-pixel QR image draw. The final run bundles the installed **qrcode 1.5.4** browser runtime from `packages/reader-core/node_modules/qrcode/lib/browser.js`; the harness verifies that exact module is included. The runtime upgrade and manifests belong to the parent.

The EPUB owner can import the helper now from `../../original/publication-model.js` relative to `services/publication-epub/index.ts`. No EPUB metadata or service code was changed by this worker.

## Native JavaScript module imports

The parent subsequently authorised changes to all relative TypeScript module specifiers in `original/`. Exactly **38 specifiers across eleven production files** now use `.js` or `/index.js`, including type-only imports, the public type export and the dynamic EPUB import. Intentional `.ts` source imports in the `.mjs` tests remain unchanged. Outside the two repairs above, these edits change only module specifiers.

A new Node regression compiles the core into a removable directory under the original module and imports its emitted `original/PublicationReader.js` with native Node ESM, without a bundler or browser globals. Before the specifier changes it failed with `ERR_MODULE_NOT_FOUND` for the extensionless `original/publication-model` import. After the changes it imports successfully and exports `PublicationReader` as a function. This verifies the original reader entry; the packaging owner retains the final public-barrel and packed-consumer checks.

## Verification commands and results

Run these from the repository root:

- `npm test` exited 0 after all final source changes: **23 publication-content tests, 8 original-reader tests and 5 real-book tests passed**, with no failures. The eight original-reader tests include full-title behaviour and the actual native ESM import. The native-import regression also performs a fresh complete core TypeScript compilation.
- `node packages/reader-core/src/original/test-original-reader-headless.mjs` exited 0 after the import changes: **14 existing browser checks, 12 annotation regressions and 2 actual quote-image checks passed**, with no failures.
- `apps/reader-demo/node_modules/.bin/tsc --noEmit -p apps/reader-demo/tsconfig.json` exited 0 after the import changes. A separate core `tsc --noEmit` check also passed before the import-only changes; the final native regression recompiles the changed core.
- `git diff --check` produced no diagnostics. The final test runners remove their scratch directories in `finally` blocks, and no original-reader test directory remains.

The browser harness builds the current checkout in memory using installed esbuild and the sibling `book-engine/.venv` Python Playwright installation. It uses an in-memory document on the existing production origin at port 8773, with that preview's stylesheet. The browser is **Chromium headless shell 153.0.8010.12**, using the cached `chromium_headless_shell-1243` executable, never real Chrome. Browser scratch is confined to a removable directory under the original module. No new server is started, and no Vite configuration or `.env` file is loaded.

## Other book-title uses inspected

The title audit covered the original reader, demo host and publication EPUB service:

- `Home.tsx` renders the intended separate title/subtitle hero and uses the subtitle as an overview fallback. `Sidebar.tsx` also displays both fields separately. These structures are retained.
- `ReaderLayout.tsx` still passes only `book.title` to `HighlightsDrawer`. That drawer forwards it to the Markdown notes export, so Language Muscle's exported notes heading still uses “Building Your”. Changing notes identity is outside the authorised minimal sharing callsite.
- The demo host's `App.tsx` already combines title and subtitle in `document.title`.
- At inspection, the EPUB service used `book.title` for its XHTML document title, title-page heading, introduction navigation label, OPF title and filename. The title page separately renders the subtitle. The parent and EPUB worker own any helper adoption there; their concurrent edits are outside this receipt.

## Scope, evidence and handoff

Read the complete implementation review, original upgrade plan, initial architecture review and extraction/provenance report. The repairs preserve the existing EPUB wiring from the starting implementation commit. All source changes are confined to `packages/reader-core/src/original/`, plus this requested receipt. Other agents' changes, manifests, root exports, services, adapters, authored book text and original repositories were preserved.

The parent's newly reported **515-hash source proof** and restored `defaultExpanded` flag are supplied evidence, not an independently rerun source comparison here. The five repository book tests above are independently run evidence with their narrower stated assertions.

These results establish current-source behaviour, native import of the compiled original entry and actual quote-canvas generation. They do not certify a final immutable package, public-barrel SSR, visual approval, physical-device behaviour or clipboard permissions. The parent owns package review and release decisions. There were no Git mutations, deployment, secret or `.env` reads, or delegation.

**Original-module code ownership is released.** The parent can resume integration and the EPUB worker can adopt the full-title helper. No action is required from Dominik.
