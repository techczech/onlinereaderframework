---
title: Independent review of reader assistance and theme integration
register: FOR DOMINIK
reviewer: Codex gpt-6.1-sol
reviewed: 2026-10-25
status: changes-required
ownership: Review complete and released; parent owns fixes and final validation.
---

No action needed. FOR DOMINIK. The reader’s assistance and theme changes need fixes before integration. The parent session owns those fixes; no decision is needed from Dominik.

- **Three specification defects remain** in assistance targeting and dimming.
- **One accessibility defect remains** in the new tooltip interaction.
- **Preferences, navigation restoration and note preservation passed the focused checks**, while the existing layout browser gate still exits with failure.

## Scope and evidence

I read `receipt.md`, `docs/configuration-publication-reader.md` and the current sources named in the brief. The latest specification supplied in the review request takes precedence over the configuration document. This was a bounded review of assistance, themes, storage, navigation and preservation journeys. I used no other agents and made no Git, production, manuscript, original ReadFlex/WriteFlex, push or deployment changes.

**The requested comparison with c777d44 remains unverified.** The brief also forbids Git, and no standalone patch or baseline source was supplied. I respected that boundary. Findings below establish current defects; they do not independently establish which commit introduced each defect. The builder’s before/after layout comparison remains builder evidence. `review-source-hashes.json` identifies the exact current files inspected, including the snapshot data and stylesheet.

Native T3 preview opened successfully, but two snapshot attempts each returned `Preview automation snapshot timed out after 15000ms.` I then used bundled Chromium headless shell. The source fixture bundles the current TypeScript directly and reads the existing core stylesheet. Its intercepted fixture origin does not serve bundled fonts, so its screenshot establishes shading and stacking, not final typography. A separate real Deliberate Practice page was checked at 390 pixels on the builder’s server at port 8773; that smoke check does not independently tie its served bundle to a source commit.

## SPEC findings

### P2 — The line window cannot follow the pointer onto a heading

**Requirement:** The line window follows the reader across the page while preserving access to the book’s original content.

**Locations:** `packages/reader-core/src/original/reading-support/ReadingSupportSurface.tsx:29`, `:31`, `:73`, `:80`, `:97`.

**Reproduction:** Open the fixture through `node docs/design/2026-10-25-assist-controls-followup/review-probe.mjs`. Choose Line window and Dark. Hover the second paragraph, then hover the chapter heading. The two mask extents remain exactly `[[0,690],[792,1124]]`; the heading stays behind the opaque upper mask. Clicking or focusing the heading cannot activate it either, and the keyboard block list also excludes headings.

The geometry list includes headings, but only paragraphs and list items receive the attribute required by pointer targeting. Measuring headings therefore does not make them reachable. **The parent should make the window target the same readable blocks it measures**, with a check that a heading becomes readable at Dark. `review-heading-window.png` records the masked heading after hover.

### P2 — Paragraph assistance leaves unrelated headings and table text fully clear

**Requirement:** The latest request says “paragraph only current clear”. The configuration document’s narrower description, “fades every paragraph”, does not cover that complete requirement.

**Locations:** `packages/reader-core/src/original/reading-support/ReadingSupportSurface.tsx:28–29`, `:73`; `packages/reader-core/src/original/reading-support/support.css:22`.

**Reproduction:** In the same fixture, choose Paragraph and hover the first paragraph. The active paragraph has opacity 1, other paragraphs have opacity .1, but both headings and the table cell retain opacity 1 without being active. Dark does not change those exclusions: the selector only dims marked `p` and `li` elements.

**The parent should apply the agreed non-current-content dimming across the reading content**, preserving the manuscript markup and the active paragraph. The probe records each element’s tag, active state and computed opacity in `review-results.json`.

### P2 — Saved margin notes appear above the whole-page shade

**Requirement:** Line window shades the whole scrolling page except its clear window.

**Locations:** `packages/reader-core/src/original/reading-support/support.css:23`; `packages/reader-core/src/original/MarkdownRenderer.tsx:113–119`.

**Reproduction:** Seed the fixture’s saved highlight with a note, use a 1440-pixel viewport, choose Line window and Dark, then hover the second paragraph. The saved note beside the first paragraph remains bright above the upper mask, outside the clear window. This is visible in `review-heading-window.png`. The mask has z-index 1 inside the surface; the note card has z-index 10 in the same stacking context.

The mask’s full-page dimensions and opaque colour pass, but those properties do not prove that it shades every visible page element. **The parent should place reading-page annotations beneath the shade**, while keeping the Notes drawer usable and stored note bytes unchanged.

## STANDARDS findings

### P2 — The authored tooltip disappears when approached and cannot be dismissed with Escape

**Locations:** `packages/reader-core/src/original/reader-original.css:199–201`; `packages/reader-core/src/original/toolbar/ReaderToolbar.tsx:111–113`.

**Reproduction:** Hover Formatting with its menu closed. The label is visible. Press Escape without moving the pointer: opacity remains 1 and visibility remains visible. Move the pointer down into the label: opacity becomes 0 and visibility becomes hidden. The pseudo-element has `pointer-events: none`, sits across a gap below its trigger and has no independently retained hover state. The Escape handler returns immediately when no menu is open.

**This is a concrete hoverability failure**, rather than a generic objection to CSS tooltips. A reader using magnification or a large pointer cannot move onto the label to inspect it. W3C’s [explanation of WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) requires authored hover content to remain available under the pointer. Its dismissal exemption can apply when no meaningful content is obscured, so I do not claim that Escape failure alone proves a WCAG violation in every position. Escape dismissal is nevertheless part of the requested interaction and is absent.

