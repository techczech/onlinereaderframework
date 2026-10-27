---
title: Independent review of the reader v1 MIT public source candidate
date: 2026-10-27
register: FOR DOMINIK
reviewer: Codex GPT-6.1 Sol, independent of the source builder
status: blocked-two-material-findings
scope: Source exporter, release templates and the exact 125-file public source archive; book release application and scripts excluded
---

# Independent reader source release review

- **Two exporter defects block acceptance:** a privacy exception accepts longer private file addresses, and filesystem aliases permit reads, deletion and writes outside the intended directories.
- **The current candidate passes the content and package checks below.** Its archive matches the expected hash, all 125 files match the manifest, and no source input changed during the recorded review interval.
- **Independent offline installation, build, 108 exported Node tests, native imports and README examples passed.** These results do not close the two guard defects.

## Reviewed snapshot and authority

The reviewed archive is `build/reader-source-release.tar.gz`, SHA-256 **`c030a57cb4aeb1ec30ea15d023f7acf76e0de243b95692c706e0786c1058223d`**, 223,581 compressed bytes. It contains 125 regular files, including 92 runtime TS/TSX/CSS files and 11 Node test/runner files. The directory, tar members, manifest hashes and sizes, and the public provenance file's 124-file input projection agree exactly. The provenance file cannot include its own hash.

The exporter reviewed here has SHA-256 `a900cddd1a8a4b0c2fec3b184c76ab167441cecac223aae485b8caf9da9494c9`. The builder recorded source commit `24ff25434457928cacdfedc8f91645d58c2615c0` with uncommitted work. This review accepts that as a hashed working-tree snapshot, not as a clean-commit verdict. Every builder-recorded input hash matched the current source. The independent start and end snapshots recorded no input or candidate changes.

The author has already authorised MIT v1.0.0, the GitHub Pages project site, the personal website link and credit/links to the readability and academic-reading guides. No further author approval is required for that scope. Future “Built with” links on books are excluded. Publication must use the parent's clean public checkout and allowlisted snapshot, without the private branch history.

Evidence is private in [the review evidence folder](evidence-review-reader-v1-public-release-2026-10-27/). This review changed only this document and that new folder. It made no production changes, Git mutations, credential access, external writes, publication, deployment, browser/screen operations or delegations.

## Specification review

### P1 — The exact-literal privacy exceptions also suppress longer private file addresses

**Location:** `scripts/prepare-reader-source-release.mjs:145-146,160-169`, especially the unconditional substring replacement at line 164.

The exception for `file:///etc/` removes that prefix from any longer address in `agent-export.test.mjs`. For example, `const privateFixture = 'file:///etc/private-manuscript.md';` survives the actual `keepGenericTests` transformation, and the final `audit` returns `issues: []`. The exception for `file:///Users/reader/dist/agent/` likewise permits `file:///Users/reader/dist/agent/private-notes.md`. Neither longer address is an approved synthetic literal. The same `/etc/` address in another exported source file correctly fails, so this is a path-specific exception failure, not an absent scanner rule.

This violates the requested exact synthetic exceptions and the requirement that an exception must not suppress a real private path. **No such unintended address was found in the reviewed candidate.** The blocker is the demonstrated acceptance of one by its release gate.

Reproduction, from the repository root:

```sh
node docs/evidence-review-reader-v1-public-release-2026-10-27/probe-reader-source-guards.mjs
node docs/evidence-review-reader-v1-public-release-2026-10-27/assert-reader-source-release-safety.mjs privacy
```

The observation probe exits **0** and records `privateLiteralRetained: true, issues: []` for `longer-private-url-survives-filter-and-final-audit`. The safety assertion exits **1**, because the required rejection does not happen. See [the guard results](evidence-review-reader-v1-public-release-2026-10-27/result-reader-source-guards.json) and [the failing assertion](evidence-review-reader-v1-public-release-2026-10-27/log-reader-source-assert-privacy.txt).

