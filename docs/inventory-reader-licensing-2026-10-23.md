---
title: Online Reader Framework licensing evidence
date: 2026-10-23
register: FOR DOMINIK
status: release-evidence-incomplete
scope: Existing framework, original reader sources and installed dependencies
---

# Online Reader Framework licensing evidence

**Public distribution is not yet cleared.** This inventory records existing notices; it grants no new licence.

- The framework and both original applications have no separate software licence in their inspected top-level files or manifests.
- Book text, quotations, fonts, icons and dependency code have different evidence and must retain separate notices.
- The offline audit enumerates the actual installed packages, including nested and development dependencies. It does not establish what a final bundle contains.

## Software and book content

Source names below identify the original repositories, without recording the author's local directories. Framework paths are relative to this repository. These are working evidence locators, not instructions to publish the source repositories or their history.

| Material | Evidence inspected | Distribution treatment and unresolved evidence |
| --- | --- | --- |
| Existing framework software | Root and `packages/reader-core/package.json` contain `private: true` and no `license` field. No top-level licence/notice file was found. | The author must choose a software licence and confirm its scope over software he can license. Keep `private: true` during preparation. |
| Deliberate Practice reader software | Original `package.json` is private and has no licence field. Original `components/Home.tsx:153–159` attributes the work to Dominik Lukeš and displays CC BY-SA 4.0. | The footer does not separately identify the software's scope. Preserve provenance for reused components; do not convert the footer into a software licence grant. |
| Language Muscle reader software | Original private `package.json` has no licence field. No top-level licence/notice file was found. | Include copied navigation and adapted reader code in the software-scope decision. Dependency licences do not license the original application's code. |
| Deliberate Practice book | Original `data.ts`; author and CC BY-SA 4.0 footer in original `components/Home.tsx:153–159`. Demo provenance records 21 sections and the source hash below. | Keep the book outside core. If selected for public demonstration, preserve attribution, licence link and adaptation information; review third-party quotations/images separately. The imported demo now supplies the matching `home.license` link. |
| Language Muscle book | Original `bookContent.ts`; no separate book-wide licence found in the inspected manifest, README or source credits. Original `bookContent.ts:536` attributes its CEFR descriptors to the official Council of Europe global scale and self-assessment grids. | Keep outside core. The attribution is evidence of a third-party source, not redistribution permission. Before publishing this book, establish the book-wide grant and the basis for the reproduced descriptors. Excluding this book leaves core preparation unaffected. |
| Linguistics answers | Demo `src/books/original-publications.json` contains 253 answer-level licence notices across nine themes. Both **CC BY-SA 3.0 and CC BY-SA 4.0** occur. `scripts/import-linguistics-book.py` appends original answer links, licence links, question-author links and contributing editors. | Keep outside core. Retain each answer's actual licence and attribution; do not relabel the collection under one new licence. Verify quoted questions, editors, images and other incorporated material against the answer source before any public demo release. |
| Book assets and borrowed passages | Real imported manuscripts include links and markup; the CEFR passage above is an identified example. This review did not establish a complete quotation/image register. | Core excludes manuscripts. If real books enter public scope, complete their asset/passage register and preserve applicable notices before release. This is evidence work, not an extra design decision. |

The original Deliberate Practice HTML loads Inter, Merriweather, Material Symbols Outlined and runtime Tailwind from external providers. Language Muscle HTML loads Inter, Merriweather and runtime Tailwind. Those references identify inputs; they do not supply local font licences. The current demo instead installs the font packages below.

## Fonts and icons

All three packages are installed under `apps/reader-demo/node_modules/@fontsource/`. Their manifests declare **OFL-1.1**, and each supplies its own `LICENSE`. These findings apply to these installed font files, including the Material Symbols **font**, rather than every possible Google icon asset.

| Installed asset | Exact version | Notice evidence | SHA-256 of `LICENSE` |
| --- | --- | --- | --- |
| Inter | 5.3.0 | The notice names The Inter Project Authors, copyright 2016. | `3b0a5fca3d17942cde889069889dedbbbd075e9b599968c82a95f4d944e9b345` |
| Merriweather | 5.3.0 | The notice names The Merriweather Project Authors, copyright 2024, and reserves the font name Merriweather. | `aa677c3f7682d9c4f7aa48fae3f3b9d0f8d70ac6ab47b9bc20a9cc2879e15af0` |
| Material Symbols Outlined | 5.3.9 | The notice names Google Inc. and supplies OFL 1.1. | `18aabf190848725e2576eefb5c29ba06aac1029d02132252a7f312eac2e50cf3` |

Retain these exact notices alongside any distributed font files and identify the fonts separately from the software licence. Do not rename or modify the fonts during this release preparation. If a later build adds different icon files, a Creative Commons badge or KaTeX fonts, record those actual files and notices separately. The content renderer currently requests MathML output; installed KaTeX alone does not prove its fonts are shipped.

## Installed dependency evidence

