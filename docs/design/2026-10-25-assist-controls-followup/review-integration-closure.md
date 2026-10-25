---
title: Independent closure review of reader assistance repairs
register: FOR DOMINIK
reviewer: Codex gpt-6.1-sol
reviewed: 2026-10-25
status: changes-required
ownership: Review complete and released; parent owns fixes and final validation.
---

No action needed. FOR DOMINIK. The reader repairs need one further correction before integration. A nested list item's own text can remain clear in Paragraph mode and unreachable in Line window. The parent session owns the correction; Dominik has no next action.

- **One P2 specification finding remains** in nested content targeting and dimming.
- **Heading targeting, annotation shading and tooltip interaction pass** their focused runtime checks.
- **The layout finding is closed for the tested runtime.** A controlled font experiment reproduces both the earlier failure and the corrected result without changing breadcrumb code.

## SPEC — P2: Nested containers lose their own readable text

**Location:** `packages/reader-core/src/original/reading-support/ReadingSupportSurface.tsx:31`. The filter rejects every candidate containing another readable block. Marking at line 73, pointer targeting at lines 80–81 and keyboard enumeration at line 97 consequently omit those containers. The Paragraph opacity rule at `packages/reader-core/src/original/reading-support/support.css:22` only affects marked elements.

**Requirement:** Paragraph leaves only the current readable block clear, and Line window follows readable page content. Avoiding multiplied opacity must preserve a nested container's own text.

**Reproduction:** Run `node docs/design/2026-10-25-assist-controls-followup/review-closure-probe.mjs` from the repository root. Its independent extension inserts valid nested content into the rendered fixture:

```html
<ul><li id="parent"><span id="parent-text">Parent list text</span>
  <ul><li id="child">Child list text</li></ul>
</li></ul>
<table><tbody><tr><td id="mixed-cell">
  <span id="cell-text">Cell introduction</span><p>Cell paragraph</p>
</td></tr></tbody></table>
```

With Paragraph, Dark and the heading current, the parent text and cell introduction each have effective opacity **1** and no marked ancestor. The child item has opacity **0**, as required at Dark. These measurements multiply all ancestor opacities rather than assuming that one computed style describes the visible result. With Line window and Dark, hovering the parent text leaves the mask geometry unchanged at `[[0,16],[143,1578]]`; that text remains under the opaque shade. The pointer event is delivered to ordinary readable text, but there is no eligible ancestor to activate.

This is one filter defect with two visible consequences. Simply including both parent and child in the existing opacity selector would restore compounded dimming and is not sufficient. The parent should preserve the container's direct text as a reachable reading unit while keeping the agreed single dimming application and manuscript preservation. A regression must include parent text beside a nested list, not only a list item whose entire content is a paragraph. The same issue affects cells containing both direct text and a paragraph.

Evidence: `closure-assist-results.json`, the two failing checks at the end of `closure-assist.log`, `closure-nested-paragraph.png` and `closure-nested-window.png`. The screenshots use the assistance fixture's fallback fonts; the text targeting and opacity observations do not depend on font metrics.

## Disposition of the four previous findings

**Heading targeting is closed for the reported heading case.** Plain headings, a heading containing MathML and a table cell become reachable in Line window at Dark. The measured masks leave their hovered content clear. The rich heading retains its exact MathML subtree. The nested-parent case above remains a separate uncovered target within the same repaired enumeration.

**Paragraph dimming is partially closed and remains open for nested mixed content.** Standalone headings, paragraphs and cells dim once; each can become the sole clear block. A list item containing only a paragraph also dims once. Direct parent text alongside nested blocks fails as described above, so the complete “only current readable block clear” requirement is not satisfied.

**Saved margin-note shading is closed.** `support.css:23` places margin cards below the overlay. At a note location outside the clear band, enabling overlay hit-testing temporarily makes the mask the top painted target; restoring production pointer rules makes the note button reachable again. The Notes drawer remains usable outside the shade. Saved reflection and highlight storage bytes are identical before and after the exercised controls. Body text and MathML are unchanged. This retains the first review's limit concerning pre-existing noncanonical JSON serialisation.

## STANDARDS — Tooltip finding closed

The authored label remains visible throughout the pointer's path from the icon, across the transparent border and onto the label. It persists while hovered. Escape dismisses hover and focus labels, opens no menu and leaves keyboard focus on the control. Moving within the same control does not immediately reopen it; a new pointer entry or a new focus entry rearms it. No native title duplicates the authored label.

The relevant repairs are `reader-original.css:200–203` and `toolbar/ReaderToolbar.tsx:96–110`, with rearm handlers on all five controls. The runtime checks also preserve menu Escape returning focus to its opener and reading-area Escape turning assistance off. No remaining standards finding was established in this bounded review. The standards basis is the archived `review-standards-source.md` from the first review; no broader accessibility audit is claimed.