**Required correction:** recognise complete approved fixture literals with the reviewed occurrence/context constraints. Reject a longer address, an additional unreviewed occurrence and an unapproved literal in the same file. Continue auditing all remaining text and manuscript spans.

### Specification checks that passed

The current archive contains no book corpus, snapshots, original reports, private review reports/verdicts, installed dependencies, generated distributions, source maps, environment/credential files or Git history. Its public provenance contains the curated component origins, relative source names/hashes and test transformations. The source comments also retain origin attribution to ReadFlex/WriteFlex; those are source provenance, not private reviewer reports.

The actual 12,831 manuscript anchors produced no matches across all 125 candidate files. An injected actual manuscript anchor and its JSON-escaped form were both rejected. Empty manuscript input throws instead of disabling the check. This establishes a meaningful heuristic exclusion check; it does not make short, reformatted or arbitrarily encoded fragments detectable. The installed **Gitleaks scanner separately scanned the candidate with redaction, exited 0 and reported no leaks**; its result is retained without credential values.

The generic-test transformation reproduces the candidate exactly: 15 generic agent tests remain, the 11 corpus/other-checkout tests are removed, and both single-test omissions match their recorded transformations. All 92 runtime source files match current intended source byte for byte. The runtime files and the two build scripts have no working-tree diff against the existing commit; release changes in core are package metadata and the development override/lock changes.

Both exported `LICENSE` files are byte-identical to the standard MIT text, with `Copyright (c) 2026 Dominik Lukeš`. Root/core manifests consistently declare version 1.0.0, MIT, the author, repository/homepage and intentional `private: true`. Core lock metadata and dependency declarations agree with the manifest. All three font notices match their installed Fontsource originals byte for byte and remain separate OFL notices; generated fonts retain those notices. The licensing document explicitly excludes books from the software grant.

The only changed dependency version is development `postcss-selector-parser` 6.1.5, with redundant nested 6.1.4 entries removed. Its cached primary registry metadata dates 6.1.5 to **2026-10-19T15:02:08.894Z**, over seven days before this release day. The independent locked install contains 6.1.5 and has no installed-version mismatches. This review did not rerun the builder's npm vulnerability audit or assess the unrelated book application's lock.

README examples type-check or execute against the built package. `PublicationReader` props, reserved/unique section IDs, the smaller `ReaderShell` contract and the documented named exports agree with current code. Agent generation is pure and writes only through the host's example; native import verifies rejection of private configured addresses and the browser-only EPUB boundary. The read-aloud description names browser voices, and EPUB documentation names its required browser APIs and supplied image bytes. No material contract overclaim was reproduced.

The static project page's canonical URL is correct. Its `style.css` resolves from `/onlinereaderframework/` to the exported `docs/style.css`, fragment targets exist, and `.nojekyll` is present. Readability, academic-reading and personal-author links are included. There is no old Markdown-upload claim or JavaScript asset dependency. These are static source checks, not a deployed-site or rendered-UI verdict. The inbound personal-website change is outside this candidate and was not independently reviewed here.

## Standards review

### P1 — Reject symlinked ancestors and output files before cleanup or writing

**Locations:** `scripts/prepare-reader-source-release.mjs:434-439` for replacement/writes; `:381-382,471-472` for build/evidence paths; `:41-43,52-60` for source traversal.

The exporter rejects a direct symlink at `build/public-reader-source`, but it does not reject a symlink at `build` or at the named archive/manifest/checksum outputs. Running its unchanged final-write block against owned synthetic fixtures reproduced both failures:

- An existing `build/reader-source-release.tar.gz` symlink causes `writeFileSync` to overwrite the target canary outside the fake repository.
- A `build` directory symlink causes `rmSync(candidate, { recursive: true })` to delete an existing canary outside that repository, then materialises the candidate there.

The corresponding source check has the same ancestor gap. A symlink at `packages/reader-core/src` is traversed by `walk`; `input` accepts the regular target file because `lstatSync` checks only the final component. Thus an allowlisted spelling is not proof that the bytes were read inside the intended source tree. This is an existing exporter containment gap within the explicitly requested review, rather than a claim that the new test filter introduced it.

