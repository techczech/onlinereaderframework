---
title: Reading assistance and formatting menus for the book reader
register: FOR DOMINIK
date: 2026-10-25
status: design-suggestion
reviewed_code: 6ce09ff
author: Claude Opus 5.5 design consultation
sketch: visual-preferences-options-2026-10-25.html (rendered from copy-visual-preferences-2026-10-25.md)
evidence: evidence/
---

**No action needed.** This is a design consultation on the shared book reader (Linguistics, Deliberate Practice, Language Muscle). It covers only the look of the controls and how the reading settings are grouped. No production code was changed. The book title and the new Medium and Metaphor Hacker material are being handled separately.

## What is wrong with the settings today

The current settings window works, but it piles two generations of settings into one long dialogue, with duplicates and conflicts. Source: commit `6ce09ff`.

1. **One centred window holds everything.** `Reading settings` opens a modal dialogue (`ReaderLayout.tsx:99`, `:108-135`) that covers the text. You cannot see what a change does until you close it. The reading-support block inside it (`ReadingSupportControls.tsx`) uses raw number boxes such as "0.35 (0.1–0.6)" for dimming and "1.7 times text size" for line height (`ReadingSupportControls.tsx:20-29`). Those numbers suit a developer, not a reader.
2. **There are two rulers.** The original Deliberate Practice ruler (key R) darkens the whole screen, sidebar included (`ReaderLayout.tsx:52`, `use-publication-reader.ts:50`, `:312`). The new reading overlay offers a line window and a ruler inside the text only (`ReadingSupportControls.tsx:27`). Key R, the shortcuts list (`ShortcutsModal.tsx:18`, `:23-24`) and the settings window each mean a different ruler.
3. **There are two text-size and two line-height systems.** The old ones (`use-publication-reader.ts:37-38`, sm–xl and tight–loose) have no control left in the interface but are still saved and still reset. The new ones (16–28 px and 1.2–2.4) control the body text (`support.css:14-18`). The old size still scales headings through the prose classes (`MarkdownRenderer.tsx:170-190`).
4. **"Focus" means three things.** "Focus mode hides navigation" (`ReaderLayout.tsx:126`, key F), "Paragraph focus" and the "Reading focus" group all appear in the same window.
5. **There are two Listen buttons, and one promises a recording that does not exist.** The toolbar's Listen opens the recorded-audiobook panel, which says "No recording for this book yet" in all three books (`ListeningPanel.tsx:62`). A second button above every chapter starts the browser voice (`MarkdownRenderer.tsx:197`).
6. **Notes has no icon** (`ReaderLayout.tsx:105`), while Contents, Reading settings and Listen do.

The original guides had the sleeker look you remember: rounded icon buttons in a floating bar (`deliberate-practice-guide/App.tsx:827-889`) and lucide icons with short labels in Language Muscle's header (`building-your-language-muscle/App.tsx:855-915`). But the Deliberate Practice settings were an icon grid with 9-pixel labels and one-click cycling ("Read Your Way", `components/Sidebar.tsx:392-540`). There you could not see the current value or go back one step.

## Recommendation: A, two labelled menus in the toolbar

Keep the toolbar you approved last round. Replace the settings window with two menus, each with an icon and a label: **Reading assistance** (glasses icon) and **Formatting** (Tt icon). Notes gets its highlighter icon. Each menu opens below its button and closes when you click the text. It covers the right edge of the text, not the line you are reading, so a change shows at once.

**Reading assistance**
- *Listen:* Read aloud, the browser voice, with Start, Pause and Resume (key A). A recorded audiobook appears here only when a book has recordings; today none does, so it is not shown. While the voice reads, a small player with Pause and Stop sits in the toolbar. That replaces the button above each chapter.
- *Focus:* Paragraph focus as an on/off switch. Reading overlay as a three-way choice: Off, Line window or Ruler (key R). Window height (1, 3 or 5 lines) appears only for the line window. Dimming (Light, Medium or Dark) appears only when an overlay is on. One sentence explains following, the Up and Down keys and Escape.
- *Page:* Hide navigation (key F), the old "Focus mode" under a literal name.
- *Footer:* Turn all off, and Keyboard shortcuts (?).

