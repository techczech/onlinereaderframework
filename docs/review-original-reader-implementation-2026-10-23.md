---
title: Independent implementation review of the original reader upgrade
date: 2026-10-23
reviewer: GPT-6 Astra
register: FOR DOMINIK
status: changes-requested-two-spec-findings
checkpoint: cbcb1cb6d688e25f922fd4821ba498f0f1cfbd41
scope: Original reader implementation; excludes subsequent EPUB service and wiring
---

No action needed. FOR DOMINIK.

**The original reader integration is substantially implemented, but two demonstrated defects need correction before accepting this checkpoint.** Neither requires a new design round.

- Cross-markup notes, reload restoration, book isolation, full-content phrase search, footnotes and original chapter routing passed independent checks.
- Unicode case conversion can shift a restored highlight away from the saved quotation.
- Language Muscle quote images identify the book only as “Building Your”.
- The original design and source content are retained. Public licensing and final immutable package acceptance remain separate release gates.

The review used the [authorised plan](plan-original-reader-upgrade-2026-10-23.md) and [initial architecture review](review-original-reader-architecture-2026-10-23.md). All source-line references below refer to **cbcb1cb6d688e25f922fd4821ba498f0f1cfbd41**, resolved with git rev-parse. Later edits to the shared checkout were read through git show when necessary; they are not included in this verdict.

## Spec

### 1. Medium: Unicode lowercasing shifts saved highlight and quote-restoration offsets

**Source.** [publication-html.ts:83](../packages/reader-core/src/original/publication-html.ts:83) searches a lowercased string, then lines 85–96 use those offsets against the original text-point array. [publication-html.ts:117](../packages/reader-core/src/original/publication-html.ts:117) repeats the mismatch for quote restoration at lines 119–124. The model records original UTF-16 offsets at lines 23–27.

**Demonstrated failure.** Render this HTML and restore the phrase “Working memory”:

~~~html
<p>İ first. Working <strong>memory</strong> later.</p>
~~~

Calling findPublicationTextRange(root, 'Working memory').toString() returned **“orking memory ”**, including the trailing space. Decoration similarly left the initial W outside the mark and included the following space. The triggering character is U+0130, capital I with dot: JavaScript lowercasing expands it to two code units. Every later match offset is therefore displaced.

A reader annotating a multilingual chapter can save the correct quotation in the notes drawer but see the wrong span highlighted on restoration. This violates the shared rendered-text/range requirement even though ordinary Latin cross-markup selections work.

**Required correction.** Keep a mapping from normalised/case-folded search positions to original text positions, or match in a way that preserves original offsets. Apply the same mapping to decoration and range restoration. Add a regression with an expanding case conversion before the selection and one inside it. No change to the original note design is needed.

### 2. Medium: Language Muscle quote images omit the identifying part of the book name

**Source.** The real adapter stores title “Building Your” and subtitle “Language Muscle” at [import-original-books.ts:50](../apps/reader-demo/scripts/import-original-books.ts:50). [ReaderLayout.tsx:388](../packages/reader-core/src/original/ReaderLayout.tsx:388) passes only book.title into the quote modal. [QuoteImageModal.tsx:122](../packages/reader-core/src/original/QuoteImageModal.tsx:122) paints that value as the book attribution.

**Demonstrated failure.** Open the real Language Muscle “Fine-tuning your aims” chapter, select its first paragraph, and choose **Share as Image**. Instrumenting the canvas's actual fillText calls produced these final attribution lines:

~~~text
Dominik Lukeš
Fine-tuning your aims
Building Your
127.0.0.1:8773/__review
~~~

The test route explains the local address. The missing “Language Muscle” is the implementation defect: the shared image does not display the publication's full identifying name. The author and chapter are correct, and the code passes a book-specific section/quotation URL to QR generation; it no longer hardcodes the DP destination.

**Required correction.** Supply the full display title to quote sharing while retaining the original hero's deliberate title/subtitle split. Verify the generated image text using the actual Language Muscle adapter.

### What passed independently

**Annotations and persistence.** An in-memory build of the checkpoint mounted the public PublicationReader component with two books sharing the section ID “intro”. Through the real selection toolbar and notes drawer, I saved “working memory” across strong markup, “a link boundary” across an anchor, and “table cell” across emphasis inside a table cell. All three produced the expected text-node marks and three margin-note cards. Literal script-tag text in a note remained text.

