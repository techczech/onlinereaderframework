---
title: Independent integration and source-preservation review of two converted books
date: 2026-10-28
register: FOR AGENTS
status: changes requested; preview checks pass within stated limits; production release acceptance excluded
ownership: review complete; implementation and release ownership returned to parent
---

# Verdict

**CHANGES REQUESTED. Three P2 findings: incomplete homepage-copy preservation; unsafe demo asset-copy configuration; an assumed licence version retained in prepared source.** No production edit made. Parent owns correction and any focused re-review. Dominik has no action in this review.

The nine generated interactives reproduce their recorded source behaviour. All nine rebuild byte-for-byte. The parent's tall-target scrolling and narrow-layout corrections pass focused checks. Neither new book appears in the three existing release bundles. These results do not establish complete source preservation or production readiness.

Purpose/readers: independent agent-facing handoff to the integrating parent; evidence, actionable Spec/Standards findings, exact reviewed bytes, preview/release boundary. No author prose rewritten.

# Findings

## P2 — Spec: homepage summaries fall outside source accounting and disappear

Location: `apps/reader-demo/src/books/next-books/build-source/assemble.ts:121` (Readability projection), `assemble.ts:108` (Academic home); accounting input `build-source/render-originals.tsx:18` and `:25`.

Readability conversion captures `item.description` in `build-readability.tsx:226`, then assembly projects only id/title/category/format/content. The original `components/Home.tsx:110` renders those descriptions as prose beneath chapter titles. Thirteen of fourteen descriptions are absent from the entire prepared book; the checker description survives independently in its chapter. Three Academic teaser paragraphs from original `App.tsx:115`, `:135`, `:154` are also absent. Exact text, source lines and presence checks: `evidence-review-integrated-books-home-copy-2026-10-28.json` (16 missing of 17 inspected summaries).

Example: Readability's “Essential guidelines for screen readers, magnifiers, Word, PDF, and meaningful links.” is omitted. Academic's “Linear reading often fails in academic contexts. Discover how to switch modes for better comprehension.” is omitted. These are authored summaries, distinct from control labels such as Start or Go to Section. The conversion report does not account for their removal.

Why 50/50 stays green: the original-render oracle renders `DetailSection` and `Content`, never either original homepage. Therefore its zero-lost-words ledger is valid for the 24 chapter views only. It cannot substantiate an unqualified whole-source preservation claim. This is a bounded homepage omission; no loss of chapter teaching concepts is asserted from it.

Correction: preserve the exact summaries in the book's source/content projection, or obtain an explicit exclusion and record each removed passage. Include original homepage prose in source accounting. Do not silently paraphrase or classify all home copy as chrome. Recheck these 17 passages and the affected home/export projection; no wholesale browser rerun needed.

## P2 — Spec: demo asset plugin follows escaping paths and symlinks

Location: `apps/reader-demo/scripts/demo-embed-assets.ts:15`–`:18`, `:28`, `:34`–`:35`.

The plugin trusts `interactivesDir` and `src`, constructs a file with `path.join`, checks existence, then reads it for both middleware and bundle emission. It validates neither manifest shape/path components, local HTML extension, realpath containment, nor symlinks.

Independent fixture results using the actual plugin:

- Valid listed local HTML is served and emitted as expected.
- `interactivesDir: ".."`, `src: "outside-allowed-assets.txt"` serves a synthetic file outside the fixture app and passes its bytes to `emitFile` at the clean URL `embeds/book/outside-allowed-assets.txt`.
- A listed `linked.html` symlink inside the allowed directory serves and emits the same outside canary.
- A traversing `src` also reaches the canary; the captured hook receives an unsafe output filename. Actual Vite acceptance of that unsafe filename was not established or needed for the first two reproductions.

All canaries were synthetic and remained inside review scratch. No private file was read. These are direct real-plugin middleware/hook tests, not a live HTTP exploit or proof of arbitrary filesystem writes. Reach requires hostile local build configuration or changed asset files; manuscript content cannot configure this plugin. Current checked-in manifest paths are benign and copy exactly nine HTML files. Core iframe security closure remains intact.

Correction: fail closed on malformed configuration, unsafe book/src/output components, non-HTML input and canonical-path escape from the allowed interactive root; handle symlinks explicitly and consistently at read time. Validate before middleware registration/emission. Keep the valid-nine-file case, add these hostile fixtures, and re-review this copying boundary.

## P2 — Standards: prepared Readability data still chooses CC BY 4.0

