---
title: Two-book conversion, content preparation report (Academic Reading Framework, Foundations of Readability)
date: 2026-10-28
status: content prepared, not integrated, not deployed; independent review owed on embeds and licences
owner: content-preparation sub-agent (parent integrates)
---

# Result

FOR AGENTS. Both books converted from the ORIGINAL source code, interactives retained as self-contained HTML. No shared file, core file, App.tsx, manifest, package.json or release script touched. No Git, push, deploy. Instructional Videos and Dyslexia untouched.

- Books: `apps/reader-demo/src/books/next-books/{academic-reading-framework,readability-foundations}.book.json` (10 and 14 sections, Markdown, reader `PublicationBook` shape, `appearance` proposed).
- Embeds: 9 single-file HTML documents in `apps/reader-demo/interactives/<book>/<embed-id>/index.html`; descriptors in `next-books/embed-manifest.json`; prose alternatives live in section content (contract v1).
- Provenance: `next-books/next-books-provenance.json`. Receipt: `receipt.json` here. Evidence: `evidence/`.
- Checks: 50/50 book checks, 122/122 Chrome checks, `tsc --noEmit` exit 0 with the build sources inside `src/`.

# Sources and freshness

| Book | Read from | Commit | Note |
| --- | --- | --- | --- |
| Academic | `05_publications/academic-reading-framework` | `c024645` (branch `feat/independent-static-hosting`) | `constants.tsx`, `CognitionExplorer.tsx`, `DetailSection.tsx`, `types.ts` identical to `main` (`9630ee9`). Readable branch `29522af` same content. |
| Readability | worktree `~/worktrees/guides/readability-foundations` | `31a48be` (`guides/readable-subdomain`, has node_modules) | 46 used files sha256-identical to the canonical checkout (`main`, `d96c01d`). |

Rendering approach: Academic sections rendered with react-dom/server from the original `constants.tsx` (widgets swapped for markers in the element tree, rest untouched), then pandoc to Markdown. Readability converted block by block from the original `data/content/*.tsx` through the original `RichText` grammar. Neither retypes author text.

# Actual source against imported Folio

`evidence/folio-differences.json`, word-level, per chapter.

