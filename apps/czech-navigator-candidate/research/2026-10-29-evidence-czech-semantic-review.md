---
register: "FOR DOMINIK"
date: "2026-10-29"
status: "candidate-ledger-with-unresolved-associations"
reviewer: "gpt-6.1-sol"
title: "Czech semantic review evidence"
kind: "evidence"
created: "2026-10-29T22:31:29Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/czech-navigator-candidate"
sources:
  - file: apps/czech-navigator-candidate/source/edition-czech-navigator.html
  - file: docs/design/2026-10-29-czech-navigator-hierarchy-tables/proposal-czech-navigator-hierarchy-tables.md
---

The candidate ledgers provide contextual heading decisions and a conservative table capability assessment. They are ready for the parent to inspect and adapt; they do not establish that every table has complete semantic header associations.

The review used the current candidate HTML, manuscript/design context and existing heading ledger, without changing the author’s text or implementation. No external linguistic research, Word-fidelity claim, build, export or deployment was undertaken.

Coverage is 479 current HTML heading elements plus the two former headings already converted to paragraphs: 481 explicit decisions. All 308 table occurrences were inspected in contextual batches, including the two nested lists inside the full-name example. Twenty tables have explicit header/row-header associations, independent row groups and candidate filter, sort, selectable-column and transpose permissions. All 308 allow in-place find. The other 288 retain all transforming permissions off; their complete associations remain explicitly unknown. Reading a table and deciding to retain faithful behaviour is distinct from completing its association map.

The source SHA-256 is `a337af674418ef36b08ad11214780c315f3ac603068f8926c206e327c7418e33`. The design inventory binds to a different HTML hash. Current IDs, offsets, lines and individual table hashes are therefore recorded directly. Table identities use content hashes; ordinals and existing `czech-table-N` IDs are locators for this snapshot. Nested tables count individually. Do not transfer the preliminary regex extraction’s flattened table numbers: the final evidence extractor accounts for nesting.

The heading findings are:

- Keep Parts of speech as the overview and the ten approved child chapters, including the two synthesis chapters. Retain the remaining selected direct chapters.
- Keep Function and Form as second local headings under each case; their source h6 level does not imply four levels below the case. Keep negative commands as a genuine topic despite its sentence wording, because its examples develop a distinct contrast.
- Treat “If you want someone to do something you tell them to do it.” and “To do it with the right forms:” as imperative prose lead-ins. Preserve the two already excluded gender-example lead-ins as prose.
- Keep the 21 prefix names as table group labels under Prefix dictionary. The 42 empty heading cells beside them supply no outline destination. Preserve their cells and anchors.
- Parent the history dates under the history explanation. Parent the days and months explanations directly under Czech Trivia; the current structural mapping attaches them to polite verb forms. Parent seasons under the months explanation. Parent the tense comparison under Tense and Aspect.
- Nine named topics have no explanatory content before the next heading. Preserve them and their anchors as unresolved topics, including pivo, the other empty model topics, Shortening female names, Usage of v/do/na, Summary of selected prepositions of space and Short and long vowels. Do not populate or delete these from inference.

The twenty eligible tables, using final current source ordinals, are 10, 25, 66, 80, 118, 120, 121, 123, 124, 139, 140, 193–198, 219, 279 and 280. Each record identifies the exact source cells, required identity column, retained context and literal Czech text comparator. Header associations are selected for these actual tables, not inferred from the presence of a first row. Adjacent notes must remain visible when browsing.

Repeated noun paradigm review found constraints that prevent blanket expansion of controls. Tables 11, 16–18, 20 and 23 share gender and model bands; tables 37–40 also use shared forms or depend on a preceding singular table. The caret means “same as previous”, so row/column movement can break its reference. These remain faithful-only. The masculine vocative table 24 says “only the above”, making its rule order load-bearing; the independently complete feminine rules in table 25 permit browsing. The noun-pair pronunciation tables 193, 194 and 197 provide further independently reviewable noun examples. No merged noun paradigm is approved for transforms in this parcel.

The full verb chart, table 143, was read including its header rows and usage instructions. Its Present band has subordinate person columns, while abbreviation and irregularity notes supply context. It remains faithful-only until those associations are encoded. Intonation tables preserve a spatial pitch contour; the symbol legend and warning tables are prose/reference layouts. The two word-class synthesis matrices preserve directional axes and meaningful blanks.

Validation checked source binding, all 481 unique heading identities, 308 table records, no table identity collisions, and valid cell references in all enabled header associations and row groups. Rectangularity and absence of spans were checked for every enabled transform table. These checks validate record integrity, not the linguistic correctness of the manuscript.

The heading ledger retains the existing `chapters`, `lead_ins`, `headings` and heading `id/role/level/unit` fields, adding semantic roles, parent, confidence, status and evidence. Excluded outline items use `role: lead-in`, with a separate semantic role and null level; the parent must inspect this before passing records to a consumer. No current table annotation consumer was found, so the table ledger explicitly declares a candidate contract requiring a parent adapter. It must not be represented as already integrated metadata.

The remaining content work is completing the 288 conservative tables’ header associations and explicit shared-span semantic groups if additional transformations are wanted, and resolving the nine empty topics. The ledgers preserve those unknowns. The next integration parcel can apply the verified subset after reconciling hashes against its current source.
