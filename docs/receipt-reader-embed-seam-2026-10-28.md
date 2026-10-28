---
title: Receipt — interactive HTML embed seam in reader-core
date: 2026-10-28
status: built and tested; independent security review owed (not self-accepted)
base: cef5e7f (uncommitted working tree; no Git, push, deploy or publication performed)
contract: docs/design/2026-10-28-two-book-conversion/embed-contract.md
evidence: docs/evidence-embed-seam-2026-10-28/
---

# Receipt: interactive HTML embed seam

FOR AGENTS. This seam is for converting Academic Reading Framework and Foundations of Readability with their interactions kept (approved by the author). Instructional Videos and Dyslexia are excluded.

## What was built

- **Design.** The host registers each embed in `PublicationReader` props (`embeds`). The manuscript holds only the prose alternative: one block element with an authored `id`. The frame is inserted before it, in the live reader only. The sanitiser schema is unchanged. Search, notes, read-aloud, assist, EPUB, agent files and static pages all read that prose, and they needed no code changes.
- **Frame policy (fixed).** `sandbox="allow-scripts"` only. `allow` denies ten powerful features. No referrer, lazy loading, and the descriptor title as the accessible name. The chrome has a visible title, an optional caption, a skip link to the text version, and a full-view link (`_blank`, `noopener noreferrer`). The chrome is marked `data-publication-embed`, and the reader text model now skips it. Manuscript HTML cannot forge that attribute, because the sanitiser strips `data-*`.
- **URL constraints.** A relative root and src made of plain segments, `.html` only, with no dot segments, escapes, backslash, query, fragment or scheme. At run time the URL must resolve on the same origin, inside the root path, over http(s).
- **Height messages.** Accepted only when `event.source` is the frame's own `contentWindow` and the origin is `"null"`, with exactly the keys `{type, version, height}`, a plain or null prototype, a finite height from 0 to 100000, clamped to the descriptor bounds, and coalesced per animation frame. There is one listener per frame, removed on unmount. The reader never sends messages into the frame and exposes no API to it.
- **Layout.** The frame is 100% of the column width and as tall as it reports, within its bounds. Links have a minimum height of 44 px, and the links row wraps on phones. Embeds are hidden when printing, which leaves the prose alternative.
- **Release headers.** `securityHeaders({ embedRoot })` adds a `/embeds/*` rule. It detaches the site CSP and X-Frame-Options, then sets the embed CSP, which includes `sandbox allow-scripts` and `frame-ancestors 'self'`. Called without an argument, the output is byte-identical to v1 (checked against all three built editions; sha256 1706a617…).
- **Child helper.** `reader-core/embed-child` provides `startReaderEmbedHeightReporting` and `postReaderEmbedHeight`.
- **Build check.** `checkPublicationEmbeds(book, embeds)` reports invalid descriptors, missing sections or anchors, duplicate anchors, non-block anchors, and alternatives under 80 characters.

## Files (this seam)

- New: `packages/reader-core/src/embed/{embed-model.ts, embed-check.ts, PublicationEmbedFrame.tsx, embed-child.ts, index.ts, embed.css, README.md, embed.test.mjs, test-embed.mjs, test-embed-fixture-browser.mjs, test-embed-headless.mjs}`
- Edited:
  - `packages/reader-core/src/original/{types.ts (embeds prop), PublicationReader.tsx (validate once, warn), ReaderLayout.tsx (per-section), MarkdownRenderer.tsx (slots), publication-html.ts (text-model skip)}`
  - `packages/reader-core/src/index.ts` (exports) and `packages/reader-core/package.json` (`./embed-child` export)
  - `scripts/build-reader-styles.mjs` (embed CSS appended to reader.css)
  - `package.json` (unit test added to `npm test`)
  - `apps/reader-demo/scripts/release/headers.ts` (optional embed rule)
- Docs: the contract file, this receipt, and the evidence folder (logs plus `check-embed-red-mutations.py`).

## Tests and exits

