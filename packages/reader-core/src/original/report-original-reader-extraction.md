---
title: Original publication reader extraction evidence
date: 2026-10-23
status: implementation-handed-off
register: FOR DOMINIK
---

No action needed. FOR DOMINIK.

The original reader is implemented in this module. **The original Deliberate Practice design remains the baseline**: hero and wave, concept cards, chapter card, sidebar tools, typography controls, reading ruler, focus mode, speech controls, notes drawer, margin notes, reflections, sharing and keyboard help. Language Muscle supplies the recursive navigation pattern. The parent session owns final integration and acceptance.

## Files and adaptations

- `PublicationReader.tsx` exports the component and contract types. It enforces a stateful inner `key={book.id}` and validates unique section IDs.
- `ReaderLayout.tsx` retains the original App markup. `use-publication-reader.ts` extracts per-book state, routing, selections, persistence, keyboard actions and the existing download handler seam.
- `Home.tsx` retains the original hero, wave, card design and category overview. The adapter supplies actual text, concepts, attribution, licence and configured downloads.
- `Sidebar.tsx` retains the original tools and search interface. Its recursive item follows the actual Language Muscle component, with separate chapter activation and expansion controls. Full-content search includes every descendant.
- `MarkdownRenderer.tsx` retains the original speech controls, margin-note cards, mobile note indicators and reflection form. It passes each section's format to `renderPublicationContent` and retains rich HTML around that seam.
- `publication-html.ts` supplies a single rendered-text model for search, speech and annotation ranges. It handles phrases spanning emphasis, links and table cells without inserting user text as HTML. It keeps sanitised heading and footnote IDs. `TableOfContents.tsx` reads the rendered heading elements and refreshes on content, format and section changes; it does not parse HTML as Markdown.
- `HighlightsDrawer.tsx`, `QuoteImageModal.tsx`, `ShortcutsModal.tsx` and `Toast.tsx` retain their original controls. Quote images now use the current book's author, title, filename and section/quote URL. `publication-notes.ts` retains the Markdown export and includes reflections.
- `reader-original.css` contains the original typography/icon/animation conventions and rich-content block treatments. The README describes parent-owned Tailwind, bundled fonts/icons and package CSS requirements.

Coaching has an explicit optional `PublicationCoaching.render` boundary and is absent by default. AI summaries and the original service imports are omitted. The module contains no credential handling or AI network client. The retained `handleDownloadEbook` seam currently follows a configured publication download; the parent can connect the new EPUB service after this handoff.

## Persistence and navigation fixes

All settings, progress, bookmarks, highlights and reflections use book-specific storage keys. The public component's identity boundary prevents cross-book writes when its book prop changes. Stored shapes and setting enums are validated; blocked storage leaves reading functional and displays a session-only notice. No original global storage values are imported automatically.

Both original URL syntaxes work, including the actual Language Muscle `#/fine-tuning-aims` link. Query routes include book identity and preserve unrelated host parameters. Footnotes and return links remain within their chapter. Selections are restricted to publication content, support keyboard/touch selection changes, and clear after navigation. The reading ruler scrolls the reader container. The sidebar shortcut and mobile focus exit work independently of desktop layout assumptions.

## Checks run

- The package TypeScript check completed with exit 0: `packages/reader-core/node_modules/.bin/tsc --noEmit -p packages/reader-core/tsconfig.json`. It uses the installed React 18 types and dependencies supplied by the content worker.
- The existing Node test runner passed all six module regressions: `node --test packages/reader-core/src/original/test-original-reader.mjs`. These cover recursive traversal, both URL syntaxes, host/book parameter preservation, per-book storage with malformed/blocked values, reflection-only Markdown export and safe download URLs.
- `test-original-reader-browser.mjs` passed 14 browser assertions through the real demo's Vite server. It checks cross-markup ranges/decoration/search, table and link preservation, repeated heading IDs, paired footnote targets, unsafe HTML removal at the final decorated DOM and the absence of interpolated note HTML.
- In the real Deliberate Practice demo, a saved phrase spanning bold and ordinary text produced two marks and a margin note. Its saved reflection and note survived switching to Language Muscle and back without a reload. Language Muscle's highlight/reflection arrays remained empty during that switch.
- The actual Language Muscle cross-reference from `step-2` opened `fine-tuning-aims` and retained the book and unrelated `host=keep` parameter.
- The actual Deliberate Practice contents links all pointed to existing rendered headings. Footnote forward and return clicks retained book and section identity and reached their paired targets.
- The linguistics search for `language` returned 208 matching sections and included the final answer in the ninth theme. A phrase crossing emphasis, `is shared knowledge`, found and opened the final answer. With the browser storage getter deliberately blocked, Language Muscle still rendered its chapter and displayed the session-only notice.

