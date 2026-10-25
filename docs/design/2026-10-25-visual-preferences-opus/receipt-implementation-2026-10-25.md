---
title: Implementation receipt, Listen / Formatting / Assist / Notes toolbar
register: FOR AGENTS
date: 2026-10-25
builder: Sonnet 5.5 (medium)
base: 6ce09ff (working tree, uncommitted)
decision: Opus option A, with Listen as its own fourth control (Dominik 2026-10-25)
---

## Built
- Toolbar: four separate icon+label controls in order Listen, Formatting, Assist, Notes (`toolbar/ReaderToolbar.tsx`). Desktop: non-modal popovers under the actions, right-aligned. <640px: bottom sheet with a Listen/Formatting/Assist switch and close; toolbar becomes Contents + title row, then four equal controls.
- Icons: Material Symbols (already loaded) `headphones`, `text_fields`, `eyeglasses`, `ink_highlighter`. Lucide is not a dependency of this repo, so none was added.
- Formatting: theme (Book paper/Dark), typeface, size/line/paragraph/letter steppers, text width, Reset formatting. Badge = count differing from defaults (default theme = system preference, as before).
- Assist: paragraph focus switch, overlay Off/Line window/Ruler, window height only for line window, Light/Medium/Dark dimming (0.2/0.35/0.5) only when an overlay is on, Hide navigation, plain state sentence, Turn all off, Keyboard shortcuts. No audio control. Saved custom dimming between levels is shown as custom, not rewritten.
- Listen: browser read-aloud (Start/Pause/Resume/Stop, key A) always offered; "Recorded audiobook / Open player" only when `audio` has at least one track with a usable source. Player is not mounted otherwise. Toolbar chip (Reading aloud + pause/stop) while the browser voice runs. Existing mutual exclusion, alignment, resume untouched.
- One text model: `ReadingSupportPreferences` plus reader `maxWidth` and `darkMode`. Legacy `fontSize`/`lineHeight` state, cycle helpers, reset, and the `prose-*`/`leading-*` switch in `MarkdownRenderer` removed; prose scale is fixed (`prose-lg`). Old saved `fontSize`/`lineHeight` keys are left in storage and ignored. Notes, highlights and other keys are never written by resets.
- Key R now toggles the in-text overlay (last used mode, default line window). Full-screen ruler, `1-4`/arrow ruler keys and their shortcut rows removed. F = Hide navigation.
- Removed: settings `<dialog>`, in-chapter read-aloud button, `readingSettingsExtra`/`onListen`/`onResetReadingSupport` layout props (internal; `ReaderLayout` is not exported). `ReadingSupportControls` (public export) left unchanged and unused by the reader.
- `types.ts` untouched; `labels.readingSettings` is now unused, `labels.listen` still labels Listen.

## Files
Edited: `ReaderLayout.tsx`, `PublicationReader.tsx`, `use-publication-reader.ts`, `MarkdownRenderer.tsx`, `ShortcutsModal.tsx`, `reader-original.css` (settings dialog CSS replaced), `test-reader-layout-navigation-headless.mjs`, root `package.json` (one test file added to `npm test`).
New: `toolbar/{ReaderToolbar.tsx,controls.tsx,toolbar-model.ts,test-toolbar-model.mjs,test-toolbar-recorded-browser.mjs}`, `scripts/check-reader-toolbar.py`, `evidence-implementation/`.
Not touched: Home.tsx, frontpage designs, Sidebar, listening controller/panel, notes, build scripts, dependencies, public API/schema.

## Commands and exits (all run from the repo root)
| Command | Exit |
|---|---|
| `npx tsc --noEmit -p packages/reader-core` | 0, no output |
| `node --test …/toolbar/test-toolbar-model.mjs` | 0 (5 tests) |
| `node …/test-reader-layout-navigation-headless.mjs` | 0 |
| `node …/toolbar/test-toolbar-recorded-browser.mjs` | 0 (11/11) |
| `node …/reading-support/test-reading-support-browser.mjs` | 0 |
| `../book-engine/.venv/bin/python scripts/check-reader-toolbar.py` | 0, 241/241 (3 real books × 1440 and 390 px) |
| `../book-engine/.venv/bin/python scripts/check-reader-sidebar-scroll.py <tmp>` | 0, 45 checks, 0 failed |
| `npm test` (full unit suite, once) | 0 (23 + 45 passing) |
| `npm run build` | 0 |

## Browser
Native T3 browser: `preview_status` showed no tab; `preview_open` failed twice ("Too many server browser tabs"). Fallback: bundled headless Chromium shell only, against server 8773 (rebuilt `apps/reader-demo/dist`). Browser speech is a stub in these runs (headless has no voice); recordings use a synthetic WAV.

## Bugs found by the browser pass and fixed
- Tab wrap counted roving radios (`tabindex=-1`), so Tab left the menu.
- Floating Highlight tooltip (z 60) sat over the mobile sheet (z 56) when text was selected; menus now z 65.
- Switch inherited toolbar button padding/hover styles; selectors raised.
- Phone toolbar: title/Contents rule was overridden by a more specific rule; fixed in the <640px block.

## Limits
- `scripts/check-reader-corrections.py` (24 Oct) still targets the removed settings dialog and empty recorded panel; it is superseded by the checks above and was not edited, to avoid rewriting its 24 Oct evidence.
- Recorded-playback status is not mirrored in the toolbar (only the browser voice has the chip); the player's own panel shows it. Mirroring needs a new `ListeningPanel` prop (public API), so it was not done.
- Menu focus order was checked with Tab and Escape, not with a screen reader. Real voices, real phone and iOS Safari not tested. Desktop text-column CSS was not changed; its width was not re-measured on the real books beyond the fixture (700.75 px at 1440).
- Matrix/package/React-compat checks not rerun (seam unchanged).

## Evidence
`evidence-implementation/`: screenshots per book at 1440 and 390 (toolbar, Listen, Formatting, Assist open, sheet switch) and `evidence-toolbar-real-books.json`.
