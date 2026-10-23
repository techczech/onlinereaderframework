---
title: Reader third-party notice evidence archive
date: 2026-10-23
register: FOR DOMINIK
status: runtime-version-coverage-unconfirmed-tooling-exclusion-documented
scope: encode-utf8 1.0.3, dlv 1.1.3, esbuild Darwin ARM64 0.28.2 and Rollup Darwin ARM64 4.64.7
sources: Official npm registry and upstream GitHub repositories only
---

# Reader third-party notice evidence archive

**This archive preserves evidence; it does not grant additional rights.** Read the [findings report](../../docs/result-reader-distribution-notices-2026-10-23.md) for the applicability and output-exclusion assessment.

- The provenance record maps each saved primary source to its URL and SHA-256.
- Package identity is confirmed through official npm metadata, upstream tags and tarball-to-installation byte comparisons.
- The complete `encode-utf8` notice is from a later upstream commit. Its application to 1.0.3 remains an inference.

## Records

[The acquisition provenance](provenance-reader-notices-2026-10-23.json) records official URLs, exact commits, downloaded file hashes, tarball SHA-512/SHA-1 verification and every regular-file member's installed comparison. All member comparisons succeeded. It also records the failed exact-release `LICENCE` request as HTTP 404. The full saved release tree, rather than this one absent pathname, establishes the absence of a release notice.

[The local exclusion evidence](evidence-reader-output-exclusion-2026-10-23.json) records runtime graph edges, build-script text and hashes, relevant installed-tool source lines, source/output file hashes and byte/name checks. It states the limitations of these static checks and of existing, potentially stale outputs. It contains no manuscript text.

`checksums-reader-notice-evidence-2026-10-23.sha256` hashes every other file in this directory at handoff. It excludes itself and is a byte-integrity record, not a permission decision.

## Complete primary-source notice texts

| Saved file | Source version and status | SHA-256 |
| --- | --- | --- |
| [Later encode-utf8 MIT notice](encode-utf8-1.0.3/upstream-later-LICENCE.txt) | Official commit `87cba02f7ddf8792f2e60c4b1a7c1eccf6daa3d2`; **not present at v1.0.3**. It credits Linus Unnebäck, copyright 2017–2021. | `48f761956f2709d24a8750e2fd37cf347f421125d625f48a53f03d72834d2ab8` |
| [esbuild root MIT notice](esbuild-darwin-arm64-0.28.2/upstream-LICENSE.md) | Official v0.28.2 commit; credits Evan Wallace, copyright 2020. The separate [npm/esbuild notice](esbuild-darwin-arm64-0.28.2/upstream-npm-esbuild-LICENSE.md) is identical. | `b40ec5baec7bb34fa5b1c09521fa3cd52d5fad7adafed74932a2010d3612a681` |
| [esbuild embedded xxhash notice](esbuild-darwin-arm64-0.28.2/upstream-xxhash-LICENSE.txt) | Official v0.28.2 `internal/xxhash/LICENSE.txt`. It is supporting evidence, not a complete native-binary notice inventory. | `f566a9f97bacdaf00d9f21dd991e81dc11201c4e016c86b470799429a1c9a79c` |
| [Full Rollup distribution notice](rollup-darwin-arm64-4.64.7/upstream-LICENSE.md) | Official v4.64.7 commit; includes its MIT grant and bundled MIT, ISC and 0BSD notices. It matches the installed sibling Rollup file. | `fa1bd040c5bdeefe65b3821cebf474f2733ce65df13089bd151dda1778e62fe8` |
| [Rollup core MIT notice](rollup-darwin-arm64-4.64.7/upstream-LICENSE-CORE.md) | Official v4.64.7 commit. The full distribution notice above supplies additional notices; neither is asserted to inventory all native Rust dependencies. | `9dff12bb776f199482bc21fb2aba9615032c0403d19cfd1fa0bf101a9379b146` |

The official raw source URLs appear beside each saved file in the acquisition provenance. No complete `dlv` notice was found in its exact release; none was fabricated. Small tarballs and their member bytes are retained for `encode-utf8` and `dlv`. Native tarballs were downloaded and checked, but only their identity/member hashes and source metadata are retained.

## Methods and bounded investigation

`collect-reader-notice-evidence.py` uses only Python's standard library, official registry endpoints and commit-pinned upstream files. It runs no package code or Git commands and never extracts an archive to the filesystem. Tar members are read in memory, compared with the installation, and selected small-package member bytes are written inside this directory. Existing archived bytes are preserved; an earlier acquisition attempt is labelled when reused. The first attempt stopped on the native Rollup `0.0.0` template; the completed attempt distinguishes this template from the root release version and matching npm `gitHead`.

`capture-reader-notice-output-evidence.py` reads only named build inputs, installed manifests/tool sources and the core/demo source/output trees. It follows declared runtime and peer edges, records unresolved edges, and checks the current outputs for verbatim investigated tool files and target-name strings. It does not execute a build or assert that minified-code absence follows from a string search.

The scripts are retained to reconstruct the method. Their output files represent one snapshot and are protected against replacement; a refresh needs a separate authorised evidence destination. The native tarball integrity checks do not reproduce a compiler build and do not verify npm signatures or attestations. The investigation did not expand into general legal research or contact maintainers.
