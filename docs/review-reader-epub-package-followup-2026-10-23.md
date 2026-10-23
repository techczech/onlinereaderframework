---
title: Independent follow-up review of reader EPUB export and packaging
date: 2026-10-23
reviewer: GPT-6 Astra
register: FOR DOMINIK
status: prior-four-findings-closed
reviewed_commit: e1bd3782b50de2deb59b20e27c5fc6a2ca322619
reviewed_tarball: build/review-e1bd378/reader-core-0.1.0.tgz
tarball_sha256: dd0259f226760243cf7b5cd8577c5aa0282a274dd6e9de0c548c2670e3e75be6
scope: Original-derived EPUB service, final references, complete core build and native package compatibility
---

No action needed. FOR DOMINIK.

**All four earlier findings are closed for the reviewed commit and matching package.** Fresh reproductions confirm the route and XML repairs, a complete standalone core build, and native Node package imports. No remaining material Spec or Standards finding was demonstrated within this scope.

- **EPUB navigation and final references pass.** The 19 existing regressions pass, alongside additional route, XML and SVG probes.
- **All five archives pass EPUBCheck with zero messages.** These include the three immutable real-book snapshots and both supplied-content fixtures.
- **The exact 205-file package is reproducible and usable.** I independently rebuilt the expected hash, installed it offline, imported it in native Node and built its Vite consumer.
- **This closes technical findings only.** The separate reader UI review, later integration changes, public source candidate and software/publication decisions remain outside this verdict.

I read the complete [earlier review](review-reader-epub-package-2026-10-23.md), [EPUB repair receipt](result-reader-epub-fixes-2026-10-23.md), [package repair receipt](result-reader-package-fixes-2026-10-23.md), and [original upgrade plan](plan-original-reader-upgrade-2026-10-23.md). Source locations below refer to commit `e1bd3782b50de2deb59b20e27c5fc6a2ca322619`.

## Spec

### 1. Closed: Supported reader routes resolve inside the EPUB

**Source evidence:** [Route recognition and book identity](../packages/reader-core/src/services/publication-epub/index.ts:78) distinguish query routes, legacy hash routes and genuine external locations. [Section and fragment decoding](../packages/reader-core/src/services/publication-epub/index.ts:105) separates selection parameters from chapter IDs and resolves the final target element.

**Fresh reproduction:** With chapters `a` and `b`, both `<a href="?section=b">` and `<a href="#/b?text=target">` now produce `chapter-0002.xhtml`. The supplied regressions pass both with and without a source URL. The original rejection of `b?text=target` does not recur.

Additional probes confirmed that an explicit different `book` query remains external, while the current book and unrelated host query parameters still resolve internally. Other hosts, other paths, protocol-relative external URLs and their fragments remain external when resolvable. Neither synthetic parsing hostname becomes an assumed source identity. Home routes produce `../intro.xhtml`.

Encoded section `b%2Fc` resolves to chapter `b/c`. Czech, percent and hash characters in target IDs retain their intended targets through `%C4%8D`, `%25` and `%23`. Missing sections, missing fragments and malformed fragment escapes reject explicitly. Valid local fragments and repeated Markdown footnote backlinks remain paired. The legacy `book` text inside a hash query is not interpreted as a URL-level book selector, consistent with the reader's existing route model.

### 2. Closed: XML cleanup cannot collapse IDs, and final references are checked

**Source evidence:** [Pre-render rejection](../packages/reader-core/src/services/publication-epub/epub-xhtml.ts:43) rejects literal XML-forbidden characters before ID assignment. [Attribute checks](../packages/reader-core/src/services/publication-epub/epub-xhtml.ts:60) catch forbidden characters decoded from entities. [Final archive validation](../packages/reader-core/src/services/publication-epub/index.ts:194) reparses every emitted XHTML and SVG document after serialisation, route rewriting and asset transformation. The [reference validator](../packages/reader-core/src/services/publication-epub/epub-references.ts:2) checks final ID uniqueness and fragment targets across documents.