After switching the same public component to another book, saving a different note and reflection, switching back, and reloading the browser page, book A restored six mark fragments, three margin notes and “A reflection”. Book B restored its two mark fragments, one margin note and “B reflection”. A bookmark in book A remained absent in book B. This exercises the exported component's identity boundary, not merely different storage keys.

Malformed highlight/reflection storage did not prevent rendering. Replacing the browser storage getter with one that throws still rendered the real Language Muscle chapter and displayed the session-only storage notice. The implementation basis is [PublicationReader.tsx:17](../packages/reader-core/src/original/PublicationReader.tsx:17), [use-publication-reader.ts:12](../packages/reader-core/src/original/use-publication-reader.ts:12), and [publication-model.ts:16](../packages/reader-core/src/original/publication-model.ts:16).

**Search and targets.** Searching “deep needle” found a phrase after 400 filler words and across emphasis markup. The sidebar indexes complete rendered section text at [Sidebar.tsx:64](../packages/reader-core/src/original/Sidebar.tsx:64). Two identical headings produced distinct reader-content-repeat and reader-content-repeat-2 IDs; both actual TOC links resolved. A Markdown footnote's reference and return link both resolved to rendered IDs, and activating the reference retained the current book and chapter.

**Routing.** Clicking the actual Language Muscle cross-reference in step-2 opened fine-tuning-aims, preserved host=keep, and restored the correct chapters with Back and Forward. The checkpoint's handler is [use-publication-reader.ts:206](../packages/reader-core/src/original/use-publication-reader.ts:206). The six existing original-helper tests also passed independently, including both original URL syntaxes and preservation of host parameters.

On the running production demo, the last sections of all three real books survived direct-link reload: DP reader-guide, LM appendix-4, and linguistics 2015-11-05-a-literal-response-to-satire. Back and Forward across Language Muscle and linguistics restored the matching book and chapter. These production checks supplement the pinned-source probes; the running build was not certified as an immutable release artifact.

**Sanitisation and rich content.** Ten adversarial HTML cases passed through renderPublicationContent, then preparePublicationHTML, then insertion into an attached browser DOM. Cases covered script/event attributes, obfuscated JavaScript URLs, data URLs, SVG foreignObject, external SVG paint URLs, MathML HTML integration, malformed SVG/MathML parser boundaries, iframe srcdoc, object elements, and named form controls. No checked executable element/attribute or prohibited URL survived; the execution sentinel stayed zero.

The real Language Muscle cone retained one SVG, two paths and one gradient, with all retained paint references resolving. A KaTeX fraction retained MathML and mfrac. This is bounded adversarial evidence, not a claim of exhaustive security proof. The relevant boundaries are [publication-content/index.ts:105](../packages/reader-core/src/publication-content/index.ts:105), [publication-schema.ts:30](../packages/reader-core/src/publication-content/publication-schema.ts:30), and the final DOM sink at [MarkdownRenderer.tsx:234](../packages/reader-core/src/original/MarkdownRenderer.tsx:234).

**Original design and mobile controls.** The retained home structure is traceable to the original DP component: hero gradient/wave, title treatment, start/search controls and three concept cards. I compared the existing original/upgraded home captures and the existing mobile reading capture. A live comparison against the unchanged original on port 8771 and the upgraded reader on 8773 found matching hero geometry at 1440 × 1000: x=240, y=182, width=768, height=180, 60px Inter, weight 800, and the same wave path.

At 390 × 844, the checkpoint's mobile navigation exposed the scrollable “Read Your Way” controls. Focus mode was enterable and its mobile exit restored navigation. Font sizing changed to 20px, dark mode toggled, and the document had no horizontal overflow. A restored mobile note indicator measured 24 × 24 pixels within the viewport. These are headless viewport checks; they do not claim physical-device touch testing or a new design approval.

**Source fidelity and attribution.** Direct comparison against the read-only originals found identical IDs, titles and content in all 21 DP sections and all 12 recursive LM sections. Against the actual linguistics source model, all 253 answer bodies were preserved inside the adapted sections, across nine themes; answer URLs, licence URLs and question-author names matched. All **514 source hashes** in the checkpoint's provenance record matched the actual files. These checks compare source bodies and provenance; they do not grant redistribution rights.

## Standards

### Style package contract: implemented; final release artifact acceptance remains open

