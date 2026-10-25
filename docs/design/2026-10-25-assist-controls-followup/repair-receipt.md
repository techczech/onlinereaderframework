---
title: Repair receipt for the verified review findings
register: FOR AGENTS
builder: Sonnet 5.5
date: 2026-10-25
status: ready-for-parent-closure
---

Scope: the five findings in `review-integration.md`. Review evidence files are unchanged; new evidence is `repair-*`.

## Fixes
1. **Line window and headings.** `ReadingSupportSurface.tsx`: one `READABLE` list (p, li, h1–h6, td, th, dt, dd, figcaption; skips pre/code/math/ignore and any block containing another readable block) used for geometry, pointer/focus targeting, keyboard list and marking. Headings are reachable and clear at Dark 1.0. Heading MathML untouched (probe compares `outerHTML`).
2. **Paragraph mode.** Same list: only the current block is clear; every other readable block (paragraph, heading, cell, item) carries 1 − dim once. Leaf-only rule means no nested parent/child multiplication (probe multiplies ancestor opacities).
3. **Margin notes.** `support.css`: `.reading-support-surface .publication-margin-note { z-index: 0 }` puts note cards in a layer under the shade (z 1). Overlay keeps `pointer-events: none`, so notes stay clickable; Notes drawer and stored bytes unchanged (probe still checks bytes).
4. **Tooltip.** `reader-original.css`: label starts at `top: 100%` with a transparent top border (no gap), `pointer-events: none` removed, so the label is part of the control (hoverable). `ReaderToolbar.tsx`: document Escape handler sets `data-tip-dismissed` on the actions bar when the pointer is over or focus is inside the bar and no menu is open; focus is not moved, nothing opens. `onPointerEnter`/`onFocus` on each control rearm. No native `title`. Existing menu Escape (return focus to opener) untouched.
5. **Layout gate.** `test-reader-layout-navigation-headless.mjs`: the 600 px assertion replaced by Normal ∈ [480, 600] at 1440, plus a measured order Narrow < Normal < Wide < Full, Normal equals the default column, Full ≤ the reading area width, and Share/Save inside the 320 px viewport.

## Layout finding (not a code defect)
The red 320 px overflow and the 520.5 px Normal width came from the test fixture serving no fonts: icon names (`bookmark_border`, `expand_more`, …) printed as wide text and Inter/Merriweather fell back. The fixture now serves the packaged `dist/fonts`; with real fonts Normal is 590.5 px and 320 px does not overflow, **with or without** any breadcrumb change (checked by mutation). I therefore made **no** breadcrumb change (a first attempt that hid the Share/Save text on narrow columns was reverted: no defect to fix). The old ≥600 assertion was outdated rather than the column too narrow; I replaced it, not relaxed it to green. When the overflow was introduced is unknown and not claimed.

## Red → green
- `repair-before.log`, `repair-results-before.json`: exact review probe extended (`repair-probe.mjs`, counts failures, exit 1 on any), run on the unfixed tree: 12 FAIL. Three assertions of the tooltip and table-cell checks were corrected afterwards (test bugs: slice length, loop range, same-control wiggle), so the before-run used the first revision.
- `repair-after.log`, `repair-results-after.json`, `repair-after-window.png`: 49 checks, 0 failed, exit 0.
- Mutation checks: READABLE narrowed back to `p, li` fails the new reading-support assertions; removing the Escape dismissal fails two tooltip assertions; 34rem label hiding made no difference to the layout gate.
- Regressions added: `test-reading-support-browser.mjs` (headings/cells fade, heading/cell current, window clear over them at Dark), `test-toolbar-repair-browser.mjs` (no dead zone, Escape with hover and with focus, focus kept, no menu, rearm, no title), layout test above.

## Commands and exits (cwd = repo root)
- `npm run build` 0 (`repair-build-after.log`); `npm test` 0 (`repair-unit-after.log`).
- `REPAIR_LABEL=after node docs/design/2026-10-25-assist-controls-followup/repair-probe.mjs` 0.
- Browser gates, all exit 0 (`repair-browser-gates-after.log`): layout navigation headless; reading-support; assist-width; toolbar repair (30/30); toolbar recorded; original reader browser and headless; navigation fixture.
- Layout gate output: `repair-layout-after.log` (exit 0).

## Limits
- Native T3 preview not tried again; bundled headless Chromium only; no audible speech. Real-book 390 px check at port 8773 passes in the probe against the rebuilt dist.
- Headless Chromium's `:hover` did not match on the bar although the CSS hover rule applied, so dismissal tracks pointer enter/leave in React rather than `:hover`.
- Escape while focus sits in the reading text with assistance on still turns assistance off first (existing behaviour); the tooltip Escape applies when focus is in the toolbar or the pointer is over it with focus elsewhere.
- Not re-run: the full React matrix, the front-page installed matrix.

Ownership released; no Git, push or deploy; no other agents; scratch dirs removed.
