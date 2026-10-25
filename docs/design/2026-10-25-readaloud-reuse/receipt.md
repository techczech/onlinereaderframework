---
title: Read-aloud repair, ruler, dimming, width and small-screen scale
date: 2026-10-25
register: for-dominik
status: built, verified in headless Chromium; independent review of the new player seam owed
---

No action needed. This receipt records what was wrong, what changed and what was checked for the online reader's read-aloud, reading-assist and small-screen repair. **Read-aloud now reuses ReadFlex's speech player instead of the single whole-chapter utterance; the assist and sizing defects you annotated are fixed.** The source map is in `source-map.md`; screenshots and measurements are in `evidence/`.

## Root causes found

- **Read-aloud.** `MarkdownRenderer` spoke the whole chapter as one utterance with a hard-coded "prefer Google" voice rule. One utterance gives no sentence boundary to skip to or highlight; there was no voice choice, speed, highlight or skip. The Listen popover stayed open over the text because Start never closed it.
- **Ruler.** It was a 3 px line positioned from the active paragraph's CSS line height, so it covered nothing and drifted on paragraphs with maths or mixed type.
- **Dark dimming.** Dark was 0.5 black over the page (0.6 was the ceiling); WriteFlex's own levels are 0.5, 0.72 and 0.9.
- **Width.** Measured at 1280 px with the sidebar open, Wide and Full were both 952 px; Normal was 795 px and Narrow 590 px. The measure is in `ch` of an 18 px layout font and Wide (86ch) exceeded the room, so it collapsed into Full.
- **Air versus Pro.** Computed sizes were the same at every window width (article 20 px, heading 53 px, controls 13 px with 40 px buttons), and they did not change with the article's own text size, so the interface was not inheriting the article. The Air has fewer CSS pixels, so fixed sizes read as large. Browser zoom and display scaling are already in CSS pixels and were not the cause; the screenshot images are 2x.
- A pre-existing fault in the overlay: a resize or annotation re-measure reset the reading line to the first line of the paragraph.

## What changed

- **Read-aloud** (`original/read-aloud/`): the vendored ReadFlex player over the reader's canonical publication text. Voice picker from the voices the browser really lists (language and "system default", matching voices first, loaded on `voiceschanged` and re-read later because Chromium returns none at first), per-book saved voice and speed, speed select, Start/Pause/Resume/Stop, previous and next sentence and paragraph, "keep the sentence in view" switch. Start closes the menu and docks a compact transport between the toolbar and the text; the Voice and speed button reopens the menu and Escape returns focus to it. Problems (no engine, engine error, engine blocked, another page cancelling, no sign of life after six seconds) show a plain message and Try again in the dock, never a standing "Reading".
- **Highlight:** sentence from the player's source range, word only after the engine reports a real boundary. Painted with the CSS Highlight API through a `Range` over the canonical text (crosses emphasis, links, table cells and MathML; no node is inserted or rewritten). Annotation offsets, search and quotes use the same text model and are unchanged. Without the Highlight API the paragraph is marked instead.
- **Ownership:** an idle controller never cancels shared speech; a speaking one cancels on chapter change and unmount; stale `end`, `boundary` and `error` from a cancelled utterance are dropped. Starting browser speech still pauses the recording and the recording still cancels browser speech.
- **Ruler:** covers 1, 2 or 3 measured visual lines beneath the current line (default 1), using WriteFlex's `tileLines`/`rulerShape`; lines are measured from rendered text rectangles for the active paragraph and its neighbours, so it continues into the next paragraph. The line window uses the same measured lines.
- **Dimming:** Light 0.5, Medium 0.72, Dark 0.9 in WriteFlex's shade colours (cool dark on paper, black on a dark page). First-release saved values 0.2, 0.35 and 0.5 were the named Light, Medium and Dark; they migrate once to the new levels. Any other saved value, such as the 0.6 ceiling, is kept as a custom value. Other preferences are preserved.
- **Badges:** the numbered change bubbles are gone from Formatting and Assist, and the button names carry no count. Assist keeps its active highlight while an assist is on.
- **Formatting menu:** Reset formatting and the "saved" line are now first. Keyboard containment after Reset disables itself is unchanged and tested.
- **Width:** Narrow 44ch (about 500 px), Normal 52ch (590 px, the old Narrow), Wide 64ch (about 727 px), Full the whole column. Wide and Full are the same only where the window has no more room (1024 px with the sidebar open). A saved choice moves to a new key; the old Narrow becomes Normal, so a reader who chose Narrow keeps the column they were reading; the old Normal, Wide and Full keep their names. Old Normal was the automatic default and cannot be told from a choice, so it takes the new Normal.
- **Small-screen scale:** interface type is its own scale and does not take the article's size, line height or letter spacing (tested with a 28 px, 2.4 line height article). Below 1440 px the toolbar, menus and transport are lighter (toolbar 65 to 50 px at 1280), the article heading eases (53 to 43.5 px at 1280, 38.7 at 1024), and the default text size eases to 19 px (1100 to 1439) and 18 px (below 1100). A text size you choose is honoured at every width, including 20. The 1440 px and wider look is unchanged. The demo-only front-page layout picker now shows only on the front page, smaller on small windows, and not on a phone. Front-page bands, titles and covers are lighter between 640 and 1180 px of container width; layouts are unchanged.

