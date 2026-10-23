---
title: Independent follow-up review of the original reader fixes
date: 2026-10-23
reviewer: GPT-6 Astra
register: FOR DOMINIK
status: passed-scoped-followup
checkpoint: 34882f3eee5aaf2c191f4d4146e1ac08dbc36e4e
previous_review_checkpoint: cbcb1cb6d688e25f922fd4821ba498f0f1cfbd41
scope: Original reader annotation, quote identity and JavaScript module-specifier repairs
---

No action needed. FOR DOMINIK.

**Both original-reader specification findings are closed at the reviewed commit.** Independent reproduction confirmed the old failures, and the repaired source passed the same cases. No material blocker remains in this review's original-module scope.

- The Unicode repair restores and paints the intended quotation without losing the surrounding markup.
- The actual quote canvases identify Deliberate Practice, Language Muscle and the linguistics collection, with the correct author, chapter and sharing destination.
- All 36 repository tests and 60 browser checks passed. Native import of the compiled original reader and a demo type check against frozen core source also passed.
- EPUB, final package acceptance and public-release licensing remain separate work. This review does not accept those artefacts or authorise publication.

All source-line references below refer to **34882f3eee5aaf2c191f4d4146e1ac08dbc36e4e**, resolved from the supplied short revision. I read the complete [original plan](plan-original-reader-upgrade-2026-10-23.md), [initial architecture review](review-original-reader-architecture-2026-10-23.md), [implementation review](review-original-reader-implementation-2026-10-23.md) and [repair receipt](result-reader-annotation-identity-fixes-2026-10-23.md) at that revision.

## Spec

### 1. Closed: Unicode case expansion no longer displaces annotations

**Source.** The matcher at [publication-html.ts:48](../packages/reader-core/src/original/publication-html.ts:48) lowercases the whole string and maps complete lowercase code-point boundaries back to original UTF-16 offsets. Decoration consumes those mapped positions at line 115; range restoration uses the same matcher at line 145. Whole-string lowercasing retains contextual Greek sigma behaviour. Rejecting incomplete mapped boundaries prevents a match from cutting an expansion or surrogate pair.

**Independent reproduction.** I loaded the prior annotation implementation into an in-memory test bundle while keeping the harness and installed dependencies constant. For the exact original fixture:

~~~html
<p>İ first. Working <strong>memory</strong> later.</p>
~~~

Restoring “Working memory” produced “orking memory ” in both the DOM range and joined painted marks, including the trailing space. Expansion inside the quotation produced “Working İ memory ”; expansion before and inside produced “orking İ memory l”. Ten of the twelve annotation regressions failed against the prior implementation, as expected.

At the reviewed commit, all twelve passed. The original fixture returned exactly “Working memory”; the inside/both fixtures returned exactly “Working İ memory”. The checks inspected actual DOM ranges, painted text, range geometry, mark backgrounds and unchanged surrounding text.

**Additional independent cases.** Twenty further cases passed. They covered repeated expansions before and inside a phrase; an expansion after the phrase; a whole-character expansion; skipping an incomplete expansion to reach a later valid occurrence; supplementary Deseret letters and emoji; combining accents across inline boundaries; decomposed dotted i; contextual Greek sigma with an accent; links and table cells; and rejection of both high/low surrogate fragments and incomplete expansion boundaries. Removing the generated marks restored the same sanitised HTML in these fixtures. The existing repeated-occurrence test also retained longest-overlap priority, paragraph class, emphasis and link destination.

The repaired failure scenario is therefore closed: a saved multilingual quotation spanning emphasis or links restores to its original text rather than shifting one or more UTF-16 positions.

### 2. Closed: Quote images retain the full publication identity

**Source.** [publication-model.ts:4](../packages/reader-core/src/original/publication-model.ts:4) joins the authored title and subtitle, preserving punctuation and removing overlapping boundary words. The actual quote callsite uses it at [ReaderLayout.tsx:389](../packages/reader-core/src/original/ReaderLayout.tsx:389). The existing canvas paints that value at [QuoteImageModal.tsx:122](../packages/reader-core/src/original/QuoteImageModal.tsx:122); the same modal calls the actual QR encoder at line 128.

Using the prior callsite reproduced both incomplete attributions: “Building Your” and “Deliberate Practice:”. Both prior identity tests failed while still producing their QR images.

Using the repaired callsite, I mounted the public reader with the frozen real adapter data, selected a real paragraph and activated **Share as Image**. Actual canvas calls contained:

- Language Muscle painted “Building Your Language Muscle”, “Dominik Lukeš” and “Fine-tuning your aims”.
- Deliberate Practice painted “Deliberate Practice: A Universal Learning Method”, “Dominik Lukeš” and “About This Guide”.
- The linguistics collection painted “Introduction to Key Issues in Language Through Stack Exchange Answers from Linguistics Stack Exchange, 2013–2016”, “Dominik Lukeš” and “What's the difference between phonetics and phonology?”.

For linguistics, the helper correctly joined the overlapping word “Answers” once. All three PNG previews decoded at 1080 pixels wide and drew the real 150-pixel QR image. I observed the encoder input without replacing its implementation: every URL retained the expected book ID, chapter ID, selected quotation and unrelated host parameter. Download filenames were respectively language-muscle-quote.png, deliberate-practice-quote.png and linguistics-quote.png.

Three further checks mounted the frozen demo host and switched books through its history listener. Its actual document title retained the complete authored title/subtitle for each book. The unchanged host concatenates the linguistics fields directly, so its title contains “Answers Answers”; this is distinct from the quote helper's overlap removal and does not omit identity. EPUB metadata is outside this review.

