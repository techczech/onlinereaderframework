---
title: Receipt for the nested own-text correction
register: FOR AGENTS
builder: Sonnet 5.5
date: 2026-10-25
status: ready-for-parent-verification
---

## Root cause
`paragraphs()` in `ReadingSupportSurface.tsx` rejected every readable element containing another (`!el.querySelector(READABLE)`), so a parent's own text (lead before a nested block, tail after it) was never marked, dimmed, measured or targeted. Same filter fed dimming, window geometry, pointer/keyboard targeting.

## Fix (no DOM/markup change, no public API, no dependency)
- `line-geometry.ts`: `ownContent(block, readable, ignore)` returns runs of the block's own nodes (direct text, inline elements without readable blocks); a nested readable block ends a run. `visualLines(block, origin, only?)` measures only given nodes (Range per node).
- `ReadingSupportSurface.tsx`: reading units = leaf blocks or own-text runs of containers, sorted in document order (lead, nested blocks, tail). Window, pointer (nearest run by y), keyboard and neighbours use units. Containers carry `data-rs-paragraph data-rs-owner`; the container itself gets no opacity.
- Single dimming: leaf blocks keep opacity on the element. Own inline elements (`data-rs-own`) take the same opacity (no readable descendants, so never multiplied). Bare own text nodes cannot take opacity without wrapping, so a Range per node goes into `CSS.highlights` entry `rs-dim`, styled `color-mix(currentColor, (1 - dim))` in `support.css`. No highlight API: bare text stays undimmed (limit).
- `READABLE` gained `blockquote` (direct quote text was unreachable). A blockquote with only paragraphs has no own text and adds no stop.
- `support.css`: opacity rule excludes `[data-rs-owner]`; adds `[data-rs-own]` and `::highlight(rs-dim)`.

## Evidence (this folder)
- Closure probe, unchanged `review-closure-probe.mjs`: before fix 29/31 (recorded in `closure-assist.log`); after: `fix-closure-probe.log` run1 exit 1, 30/31 (flaky tooltip focus-rearm check, results kept in `fix-run1-results.json`), runs 2 and 3 exit 0 31/31; again after final geometry change `fix2-closure-probe-run1/2.log` exit 0 31/31; final `fix-final-closure-probe.log` exit 0 31/31.
- New regression `probe-nested-own-text.mjs` (63 assertions: Paragraph × Light/Medium/Dark × 15 units, nested ul lead/tail text, inline lead/tail, blockquote, table cell, parent and child independently readable, keyboard order, Line window Dark clear/shaded per unit, markup/node/text/MathML/selection preservation). Green: `fix-nested-own-green.log` / `fix-nested-own-green-results.json` exit 0, 63/63. Red with the container branch reverted: `fix-nested-own-red.log` / `fix-nested-own-red-results.json` exit 1, 7 pass, 56 fail. Source restored byte-identical after.
- Focused gates exit 0: `fix-final-test-reading-support-browser.log`, `fix-final-test-assist-width-browser.log` (38/38), `fix-final-test-reading-preferences.log`, `fix-final-test-reader-layout-navigation-headless.log`. Typecheck `fix2-typecheck.log` 0. `npm run build` 0 (`fix-build.log`, `fix2-build.log`, `fix3-build.log`; dist current).

## Disclosure
The unchanged closure probe writes `closure-assist-results.json`, `closure-assist-window.png`, `closure-nested-paragraph.png`, `closure-nested-window.png` with fixed names. My first runs overwrote the reviewer's failing copies of those four files; they now hold passing-run output. The reviewer's failing run survives in `closure-assist.log` and the review text. Fixture selectors for the new probe insert ids by DOM (sanitiser strips ids), as the closure probe does.

## Limits
- Without the CSS Custom Highlight API (older browsers), bare lead/tail text of a parent is reachable and measured but not dimmed in Paragraph.
- Highlights colour text only; a parent's own inline backgrounds/borders on bare text are not dimmed (none in the fixture).
- Not run: full unit/React/front-page matrices, package verification. No audible speech. No Git, push, deploy. Port 8773 process untouched.
