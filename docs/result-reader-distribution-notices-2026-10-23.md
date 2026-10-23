---
title: Reader distribution notice evidence results
date: 2026-10-23
register: FOR DOMINIK
status: evidence-collected-runtime-notice-version-coverage-unconfirmed
scope: Four missing third-party notices; preparation only
---

# Reader distribution notice evidence results

**The QR runtime notice remains unconfirmed for the exact installed version.** The three demo tooling gaps have documented exclusion evidence for the inspected core/browser outputs. All source evidence, complete notices, comparisons and hashes are saved under [reader third-party notices](../research/reader-third-party-notices/README.md).

- All four installations match every regular-file member of their exact official npm tarball, including both native binaries. Tarball SHA-512 integrity and SHA-1 match npm metadata.
- Each official upstream tag resolves to npm's recorded release commit. This confirms package identity; it does not make a later notice part of an earlier release.
- The parent can use the saved tooling exclusion assessment. It must retain the distinction between the later authentic `encode-utf8` notice and verified version-matched coverage.

## QR sharing: `encode-utf8` 1.0.3

The [official npm version metadata](https://registry.npmjs.org/encode-utf8/1.0.3) identifies commit `b8e591da66e5942caa59cf7b1922d91b95ed49ea`. The [upstream v1.0.3 tag](https://github.com/LinusU/encode-utf8/tree/v1.0.3) resolves to that same commit. The installed `index.js`, tarball `index.js` and [commit-pinned upstream entry](https://github.com/LinusU/encode-utf8/blob/b8e591da66e5942caa59cf7b1922d91b95ed49ea/index.js) are byte-identical, with SHA-256 `ba56e54548f07a0b3799c520fd9ae07ee0e4b2cfd1b2994dcfb164b732158c2b`.

**Neither the five-file tarball nor the exact upstream release tree supplies a complete copyright and licence notice.** The version manifest declares MIT. The installed QR dependency imports `encode-utf8` in `qrcode/lib/core/byte-data.js:1`, so the gap concerns actual runtime code.

Upstream [added its complete MIT notice](https://github.com/LinusU/encode-utf8/commit/87cba02f7ddf8792f2e60c4b1a7c1eccf6daa3d2) on 16 June 2022, after version 2.0.0. The [authentic notice](https://github.com/LinusU/encode-utf8/blob/87cba02f7ddf8792f2e60c4b1a7c1eccf6daa3d2/LICENCE) names **Linus Unnebäck, copyright 2017–2021**. Its complete unmodified bytes are archived as [the later upstream notice](../research/reader-third-party-notices/encode-utf8-1.0.3/upstream-later-LICENCE.txt), SHA-256 `48f761956f2709d24a8750e2fd37cf347f421125d625f48a53f03d72834d2ab8`.

The licence-addition commit changes only `LICENCE`, but its parent already contains the later ESM implementation. Comparing that implementation with 1.0.3 shows changed export syntax, removal of strict mode, and `var` replacements with `const`/`let`; the complete [source difference](../research/reader-third-party-notices/encode-utf8-1.0.3/diff-index-release-to-licence-addition.patch) is saved. The maintainer closed the [missing-notice issue](https://github.com/LinusU/encode-utf8/issues/6#issuecomment-1157626340) with a brief confirmation, without explicitly naming 1.0.3 or earlier releases.

**Applying this later notice to 1.0.3 is an inference**, supported by the release's MIT declaration, shared source history and the upstream notice addition. It is not an exact-release notice retrieval or an explicit version-specific clarification. The parent has an authentic candidate supplemental notice, but this investigation does not establish the requested exact-version coverage. No new permission text or copyright attribution was composed.

## Demo tooling: exclusion assessment

The [local dependency and output snapshot](../research/reader-third-party-notices/evidence-reader-output-exclusion-2026-10-23.json) records inspected inputs, build routes, source/output file hashes and the method's limits. It follows installed `dependencies`, `optionalDependencies` and `peerDependencies` from both core and demo, excluding `devDependencies`. Both graphs resolve every declared edge. Among the four investigated packages, **only `encode-utf8` is runtime-reachable**.

| Package | Confirmed identity and notice evidence | Exclusion assessment |
| --- | --- | --- |
| `@esbuild/darwin-arm64` 0.28.2 | Its [v0.28.2 commit](https://github.com/evanw/esbuild/tree/609683d892977362a0f99026cb74b96263d728a9) matches npm `gitHead`; the installed binary matches the official tarball. The archived complete root MIT notice credits Evan Wallace, copyright 2020, and matches the installed sibling `esbuild` notice. The versioned source also supplies an xxhash notice and declares a Go dependency; root MIT alone is not treated as complete binary notice coverage. | The package is absent from both declared runtime graphs. Its Node loader selects a host executable. The inspected outputs contain no copy of the investigated executable bytes or package-name marker. This supports excluding the host tool from core/browser distribution, rather than distributing it with an assumed notice set. |
| `@rollup/rollup-darwin-arm64` 4.64.7 | Its [v4.64.7 commit](https://github.com/rollup/rollup/tree/5f658604845ca7fb4d8e8a27a9e68e166c6f9973) matches npm `gitHead`; the installed native module matches the official tarball. The complete upstream `LICENSE.md` matches the installed sibling Rollup notice, including bundled notices. Its native Cargo manifest declares additional Rust dependencies; complete native-binary notice coverage is not established. | The package is absent from both declared runtime graphs. Rollup's Node loader selects the platform `.node` binding. The inspected outputs contain no `.node` file, verbatim binding bytes or package-name marker. This supports excluding the host binding from core/browser distribution. |
| `dlv` 1.1.3 | Its [1.1.3 commit](https://github.com/developit/dlv/tree/e636db817a96e4ca4710b407163fb992748b3b80) matches npm `gitHead`; all nine tarball files match the installation. Its upstream entry matches installed source. Neither the exact tree nor tarball contains a complete notice; the README links externally. That external site was outside the primary-source boundary and was not used as a grant. | The package is absent from both declared runtime graphs. Installed Tailwind imports it to read configuration and evaluate theme functions. The stylesheet build invokes Tailwind as a tool and emits CSS; the core code build invokes TypeScript. No direct target-package mention occurs in core/demo source, and no verbatim `dlv` entry or distributed build file occurs in the inspected outputs. This supports excluding its implementation from the stated outputs. |

The snapshot covers **202 core output files and 118 demo output files**. These are existing outputs, with no fresh build or pack performed here. Absence of a name or verbatim source cannot prove absence of transformed JavaScript. The build routes and declared dependency graphs provide the accompanying exclusion basis; the parent must check the final frozen artefacts and any changed build configuration. This assessment does not cover a distribution containing `node_modules`, host tools or a bundled development environment.

## Handoff

The evidence directory contains complete retrieved upstream licence files, official metadata and tags, the two small JavaScript tarballs, per-member installation comparisons, native tarball/member hashes, the local exclusion snapshot and a SHA-256 file inventory. Native tarball bytes were checked in memory and not retained. npm signature/attestation verification was not performed; integrity checks compare downloads with metadata fetched from the official registry.

The collection command completed successfully after an initial assertion exposed Rollup's native manifest version template (`0.0.0`). The saved collector now checks the tagged root version and npm commit identity separately. Reused source files retain their original bytes and are labelled as reads from the earlier attempt in the provenance record.

**The parent should keep QR notice coverage unresolved under the exact-version requirement, and carry the tooling exclusions into its final distribution record.** No installed package, manifest, audit script or other owner's file was changed. No build, pack, dependency installation, Git mutation, deployment, publication, secret access, maintainer contact or further delegation occurred. No licence was selected for Dominik's software. No action is required from Dominik at this evidence handoff.

## Parent integration: runtime gap removed through the supported QR patch

After this historical inventory, the framework updated `qrcode` from 1.5.3 to the compatible official 1.5.4 patch. The patch retains the original sharing API and removes `encode-utf8` from its dependency graph. The framework installation no longer contains that package. No later notice was relabelled as version-matched coverage for 1.0.3. The original application worktrees remain unchanged.

The new QR package includes its complete notice; installed manifest/dependency and notice hashes are recorded in `research/evidence-reader-qr-patch-2026-10-23.json`. The current inventory has three missing-notice entries, all for demo build tools with the exclusion evidence above. The inventory deliberately retains those findings. Runtime QR/browser regression verification follows integration; this resolution alone does not establish public-release acceptance.
