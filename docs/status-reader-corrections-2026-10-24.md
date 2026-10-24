---
title: Book reader correction status
date: 2026-10-24
register: FOR DOMINIK
status: opus-sidebar-scroll-proposals-ready
reviewed_code: b415202c6bd79e0fe8338c7ad1082967920785e4
---

# Book reader corrections

**Later author feedback:** The author still reports substantial contents-sidebar and scrolling problems and has requested Claude Opus 5.5 design suggestions, with no further Astra use. The technical results below remain evidence for their limited scopes; they do not establish satisfactory navigation UX. Claude Opus 5.5 has completed the consultation in `docs/design/2026-10-24-sidebar-scroll-opus/`. Its recommended pinned-header/contents-list design and two alternatives are proposals, not an author-selected implementation. No production code changed during this consultation.

The author’s screenshots led to changes in the existing shared reader. The local preview now gives each book its own cover, colours and masthead, uses configurable neutral labels, and derives home/sidebar contents from the actual ordered section tree. The manuscript snapshot is unchanged.

The narrow desktop column is repaired. The original report reproduced a 366-pixel text column at both 1440 and 1920 pixels. The corrected real answer uses about 795 pixels when no local headings require a rail; the focused two-rail fixture measures about 701 pixels at 1440. Responsive checks include 320-pixel mobile. Before and after evidence is under `docs/design/2026-10-24-reader-corrections/verification/`.

Reading settings is visible beside the book title. Its explicit controls cover article width, theme, distraction-free navigation, typeface, text size, line/paragraph/letter spacing, paragraph focus and exclusive line-window/ruler overlays. The combined reset resets both sets of preferences. The underlying text nodes and annotations are preserved. Sentence breakup and anchored word beginnings are not implemented.

Listen opens a separate recorded-audio transport with resume, speed, time/chapter/passage navigation and optional following of measured text spans. Browser read-aloud remains explicitly labelled. The actual demo books have no full recordings configured; missing audio is stated directly. The generic playback tests use a silent WAV fixture, not a book recording. No paid generation or study audio copying occurred.

The parent’s real-book browser suite passes 54 checks, including actual settings changes/reset and saved highlighting. The root test command passes 63 Node tests. The standalone package installs, builds, imports in native Node and passes strict React 18 types. Source comparison verifies all 515 hashes and the 253 complete ordered answers. The refreshed installed-consumer matrix passes both React 18.3.1 and 19.2.0, including strict host types, native imports and browser interactions. The first independent integration audit found two P2 issues: an explicit Language Muscle paragraph size and focus when opening the mounted player. Both are repaired with failing-then-passing browser regressions; the fresh focused Astra closure review independently closes both findings at the code checkpoint above. It passes 17 closure checks, 14 support checks and 12 additional probes, reported as separate runs.

The three local books remain at port 8773 using the book query parameter. Cover choices are existing provisional candidates, not approved final publication covers. The public-release records dated 23 October are marked superseded, and their frozen archives are preserved unchanged. No branch push to the public remote, deployment, WriteFlex import or store submission occurred.

Configuration and integration are documented in `docs/configuration-publication-reader.md`. Source reuse is documented in `docs/audit-reading-support-reuse-2026-10-24.md`; module receipts retain exact boundaries and verification limits.

## Open the corrected preview

- [Linguistics](http://127.0.0.1:8773/?book=linguistics) has the warm editorial identity and all 253 answers.
- [Deliberate Practice](http://127.0.0.1:8773/?book=deliberate-practice) has the ink/red identity and practice cover.
- [Language Muscle](http://127.0.0.1:8773/?book=language-muscle) has the green/cream identity and woven cover.

The final repaired package passes fresh installed React 18.3.1 and 19.2.0 type, native-import and browser checks. The final matrix log is `build/check-reader-corrections-react-final.log`. The reviews are `docs/review-reader-corrections-2026-10-24.md` and `docs/review-reader-correction-closure-2026-10-24.md`. Their technical verdict does not claim author visual acceptance.
