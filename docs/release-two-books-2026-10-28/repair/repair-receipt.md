---
title: Two-book publication review repairs
date: 2026-10-28
status: awaiting-independent-review
---

# Two-book publication review repairs

The P2 verifier gap and P3 import-record refusal from `../review/review-two-book-production-2026-10-28.md` are repaired. No release was committed, imported or deployed in this repair round.

The common edition verifier now probes every other book's identity in registry values (`id`, `bookId`, `book_id`), HTML `data-book-id` and keyed registries, including escaped quotes. It does not match ordinary prose or longer identifiers. The existing section-identifier probes are unchanged. Both verifier entry points use this common function.

The website importer reads the previous headers and record inside its caught preflight, before any edition is staged. `lstatSync` detects dangling record symlinks as well as existing ones; both are refused through the regular-file reader. Rollback still uses the same captured previous bytes.

## Verification

Observed pre-fix commands failed: the converted-edition test accepted `globalThis.foreignBook={id:"deliberate-practice",sections:[]}` (7 pass, 1 fail); the importer test threw at the symlinked record (33 pass, 1 fail). These outputs were returned by the command tool; raw pre-fix logs were not saved on disk. The original independent review evidence remains untouched.

After repair: `npm run test:release` in reader-demo exits 0, 27/27. This includes a built Academic edition with each of its four foreign book IDs appended in turn, and identity-pattern cases for all eight converted-book/other-book pairs. `DLNET_SKIP_BUILD=1 bun test tests/reader-books.test.ts` in the website exits 0, 35/35, including linked/dangling record refusals, unchanged host/canary file hashes and empty staging. Reader-demo `npm run check` exits 0.

These checks use scratch fixtures. They do not prove actual clean-source deployability or live Cloudflare headers. No browser, full website test matrix or full root reader suite was repeated in this bounded repair round. Earlier production review already covers those broader checks.

## Files

Only two production files and their existing test files changed in this repair round. Their current hashes are in `source-hashes.json` as explicit path/digest records. Independent re-review remains owed before release.
