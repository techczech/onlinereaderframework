---
title: Independent production review of the two-book release and website importer
date: 2026-10-28
register: FOR AGENTS
status: changes required
reviewer: gpt-6.1-sol
ownership: parent retains repair, clean-build, import and publication ownership
---

# Verdict

**CHANGES REQUIRED. One P2 publication-isolation guard gap; one P3 refusal/cleanup defect.** No source repair performed. No actual manuscript leak, outside-folder write or data loss reproduced. No action required from Dominik; parent owns the technical repairs and subsequent release.

Audience/purpose: integrating parent; decide whether the exact current reader/website source can proceed to clean release preparation. Baseline: current files, not committed fallback data. No Git comparison or Git command. Source hashes in final evidence identify review scope; all 43 inventoried production files remained identical before/after the final run. The 25 reader and 9 website hashes in the builder receipt also match current source. Nine additional website metadata/render/style/cover files are inventoried independently.

# Findings

## P2 — Spec: the isolation verifier accepts another book's registry identity

Source: `apps/reader-demo/scripts/release/verify-edition.ts:155–168`, especially the start of `for (const other of others)` at line 155.

Required contract: publication isolation includes **all four other books' IDs, titles, samples and resources**, without renaming IDs. The loop probes titles, descriptions, long section IDs, samples, hosts, covers and embeds, but never probes `other.id` as a book identity. Structural section-ID matching does not cover book IDs.

Independent reproduction on **both real built editions**, separately for each of their four other books:

1. Build the edition with the real release plugin and Vite configuration into review scratch; baseline `verifyEdition` passes during `buildEdition`.
2. Append `globalThis.foreignBook={id:"<other-book-id>",sections:[]};` to the main JavaScript bundle.
3. Call actual `verifyEdition` with the same plan, **all four** other book objects and their addresses.
4. Result: **8/8 foreign book-ID insertions return `[]`**, including Readability in Academic and Academic in Readability. The same paired fixtures refuse **8/8 titles, 8/8 text samples and 8/8 foreign cover paths**. Restore original bundle bytes between cases.

Consequence: a regressed combined registry or partial foreign book record can ship without the publication-isolation gate detecting its identity. This proves a guard false negative, not that current unmodified bundles contain another manuscript. Expected-tree hashing cannot detect this during the build that creates the accepted tree: a newly generated manifest simply records the contaminated bundle hash.

Required correction: detect other book IDs in structural book-identity/registry positions across all four other books, retaining the ordinary-word and longer-heading-anchor false-positive fixes. Add a regression for each other book ID in each new edition. Do not rename source IDs. Re-review this boundary after repair.

## P3 — Spec: a symlinked existing import record throws after staging and leaves both staged editions

Source: website `scripts/import-reader-books.ts:254–257`. `oldHeaders` and `oldRecord` reads occur outside both error-handling regions; the record leaf is not checked during the initial planning guards.

Independent reproduction:

1. Create a scratch host with real `public`, `public/books`, `src/content`, `_headers` and outside canary.
2. Make `src/content/reader-books.json` a symlink to the existing outside canary. Supply two otherwise valid scratch edition fixtures. Their verifier callback is deliberately stubbed **only for transaction testing**, as in the builder's importer tests.
3. Call actual `importReaderBooks`.
4. `readRegular` correctly refuses the symlink, but the exception escapes rather than returning `ImportResult`. Two `incoming-*` folders remain under `.reader-books-import/`.

Observed in every retained production-probe run, including the final run. The host snapshot and outside canary remain unchanged: **no symlink following or outside write is alleged**. Consequence: the documented structured refusal/cleanup contract fails, leaving roughly two editions staged after a deterministic pre-existing leaf condition.

Required correction: validate the record leaf before staging, and/or cover old-file reads with the same cleanup/refusal handling as preparation. Assert that this refusal returns `ok:false`, preserves the host/canary and leaves no incoming staging folders. No production self-fix performed.