Location: `apps/reader-demo/src/books/next-books/build-source/assemble.ts:120`; prepared `readability-foundations.book.json:22`; provenance `licenceFinding`.

Original notices say CC BY without a version. The assembly source and prepared JSON point to `/licenses/by/4.0/`. That is a version-specific licence target even though its label omits a version. `demo-books.ts` correctly overrides the link to `/licenses/by/` for both reader and agent consumers, so this finding concerns prepared/rebuild source and its provenance, not a new rendered-preview licence claim. It was disclosed in the integration receipt; it remains unresolved in the reviewed scope.

Correction: keep the canonical prepared source and provenance version-neutral until Dominik chooses a version; regenerate hashes after correction. A registry-only override must not be mistaken for correction of the source artefact. Do not substitute BY-SA or add any Academic licence grant. No legal opinion or new licence grant made here.

# Source, behaviour and integration evidence

Fresh driver: `probe-review-integrated-books-2026-10-28.mts`, exit **0**. Each spawned source render, book-accounting and embed rebuild command exits **0**; full commands/stdout/stderr in `evidence-review-integrated-books-2026-10-28.json`.

- **95/95 provenance entries match current bytes:** 55 recorded original source files, 28 Folio files and 12 generated outputs. This verifies recorded inputs, not an exhaustive repository/history census. Readability uses the recorded read-only guide worktree; no original repository or Folio was regenerated.
- **50/50 fresh book checks**, exit **0**: original chapter order, 10/14 sections, one first h1/no heading-level jumps, resolvable internal chapter routes, long prose anchors, sanitized content and chapter word accounting. Homepage limitation above remains.
- **9/9 byte-identical rebuilds** into cleaned review scratch, including both corrected narrow graphics. Current provenance already records the new body attributes and scoped CSS output; the older integration receipt's nine pre-repair HTML hashes are historical, not current output hashes.
- **122/122 original-behaviour browser checks**, exit **0**, bundled Chromium 153.0.8010.12. Fresh original component renders are the oracle. Includes all 9 explorer node definitions, 15 arrow paths/labels, selection/dimming/reset/Escape/keyboard; cramped/clear states; font limits and selected sizes; checker empty/long/punctuation/HTML-like strings; nine offline pages and CSP operation. Slide comparisons retain original rendered markup and captions; photo replacement remains provisional. Slides and the two Academic diagrams are rendered demonstrations rather than newly invented stateful controls.
- **51/51 focused independent checks**, exit **0**, `probe-review-integrated-books-focused-v4-2026-10-28.py`: actual speech projector over live chapters at 1280/375px excludes frame labels/links and includes prose; tall direct-link target starts at the actual scroll area and receives focus; both corrected graphics fit 320/375/768px; slide nodes/subpoints remain; fresh EPUB downloads contain all nine complete prose alternatives and no iframe/frame wrappers/chrome. This checks projected spoken text, not real audio or a screen reader.
- Built preview's nine embed files equal current generated inputs. App lazily loads `demo-books` only outside the constant-folded release branch. Reader and agent script both consume that registry. No canonical-site entry is introduced for either new book; generated preview addresses are relative/current-page based. `sourceUrl` records a source address, not proof a converted book is deployed there.

Existing integrated browser evidence was inspected, preserved, and not relabelled as our independent run: original **434/438**, corrected **438/438**. Fresh narrow checks cover the parent's two repairs. Stored-fragment/history scrolling retains the pre-existing centring behaviour; this review accepts the requested direct-content-link correction only.

# Release isolation and excluded production work

Fresh builds of Deliberate Practice, Language Muscle and Linguistics use the actual edition planner/release plugin and `configFile:false`, with all build output under cleaned review scratch. All three builds complete. None contains any of the nine converted-book markers checked, a demo-registry filename or an `embeds/` output.

The real verifier ran against all four other books with **unchanged section ids**:

- Deliberate Practice: **4 failures**, all ordinary-word `accessibility` false positives.
- Language Muscle: **0 failures**.
- Linguistics: **9 failures**, all the same documented false-positive class.

Driver exit 0 means evidence collection completed; it is not a claim that those verifier failures passed. The test's section-id-renaming workaround was not used. **Production release/verify correction is explicitly OUT of this preview.** No complete release-acceptance verdict.

New-book release planning/copy/header verification, public source-projection guards, canonical publication route, live host headers and deployment remain parent/release-owner work. Demo middleware CSP was checked locally; demo build has no deployment `_headers` acceptance. No deployment or already-public-site claim is made.

