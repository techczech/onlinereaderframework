---
title: Academic Productivity and Developing Competence packaging preparation
date: 2026-10-29
status: ready-for-independent-review
source_freeze: 4731652
---

Academic Productivity and Developing Competence are registered for the existing folder-edition pipeline. No commit, tag, push, public-folder import, preview, deployment or GitHub release occurred. No agents were used. Original source repositories, Folios, author text, core, converter, public-source exporter and Course Design were untouched. All work remains uncommitted for parent review.

The proposed canonical paths are https://dominiklukes.net/books/academic-productivity/ and https://dominiklukes.net/books/developing-competence/. A filesystem route search found no existing route at either folder. The existing src/pages/academic-productivity.astro hub is separate and unchanged. The importer and discovery reader now allow exactly four folders: the two previously approved folders plus these two. The discovery record itself was not edited: books become discoverable only on successful import.

The release registry contains seven books; Course Design remains demo-only. Build and verification CLIs now supply all eight demo books to the isolation checker, excluding the edition itself, so Course Design is also a negative control. Existing staging, symlink refusal, rollback, exact manifest hashes, manifest-last promotion and source-clean gates remain in place. The two new editions have pinned cover-only asset plans and no embed descriptors or sandbox exception rules. Cover2 pins match selected-covers.json and actual JPEG bytes. Academic Productivity retains seven top-level chapters and its source CC BY 4.0 notice. Developing Competence retains nine including Engagement Types and Accessibility; no licence grant was added. The software MIT licence is separate.

Two bounded compatibility allowances require particular reviewer attention. Developing Competence retains exactly four underscore IDs (learning_types, components_expertise, knowledge_vs_fluency, complexity_scale); these alone are accepted for that book. All other IDs retain the existing path guard. Academic Productivity explicitly cites academicreading.edutools.fyi in its manuscript. Only that book/source pair is excluded from the foreign source-host probe; identities, titles, text samples, covers, embeds and canonical edition URLs remain checked.

Verification: reader npm run check exited 0. npm run test:release exited 0 with 30/30, including real builds of both books in test scratch, all seven foreign identity injections in each, chapter counts, canonical folders, selected cover provenance and cover bytes, absent embeds, exact-ID controls and existing rollback/symlink/false-positive regressions. Tests use an explicitly synthetic clean source object: these are not clean-source production releases. Website DLNET_SKIP_BUILD=1 bun test ./tests/reader-books.test.ts exited 0 with 36/36. The same final test runs in a scratch git archive of committed website HEAD overlaid only with the three owned files; its log and source SHA receipt are retained. Dependencies were reused locally, no install. No website build was run. Its existing dist assertion is not evidence of a newly built website. Scratch was removed in finally. Both repositories pass git diff --check. Earlier test attempts exposed the underscore/source-attribution incompatibilities; final log supersedes them. One earlier broad Bun filename invocation also discovered a pre-existing archived test copy; final exact ./tests path excludes it.

EPUB limitation: the current generator exports on demand in the browser. Its options accept supplied chapter-image assets, but it only embeds images referenced inside chapter content. It does not read appearance.cover or offer cover-page/cover-image options. Therefore selected covers are shipped and hash-checked for the actual reader homepage, but are NOT embedded in the EPUB. Adding unused cover asset bytes would not fix this. No core or author-text workaround was introduced. No static EPUB is emitted by this established pipeline, and no generated EPUB archive/browser download was inspected here. EPUB chapter/link/source-notice acceptance remains outstanding. A future cover-in-EPUB requirement needs a separately scoped core change; do not claim this preparation provides it.

Parent sequence after mandatory independent security/write-path review (do not execute against the dirty website):

1. Review the exact patches and hashes here, especially both compatibility allowances, cover pins, isolation scope, importer and discovery allowlists. Re-review any security/write-path repairs until clean.
2. Commit only reviewed owned paths under parent authority. Prepare clean source snapshots/checkouts; do not weaken sourceTreeDirty checks. The existing normal verifier must refuse uncommitted candidates. No deployable production tree hashes are supplied by this preparation.
3. From reader apps/reader-demo, run each command separately:

```sh
npm run check
npm run test:release
npm run build:release -- --book academic-productivity
npm run verify:release -- --book academic-productivity
npm run build:release -- --book developing-competence
npm run verify:release -- --book developing-competence
```

4. Record both real manifest treeSha256 values. Against an isolated, committed-source website snapshot with the reviewed importer diff, run the real importer (no verifyReader fixture override), once per book:

```sh
bun scripts/import-reader-books.ts --reader <clean-reader-root> --book academic-productivity --expect-tree academic-productivity=<verified-tree-sha256>
bun scripts/import-reader-books.ts --reader <clean-reader-root> --book developing-competence --expect-tree developing-competence=<verified-tree-sha256>
```

5. Build/check that isolated website using its existing Bun scripts, then run importer/discovery/agent/dead-link tests and browser acceptance. Parent owns resource cards. Never build/deploy the unrelated dirty editorial working tree. Verify imported record preservation and unchanged existing five publication outputs against recorded baselines.
6. Before publication acceptance, inspect real EPUB downloads for both books (chapter counts, attribution/licences, internal links and download names); check folder/slashless chapter refresh, canonical URLs, module/font/cover loading, sitemap/llms/agent URLs, keyboard/mobile paths and no foreign manuscript/cover/embed. Observe delivered Cloudflare CSP/frame/nosniff headers in preview and production. Preserve the existing rollback evidence and pins. No live delivery or full old-five production equivalence is claimed here.

No further cover decision or release permission is requested. Parent owns independent review and subsequent publication.