## Layout finding closed with a controlled font experiment

`review-closure-layout.mjs` reuses the actual current layout gate's fixture bundle and styles. In two fresh browser pages it changes only whether the fixture serves the packaged font files, waits for `document.fonts.ready`, records font requests and FontFace status, and measures the same controls. The experiment exits **0**.

Without fonts, Normal measures **520.546875 px**, Material Symbols and body fonts report errors, the phone main area scrolls to **346 px** inside a 320 px viewport, and Save ends at **386.6875 px**. With the packaged fonts loaded, Normal measures **590.484375 px**, main scroll width is **320 px**, Share occupies x **105.9375–197.578125** and Save occupies x **205.578125–292**. The actual served Deliberate Practice book at port 8773 gives those same phone action bounds and no main overflow.

With fonts, Narrow, Normal, Wide and Full measure **499.640625, 590.484375, 726.75 and 888 px** respectively. This independently supports the meaningful width ordering and the approved Normal range of 480–600 px; it does not merely accept a relaxed lower bound. The stylesheet expresses Normal as `52ch` at `reader-original.css:104`. The current gate also asserts default equals Normal, Full fits the reading area, and both phone actions fit the viewport. Its assertion message still says “about 520 px here”; that stale diagnostic wording does not affect the gate's logic.

The font intervention explains the earlier fixture overflow without a production breadcrumb change. `ReaderLayout.tsx` has the identical SHA-256 recorded by the first independent review. This establishes no breadcrumb change between the two reviewed snapshots, **not historical attribution to c777d44**. Font failures themselves still produce fallback-layout overflow; the closure concerns the requested functioning-font runtime. Evidence: `closure-layout.log` and its reproducible probe.

## Test meaning and evidence limits

The new heading/cell browser assertions measure real opacity, active-block transitions and mask intersections. The tooltip checks exercise pointer movement and keyboard dismissal. The layout test serves actual packaged font bytes and checks width relationships and viewport bounds. These are useful behavioural checks.

The repair probe's effective-opacity collector at `repair-probe.mjs:43` nevertheless excludes elements containing `p` or `li`. That repeats the production filter's blind spot for nested parents. Its nested fixture contains only `<li><p>…</p></li>`, so the passing result cannot establish complete coverage of nested readable text. The independent extension above measures direct parent text explicitly and catches the omission.

I read the original review, its hash manifest and probes, the repair receipt, before/after logs and current four production repair files plus three changed browser tests. The receipt discloses three assertion corrections after the before-run. Accordingly, its reported 12 failures followed by 49 passes are **not an exact same-test red/green baseline**. The reported mutation checks are builder evidence; I did not mutate production sources to repeat them. The current independent runtime observations support the individual closures stated here and expose the remaining defect.

No standalone pre-repair source patch or baseline was supplied, and Git was forbidden. This review therefore cannot certify the exact repair diff or assign changes to a commit. The prior manifest confirms that all its listed production sources other than the four repair files and generated reader CSS are unchanged, including reader storage, theme, layout and manuscript snapshot data. `closure-source-hashes.json` records the exact current sources, all three tests and evidence inputs for this verdict before any later parent checkpoint.

## Commands, scope and handoff

The following commands ran from the owning reader repository:

- `node docs/design/2026-10-25-assist-controls-followup/review-closure-probe.mjs` exits **1**: **29 of 31 checks pass**, with two failures from the single nested-container defect.
- `node docs/design/2026-10-25-assist-controls-followup/review-closure-layout.mjs` exits **0**: the controlled font experiment, ordered widths and real-book phone action bounds pass.
- The hash comparison and final source/evidence read-back exit **0**. No `.closure*` scratch directory remains.

Native T3 preview opened the real page, but two snapshots returned `Preview automation snapshot timed out after 15000ms.` I then used the existing bundled Chromium headless shell through the repository's Python Playwright environment. Probe temporary roots are inside this repository and removed in `finally`; browser processes close in `finally`. Retained scripts, logs, JSON and screenshots are narrow review evidence. The local real-book server belongs to another session and was left running.

I used the verification-before-completion and expository-writing/Unslop procedures for evidence and the report. Full unit, build, package, SSR, front-page and React matrices were not repeated; their earlier results remain earlier evidence. No audible voice output was used. I used no other agents, Git operations, production fixes, pushes or deployments, and did not edit original ReadFlex/WriteFlex sources or manuscripts.

**Review ownership is released.** The parent owns the nested-content correction, its regression and final validation. Dominik has no next action.