## Checked

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | passed (reader package then demo) |
| Unit suite | `npm test` | 23 + 79 + 5 tests, 0 failures |
| Read-aloud journeys, synthetic engine | `node packages/reader-core/src/original/read-aloud/test-read-aloud-browser.mjs` | 46/46 |
| Assist, width, scale | `node packages/reader-core/src/original/reading-support/test-assist-width-browser.mjs` | 37/37 |
| Toolbar repair and recorded-audio journeys (updated for the docked transport) | `node packages/reader-core/src/original/toolbar/test-toolbar-repair-browser.mjs`, `test-toolbar-recorded-browser.mjs` | 23/23, 11/11 |
| Front-page layouts, six layouts on three books at 1440 and 390 px, after the front-page CSS change | `node packages/reader-core/src/original/frontpage/test-frontpage-browser.mjs` | 279 checks, 0 failures |
| Installed package consumer | `npm run verify:package` | passed |
| Real engine, listing | `evidence/real-engine-smoke.py` | the bundled headless Chromium lists 0 voices at load and 184 after 1.5 s |
| Real engine, journey | `evidence/real-engine-journey.py` | Start, real word boundaries marked the words "difference", "surprised", "has"; skip, pause (engine reported paused), resume and stop behaved; stop cleared the highlight |

The synthetic tests label their voices "SYNTHETIC" and prove wiring and state. The real-engine journey spoke about 10 seconds of macOS system voice aloud on this machine in total (Ava Premium by default); I did not use any network voice and stopped each run.

Meaningful regressions added: Dark at 0.9 and the older-preset migration; ruler covering 1, 2 and 3 real lines (focus line never covered, continues across a paragraph); no badges; Reset first; four distinct widths at 1280 and 1440, the room limit at 1024, one column at 390; interface type unchanged under a large article; text size honoured; overlays leave the article markup, MathML and the reader's selection untouched.

## Screenshots (`evidence/before/`, `evidence/after/`)

Before and after at 1280x800, 1366x768, 1024x768, 390x844 and 1440x900: front page, a chapter at Normal width, the Formatting menu, the Assist menu with the ruler, ruler and line-window overlays. After also has the Listen menu and the docked transport with sentence and word highlight, with the synthetic engine. Measurements: `before-measurements.json`, `after-measurements.json` (column widths for the four choices with the sidebar open and closed, computed type sizes, toolbar heights).

## Limits

- `listening/test-reader-listening-headless.mjs` (the recorded-audio player in isolation, a module I did not change) hung with no CPU use for eight minutes and was stopped. Its unit tests pass inside `npm test` and the recorded-audio journeys in the toolbar suite pass. I did not diagnose the hang.
- The real engine was checked in the bundled headless Chromium only. Not checked: Safari, Firefox, iOS and any engine without word boundaries (it falls back to sentence highlight by design). Chrome pauses speech in a background tab on some platforms; no special handling.
- Skipping while paused resumes reading from the new place. This is the player's behaviour.
- A paragraph skip backwards starts the previous paragraph's first sentence; the vendored player's own backward skip lands on its last sentence (see the source map).
- The independent review for the new player integration seam (`read-aloud-controller.ts` guard, `MarkdownRenderer` hook) is owed and is for the parent to arrange.
- Not touched: front-page data, book data, manuscripts, ReadFlex, WriteFlex and their repositories.

## Couplings for the navigation-restoration follow-up

- The right-hand chapter outline (`.publication-local-contents`) is shown only when the reading container is at least 1000 px wide (`@container (min-width: 1000px)` in `reader-original.css`). With the sidebar open, a 1280 px window leaves a 1016 px container, so it appears only just; a 13-inch laptop below that never shows it. This predates my change, and I kept every rule for it. Whoever restores the outline should decide that threshold knowing the column is now narrower by default (Normal is 590 px), so the outline fits beside the text on more windows.
- `.publication-width-full:has(> .publication-local-contents)` keeps its `max-width: none`; the layout cap for the other three widths is the measure plus 18 rem when the outline is present.
- The reader's heading anchors, `TableOfContents` and its refs are unchanged. The toolbar now has a docked transport between the toolbar and the scroll area, so any element that measures from the top of the main column should use `.publication-scroll`, not the toolbar's bottom.
- The reader's `Escape` handler and the key `S`/`F` shortcuts are unchanged.