The audit snapshot contained **259 installed package locations: 116 in core and 143 in the demo**, with **275 notice records**. Duplicate names and versions at different installation locations remain separate. Every installed manifest had licence metadata; four locations lacked a complete local notice, as recorded below. These are installation counts, not runtime or bundle counts.

The declarations comprised 225 MIT, 19 ISC, five Apache-2.0, three OFL-1.1, two BSD-2-Clause, one BSD-3-Clause, one PSF-2.0, one CC-BY-4.0, one `(MIT OR GPL-3.0-or-later)` and one `(MIT AND Zlib)`. Bundled third-party notices can add terms beyond the enclosing package's manifest declaration.

### Core direct runtime dependencies and peers

Paths in this table are relative to `packages/reader-core/node_modules/`. The audit output contains the full notice text and hashes for every row and transitive package.

| Installed package | Version | Manifest declaration | Actual notice file |
| --- | --- | --- | --- |
| `@mdit/plugin-katex` | 1.1.3 | MIT | `@mdit/plugin-katex/LICENSE` |
| `hast-util-from-html` | 2.0.3 | MIT | `hast-util-from-html/license` |
| `hast-util-sanitize` | 5.0.2 | MIT | `hast-util-sanitize/license` |
| `hast-util-to-html` | 9.0.5 | MIT | `hast-util-to-html/license` |
| `hast-util-to-text` | 4.0.2 | MIT | `hast-util-to-text/license` |
| `jszip` | 3.10.1 | MIT OR GPL-3.0-or-later | `jszip/LICENSE.markdown` explicitly permits choosing MIT or GPLv3. Retain its full supplied notice; use the MIT option for the proposed release record. |
| `markdown-it` | 15.0.3 | MIT | `markdown-it/LICENSE` |
| `markdown-it-footnote` | 4.0.0 | MIT | `markdown-it-footnote/LICENSE` |
| `qrcode` | 1.5.3 | MIT | `qrcode/license` credits Ryan Day, copyright 2012. |
| `react` and `react-dom` (peers) | 18.3.1 each | MIT | Each package supplies `LICENSE`. |

**QR sharing is now installed by the concurrent implementation.** Core declares and installs `qrcode` 1.5.3; its `license` has SHA-256 `8df47c6ad9ac2c41eb9b2a72def9908959da0ede8dadd56c7b249c1bdb0c5ce6`. Core also installs `@types/qrcode` 1.5.6 with its own MIT `LICENSE`. Both original applications install `qrcode` 1.5.4, with the same licence-file hash. These versions remain distinct in the evidence. QR sharing adds the unresolved `encode-utf8` notice below.

Original-only dependencies were also inspected: Deliberate Practice `file-saver` 2.0.5 supplies MIT; Language Muscle `lucide-react` 0.554.0 declares ISC and its notice separately credits Feather portions under MIT; `react-markdown` 10.1.0 and `react-router-dom` 7.18.4 supply MIT notices. They were absent from the framework installations. Copying a component does not justify importing its whole original dependency list; check the final imports and actual distribution.

### Notices that a top-level licence field would miss

| Material | Installed evidence | Required release treatment |
| --- | --- | --- |
| JSZip transitive `pako` 1.0.11 | Its declaration is `(MIT AND Zlib)`. `pako/LICENSE` supplies MIT; `pako/lib/zlib/deflate.js` and eight other source headers supply the additional Zlib notice. | Preserve both notices, including the Zlib origin/change conditions. The audit extracts these headers. The MIT file alone is incomplete evidence. |
| JSZip transitive `isarray` 1.0.0 | Its full MIT text and Julian Gruber's 2013 copyright appear in `isarray/README.md`, under “License”. There is no standalone licence file. | Preserve that embedded notice. The audit recognises it; it is not an unresolved gap. |
| `argparse` 3.0.3 | Core `argparse/LICENSE` supplies the PSF version 2 agreement and copyright notice. | Retain the actual file rather than substituting an MIT template. |
| `entities` 8.1.0 and nested 6.0.1 | Both installed `LICENSE` files supply BSD-2-Clause. | Keep their copyright and disclaimer in the relevant distribution notices. |
| Demo tooling `caniuse-lite` 1.0.30001816 | `caniuse-lite/LICENSE` supplies CC-BY-4.0. | Keep it in the toolchain evidence. Determine whether any of its material enters a distributed output; do not infer book licensing from this metadata. |
| TypeScript 5.9.3, installed in both roots | `LICENSE.txt` supplies Apache-2.0. `ThirdPartyNoticeText.txt` separately records incorporated material. | The audit includes both files. A source/toolchain distribution and a browser-only distribution need different contents. |
| Rollup 4.64.7 | Demo `rollup/LICENSE.md` includes its own MIT grant and bundled MIT, ISC and 0BSD notices. | Preserve the full file if distributing the tool, rather than only its opening MIT section. |

### Concrete notice gaps

