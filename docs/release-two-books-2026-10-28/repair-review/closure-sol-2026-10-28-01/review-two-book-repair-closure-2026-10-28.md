---
title: Independent closure review of the two-book publication repairs
date: 2026-10-28
register: FOR DOMINIK
reviewer: gpt-6.1-sol
status: clean-in-scope
---

# CLEAN IN SCOPE

- **The foreign-book identity finding is closed.** Both Academic Reading and Foundations of Readability reject all four other books' IDs in structured registry entries.
- **The linked-record refusal finding is closed.** Existing and dangling record links return `ok:false` before staging, with host and outside-canary bytes unchanged.
- **The direct regressions pass.** Ordinary prose, longer IDs, section-ID false-positive controls and rollback retain their expected behaviour.

This independent review covers only the repaired publication-isolation guard and importer refusal/cleanup path, plus their direct regressions. There are no actionable findings in this scope. The parent session owns publication and deployment. **No action is needed from Dominik.**

## Publication isolation

The original failure let a foreign registry identity pass the edition verifier. The repaired `bookIdPattern` in `apps/reader-demo/scripts/release/verify-edition.ts` now enters the common boundary-pattern loop for every other book. The existing-edition verifier calls that same function with the other books supplied by its caller.

The independent probe builds both actual converted editions using the current release builder and app, in isolated review scratch. Both unmodified editions pass. For each of the eight edition/foreign-book pairs, five payloads are appended separately to the main bundle: an `id` value, a quoted `bookId` value, a backtick `book_id` value, a `data-book-id` attribute, and an object keyed by the foreign ID. **All 40 mutations fail with the corresponding foreign-book-ID diagnostic through both verification functions.**

Before each existing-edition check, the scratch manifest's file list, hash and totals are recomputed. Its cleanliness field is set to `sourceTreeDirty:false` only in the scratch manifest. This prevents stale-manifest rejection from masking the common semantic guard. These are synthetic verification fixtures, not clean-source release evidence.

The identity helper also passes **96 focused assertions** across all eight pairs: 64 refusal cases cover quotes, whitespace, newlines, escaped JSON and keyed objects; 32 acceptance cases cover prose, longer IDs and unrelated property names. A further 16 harmless bundle additions pass both verifier functions. Existing section-ID tests retain identifier refusal while allowing ordinary words and longer heading anchors. The probe separately confirms the `accessibility` and `reader-content-cognitive-load-model` controls.

## Import refusal and rollback

In `scripts/import-reader-books.ts`, the previous headers and record are read inside caught preflight, before `planBook` can stage editions. Record existence uses `lstatSync`, so a dangling link is present and reaches the regular-file refusal guard. The earlier headers/record bytes remain available to rollback.

Independent fixtures exercise a record linked to an existing outside canary, a dangling record link, and a directory in place of the record. **All three return `ok:false`, make zero verifier calls, create no staging directory and preserve the host snapshot and outside canary.** Snapshot comparisons include link destinations, existing headers, the record, unrelated host content and an untouched third-book folder.

Six additional probes inject failure after staging, after the first move, after all moves, before headers, before the record and after the record. Each starts from a successful two-book fixture import. Every refusal preserves the previous host snapshot and canary; all five write-phase failures report `restored:true`. No staged editions remain. An empty importer work directory may remain after refusal; its absence is not the rollback contract.

## Evidence and reproduction

The authoritative independent run is `evidence-two-book-repair-closure.json`, collected by `probe-two-book-repair-closure.mts`; raw output is `log-two-book-repair-probe.txt`. It exits 0 with two editions, 40 identity mutations, 96 helper assertions and nine importer scenarios. Scratch is removed in `finally`.

From the reader app directory, run:

```sh
node --import tsx ../../docs/release-two-books-2026-10-28/repair-review/closure-sol-2026-10-28-01/probe-two-book-repair-closure.mts
```

Use a new evidence folder and adjust the probe's output location for another run; preserve this run's files.

The existing focused converted-book test file was copied into this evidence folder with only import/app/scratch locations redirected. It passes **9/9**, exit 0 (`log-reader-repair-tests.txt`). The existing importer test file was copied with only import/root/scratch locations redirected. With `DLNET_SKIP_BUILD=1`, it passes **35/35**, exit 0 (`log-importer-repair-tests.txt`). Both retained copies remove scratch through their existing teardown hooks. No website build or browser matrix was repeated.

The first probe launch had a review-script syntax error before any fixture was created. Two preliminary runtime records are retained: the first used an invalid synthetic source-commit value; the second required absence of the empty rollback work directory. The final probe corrects those fixture assumptions. These were review harness errors, not production findings. The preliminary evidence is preserved under `preliminary-` and `preliminary-02-` names.

All four repair-receipt source hashes match before and after the independent final run:

```text
1ab50b7f75958e424b8e9762c384d252229659abddeba725790841baeecd275d  reader/apps/reader-demo/scripts/release/verify-edition.ts
a01501a698195d30270b777b14f7a6dbd1361deffe827815328ac22f84197209  reader/apps/reader-demo/scripts/release/test-release-books.ts
f207bc970caeb75e4ce357d76716d408dcc7b4e837f95ffff1d955c0c00ff54e  website/scripts/import-reader-books.ts
0dbe2c131b12e857812ae6e1e55a81a53c538e3c6dbb260e83ef9f3f03a2c86e  website/tests/reader-books.test.ts
```

`hashes-two-book-repair-closure.json` records these source paths and the retained final evidence, probe, test-copy and report hashes.

## Limits and handoff

The builds explicitly record dirty source. The synthetic manifest adjustments and importer verifier callback are confined to transaction/semantic fixtures. **This review makes no clean-source or deployability claim.** It does not cover arbitrary obfuscation, the whole release architecture, broader website/browser matrices or delivered Cloudflare headers. No browser or installed Chrome was used.

Only this new review evidence folder was written. No production change, commit, push, deployment, production import or agent dispatch was performed. Earlier review and repair evidence was preserved. The parent retains clean-source release verification, pinned import and deployment ownership. No action is needed from Dominik.