Reproduction:

```sh
node docs/evidence-review-reader-v1-public-release-2026-10-27/probe-reader-source-guards.mjs
node docs/evidence-review-reader-v1-public-release-2026-10-27/assert-reader-source-release-safety.mjs writes
```

The observation probe exits **0** with `canaryChanged: true`, `outsideCanaryDeleted: true`, `outsideCandidateWritten: true` and `inputAccepted: true`. The required-safety assertion exits **1**. The control case rejects a direct candidate symlink. All “outside” targets were inside the reviewer's disposable scratch, and were removed in `finally`; no real outside file was touched. The final-write reproduction executes the actual write block with synthetic data, rather than rerunning the full production exporter.

**Required correction:** validate source/output ancestors and output leaves, refuse aliases outside the canonical intended roots, and reject symbolic-link destinations before the first destructive action. Apply the boundary to candidate, archive, manifest, checksum, evidence and scratch creation/cleanup. Add reproductions covering the two outside-canary cases and the linked source root. Re-review the correction before relying on this exporter for publication.

### Failure cleanup that passed

The actual exporter body was evaluated on cloned current inputs with Git reads stubbed and the first npm build deliberately returning **37**. It set exporter exit status **1**, wrote failed evidence, removed its created scratch directory and preserved the shared dependency directory. The observation harness exited **0** because those failure-path expectations passed. See [the cleanup result](evidence-review-reader-v1-public-release-2026-10-27/result-reader-source-cleanup.json). This verifies ordinary build-failure cleanup, not resistance to the symlink cases above or filesystem refusal during cleanup.

## Independent execution evidence

The independent run used the archive, **Node 26.12.1 and npm 11.20.0**, empty npm user/global configs and a disposable cache containing lockfile-matched public registry entries. The real offline install succeeded: 200 packages installed, no non-optional dependencies missing and no locked-version mismatch. No registry fetch was needed in the successful run.

The retained commands and real exit codes are in [the execution result](evidence-review-reader-v1-public-release-2026-10-27/result-reader-source-checks.json):

| Check | Actual result |
| --- | --- |
| `npm ci --prefix packages/reader-core --offline --ignore-scripts --no-audit --no-fund --min-release-age=7 --cache <owned-scratch-cache>` | Exit 0. |
| `npm run build` | Exit 0. |
| `npm test` | Exit 0: 22 content, 15 agent and 71 reader tests passed; zero failed or skipped. |
| `npm run test:native` | Exit 0. |
| Strict TypeScript checks of both README TSX examples | Both exited 0. |
| README agent example and documented named exports | Exit 0. |
| Independent archive/directory/manifest/template/licence checks | Exit 0. |
| Redacted Gitleaks scan of the candidate directory | Exit 0; no leaks found. |

Generated `reader.css` has SHA-256 **`e19a2aa55ec9d853b9a77a15086dcce6b6433b50b8bdff57d50bbed63f0501a4`**, equal to the builder's evidence. All 112 local font references resolve, all three generated notices match, and no external stylesheet resource is present.

An earlier review-harness attempt had a namespace collision before cache seeding; its offline install failed and its focused checks used copied existing dependencies, including stale development parser 6.0.10. That attempt is preserved separately under `initial-harness-attempt/` and is **not** the locked-install evidence above. The corrected independent run passed a real offline install. All installation, build, cache, cloned-private-input and synthetic-canary scratch was removed in `finally`.

## Handoff

The parent session should correct the two exporter guards and obtain independent re-review, then freeze the combined source commit, rebuild and compare the complete public snapshot/archive before a remote push. This review gives no whole-repository, book-release, browser, live speech, live GitHub Pages, full dependency-matrix or comprehensive rights-clearance verdict. The requested checks establish the properties recorded above at the named hashes.

**No action is needed from Dominik.** The parent session owns the guard corrections and publication steps already authorised.
