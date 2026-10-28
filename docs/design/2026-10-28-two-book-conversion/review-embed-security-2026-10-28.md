No action needed. FOR DOMINIK. **Verdict: changes required — one reproduced P2 specification finding in the online reader’s interactive embed boundary.** No production files were changed.

- The component can follow a foreign document base, contrary to its same-origin resource contract.
- The existing seven unit tests and 70 browser checks pass. The core TypeScript check also passes.
- Independent checks preserve canonical prose, exports, speech, assistance, highlights and keyboard access. Cloudflare header confirmation remains integration work.

## P2 — A foreign document base moves the frame and full-view link off the page origin

**Classification:** Spec. The embed contract §3 requires runtime URLs to stay on the page’s origin, and limits resources to local files shipped with the edition.

**Source:** `packages/reader-core/src/embed/embed-model.ts:139–148`, called from `packages/reader-core/src/embed/PublicationEmbedFrame.tsx:22`; the resulting URL supplies the full-view link at line 60 and frame at line 63.

The resolver receives `document.baseURI` and compares the resolved URL’s origin only with that base’s origin. Both URLs were constructed from the same base, so this comparison does not establish agreement with `window.location.origin`. A host page with a cross-origin `<base href>` therefore passes the check with an ordinary descriptor, such as root `embeds/` and source `good.html`.

**Reproduction:** Run the review-only driver `review-embed-probes-sol-2026-10-28.mjs`. It serves isolated, self-contained assets on two ephemeral loopback ports. The reader document is served at `http://127.0.0.1:57057/foreign-base.html`, with a base pointing to port `57058`. Mounting the real renderer with a validated descriptor requests `http://127.0.0.1:57058/embeds/good.html`. Its full-view link has that same foreign origin. The server request ledger records the request on port `57058`. A separate run reproduced the same result on ports `57404` and `57405`.

The two failing assertions are named `SPEC: foreign document base cannot move frame off page origin` and `SPEC: foreign document base cannot move full-view link off page origin`. They are two consequences of one defect, not separate findings.

**Consequence and boundary:** The component’s URL restriction can load an asset from another origin and send the reader there through the full-view link. The foreign-base test deliberately serves the host page without the release CSP: the release policy’s `base-uri 'none'` prevents this setup, and its default source policy also constrains framing. This is a component contract failure in a host without that policy, not a demonstrated bypass of the proposed release policy. Manuscript HTML cannot introduce the base through the sanitiser. No parent DOM or note-storage compromise was reproduced.

**Required correction:** Compare the resolved URL against the actual reader location’s origin independently of `document.baseURI`, or resolve from the reader location while retaining the documented edition-root semantics. Add the foreign-base case to the focused regression checks. Re-review the correction; no fix was made here.

## Focused verification

The evidence files contain complete stdout, stderr, exit codes and source SHA-256 values. All browser runs used bundled `chrome-headless-shell`, Chromium `153.0.8010.12`, headlessly. They used real loopback HTTP responses rather than intercepted responses for CSP checks. Review scratch lived in this review folder and was removed in `finally`; the evidence records `scratchRemoved: true`.

- **Core TypeScript:** `node packages/reader-core/node_modules/typescript/bin/tsc -p packages/reader-core/tsconfig.json --noEmit` exited **0**.
- **Existing unit checks:** the existing `test-embed.mjs` runner, with only scratch placement and scratch dependency resolution adapted, passed **7/7**, exit **0**.
- **Existing browser checks:** the existing `test-embed-headless.mjs` runner, with only scratch placement and entry-point imports adapted, passed **70/70**, exit **0**, at 1280 and 375 pixels.
- **Independent edge checks:** the corrected review driver passed **14/16**, exit **1**. Both failures reproduce the single origin finding. The supplemental prose driver passed **19/21**, exit **1**, with the same two failures. These counts overlap and must not be added together as distinct coverage.

Independent probes verified six manuscript attribute spelling/entity variants. Their forged `data-publication-embed` markers did not remove prose from the parent text model. Invalid heights including non-finite numbers, negative values, oversized values, strings, arrays and objects were rejected. Ordinary nested base paths, escaped dot segments in a base URL, and base queries/fragments resolved within the calculated root; none supplied an additional finding.

At 320 pixels the test interaction caused no horizontal overflow. A missing asset and an asset blocked by the site frame policy both left the prose alternative and skip link available. Keyboard activation through the public `PublicationReader` focused the prose anchor. The original browser tests also checked the accessible frame title, fixed sandbox/permissions attributes, spoofed message sources, malformed payloads, listener removal, and full-view link attributes.

