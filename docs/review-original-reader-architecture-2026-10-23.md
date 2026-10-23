---
title: Initial architecture review of the original reader upgrade
date: 2026-10-23
reviewer: GPT-6 Astra
register: FOR DOMINIK
status: initial-review-material-integration-risks-open
scope: Architecture and source contracts; not final implementation acceptance
---

No action needed. FOR DOMINIK.

The selected original reader can support the upgrade. **The material risks are in the integration contracts**, particularly where the original text processing, routing and application-wide state become reusable library behaviour.

- The original design is settled; no replacement design or approval round is required by this review.
- Four specification findings need explicit implementation treatment before acceptance.
- Two standards findings concern faithful packaging and release evidence. Licensing uncertainty blocks public release, not the authorised private implementation.

This is an initial architecture review of a changing checkout. The proposed `original/` and `publication-content/` directories were absent at the source checkpoint. Findings below identify inherited mechanisms and missing contract detail, **not demonstrated defects in the concurrent implementation**. The later immutable-head review must establish whether each risk was resolved.

Source abbreviations below have exact roots: **DP** means `/Users/dominiklukes/worktrees/guides/deliberate-practice-guide`; **LM** means `/Users/dominiklukes/worktrees/guides/building-your-language-muscle`. Other paths are relative to this framework repository unless stated otherwise.

## Spec

### 1. High: Rich HTML needs a shared text and annotation contract

**Evidence.** The [content contract](plan-original-reader-upgrade-2026-10-23.md:21) returns sanitised HTML while retaining original annotations, speech and reflections. DP [components/MarkdownRenderer.tsx:160](/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/components/MarkdownRenderer.tsx:160) paints highlights inside individual parsed strings. Lines 241–244 find margin notes by matching saved visible text against raw Markdown blocks; lines 312–353 attach the original margin-note UI. DP [components/Sidebar.tsx:70](/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/components/Sidebar.tsx:70) searches a lightly cleaned source string. DP [components/TableOfContents.tsx:48](/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/components/TableOfContents.tsx:48) independently parses Markdown headings. LM [App.tsx:393](/Users/dominiklukes/worktrees/guides/building-your-language-muscle/App.tsx:393) instead modifies raw HTML with regular expressions before the HTML sink at line 506.

**Failure scenario.** A reader selects “working memory” across `working <strong>memory</strong>`, adds a note, leaves and returns. Matching a single text node or the raw source cannot recover that visible phrase. The note can remain in the drawer while its highlight and margin note disappear. Searching the same phrase has the same source-markup problem. Passing LM HTML to the unchanged DP contents list produces no headings. Separately generated slugs can also disagree with sanitised footnote targets or preserved HTML IDs.

**Required resolution.** Keep the original surrounding UI, but derive search text, speech text, heading targets and annotation anchors from the same rendered content model. Use text-node/range operations for annotation decoration; do not interpolate saved text or notes into HTML strings. Preserve the original margin notes and mobile indicators when changing the parser. Ensure sanitisation covers the final content inserted into the DOM and is not invalidated by later string processing. Define stable, unique heading IDs, preserve compatible supplied IDs, and keep footnote links and return links paired. This is a necessary adaptation of the source, not permission to remove its controls.

**Acceptance evidence.** Exercise a saved note spanning emphasis/link boundaries, a table-cell highlight, HTML and Markdown TOCs, repeated headings, footnote return links, and a full-content phrase search through inline markup. Check unsafe HTML at the actual rendering boundary. These checks were not run in this review.

### 2. High: The two originals use incompatible URLs, including a real internal book link

**Evidence.** DP [App.tsx:23](/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/App.tsx:23) reads `?section=`; lines 408–426 restore history and selected text, and lines 481–501 write section URLs. LM [App.tsx:453](/Users/dominiklukes/worktrees/guides/building-your-language-muscle/App.tsx:453) creates `#/section?text=` links. Its actual [bookContent.ts:184](/Users/dominiklukes/worktrees/guides/building-your-language-muscle/bookContent.ts:184) links to `#/fine-tuning-aims`. The [minimum book contract](plan-original-reader-upgrade-2026-10-23.md:19) does not define URL ownership across the three demos.

