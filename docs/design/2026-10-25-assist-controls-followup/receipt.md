# Receipt: icon-only toolbar, theme icon, unified assistance (2026-10-25)

Base: c777d44, uncommitted working tree. Builder: Sonnet 5.5. Independent review owed for preferences migration, theme and the reader-state integration.

## Root causes
- Toolbar text labels and the Formatting "Theme" control came from `ReaderToolbar.tsx` (labels in spans; `ChoiceGroup` "Book paper/Dark" bound to a per-book `darkMode` boolean seeded from the computer once, never followed).
- Paragraph focus was a separate pref (`focus`) beside `overlay`; both could be on.
- The shade covered only `[data-publication-content]`, so the reflection box, breadcrumbs and margins were never dimmed; geometry skipped headings, so a window next to a heading stretched over it.
- Dimming levels were .5/.72/.9 (WriteFlex), too weak by the reader's account.
- Navigation hiding was one in-memory boolean the reader had to set each time.

## Decisions
- Prefs: `overlay` is the one stored choice (`off|paragraph|line-window|ruler`); `focus` is kept as a derived mirror for older callers (patching `{focus}` alone maps to the overlay). Stored `focus:'paragraph'` + `overlay:'off'` → Paragraph; an active overlay wins.
- Dimming: Light .72, Medium .9, Dark 1; default .9 (Medium by name). `dimVersion` 3. No-version values .2/.35/.5 → .72/.9/1 by name; version 2 numbers unchanged (so old Dark .9 is now Medium, old Medium .72 Light; a saved .5 is shown as custom). Bound 0.1–1. Paragraph focus fades others to 1 − dim (Dark hides them).
- Whole-page window: the overlay is sized to the `.publication-scroll` content (scrollHeight × clientWidth) and tracked by ResizeObserver; lines measured relative to it; headings count as geometry blocks. Only the window is clear; pointer events none; it sits in the surface's stacking context so the sidebar, toolbar, menus and dock are not covered.
- Navigation: `isImmersiveMode` is now derived: assist on → `assistHidden ?? true`, else `manualHidden`. Setter writes whichever applies; assist off clears the override, so the earlier manual choice returns untouched. Not persisted. Navigation toggle button reopens the sidebar when hidden.
- Reflections: `hidden` attribute on the existing box (`reflectionHidden` prop), never unmounted; Notes drawer untouched.
- Theme: `reader-theme.ts` (pure) + `use-system-dark.ts` (`useSyncExternalStore`, server snapshot light, no module-level globals). Field `theme` per book; legacy `darkMode` read once and left. A legacy value equal to the computer follows it, a differing one is kept as explicit (limit below).
- Controls: icon-only with CSS tooltips (hover and `:focus-visible`, hidden while the menu is open, first control left-aligned and last right-aligned so none leaves the window), `aria-label` includes state; no `title` (it would double the tooltip). Theme is a small anchored popover, also on phones. Touch targets ≥44 px high on a phone.

## Migration limits
- A legacy `darkMode` value cannot be proved a choice. One that differs from the computer at first load is kept as Light/Dark even if the computer's schedule changed since the first visit; Follow computer clears it.
- Version 2 dimming .5 (old Light) stays .5 (custom) rather than being renamed.
- Tooltips are not dismissible with Escape (WCAG 1.4.13 gap); native `title` was avoided.
- Public: `ReadingSupportPreferences.overlay` gained `'paragraph'`, `dimVersion` is 3; the reader's internal `setIsDarkMode`/`defaultDarkMode` are gone from `usePublicationReader`. Flag for review.

## Checks (exit codes)
- Unit suite and build: see final line of this file.
- Updated browser checks pass: reading-support, assist-width (dimming, names, icon-only), toolbar repair, toolbar recorded, original reader, navigation fixture.
- `test-reader-layout-navigation-headless.mjs` fails its first assertion (article 520 px, expects ≥600) with and without these changes; with that threshold relaxed its theme, hide-navigation and Reset steps pass, and the 320 px step fails on the fixture's breadcrumb buttons (not the toolbar; the real DP book has no overflow at 320). Both pre-existing.
- `probe-assist-theme.py` (real Deliberate Practice and Linguistics books on the built demo, 1280, 1440, 390): all checks pass; `probe-ssr.mjs`: server render with no window/document passes. Screenshots in `evidence/` (after-*.png). Native T3 preview snapshot timed out twice, so bundled headless Chromium was used.

Final: `npm run build` exit 0 (dist rebuilt, server on 8773 serves it); `npm test` exit 0 (unit suites incl. new test-reader-theme, books check). Probe re-run after final build not repeated; run before it passed.
