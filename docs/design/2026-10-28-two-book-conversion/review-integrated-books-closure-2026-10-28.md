---
title: Independent closure review of the integrated Academic Reading and Readability books
date: 2026-10-28
register: FOR AGENTS
status: clean in the three-finding repair scope; production release acceptance excluded
ownership: review complete; integration and release remain with parent
---

# Verdict

**CLEAN IN SCOPE. All three original P2 findings closed. No new actionable finding in the reviewed repairs.** Parent retains integration, preview acceptance and release ownership. Dominik: no action required. No publication authorisation.

Purpose/readers: fresh independent diff-only closure evidence for the integrating parent. Production and original source read-only. Writes confined to new review probes/evidence/report in this folder; synthetic scratch removed. No Git command, push, deployment, package install or other agent. Previously closed core iframe/security seam not reopened.

# Closure evidence

## Homepage prose: closed

Read actual `assemble.ts`, `home-summaries.ts`, `render-originals.tsx`, `check-books.ts`, `build-provenance.ts`; inspected original Academic App.tsx and Readability types/Home projection. Independently extracted the three Academic card paragraphs and fourteen Readability descriptions from raw original source, separately from the production extractor. All **17/17** occur verbatim once in the respective canonical chapter, rendered text, chapter agent file and full agent export. Sixteen paragraphs newly inserted immediately after the actual chapter h1. The Readability checker section (`readability-tool`) already held its summary there; retained once, without insertion. Navigation titles need not equal the original chapter h1.

Relocation: original home-card/description prose now belongs to chapter openings and therefore downstream chapter/search/speech/export inputs. It is not a claim that the original home layout/cards were reproduced. Fresh original renderer records these seventeen passages independently of its twenty-four chapter renders. Fresh expanded checker: **70/70**, exit **0**. Parent's retained red report: **53/70**, exit **1** (sixteen missing summaries plus licence URL); retained regenerated green: **70/70**, exit **0**.

Stronger preservation check: remove only the three Academic and thirteen Readability inserted paragraphs; restore the earlier Readability licence href solely in the review's in-memory comparison. Serialised books recover the earlier review's exact SHA-256 values:

- Academic: `5d857da9be75545a378aad0cc7d36b551391135e3ffa667de32e32efcc322266`.
- Readability: `c6efa2a83c45b3be9a1c0d4ebd85300085226e5cedd42d4a7fd25af8c4ed1041`.

Thus no other canonical author prose or book structure changed relative to that reviewed baseline. Fresh original chapter accounting also remains green. This proof is bounded to the recorded originals and earlier reviewed conversion, not an exhaustive source-history audit.

## Asset-copying boundary: closed within stated guarantee

Read actual `demo-embed-assets.ts` and parent's fixture. Local manifest configuration is the input; middleware reads and Vite asset emission are the sinks. Shape/component/HTML/output checks run before returning the plugin. Canonical app-root, ancestor/leaf lstat, canonical-path and regular-file checks precede each asset read; leaf open uses O_NOFOLLOW and descriptor fstat, with finally close. Read-time checks cover dev middleware, preview middleware and emission; buildStart also checks sources. Manuscript text cannot configure this plugin.

Independent actual-plugin checks:

- **70 hostile configuration cases refused**, including null/array manifest/books/items, null entries, missing fields, invalid book/item segments, source/directory traversal, absolute paths, query/hash/NUL/newline/encoded/backslash forms, non-HTML sources and duplicate output URLs. No emission or outside-canary read.
- **Five initial symlink cases refused**: asset leaf, directory, manifest, manifest ancestor and app-root alias.
- **Eight post-construction swaps refused**: leaf/directory replacement before each of emission, dev middleware, preview middleware and buildStart. Outside target files exist. No canary read; no response body or outside-byte emission.
- **Three supplementary existing-canary traversal fixtures refused**, exit **0**. Includes original directory escape (`..` + `outside.html`) and source escape (`../../../outside.html`), with targets confirmed to exist. The read monitor's positive control confirms it observes a canary read.
- **Nine valid production files emitted byte-for-byte**, with safe relative `embeds/<book>/<src>.html` output names. All nine served byte-for-byte by both dev and preview middleware, including query-string requests.

Evidence records refusal and canary-read/emission counts. These deterministic swaps occur before hook/read invocation. **No claim of race-atomic filesystem security or TOCTOU closure**: ancestor replacement between validation and open was not established safe. No live remote exploit, arbitrary filesystem-write or deployment claim.

## Licence source: closed

