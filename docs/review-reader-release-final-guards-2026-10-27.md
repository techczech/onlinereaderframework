---
title: Independent security and write-path re-check of the final release guard fixes
date: 2026-10-27
status: clean-no-blocking-findings
reviewer: Claude Opus 5.5 (independent reviewer, not the builder)
scope: scripts/prepare-reader-source-release.mjs guard fixes; book release recovery report (build-edition.ts, build-release.ts, test-release-write.ts)
---

# Final release guard re-check

**Verdict: clean within scope.** The two source-exporter P1 findings and the book recovery-report P2 finding are closed. Nothing blocks publication from these two diffs. There are two low-severity residuals and one tidy-up note below; none is required before publication.

The source release remains gated on the parent's clean commit and rebuild. The book editions on disk carry `sourceTreeDirty: true`, and `verify:release` refuses them (exit 1), as expected.

## What was reviewed

The files had these SHA-256 values, matching the parent's receipt manifest:

| File | SHA-256 |
| --- | --- |
| `scripts/prepare-reader-source-release.mjs` | `fa80b10f827935e86ab9d473de7d00f8757f0f3f39498e7aa1fece0f85f70021` |
| `apps/reader-demo/scripts/release/build-edition.ts` | `e5670435924f575813308fd3c708e5b1c5a1d9f51c4ca6b4c8fc2e066d81ccdf` |
| `apps/reader-demo/scripts/build-release.ts` | `459a066ee54370f1f0eb87c512a5afbb5ec49744c4b186dba34a4eee3e3c18f1` |
| `apps/reader-demo/scripts/release/test-release-write.ts` | `f678035ac1ec6e7a3c7d551aae943042d5b93f32254d12ff74c3f6525bc813dd` |

Reviewer shell: Node v24.22.1. The receipt's archive was generated under Node v26.12.1. I did not regenerate it; I verified the bytes on disk.

This review wrote only this document and `docs/evidence-reader-release-final-guards-2026-10-27/`. All scratch was created under `build/` and removed in `finally`/`after`. A before/after SHA-256 list of 2,586 files (every other file under `docs/`, the candidate, the archive, the manifest, the checksum, the exporter evidence and `build/release-books/`) is identical (`integrity-files-before.txt`, `integrity-files-after.txt`). There were no production edits, Git mutations, credential reads, external writes, deployments, browser or GUI use, or delegations.

## Specification review

### Source exporter: exact fixture exceptions (prior P1, closed)

`audit` at `scripts/prepare-reader-source-release.mjs:184-193` now tokenises URLs with `/(?:file|https?):\/\/[^\s"'<>\x60]+/g`. It masks a reviewed literal only when a whole token equals it, the token count equals `count ?? 1`, and any `context` is present. Otherwise nothing is masked, and the full private-path and credential scanners at `:194-196` see the token. Manuscript anchors are still checked against all remaining text.

For each of the 10 reviewed literals, the probe asserts all of the following:

- The approved single occurrence passes.
- Four longer forms are rejected: `private-manuscript.md`, `x`, `../Users/dominik/notes.md` and `%2Fprivate` appended.
- A second occurrence is rejected.
- An unapproved `file://` address in the same file is rejected.
- The literal in a different file is rejected.
- A `/`-escaped longer form is rejected.
- `file:///etc/passwd` without its reviewed context is rejected.

All of these held. The exporter's own `--self-test` also exits 0.

On the actual candidate, the final audit with the 12,831 real manuscript anchors returns no issues. It masks exactly nine literals, each occurring once.

### Actual candidate, archive and manifest

