---
title: Repair receipt, four review findings on the configurable front pages
date: 2026-10-25
register: FOR AGENTS
status: repaired, awaiting diff-only closure by parent
review: ../review-frontpages-2026-10-25.md
---

## Fixes
1. **homeDepth.** `frontpage-model.ts`: a branch with no own page whose capped entries hold nothing readable now lists the nearest readable pages under its structural headings (`liftedReadable`). Reading pages are not entered, so the cap still limits nesting everywhere else. Zero still hides; explicit config never rewritten. Docs sentence added in `docs/configuration-publication-reader.md`. Demo-only `?homedepth=<int>` added in `apps/reader-demo/src/App.tsx` for probing.
2. **Notes.** `toolbar/ReaderToolbar.tsx`: Notes button no longer conditional on `isHome`. Drawer is independent of the page; stored highlights/reflections untouched. Read-aloud stays disabled on home.
3. **Search focus.** `Sidebar.tsx`: request focus retries on animation frames (max 30) with `preventScroll`, selects the field, stops if focus moved to another editable field or into a dialog, and calls new `onSearchFocusHandled` so the next press is a fresh request; `ReaderLayout.tsx` resets `isSearchTriggered` through it. Cause of the first-frame refusal not isolated; retry-until-focusable is the fix.
4. **Dark cards.** `frontpage.css`: new tokens `--pf-raised`, `--pf-field`; light values identical to before; `.publication-reader.dark .publication-front` moves them toward the ink colour and strengthens `--pf-line`.

## Red then green
- `test-frontpage.mjs` new test "explicit depth cap never removes a structural topic…" failed (depth 1 lost Group topic and Deep topic), now passes; one existing test updated for the now-listed "Nothing here" topic (total 3+1+1+1).
- `toolbar/test-toolbar-model.mjs` new Notes test failed, now passes.
- Browser: `probe-repair.py before|after` (results in `results-before.json`, `results-after.json`; `summarise.py <label>`).

| Probe | Before | After |
|---|---|---|
| Notes control on front page, 6 layouts x 3 books x 1440/390 | 0/36 present | 36/36 present, all inside viewport |
| Notes opens drawer on front page with seeded highlight + reflection | not reachable | both shown, stored values byte-identical, still on front page |
| Enter on Search then typing "mus", 6 layouts x 2 books x 1440/390 | 24/24 failed, focus on button | 24/24 input focused, value "mus", no scroll change |
| Dark views below 4.5:1 (3 books x 6 layouts x 2 widths, 36 dark views) | 24 | 0 |
| Linguistics dark search-map entry text, computed | rgb(229,231,235) on tile, 3.78:1 | same text on rgb(32,38,53), 12.20:1 |
| Show all, computed | review 2.01:1 | rgb(216,156,140) on rgb(32,38,53), 6.51:1 |
| Group count, dark | 2.62:1 (Language Muscle) | 6.40:1 |
| Filter input, dark | 4.45:1 | no view below 4.5 |
| Focus outline on cards, 2px solid | not measured | 5.71 to 6.51:1 dark, 5.03 to 6.37:1 light |
| homeDepth 1 on Linguistics, Full contents | review: only "meaningful1 entry" in the installed consumer | 9 groups, 253 entries (same as depth 2); depth 0 hides the list |

Depth "before" in the browser is the review's evidence (`evidence-review/installed-browser-results.json`) plus the red unit test; the old build had no `?homedepth`.

## Checks (final, once)
- `npm run build`: exit 0 (`build.log`).
- `npm test`: exit 0 (`test.log`); 23 + 58 + 5 test files' tests pass, 0 fail.
- `test-frontpage-browser.mjs`: 279 checks, 0 failures (builder's matrix, run once as a regression guard).

## Limits
- Light-theme observations left alone to keep the light identity: Group count 4.33:1 (Language Muscle, five layouts) and Search button 4.38:1 on Linguistics search-map, both just under 4.5 and present before.
- Search focus verified in headless Chromium only; no real-device keyboard, no React 19, no screen-reader pass; dialog/note-typing guard is by code reading plus the retry logic, not a dedicated browser test.
- Native T3 browser not used (review reported snapshot timeouts).
- Package matrix and saved-state isolation not repeated; `verify:package` not rerun (parent may).
- Dark topic cards: fixed tokens rather than a new palette; the pf-band in dark was inside the 4.5 sweep and passed.

## Ownership
Released: all files above plus `apps/reader-demo/dist` (rebuilt, served on 8773, left running). Scratch removed (/tmp debug scripts). No Git, push or deploy; original review, design prototypes, book data and manuscripts untouched.