### Preservation checks

All fourteen existing browser checks passed: cross-markup ranges, decoration and visible-text search; link/table preservation; unique headings; paired footnote links; removal of unsafe source markup; and absence of note-text interpolation into HTML.

Additional checks mounted two books sharing the section ID “intro”, with different persisted notes. Book A restored “Working İ memory”, “a link boundary” and “table cell”, with three margin-note containers. Book B restored its own “link boundary” note. Returning to A and remounting A restored its three notes again. The same four checks passed at 1440 × 1000 and 390 × 844. Note text containing literal script tags remained text. These checks establish restoration and isolation at both viewport sizes; they do not repeat every mobile-control or physical-device check from the earlier review.

The source diff against the immediate implementation base changes no original CSS or design structure. Apart from the annotation matcher, display-title helper and quote callsite, the production changes are module specifiers. The earlier routing and book-isolation dispositions remain closed; the remaining annotation and quote-identity parts of the initial architecture risks can now close.

## Standards

### Native module imports: passed within the original-module boundary

An independent scan found **38 relative production specifiers across eleven files**, all ending in .js. This includes the public type export and the dynamic EPUB import. The other eight changed production files were identical to their base versions after normalising only those specifiers.

The actual regression at [test-original-reader.mjs:93](../packages/reader-core/src/original/test-original-reader.mjs:93) freshly compiled the frozen core and imported its emitted original/PublicationReader.js with native Node ESM and no browser globals. It passed and returned the component as a function. Browser bundles also resolved the explicit JavaScript paths to their frozen TypeScript sources successfully.

The repair leaves the existing public barrel unchanged. This establishes original-entry compatibility and preserves that API surface; it does not certify native import of the complete package barrel, the dynamic EPUB operation or a final packed consumer. Those remain with the separate package/EPUB review.

### Package, identity and release boundaries

The browser probes used the installed **qrcode 1.5.4** runtime, and the bundle included its actual browser encoder. The frozen manifest still specifies 1.5.3; the parent's manifest and notice repair is concurrent work. These results verify the original module against the supplied patched runtime, not a reproducible installation from the old lockfile. The distribution notice inventory was not re-audited here.

The repair receipt explicitly limits the title change to quote sharing. [ReaderLayout.tsx:366](../packages/reader-core/src/original/ReaderLayout.tsx:366) still supplies the shorter title to notes export. This pre-existing, disclosed boundary is not silently included in the quote-identity closure. No new notes-export or EPUB change is requested by this follow-up.

Final package evidence and the known public software/content licensing decisions remain separate gates. Neither is a new defect in these original-module repairs, and neither is resolved by this review.

## Verification and provenance

All results below were run independently:

1. **Repository tests passed: 36/36.** A removable snapshot of tracked source at the reviewed SHA ran npm test: 23 content tests, eight original-reader tests and five real-book tests. The eight include the fresh core compilation and native import described above. Installed dependencies were linked into the snapshot; shared source and build directories were not modified.
2. **Browser checks passed: 60/60.** The completed run comprised fourteen existing content/DOM checks, twelve supplied annotation cases, three actual quote-canvas/metadata cases, twenty independent range cases, eight persistence cases across two viewport sizes, and three document-title cases. The original 28 checks are included in that total. No uncaught page errors occurred.
3. **The prior defects reproduced.** Replacing only the annotation module and quote-layout source in memory with their prior reviewed versions produced ten annotation failures and two quote-title failures. This was a controlled comparison, not a claim that the entire prior release was rebuilt.
4. **Frozen-source type checking passed.** The ordinary demo type check exited 0. A further TypeScript API check mapped reader-core directly to the frozen core source, avoiding another worker's generated declarations: zero diagnostics, 47 local source files, none outside the snapshot.

The first additional browser run needed two harness corrections: the linguistics expectation initially duplicated the overlapping word “Answers”, and a standalone combining-mark probe incorrectly required non-zero advance width. The latter was rerun as a phrase containing that mark and following text, retaining the boundary check with meaningful geometry. The completed run above passed after those probe corrections; no production code changed.

The browser harness followed the supplied in-memory runner's approach. Framework modules, real-book JSON and the demo host were read with git show at the reviewed SHA. A Playwright-routed in-memory page loaded that bundle; port 8773 supplied only its existing stylesheet. **The old production JavaScript was not used as repaired behaviour.** No preview rebuild or new server was started.

The user supplied the prior T3 failures, “Preview automation snapshot timed out after 15000ms”, and explicitly authorised the sibling Python Playwright installation. This review used that installation with bundled Chromium headless shell **153.0.8010.12**, cache build **1243**, never real Chrome. Node was **v26.12.1**. Temporary snapshots and browser files stayed inside this repository and were removed.

The immutable repair hashes match the worker's receipt:

~~~text
publication-html.ts
7bee6cfbd656bdb80971f6aa86ba92e6b71e15edc4d64b2b5dd1276bcf0fc98b
publication-model.ts
ac8d7633b770e0a39df57db4b4afb1ea2947ac462450be333a2f36a1d6c0d826
ReaderLayout.tsx
a68173a796794c452e5def831f5422f141d844a30e00deb09ee97f36463fe3fd
~~~

Only this review document was retained. No code fixes, Git mutations, original-source edits, secrets or environment-file reads, deployment, publication or delegation occurred. Concurrent edits were preserved. The parent can close the two original-reader findings and continue the separately owned package and EPUB work. No action is required from Dominik.
