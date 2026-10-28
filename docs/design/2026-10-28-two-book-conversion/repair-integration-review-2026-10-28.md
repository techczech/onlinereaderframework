---
title: Repairs for the two-book integration review
date: 2026-10-28
status: independent re-review owed
---

## Authored homepage summaries

Assembly now reads the three original Academic homepage card paragraphs from App.tsx with a bounded extractor that fails on missing/changed markup. It uses the fourteen descriptions already extracted from Readability navigation source. These summaries become exact chapter-opening paragraphs after the title, unless already present in that chapter. No paraphrase and no extra chapter. This deliberately relocates authored homepage descriptions into canonical prose, where reader/search/speech/EPUB/agent consumers can retain them.

The original-source renderer separately records all seventeen original homepage paragraphs. Book checking now checks their individual presence, expected counts and the licence URL. With the old prepared JSON still in place this expanded check exited 1; after regeneration all 70 checks pass. Original red and green reports have unique names in this folder. Existing review evidence is untouched. The historical zero-lost-words claim covered chapter views only; the expanded check now explicitly includes home summaries.

## Asset copying boundary

The plugin validates manifest shape, book and item identities, relative source components, .html extension, duplicate output URL and the allowed interactives root before registering middleware or emission. The app root must be physically canonical. Every source ancestor and leaf is checked for symlinks; realpath and file kind are checked. Each actual read repeats the checks, opens without following a leaf symlink, checks the open descriptor is a regular file and closes it in finally. BuildStart rechecks sources too. This is a bounded local build-configuration guard, not a claim of race-atomic filesystem security.

New focused fixture test-demo-embed-boundary.ts initially passed 1 of 11 checks on the old plugin (all ten rejection cases failed). After the fix it passed 11 of 11. Cases include valid input, escaped directory/source, absolute folder, wrong extension, query/encoded traversal, symlink leaf/directory, a leaf swapped after plugin creation, and malformed manifest. Synthetic canaries stay in repository-owned scratch and the fixture removes them in finally.

## Licence source

The assembly source, regenerated Readability JSON and provenance now use the unversioned CC BY address and explicitly state that no version was inferred. No Academic licence grant or canonical publication URL was added. The original apps and canonical Folios remain read-only.

## Evidence

repair-source-commands.json records subprocess exits; repair-source-accounting-before.json and repair-source-accounting-after.json preserve red/green. Root build/full unit logs and focused boundary output are retained separately. No live deployment, production release planner/verifier change, public source export or publication occurred. The nine HTML interaction pages were not changed by these three review repairs.

Source hashes after repair:

- apps/reader-demo/scripts/demo-embed-assets.ts: `d52920a7d87401b4ec79d496add5fb9fb27087720c848ace5769837e325d41d5`
- apps/reader-demo/scripts/test-demo-embed-boundary.ts: `c210e6c93caeb64c2eb343aeb3656519619d2ff1e90b9c8c0ddd05faaf7828ea`
- apps/reader-demo/src/books/next-books/build-source/assemble.ts: `adcfb7584d965420ea7021f2c54a56c37cf184bcce5a99d12aade73649d569e3`
- apps/reader-demo/src/books/next-books/build-source/home-summaries.ts: `8982d07b783be495cd23ef157f2181c90f01bbd0c52cfa488e41250dc13536c9`
- apps/reader-demo/src/books/next-books/build-source/render-originals.tsx: `dd6bebd058048b9b1706ad6e45d113bb65d2d7a1ec606612ac3cc7fcecf90198`
- apps/reader-demo/src/books/next-books/build-source/check-books.ts: `8582123613ce9f1619442003e2af8b58cfaf873aa70f2512247382023f625e83`
- apps/reader-demo/src/books/next-books/build-source/build-provenance.ts: `c51d805b60db49f7d2559c00c71a043a340bee50ec1c48b15e4fa4fd65bbb7ed`

Final local validation: root build completed (335 agent files generated); full npm test completed with every reported test group at zero failures; focused asset boundary fixture exited 0, 11/11. No repeat of the 438-check browser matrix after these prose and copier changes; independent focused integration re-review is next.
