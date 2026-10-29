---
title: Independent Czech reader integration review
status: request-changes
reviewer: gpt-6.1-sol
date: 2026-10-29
baseline: 71cdeb6
scope: Stable reader, table surfaces, navigation, compatibility and semantic integration
---

# Independent Czech reader review: request changes

The stable integration requires changes. A reproduced backup-failure path overwrites unbacked saved-position bytes. The reusable table adapter accepts malformed header annotations and creates duplicate IDs. The generated anchor map also contains twenty entries that are not DOM anchors.

This review was independent of the builders. No subagents, production edits, candidate builds, deployment, staging, reverts, commits or pushes were used. All authored evidence is in `research/review-czech-reader/`. The selected design receipt was read directly: Editorial atlas reading with Reference desk table controls. All four requested implementation reports were read as claims, then checked against code and tests.

## SPEC findings

### P1 — Scrolling persists positions after the required original backup failed

Location: `packages/reader-core/src/original/use-publication-reader.ts:183–200`, particularly lines 184 and 196. Migration failure disables the five `useBookState` persistence hooks, but the separate position listener ignores `migrationAvailable`.

Reproduction: `node apps/czech-navigator-candidate/research/review-czech-reader/quota.mjs` exits 0. The isolated browser starts the real Nouns reading unit with original `readingPositions` bytes `{legacy-unparsed`. Storage rejects only the compatibility backup write for that field. After scrolling to 400px, the original becomes `{"nouns":400}` and the backup remains null. Exact output is `review-czech-reader/quota.json`.

Impact: failed migration can destroy the only retained original position record. The same missing gate also permits writes following other migration failures. This contradicts the safe-backup and malformed-state preservation contract. It is a reproduced write-path defect, not a screenshot inference.

Bounded fix: make position persistence honour migration availability, including backup failure, before writing. Preserve the original bytes and keep session-only navigation functional. Add a hydration-plus-scroll regression with selective backup rejection; rerun migration and navigation tests. This write-path fix needs independent re-review.

### P2 — Malformed table reviews still unlock transformations and unsafe ID associations

Location: `packages/reader-core/src/original/table-surface.ts:8–19` and line 56. Eligibility checks only table identity, concatenated text, lack of spans and row width. Header-map completeness, reference targets, prefix validity and collisions are not validated before transformation controls or post-sanitiser IDs are applied.

Reproduction: `node apps/czech-navigator-candidate/research/review-czech-reader/tables.mjs` exits 0. It transpiles the current source directly in memory and probes all twenty current reviewed tables in bundled hidden Chromium. `tables.json` records each case. Removing `headers` still enables sorting/filtering/transpose. Replacing a header reference with `r999c999` still enables transforms and installs a dangling IDREF. Adding an existing element with the generated first-cell ID yields duplicate IDs. These results repeat across all twenty reviews. The code never checks those conditions.

Impact: the reusable framework fails the required conservative fallback for missing or malformed annotations. Duplicate IDs and dangling references break accessible header identity and fragment targeting. This evidence establishes an annotation-validation seam; it does not establish executable script injection or a credential exploit.

Bounded fix: validate the complete runtime review before enabling transforms or restoring attributes. Require safe unique prefixes, collision-free cell IDs, valid in-table header coordinates, correct header roles and complete required associations. Reject invalid maps conservatively. Bind individual cell shape/content identities rather than relying solely on concatenated `textContent`. Add refusal tests for these cases and re-review the sanitiser boundary after repair.

### P2 — The compatibility map invents twenty anchor destinations

Location: `apps/czech-navigator-candidate/scripts/build-czech-navigator.py:95`, the `re.findall(r'\bid="([^"]+)"', unit['content'])` loop.

Reproduction: `review-czech-reader/semantics.json` records 1250 map entries but `anchor_map_exact: false`. Parsing actual HTML attributes finds 1230 IDs. The twenty extra keys are the reviewed tables' `data-semantic-table-id` values, such as `czech-semantic-table-d3f5e0559067b5ea55f3`. The regex also matches the `id` suffix inside that data attribute. These keys have no corresponding DOM element ID.

Impact: an explicit saved anchor using one of these values is treated as a recoverable owner, and direct navigation can select a chapter without a fragment target. The claim that all 1250 map entries are retained real anchors is false. This does not show that the real 1230 anchors were lost.

Bounded fix: extract actual `id` attributes with an HTML parser and compare the generated map with parsed rendered IDs. Add a negative control containing `data-semantic-table-id`. Preserve existing genuine anchors; do not manufacture additional source IDs to satisfy the count.

## STANDARDS findings

No additional independently reproduced standards-only blocker was established. The malformed ID/header issue above also affects accessibility and belongs to the SPEC finding rather than a duplicate finding. A complete accessibility or security audit was not performed. The available served-export security JSON reports zero npm vulnerabilities; this is dependency-audit evidence, not a code-security harvest or proof that the adapter is secure.

## Fresh verification

Commands were run from the framework repository root. Logs record commands and exit codes where applicable.