**Fresh reproduction:** Ordinary IDs `a` + U+0001 + `b` and `ab` now reject before an archive is returned. The SVG gradient equivalent also rejects. An attribute containing `a&#1;b` rejects after entity decoding. `<a href="#missing">` rejects with the final chapter path and missing fragment in the error. Distinct valid gradients retain distinct paint targets. Valid encoded cross-document fragments pass; absent cross-document targets reject.

I also tested the actual export pipeline after its transformations, rather than only calling the validator directly. In memory, I wrapped `XMLSerializer.serializeToString` to introduce, separately, a duplicate final ID, a broken local link and a broken SVG paint reference. **All three exports rejected during final validation.** The wrapper was restored after each case.

Supplied SVGs with a dangling `use` reference, an ID containing whitespace, or an entity-obfuscated external paint URL also rejected. The whitespace case reached the final archived SVG validator. Unsupported inline `use` elements and unresolved inline paint attributes can be removed by the shared sanitiser before copying; they did not leave dangling references in the exported XML. The conclusion concerns the integrity of emitted references, not a promise that every discarded source construct raises an error.

### Original reuse, rich content and full book identity remain intact

I compared the original Language Muscle EPUB service and Deliberate Practice generator with the repaired service. Language Muscle's ZIP construction order, preorder chapter traversal, recursive navigation and chapter typography remain recognisable. Deliberate Practice's five-character XML escaping and aside styling remain in the adaptation. The route and validation repairs do not replace these with an unrelated exporter.

The shared full-title helper supplies EPUB metadata, introduction/navigation identity and filenames through [the service import](../packages/reader-core/src/services/publication-epub/index.ts:3), [navigation and package metadata](../packages/reader-core/src/services/publication-epub/index.ts:188), and [download naming](../packages/reader-core/src/services/publication-epub/index.ts:208). All five title regressions passed, including the actual split Language Muscle title and the Deliberate Practice subtitle. Quote cards and later Notebook/browser-title changes belong to the separate UI/integration review.

## Standards

### 3. Closed: The standalone core command builds its stylesheet and fonts

**Source evidence:** [The core build](../scripts/build-reader-core.mjs:7) cleans output, compiles TypeScript and then invokes the style builder. [The style builder](../scripts/build-reader-styles.mjs:7) takes its dependencies, stylesheet and class fixture from core, copies fonts and notices, and includes the original reader CSS.

**Fresh reproduction:** `node scripts/verify-reader-package.mjs --standalone-only` exited **0**. Its isolated build contained core and the two build scripts, with only core's installed dependencies linked. The demo, its dependency tree, manuscripts and original worktrees were absent from that build tree. The documented `npm --prefix packages/reader-core run build` produced the exported stylesheet, all **112 local font references**, all three font notices, the original CSS and every class in the publication fixture. No external CSS resource URL was found.

The subsequent immutable-source package build repeated those checks successfully. Tailwind's existing Browserslist-data advisory was non-fatal. No shared root build or shared `dist` directory was changed by this review.

### 4. Closed: The installed public package imports in native Node

**Source evidence:** [The public barrel](../packages/reader-core/src/index.ts:1) uses explicit `.js` specifiers, including explicit service index paths. A scan of every core TypeScript file at the immutable commit found no remaining extensionless relative import/export specifier.

**Fresh reproduction:** I reconstructed tracked core source and both build scripts from the specified commit into disposable repository-local scratch, built and packed it, then asserted the exact expected SHA-256. The resulting **205 files / 3,517,858 unpacked bytes** matched the frozen package identity.

That actual tarball installed offline with lifecycle scripts disabled. In a fresh Node process with no `window`, `document`, `DOMParser` or `XMLSerializer`, `import('reader-core')` succeeded. The old and new public APIs were present, Markdown rendering worked, and both `generatePublicationEpub` and `downloadPublicationEpub` rejected with the intended browser-API requirement. The installed consumer then built in Vite using the package entry point and exported CSS, without a source alias. The complete verification exited **0**; Vite's existing chunk-size advisory was non-fatal.

The actual-tarball exclusion audit reported no pack issues. The independently recreated package had SHA-256:

```text
dd0259f226760243cf7b5cd8577c5aa0282a274dd6e9de0c548c2670e3e75be6
```

