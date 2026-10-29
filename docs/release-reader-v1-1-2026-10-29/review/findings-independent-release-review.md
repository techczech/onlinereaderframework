---
title: Independent security and public-release review of Online Reader Framework 1.1.0
date: 2026-10-29
register: FOR DOMINIK
reviewer: Codex GPT-6.1 Sol, independent of the builder
status: changes-required
candidate: dirty-working-tree-source-snapshot
---

**Verdict: CHANGES REQUIRED.** Two reproduced P2 boundary defects in the new example prevent a clean-in-scope verdict. The parent retains acceptance and publication. This review makes no production changes.

- The example build follows linked embed sources outside the example folder and includes their contents in the deployable output.
- The preview server follows a linked `dist/` root and serves files outside its intended directory.
- The exact archive, source privacy scan, exported install/build/tests/native imports and both example modes otherwise passed the independent checks described below.

## Exact candidate and integrity

The reviewed archive is `build/reader-source-release.tar.gz`:

```
SHA-256 archive: bef6d91ef82e9cb93753cec1ef4affdd4e3088885ca25c6b3062388910274502
SHA-256 uncompressed tar: 9ab5d23aafde1ec269ee0d8a97bbc47af41a7d449d9759ac3efc864dcbfaf4a4
Source HEAD recorded in builder evidence: bf10299c7d67d51c84c270934523e8ac2a25e03a
```

All 146 archive members are regular files. Their sizes and hashes match the live manifest, the saved release manifest and `build/public-reader-source/`. All 146 recorded source-input hashes match the current source. The candidate remains a **dirty working-tree candidate**, not a clean-source release.

The independent install/test run left zero differences in the before/after integrity inventories. They cover source scripts, example inputs, core source, earlier documentation, the candidate and release outputs, the retired v1 candidate and files in the retained public v1 checkout, excluding installed dependencies and generated `dist/`. Review outputs are excluded. All owned scratch was under `build/` and removed in `finally`. A final integrity read-back also covers the later focused probes.

## Findings requiring correction

### 1. P2 — The example build reads linked embed sources outside its source folder

**Location:** `examples/reader-example/build.mjs:59` and the identical projected file. File SHA-256: `f29056f916b8d113c9df7ee53aebe28733596774d1bb8295bf2c1dcf1eb56f87`.

`readFileSync(resolve(here, 'embeds', item.src), 'utf8')` follows symbolic links without checking the source leaf or its `embeds/` ancestors. The `notLinked` and `inside` checks at lines 20–38 protect output paths; they do not protect this source read. Descriptor validation constrains the path spelling, but cannot establish the filesystem target.

**Reproduction:** Run `python3 docs/release-reader-v1-1-2026-10-29/review/reproduce-build-source-links.py`. It extracts the exact archive, seeds a lockfile-matched cache, runs the documented setup and core build, and tests two separate cases inside cleaned scratch:

1. It replaces `embeds/line-spacing.html` with a link to an HTML canary outside the example folder.
2. It replaces the entire `embeds/` source directory with a link to that outside folder.

In both cases, `npm run example` exits **0**, and `dist/embeds/line-spacing.html` contains `OUTSIDE_EMBED_SOURCE_CANARY`. Expected: refuse the linked source before reading or publishing its bytes. Actual: both links are followed and the outside content becomes deployable output.

**Impact:** A linked embed source can unintentionally include outside HTML in a build users copy to a public host. The source must satisfy the existing embed marker requirement; this is not a claim that every arbitrary private file can be copied successfully. The reviewed candidate itself contains no such link or leaked manuscript. The defect concerns the public example build's source boundary.

**Required correction:** Validate the embed source directory, each intermediate component and the regular source file before reading; refuse links or a target outside the intended real source root. Add focused linked-directory and linked-leaf regressions. This review does not implement the repair.

Evidence: `build-source-links.json`, `build-linked-embed-leaf.log`, `build-linked-embed-directory.log`, and the executable reproduction above. All setup/build commands in the successful reproduction exit 0; its scratch is removed.

### 2. P2 — The preview server trusts a linked root directory