| Check | Result |
| --- | --- |
| `build/public-reader-source/` file count | 125; every file byte-identical to the prior review's `snapshot-reader-source-end.json` (zero differences) |
| `build/reader-source-release.tar.gz` SHA-256 | `502b7a14a3eb030a34a1038d249b2cd0f50a910a89883f365b2e6b9c29988e0b`; equals the manifest `sha256`, the `.sha256` line and the manifest byte count (223,552) |
| Archive members | 125 regular files, each byte-equal to the candidate (exporter's own `inspectArchive`); no forbidden names |
| Manifest file list | 125 entries, all path/bytes/hash matches |
| Uncompressed tar SHA-256 | `7a87e73883b4d065f7778c8e45fdc30d99a58176ccd66f9c53759abd9261982f` (recorded for later comparison) |
| Exporter evidence | `passed-local-source-preparation`; `scratchRemoved: true`; `changedInputsDuringRun: []`; head at start and end `24ff254…` |

The change from the earlier compressed hash `c030a57c…` (223,581 bytes) is gzip output under a different Node and zlib. The member bytes are unchanged. MIT licence texts and API content are unchanged by this diff, so I did not re-review them.

### Book recovery report (prior P2, closed)

`build-edition.ts:154-155` now returns `quarantine` as the path that really holds the new tree: `staging` if it exists, otherwise `folder` only when the new tree was moved in and could not be moved back. It also returns `recovery` as the `.previous-…` folder whenever that folder still exists. `build-release.ts:32-33` prints the two separately, and the recovery line says "do not delete it".

I traced every promotion and rollback failure point. My probe adds three cases that the builder's regression does not cover:

| Case | `quarantine` | `recovery` | Edition path | Manifest |
| --- | --- | --- | --- | --- |
| Manifest rename fails, and moving the new tree back fails | the edition folder, which holds the **new** tree (hash ≠ previous) | `.previous-…`, hash equal to the previous edition | new tree | absent; `verify:release` refuses |
| New tree never moved in, and restoring the previous edition fails | `.incomplete-…` | `.previous-…`, hash equal to previous | absent | absent |
| First build, no previous edition, manifest rename fails | `.incomplete-…` | none | absent | absent |

In none of these cases is the good edition labelled as incomplete output. The previous edition is never deleted on the failure path (`:137-153`). The old manifest is removed at step 2 (`:79-80`), before any change, so a failed run leaves no deployable manifest. The outside sentinel was unchanged in every case.

## Standards review

### Source exporter: symbolic-link containment (prior P1, closed)

`assertProjectPath` (`:28-43`) walks from the owning root to the target. Before the first missing component, it rejects:

- any path outside the root;
- any symbolic link, including a dangling link;
- any ancestor that is not a directory;
- a leaf of the wrong kind;
- any component whose `realpathSync` differs from the expected canonical location.

The guard runs at these points:

- Previous-evidence read: `:49` before `:52`.
- Source traversal and input: `walk` `:77`, `input` `:65`, and the end-of-run drift check `:487`.
- Scratch creation and cleanup: `:436-440` and `:531`.
- Every materialised file, before and after `mkdir`: `:360-365`.
- Candidate deletion: `:492` before `:494`.
- Each named write: `:496-501` and `:535`.

`rmSync` of the candidate and the scratch does not follow nested links. The probe confirmed that a link planted inside an existing candidate is removed as a link and the outside folder is kept.

I ran copies of the exporter's own functions, sliced from the hashed file with all their imports including `realpathSync` and `isAbsolute`, against a fake repository in owned scratch. The final-write block ran with its helpers. All of these are refused before any delete or write:

- `build` as a directory link;
- `build` as a regular file;
- the candidate as a link;
- each of the four named leaves as a link to an existing outside file and as a dangling link;
- a scratch link at cleanup;
- a path outside the root, and a `../` escape;
- a linked `packages/reader-core/src`;
- a linked `packages` ancestor;
- a linked source leaf (refused by both `input` and `walk`).

The clean case writes inside the fake repository. The outside canary file and folder were unchanged after every alias case. On the real repository, `guardReleaseOutputs` accepts the current outputs and `walk('packages/reader-core/src')` passes.

### Build-edition write path

The diff changes only the returned paths and the CLI wording. The guarded rename order is unchanged, and the source comment at `build-edition.ts:8` states that the two directory renames are not a crash-atomic exchange. I found no atomicity overclaim in the receipt or the CLI.

### Residuals (P3, not blocking)

**P3-a — A reviewed literal followed by a token delimiter is masked, and the rest is scanned as ordinary text.** `'file:///etc/>private.md'`, `'file:///etc/<private>'`, `'file:///etc/ private notes.md'` and ``'file:///etc/`private'`` produce no issue (probe observations). This hides no private signal: masking replaces only the exact approved token. A home path, Windows user path, `file://` address or estate folder name after the delimiter is still rejected (5 assertions held). Such a tail is no less visible than the same text anywhere else in the file. *Optional hardening:* tokenise to the enclosing string-literal quote instead of URL delimiters.

**P3-b — A hard-linked output file is written through.** `assertProjectPath` accepts a regular file with `nlink 2`. The probe's hard link at `build/reader-source-release.sha256` to an outside canary in scratch had its content replaced by the checksum line. This needs a deliberate same-volume hard link placed in `build/`. Hard links cannot alias directories on APFS, and the deletion paths unlink rather than truncate, so it cannot delete outside content. It is outside the symbolic-link correction that was required. *Optional hardening:* refuse `nlink > 1` for output leaves, or unlink and then write with `flag: 'wx'`.

**Tidy-up note:** the reviewed literal `https://u:p@example.org/` (`:171`) matches no complete token in the current candidate. It is therefore never masked and grants nothing. It can be removed.

## Reproduction

All commands run from the repository root unless noted. Real exit codes are appended to each log.

| Command | Exit | Evidence |
| --- | --- | --- |
| `node docs/evidence-reader-release-final-guards-2026-10-27/probe-source-final-guards.mjs` | 0; 127/127 required held; scratch removed | `log-probe-source-final-guards.txt`, `result-source-final-guards.json` |
| `node scripts/prepare-reader-source-release.mjs --self-test` | 0 | `log-exporter-self-test.txt` |
| From `apps/reader-demo`: `npx tsx --test ../../docs/evidence-reader-release-final-guards-2026-10-27/probe-recovery-paths.mts` | 0; 3/3 | `log-probe-recovery-paths.txt` |
| From `apps/reader-demo`: `npm run test:release` | 0; 18/18, including both new regressions | `log-builder-test-release.txt` |
| From `apps/reader-demo`: `npm run verify:release -- --book language-muscle` | 1 (expected): "built from uncommitted source" | `log-verify-release-dirty.txt` |

The probe files have these SHA-256 values: `probe-source-final-guards.mjs` `e31023a529d89690a322c2a0d864b73160c541c3e6eecc12cb27383e3cbb020a`; `probe-recovery-paths.mts` `d4c5c66a7e9a2d7936926bbaa0f04f0ad887318c4fbc1eeba01ae76d179f7234`. The source probe refuses to run if the exporter hash differs from `fa80b10f…`.

## Handoff

The parent may proceed under the existing authority:

1. Commit the source.
2. Rebuild the three book editions so that `sourceTreeDirty` is false, and confirm that `verify:release` passes.
3. Regenerate the source archive from the clean commit, and compare its 125 member hashes with this snapshot before the GitHub push.

The P3 hardening items are optional. If the parent applies either one to the exporter, that change touches the write path and needs a fresh re-check.

This review gives no verdict on browsers, live deployment, the full dependency matrix or rights clearance. **No action is needed from Dominik.**
