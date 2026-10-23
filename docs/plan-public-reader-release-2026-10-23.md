---
title: Online Reader Framework public-release plan
date: 2026-10-23
register: FOR DOMINIK
status: prepared-not-authorised-to-publish
scope: Existing original-derived reader framework
---

# Online Reader Framework public-release plan

**Prepare a reusable core release first, with books supplied by the consumer.** Keep `reader-core` private throughout this work. Publishing, deployment and repository visibility changes require later explicit authorisation.

- The release must preserve the actual Deliberate Practice reader and Language Muscle navigation, alongside the framework's existing API.
- The package must contain working styles, assets and notices, while excluding real manuscripts and private working material.
- Only two author choices remain: the software licence and the intended public scope. Installation, packaging, testing and notice collection belong to implementation.

This plan follows the [original-reader upgrade](plan-original-reader-upgrade-2026-10-23.md), the [architecture review](review-original-reader-architecture-2026-10-23.md) and the [licensing evidence](inventory-reader-licensing-2026-10-23.md). It does not replace their acceptance requirements. The parent implementation session owns builds, adapters, demo integration and packaged-consumer checks; this task owns the plan, inventory and offline audit script.

## Author decisions needed before a release can proceed

| Choice | Concrete decision | Recommended preparation |
| --- | --- | --- |
| Software licence | Choose the licence for the framework and the reused original application code the author is entitled to license. Existing manifests and original reader files do not establish a separate software grant. | Prepare for a permissive software licence such as MIT, but add no grant or `license` field until the author selects it and confirms its software scope. Keep book and third-party notices separate. |
| Public scope | Decide whether the release exposes core source/package and a synthetic example only, or also distributes named real books and their demo assets. | Release core with a synthetic example first. Keep the three real books as private acceptance fixtures unless explicitly selected for public distribution and their content evidence is completed. |

The choice of public scope does not itself authorise publication. Selecting a software licence does not confer rights over quotations, third-party code or fonts. If the author wants real books included, the implementation team must complete their existing-rights evidence; that work is not another interface-design decision.

## Define the public artefacts

**Core package.** Retain existing exports and add `PublicationReader` and its documented types. Export a compiled reader stylesheet at `reader-core/reader.css`; document its import. Include JavaScript, declarations, styles, any deliberately shipped assets, the selected software licence and applicable third-party notices. Keep the `files` allowlist narrow. Do not ship demo manuscripts, importer scripts, search indexes, `llms.txt` book exports, test fixtures, local provenance records or planning documents.

**Public source and example.** If selected, assemble a reviewed export containing reusable core source, reproducible build inputs and a small synthetic example. Do not make the working repository or its history public as a shortcut: the existing working documents and import workflow contain local source context. Use repository-relative paths and public source links in published documentation. Keep source-to-destination hashes and adaptation reasons in working evidence; publish a sanitised provenance statement crediting the two original readers.

**Public documentation.** Describe supported React versions, imports, CSS/assets, book IDs and state isolation, routes, content formats, downloads, attribution and the optional coaching boundary. Show a synthetic book with no author-local paths. Explain that annotation data stays in browser storage, including its actual export/reset behaviour. Document the existing `ReaderShell` and parsing/export APIs as well as the new reader. Replace source-relative integration instructions with imports that work from the installed tarball.

**Real-book demos.** The three books are required private integration evidence. They are separate potential public artefacts. A core package can be ready while these demos remain private. If public scope includes books, preserve original author, question/editor and answer-level licence credits, review copied CEFR descriptors and image rights, and audit downloadable EPUB/search/`llms.txt` outputs as book distributions too.

## Complete implementation and package evidence

1. **Finish source provenance and dependencies.** Record which original components supply the shell, home, notes, sharing and recursive navigation, with source hashes and adaptation reasons. Core now declares and installs `qrcode` 1.5.3; retain its exact notice and resolve the missing notice for its runtime dependency `encode-utf8` 1.0.3. Keep coaching optional and exclude credential/service imports from core. Rerun the dependency inventory after these changes.
2. **Finish style delivery.** A CSS export now exists in the core manifest, but its presence does not prove the build creates it. Produce the stylesheet from the original typography, dark-mode and animation requirements. Ensure book HTML classes survive production styling. If fonts remain host-provided, document exact supported setup; if bundled, include their OFL notices. Preserve the original font/icon appearance in the private demos.
3. **Set reproducible build inputs.** Retain npm and the existing per-package lockfiles. Pin a supported Node/npm toolchain in the release instructions; the content plugin requires Node 22 or later. In a clean authorised checkout, run `npm ci` separately in core and demo using reviewed lockfiles, then run their documented build/test commands. Record exact runtime versions, lock hashes and exit results. The root build currently runs `npm install`, so it is not the release reproducibility command.
4. **Build clean distribution output.** Remove stale core output before rebuilding in the isolated release checkout. Disable declaration maps or explicitly omit them from the package, remove stale maps and their references, and keep tests/manuscripts outside `dist`. The current TypeScript configuration enables declaration maps; the audit rejects all source maps to prevent source/path leakage. This task does not change that configuration.
5. **Supply licence and notices.** After the software decision, add the selected software text and manifest metadata through the parent. Preserve dependency notices and the separate OFL texts for shipped fonts. Use JSZip's documented MIT option without deleting its supplied dual-licence notice, and include pako's Zlib headers as well as its MIT text. Resolve or justify the exclusion of the four incomplete installed notices listed in the inventory; do not replace them with guessed boilerplate.
6. **Test an installed consumer.** Consume the actual tarball with no source alias or imports into this checkout. Exercise both old exports and `PublicationReader`, importing the exported CSS. Check desktop/mobile appearance, dark mode, fonts/icons, inline math and rich tables/footnotes. Record the exact tarball hash. The source-linked demo alone cannot establish package acceptance.
7. **Close the original architecture findings.** Verify annotations across inline markup and table cells; restored TOC/footnote targets; the real Language Muscle internal cross-reference; shared URLs and Back/Forward across books; separate state after switching books without reloading; and correct home/quote identity for each book. Verify all 253 linguistics answers and nine themes, unsafe HTML at the actual DOM boundary, full-content search and retained publication downloads. Obtain the planned independent review of the final implementation and keep its findings with the release evidence.

