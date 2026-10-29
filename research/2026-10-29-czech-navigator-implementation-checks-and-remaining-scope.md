---
status: "incomplete"
by: "Sol"
verified: "2026-10-29"
title: "Czech Navigator implementation checks and remaining scope"
kind: "evidence"
created: "2026-10-29T22:15:09Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework"
sources:
  - file: apps/czech-navigator-candidate/research/result-czech-atlas-implementation.md
---
# Czech Navigator implementation result

Implementation remains incomplete; parent must not publish or treat as the selected high-fidelity design. No independent review performed.

Implemented: full-book Parts of speech overview plus ten child reading units (eight named parts of speech and two synthesis topics); 22 reading units total. Exact source IDs retained. Structural local heading normalisation plus two explicitly excluded prose lead-ins. Source manuscript unchanged. Pandoc AST applies the same exact-ID roles to EPUB without touching tables. Optional reusable controls provide find, collapse, full width and source reset. One reviewed paradigm, source table 10, additionally supports row filtering, named-column sorting, non-key column visibility and transpose. Other 307 tables retain native spans and have no destructive transforms. Table review is bound to exact source text, ID and rectangular shape.

Verified: framework build; candidate build; three focused legacy-fragment tests; 308 tables and 9652 exact cell texts equal in web/EPUB; 22 EPUB reading units; EPUBCheck 0 errors / 0 warnings. Browser checks passed: legacy overview URL routes to Nouns, zero filter results, reset equality, transpose, Escape focus, desktop, 390px and 200% document overflow. Screenshots stored beside this result. Browser checks do not establish visual fidelity or complete accessibility.

Framework suite: content/export/embed and 96 original-reader checks passed. Three demo tests failed in canonical domain/release-isolation expectations for other books; exact outputs are in check-framework-implementation.log. Unrelated release apps untouched.

Required unfinished work: selected editorial masthead, numbered title composition and precise navigation geometry; combined high-fidelity artefact; complete per-heading contextual semantic review (ledger explicitly marks structural normalisation); explicit migration of legacy highlights/bookmarks/progress/resume offsets and cross-chapter inline links; agent/no-JS export audit; wider reviewed table eligibility ledger and complex accessible header associations; meaningful table negative regression suite; security harvest; full keyboard and 200% text-preference validation. Current saved records remain stored under original stable book ID and no child completion ticks are fabricated, but content stored against old overview IDs is not migrated.

Generated WMF PNGs were rewritten during initial existing build execution; automatic approval review rejected restoring them from Git due to potential concurrent edits. They remain uncommitted and must be reconciled by parent. Build now renders only absent targets.

Current branch is feature/original-reader-framework-2026-10-23, original head 71cdeb6. Branch has no tracking upstream; initial pull failed for that reason. No branch switch, broad merge, deployment, PR, commit or push performed.