**Failure scenario.** LM content renders correctly inside the DP shell, but clicking “Fine-tuning your aims” only changes the fragment; the query-based reader stays on the old chapter. In a demo hosting multiple books, a copied section link can also reopen the default book unless book selection is encoded and restored before section lookup. Returning home through DP's `url.search = ''` can remove a host's book selector.

**Required resolution.** Use one route codec shared by host selection, recursive navigation, content-link handling, sharing and browser history. Adapt the existing LM internal link syntax explicitly, while preserving ordinary footnote fragments. Resolve descendants recursively and require IDs unique within a book; define the reserved home identifier. Preserve unrelated host parameters. Keep group expansion separate from leaf activation using the original LM recursive navigation at `App.tsx:581–629`.

**Acceptance evidence.** Follow that real LM cross-reference, reload a shared leaf link for each book, navigate Back/Forward across books and chapters, and verify a footnote still stays within its chapter. The adapter must expose all nine linguistics themes and 253 answers without losing descendant search or traversal.

### 3. High: Namespaced keys alone do not isolate state when the book prop changes

**Evidence.** [The plan](plan-original-reader-upgrade-2026-10-23.md:19) requires book IDs to namespace persistence. DP [App.tsx:35](/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/App.tsx:35) loads progress, bookmarks, highlights and reflections in initial state functions through line 73; settings use the same pattern at lines 76–102. Persistence effects write the current state at lines 195–210 and following. The original has no changing book prop.

**Failure scenario.** A consumer changes `<PublicationReader book={book}>` from DP to LM without unmounting it. Changing storage keys to include the new ID does not rerun initial state functions. An effect can therefore write DP's still-loaded annotations under LM's new keys. Both books can use a section ID such as `introduction`, making the contamination visible rather than merely leaving orphan records.

**Required resolution.** Make the exported reader itself enforce an identity boundary, for example by keying an inner stateful reader by `book.id`, or use an atomic load/reset transition that cannot write until the new book is hydrated. Apply it to annotations, reflections, progress, bookmarks and the settings covered by the plan. Validate stored shapes and tolerate unavailable storage. Do not silently import the original unnamespaced data into every book.

**Acceptance evidence.** Save distinct notes and reflections in two books, switch repeatedly without a page reload, then reload each. Verify both namespaces retain their own values and a blocked or malformed storage entry does not prevent reading.

### 4. High: Generalising the original home and sharing must preserve their design and correct their identity

**Evidence.** DP [components/Home.tsx:31](/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/components/Home.tsx:31) contains the selected hero and wave; lines 83–114 contain the concept-card design. These are actual source implementations. However, lines 42–47 hardcode DP's title and claims. DP [components/QuoteImageModal.tsx:114](/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/components/QuoteImageModal.tsx:114) hardcodes the DP title, domain and QR destination through line 120. Its `App.tsx:600–628` also hardcodes quotation attribution. The [contract](plan-original-reader-upgrade-2026-10-23.md:19) allows richer home configuration but does not yet specify it.

**Failure scenario.** A minimal title/content substitution either leaves DP claims on the linguistics home or deletes the original concept cards to avoid those claims. Copying the quote modal unchanged sends a linguistics quote's QR code to DP. Both outcomes violate the selected reuse and identity requirements.

**Required resolution.** Extract and retain the actual original structures and classes. Parameterise their book-specific text, attribution and sharing destinations; supply original DP home values through its adapter. Add optional home data where needed without weakening the minimum API. Record necessary adaptations against source components. Use configured downloads to reach the retained publication pipeline; do not quietly substitute the limited legacy framework EPUB renderer (`packages/reader-core/src/services/epub/epubGenerator.ts:87–104`).

**Acceptance evidence.** Compare the adapted DP home, reading card, note indicators and quote card with the original source/screenshots, and confirm LM/linguistics sharing uses their own identity. The prior sibling audit establishes the chosen baseline; it does not verify the new extraction.

## Standards

### 5. High: Source-linked demo success cannot establish a faithfully styled, installable package

