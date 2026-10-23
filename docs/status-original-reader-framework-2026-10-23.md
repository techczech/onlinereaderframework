---
title: Original reader framework and release preparation status
date: 2026-10-23
register: FOR DOMINIK
status: prepared-independent-technical-review-complete
code_commit: 280b66761e8a4436066bd05040f9167dedcfc01b
publication_authorised: false
---

# Original reader framework status

**The framework now reuses the actual Deliberate Practice reader and Language Muscle navigation and EPUB code.** All independent review findings are repaired and closed within their stated scopes. The final Astra review verifies the frozen source release and maths selection changes. The original applications and manuscripts remain unchanged.

## Open the local books

- [Deliberate Practice](http://127.0.0.1:8773/?book=deliberate-practice) uses the original designed reader and its controls.
- [Building Your Language Muscle](http://127.0.0.1:8773/?book=language-muscle) preserves the rich book content and recursive navigation.
- [Linguistics](http://127.0.0.1:8773/?book=linguistics) contains all 253 answers in nine themes.

All three addresses returned HTTP 200 at handoff. Original comparison applications remain on ports 8771 and 8772. Automated desktop/mobile evidence is retained in `docs/verification-reader-framework-2026-10-23/`. No human visual acceptance is claimed.

## Verified behaviour

The root build and 36 Node tests pass. Actual selection, highlighting, note editing, navigation and reload pass 160 browser checks, independently rerun by Astra. Installed React 18.3.1 and 19.2.0 consumers pass strict host types and native imports. The package builds its original stylesheet, local fonts and notices without demo inputs. Three actual ebook buttons download valid archives; the separate EPUB/package review closes its four findings and verifies five EPUBCheck-clean archives.

Source comparison verifies 515 input hashes, all 21 practice chapters, all 12 Language Muscle sections and every complete linguistics answer in canonical order. Editorial proposal cards remain unaccepted and unfiled beyond the existing pilot.

## Frozen release preparation

The immutable directory `build/final-280b667/` contains both actual reviewed archives, manifests, installation evidence and React receipts. The source exporter started and ended at the clean code commit above without changing its inputs.

| Archive | Files | SHA-256 |
| --- | ---: | --- |
| `reader-core-0.1.0.tgz` | 205 | `ed01649710a154c0d8b0ad202e39e8160f962345cfcf1f90636c7faf46452d9c` |
| `reader-source-release.tar.gz` | 66 | `5b50174e1fac17ccb4419a89c5eaa37a43a9d6f7ba2a196796b8cca3eaf95ada` |

Astra independently installed and built the exact source archive, passed its 29 tests and reproduced the runtime tarball byte for byte. Its archive privacy checks and source-archive reproduction also pass. See [the final review](review-reader-final-source-2026-10-23.md), [reader follow-up](review-original-reader-followup-2026-10-23.md) and [EPUB/package follow-up](review-reader-epub-package-followup-2026-10-23.md).

## Release boundary

The [public-release plan](plan-public-reader-release-2026-10-23.md) is ready. The existing upstream repository is public; this working branch stays local because it contains private reports and book fixtures. The allowlisted source archive excludes those inputs. Software licence and public scope remain author choices before a later release; no licence grant was invented.

Four missing development-tool notices remain recorded separately, with the affected implementations excluded from both archives. This is not a fully clean installed-notice inventory. Partial maths-token highlights colour the whole token, and older rendering-dependent saved quotations are not migrated. Browser speech is not a produced audiobook.

No public push, package publication, deployment, WriteFlex import or store submission occurred. Audio production, cover selection, canonical editorial acceptance and book-store submission remain programme work.