- **Academic.** Folio text equals the source for 9 of 10 chapters (0 source words missing; the book adds only each chapter's title as `#` heading). Cognition Explorer chapter: Folio holds 98 words, mostly interface text (click instructions, scroll hint) and no node definitions or arrow list; the book carries those (289 words) in the prose alternative. The two diagram captions in `cognition` differ only in position.
- **Readability.** Folio equals the source except interface debris: 12 "On this page" sidebars, 14 permalink markers `[](#id "Copy link to section")`, step-number badges, `Click to reveal`, demonstration labels, checker stats (`Total Sentences 3 …`), checklist helper line. Folio `readability-checker` chapter is the default-state text only. The book removes the debris and adds the prose alternatives (about 400 words in total).
- Folio word totals: Academic 4,719, Readability 5,181. Book: 5,074 and 5,303 (including prose alternatives and chapter titles).

# Source accounting (what was stripped)

`evidence/books-check-report.json` `accounting`: per section, original words (app rendering with chrome), book words, declared removals, moved/repeated runs, lost words. **Lost author words: 0 in all 24 sections.** Declared removals (counted per section):

- Academic: `Characteristic` / `Guide Section` badge, `Cite Section`, `Explore Related Sections` (heading only; the link `Open Cognition Explorer` is kept as `#/cognition-explorer`), explorer widget chrome (`Interactive Cognition Map`, `Click on nodes to explore the cognitive process.`, `Reset View`, `Scroll horizontally to view full diagram`), full-screen button.
- Readability: sidebar `On this page` and breadcrumb, step-number badges, `Click the box to see the text clearly.`, `Click to reveal`, `Interactive Example`, `Slide 1 of 1`, `Intro`/`Summary` slide labels, checker stats/labels and default-state figures, checklist helper sentence and `Reset Checklist`, layout toggle, font adjuster buttons, icons (check/cross/thumbs; their meaning is carried by the comparison titles and the prose alternatives).
- Kept deliberately: `Choosing the Approach` / `Choosing Tools` (app-supplied headings, useful navigation); `Tip` / `Important` callout labels.
- One repair: the original `RichText` cut the Schwarz and Flammer DOI at its first parenthesis and printed `90301-7)` again after the link; the book links the full address.

# Books

- Section ids follow the originals (`purposeful`, `non-linear`, …; `five-principles`, `10-simple-things-docs`, …); `category` is the original navigation group; titles are the original page titles. Order equals `NAV_STRUCTURE` (Academic: Cognition Explorer before Narrative vs Ruminative) and `NAV_GROUPS`.
- Headings: one `#`, `##` for the original steps and cards, no skipped levels (checked).
- Internal links `#/section-id` (reader route form), all resolve.
- `home`: author line only (Academic: `Developed by Dominik Lukeš for the Reading and Writing Innovation Lab`; Readability: `Dominik Lukeš, CC BY • Version from May 2023`) plus the Readability licence block. No invented blurb.
- `appearance` (proposal, uses existing approved masthead values; App.tsx owns the theme map): Academic accent `#0369a1`, paper `#f6f9fb`, ink `#1f2933`, `editorial` (accent/paper 5.6:1); Readability accent `#4338ca`, paper `#f8f7fd`, ink `#23223a`, `practical` (7.4:1). Hues come from each original (sky brand, indigo). No cover chosen; candidates sit in `05_publications/book-covers/<book>/` (`type-01..04`, `ai-art-01..03`).
- `sourceUrl`: current catalogue addresses (`academicreading.edutools.fyi`, `readability.edutools.fyi`). Academic's final book URL is undecided; see below.

# Embeds

All: one HTML file, inline CSS and JS, no network, no storage, no popups, responsive to 320 px, native buttons or `role=button` with Enter/Space, visible focus, light/dark colour scheme, reduced-motion respected, height reporting identical to `reader-core/embed-child`. Markup is the original component's own render (react-dom/server, original Tailwind classes compiled locally with tailwindcss 3.4.19); scripts reproduce the original state changes.

| Embed id | Section / anchor | Original code reused | Adaptations (all accessibility or sandbox driven) |
| --- | --- | --- | --- |
| `cognition-explorer` (22 KB) | `cognition-explorer` / `cognition-explorer-text` | `NODES`, `EDGES` read from `CognitionExplorer.tsx` source text; `getEdgePath`, label offsets, colours, dimming and selection logic ported line for line | Full-screen toggle dropped (sandbox forbids fullscreen; "Open full view" link replaces it). Info panel below the map, not over it. 800×600 stage scales to 70 % before scrolling sideways. Node text on `sky-400` is dark slate (white on sky-400 is about 2:1). Reset View darker. |
| `reading-articulation-layers` (13 KB) | `cognition` / `reading-articulation-layers-text` | JSX in `COGNITION_POINT`, rendered as is | caption colour darkened |
| `reading-simplified-summary` (9 KB) | `cognition` / `reading-simplified-summary-text` | as above | as above |
| `cramped-text-reveal` (15 KB) | `formatting-examples` / `cramped-text-reveal-text` | `DyslexiaSimulator.tsx` rendered in both states; class sets read from the renders | box is `role=button`, `aria-pressed`, Enter/Space, hint shows on focus |
| `font-spacing-adjuster` (16 KB) | `formatting-examples` / `font-spacing-adjuster-text` | `FontSpacingAdjuster.tsx` render; limits 14–40 px, step 2, reset 20 | none |
| `readability-checker` (18 KB) | `readability-tool` / `readability-checker-text` | markup from `ReadabilityChecker.tsx`; analysis is the original `useMemo` body, type-stripped by esbuild and inlined (not retyped) | textarea `aria-label`, results `aria-live` |
| `slides-one-bullet` (19 KB) | `slide-formatting-examples` / `one-bullet-text` | original `BlockRenderer` + `SlideSimulation` + original data | none |
| `slides-extraneous-text` (15 KB) | same / `remove-text-text` | as above | none |
| `slides-zooming-images` (16 KB) | same / `zooming-text` | as above | Unsplash photo replaced by an inline neutral placeholder picture (see unresolved) |

Prose alternatives (HTML `div` with authored id, each far above 80 characters; checked by `checkPublicationEmbeds`): the explorer's holds all 9 definitions and all 15 arrows grouped by source node; the checker's carries the sample text and its result computed by the original function (3 sentences, 40 words, 13.3 average, sentence 3 of 21 words highlighted orange); slide ones describe every slide with the original captions; the two diagram ones list their parts. Scaffolding and layout descriptions (`Text version of the interactive demonstration.`, `weaker/better version`, how the cramped box behaves, node counts, size limits) are mine; every definition, label, caption, sample and slide text is the original's, taken from the source by code. EPUB, agent files and search take the alternatives automatically.

# Checks (all re-runnable with `build-source/run.sh`)

- `check-books.ts` (50): ids unique and in original order; one `#` and no skipped heading level; internal links resolve; rendered content free of script/iframe/markers; `validatePublicationEmbeds` and `checkPublicationEmbeds` clean for both books; manifest and content agree on the 9 anchors; embed files exist; licence checks; per-section word accounting (0 lost).
- `check-embeds.mjs` (122, Chrome 156 over the debugging port, no dependency): every embed offline with no errors at 320 and 900 px, no page overflow, self-contained, posts `{type,version:1,height}` from a `sandbox="allow-scripts"` frame with origin `null`; explorer geometry equals the original SSR output exactly (15 paths, 15 labels, 9 nodes), all 9 nodes select with correct definition, related arrows, dimming, Reset, Esc, keyboard; typography embeds equal the original component's DOM in 2–7 states each (cramped/clear, 14…40 px, 9 checker texts including empty, over-20, over-35, `<b>` and `&`); slides show all original text; every embed again under the contract's `/embeds/*` CSP (served by a loopback server, no violations; explorer and checker still work).
- `tsc --noEmit` in `apps/reader-demo`: exit 0.
- Not covered: embeds inside the real reader (needs App.tsx and release copy), dark-mode appearance by eye, screen-reader pass, touch, EPUB build with the alternatives, Safari/Firefox. Screenshots were looked at for explorer and slides in Chrome only.

# Licences

- **Readability: original says CC BY everywhere.** README (2 places), Home page (2), footer, readable-page config, catalogue (`guides.json`), git history of the repo. `BY-SA` / `ShareAlike` occur nowhere in the original or its history. CC BY-SA 4.0 appears only in the Folio draft `book.toml` (set from the earlier brief). The book preserves CC BY and links the generic 4.0 deed (the original names no version). The Folio `book.toml` should not be used for edition notices without Dominik's decision.
- **Academic: the original has no licence or copyright statement** (source, README, metadata, history). Folio `book.toml` says CC BY-SA 4.0 from the brief. The book prints no licence. Needs Dominik's decision.

# Academic Reading route (read-only inspection)

- 24 Oct 2026 decision (webapps-websites research notes): publish as one of Dominik's books within dominiklukes.net through the existing book system; supersedes `academicreading.dominiklukes.net`; redirect `academicreading.edutools.fyi` after publication; "do not invent the canonical book path before inspecting the book system".
- dlnet today: no book route. `guides.json` lists `academic-reading` at `academicreading.edutools.fyi` (placement `writing`); `showcase.json` links `/resources/academic-reading` and `/resources/readability-foundations`. Branches `29522af` (readable pages) and `c024645` (static packaging) hold the earlier plan.
- Nothing competing was created; no website file edited. The book id `academic-reading` matches the catalogue id.

# Unresolved issues (need decision or follow-up)

1. Slide photograph: original uses Unsplash `photo-1578916171728-46686eac8d58`, remote only, no local copy anywhere; embeds must not load remote images. Placeholder in use. Needs a licensed local image or acceptance of the placeholder.
2. Academic licence: undecided (above).
3. Readability licence version: original says only "CC BY"; confirm 4.0 or give the version.
4. Academic overview: the source string holds a blank line between two sentences but the app renders one paragraph (no `whitespace-pre-line`); book and Folio follow the app.
5. Text refers to a non-existent appendix in the book: Academic `strategic` ("See Appendix for details") and Readability `10-simple-things-ppt` ("Appendix 5: Examples of slide formatting"). Author text kept; the references need an author decision.
6. Academic `sourceUrl` and final book URL.
7. No cover chosen.
8. Checklist (nine checks, tick boxes and notes) is kept as a plain list; not among the requested embeds.
9. Prose alternatives repeat the demonstration text on screen next to the frame (by contract design).
10. Build sources use absolute paths to the sibling repos and the guide worktree (documented in `run.sh`).

# Integration needed (parent)

1. Register both books in the demo's book list (App.tsx / manifests); `appearance` is in the JSON, App.tsx theme map may override; add `cover` once chosen.
2. Pass `embeds` per book from `embed-manifest.json` (drop the `placement` field), call `checkPublicationEmbeds` in the release test.
3. Copy `interactives/<book>/<id>/` into the edition's embeds root; emit headers with `securityHeaders({ embedRoot })`; `src` values are `<id>/index.html`.
4. Public MIT export: `scripts/prepare-reader-source-release.mjs` is an allowlist and forbids `apps/`, so new files stay out. Add both new books to its manuscript-anchor list (`manuscriptAnchors`) so the audit guards their text; shared file, not edited here.
5. Search index and agent files regenerate from the new JSON through the existing scripts.
6. Resolve items 1–3 and 6–7 above before any public edition.

# Files

All under `onlinereaderframework`: `apps/reader-demo/src/books/next-books/` (2 book JSON, `embed-manifest.json`, `next-books-provenance.json`, `build-source/`), `apps/reader-demo/interactives/` (9 embeds), `docs/design/2026-10-28-two-book-conversion/{conversion-report.md,receipt.json,evidence/}`. Scratch `.scratch-two-book/` removed.
