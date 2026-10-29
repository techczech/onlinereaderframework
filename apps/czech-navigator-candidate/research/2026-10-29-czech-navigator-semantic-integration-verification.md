---
register: "FOR AGENTS"
by: "gpt-6.1-sol"
date: "2026-10-29"
status: "integrated-awaiting-independent-parent-review"
title: "Czech Navigator semantic integration verification"
kind: "evidence"
created: "2026-10-29T22:39:31Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/czech-navigator-candidate"
sources:
  - file: apps/czech-navigator-candidate/research/result-czech-semantic-integration.md
---

Implemented reviewed semantics in web and Pandoc EPUB AST. Reproduce first-builder mapped snapshot exactly (SHA a337af674418ef36b08ad11214780c315f3ac603068f8926c206e327c7418e33), validate every current heading hash and table content hash/source ID, then apply decisions. No raw-source ordinal transfer. Nested table stack extraction; semantic content identities supplement retained source anchors. Baseline binding JSON permits reproducible negative tests.

481 roles: 393 local topics, 20 chapter titles, one overview, 21 prefix labels, 42 empty heading cells, two instruction lead-ins, two example lead-ins. Prefix/empty cells and lead-ins preserved as paragraphs with original anchors, excluded from outline. Function/Form, history/calendar/tense use reviewed levels/parents. Nine named empty topics remain unresolved with original text/anchors.

20 source-bound table reviews: 10,25,66,80,118,120,121,123,124,139,140,193-198,219,279,280. Explicit cell IDs, row/column scopes and IDREF associations. Sanitiser strips IDREF attributes: narrow table adapter reapplies only source-bound annotations. Original table IDs retained. 288 association maps remain unknown and transforms disabled. Last nonidentity column cannot be hidden. Sort uses existing literal Czech comparator. Adjacent notes remain in place. EPUB complete tables retain source order.

Compatibility generation: version czech-parts-2026-10-29; all retained anchors mapped to actual owning units; overview destinations include overview plus ten children. Rebuild equality verified for all 1250 anchors. No shared navigation/storage changes.

Validation: four Python test methods including four invalid-ledger subcases passed. Stale source/hash, wrong source ID, span mutation and missing identity annotation rejected. Nested identity extraction tested. All 20 tables browser-tested: alternate-column sorting, filter, exact source text reset, transposition reset, last context protection, Escape focus return. Four runtime text/ID/shape/span mutations use conservative fallback. Candidate build exit 0; EPUBCheck zero errors/warnings. Coverage: 22 units, 308 tables, 9652 cells in both formats, exact cell text equality; only generated footnote numbering/return arrows differ in whole-document token accounting. See validation-czech-semantic-* and validation-czech-navigator-coverage.json.

Limits: independent framework review belongs to parent. No deployment/DTC request. Actual reading-preference UI persistence was not exercised: responsive test doubles root and reading-surface text directly. No complete accessibility association claim for remaining 288 tables. No content invented for nine unresolved topics. No Word fidelity claim. No WMF PNG regeneration or restoration. Initial browser attempts interrupted; one exposed sanitiser IDREF removal, corrected and rerun successfully. No observed candidate build race; final browser run followed generation.

No commit/push: concurrent dirty visual, compatibility and host work. Exact parcel manifest: changed-czech-semantic-integration.txt. Builder changes are additive to inherited dirty builder; manifest does not claim ownership of other existing edits. Shared table-surface.ts edits limited to optional reviewed association fields/application and last-context guard. Serving/export host parcel owns agent files. Source ledgers remain unchanged.