**Location:** `examples/reader-example/serve.mjs:25` and `:31–32`, and the identical projected file. File SHA-256: `c63b3a7aa15a8bc10fa602863e0476bc097cc7da993c07ced738da1d8b39a73f`.

The ancestor loop stops when `at === root`, so it never checks the root itself. `createPreviewServer` also reads `example-build.json` through that root before checking it. A symbolic link at `dist/` therefore redirects both the initial metadata read and subsequent requests outside the intended directory.

**Reproduction:** Run `node docs/release-reader-v1-1-2026-10-29/review/probe-focused-guards.mjs` (exit **0** means the recorded observations were reproduced). It copies the unmodified projected server and header modules into scratch, sets their default `dist/` to a link to an outside canary folder, and calls `createPreviewServer()` with no root override. The outside folder contains valid `example-build.json` metadata and `outside-canary.txt`.

Expected: refuse the linked default root before reading metadata or serving content. Actual: `GET /outside-canary.txt` returns **HTTP 200** with body `OUTSIDE_DEFAULT_ROOT`. The separate extracted-archive probe reproduces the same outcome through an explicitly supplied linked root. A linked descendant beneath a real root is correctly refused; that existing guard does not cover the root.

**Impact:** While the local preview is running, local clients can obtain regular files from the linked target directory. The server still binds to `127.0.0.1`; this is not a claim of internet exposure or a remotely created filesystem link. The linked target must contain the build metadata for startup to succeed. It violates the documented promise to serve only files within `dist/` and never through links.

**Required correction:** Check the real root and its existing ancestor chain before the first metadata read, and enforce that boundary when resolving request files. Include the linked-root/default-root case in regression coverage. This review does not implement the repair.

Evidence: `focused-guards.json`, `focused-guards.log`, `preview-root-link.json`, `probe-preview-root-link.log`, and the executable probe above.

## Other scope reviewed

### Exporter and privacy guards

I read the exporter diff against HEAD using read-only `git --no-optional-locks diff HEAD -- scripts/prepare-reader-source-release.mjs`; the exact diff is saved as `exporter-diff.log`. No Git mutation, commit, tag, push or publication occurred.

The allowlist additions are named files: the changelog, the 11 example inputs, embed README and two embed tests. The existing generic TypeScript/TSX/CSS rule remains bounded to core source. The new reviewed fixture exception is restricted to its exact file, literal count and assertion context. Independent probes accept that assertion and reject duplication, a longer suffix, an encoded suffix, changed context, another file and an additional unreviewed URL. Unlisted example source and embed files remain refused.

The actual candidate audit scans 146 files against **13,866 anchors from all five manuscripts**, reports zero issues and records the 10 exact reviewed fixture occurrences. Independent canary insertion using an anchor from each book is detected. This verifies the declared scan; it does not claim arbitrary obfuscation detection.

The changed retirement routine verifies the archive before copying, verifies candidate members against the old manifest and refuses linked paths. Its existing-destination shortcut verifies the archive, rather than revalidating every previously retired ancillary file. I independently checked the actual retained v1 archive and all 125 candidate members: they match its manifest and archive hash `502b7a14a3eb030a34a1038d249b2cd0f50a910a89883f365b2e6b9c29988e0b`. It remained unchanged. No public tag was altered.

The exporter self-test passes. Additional focused probes refuse a linked build directory, all four linked output leaves and an outside path; the outside canary remains unchanged. The existing exporter source/output containment guard remains in place. The prior review's optional hard-link and delimiter residuals were not treated as new v1.1 blockers. Source-input hashes are compared before output promotion; source HEAD and dirty/untracked state are recorded. Scratch cleanup is in `finally`.

### Embeds, package and public projection

The frame uses `sandbox="allow-scripts"`, explicitly denies listed browser capabilities and checks the sending window before accepting a bounded height-only message from origin `null`. The host sends no data back. The self-contained embed uses inline code and styles. Its response policy includes an opaque-origin sandbox and blocks network connections, framing, objects and other resources through the default denial. The full-view file receives that same response sandbox on the normal embed path.

The example's header rules detach the reader CSP and `X-Frame-Options` before assigning the embed policy. This matches Cloudflare's documented header merging and detachment syntax: <https://developers.cloudflare.com/pages/configuration/headers/>. The static policy was reviewed and the local server response tests passed; no hosted example deployment is claimed. The README correctly requires the no-embeds build for GitHub Pages, which does not apply `_headers`.