Prepared Readability JSON and fresh reassembly both use `https://creativecommons.org/licenses/by/`. Actual EPUB introduction retains this version-neutral URL. Assembly and provenance source/record explicitly avoid inferring a version. Academic still has no licence grant and no new canonical URL; its pre-existing source address remains source metadata. No licence-history or legal conclusion newly inferred by this review.

# Rebuild and downstream checks

Fresh source renders, original renders, oracle extraction, expanded source accounting, embed rebuild and redirected-output book assembly: each exit **0**. Assembly scratch copy differs only in output destination and absolute paths to the unchanged actual helper modules; production assembler never executed against production outputs.

- **95/95** recorded source/Folio/output provenance hashes match current bytes: 55 original source files, 28 Folio files, 12 outputs.
- **3/3** rebuilt book/manifest files equal current files byte-for-byte; **9/9** rebuilt interaction HTML files equal current files byte-for-byte.
- **122/122** fresh original-oracle interaction checks, exit **0**, bundled headless Chromium only. Includes nine offline pages and existing interactive state/keyboard behaviour. No installed Chrome launched.
- **30/30** current built agent files equal fresh actual-generator output byte-for-byte. All seventeen summaries preserved in chapter/full projections; all nine alternatives remain available.
- Actual production EPUB function bundled and executed in bundled headless Chromium: **17/17** exact summary passages preserved; all nine prose-alternative anchors remain; frame chrome/iframes absent. The EPUB function performs its normal ZIP/reference generation; per-XHTML hashes retained in supplemental evidence. No screen-reader, real audio, physical-device or cross-browser acceptance claimed.

No repeat of the 438-check whole-preview matrix. Fresh focused coverage addresses prose, rebuilds, copier and export effects. Root build/types/full-unit evidence is parent's retained evidence, inspected rather than rerun: build invokes `tsc --noEmit`, Vite build and agent generation; log ends with 335 agent files. Full-test log's six reported failure summaries are all zero. Parent's old-plugin 1/11 versus repaired 11/11 is historical regression evidence; this review independently exercised the actual repaired plugin with the expanded fixtures above.

# Probe failures and exits

Preserved, not relabelled as passing:

- Initial closure driver: exit **1**, 134/152 checks. Probe incorrectly equated navigation titles with chapter h1s, treated JSON object keys `"null"`/`"3"` as malformed despite valid segment syntax, removed the existing checker summary in baseline reconstruction, and included its own growing log in the preservation snapshot. Direct JSZip lib import also failed browser bundling on `stream`. These are probe defects, not production findings.
- V2 driver: exit **1**, **149/151**. Corrected title/key/snapshot/bundle issues. Remaining failures: baseline reconstruction still removed existing `readability-tool` summary; Python EPUB helper unavailable (`ModuleNotFoundError: playwright`). Both failures retained in JSON/log; all source-accounting, rebuild, plugin and 122 browser checks completed successfully.
- Supplemental driver: exit **0**, **54/54**. Correct duplicate exception restores exact prior Readability hash; thirty built-agent comparisons; direct CDP EPUB generation using bundled shell; seventeen EPUB summary checks and remaining export/preservation checks. No Python dependency or installation needed.
- Existing-canary traversal supplement: exit **0**, **3/3**.

Final scope verdict combines completed passing checks with the explicitly corrected probe assertions; neither exit-1 driver is called green. Earlier independent review and parent regression evidence retained byte-for-byte. No production changes between probe attempts.

# Acceptance limits and preservation

Production release verifier's ordinary-word `accessibility` false positives remain **OUT of preview acceptance**. No ids renamed and no verifier result relabelled as passing. Earlier release-isolation evidence not rerun or promoted to whole-release acceptance. New-book release planning/header/export guards, canonical route selection, live host and deployment remain parent/release-owner work.

Known limits unchanged: provisional inline photo replacement; covers unchosen; Academic licence grant/final URL undecided; Readability licence version undecided; original references preserved; disclosed plain checklist and embed full-view/theme differences remain. No new public-book or live-publication claim. Instructional Videos/Dyslexia untouched.

Final preservation check: **739 snapshotted production/build-output/earlier-evidence files unchanged**. Full snapshot in V2 evidence; final comparison and artefact hashes in `evidence-review-integrated-books-closure-preservation-2026-10-28.json`. All review scratch removed; browser processes closed. No independent whole-release verdict.

# Exact reviewed hashes

SHA-256. Actual production bytes match all seven changed-source hashes in parent's repair receipt. Additional canonical/provenance hashes included below.