**Formatting**
- Theme: Book paper or Dark. Book paper is each book's own paper colour.
- Typeface: Serif or Sans, each label set in its own face.
- Text size, Line spacing, Paragraph spacing and Letter spacing as minus/plus steppers that show the current value (20 px, 1.7, 16 px, Normal).
- Text width: Narrow, Normal, Wide or Full.
- *Footer:* Reset formatting (back to this book's defaults), and a line saying the settings are saved for this book on this device.

**State you can see.** Each menu button shows a number when any of its settings differs from the default, for example "Reading assistance 2". Pressed and selected states use the book's accent colour, so the menus belong to the book they are in.

**Phone.** The toolbar keeps Contents, the title, and Assist, Format and Notes as icons with short words underneath. Either menu rises from the bottom of the screen. A switch at the top of that panel moves between Reading assistance and Formatting, and a tap outside closes it.

**Keyboard.** Menu buttons say whether they open a dialogue and whether it is open. Opening moves focus into the menu; Tab stays inside; Escape closes the menu and returns focus to its button. This is ReadFlex's popover behaviour (`readflex/.../reading-controls-popover.tsx:40-80`). Choice rows are real radio groups, so the arrow keys work. Toggles are switches. Single-letter shortcuts are ignored inside the menus, because the reader already skips `[role="dialog"]` (`use-publication-reader.ts:294`).

**Why A.** It answers the request directly: two menus, clearly divided, with icons and words. It changes only the toolbar and the settings window, so the improved sidebar, topic toggles, focus after choosing a chapter, scrolling, notes and listening panel stay as they are. The look takes the originals' rounded pill buttons, outlined icons and soft surfaces, and keeps the current books' paper colours, serif text, accents, mastheads and covers. Desktop text width does not change, because the menus float over the page rather than pushing it aside.

## The other two arrangements

- **B, one panel with two tabs.** One Reading settings button opens a panel on the right with Reading assistance and Formatting tabs. Listen keeps its own button. The panel stays open while you read. It costs a second click to reach the other tab. On a laptop it covers the "On this page" column, and it feels most like a settings window.
- **C, a floating bar as in the original guide.** The toolbar goes. A rounded bar floats at the top right of the text with Listen, Assist, Format and Notes. On a phone the same controls and Contents sit in a bar at the bottom of the screen. It is the sleekest and the nearest to Deliberate Practice. But it sits over the top of the text, shows the title only in the sidebar, and changes the layout you approved most.

## Source patterns reused

- **Icons:** Material Symbols, already loaded by the reader (`reader-original.css:7`), with the names the original guide used: `horizontal_rule` (ruler), `fullscreen`, `contrast`/`dark_mode`, `format_size`, `format_line_spacing`, `settings_overscan` (width), `ink_highlighter` (notes), `keyboard`, `volume_up` (`deliberate-practice-guide/components/Sidebar.tsx:398-540`). New names: `eyeglasses` (Reading assistance), `text_fields` (Formatting), `record_voice_over` (read aloud), `view_day` (line window), `restart_alt` (reset). The builder should confirm each name exists in the loaded font version. The sketch draws stand-ins because it may not load fonts.
- **Popover, steppers and reset:** ReadFlex `reading-controls-popover.tsx` (Stepper, pressed choice groups, "Back to defaults", Escape, focus return and Tab containment).
- **Overlay rules and names:** WriteFlex `line-overlay.ts:23,49-55`. Its Light, Medium and Dark dimming replaces the 0.1–0.6 number. Line window and ruler are mutually exclusive, already enforced by the single `overlay` value (`reading-preferences.ts`). The separation between readability modes and overlays follows `focus-picker-model.ts`.
- **Floating rounded bar (option C):** `deliberate-practice-guide/App.tsx:827-889`.
- **Labelled header buttons with icons:** `building-your-language-muscle/App.tsx:870-915`.

## Implementation boundaries for a builder

- **Change only:** `ReaderLayout.tsx` (toolbar, two menus replacing the `<dialog>`, Notes icon, the read-aloud player); `ReadingSupportControls.tsx` (split into two control groups that reuse `useReadingSupport`, steppers and choice groups instead of number boxes); `use-publication-reader.ts` (retire the full-screen ruler and point key R at the reading overlay; keep the old size and line height at their defaults and remove them from reset); `MarkdownRenderer.tsx` (remove the in-chapter read-aloud button; report speaking state to the toolbar player); `PublicationReader.tsx` (show Recorded audiobook only when `audio` has tracks for the book); `ShortcutsModal.tsx` (remove "1-4" and "Arrows move ruler", rename F to "Hide navigation"); the reader CSS.
- **Do not change:** the sidebar and its behaviour, chapter focus and scrolling, notes and highlights, the listening panel's controller, book identities, mastheads, covers or desktop text width.
- **No schema or public API decision is needed.** Saved settings keep their keys. The Light, Medium and Dark dimming map to existing values (0.2, 0.35, 0.5) inside the current bounds. The menu wording can live in the reader. Whether books may relabel the menus, as `labels.readingSettings` does today, can wait.
- **Checks:** each menu opens, closes with Escape and returns focus; key R toggles the in-text overlay and nothing darkens the sidebar; no second Listen button; Recorded audiobook absent in all three books; badges count non-default settings; reset restores each book's defaults; the desktop text column measures as before; topic toggles and keyboard reading after choosing a chapter still work.

## Choices that are yours

1. **A, B or C.** I recommend A.
2. **Menu names.** "Reading assistance" and "Formatting" as you wrote them, or the shorter "Reading aids" and "Text and page".
3. **Theme.** Two choices (Book paper, Dark), or add ReadFlex's Sepia as a third. The books' own papers are already warm, so I would not add it.
4. **Download eBook** leaves the settings window and stays on each book's home page. Say if you also want it in a menu.

## Verification and limits

- The sketch was checked in the bundled Playwright headless shell (not installed Chrome) with a self-test script: 21 of 21 interaction checks passed at 1,280 px. These were menu opening and closing, focus moving in and returning, the overlay and paragraph focus, badges, text size, theme, reset, the phone sheet and its switch, the read-aloud player, B's panel, C's bar, switching books and keeping state across a book switch. At 390 px, 19 of 21 passed. The two that failed are focus checks on the desktop frame, which is hidden at that width behind the Desktop/Phone switch, so it cannot take focus. That is expected. Page height is 1,456 px at 1,280 px wide and 1,871 px at 390 px. Screenshots and the probe are in `evidence/`.
- The native T3 browser was unavailable: other sessions' tabs filled the tab limit. T3's headless preview could not load local scripts or reach localhost, so it could not run this page.
- The sketch uses system fonts (Georgia for Merriweather, system-ui for Inter) and hand-drawn icons in place of Material Symbols. It was not run inside the real reader or on a real phone. Nothing in it plays sound.
- Also seen, outside this brief: the "Key Lessons & Reflections" prompt renders its body text in the accent colour at article size (`evidence` from last round, `screenshot-linguistics-1440-after-chapter-keyboard-reading.png`). It reads as an error state.

## Files

- Sketch: `visual-preferences-options-2026-10-25.html`, generated by `render-visual-preferences.mjs` from `copy-visual-preferences-2026-10-25.md` (all wording), `excerpts-books-visual-preferences-2026-10-25.json` (real chapter text, titles, colours and small covers from the current books), `icons-visual-preferences.svg`, `style-visual-preferences.css` and `behaviour-visual-preferences.js`. One arrangement per tab, with desktop and phone frames side by side on wide screens and a Desktop/Phone switch on narrow ones.
- Evidence: `evidence/` holds four screenshots and the self-test probe with its runner.

## Raw model recommendation (verbatim)

> Recommend A: two labelled toolbar menus, Reading assistance and Formatting, opening as anchored popovers on desktop and as one bottom sheet with a two-way switch on phones. Reading assistance = Listen (browser read-aloud; recorded audiobook only when tracks exist), Focus (paragraph focus switch; overlay Off/Line window/Ruler; window height and Light/Medium/Dark dimming shown only when relevant), Page (Hide navigation). Formatting = Theme (Book paper/Dark), Typeface, steppers for size, line, paragraph and letter spacing, Text width. Retire the full-screen ruler, the legacy size/line-height state, the in-chapter read-aloud button and the always-empty recorded-audiobook panel; badge each menu with its count of non-default settings; keep the sidebar, focus, scroll, notes and listening behaviour untouched. Styling: original guides' rounded pill buttons and outlined Material Symbols on each book's paper and accent.
