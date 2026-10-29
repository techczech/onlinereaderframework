---
title: Independent focused review of Course Design demo integration
date: 2026-10-29
verdict: clean-in-scope
scope: Course Design conversion and existing demo integration only
---

# Course Design demo integration review

**Verdict: clean in scope. No reproduced P1–P3 findings.** Parent retains fixes and release authority. This is local integration acceptance within the checks below; final titles, covers and canonical URLs remain pending.

## Independent evidence

The retained `probe-course-design.py` serves the existing built demo read-only and launches only installed Playwright chrome-headless-shell 1228. Its final run records 100 checks, all passing, in `evidence-course-design-integrated.json`. Browser and localhost server close in finally; downloaded EPUB scratch is removed in finally. The probe uses disposable browser state. Production and source were not edited. No Git operations, agents, build, deployment or converter execution occurred.

A separate source/conversion test ran successfully with `node --import ./apps/reader-demo/node_modules/tsx/dist/loader.mjs docs/design/course-design-complex-books/test-course-design.ts`: nine sections, 311 ordered values, four embeds, 12 agent files. This executes the existing independent source traversal and source-hash assertions; it is a fresh run of builder-authored assertions, distinct from the new browser checks. An initial tsx CLI attempt hit sandbox IPC EPERM; direct Node loading passed without modifying implementation.

All nine actual demo chapters preserve the provenance values in order. Source headings, checklist text, table lists, blank cells and planner structures remain represented. Tables retain scoped column and row headers: engagement 5×4, ICAP 4×3, activity planner 10×4, learning matrix 6×3 and modular planner 5×3 (body rows × columns). Source website and November 2025 date remain provenance metadata. Book title, author and exact Creative Commons Licence label and BY-SA 4.0 URL match source. The approved random-image omission is explicit. No invented author prose was found in the converter; temporary interaction notices are interface copy.

All four frames load from `embeds/course-design-frameworks/`, with sandbox exactly `allow-scripts`; served resources match source HTML bytes. Both checklists toggle by keyboard and Reset clears them. Both planners accept entries; a planner accepts keyboard entry and clears on reload. Notices explicitly state entries are not saved. Complete written worksheet text remains present with a blocked frame. All nine chapters have no document overflow at 390 px.

Actual search UI finds “Wikipedia editathons” in the Learning Activity Matrix and “The overall objective of the course” in the Quality Assurance Checklist; each result opens the correct semantic chapter. A reflection and a note on a selected source paragraph survive reload. The anchored note does not appear after switching to Academic Productivity. Paragraph, Line window and Ruler controls target a list unit within a table; Paragraph also targets an ordinary paragraph. These checks inspect active semantic units, not pixel-perfect overlay geometry or speech.

The actual Download eBook action produces an EPUB with nine chapters and all 311 source values in order. Served `agent/course-design-frameworks/full.md` also contains those values in order. Neither contains probe worksheet entries or the saved note. These checks exercise the integrated app and served agent files, not an isolated reader fixture.

## Integration and inherited evidence

Reviewed the actual book, provenance and standalone/combined manifests, four interactive documents, converter, tests, demo registry, app wiring and asset plugin. The registry appends Course Design as the eighth book and derives its existing embed root. Plugin source enumerates manifest resources for serving/copying; built served bytes match all four. The five earlier books are retained through existing registry imports. No schema, persistence or exporter change is introduced by this conversion.

The supplied integration log records 19/19 passing tests, including existing release isolation, eight demo identities, Academic Productivity seven theory sections and Developing Competence's restored competency chapters. The supplied root build log is inherited evidence. Those suites and the root build were not rerun here because their outputs/scratch extend beyond this review's ownership. Likewise, the builder's standalone 78 runtime checks and validated-embed result remain inherited, not this review's results.

## Limits and evidence interpretation

The retained probe's `table associations` assertion checks explicit headers references only when present; the sanitiser removes `headers`, `role` and `tabindex`. Independent non-vacuous row/column scope assertions establish the simple tables' implicit associations. The narrow written modular table fits its 332 px viewport (scrollWidth equals clientWidth), so it requires no horizontal scroll; the final keyboard check accepts that condition and does not claim it received keyboard focus. Interactive scroll-region coverage remains in the inherited standalone checks. No broad browser/width matrix was repeated.

No actual speech, EPUBCheck, public URLs, live editions or public release acceptance was tested. Existing-book isolation evidence combines the inherited integration log with the focused new note-isolation journey; no full existing-book content/state matrix is claimed. AP/DC source fidelity outside the supplied integration tests was not independently re-audited. Instructional Videos was not converted or reviewed.

The browser probe needed locator corrections during development (search is labelled Search, assist button name changes with mode, and saving a highlight opens notes automatically). These were probe issues, not reproduced product failures. A preliminary keyboard-focus assertion was rejected after dimensions showed the written table did not overflow; final evidence records the explicit fit condition.

`evidence-course-design-hash-pins.json` pins reviewed source/integration files and served agent artefacts using SHA-256. These identify review-time bytes, not a Git commit or public release. Only this review folder received new files. No scratch directory remains.