```text
d52920a7d87401b4ec79d496add5fb9fb27087720c848ace5769837e325d41d5  apps/reader-demo/scripts/demo-embed-assets.ts
c210e6c93caeb64c2eb343aeb3656519619d2ff1e90b9c8c0ddd05faaf7828ea  apps/reader-demo/scripts/test-demo-embed-boundary.ts
adcfb7584d965420ea7021f2c54a56c37cf184bcce5a99d12aade73649d569e3  apps/reader-demo/src/books/next-books/build-source/assemble.ts
8982d07b783be495cd23ef157f2181c90f01bbd0c52cfa488e41250dc13536c9  apps/reader-demo/src/books/next-books/build-source/home-summaries.ts
dd6bebd058048b9b1706ad6e45d113bb65d2d7a1ec606612ac3cc7fcecf90198  apps/reader-demo/src/books/next-books/build-source/render-originals.tsx
8582123613ce9f1619442003e2af8b58cfaf873aa70f2512247382023f625e83  apps/reader-demo/src/books/next-books/build-source/check-books.ts
c51d805b60db49f7d2559c00c71a043a340bee50ec1c48b15e4fa4fd65bbb7ed  apps/reader-demo/src/books/next-books/build-source/build-provenance.ts
b1fff1d0257e51d7b7f8b897eb49dd2756fb2a56efd6beb92a67a65e4ad960ab  apps/reader-demo/src/books/next-books/academic-reading-framework.book.json
d9129896481b375477602788f157391c308bc3c552ce122b262aa3d0a2d10c53  apps/reader-demo/src/books/next-books/readability-foundations.book.json
2d5884d9975caca5c385d7e7da55eba78a71fb00c67d5df7dfdaed746e74a785  apps/reader-demo/src/books/next-books/next-books-provenance.json
```

New probe/evidence SHA-256 values (final preservation JSON inventories the same artefacts):

```text
4fb99b6d233b2e21902e12a67aef5a6c3f7e057401f4f4575e22f2a12b092553  evidence-review-integrated-books-closure-2026-10-28-v2.json
0461c5e1c456ec18ff4e86c2349040d93cd89a3fd7069d60c2faeb0681fb87ef  evidence-review-integrated-books-closure-2026-10-28.json
8aa77e849339f5ddc52f4cb0d5f53ec4351169ef32b94d1435493f819d23815e  evidence-review-integrated-books-closure-accounting-2026-10-28-v2.json
e0f80d3cf2233a1ac10abc57a963202c8b837da93faae1e7ddb68ad2e8e17745  evidence-review-integrated-books-closure-accounting-2026-10-28.json
412f1fc094c8f389648eacac70992b3aa526c83a1f4768dac961debd74e307b8  evidence-review-integrated-books-closure-interactions-2026-10-28-v2.json
02879f9edd3eee613317c7c82b0a4b0249a290d136b7e1537e8fdc8bc46e032d  evidence-review-integrated-books-closure-interactions-2026-10-28.json
f84beffa7483d7e8f46f60678d577418f26ca437666b5fdb446aa78d4abcf0da  evidence-review-integrated-books-closure-run-2026-10-28-v2.log
27a49232f616589766951a39628ef63e209a2d9bf01f4b42e551705748dae2e1  evidence-review-integrated-books-closure-run-2026-10-28.log
0a41a0c5a6d3d599145acb8892e85f0a4ad49b6c892b785872713cb85a3962c0  evidence-review-integrated-books-closure-supplement-2026-10-28.json
78b9855ac79202a70bb7b9aa4559ce9ff217f53abbcb5f263483e8842f4d2bd8  evidence-review-integrated-books-closure-supplement-2026-10-28.log
9cfebb97bd3c29946e4a88c567e07731cdebf28759a5bf9dd587fedfd0033a00  evidence-review-integrated-books-closure-traversal-2026-10-28.json
006107cf902f934f8d30a0456f81f48aa24ce3b9ace7bb106c5a9bab4a521af5  probe-review-integrated-books-closure-2026-10-28-v2.mts
aff597f379597ae7c12fd90e569ae0b00a631d6ffc0d1e55e6b778534a3d7302  probe-review-integrated-books-closure-2026-10-28.mts
9d3b8e586b328a9b0ad76c93101523c961fe8298c19f3e3e401d37450b768f01  probe-review-integrated-books-closure-supplement-2026-10-28.mts
7d15d5ae0044755e31887fdb216da66beea46e07e26bc399d4f8fc13ee249b6b  probe-review-integrated-books-closure-traversal-2026-10-28.mts
6c732dc66e99310a51ed16dd07568e7f41e6911a39319835f10fdc6353815b90  evidence-review-integrated-books-closure-preservation-2026-10-28.json
```