Commands for the parent, after dependencies and build configuration are ready, run from repository root:

```sh
npm --prefix packages/reader-core run build
npm --prefix packages/reader-core run test:publication-content
npm --prefix apps/reader-demo run build
node scripts/audit-reader-distribution.mjs --self-test
node scripts/audit-reader-distribution.mjs
```

Do not mark the release ready from a failed or partial build. `test:publication-content` covers content processing; it does not replace the browser and installed-consumer checks above.

## Rehearse and inspect the actual package

The parent creates the local tarball after reviewing package lifecycle scripts. A local pack is preparation, not registry publication. The following commands are a future checklist, not actions performed by this task. The release directory stays inside the owning repository.

```sh
mkdir -p docs/release-evidence
cd packages/reader-core
npm pack --ignore-scripts --pack-destination ../../docs/release-evidence
cd ../..
node scripts/audit-reader-distribution.mjs --pack docs/release-evidence/reader-core-0.1.0.tgz
```

Substitute the actual versioned filename if the parent changes the package version. Avoid `npm pack --dry-run` as the sole evidence: the audit consumes the actual gzip/tar bytes without extraction or lifecycle execution.

The audit records the tarball and each file's SHA-256, checks required entry points and manifest export targets, and enforces these exclusions:

- Only core `dist` code, declarations, CSS and supported asset formats, package metadata, README and notice files may appear.
- Demo/book directories, source maps, book exports, provenance files, tests, secret/configuration filenames and bundled `node_modules` are rejected.
- Text is checked for private home paths on Unix/Windows, local file URLs and known private workspace references. Findings identify the file and rule, without echoing a matching private passage.
- Long manuscript spans are derived from the actual local demo books and checked against packed text, including common escaped forms. The report records only the book identifier and anchor hash. A missing manuscript input makes the audit incomplete.
- Archive traversal paths, links, duplicate entries, bad checksums, unsupported metadata and malformed archives fail before acceptance. The package must retain `private: true`.

The manuscript/path checks are **heuristics**, not a guarantee that all transformed text or private information is absent. Review the full file list and public README/source export manually as well. Binary font/image rights and final dependency inclusion require the separate inventory and bundle evidence. `--pack` only audits core; it does not approve demo or repository publication.

The script returns 1 for any inventory gap even if packed-core exclusions pass. Resolve each notice gap with evidence, or record an explicit output-exclusion assessment beside the audit result. Do not treat a non-zero exit as a pass. A separate packaging result in the JSON lets the reviewer see whether `pack.issues` is empty while dependency evidence remains incomplete.

## Release checklist and stop point

- [ ] The author has selected the software licence and public scope, with no inferred grant over other materials.
- [ ] The parent has frozen build inputs and completed the original-code provenance/adaptation record.
- [ ] Clean builds, content tests, three private real-book checks and the installed-tarball consumer pass have recorded evidence.
- [ ] The complete installed inventory has been rerun after final dependencies; all missing notices have been resolved or excluded from the stated public artefacts with evidence.
- [ ] The packed-core audit has no distribution findings; its inventory findings and any exclusion assessments are visible in the release record.
- [ ] Required notices, software licence, asset licences and public-safe documentation are present in the actual selected outputs.
- [ ] Independent review has closed material implementation and packaging findings against the frozen artefacts.
- [ ] The core manifest still has `private: true`; no package, site or repository has been published by this preparation.

**Stop here and present the exact artefacts, hashes, evidence and remaining findings for release authorisation.** A later authorised release session can verify registry-name availability, select the final version, deliberately change the publication guard if registry publishing is approved, rerun the relevant checks, and publish only the approved artefacts. None of those external actions is authorised by this plan.

## Evidence from this task

The offline script passes its in-memory checks for a clean core file set, Unix/Windows and escaped private paths, manuscript text, source maps, demo/secret filenames, a valid tar, traversal, symlinks, duplicate entries and malformed archives. The actual installed inventory ran and identified 259 package locations, 275 notice records and four missing-notice findings. Full snapshot hashes and exact notice sources appear in the licensing inventory.

No actual pack, package/build changes, demo edits, browser test, dependency installation, Git mutation, deployment or publication was performed by this task. No secret or `.env` file was read. Concurrent implementation means the parent must rerun the audit against its final installation and tarball. **No action is required from Dominik at this preparation handoff; the parent should complete integration and bring back the two concrete author choices when the release artefacts are ready.**
