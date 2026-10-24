---
title: Online Reader Framework public-release plan
date: 2026-10-23
register: FOR DOMINIK
status: superseded-by-author-corrections-2026-10-24
scope: Original-derived reader framework; no publication authorised
---

**24 October update:** The author’s local review identified presentation and navigation defects. The technical evidence below describes the prior checkpoint. The working redesign is recorded in `docs/design/2026-10-24-reader-corrections/brief-reader-corrections.md`; do not treat these older release artefacts as acceptance of the revised interface.


# Online Reader Framework public-release plan

**Prepare the reusable framework for release while keeping the real books separate.** The original reader and EPUB implementations are built, and Astra's follow-ups close their six demonstrated defects and packaging limitations. The final independent source-candidate audit closes the MathML selection and release-artefact checks with no remaining material findings within scope. React 18.3.1 and 19.2.0 installed-consumer compatibility is verified.

The existing `techczech/onlinereaderframework` GitHub repository is already public. The local working branch contains internal reviews and real-book fixtures: **do not push that branch or open a public pull request from it**. Use the allowlisted source candidate for a later authorised release. The package's `private: true` guard prevents npm publication; it does not make GitHub pushes private.

The final reviewed code is `280b667`. Immutable artefacts and exact checksums are retained under `build/final-280b667/`; [the final independent review](review-reader-final-source-2026-10-23.md) reproduces both archives. [The final status](status-original-reader-framework-2026-10-23.md) records the local previews and handoff.

## Prepared local artefacts

| Artefact | Boundary and purpose |
| --- | --- |
| `build/reader-core-verified.tgz` | The actual successfully installed runtime package. JavaScript, declarations, original stylesheet, fonts and notices; no manuscripts, source maps or internal reports. Its hash is recorded in `build/evidence-reader-package.json`. |
| `build/reader-source-release.tar.gz` | The allowlisted source candidate, with standalone build inputs and public-safe Node tests. No real books, demo application, installed dependencies, private review material or author-local paths. |
| `build/reader-source-release.manifest.json` | Every exported source path and hash. The exporter independently audits the materialised tree and archive. |
| `build/reader-source-release.evidence.json` | Actual isolated installation, build, Node/native-import results, source-input hashes, installation mode and cleanup. |
| Local reader on port 8773 | Private acceptance fixtures for Deliberate Practice, Language Muscle and all 253 linguistics answers. This is separate from a public framework distribution. |

The source candidate includes no software licence grant. Its README and licensing document explicitly identify it as an unreleased review draft. The source boundary and exclusions are documented in [the source-candidate receipt](plan-reader-source-release-boundary-2026-10-23.md).

## Verified implementation and remaining final checks

- The actual Deliberate Practice component markup, typography, controls, notes and sharing are reused. Language Muscle supplies recursive navigation and the original EPUB construction pattern. Original source locations, hashes and adaptations are recorded in the module receipts.
- Source comparison verifies 515 input hashes, every original practice chapter and Language Muscle section, all 253 complete answer bodies, and canonical Folio reading order. Author files and editorial proposals remain unchanged.
- The core builds its exported stylesheet, all 66 original Language Muscle HTML classes, local fonts and three font notices without the demo or manuscripts. Installed-package tests cover native Node imports and a Vite consumer. Browser checks cover local font loading, rich content and mobile navigation.
- The three actual ebook buttons work. Five service archives pass EPUBCheck; route, XML identifier and final reference regressions pass. Browser generation makes no hidden network requests and requires explicit image bytes.
- Astra independently closes the Unicode annotation and quote-identity findings in [the reader follow-up](review-original-reader-followup-2026-10-23.md), and all four export/package findings in [the package follow-up](review-reader-epub-package-followup-2026-10-23.md).
- Final integration propagates the complete book identity to Notebook/browser titles and retains the actual verified tarball beside its hash. Authored release and test templates are separate files. The final narrow audit passes these changes and the exact clean source candidate.
- A final check found invisible MathML annotations duplicated in the reader text model. The hidden-text and actual selection/save/restoration corrections pass, including 160 browser checks. Both React runtime versions pass normal npm resolution, strict host types and browser interactions without migrating the demo. Their receipts and the final status record determine the final supported scope.

Passing technical checks is not author acceptance of a new interface or authority to publish.

## Reproduce and freeze

From the framework repository root:

```sh
npm run setup
npm run build
npm test
npm run verify:package
node scripts/prepare-reader-source-release.mjs --self-test
node scripts/prepare-reader-source-release.mjs --online
```

Setup uses the per-package npm lockfiles. The supported standalone core build is `npm --prefix packages/reader-core run build`; it creates every exported stylesheet/font as well as JavaScript and declarations. The public source candidate has its own core-only setup/build/test commands and requires no demo or original worktree.

The package verifier installs its actual tarball offline by default. The source exporter also attempts strict offline installation by default; `--online` explicitly permits registry fetches into disposable isolated cache when needed. Both preserve the seven-day release-age policy and disable install scripts. Record the actual mode rather than describing a registry-assisted run as offline.

Freeze a reviewed commit, rerun the relevant checks, retain the actual package/archive and their manifests, then compare their recorded hashes with the files. The old reviewed package is preserved separately under `build/review-e1bd378/`; do not confuse that checkpoint with later artefacts. Publish neither the whole working directory nor private Git history.

## Notices and technical limits

The compatible `qrcode` 1.5.4 patch removes the old `encode-utf8` runtime notice gap. No later notice has been relabelled as coverage of the removed version. The production dependency audit reports zero advisories.

The broad installed inventory retains four missing-notice paths: demo esbuild, demo Rollup, demo `dlv`, and core's development `dlv`. The latter is the same Tailwind build utility. Those host/build implementations are not vendored into the runtime or source candidates; retain and revalidate the exact exclusion evidence. The inventory therefore exits 1 even when package-content checks pass. Do not call it a fully clean inventory or erase the findings to obtain green output.

Development-tool advisories in the retained Tailwind 3 toolchain are recorded separately from the runtime audit. No forced stack migration was performed. Font licences, dependency notices, the framework's future software licence and each book's content rights are distinct.

Native import is supported after the ESM repairs; EPUB generation still requires browser DOMParser and XMLSerializer. Browser read-aloud is not a production audiobook. Annotation data remains in per-book browser storage; original unnamespaced annotations are not silently imported. No paid AI service is enabled.

## Two author choices before release

| Choice | Concrete decision | Preparation recommendation |
| --- | --- | --- |
| Software licence | Select the licence for the framework and original application code the author is entitled to license. | Prepare for MIT, while adding no grant or manifest licence field until selected. Keep book and third-party terms separate. |
| Public scope | Select core source/package alone, or also named real-book demos and their assets. | Release the core first. Keep the three books as private acceptance fixtures until explicitly included and their separate rights evidence is complete. |

Those choices do not themselves authorise publishing. Once the chosen scope and exact artefacts are approved, a release session can prepare a clean branch from the existing public base, apply only the reviewed source export, verify registry-name availability, select the release version, add the authorised software licence, rerun affected checks and publish only the approved outputs.

Real-book publication additionally preserves answer/question/editor credits, source licence versions and change notices. It needs its actual content and asset checks, including CEFR material and the captured original Notion icon. Store submission, canonical editorial acceptance and full audiobook production remain separate programme work.

No package publication, public branch push, deployment, WriteFlex import or store submission occurred during this preparation.
