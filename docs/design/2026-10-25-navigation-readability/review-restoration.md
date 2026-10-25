---
title: Independent review of restored reader navigation
date: 2026-10-25
register: for-dominik
reviewer: Codex gpt-6.1-sol
status: changes-required
baseline: f1d956f
---

No action needed. FOR DOMINIK.

- **The requested navigation structure is restored.** Categories are headings, nested topics remain nested and chapter outlines are reachable at laptop and phone widths.
- **One P2 location-state defect remains.** Back restores the passage and focus, but the outline can mark a different subsection.
- The parent owns the repair and final validation. Dominik has no action to take here.

## SPEC finding: P2 current-location markers diverge

**Source:** `packages/reader-core/src/original/TableOfContents.tsx:94–108,124–132`, and `packages/reader-core/src/original/use-publication-reader.ts:117–145`.

Open `http://127.0.0.1:8773/?book=deliberate-practice&section=schemas` at 1280×800. Choose “Mental representations or embodied mental schemas”, then “More about chunks and mental representations”. Wait more than 1.2 seconds after each click and go Back.

The fragment and keyboard focus correctly return to “Mental representations…”. The visible outline still marks “More about chunks…” with `aria-current="location"`. The compact outline independently marks “Why inventory”; changing to 1024 pixels exposes that disagreement. This persists after the click-pinning interval expires.

Each outline owns its own `activeId`; clicking updates only that instance. The history handler restores scroll/focus without updating either marker. Since the restored heading is centred, it need not enter the observer's activation band at the top of the scroller.

**Repair criterion:** Both presentations must agree with the current chosen/restored subsection after click, Back, Forward, deep link and responsive presentation changes. Preserve scroll-driven tracking for subsequent reading. This needs synchronised location state, not a new interface design.

The reproduction and raw states are in [the independent probe](../2026-10-25-readaloud-reuse/probe-integration-seams.mjs) and [its evidence](../2026-10-25-readaloud-reuse/evidence-integration-seams.json). The fixture and three-book suites currently check URL/scroll history, but do not assert that `aria-current` follows Back or that both presentations agree.

## Verified restoration

Fresh runs of the navigation fixture and three-book suites passed 49/49 and 47/47, respectively. The fixture bundles current source; the real-book suite tests the existing rebuilt preview on port 8773. [The integration review](../2026-10-25-readaloud-reuse/review-integration.md) records process exits, source/asset hashes, the browser fallback and all coupled speech findings.

Deliberate Practice has eight display-only category headings over its 21 entries, with progress still counting 20 chapters. License remains in Appendices and Reader Guide remains in App Guide. Linguistics retains its nine actual topic groups; Language Muscle retains its actual hierarchy. No extra category pages or duplicate tree levels were introduced.

Exactly one outline presentation is visible at 1440, 1366, 1280, 1200, 1024, 768 and 390 pixels. The compact disclosure covers the 1200/1024 gap while preserving the Normal article measure. No measured horizontal overflow occurred. Language Muscle's single “What is this” heading is reachable, and an outline beginning at h3 is indented from its own shallowest level.

Heading anchors, duplicate-title suffixes, rich formula/Unicode labels, annotation replacement and chapter/subsection links passed the focused fixture. Clicking moves focus into the heading and updates the fragment; Back/Forward restore the passage. Compact Enter/Escape and the outline shortcut passed. The defect above concerns the location marker that accompanies those successful movements.

## STANDARDS and limits

The restored headings and outlines support the requested structure, chunking and scanning guides. The explicit request to restore a meaningful single-heading outline overrides the earlier suppression rule. No manuscript language or author prose was edited.

No additional standards-only blocker was established. This is source and headless Chromium evidence, not physical-phone, Safari or screen-reader acceptance. No production file, shared build, Git state or release was changed. Parent-owned correction of the location marker remains necessary before navigation acceptance.
