---
title: Independent re-review of Czech reader repairs
status: PASS
reviewer: gpt-6.1-sol
register: FOR AGENTS
date: 2026-10-29
scope: Saved-state migration, table annotation boundary, exact anchor ownership and focused reader regressions
---

# Verdict: PASS within the reviewed repair scope

All three prior findings are closed by fresh independent behavioural evidence against current source and existing built output. No additional reproduced SPEC or STANDARDS blocker. No production changes, builds, Git operations, delegates, DTC requests or deployment. Authored files confined to this report and `rereview-czech-reader/`. Concurrent work preserved. Read previous independent review and repair result before testing; inspected fixture assertions rather than accepting their summaries.

## SPEC findings: previous failures closed

### Previous P1: unbacked reading positions overwritten by scroll — closed

Locator: `packages/reader-core/src/original/use-publication-reader.ts:195`, persistence effect dependencies at 201; migration at 32–38; five state writers at 41–45. Session history updates remain before the persistence guard. `saved-state-compatibility.ts:30` backs up originals before changed-field writes and returns false on storage exceptions.

Reproduction: `node apps/czech-navigator-candidate/research/rereview-czech-reader/quota.mjs` and `storage-paths.mjs`. Both use actual candidate dist routes intercepted in hidden bundled Chromium, without a server. Seed exact malformed positions `{legacy-unparsed`; selectively reject only compatibility original-position backup; load Nouns, scroll to 400, assert history records 400, navigate to Verbs, Back restores Nouns at 400, Forward restores Verbs. Assert exact original bytes and null backup after navigation. Exit 0. `quota.json` records positions, backup and Back/Forward assertion.

Extended five-case probe rejects position backup, highlight backup, read-state backup, migrated-highlight write, or all writes. Each case asserts exact malformed position bytes, no invented position backup, malformed read-state preservation, and exact highlight original retention either in its original key or its real backup. All cases still pass history navigation. Evidence: `storage-paths.log`, `quota-*.json`, `final-exits.json`. These are behavioural checks of the low-storage path, not a boolean-gate inspection.

Current-source compatibility module was separately bundled into the owned evidence folder and tested: three tests pass, covering migration by unique quote/explicit anchor, unknown metadata/ranges, original backup retention, second-run idempotence, ambiguity, malformed input, unrelated-book no-op and default agent export behaviour. No production bundle regenerated. See `source-compatibility-test.mjs`, `source-compatibility.log`.

### Previous P2: incomplete table reviews allow transforms and invalid IDs — closed

Locators: `packages/reader-core/src/original/table-surface.ts:4` validates before `restoreHeaders` at 35 and attachment at 44. Exact cell bindings emitted by `apps/czech-navigator-candidate/scripts/semantic-czech-navigator.py:71`. Reviewed sanitiser schema remains the restrictive source boundary; the adapter creates only validated namespaced cell IDs and derived header IDREFs after sanitisation.

Reproduction: run `tables.mjs` with MODE=source, MODE=bundle and MODE=candidate. Source mode transpiles current TypeScript in memory; bundle mode loads current framework dist module; candidate mode parses the actual current minified candidate asset with TypeScript AST and extracts its three table functions without rewriting their bodies. Extracted candidate code retained as `candidate-table-functions.js`. This isolates candidate table logic for malformed annotations; it is not an assertion that the entire candidate UI was booted for each malformed case.

Each mode exercises all 20 actual sanitised source-reviewed tables and 400 negative cases (20 mutations per table). Missing header map, dangling reference, existing ID collision, redistributed text with unchanged concatenation, unsafe prefix, duplicate prefix, absent cell binding, changed header tag, wrong scope, missing identity, nesting, span, caret text, wrong table identity, future-coordinate namespace collision, duplicate review, missing header pair, incorrect bound role, merge and missing column header all refuse sorting/transposition and leave table innerHTML unchanged before cleanup. Thus the original three malformed-table failures are explicitly rechecked against all three forms of current code.

