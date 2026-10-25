# Contents clarity and Assist icons (2026-10-25)

FOR DOMINIK. Checkpoint c8f4e83 plus uncommitted edits; no Git, push or deploy.

## Changed
- Assist menu: Off, Paragraph, Line window and Ruler now carry Material Symbols icons (block, view_headline, crop_landscape, straighten) and stack one per row like the Theme choice. Radio semantics, selected state and labels are unchanged; no native title attributes. Toolbar-model Assist choices gained an `icon` field. Files: `toolbar/toolbar-model.ts`, `toolbar/ReaderToolbar.tsx`.
- Front-page chapter rows (all six layouts): each chapter is a bordered, raised card, fully clickable, with accent border on hover and focus ring. Chapters flow in a row-first grid (`auto-fill`, 15rem minimum), replacing CSS columns, so reading order is left to right then down and matches book source order. One column at 390 px. Read tick sits at the right of the first row; "Last opened" is a badge above the title; the title never overlaps. Files: `frontpage/frontpage.css`.
- Visible count noun: "entries/entry" is now "chapters/chapter" (group counts, total, filter status, "Show all N chapters", group toggle label). Files: `frontpage/layouts.tsx`, `frontpage/frontpage-copy.ts`. Book JSON, URLs and titles untouched.
- Existing gate `frontpage/test-frontpage-browser.mjs`: toolbar expectation updated to include the theme button added in c8f4e83 (stale, unrelated to this change).

## Real book structure (from the built page, Opus C, default open)
Linguistics: 9 topics, 253 chapters in total (32, 37, 24 under the first three). Deliberate Practice: 21 flat chapters under 8 display headings. Language Muscle: 12 chapters in nested groups plus standalone pages (4, 4, 3 in the first groups). Counts equal the earlier mechanical counts; only the word changed.

## Commands and results
- `node --test` frontpage and toolbar-model tests: 21 pass (`unit-final.log`).
- `npm run build` (core + demo with tsc): exit 0 (`build-final.log`).
- `test-frontpage-browser.mjs` (6 layouts x 3 books x 1440/390): 279 checks, 0 failures (`gate-frontpage-browser.log`). First run failed only on the stale toolbar assertion.
- `probe-contents-clarity.py` -> `results.json`, `probe-run.log`: per page, chapter buttons, title/badge overlap 0, clipped titles 0, horizontal overflow false, "entry/entries" present only in before pages. Light and dark.
- `probe-assist-icons.py` -> `assist-run.log`: four radios, four icons, zero titles, Ruler checked.
- Native T3 preview snapshot timed out twice; bundled headless Chromium shell used (not system Chrome). No speech.

## Screenshots (`screenshots/`, real built pages)
`main-{before,after}-{book}-opus-colour-band-{1280,390}-light.png` for all three books; `layouts-after-*` for all six layouts at 1280; `dark-after-*`; `assist-after-{1280,390}.png`. Before pages were built from HEAD into a scratch folder, since removed.

## Serving
Existing 8773 servers (127.0.0.1 and 100.85.55.122) serve the rebuilt `apps/reader-demo/dist`. Open `?book=linguistics|deliberate-practice|language-muscle&frontpage=<layout>`.
