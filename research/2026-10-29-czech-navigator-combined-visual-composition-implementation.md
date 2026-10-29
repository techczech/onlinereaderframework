---
status: "implemented-awaiting-independent-review"
by: "Sol"
verified: "2026-10-29"
title: "Czech Navigator combined visual composition implementation"
kind: "evidence"
created: "2026-10-29T22:24:42Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework"
sources:
  - file: apps/czech-navigator-candidate/research/result-czech-visual-composition.md
  - file: docs/design/2026-10-29-czech-navigator-visual-round/editorial/prototype-czech-editorial.html
  - file: docs/design/2026-10-29-czech-navigator-visual-round/reference/prototype-czech-reference-desk.html
---
# Czech Navigator visual composition parcel

Implemented the approved Editorial atlas with Reference desk table focus controls. Existing optional `appearance.readerLayout: atlas` selects the composition; default books retain their presentation. Full manuscript and 22 reading units remain in the candidate. No source conversion or eligibility changes authored in this parcel. Existing WMF PNG modifications untouched.

## Exact authored paths

- `packages/reader-core/src/original/ReaderLayout.tsx`: optional full-width masthead, author identity, group-local numbered chapter opening. Existing semantic manuscript heading retained.
- `packages/reader-core/src/original/reader-original.css`: scoped atlas composition, ivory/navy/vermilion, grouped contents, bounded outline, serif hierarchy, mobile inline contents.
- `packages/reader-core/src/original/table-surface.ts`: separate table header with collapse/close; top-layer focus workspace escapes containing-layout clipping; Escape and close return focus.
- `apps/czech-navigator-candidate/tables-czech-navigator.css`: atlas table plates and separate compact focus control panel.
- `apps/czech-navigator-candidate/scripts/check-czech-visual-composition.mjs`: hidden bundled Chromium, local build interception without a server, focused render and interaction evidence.

## Combined exact-design state

`state-czech-combined-reading.mhtml` and `state-czech-combined-focus.mhtml` archive the actual combined implementation state with resources. These are static evidence snapshots; the candidate build remains the interactive artefact. The reading state contains the complete Nouns manuscript unit, not prototype excerpts. Original selected references remain under `docs/design/2026-10-29-czech-navigator-visual-round/`.

Screenshots in this directory:

- `screenshot-czech-composition-desktop.png`
- `screenshot-czech-composition-focus.png`
- `screenshot-czech-composition-mobile.png`
- `screenshot-czech-composition-mobile-200.png`
- `screenshot-czech-composition-mobile-200-reading.png`
- `screenshot-czech-composition-desktop-200.png`

Screenshots inspected against selected editorial desktop and Reference desk focus screenshots. Fixed narrow article geometry, focus clipping and controls wrapping exposed by actual screenshots. Extra toolbar/search/annotation controls remain available, so the complete reader has more chrome than the excerpt prototype. Complete contents and outline include all actual units/headings rather than the prototype subset.

## Verification

- Framework build: exit 0, `check-czech-visual-framework.log`.
- Candidate build: exit 0, `check-czech-visual-candidate.log`; 308 tables / 9652 cells reported. Build retains existing chunk-size warning.
- Focused fragment and outline tests: 4 passed, 0 failed; `check-czech-visual-focused.log`.
- Browser script: desktop 1440, mobile 390; document overflow; enlarged root type plus explicitly doubled reading body CSS variable; chapter selection returns to top; outline URL target; collapse/show; close and Escape focus return. This is CSS text scaling evidence, not browser-native text-only zoom or a full accessibility audit.
- Browser uses bundled headless Chromium and intercepts build files. No browser server, real Chrome, deployment, store action, DTC request or independent review.

## Remaining parcels

Semantic contextual heading review; wider table eligibility and accessible complex headers; saved-data migrations and cross-unit inline links; agent/no-JS/export audit; negative regression tests and security harvest remain unfinished. Prior coverage/EPUBCheck evidence is inherited, not rerun or expanded here. Overall build remains incomplete until those parcels and independent review finish.

Changes left unstaged for parent inspection because shared dirty files contain the first builder's implementation and concurrent work. No commit, push, reset, branch switch or restoration.
