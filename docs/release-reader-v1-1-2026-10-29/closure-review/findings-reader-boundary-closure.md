---
title: Independent closure review of the reader 1.1 example boundary repairs
date: 2026-10-29
register: FOR DOMINIK
reviewer: Codex GPT-6.1 Sol, independent of the repair author
status: clean-in-scope
scope: diff-only security and write-path closure of two example boundaries
---

**Verdict: CLEAN IN SCOPE.** Both original P2 findings are closed in the exact repaired exported candidate. No remaining actionable defect was found within these repairs and their direct regressions.

- Linked embed source files and directories are refused before any previous build output changes.
- Linked preview roots, ancestors and metadata leaves are refused before metadata is read. Replacing the root with a link after startup returns 404.
- Both ordinary example modes build successfully and pass all ten example tests. The source, candidate and earlier evidence remain unchanged, and review scratch is removed.

## Candidate and reviewed changes

I read the previous independent findings and the parent's boundary-repair receipt. I compared the corrected archive directly with the preserved pre-repair archive and reviewed the resulting four member diffs saved here. No Git commands were used.

The corrected archive has SHA-256 `479728473301002b3fc6ad5da09166bc0f30653a805bb2abc0eb1ac51e05c390`; its uncompressed tar has SHA-256 `a24e3d2054bee50b879fc0570c951f07e35a00dbafd183e9d4c9c18c5ff5790f`. All 146 members are regular files. Each member matches the saved repaired manifest and the corresponding file in `build/public-reader-source/`.

Exactly four archive members changed: `examples/reader-example/build.mjs`, `serve.mjs`, `test-example.mjs`, and `provenance-reader-source.json`. The provenance changes are exactly six scalar values: the byte lengths and SHA-256 values of those three example files. All other 142 members are byte-identical. The three repaired private-source files match their recorded hashes and exported counterparts.

The build now confines embed targets lexically to `embeds/`, checks each source component for symbolic links, opens the leaf with `O_NOFOLLOW`, requires a regular file and captures the sources before removing the previous output. The preview canonicalises its root, requires a real directory whose canonical path equals its absolute lexical path, and applies that check both during metadata resolution and on each request. The saved diffs show no interface, dependency, hosting-header or CSP change.

## Independent reproductions

Run `python3 docs/release-reader-v1-1-2026-10-29/closure-review/run-reader-closure-review.py` from the owning repository. The runner exits **0** on the reviewed candidate. It extracts the actual archive into one owned `build/` scratch folder. It reuses only real lockfile-matched public npm cache records through the existing cache-copy helper, then runs the actual offline installer and build commands. No gate or dependency was stubbed. Runtime: Node **v26.12.1**.

**Embed source refusal:** After a successful embedded example build, I replaced its source HTML leaf with a link to valid outside canary HTML. `npm run example` exited **1** with `Refusing a linked path: embeds/line-spacing.html`. I then replaced the source directory with a link to that outside directory. The command again exited **1**, with `Refusing a linked path: embeds`. Both refusals preserved the complete previous output inventory: all **129 files**, their names and SHA-256 values remained identical. The outside canary also remained unchanged. Evidence: `refuse-embed-leaf.log`, `refuse-embed-directory.log`, and `sourceLinks` in `results-reader-closure.json`.

**Preview startup refusal:** The independent `probe-reader-preview-closure.mjs` runs against the extracted server. It checks an explicit linked root, a default linked `dist/`, a linked ancestor and a linked metadata leaf. All four cases return null from metadata resolution and throw the explicit startup-refusal error. The probe observes `readFileSync` metadata calls through Node's synchronised built-in ESM exports: **zero metadata reads** occur in each refused case. A real-directory positive control observes exactly one metadata read, demonstrating that the instrumentation reaches the server's read operation. The default-root fixture copies the unmodified exported server and header modules and calls `createPreviewServer()` without an argument.

**Preview request regressions:** With a real root, ordinary GET and HEAD requests return **200**. Linked descendant files and directories return **404**, without the outside canary. Renaming that real root and replacing it with a link after startup also returns **404** for the outside canary request. The probe closes its server and removes its fixtures in `finally`. Evidence: `preview-boundaries.log`, exit **0**.

**Supported example flow:** The genuine offline `npm run setup`, core `npm run build`, embedded `npm run example`, and `npm run example:no-embeds` each exit **0**. `npm run test:example` exits **0** with **10/10 tests passing in each mode**. These suites exercise ordinary output, local preview responses, hosting headers, agent text, embed presence or absence, existing path guards and the three new regression tests. Full output and actual exits are preserved in the corresponding logs and `results-reader-closure.json`.

## Preservation and limits

Before/after inventories cover regular files in the owning repository, including source, candidate, release evidence and preserved archives. They exclude `.git`, installed `node_modules`, and this new review folder. **Zero differences** remain after the runner removes its scratch in `finally`. `integrity-before.json` and `integrity-after.json` preserve the observations. A separate final read-back is recorded in `integrity-reader-closure-final.json`.

This is a focused closure review of the three repaired example files and their derived provenance. It does not reopen the exporter, privacy guards, public-copy design or unrelated framework. The prior whole-framework/private/browser evidence remains inherited evidence, not a new independent pass. No browser or installed Chrome was used. No production files, previous evidence, Git state, publication or deployment were modified by this review.

The checks establish static symbolic-link refusal and the tested post-start root replacement. They do not establish race-atomic protection against concurrent local mutation between filesystem checks and reads. No broader race or obfuscation architecture is inferred.

The private source remains a dirty candidate; this verdict is not a clean-source or publication verdict. The parent retains the authorised commit, clean regeneration and publication work. It should compare that regenerated public projection with this accepted snapshot and publish only the reviewed projection to `techczech/onlinereaderframework`, never private history.

No action is required from Dominik while the parent continues the authorised release work.