| Installed location | Evidence found | Remaining work |
| --- | --- | --- |
| Demo `node_modules/@esbuild/darwin-arm64` 0.28.2 | Its manifest declares MIT; its README identifies the native binary. No local complete notice was found. The sibling `esbuild` 0.28.2 has `LICENSE.md`. | Do not silently attach the sibling notice as verified coverage of the binary. Record that relationship from version-matched upstream evidence if redistributing the toolchain, or document its exclusion from public outputs. |
| Demo `node_modules/@rollup/rollup-darwin-arm64` 4.64.7 | Its manifest declares MIT; its README identifies the native binary. No local complete notice was found. The sibling `rollup` 4.64.7 has `LICENSE.md`. | Establish the native binary's applicable notice if it is distributed, or demonstrate that the browser/core outputs exclude it. |
| Demo `node_modules/dlv` 1.1.3 | Its manifest declares MIT. Its README has an MIT link to `oss.ninja`, without the complete grant/copyright text. | Obtain the version-matched notice if any material is distributed. Otherwise record the package's exclusion using build evidence. The offline inspection did not follow the link. |
| Core `node_modules/encode-utf8` 1.0.3 | Its manifest declares MIT; the inspected README and entry source contain no complete grant/copyright notice. `qrcode/package.json` declares it, and `qrcode/lib/core/byte-data.js:1` imports it. | Obtain the version-matched notice before distributing QR code functionality. This is a concrete core runtime dependency, rather than merely an unused build tool. No new grant has been inferred. |

These gaps make the current audit exit with **1**. The three demo-tooling gaps do not establish that those tools enter a browser bundle; the QR runtime dependency needs its own resolution. The script intentionally retains the gaps; do not erase them or invent licence text to obtain a green exit.

## Reproduce the inventory

Run from the framework repository with Node 22 or later. The inspected machine used Node **v26.12.1**. The script uses Node built-ins and never runs npm, reads environment variables or configuration secrets, follows external package links, or contacts a service.

```sh
node scripts/audit-reader-distribution.mjs
node scripts/audit-reader-distribution.mjs --summary
node scripts/audit-reader-distribution.mjs --self-test
```

Default JSON includes each installed package's exact name/version/location, manifest declaration and SHA-256, root direct-dependency role, notice source files, source-file SHA-256, notice-text SHA-256 and full notice text. It scans nested notice filenames, TypeScript third-party notices, complete embedded MIT README sections and pako's embedded Zlib headers. `--summary` omits notice text. It skips secret filenames and symlinks within notice trees. It is a bounded notice inventory, not a search for every possible embedded licence in every source line.

Exit **0** means no detected inventory or supplied-pack issues; **1** means evidence gaps or distribution findings; **2** means the audit could not complete. Without `--pack`, a zero inventory result would still mean **the packed package was not checked**. `directRoles` describes root manifest groups, not a transitive runtime classification. The script hashes lockfiles but does not assert that the installation satisfies them. Review lock/installation changes and rerun after dependency work.

The full-output snapshot was 789,420 bytes; SHA-256: `5906ee6454579c9782e738ddcc918c15c12989a0eac29a007dc2a82a2e52ff6f`. Two immediate repeat runs produced byte-identical JSON and exit 1. This receipt identifies the observed installation, not an immutable final release. Concurrent implementation can change it.

| Snapshot input | SHA-256 |
| --- | --- |
| Core manifest | `adb0617a3742e9fff880c472fb5a98feb9590bbd1aa767bb351fec40e9735f5c` |
| Core `package-lock.json` | `cfff499192aba1b42b0e4a57a03a74a306e270d95b24bd99c57980e83a669b48` |
| Demo manifest | `e2dc02c4e9ee0b566dceb4d26401a1fa42e2b2a64d1753a9fc5d8fa540fdaeea` |
| Demo `package-lock.json` | `700e29f5ac351687769a483536b468befb26409eb1a164fa65e1b073ad65282d` |
| Original Deliberate Practice `data.ts` | `d6bef0e8f811d06a7bfcf4d1386ba8dbd92667f9e0297c3bc174e7f2d83c5f30` |
| Original Language Muscle `bookContent.ts` | `bda8e81df46e5c633969a695fc0fc26994b62aac472bcd8787bdfd4268411698` |

No build, package creation, installed-consumer check, public permission verification or release occurred in this inventory task. The [release plan](plan-public-reader-release-2026-10-23.md) assigns those remaining steps.

## Parent integration: runtime gap removed through the supported QR patch

After this historical inventory, the framework updated `qrcode` from 1.5.3 to the compatible official 1.5.4 patch. The patch retains the original sharing API and removes `encode-utf8` from its dependency graph. The framework installation no longer contains that package. No later notice was relabelled as version-matched coverage for 1.0.3. The original application worktrees remain unchanged.

The new QR package includes its complete notice; installed manifest/dependency and notice hashes are recorded in `research/evidence-reader-qr-patch-2026-10-23.json`. The current inventory has three missing-notice entries, all for demo build tools with the exclusion evidence above. The inventory deliberately retains those findings. Runtime QR/browser regression verification follows integration; this resolution alone does not establish public-release acceptance.