**Evidence.** DP [index.html:7](/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/index.html:7) supplies Tailwind typography at runtime; lines 9–53 configure dark mode, typography and animations; lines 55–74 load fonts and Material Symbols and set reader CSS. The framework's [apps/reader-demo/tailwind.config.cjs:3](../apps/reader-demo/tailwind.config.cjs:3) scans core source but has an empty extension and plugin configuration. Its [vite.config.ts:9](../apps/reader-demo/vite.config.ts:9) aliases the source barrel. The core [package.json:14](../packages/reader-core/package.json:14) includes only `dist` and builds with TypeScript; [tsconfig.json:16](../packages/reader-core/tsconfig.json:16) includes TS/TSX. Original DP uses React 19 (`DP/package.json:18–19`); core currently advertises React 18 peers (`packages/reader-core/package.json:18–20`).

**Failure scenario.** The demo sees source classes while an installed consumer gets only JavaScript and declarations. Typography, icons, dark mode or animation styles disappear even though the package compiles. Copying JSX alone does not preserve the selected original design. A React-version assumption can likewise be concealed by the demo's deduplication.

**Required resolution.** Assign and document the package's CSS/font/icon delivery mechanism, including the original typography configuration and classes embedded in book HTML. Ship compiled styling/assets or a complete supported consumer configuration; account for those files in package exports and contents. Preserve existing public exports. State the React support range on evidence. Record source-to-destination mappings and hashes plus the reason for each substantive adaptation; a provenance comment alone is not fidelity evidence.

**Acceptance evidence.** Build and consume the actual packaged output in a consumer without the source alias. Verify required styles/assets and the existing API as well as the new reader. Source-linked and packaged checks are distinct. No install, build, pack or browser check was run here.

### 6. Release blocker: The available notices do not establish a complete distribution licence inventory

**Evidence.** DP [components/Home.tsx:153](/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/components/Home.tsx:153) credits Dominik and displays a CC BY-SA 4.0 notice through line 159. It does not separately identify the software's licensing scope. No top-level licence/notice file was located by the bounded filename scan in the framework or either original worktree; the inspected package manifests have no licence field. Both original manifests and the core are private. LM [bookContent.ts:536](/Users/dominiklukes/worktrees/guides/building-your-language-muscle/bookContent.ts:536) expressly attributes CEFR level descriptors to an external source. Fonts, icons and library dependencies are additional distribution inputs.

**Failure scenario.** Applying the DP footer to every publication asserts a licence for other content without evidence. Giving the whole public package a new software licence without inventorying copied source, content and assets leaves its redistribution basis unresolved. `private: true` is a publication control, not evidence of a licence grant.

**Required resolution.** Keep code, book text, copied third-party passages, fonts/icons and dependencies separately identified in the release inventory. Preserve existing attribution and record unresolved software/content rights as release decisions; do not infer a software licence from the book footer. Make each book's attribution/licence display configurable. Keep publication and visibility changes outside this task, as [the plan requires](plan-original-reader-upgrade-2026-10-23.md:31). This is an evidence gap, not a legal conclusion or a reason to stop private implementation.

## Checks, provenance and limits

Read the plan first, then the sibling [original-reuse audit](../../book-engine/docs/audit-original-reader-reuse-2026-10-23.md), the actual DP/LM source locations cited above, framework exports/manifests/configuration, and applicable development/writing instructions. No applicable `AGENTS.md` was found at the checked framework ancestors or within the inspected framework/original source trees. The supplied session instructions governed this review.

The source checkpoint was **2026-10-23 12:06 UTC**. SHA-256 receipts identify key inputs without Git operations:

- Plan: `64a9da8e7d690944b3060a26b47e9568a36a794e6018c15e4ba4f697a3e21f6e`.
- Sibling audit: `eeb2af1b7971d5b26eb73d90060cc159626f888f0ee022e14a0515a2f2f39982`.
- DP `App.tsx`: `917ce0013df578b9ff465627d570c90841ee5adac602a8465d0efda8be443c95`.
- LM `App.tsx`: `3f4dc58cf67fd1c840a2b5cbe7a6e959b24b789117a8bda4aed7061a340b4654`.

The report was read back, and its linked files and line numbers were checked successfully. Only this report was written. No tests/builds, dependency installation, Git operations, original-source edits, secrets reads, deployment, external publication or delegation occurred. Runtime behaviour, complete linguistics adapter fidelity, final dependency licensing and the concurrent implementation remain unverified. The parent implementation session should resolve these findings and supply immutable-head evidence for final review. No action is required from Dominik for this initial review.
