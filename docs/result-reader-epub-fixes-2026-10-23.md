---
title: EPUB review fixes and verification receipt
date: 2026-10-23
register: FOR DOMINIK
status: implemented-and-verified
agent: GPT-6.1 Sol High
scope: Publication EPUB service and this result document
baseline_supplied_by_parent: 08324558cd38c0f05467522be4fe0940fe8854e7
---

No action needed. FOR DOMINIK.

- **Both blocking EPUB findings are fixed.** Supported chapter routes resolve inside the archive, and XML cleanup cannot silently collapse content IDs.
- **Full book titles now identify EPUBs.** Metadata, navigation and download names use the reader's shared title helper.
- **All 19 regression checks pass.** The three real books and two supplied-content fixtures remain EPUBCheck-clean, with zero network requests.
- **The parent can review the changes immediately.** Package build changes and reader UI remain with their respective workers; no action is required from Dominik.

## Findings disposition

**Spec 1, supported reader routes: fixed.** The exporter recognises `?section=b` and `#/b?text=target`, with or without a source URL. It separates legacy section IDs from their query parameters, decodes section IDs and fragment targets, and rewrites recognised routes to included chapter files. Reader text-selection parameters do not become chapter IDs. Query routes to the book's home resolve to the introduction.

Book identity is checked separately from unrelated host query parameters. Explicit links to another book, host or path remain external when resolvable. Absolute same-book reader routes also resolve internally when the supplied source URL identifies that reader location. Synthetic parsing bases never establish the identity of an external host. Missing section and fragment targets reject with explicit errors. See [route rewriting](../packages/reader-core/src/services/publication-epub/index.ts#L78).

**Spec 2, XML character cleanup and final references: fixed by explicit rejection.** Content containing XML-forbidden characters is rejected before the shared renderer assigns IDs. Decoded attribute values are checked again before XML copying, catching numeric character references such as `&#1;`. Consequently, `a` + U+0001 + `b` cannot collapse into `ab`, whether used for ordinary elements or SVG gradients. This deliberately rejects affected input rather than guessing which formerly distinct target a reference intended. See [input and attribute checks](../packages/reader-core/src/services/publication-epub/epub-xhtml.ts#L43).

After content copying, image changes, chapter routing and XML serialisation, the exporter reparses every final XHTML and SVG document. It then checks final IDs for uniqueness and invalid whitespace, resolves local and cross-document fragments, and checks local SVG paint and href references against those final IDs. This happens before returning the archive Blob. Missing local fragments now reject explicitly; valid encoded fragments, paired footnotes, repeated backlinks and distinct gradient references remain intact. See [final reference validation](../packages/reader-core/src/services/publication-epub/epub-references.ts#L1) and its [final export invocation](../packages/reader-core/src/services/publication-epub/index.ts#L194).

**Full book identity follow-up: fixed.** The exporter imports `publicationDisplayTitle` from the UI worker's existing model through an explicit `.js` specifier. The helper supplies `dc:title`, the introduction's metadata title, the navigation metadata title and introduction link label, and the download filename. Existing visible introduction title and subtitle elements remain separate. Regression cases cover the actual split Language Muscle title, Deliberate Practice's colon and subtitle, the actual Linguistics title and subtitle, a title-only book, and an overlapping title/subtitle. Filename sanitisation and the existing 100-character limit remain in effect. No file outside this worker's ownership was changed to provide the helper.

**Standards 3, package stylesheet/font build: left to the packaging worker.** No package manifest, build script or release plan was changed here.

**Standards 4, native imports: verified for this service.** Every relative service import uses an explicit `.js` specifier. The verifier now compiles the service and its dependencies into an isolated folder, then imports the emitted service natively as ESM without DOM globals. Both public EPUB functions are present; generation rejects with the browser requirement. The existing bundled CJS import check also passes. This receipt makes no claim about native import of the full package barrel, which belongs to the packaging worker.

## Failing and passing reproductions

Before production edits, the new browser regression runner exited **1**, with **11 failures and five passing controls**. The legacy route reported `Publication chapter link targets a section outside the EPUB: b?text=target`. Query routing failed the archive-target assertion. The literal and entity-decoded forbidden-ID cases returned successful archives instead of rejecting. Missing local and query-route fragments also returned successfully. The split Language Muscle and Deliberate Practice titles failed the EPUB metadata assertion.

After the initial fixes, all 16 initial cases passed. Additional checks then demonstrated that the navigation metadata still lacked the full book title, and that an absolute URL matching a synthetic parsing base could be mistaken for an internal route. Those checks were observed failing before the corresponding corrections. The final runner passes **19 of 19 checks**. An initial combined-suite invocation also exposed esbuild removing a bare test import under the package's side-effect policy; using an explicit named test export corrected that harness failure.

The regression runner covers query and legacy routes, source/no-source operation, book identity and unrelated host parameters, external links, encoded section IDs and fragments, forbidden ordinary and SVG IDs, numeric character references, missing fragments and chapters, repeated footnote backlinks, distinct SVG gradient targets, supplied SVG missing targets, final XML duplicate/reference checks, and all five title cases.

## Reproduction commands and final evidence

Run these commands from the owning repository:

```sh
node packages/reader-core/src/services/publication-epub/verify-publication-epub-regressions.mjs
node packages/reader-core/src/services/publication-epub/verify-publication-epub.mjs build/reader-epub-assets.json
```

The standalone regression command exited **0**, with 19 passing checks and no network requests. The complete verifier exited **0**. It includes isolated TypeScript compilation, native ESM and bundled CJS service imports, all 19 regressions, the existing exporter checks, and archive/EPUBCheck validation. An additional no-emit TypeScript check of the service passed with strict checking and the existing Bundler resolution settings.

The final complete run finished at **2026-10-23T13:03:48.712126+00:00**. It used Node **26.12.1**, Playwright **1.64.0**, Chromium **153.0.8010.12**, and EPUBCheck **5.4.0**. Its 26 recorded check groups passed. All original negative asset/security checks remained enabled, and both browser runs recorded **zero network requests**.

- **rich-fixture** passed ZIP/XML and EPUBCheck with zero messages. It contained 4,880 bytes; SHA-256 was `6f569b4a43a11bc833b7a5d83aad16ad02dc1e0027aceec835f7e18c8d254958`.
- **svg-asset** passed ZIP/XML and EPUBCheck with zero messages. It contained 3,506 bytes; SHA-256 was `ad84175ac227879d8940684d196d6ebd5f06a93564f494a9b307cd6b6f62c38a`.
- **deliberate-practice** passed ZIP/XML and EPUBCheck with zero messages. It contained 101,158 bytes; SHA-256 was `b3eae0c982396795b6358ea2eb69829d1b91e08c82e37cdec6926c6d2f7c89cf`.
- **language-muscle** passed ZIP/XML and EPUBCheck with zero messages. It contained 42,694 bytes; SHA-256 was `f2e918f65312e565b959c4b6d9c86448710ca5386e97c967b891be0d85d90519`.
- **linguistics** passed ZIP/XML and EPUBCheck with zero messages. It contained 372,755 bytes; SHA-256 was `4cfa96ce2d6cf716eb27554bec5817dfd6e6d21cf7d3ee30169f2c56037f7565`.

Every real-book chapter retained exactly the shared renderer's text and counts of tables, images, code blocks, SVG and MathML. The checks covered Deliberate Practice's 21 sections, Language Muscle's 12 sections and Linguistics' 262 sections, including its nine theme containers. They used the current parent-managed demo snapshots and the parent's original icon bytes from `build/reader-epub-assets.json`; neither was edited here. This is renderer-to-EPUB fidelity evidence. The parent's separate original-source comparison remains its own check.

The [machine-readable verification report](../packages/reader-core/src/services/publication-epub/report-publication-epub-verification.json) records source hashes, service/test/helper hashes, archive hashes, runtime details and full EPUBCheck output. Its demo-snapshot SHA-256 is `4c436964111d88112d799a9e05adb359772b1f3824effad649399f0df6e82b84`; its supplied-assets SHA-256 is `86f53ae7afb277804b8b324e567d4e1efa1d63edbbb1e59c5edcbdbbf31b88dd`. All recorded source hashes were reread and matched after the final run. Archive modification times can change hashes on later exports.

## Ownership and handoff

Production changes are confined to the service's `index.ts`, `epub-xhtml.ts` and new `epub-references.ts`. Test and evidence changes are confined to `publication-epub.browser-test.mjs`, the new regression browser test and runner, `verify-publication-epub.mjs`, `check-publication-epub.py`, and the regenerated JSON verification report. This document is the only changed path outside the owned service folder.

The complete review and original upgrade plan were read before implementation. Existing LM/DP-derived archive construction, traversal, navigation and styling remain in use. Original source worktrees stayed read-only. Scratch bundles, compiled service output and EPUB archives stayed inside the owned service folder and were removed in `finally`, including failed runs. The final harness also directs browser temporary profiles there through `TMPDIR`. No full root build, UI edit, package/build edit, dependency installation, Git mutation, deployment, publishing, secret or `.env` access, or further delegation occurred.

The parent can now inspect these fixes and continue package integration and independent review. No action is required from Dominik.