Valid tables: every advertised sort column orders with Czech comparison; filtering works; identity column stays visible and at least one context column remains; transpose produces the exact matrix transpose; reset restores source cell text/order. Header assertions require each data cell to reference the actual row identity cell and actual column header in its table, with unique IDs and namespaced data-cell IDs. All 20 tables also attach simultaneously, transpose together and retain unique IDs with no cross-table header references. The full reserved namespace rejects `r999c999` collisions before a future transpose can introduce coordinates. Logs and JSON: `tables-source.*`, `tables-bundle.*`, `tables-candidate.*`; final exits all 0. Earlier copied probe summary said 320 while its extended data contained 400 cases; final harness/log summaries corrected to 400.

### Previous P2: fake anchors extracted from data attributes — closed

Locator: `apps/czech-navigator-candidate/scripts/build-czech-navigator.py:94–102`. `AnchorIds` uses HTMLParser attribute names and accepts only `id`. Fresh parser negative fixture with `data-semantic-table-id` passes (`anchors.log`). Separately parsed every generated unit and compared the complete owner dictionary for exact equality: 1230 actual IDs across 22 units; all 20 semantic data-attribute values excluded. `anchors-exact.json`. The earlier 1250-anchor claim is superseded.

## STANDARDS and security assessment

Read the existing standards source review, publication-content sanitiser/schema documentation and served-export security evidence before verdict. No additional independently reproduced standards-only blocker. Header identity defects belong to the closed SPEC finding rather than a duplicate accessibility finding. No speculative executable-injection claim: safe prefix grammar, identity/cell binding, namespace collision checks and derived header coordinates were inspected and adversarially exercised. Sanitiser continues excluding arbitrary data/event/style/name properties and executable elements/schemes. Existing zero-vulnerability audit is inherited evidence only, not a fresh dependency audit or comprehensive security assurance.

## Focused regressions and evidence binding

- Six focused framework suites: 44 tests, exit 0 (`focused.log`, commands in `runs.json`). Some compile current source in memory; saved-state suite imports dist, hence the additional explicit current-source three-test run above. Counts are not 47 distinct tests: the extra source run repeats compatibility cases.
- Current candidate actual-book browser: retained fragment and overview navigation, delegated cross-unit fixture link, explicit chapter top, Back/Forward at 731px, Resume at 613px, actual migrated quote rendering, unknown/range retention, unchanged overview ticks, Word Order search navigation, Formatting at 24px retained after reload and Escape focus return. Exit 0 (`browser.log`). Cross-unit link is an inserted fixture in the real content root, not an exhaustive manuscript link audit.
- Actual candidate at 390×844: reviewed table Full width opens real popover, Escape closes it and restores focus to the control; actual Formatting preference reaches 19px and persists across reload. Exit 0 (`mobile.log`). Initial mobile probe sampled before React committed the change (18px before, 19px after reload); final probe explicitly waits for 19px before comparing. This was a harness timing issue, not lost persistence.
- Fresh current EPUB coverage: 22 chapters, 308 tables, 9652 cells; exact web/EPUB cell text, lossless section HTML reconstruction and unchanged manuscript SHA256. `coverage.json`. Whole-document token accounting still differs by one generated `2` and two return arrows. EPUBCheck itself was not rerun; zero-error/zero-warning claim remains implementer evidence.
- `hashes-start.json` binds source original-reader modules, current framework original-reader output, candidate dist assets/book JSON and conversion scripts. End comparison `hash-drift.json` is empty. `final-exits.json` records final table/storage exits and zero drift. No build races introduced.

## Limits

PASS covers the three repair findings and named regressions. No complete accessibility/200%/keyboard/browser matrix, exhaustive annotation editing, every book link, all other-book release gates, source-to-bundle rebuild reproducibility, whole-document byte equality or live deployment acceptance. Runtime malformed non-object review API arguments outside the typed annotation contract were not fuzzed. Candidate malformed-table tests execute extracted actual bundle functions; live mounted reader supplies the additional navigation, persistence and mobile checks. No claim of a complete new host/static/agent-route audit; parent host review remains separate. No user action requested.