- `node packages/reader-core/src/embed/test-embed.mjs`: exit 0, 7/7 (`log-embed-unit.txt`).
- `node packages/reader-core/src/embed/test-embed-headless.mjs`: exit 0, 70/70 (`log-embed-browser.txt`).
  - Setup: bundled headless Chromium against a real in-process HTTP server on an ephemeral 127.0.0.1 port, with the real `_headers` text interpreted (including Cloudflare `!` detach), at 1280 px and 375 px widths.
  - Covered: frame attributes, placement and URL; manuscript iframe and script inert; refused descriptors warned and never requested; opaque origin; no parent DOM, storage, cookies, popups, network or top navigation; a spoof sandboxed frame and malformed or oversized payloads ignored; height follows the document (observed 661 px); an embed served under the site-wide policy is blocked (which shows the header rule is needed); the text model keeps the prose and excludes the chrome; forged chrome text stays readable; the full-view link's attributes; no horizontal overflow at 375 px; keyboard skip link moves focus to the text version; listener count back to 0 on unmount; a direct full-view open stays in an opaque origin with no storage.
- Red mutations (`log-embed-red-mutations.json`, exit 0 means every mutation was caught). Each one turns the checks red, and every file was restored and compared:
  - R1: `allow-same-origin` added to the frame.
  - R2: no `event.source` check.
  - R3: chrome counted in the text model.
  - R4: release headers without the embed rule.
  - R5: listener never removed.
  - R6: any origin accepted for height messages.
  - R7: `..` segments accepted.
  - The mutation run used the pre-final file versions. The later edits were an SSR-safe effect hook and comment changes; the green runs were repeated after them.
- `npm test` (whole repo, before the unit test was added to it): exit 0. Groups of 23, 26, 96, 5 and 18 tests all pass (`log-full-suite.txt`). Existing books and exports are unchanged.
- `npm run build --prefix packages/reader-core`: exit 0.
- `npm run check --prefix apps/reader-demo`: exit 2. All 25 errors are in the content integrator's in-progress `src/books/next-books/build-source/*` (Node types and `.ts` import extensions), none in this seam (`log-demo-typecheck.txt`).

## Findings worth a reviewer's attention

- **Two layers.** In mutation R1 (frame attribute weakened to allow same-origin), the behavioural probes still saw an opaque origin, because the embed response's CSP `sandbox` directive applied. Only the attribute assertion turned red. Both layers are intended to stay.
- **Harness limit.** Playwright `route.fulfill` does not apply Chromium's header-level CSP `sandbox`, and was not trusted for framing checks either. The browser test therefore uses a real HTTP server. Probe: a fulfilled response gave origin `http://reader.test`, and a real server gave `null`.
- **Frame reloads.** A frame reloads when its chapter's annotated HTML changes, for example when a highlight is saved in that chapter. The last height is remembered, so the layout does not jump, but state inside the embed resets.
- **Netlify.** The `!` header detach is Cloudflare Pages syntax. Netlify does not support it, so a Netlify host would need its own rule.

## Source hashes (read-only originals, not modified)

academic-reading-framework at c024645 and readability-foundations at d96c01d; both had clean trees.

