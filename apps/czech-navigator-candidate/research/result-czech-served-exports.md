---
status: implemented-awaiting-parent-review
by: Sol
verified: 2026-10-29
---
# Czech Navigator served exports

Host integration complete locally. No deployment or independent review. Concurrent semantic, compatibility, visual, source, EPUB and WMF changes preserved. No semantic generator invocation, source deletion, restoration, shared-engine edits, commit or push.

## Public routes

Canonical origin: https://czechnavigator.dominiklukes.net/

- `/llms.txt`: framework-generated book discovery.
- `/agent/czech-language-navigator-reference-candidate/index.md`: complete 22-unit index.
- `/agent/czech-language-navigator-reference-candidate/full.md`: whole book.
- `/agent/czech-language-navigator-reference-candidate/manifest.json`: ordered section/file map.
- `/agent/czech-language-navigator-reference-candidate/chapters/<section-id>.md`: 22 chapter files, exact filenames in manifest.
- `/czech-navigator-complete.html`: complete script-free reading derivative, all units and source tables, linked contents and source anchors.
- `/`: existing reader, configured agent access with canonical site URL; static derivative discoverable through ordinary link and noscript link. Noindex/nofollow retained on entry and static derivative. No robots-policy expansion.

## Implementation

`main.tsx`, `index.html`, `package.json`, `scripts/build-czech-served-exports.mjs`, `scripts/test-czech-served-exports.mjs`, generated `public/agent/**`, `public/llms.txt`, `public/czech-navigator-complete.html`.

Build order: existing Python semantic/book generation → new Node host adapter → existing Vite build. Separate `build:exports` and `test:exports` commands permit focused checks without EPUB/source conversion. Adapter consumes book JSON once, checks it remains unchanged, calls existing framework buildAgentBook/buildAgentRootIndex and renderPublicationContent. Static link rewriting uses existing framework rewriteReaderLinksInHtml; host converts chapter-plus-fragment links to single-document targets and aligns legacy source fragments with actual sanitised IDs. Agent Markdown retains shared exporter output except equivalent HTML href fragment alignment. Shared exporter was not refactored.

Only publication fields reach rendering. Browser annotations/storage, semantic evidence and private ledgers are never inputs. Output preflight rejects local filesystem URLs/paths and known private evidence markers. All writes confined to fixed public directory; existing path components checked for symlinks; no deletion, configurable output root or book mutation. This is a build-time guard, not a claim of adversarial concurrent-filesystem race immunity. No stale-file cleanup is performed; removed/renamed chapter retirement would require a separately reviewed owned-output strategy.

## Checks

- Direct candidate Vite build: exit 0; `result-czech-served-exports-build.log`. Existing large-chunk warning persists.
- Focused host tests: `result-czech-served-exports-tests.log`. All 22 units/chapter Markdown/index/full/llms; canonical URLs; complete script-free text; exact 308 tables / 9652 cells in source order including th/td, colspan/rowspan, scope and headers equality against shared renderer; all local static fragment destinations; actual agent HTML cross-chapter source fragment destinations; no local paths/private markers; noindex; all generated files identical in public and Vite dist; HTTP route reachability with no script execution. Nested source tables counted once per cell.
- `npm audit --omit=dev --json` in reader-core: exit 0, zero runtime vulnerabilities; `result-czech-served-exports-security.json`.
- Catalogue security harvest completed: one project scanned, no OSV errors; Dependabot disabled, not an authentication block. Zero critical/high; two medium build dependency findings in reader-demo postcss-selector-parser (6.0.10 and 6.1.4; fixed 6.1.5/7.1.6). Outside this host parcel's ownership; no dependency changes. Initial restricted-cache invocation failed; authorised rerun succeeded.
- Focused diff whitespace check: exit 0.

## Parent boundaries

Final generated book includes compatibility map and all 22 units; an intermediate concurrent snapshot lacked the map, but final export ran after it returned. Parent should retain semantic generator → export → Vite ordering when rebuilding. The full package build was not rerun here because its Python step belongs to the concurrent generator worker and regenerates EPUB. Direct Vite plus export adapter validated locally against current generated book; existing validated EPUB not rebuilt by this parcel. Existing shared exporter 26-test acceptance inherited from compatibility parcel, not claimed as rerun. Parent integration review follows all parcels; no DTC request, UI acceptance or live hosting claim.