The lack of a native `title` duplicate is correct. **The parent should retain that single-label behaviour while adding hoverable, dismissible tooltip state.** No timed disappearance was observed. Existing menu Escape handling restores focus to its opener; tooltip dismissal should retain focus where it already is. `review-standards-source.md` records the source used for this finding.

## Disposition of known limits

**Legacy theme intent is irrecoverable; the current fallback is acceptable within that limit.** Keeping the old appearance when it differs from the computer avoids a visible reversal on upgrade. Following the computer when the values match makes the new default available to existing readers. Either branch can misidentify an earlier explicit choice or a scheduled computer setting; the old boolean cannot settle that question. The code must not be described as recovering user intent. I do not require a different migration or new prompt. The browser checks confirm live System updates, explicit Dark restoration after switching books, malformed theme fallback and a matching old boolean becoming System. Explicit Light/Dark and System remain per book.

**The layout gate remains red, with two separate issues.** The current assertion in `test-reader-layout-navigation-headless.mjs:34` requires at least 600 pixels; the current Normal column measures 520.546875 pixels at 1440. The normal run exits 1. A diagnostic copy that relaxes only that assertion to 500 proceeds to the responsive check and exits 1 with article width 264 and `bodyOverflow: true` at the 320-pixel step. The Share/Save group remains non-shrinking beside the breadcrumb (`ReaderLayout.tsx:170–194`). Both logs are retained. One earlier diagnostic stalled before producing output; I stopped its confirmed Python child, allowed cleanup to run and obtained the bounded retry result above.

The builder reports that both failures predate this patch. I have independently reproduced their current failures, not that historical attribution. **The parent should update the width assertion to express the approved narrower Normal default and retain meaningful width/ordering checks; it should fix the narrow-screen breadcrumb/action overflow within the requested phone scope.** A relaxed threshold alone does not close the gate. Updating toolbar assertions for icon-only accessible controls is legitimate; it does not justify reporting this suite as passing. The separate real-book 390-pixel smoke passed without main overflow.

**The public preference change is intentional and verified in a narrow installed consumer.** The exported overlay now accepts Paragraph, and `dimVersion` is the literal 3. An older TypeScript object explicitly typed with `dimVersion: 2` therefore requires migration; persisted version-2 JSON remains accepted by the normaliser. The installed React 18 consumer compiles the new pair and an older `{focus:'paragraph'}` update, and confirms the old version literal is rejected. Packaged CSS contains the new paragraph selector, mask and dim variable. `usePublicationReader` is not exported from the package entry point, so its removed internal theme setters are not a root package API break. No full React matrix was repeated.

## Focused verification

- **The focused unit command exits 0 with 19 tests passing.** It covers malformed preferences and ranges, denied storage, per-book round trips, overlay migration, dimming migrations/custom values, theme rules and toolbar models. See `review-unit.log`.
- **The browser probe completes with exit 0 as an observation collector, not an acceptance gate.** It records 33 checks: 29 pass and four observations concern paragraph exclusions, heading targeting and the two tooltip interactions. The margin-note stacking finding additionally uses the screenshot and source. See `review-browser.log` and `review-results.json`.
- **Navigation restoration passes** for default assist hiding, F overrides, desktop/phone/desktop resizing, visible and hidden pre-assist choices, switching books and remounting a book with saved assist. Manual state is intentionally not persisted. Source review confirms that the switch uses the same setter and an off transition clears the assist override.
- **Data preservation passes for the exercised controls.** The reflection textarea stays mounted while hidden; an unsaved Czech/multiline draft returns unchanged. The Notes drawer’s Reflections tab works during assist. Canonically seeded reflection and highlight storage bytes remain identical through the controls. This does not prove that arbitrary pre-existing JSON whitespace survives the reader’s existing mount-time serialisation.
- **Rendered text, MathML and native selection pass.** Assist changes preserve the fixture’s body text and MathML subtree. Native text selection works afterwards. Synthetic speech boundary highlighting retains its selected passage across an assist change. No audible voice output is claimed.
- **Migration and storage guards pass in the browser.** Active legacy overlays win over separate paragraph focus; paragraph focus migrates when overlay is Off; malformed overlay/theme values fall back safely; version-2 .5 stays custom, .72 stays Light and .9 stays Medium; first-release .35 becomes Medium .9. Denied reads/writes leave in-memory formatting usable and report unsaved settings after an update.
- **The isolated installed-package command exits 0.** It builds core in scratch, installs the actual tarball offline with React 18.3.1, type-checks with `skipLibCheck:false`, checks native Node import, checks assist styles and builds the consumer. Its existing distribution audit reports four notice-inventory findings separately; this review does not relabel them as cleared. See `review-package.log`. Shared `dist` and `build` outputs are untouched by this review wrapper.
- **The server render command exits 0 without window or document.** It renders the toolbar, default theme icon and light server snapshot. This establishes SSR rendering, not hydration. Source review confirms a stable `useSyncExternalStore` subscription and matching media-query listener cleanup. See `review-ssr.log`.

## Handoff

**Changes required; review ownership is released.** The parent owns all production fixes, baseline attribution, meaningful layout-gate repair and final validation. This review’s temporary browser, installation and layout directories are removed in `finally`; the retained scripts, logs, screenshot and hashes are review evidence. No author prose was edited. Dominik has no next action.
