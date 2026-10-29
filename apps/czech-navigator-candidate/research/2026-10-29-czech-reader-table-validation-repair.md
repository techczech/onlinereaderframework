---
status: "ready-for-independent-review"
author: "gpt-6.1-sol"
date: "2026-10-29"
title: "Czech reader table validation repair"
kind: "evidence"
created: "2026-10-29T22:52:13Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/czech-navigator-candidate"
sources:
  - file: apps/czech-navigator-candidate/research/review-czech-reader-integration.md
  - file: apps/czech-navigator-candidate/research/repair-czech-reader/table-results.json
---

The runtime table boundary now requires exact per-cell text, tag and semantic role, rectangular source shape, explicit identity column zero, complete data-cell header pairs, exact in-table header coordinates, safe unique prefixes and collision-free namespaces before restoring attributes or enabling transformations. Old annotations without cell bindings fall back to source controls. The sanitizer allowlist is unchanged. The aggregate source text field remains API-compatible, but eligibility uses exact cell bindings because HTML parsing can relocate inter-row whitespace.

Source changes owned by this repair:
- packages/reader-core/src/original/table-surface.ts: validation and coordinate-based header restoration, including transpose. Row sorting retains stable source-cell references. The entire prefix namespace is reserved to prevent collisions with coordinates introduced by transpose.
- apps/czech-navigator-candidate/scripts/semantic-czech-navigator.py: emit exact DOM-equivalent cell text/tag/role matrix and required identity column from existing reviewed source. Blank source axis corners remain blank.
- apps/czech-navigator-candidate/research/repair-czech-reader/table-regression.mjs: assertions over all 20 sanitised actual tables; all sort columns, filter, fixed identity and last context guard, transpose matrix/header targets, exact reset. Sixteen negative mutations per table refuse transforms and leave innerHTML untouched: missing header map, dangling reference, existing ID collision, redistributed cell text with identical concatenation, unsafe prefix, duplicate prefix, absent cell bindings, changed header tag, incorrect scope, missing identity, nesting, span, caret text, wrong table ID, reserved future coordinate collision and ambiguous duplicate review.

Generated outputs were refreshed through the existing framework and candidate build commands (semantic source, book JSON, served exports and Vite). Parent scroll persistence and anchor parser changes were preserved. No deployment, DTC, dependency migration, WMF regeneration, PNG restoration, commit or unrelated source edits were performed.

Verification: all commands and exits are in adjacent logs. Final framework and complete candidate builds pass. Table browser assertions pass for all 20 sanitised source-reviewed tables and 320 negative cases in bundled hidden Chromium. The quota browser regression uses the final candidate bundles and preserves positions `{legacy-unparsed` with backup null after selective backup rejection. Focused 47, agent-export 26, publication content 23, served-export 6 and semantic bindings 4 tests pass. Anchor parser regression passes; independently parsed owners equal exactly 1230 actual anchors across 22 units. Coverage retains 308 tables and 9652 cells, with exact web/EPUB cell text and lossless section reconstruction. EPUBCheck passes with zero errors or warnings.

Limitations: coverage still reports the previously documented generated footnote number/return-arrow token differences; whole-document byte identity is not claimed. Builds retain the existing Browserslist age and large chunk warnings. Two development probe failures were corrected: the sanitised probe initially searched unprefixed IDs, then a too-strict nonblank-column-label check rejected a legitimate blank source axis corner. The final assertions pass. This is implementer verification, not independent acceptance. The parent's saved-position write gate and the table restoration boundary still require independent re-review. Other-book release gates, full accessibility review and deployment are outside this repair.