The local verification server used `configFile:false` and `envDir:false` so it did not load `.env` files. Its cache stayed under this module and was removed after the server stopped. The isolated server reported an empty Tailwind content configuration, so those browser checks establish functionality only; the parent must assess styled layouts through the normal demo build. Original sources were read only. No Git mutation, commit, push, deployment or further delegation occurred.

## Limits

These checks establish source-linked behaviour, not packaged visual acceptance. The parent owns package CSS/assets, adapters, independent review, EPUB integration and final desktop/mobile browser acceptance. Browser screenshot snapshots failed twice with the raw error `Preview automation snapshot timed out after 15000ms.` Browser JavaScript checks succeeded; no visual approval is claimed. Actual speech output and clipboard/download permissions depend on the browser and were not independently verified here.

The original text-based annotation semantics remain: identical phrases paint every matching occurrence, longer overlapping highlights take priority, and a margin note anchors to the first matching range. All records remain available in the notes drawer.

## Source provenance

The paths below identify the read-only installed source. SHA-256 values were computed directly from its files. Source-to-destination mappings document extraction rather than byte-identical copies; substantive adaptations are described above.

Deliberate Practice source root: `/Users/dominiklukes/worktrees/guides/deliberate-practice-guide`.

Language Muscle source root: `/Users/dominiklukes/worktrees/guides/building-your-language-muscle`.

- Deliberate Practice `App.tsx` supplies `ReaderLayout.tsx; use-publication-reader.ts`. SHA-256: `917ce0013df578b9ff465627d570c90841ee5adac602a8465d0efda8be443c95`.
- Deliberate Practice `components/Sidebar.tsx` supplies `Sidebar.tsx`. SHA-256: `f2f64ee8c8828f2a186836f2d82d559a9163bfd56aa29fa572ed3675f677e44c`.
- Deliberate Practice `components/Home.tsx` supplies `Home.tsx`. SHA-256: `ad3f4bd48f4e8b3155bb5cfc8275906ba4d2df6dfc06eacfddf5913c73dce4f0`.
- Deliberate Practice `components/MarkdownRenderer.tsx` supplies `MarkdownRenderer.tsx; publication-html.ts`. SHA-256: `9ca83348c5afc6366a19da06ad94f612c1e57b7b7c8867a475a6786f06eba1aa`.
- Deliberate Practice `components/TableOfContents.tsx` supplies `TableOfContents.tsx`. SHA-256: `e7ad1921933d5693319b58b1f2449acff8eb35fb852ea7c0f45835811fd24fd1`.
- Deliberate Practice `components/HighlightsDrawer.tsx` supplies `HighlightsDrawer.tsx`. SHA-256: `af868eeb0f72f5b3e835ad4bf322989a33fd127f7c0b7533aa959f0d7bd16060`.
- Deliberate Practice `components/QuoteImageModal.tsx` supplies `QuoteImageModal.tsx`. SHA-256: `1c6a785e639e33d3b56fe50aab129525f68ede0304f505d5fb41618522e36f9f`.
- Deliberate Practice `components/ShortcutsModal.tsx` supplies `ShortcutsModal.tsx`. SHA-256: `8c0e92ed1c560aff5846b618fa2e7408d0ca46c137305df28c7c508d721bf1b1`.
- Deliberate Practice `components/Toast.tsx` supplies `Toast.tsx`. SHA-256: `6b672fbd062f859f655b73ea61deaa94d5f63074c7934bfa4a02384183107e4f`.
- Deliberate Practice `utils/highlightExporter.ts` supplies `publication-notes.ts`. SHA-256: `7f95dfa100145907c6eb9d76e0fa5be300d3f72924dc20cedc8b060d978a2a8d`.
- Deliberate Practice `types.ts` supplies `types.ts`. SHA-256: `de4a753f7fa7d7e3320557d31981664e0ce4ab5fbf871bdddb78aa9809ec7ef1`.
- Deliberate Practice `index.html` supplies `reader-original.css; README.md`. SHA-256: `604cfb309cd4557bd60299db69025ba3c8146b67fbb87777620f799e38d490d2`.
- Language Muscle `App.tsx` supplies `Sidebar.tsx recursive SidebarItem`. SHA-256: `3f4dc58cf67fd1c840a2b5cbe7a6e959b24b789117a8bda4aed7061a340b4654`.