# Fresh evidence

Authoritative run: `evidence-two-book-production-2026-10-28T03-34-29-160Z-17489.json`; driver `probe-two-book-production-2026-10-28-v3.mts`. Driver process exit **0** means evidence collection completed; the accepted hostile cases above deliberately remain visible and prevent a clean verdict.

Run from **`apps/reader-demo`**, the documented release working directory:

```sh
node --import tsx ../../docs/release-two-books-2026-10-28/review/probe-two-book-production-2026-10-28-v3.mts
```

- Academic: **147 files**, tree SHA-256 `a185201757de8c7ce48356801bfb4ad6dbd7831a85d1e5683f0223c554161f0f`.
- Readability: **158 files**, tree SHA-256 `bc727d5ef93cea64ab753c8ef5c77bf24a697f60d21d4dee5e8fafa30163ec3f`.
- Both builds use `sourceTreeDirty:true`. Their trees reproduce the builder's recorded prefixes. **Neither is a deployable clean-source edition.**
- Importer hostile manifest traversal, wrong expected tree, dirty manifest, recomputed-manifest header escape, source leaf/ancestor/manifest symlinks, host books/destination/header/content symlinks and verifier rejection all refuse with the host snapshot unchanged. The record-leaf case is the P3 above.
- Six artificial failure points were exercised after a successful previous import: after stage, after first move, after all moves, before headers, before record and after record. Every failure preserved the previous host snapshot; the five write-phase failures report `restored:true`. No incoming staging remains.
- A **real EACCES** at final record rename was induced by making only the scratch record's parent directory read-only. Both book moves and the header update had occurred. The importer restored the previous site byte-for-byte, reports `restored:true`, and leaves no staging. Permissions restored before scratch removal.
- The outside canary stayed unchanged throughout. Unrelated host index and third-folder canaries participate in snapshot comparisons.
- Header checks separately refuse an outside-folder rule, `allow-same-origin` and detaching `X-Robots-Tag`; authentic scoped headers pass.

Supplementary run: `evidence-two-book-boundaries-2026-10-28T03-33-24-791Z-11248.json`; driver `probe-two-book-boundaries-2026-10-28.mts`; exit **0**.

- Actual asset planner accepts its control and refuses ten cover/embed byte, manifest path/descriptor, leaf/ancestor and app-root alias tamperings. A further leaf symlink to an existing outside HTML canary is refused by actual `readAppFile`; outside canary unchanged.
- Two safe edition bases resolve on the supplied actual page origin; eleven unsafe host/path/query/hash/depth bases return null and fail registry validation.
- Actual source-export **five-book manuscript/privacy self-test passes**, exit **0**. Only its root/build constants were relocated in a scratch copy so its own temporary files remain in the authorised review folder. No source export, package installation or candidate rewrite was run.

All review scratch was removed in `finally`. Previous builder logs and earlier review evidence were preserved.

# Website follow-up: current sources and rendered output

The final run copies **actual current** website `src`, `public`, configuration, scripts and tests; dependencies are copied locally. No committed `guides.json` fallback. Current source build: exit **0**, 1,016 generated pages. Focused guide/importer/record tests: **58 pass, 0 fail**, exit **0**.

Then, **in scratch only**, copies of the two dirty edition manifests are marked clean and the verifier is stubbed for importer transaction exercise. Correct expected-tree pins are supplied. Both exact destinations import; the actual current website builds again, exit **0**. Guide/importer/agent-layer/dead-link tests: **1,075 pass, 0 fail**, exit **0**. This is current-data integration evidence and **not deployability evidence**.

Rendered homepage, resources and academic-productivity pages contain the correct two cover images, `book-cover` class and `Cover of <book name>` alternatives. Current cover CSS applies `object-fit:contain`, and the special homepage hover override applies only to these covers. Existing screenshot paths do not acquire the class. Both host cover hashes equal the reader files and the selected-cover decision/pin:

- Academic, selected **3 / Connected ideas**: `d56c130ac7f8c84f707e8d48aee205981f80efbc7c45866637f5b0b22b524539`.
- Readability, selected **2 / Clear structure**: `adbedd7db78beaf5a54e9d165b72d302158cc42ada2261745e2bd126c8e074ef`.

Both `bands.json` cards have their new book URLs, names, covers and Book kind. Homepage rendering retains the existing record-link routing: its primary card anchors resolve to the corresponding `/resources/<book-id>` record, rather than directly to the book. Resources and academic-productivity output include the canonical book destinations; record-page tests pass. This review does not request a design/routing change.

The import record starts empty. Root discovery lists imported books only after the scratch import; agent-layer and importer tests verify those records and emitted paths. The original root `_headers` has only the existing preview noindex and RSS rules; added book CSP/frame rules stay under the two exact book folders. No delivered header claim follows from inspecting generated `_headers`.

# Source review coverage and limits

Read the release receipt; earlier **clean embed-authority** and **integrated-book closure** reports; actual registry, core base/resolver/frame, release swaps, asset pins/provenance reads, projection, plan, headers, build/manifest transaction, verifier, route startup, source-export anchors; website importer, record/library, discovery endpoints, importer/agent tests; actual guide/card/component/page/style follow-up. Frozen source hashes accompany this report.

Confirmed in current source: iframe/full-view URL authority comes from `window.location.href`, not `document.baseURI`; the optional edition base supplies only a validated path. Five module swaps are required before bundle emission. Every verifier call from the release CLIs passes all four other books. Academic receives no new licence; Readability retains the unversioned `https://creativecommons.org/licenses/by/`. Public export allowlist excludes manuscripts; all five feed exclusion anchors. No public framework version bump or private-branch publication was performed.

The importer default calls the reader's real `verify-existing-edition.ts`, requires its deployable verdict, then validates manifests, pins when supplied, source cleanliness flag, exact files/hashes and scoped headers before promotion. **Successful execution of that default against a newly committed clean release is still owed by the parent.** `--expect-tree` remains optional at API/CLI level; the authorised parent command must supply both pins. No source-commit attestation stronger than the existing manifest/verifier contract is claimed.

Pure route probes cover chapter folder/slashless, query, legacy hash and book-folder slashless forms; embed resolutions remain under the book folder and actual page origin. **No fresh browser was launched.** The builder's retained 72 browser checks and earlier embed security closure are historical evidence only. Font/module request loading, opaque full-view behaviour and actual refresh/navigation need their existing browser/deployment acceptance; this report adds source/artefact/pure-function checks, not a new 72-check browser result.

Existing three public-book outputs were not rebuilt or deployed by this review. Their unchanged-address behaviour and retained builder comparison were inspected, not independently re-proven against a Git baseline. Instructional Videos and Dyslexia remain excluded. No live Cloudflare headers, crash-atomic directory exchange, ancestor-swap race safety, Firefox/Safari, real-device or accessibility acceptance is claimed.

Retained preliminary production runs `03-30-02` and `03-32-16` ran from repository root and emitted a missing Tailwind-content warning. Their CSS artefact hashes are superseded by the final **app-directory** run; their raw results remain. An initial v3 launch failed before creating its driver because the generation path was relative to the wrong working directory; corrected before the recorded final run. The first scratch website build shared dependencies by symlink; the final two runs use copied dependencies. No production source hash changed.

No Git command, push, deploy, secret access, other agent, Chrome installation, user desktop interaction or production-folder import occurred. Only new review probes, evidence and this report were authored in the authorised reader review folder.

# Parent handoff

Repair and independently re-check the P2 guard. Resolve the P3 cleanup defect. Then retain the parent's existing sequence: commit owned source, build from clean converted source, run the real release verifier, pin both verified tree hashes during host import, build/test the actual host and observe preview Cloudflare headers. **No clean release/publication verdict is issued here.**
