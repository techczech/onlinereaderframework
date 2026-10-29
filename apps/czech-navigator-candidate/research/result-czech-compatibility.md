---
status: implemented-awaiting-parent-integration-and-independent-review
by: Sol
verified: 2026-10-29
---
# Czech Navigator compatibility parcel

Shared compatibility implemented. No deployment, source conversion, WMF rendering, asset restoration, staging, reset, commit, independent review or subagent work performed. Existing manuscript, table surfaces, atlas CSS, heading/table mapping and semantic ledgers untouched.

## Actual saved-state contract

Reader namespaces storage by unchanged book ID. Existing fields: `highlights`, `reflections`, `readSections`, `bookmarkedSections`, `lastSection`. Bookmarks and progress contain section IDs, not anchor locations. Highlights contain quoted text, section identity, date and note; rendering finds a DOM text range from that quote. The existing canonical Highlight type has no persisted numeric range or scroll position. Extra fields remain uninterpreted.

Optional `book.compatibility` declares exact retained source-anchor owners and the old overview's destination units. No new source text IDs. Configuration currently lives in the generated candidate book JSON. Migration runs before hook hydration; originals are backed up byte-for-byte under `publication-reader:<encoded book ID>:compatibility:czech-parts-2026-10-29:original:<field>`. Existing backups are never replaced. Changed records spread original fields, preserving notes, unknown metadata and any uninterpreted range data. Exact quotes migrate only when one configured destination contains them; an explicit unknown anchor prevents quote fallback. Unknown or ambiguous records remain on the overview. No old pixel offset is inferred. Failed backup/storage migration disables persistence of the affected reading-state hooks for that session. Malformed input is preserved in the original backup before existing hydration validation applies.

Overview-only bookmarks, read ticks and last-section state remain overview-only. Opening the overview never marks its ten children read. Reflections without an explicit recoverable anchor stay with the overview. This retains unknown locations rather than inventing chapter completion or position.

New scroll positions use `readingPositions` for configured books, separately from preserved original values. Explicit chapter choice starts at zero; Continue reading uses the saved chapter position; browser history entries retain their own scroll position. Classic home exposes Continue reading for configured books; configurable front pages use a separate optional Resume callback. Books without compatibility configuration retain their storage and home behaviour.

## Authored paths

- `packages/reader-core/src/original/saved-state-compatibility.ts`: migration and original retention.
- `packages/reader-core/src/original/use-publication-reader.ts`: hydration, Resume/history positions, cross-unit fragment links and query fragments.
- `packages/reader-core/src/original/publication-model.ts`: optional explicit anchor map in URL resolution.
- `packages/reader-core/src/original/types.ts`: optional compatibility contract.
- `packages/reader-core/src/original/Home.tsx`, `frontpage/FrontPage.tsx`, `frontpage/layouts.tsx`: distinct optional Resume action.
- `packages/reader-core/src/original/ReaderLayout.tsx`: Resume callback plumbing only; pre-existing visual edits retained.
- `packages/reader-core/src/agent-export/agent-links.ts`, `agent-export.ts`: optional exact-owner fragment rewrite in exported HTML.
- `packages/reader-core/src/original/test-saved-state-compatibility.mjs`: migration/export regressions (run after framework build).
- `apps/czech-navigator-candidate/book-czech-navigator.json`: explicit compatibility map only, alongside inherited/concurrent chapter changes.
- `apps/czech-navigator-candidate/research/result-czech-compatibility.*`: result, runnable hidden browser harness and logs.

## Verification

- Framework build exit 0: `result-czech-compatibility-build.log`.
- Direct candidate Vite build exit 0: `result-czech-compatibility-candidate.log`. Deliberately bypasses Python conversion/generation. Existing chunk-size warning remains.
- Focused Node reader/migration/navigation/frontpage tests: 38 passed, zero failed, exit 0: `result-czech-compatibility-tests.log`.
- Agent export suite: 26 passed, zero failed, exit 0: `result-czech-compatibility-agent.log`.
- Hidden bundled Chromium harness exit 0: `result-czech-compatibility-browser.log`; rerun from repository root with `node apps/czech-navigator-candidate/research/result-czech-compatibility.mjs`.
- Browser checks: old overview plus `#gender` routes Nouns; section-only old URL retains overview; delegated cross-unit inline fragment fixture retains exact anchor; explicit chapter choice returns to zero; Back/Forward restores measured 731px location; Continue reading restores 613px; explicit same-chapter choice returns to zero; actual legacy quote migrates and renders as a DOM highlight; note/unknown fields/range metadata remain; old overview tick remains one tick; exact Word Order search result opens Word Order.
- Migration tests: multiple records, explicit known/unknown anchors, unique/ambiguous/missing quotes, unknown fields and range metadata, unchanged overview bookmarks/read ticks, malformed input, unrelated book configuration, storage failure, original retention and exact idempotent rerun. Agent fixture proves configured fragment-owner rewrites and unchanged unrelated-book fragments.
- Actual candidate `buildAgentBook` produces 22 reading-unit entries. Browser test invokes this directly; does not claim served agent files exist.
- Focused `git diff --check` exit 0. Unrelated other-book canonical-domain/release-isolation tests were not rerun or modified; inherited failures remain documented in `result-czech-atlas-implementation.md` and `check-framework-implementation.log`.

## Parent integration boundaries

1. Candidate generator owner must preserve/reproduce the exact `compatibility` object when regenerating book JSON. This parcel intentionally did not edit that script. Regeneration currently risks dropping configuration.
2. Candidate host currently renders only `PublicationReader` without agent access configuration. Its index contains an empty root, a module entry and `noindex,nofollow`; no crawler/no-JavaScript book text or agent-generation invocation exists in this candidate. Shared agent export follows all 22 units and fixes mapped fragment ownership, but generated/served agent files and crawler/no-JavaScript output require host-build work by the owning agent. This parcel does not claim those outputs are integrated.
3. Cross-unit inline browser exercise uses a delegated fixture anchor attached to the real manuscript root; it checks the live core handler. It is not a claim that every source inline link was semantically audited. Source-dependent link/heading validation belongs to the semantic parcel.
4. Numeric range metadata remains preserved, never rebased or used as a new canonical coordinate. Actual recoverable highlights use the existing exact-quote DOM range contract. Old state without a recoverable anchor/quote remains explicitly in its overview record and original backup.
5. Parent independent Sol review remains required after all parcels. No self-claim of independent acceptance. No new DTC request.
