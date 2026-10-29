---
status: implementing
register: for-agents
---
# Czech Navigator implementation plan

Authority: collected visual-direction receipt, 2026-10-29 22:05 UTC. Editorial atlas reading composition with Reference desk focus controls. No new design approval. Execute inline, Sol only. Parent owns independent review and publication.

- [ ] Preserve source SHA and all 308 tables / 9652 cells. Add explicit chapter IDs and heading-role ledger under candidate source; split Parts of speech into overview and eleven children in the existing build script. Rebase local headings without changing anchors or wording. Build EPUB from the same mapped HTML.
- [ ] Extend existing section URL resolution to locate preserved fragments in their new owner. Keep stable book ID, old overview read ticks and legacy saved records. Test unknown anchors, foreign book IDs and child ownership before implementation.
- [ ] Add optional shared table capability contract and source-preserving table surface; annotations carry source identities. All tables get find, collapse, focus and source reset. Reviewed rectangular paradigms alone get filter, sort, columns and transpose. Validate merged-cell negative cases.
- [ ] Adapt established PublicationReader layout through optional appearance config and scoped atlas styling; preserve existing toolbar, notes, search and reading preferences. Match editorial screenshot and reference focus panel; save combined design state.
- [ ] Run framework and candidate build, source/table coverage, EPUBCheck, desktop/390px/200% and keyboard checks with bundled headless Chromium. Record precise enabled-table coverage and unresolved migration limits. No deployment.

Files: candidate scripts/build-czech-navigator.py, source/heading-roles-czech-navigator.json, book JSON and generated editions; reader original types.ts, publication-model.ts, MarkdownRenderer.tsx and focused table module/styles; candidate tables CSS; existing coverage and new focused tests. Other apps remain untouched.

Checks: node test navigation and table contracts; npm test; candidate build; coverage Python; EPUBCheck; existing candidate browser checker. Source text and spans remain canonical. Exports use source, never filtered DOM.