# Known preview limits

Inline placeholder replaces the original remote photograph; no licensed final photograph chosen. Covers unchosen. Academic licence grant and final Academic publication URL undecided. Readability licence version undecided. Appendix references retained verbatim. Checklist remains a plain list as disclosed; tick/notes behaviour is not one of the nine requested embeds. Explorer fullscreen is replaced by host full view; panel moved below; diagram scales before horizontal scroll; this preserves graph relationships. Embed colour scheme follows the OS rather than the reader's manual theme, per v1.

No real device/touch, Safari/Firefox, screen-reader or visual dark-mode acceptance. No wholesale repeat of the closed core security review. Instructional Videos and Dyslexia excluded and untouched. No Git, push, deploy, other agent, package install or source-author wording edit.

# Probe integrity and preservation

Focused browser probe development failures are retained, not suppressed: first run exit 1 (local eval did not expose speech helper), v2 exit 1 (wait selected a hidden navigation button), v3 exit 1 (anchor filter included an excluded frame-title id). V4 corrects only probe logic and passes 51/51. No production correction occurred between these runs.

All review scratch removed, including source renders, browser profile and synthetic canaries; browser/server closed. Before/after comparison covers 219 production source/script/interactive files: **zero changed**. Review writes limited to new files in this assigned directory. Exact production snapshots and source/probe/output hashes below enable cold re-checking. Ownership released to parent; this review does not authorise publication.

# Exact hashes

SHA-256. Full 219-file snapshot: `evidence-review-integrated-books-before-2026-10-28.json`; verified after snapshot: `evidence-review-integrated-books-preservation-2026-10-28.json`.

```text
8df06e1b313486b9e7de1ad8f56db41308e64cb8a403ea9e2d73d9908685de08  apps/reader-demo/src/App.tsx
6e9c1fafed23f8768c3c1d1c3e316ffc79dfdc0c7506002fca6bd21e81863ccd  apps/reader-demo/src/books/demo-books.ts
a359960e3d1952e5da2062d7e7f3f3d9f7bd533fa7be9a4c5fb1058e95917b10  apps/reader-demo/scripts/demo-embed-assets.ts
7d028cbb96d747611b0b2e1ca37a7707dfa3dc6df7e5a33003a9e49c9a40780f  apps/reader-demo/scripts/build-agent-files.ts
f2dbf02f474b3ca45538e294237c51bccad255f96afad3745b01a9d43661e517  apps/reader-demo/vite.config.ts
e3c63f4bdc50b61258e3510278533890f4ed79107ff6164dc171fd075862d717  packages/reader-core/src/original/use-publication-reader.ts
d6a6458862c19b07d4e44982542d8712e1654743220138ddd9b909aabc857f13  packages/reader-core/src/embed/PublicationEmbedFrame.tsx
716a538c01830179fd3de26d8320317f269e3bcc10fcc2c13321cbb463b157ad  packages/reader-core/src/embed/embed-model.ts
f0e77b1e21651ab5f52e8a70a94cee9bfb6df23d2c457cad27152516a222fe68  apps/reader-demo/src/books/next-books/next-books-provenance.json
0e64b4f2e739dfcf4247c80ba50c02693af0e6fcbf6ff3bb2d195015725758a2  apps/reader-demo/src/books/next-books/build-source/build-embeds.tsx
eaa35c89f4307e7760049748f2cfd217c00b7db9fdba2ece103c1e89b4b81352  apps/reader-demo/src/books/next-books/build-source/embeds/base.css
01db7400896229e24e79d9bb2134642f6f29808514a754319c3ceb8b95e6c20b  apps/reader-demo/interactives/academic-reading-framework/cognition-explorer/index.html
dd3d58e80cd25ddc98ec2c33954aa41454d256df5a2d0159714df32553b982b9  apps/reader-demo/interactives/academic-reading-framework/reading-articulation-layers/index.html
54435d7f9ecde47fa526ce7a050c10cee8d92ccbbeaf49467a1cd4ad46fe447a  apps/reader-demo/interactives/academic-reading-framework/reading-simplified-summary/index.html
4cccec58427f6cd021ab81f8504c689f2d2bf2631cd7f2e16e5bcf0e3efb0ef9  apps/reader-demo/interactives/readability-foundations/cramped-text-reveal/index.html
c541d7cb7761067ae4fb7b3716d3483ef72665012c5754ed43cfe38e57077857  apps/reader-demo/interactives/readability-foundations/font-spacing-adjuster/index.html
f5199a452faf5e3381d690ca52bae59f5f46d6b273d044bb2f4e0bb40cb0f8c5  apps/reader-demo/interactives/readability-foundations/readability-checker/index.html
2e8b713107e14b64258146f462ad79b2eac50b426fd4f276e53450ba1d6f9e40  apps/reader-demo/interactives/readability-foundations/slides-extraneous-text/index.html
78afa95e476e6dbb0166b33e858e31abc028e08be0a8499d3dc82681ac249fb4  apps/reader-demo/interactives/readability-foundations/slides-one-bullet/index.html
2edbcc400c0021b20e9ea63a04603af68e54cecbbc1b4d7a0503bd02d3fb51e2  apps/reader-demo/interactives/readability-foundations/slides-zooming-images/index.html
5d857da9be75545a378aad0cc7d36b551391135e3ffa667de32e32efcc322266  apps/reader-demo/src/books/next-books/academic-reading-framework.book.json
c6efa2a83c45b3be9a1c0d4ebd85300085226e5cedd42d4a7fd25af8c4ed1041  apps/reader-demo/src/books/next-books/readability-foundations.book.json
c2afc85fffbdaaa8511a62934c3876ace72c6240da1d43dc5ab8ad41d6d49b54  apps/reader-demo/src/books/next-books/embed-manifest.json
91f3af064035c3f7cf356979fadea61f182345ae86cb3cad93f294bd6790d32f  docs/evidence-integration-2026-10-28/log-integration-browser.json
d3a4ad46c9a332824adf4871dbd993eac54b7915a7b63b81fb1ffff81839356b  docs/design/2026-10-28-two-book-conversion/repair-integrated-preview-results.json
```

