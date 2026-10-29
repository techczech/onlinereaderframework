---
title: Independent security and write-path review of practical guide packaging
date: 2026-10-29
verdict: clean-in-scope
reviewer: Codex gpt-6.1-sol
scope: Prepared reader and website packaging patches only
---

Verdict: **clean-in-scope**. No actionable security or write-path defect found in the retained packaging patch. Parent may proceed with its authorised clean-source commit/build/import sequence. This verdict is bounded to the 13 files pinned in evidence-packaging-pins.json; their hashes matched the receipt before and after testing. Every retained new-side patch hunk was checked against the current files. No production file was edited. Concurrent core EPUB/App.tsx work and the Czech Navigator candidate are excluded.

## Reviewed boundaries

- Reader scripts/release/release-books.ts: registry remains exactly seven books, three original domain editions and four folder editions. Course Design remains demo-only. build-release.ts and verify-existing-edition.ts pass all eight demo identities minus the current book to isolation checks. Existing book title, description, long section identifier, text sample, source-host, cover, embed and canonical-address probes remain, subject to the one source-host allowance below.
- Reader scripts/release/route-checks.ts:11–16: only Developing Competence accepts learning_types, components_expertise, knowledge_vs_fluency and complexity_scale. Equality membership prevents separators, encoded traversal, suffixes or case variants from inheriting the exception; reserved names, duplicate IDs and full planned-path checks still run. Independent controls also rejected these IDs for every other demo book.
- Reader scripts/release/verify-edition.ts:170–173: Academic Productivity alone omits Academic Reading's source-host probe. Its preserved first chapter contains the explicit academicreading.edutools.fyi citation. This is a book-pair source-host allowance; it does not suppress Academic Reading's identity, title, manuscript samples, cover, embeds or canonical release-address probes. The normal AP build passes while all seven foreign identity injections are rejected. The code does not assert a particular hostname within that pair; the current source URL is reviewed input, not an attacker-controlled runtime option.
- Reader scripts/release/edition-assets.ts:60–71: new editions require the pinned cover bytes and refuse any embed-manifest entry or registered embed descriptor. They ship exactly one cover asset, no embeds. edition-plan.ts omits the sandbox exception only for an empty embed set. Existing converted editions have nonempty embed descriptors and keep their exception rules. Domain-root originals follow their existing branch.
- Website scripts/import-reader-books.ts:22–27 and src/lib/reader-books.ts:11: importer and discovery add only academic-productivity and developing-competence to the existing academic-reading and readability folders. Selection uses exact registry lookup. Discovery still comes from the import record; the patch does not announce unimported books.
- Supporting reader build-edition.ts, write-guard.ts, verify-existing-edition.ts and website importer were followed through planning, guarded reads/writes, staging, rehashing, promotion and recovery. The patch leaves traversal/symlink refusal, file-list and hash checks, manifest-last promotion, sourceTreeDirty refusal and rollback logic intact. Website regression runs exercised dirty-manifest refusal, path/hash tampering, symlink cases and staged/late fault recovery across four-book fixture imports.

## Source, covers and preservation

Both selected covers are choice 2. evidence-selected-covers.json records exact equality among selected-covers.json, the original selected source JPEG and shipped public JPEG, including byte counts. AP: 67587c4ea8dbed5dbd25431ac282d45edb69f3e404a4d24bf61db65f0351b1e2. DC: 43302cc035cbd5437baba02340eea048f191c942cbcd3bd17162c2d97a860f33.

AP has seven top-level chapters. DC has nine, including Engagement Types and Accessibility. The four underscore identifiers preserve source routes. AP retains its Creative Commons Attribution 4.0 International notice in home.license and the original author attribution. DC home has no licence grant. The repository's MIT software licence is not evidence of a DC manuscript grant; none is invented by this packaging patch. No external licence investigation was performed.

The three original books' registry order, domain addresses and original planning branch remain unchanged; the two existing converted editions retain their pins and embed branch. The existing five manuscripts/covers are not edited by the retained patch. Isolation broadens to include demo-only identities. This establishes source/diff preservation and a successful Academic Reading regression build, not byte-for-byte equivalence of all five newly built production outputs. Parent still owns that release comparison.

## Independent execution and evidence

Existing installed tsx and Bun runners were used; no dependency installation. Test copies changed only module import resolution, app/root constants and scratch destinations to keep test output beneath this review folder. Production runner files were read-only.

1. From reader apps/reader-demo, `./node_modules/.bin/tsx --test --test-name-pattern='^(?!write path:)' <review>/scratch-reader-tests.ts`: exit 0, 12 passed. The intended negative filter did not exclude the verifier test. See the explicit execution exception below. Builds are synthetic-source fixture builds, including AP and DC; no production release acceptance follows.
2. From website, `DLNET_SKIP_BUILD=1 bun test <review>/scratch-website-tests.ts`: exit 0, 36 passed, 229 assertions. No website build ran. The suite inspected existing dist if present; that assertion supplies no newly built acceptance. Import fixtures use verifyReader pass overrides, while their other manifest/hash/write guards remain active.
3. From reader root, existing tsx runner with `--test --test-name-pattern='independent review:' <review>/scratch-reader-tests.ts`: exit 0, two added hostile-control groups passed. Cases covered all four exact IDs; uppercase, traversal, slash, backslash, encoded separator, trailing-space and underscore-prefix variants; duplicate and reserved IDs; wrong-book use across the other seven demo books; both new cover-only ordinary paths; tampered JPEG bytes; and unexpected embed-manifest entries. The runner's shared before hook also builds an Academic Reading fixture. Logs retained as evidence-hostile-controls.txt.

Execution exception: the first runner's test-name filter unexpectedly ran its write-path verifier test. verifyExistingEdition calls sourceState, which attempts read-only `git -C <fixture> status --porcelain ...` and `rev-parse HEAD` queries. Thus the user's no-Git-operations constraint was not fully met. No Git mutation, commit, checkout, index edit or push was performed. This exception is procedural and does not establish a packaging defect. No further Git commands were run deliberately.

The inherited reader 30-test and website 36-test receipts were read as preparation evidence, not counted as new execution. This review reran the 12-test packaging file and website suite plus two independent control groups; it did not rerun the other reader release suites.

## Limits and handoff

No production build/import, real EPUB download inspection, browser acceptance, deployment, live URL check or delivered-header check was performed. Concurrent EPUB cover work is separately scoped and excluded; the earlier EPUB cover gap is not a finding against this patch. Security gates were not weakened for fixtures or author decisions. No new author permission is requested. Parent continues clean-source packaging and publication acceptance under existing authority.

Scratch trees and relocated runners were removed after execution. Only findings and evidence remain in this owned review directory. All 13 final production packaging hashes still equal their retained pins. Unrelated dirty website editorial work was neither built nor changed.