I subsequently checked the retained [frozen tarball](../build/review-e1bd378/reader-core-0.1.0.tgz) itself: its hash, 205-file inventory, unpacked byte count, explicit native imports, final-reference module and `qrcode` 1.5.4 manifest entry all match. Its [package evidence](../build/review-e1bd378/evidence-reader-package.json) and [reconstruction receipt](../build/review-e1bd378/evidence-rebuilt-frozen-package.json) identify the same package.

**Artefact discrepancy resolved during review:** The generic `build/reader-core-0.1.0.tgz` and the first copied review archive were the old 203-file package, hash `0d807c72b75a59272564033c64a8807fabb5e62b0a9491eec5aab403e4d9b357`. I demonstrated its extensionless-import failure. The parent reconstructed and replaced the review copy, and I verified the corrected bytes before this verdict. This review applies to the commit-specific frozen path above; it does not certify the generic build path.

### Notices and publication authority remain separate

The rerun installed-notice inventory still reports four locations: demo esbuild, demo Rollup, demo `dlv`, and core's development `dlv`. Their lockfile records mark them as development dependencies. The package audit has no exclusion findings; these installed-inventory findings remain visible rather than being relabelled as a clean inventory.

The repaired package declares `qrcode` 1.5.4. The current core installation and lockfile no longer contain `encode-utf8`, removing the earlier runtime notice gap. The recorded runtime vulnerability audit contains zero advisories; I inspected that receipt but did not repeat an online audit. The existing tool-exclusion evidence and software/public-scope decisions are separate from this technical review. No software licence grant or public-release acceptance is implied.

## Independent archive evidence and limits

Using the existing Python Playwright installation and bundled Chromium headless shell, I ran the browser service suite against real-book snapshots read directly from the immutable commit. The **26 recorded check groups passed**, including the 19 repair regressions. All five generated archives passed ZIP/XML checks and EPUBCheck with **zero fatals, errors, warnings or informational messages**. Both the complete suite and additional browser probes recorded **zero network requests**.

The service checks preserved the shared renderer's chapter text and rich-element counts for Deliberate Practice's 21 sections, Language Muscle's 12 sections and Linguistics' 262 sections, including nine theme containers. Tables, code, footnotes, nested navigation, SVG, MathML and supplied assets remained covered. This establishes renderer-to-EPUB fidelity; the parent's separate 515-input original-source comparison was not rerun.

The independently generated archive hashes were:

```text
rich-fixture       08613a0eeaf5ebddd8431049bd5203ee6c53c5dae5c3efaa61fca538b9f10aa1
svg-asset          2ed7904c8d562a9de0860c49fe57eb54b1a0374312be28c341b9eb99d058ff1b
deliberate-practice a9a989044dc716d761e737dd3ce8c12426c7cf2e734c1c63cf530784b206c29c
language-muscle    d98af416aca21b3cecadcd7ec0c88fd05503297e650e60e6940b34a02d4772a0
linguistics        aafbf1d10fe6ee5ae3229d323ddc9f9a48379c45a1dc706bcd59a8386dfa094b
```

Archive timestamps mean later EPUB hashes may differ. Runtime evidence used Node 26.12.1, npm 11.20.0, Playwright 1.64.0 and Chromium 153.0.8010.12. The existing verifier was evaluated with its report/output destinations redirected or suppressed so the parent's evidence was preserved. A first custom bundle attempt failed because the probe imported JSZip through its internal entry; package-level browser resolution corrected the harness, after which the probes passed.

Concurrent post-commit title/export changes were excluded from final package acceptance by rebuilding the immutable tracked source. The EPUB service, renderer and title helper still matched the reviewed commit. I did not repeat the root build, the broader Node/UI suites or visual acceptance. The parent owns the later integration diff and clean public-source candidate.

**Only this review document remains as my durable change.** Review scratch and isolated installations were removed. No production fix, Git mutation, original-source edit, secret or `.env` read, deployment, persistent server or delegation occurred. The parent can use this report to close the four prior findings and continue its separate integration review. No action is required from Dominik.