New review evidence and driver hashes:

```text
eb3561bbfdd4ad04bb3a1d16da57097db1c7a3fb721f792b037ad75e5ec85e69  evidence-review-integrated-books-2026-10-28.json
acd7fd6e045748f7e03c0710d036c98508fc4f4cd58242a0e921332d9388e048  evidence-review-integrated-books-accounting-2026-10-28.json
1c1d9f6d16ac7d781eee02543678198d21c9ac3cc9de2427f2d8a1e96e8fbaeb  evidence-review-integrated-books-before-2026-10-28.json
15a34446f1295a267924717434ac988980bba840585e57376fa17e00dfd209f2  evidence-review-integrated-books-browser-2026-10-28.json
d2754b0957a5b16491c8d65e137379bc9759ce9029e6686de15705032d20cb31  evidence-review-integrated-books-focused-2026-10-28.json
60d5fdca3dacb171404b156d7b85d9920d3bfc855653ec874540f3b9cd2d854c  evidence-review-integrated-books-focused-v2-2026-10-28.json
3f15145b01484ecb80d2bfb11f9e2d1f7e82a42943a47f5048e509b7b734037b  evidence-review-integrated-books-focused-v3-2026-10-28.json
167dd9a521328acf60d08d885e95ea36cae6c9a4eaaff2a352b0ae4213d25eaf  evidence-review-integrated-books-focused-v4-2026-10-28.json
af94f03b7e56cd05531273f71cdf3d2be28e8c14764dc50526b788989d08e83c  evidence-review-integrated-books-home-copy-2026-10-28.json
6cfea6041362042aa8bdd95924860e98e9d33f00d7ab993784aad0acbcb00de6  evidence-review-integrated-books-preservation-2026-10-28.json
ab79a391b09c4295769e4ab04ace268fb61230d2ca115ebdec1da6c21a8aa0dd  probe-review-integrated-books-2026-10-28.mts
79434f58bba612e32b77950e687bb5ff8a981ba1b2e1902678cb895f115639f9  probe-review-integrated-books-focused-2026-10-28.py
73f0633fefa08f7cb22896679b84b9988e9b22110a97677342c119349dc2149a  probe-review-integrated-books-focused-v2-2026-10-28.py
8dd7d24fb093c5db2f52f3fdcbc2a75041f6e17189f2e4416ea61698b9b95eaf  probe-review-integrated-books-focused-v3-2026-10-28.py
6d2bb1c4b57041379df7d265366705a32da8ee28c345221b54621e40496ce8f1  probe-review-integrated-books-focused-v4-2026-10-28.py
```