With the embed CSP applied as a real HTTP response header, browser probes observed an opaque frame origin, blocked parent DOM/storage/cookie access, blocked fetch and popups, and blocked top navigation. A direct top-level full view also stayed opaque and could not access the origin’s local storage. This establishes browser behaviour for the supplied headers, subject to the deployment limit below.

The supplemental synthetic-book checks exercised `buildPublicationSpeakable`, `anchoredRangeSets`, `findPublicationTextRange`, `buildAgentBook`, and EPUB `appendPublicationContent`/XML serialisation. Speech retained the prose and omitted the embed chrome; anchored assistance produced prose ranges; search found the prose beside the frame; agent chapter/full outputs and EPUB XHTML retained the prose without the frame or its full-view chrome. This was a focused export-path check, not a complete EPUB package or speech-engine acceptance test.

An annotation created a real highlight while leaving canonical text intact. It replaced the frame’s document, reset its button state, and retained its reported 650-pixel height. Those observations agree with the explicitly documented reload limit and are not findings.

## Source integration and public projection

The reviewed integration routes validated descriptors from `PublicationReader` through per-section selection in `ReaderLayout` to renderer slots. The parent text model skips the host-created marker; the sanitiser’s allowed properties do not admit that marker from manuscript HTML. The style build appends the embed stylesheet, and the package exposes the child helper separately from its main exports. The no-emit check covers these TypeScript integration points; this review did not rebuild or modify distribution files.

The current public source projection already walks only `packages/reader-core/src` for TypeScript, TSX and CSS (`scripts/prepare-reader-source-release.mjs:76–88,371`). Its source allowlist admits those extensions under that subtree (lines 162–164). Consequently the production embed source is already included, while the `.mjs` browser fixture and this review’s evidence are outside that walk. No manuscript content was found in the reviewed production seam. The receipt’s instruction to add the production embed folder to the allowlist does not match the current generic allowlist. This is not a reproduced disclosure finding. The projection was inspected, not executed; no public archive or publication is accepted by this review.

## Evidence and limits

The receiving coordinator can inspect these new files in this folder:

- `evidence-review-embed-sol-attempt-2-2026-10-28.json` contains the corrected focused checks and first valid full-reader keyboard probe. SHA-256: `8d55a8b8159f6544ee906019e3ef401cec4addac01ac93dc0970a28f79417d08`.
- `evidence-review-embed-sol-prose-2026-10-28.json` contains the supplemental prose/export probes and repeated origin reproduction. SHA-256: `f1398c3865ce332872c009c48d4d445c2c4ad6e323aa9da4941ece825b7b4fbb`.
- `review-embed-probes-sol-2026-10-28.mjs` and `review-embed-prose-probes-sol-2026-10-28.mjs` contain the reproducible review drivers. Their result files should be preserved before any rerun.
- `evidence-review-embed-sol-2026-10-28.json` preserves the initial attempt. Its relocated unit runner could not resolve a dependency, and its standalone-renderer focus assertion omitted the public reader’s fragment handler. Those two harness failures were corrected in the second attempt and are not product findings.

All 15 recorded production-source hashes remained identical between the initial and final probe runs. Two directly relevant hashes are:

```
e23da6d72ef732c3c0571859c85dd65cb17c61779f26373943fd0a1e9ff51b80  packages/reader-core/src/embed/embed-model.ts
73b7f4c3834e7b2b8c1c702fc96e041205fceb63522350f132b5797f7ff1d839  packages/reader-core/src/embed/PublicationEmbedFrame.tsx
```

**Cloudflare integration remains owed.** The existing harness interprets `_headers` detach syntax itself before serving real HTTP headers. Browser enforcement is observed; Cloudflare’s matching, detachment and final response headers are not. Direct full-view isolation depends on the response CSP actually being delivered. No live deployment, external browsing, Git operation, production edit, package installation or other agent was used.

The in-progress Academic Reading/Readability content integration, release copying, source archive generation, real phone and screen-reader acceptance are excluded. Instructional Videos, Dyslexia and the existing three books were not changed or used as integration acceptance targets. This verdict covers the recorded working-tree source hashes, not a Git revision comparison or a complete release.

No action is needed from Dominik. The receiving coordinator has the reproduced defect and evidence for the builder’s correction and independent re-review.