The checkpoint exports reader-core/reader.css, includes dist, and declares React/React DOM ^18.3.1 in [package.json:7](../packages/reader-core/package.json:7). [build-reader-styles.mjs:10](../scripts/build-reader-styles.mjs:10) compiles typography/utilities; lines 11–24 copy local font files and their notices and combine the original CSS. The [demo Tailwind configuration](../apps/reader-demo/tailwind.config.cjs) includes original component classes, HTML-book classes, class-based dark mode and the typography plugin. Existing public exports remain in the checkpoint's barrel.

Independent inspection of the available generated CSS found all three required font families, prose/dark styling, **112 distinct local font references with no missing files**, and no external stylesheet import. This generated output is mutable and is not a final release receipt.

The parent reports a successful root build and actual offline tarball consumer build. I inspected the existing package receipt but did not rerun its installation/build or certify its artifact hash. The parent subsequently added clean-build handling and disabled declaration maps to prevent stale/source-map packaging; those changes are outside this checkpoint and belong in the final immutable package review. No new packaging defect is asserted here on the basis of the superseded generated artifacts.

### Public licensing: retain the known release gate

The checkpoint's [licensing inventory](inventory-reader-licensing-2026-10-23.md) distinguishes software, books, borrowed passages, fonts/icons and dependencies. The actual home component only displays a licence supplied by that publication at [Home.tsx:125](../packages/reader-core/src/original/Home.tsx:125); the adapter supplies the DP notice without assigning it to LM.

The software licence and the complete redistribution basis for selected public book content remain unresolved. **This blocks public release, not the authorised private implementation.** No legal conclusion or additional reader defect is inferred from that evidence gap.

## Disposition of the initial six risks

1. **Rich HTML/text/annotation contract: retain narrowly.** Ordinary cross-markup ranges, margin notes, search, heading/footnote targets and hostile markup passed. The Unicode offset failure in Spec finding 1 prevents full closure.
2. **Original URL incompatibility: close for this reader checkpoint.** Both codecs pass helper checks; the real LM content link, history, host parameters and real-book deep-link reloads work. Recursive source counts and IDs are intact.
3. **Book-prop state leakage: close.** The public component keys its inner state by book identity. Notes, reflections and bookmarks remained separate through prop switches and reload; malformed/blocked storage remained usable.
4. **Original home/sharing design and identity: retain narrowly.** Original structures, home copy, controls and book-specific author/QR inputs are retained. Spec finding 2 leaves the visible quote-image book identity incomplete. Subsequent default EPUB wiring is explicitly excluded from this disposition.
5. **Styled installable package: close the implementation-contract gap; retain final artifact acceptance.** Compiled CSS, local fonts, notices, exports and an existing consumer receipt now exist. A final immutable pack/consumer review remains necessary after the parent's subsequent packaging and EPUB changes.
6. **Distribution licensing: retain for public release only.** The inventory records the unresolved decisions and separate material categories. It does not authorise publication.

## Review method and boundaries

The user supplied the prior T3 preview failures: “Preview automation snapshot timed out after 15000ms”. I used the explicitly approved sibling book-engine/.venv Python Playwright installation and the bundled chrome-headless-shell, never real Chrome. No new server or persistent job was started.

For isolated component probes, esbuild read framework TS/TSX/JSON through git show at the checkpoint and returned its bundle in memory. React and React DOM resolved to the installed demo runtime. Playwright supplied an in-memory page on the existing local origin and used the existing production stylesheet. This kept changing EPUB wiring out of the behavioural checks. The test browser used an ephemeral profile, and the test processes closed their browsers in finally blocks. No test fixture or harness file was retained.

The reported implementation suite of 23 content regressions and 14 helper browser checks, and the parent's five real-book tests/build/package checks, are supplied evidence rather than independently rerun suite counts here. My independent checks are detailed above; the existing six original-helper tests were rerun with **6 passed, 0 failed**. Some probe attempts needed harness corrections (React resolution, waiting for smooth scrolling, and precise selectors); only completed observations are reported as passes.

Only this review document was authored. There were no code fixes, Git mutations, original-source changes, deployment, publication, secrets or .env reads, or further delegation. Concurrent changes were preserved. The publication-epub service and its later wiring are excluded. No missing default eBook action is raised against this checkpoint, and no final package or public-release acceptance is claimed.

The implementation owner can correct the two specification findings and return their regressions for review. No action is required from Dominik.