- Seven focused Node suites passed, 47 tests total, exit 0 (`focused.log`). They cover compatibility, fragments, original reader, publication navigation, outline preferences, reading preferences and front page. Existing migration tests retain unknown metadata and range fields, avoid overview tick expansion, and cover ambiguity and backup exceptions. They do not catch the scroll-listener failure above.
- Agent-export core tests passed, 26 tests, exit 0 (`agent.log`). Content tests passed, 23 tests, exit 0 (`content.log`). These results do not accept the concurrently edited served outputs.
- Existing semantic-binding tests passed, four test methods, exit 0 (`bindings.log`). The test was evaluated with its temporary directory redirected inside the owned evidence folder. It rejects stale source, wrong source ID, invalid spans and missing identity annotation.
- Existing coverage check passed, exit 0 (`coverage.log`), with only its output destination redirected. Current EPUB has 22 chapters, 308 tables and 9652 cells. Web and EPUB cell text matches exactly; generated section HTML reconstructs the edition. Whole-document token accounting still reports one generated `2` and two return-arrow differences; it is not byte-identical whole-document text evidence.
- Exact role application was checked against actual HTML tags and owners: all 481 match; nine unresolved topics remain. Prefix labels, empty heading cells and lead-ins are paragraphs, not headings. The archived manuscript equals baseline Git bytes; its SHA256 remains `15cd2e53891ee72399775be88900e9ba867c54302894467545500ed5e187633f`. No `/Users/`, `/private/` or `file://` patterns occur in the generated book JSON (`semantics.json`). Licence bytes in that manuscript are consequently unchanged.
- Every approved sort column on every enabled table was exercised against current source. Czech comparator order and exact row/cell-text source reset passed on all twenty (`tables.json`). These probes also produced the malformed-review findings above.
- The final actual-book browser harness exited 0 (`browser-final.log`). It used bundled hidden Chromium and intercepted existing candidate build files without a server. It exercised a retained legacy overview fragment, section-only overview, explicit chapter top, same-chapter top, Back/Forward at 731px, Resume at 613px, migrated actual Nouns quote rendering, preserved unknown/range fields, overview tick retention and Word Order search navigation. The cross-unit inline-link exercise inserts one fixture link into the real content root; it does not audit every manuscript inline link.
- Actual Formatting UI controls raised body text from 20px to 24px, retained 24px after reload, and Escape returned focus to Formatting. This uses the real preference UI, not CSS-only enlargement. `current-desktop.png` records the tested state. An initial harness used the obsolete Text and focus control, and another used incorrect accessible-name casing; those harness failures are retained in `browser.log`. They are not product failures.

## Visual judgement and evidence limits

The selected Editorial atlas desktop reference, existing combined focus screenshot and fresh current desktop screenshot were inspected. The masthead, ivory/navy palette, large serif chapter opening, folio, side navigation and table focus composition follow the chosen direction. The integrated reader includes its existing annotation/search/preferences controls and the full manuscript. No additional material unapproved visual divergence was established in this bounded inspection. Existing composition screenshots show the Reference desk side controls; they are inherited visual evidence, not a fresh full-width/mobile pass.

The current preference interaction is verified at 24px desktop. A complete 200% preference/browser matrix, fresh mobile focus/scroll coverage, all keyboard shortcuts, note/bookmark editing, every retained fragment, every source inline link, Unicode normalisation variants, dependency/caret refusal, per-cell transpose header semantics and full static fallback accessibility remain unverified in this review. Existing builder logs are not substituted for those checks. Unknown positions remain recoverable through originals only where backup actually succeeds.

EPUBCheck's existing semantic log reports zero errors and warnings; EPUBCheck was not rerun. Current archive coverage was independently rerun. No claim of a fresh framework build is made: the reviewer avoided changing generated framework output or racing candidate builds. Node suites and actual-book navigation used existing built modules/assets; direct table refusal probes used current TypeScript. Source inspection and the owned hash manifest bind the stable reviewed files, but this does not establish complete source-to-bundle reproducibility.

## Exclusions and handoff

The baseline manifest is `manifest-start.txt`; the explicitly scoped file hashes are `scoped-hashes.json`. Rechecking those hashes at the end found no drift (`stable-scope-drift.json`). Unrelated dirty files and WMF image changes were preserved. Host `main.tsx`, `index.html`, package changes, new host build/test scripts, public agent files, `llms.txt` and complete no-JavaScript HTML are excluded from acceptance. They require the parent's later review after the host worker completes. This read-only review does not require no-JavaScript host closure now.

Existing other-book canonical-domain/release-isolation failures remain documented by the builders. They were neither weakened nor rerun here; shared cross-book release acceptance remains unknown. No proof of deletion outside output roots was observed in the inspected converter changes: no new recursive deletion is introduced there. Symlink/output-root adversarial testing was not performed. No deployment or public-host acceptance is implied.

The parent should repair the backup gate first, then table review validation and anchor extraction, and rerun the focused negative probes. Security/write-path repairs need independent re-review. No DTC request or user action is requested by this review.
