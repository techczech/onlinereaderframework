---
title: Receipt, six configurable front pages
date: 2026-10-25
register: FOR AGENTS
status: built, awaiting independent review of the storage and public-config seams
base: 47e7354
---

Six approved layouts built as per-book options; no layout is app-wide. Keys: sol-jacket, sol-reading-desk, sol-open-contents, opus-title-contents, opus-search-map, opus-colour-band. Docs: `docs/configuration-publication-reader.md` § Front page layouts.

## Decisions
- Config seam: `appearance.frontPageLayout` (optional, typed union). Omitted or invalid → classic home, no throw. Added `labels.contents` / `labels.fullContents`.
- Shared model `frontpage-model.ts`; layout components in `layouts.tsx` vary geometry only. One `FrontPage` holds state (depth, open groups, filter).
- Depth control labels exactly "Contents" / "Full contents". Contents = top-level groups; Full = all entries to `homeDepth`. Initial: Full when ≤ 40 entries (`FULL_CONTENTS_AUTO_LIMIT`), else Contents. Hidden when both are identical.
- Flat books: runs of equal `category` shown as display-only headings; counted as the first level.
- New storage: `publication-reader:<book>:lastSection` (string|null, same guarded pattern). Written only for readable non-App-Guide pages. Continue shown only if the stored id is a readable page that still exists.
- Start unchanged: first readable page (Language Muscle opens its Introduction group page).
- Groups with own text keep a link to their page. Empty groups skipped. App Guide group not numbered.
- Counts say "entries"; "N of M read" uses sidebar `chapterProgress`.
- Not carried over: per-entry reading times and Linguistics answer years (no real data in the book model); Linguistics second accent colour (band uses the single accent, darkened); desktop-frame scaling; Opus B's mock notices; feature cards.
- Demo: Linguistics defaults to opus-colour-band (provisional); other books classic. `?frontpage=<key|classic>`, corner select, popstate sync, bad value → configured default. Book JSON untouched; proposed Linguistics title not used.

## Files
New: `packages/reader-core/src/original/frontpage/{frontpage-layouts.ts,frontpage-model.ts,frontpage-copy.ts,FrontPage.tsx,layouts.tsx,frontpage.css,test-frontpage.mjs,test-frontpage-browser.mjs}`; this folder.
Changed: `Home.tsx` (classic kept as `ClassicHome`), `types.ts`, `publication-navigation.ts`, `use-publication-reader.ts`, `ReaderLayout.tsx` (pass `readSections`, `lastSectionId`), `src/index.ts` (exports), `scripts/build-reader-styles.mjs`, `package.json` (test list), `apps/reader-demo/src/{App.tsx,main.tsx,index.css}`, `docs/configuration-publication-reader.md`.

## Checks
- `npm run build` (core strict tsc + styles + demo tsc + vite): exit 0; `dist/reader.css` contains the front-page rules.
- `npm test`: exit 0; new unit file 11/11 (keys, fallback, depth, tree, first/next/last valid, read count, titles, labels, real-book counts 9/253, 8/21, 4/12 and id order in every layout).
- Browser (`test-frontpage-browser.mjs`, bundled headless Chromium shell, built demo on 8773): 279 checks, 0 failures. 6 layouts × 3 books × 1440 and 390: no horizontal overflow, Full contents ids/order equal the book's readable tree, depth labels, Start destination, Colour band numbered rows and cover overlap, plus Continue, stale id ignored, filter + Escape keeps focus, Search opens the reader search, bad key fallback, unconfigured book classic, toolbar four controls unchanged.
- Native T3 browser opened the page but `preview_snapshot` timed out after 15 s; fell back to headless Chromium as instructed.
- Screenshots: `evidence/<layout>-<book>-<width>.jpg` (36).

## Limits
- Search from the front page opens the sidebar search; focus stays on the button, as on the classic home page (existing behaviour).
- The long Linguistics title crowds the toolbar (Notes is cut off at 1440); existing toolbar behaviour, not changed.
- Highlight/settings/sidebar flows were not re-walked beyond the toolbar-controls check; existing suites pass.
- Not checked: installed-consumer package (`verify:package`), dark mode visuals, React 19.

## Review owed
Independent review: the `lastSection` storage seam and the public `frontPageLayout` / `labels` config seam. Parent may run `npm run verify:package`.

## Ownership
All files above released. No Git, push, deploy or other agent used. Server on 8773 still serves the rebuilt `apps/reader-demo/dist`. No scratch left outside the repo.