The required generic core, embed source, tests, embed child export and stylesheet build inputs are present. The extracted source builds self-contained package styles and local fonts, and the native-import test covers the package API and child helper. Agent files retain the plaintext alternative and contain no iframe; no-embeds mode leaves no `embeds/` output directory. The example labels its invented text as MIT demonstration material. No actual book, cover or private path was found in the candidate or independently scanned no-embeds output.

Root/core/example manifests and locks consistently declare 1.1.0 and retain `private: true`. The licensing summary distinguishes MIT software/demo text, the three included font notices and separately licensed published books. Those notices are present. This is a source-projection review, not a fresh legal rights determination or an exhaustive bundled-transitive-licence audit.

The README, project page, changelog and release notes describe a downloadable runnable example without promising a hosted example. All five published-book roots returned HTTP 200 with the expected titles; the two guides use the `/books/academic-reading/` and `/books/readability/` roots. The project site and licence link also return 200. The new public changelog link returns the expected prepublication 404. Results are saved in `public-links.json`. No premature publication is inferred from the candidate page's release wording.

## Independent command results

The runner `run-independent-review.py` extracts the verified archive into `build/`, copies only lockfile-matched public-registry cache records into owned scratch and uses the actual npm installer offline. It does not stub any gate or install into private source. Node was v26.12.1. Commands, exits and durations are in `results.json`; full output is in the corresponding `.log` files.

| Command in extracted archive, unless stated otherwise | Exit | Result |
| --- | --- | --- |
| Private exporter `node scripts/prepare-reader-source-release.mjs --self-test` | 0 | Export guard suite passes. |
| Exact exporter audit functions on actual archive members | 0 | 146 files, 13,866 manuscript anchors, zero issues. |
| `npm run setup` with offline scratch cache | 0 | Real locked core and example installs succeed. |
| `npm run build` | 0 | Core JavaScript, declarations, stylesheet and fonts build. |
| `npm test` | 0 | Exported groups pass: 22, 15, 8 and 71 tests. |
| `npm run test:native` | 0 | Native package/child imports and packaged-style checks pass. |
| `npm run example` and `npm run test:example` | 0, 0 | Embedded example builds; all 7 checks pass. |
| `npm run example:no-embeds` and `npm run test:example` | 0, 0 | Text-only example builds; all 7 checks pass. |
| `node .../review/probe-focused-guards.mjs` | 0 | Focused privacy/output guards pass; linked-default-root defect reproduces. |
| `python3 .../review/reproduce-build-source-links.py` | 0 | Both linked embed source cases copy outside canary into output. |

All 29 declared direct core/example dependency entries resolve inside the extracted copy. The known possibility of an undeclared import resolving from an ancestor `node_modules` remains a limitation; it is not presented as independently eliminated.

Two initial reviewer harness attempts failed before cache seeding because the extracted helper exported an undefined function and then inherited the caller's CLI arguments. Their evidence is preserved in `attempt-01/` and `attempt-02/`. A first build-link probe attempted to seed from its own empty scratch cache and failed offline setup; that evidence is preserved in `attempt-build-links-01/`. The corrected attempts use genuine cached package bytes, retain real gates and pass. Every attempt cleaned its scratch and left candidate/source inventories unchanged.

## Limits and handoff

No independent browser run was needed to reproduce these filesystem defects. The builder's 56 browser checks, full private suite, three README snippet checks and nine mutation results remain builder evidence; I did not count them as independent passes. No installed Chrome, GUI, screen reader, speech service, EPUBCheck, broad browser matrix or hosted example was used or accepted by this review. The local Node preview response checks were independently exercised through the exported example tests.

**Parent next step:** have the builder correct the two P2 boundaries and request a focused independent re-review. Preserve this candidate and evidence for comparison. After clean review, commit the source, regenerate from that clean commit, compare the new member hashes/uncompressed tar with the accepted corrected snapshot and publish only that public projection. Never push private history. Retain the v1.0 archive/tag and verify the new changelog link after publication.

No decision or manual action is required from Dominik while the parent continues the authorised release work.