```
333f3d9bebfdff954dba71c8e91a465e1f955a44e00ba524873120ed4a1d65a7  academic-reading-framework/components/CognitionExplorer.tsx
ebd31760ebc2726ea2a84332cbcb861914ae5f1bc56a34b3b12a3e26ed27e188  academic-reading-framework/constants.tsx
fbcaa2a5f4a3e3d9faaf1171068d52adc0327b322733d81bd7c6b6e471ff52ac  readability-foundations/components/blocks/BlockRenderer.tsx
146d088f5062afe08fd48807e60dbeedaea454f33b6e0380012c4938cd966aba  readability-foundations/components/interactive/DyslexiaSimulator.tsx
b8154e0045a3ca7eca207baddd007cd4fbf583b3cbb775177bd5d659dfba2294  readability-foundations/components/interactive/FontSpacingAdjuster.tsx
6c70220e0b4934cfa6651afe313109a89d8cece5b069f4deceeef491d97a32b3  readability-foundations/components/interactive/LinkToSection.tsx
b701891abf8a7cc70622895fac55a68fbda51ade268cc2620fe9a5848ae18e89  readability-foundations/components/interactive/SlideSimulation.tsx
6e3da417658cb14e4999cf5a68915468bb471203f91a693e25de046c604429ad  readability-foundations/data/content/accessibilityData.tsx
ed9468f8aef83661e5d20d3166e7e97e9fcff0273c8ab5eded603a979ed648e3  readability-foundations/data/content/cognitiveLoadData.tsx
2708dde11f832a133ff35fc66121292c825d3853ee8a70b6e6afc2a32405875a  readability-foundations/data/content/evidenceData.tsx
5d132e9a7deb91e4794dc6f5168c4e68d3a72aecb3056ddac1a0b60c14acaf9a  readability-foundations/data/content/examplesSimplifiedData.tsx
47042ee2b3084a2c7da47ffe22606fe9c35356338bda1273b5bc0b59886421f2  readability-foundations/data/content/fivePrinciplesData.tsx
50cc8f135db135dfe479225b254ad5e4fb36d5866ea15b8c821729a1ff4931fb  readability-foundations/data/content/formattingExamplesData.tsx
954e343fb6b3867610bdd9a828b4ada38f9a74255c8eeb6195fee73492e493fd  readability-foundations/data/content/howPeopleReadData.tsx
6ae03322079752003b582acc627bda5c0e8548693b0532f889bd54eead61aac6  readability-foundations/data/content/jargonAcronymsData.tsx
9243f65b8a8f17da8435da2304911101128bf20255f06cbf3c0295ea501f9216  readability-foundations/data/content/slideFormattingExamplesData.tsx
7e35ac97943c5c4c1a9f60298e46c79a2c0f9673c89368bad69101bccbb08653  readability-foundations/data/content/tenSimpleThingsDocsData.tsx
68604503b4abe60baad33668dd9e675dcf3cdf89ebdcc9d9b87cf1f85303c6ea  readability-foundations/data/content/tenSimpleThingsPptData.tsx
b37283aa11fd4676327ab11bcee317f57646a99b5ea13855c65416f6ff156980  readability-foundations/data/content/threeStepsSimpleData.tsx
```

## Remaining integration steps (not done here)

1. **Content integrator.** Build each interaction (CognitionExplorer, DyslexiaSimulator, FontSpacingAdjuster, SlideSimulation, the readability checker and checklist) as a single-file HTML document with inline script and CSS, no network and no storage, bundling `reader-core/embed-child`. Write a prose alternative block with an `id` for each, and run `checkPublicationEmbeds` in the books' tests.
2. **Host app.** Pass `embeds` per book from `apps/reader-demo/src/App.tsx` (memoise the object).
3. **Release build.** Copy each edition's embed files into `embeds/` in the edition plan (`edition-plan.ts`, with origin recorded), call `securityHeaders({ embedRoot: 'embeds/' })` only for editions with embeds, and extend `verify-edition` to cover those files.
4. **Public source projection.** Add `src/embed/*` (not the evidence folder) to the allowlist in `scripts/prepare-reader-source-release.mjs` before any future public release. Nothing was published.
5. **Live checks.** Run on a real phone and with a screen reader. Then confirm that Cloudflare Pages applies the `!` detach on a preview deployment: fetch an embed and the reader page, and compare their headers.
6. **Independent security review** of this seam by another model family, and a re-review after any fix round. This is a write-path and security seam, so it must not be self-accepted.

## Ownership

File ownership of `packages/reader-core/src/embed/*`, the reader-core edits listed above, `scripts/build-reader-styles.mjs`, the root `package.json` test line and `apps/reader-demo/scripts/release/headers.ts` is released to the coordinator. Nothing in `apps/reader-demo/src/books/next-books/`, `apps/reader-demo/interactives/` or `.scratch-two-book/` was touched.
