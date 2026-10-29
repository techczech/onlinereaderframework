---
title: Independent security and write-path review of reader root-subdomain migration
created: 2026-10-29
reviewer: Codex gpt-6.1-sol
verdict: clean-in-scope
scope: retained reader patch only
---

The reader migration is **clean in scope**. No reproducible security or write-path finding was identified. The newly permitted converted-book root base changes public URL assembly, not filesystem output authority. No new path opens an unsafe write.

## Reviewed source and provenance

The retained patch exactly equals the diff reconstructed from all three baseline copies and actual source: apps/reader-demo/src/canonical-sites.ts, scripts/release/edition-plan.ts and scripts/release/test-release-books.ts. The patch SHA-256 is 80f57cadff1d37132fb994e9d41efd31c37caeec45950970d026c7eb5845d37a. All 263 entries across hashes-reader-source.sha256 and hashes-reader-evidence.sha256 matched before testing and again after testing. hash-verification.json records every expected and actual source/evidence digest; actual.patch retains the independently reconstructed diff.

The seven hosts exactly match the handoff. Course Design has no canonical target and remains outside the seven-book release registry. The only functional planner change removes the converted-book folder requirement while retaining the original-book root requirement. Asset identity still comes from convertedBookIds; Vite base, agent links, canonical links, robots and header scope come from the selected site.

The threat boundary reviewed is local release generation from book data, asset manifests and canonical addresses into a guarded staged release root. Host/DNS configuration and concurrent website work are excluded. No agents, Git writes, deployment, DNS changes or production/source edits were performed.

## Independent verification

Three independent boundary tests passed in boundary-rerun.log. They compare all four converted root plans with an unusual two-level legacy folder (/archive/v2/), preserve section bytes, compare pinned covers and embed records, check all three originals reject folders, exclude the eighth demo book, and exercise traversal, output collision and asset-symlink rejection.

Two actual builds exercise Academic Reading at its canonical root and Readability at the unusual legacy folder. Assertions check bundle base, canonical and Book JSON-LD URL, sitemap, root agent links, scoped embed headers and sandbox/network restrictions. The current verifier accepts both clean controls. Every other identity from the eight-book demo registry is then injected independently into each bundle and rejected. Changed source-dirty flags, schema, site, edition base and shipped cover bytes are rejected by verifyExistingEdition. The final restored controls pass. These builds use explicitly synthetic source provenance and are not production acceptance.

Five additional converted-root write-path tests passed in independent-tests.log. The retained write suite was copied into the review folder, imports resolved to the actual source, scratch relocated here, and its original-book fixture identity replaced with Academic Productivity. It exercises edition/root/manifest symlinks, unsafe section IDs, failed verification, manifest write failure, previous-edition rename failure, edition rename failure, manifest promotion failure and rollback failure. Previous good bytes and outside sentinels remain intact; invalidated manifests stay absent, and recovery and incomplete outputs are distinguished.

The first run had six passing tests and two failures caused by this review harness expecting an embed wildcard without its separating slash. The production header was correct. The corrected boundary-only rerun passed all three tests; no production change or weakened assertion was needed. The initial invocation also found no root-level tsx binary (exit 127); the existing reader dependency was then used. Logs preserve the test diagnostics. Tailwind warned when the initial run used repository-root cwd; the boundary rerun used the reader app cwd. Bundle-size warnings remain informational.

Reproduction from repository root:

```sh
apps/reader-demo/node_modules/.bin/tsx --test docs/release-book-subdomains-2026-10-29/reader/review/boundary-variants.test.ts docs/release-book-subdomains-2026-10-29/reader/review/guard-variants.test.ts
```

The initial combined run exited 1 for the harness error described above; all five write tests passed. Final boundary command, from apps/reader-demo (exit 0):

```sh
node_modules/.bin/tsx --test ../../docs/release-book-subdomains-2026-10-29/reader/review/boundary-variants.test.ts
```

## Source inspection and preserved guards

edition-assets.ts still validates regular app files without symlink traversal, pins source cover/embed hashes and sizes, validates manifest paths and compares descriptors with the demo registry. Root and folder plans retain identical cover and embed byte records, including the selected Academic Productivity and Developing Competence covers. Their EPUB cover/projection code is unchanged in the verified source hash inventory; no EPUB generation claim is made.

release-plugin.ts still replaces all five single-book inputs and refuses missing replacements. verify-edition.ts retains exact planned-byte checks, foreign identities/content/addresses/assets, own-text positive controls, root/folder bundle references, embed inventory and embed CSP checks. The Academic Productivity attribution exception remains narrowly scoped to Academic Reading source attribution. route-checks.ts still permits only the four exact Developing Competence underscore IDs and retains reserved, duplicate and unsafe-path controls.

build-edition.ts retains guarded staging, verification before promotion, manifest-last publication and recovery. write-guard.ts retains physical containment and symlink checks; no output destination derives from the deployment base. Manifest schema and verification remain unchanged. build-release.ts still records actual source state and dirty source remains refused by verify-existing-edition.ts. Direct buildEdition callers can supply synthetic state, as before; these tests do so explicitly and do not certify provenance.

## Limits and handoff

The builder's 37 release tests, seven focused root builds and typecheck are inherited evidence, hash-verified rather than redundantly rerun. Independent tests target the newly opened root/folder boundary and converted-root fault controls. This is a manual independent patch review, not a sealed Codex Security service scan. No browser, live HTTP header, hosting, DNS, redirect, EPUB binary or clean-source production acceptance was performed. The sibling infrastructure metadata helper, untracked Czech candidate and personal website are excluded.

All disposable builds, fake repositories, sentinels and symlinks were removed by test cleanup. Only review evidence and reproducible harnesses remain in this folder. The parent can continue its already authorised clean-source build and external-host sequence; no user decision is required by this review.
