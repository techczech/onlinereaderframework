---
title: Academic Productivity and Developing Competence demo conversion receipt
date: 2026-10-29
status: local-review-build
---

Academic Productivity is a short practical guide in seven sections: the single principle, Listen, Enlarge, Outline and Navigate, Dictate, How It Works, and Blockers to Productivity. Developing Competence contains the original seven theory sections, in source order, with both tables and all examples. These are runnable local demos; independent runtime review and edition acceptance remain with the parent.

The original authored wording is retained. The conversion changes presentation into Markdown: headings, lists, callouts and tables. It adds two descriptive external-tool links. Academic Productivity directory entries, prices, hardware guidance, AI search controls, wider Assistive Technology material and repeated home summaries are not reading chapters. Their exact source text is preserved in source-accounting.json with hashes, source-line text units, matching chapter destinations and reasons for exclusion. Developing Competence's assessment, framework builder, dashboard and AI planning remain on its original application. Links target that application's root because its state-based views have no established URL routing contract.

## Reproduction and ownership

Run from apps/reader-demo:

- `npx tsx src/books/next-books/build-practical-guides.ts` regenerates only these two book JSON files and source accounting.
- `npm run build` typechecks, builds the demo and generates the current agent routes.
- `npx tsx --test src/books/next-books/test-practical-guides.ts` checks source inclusion, strategy ordering, table/example retention and agent destinations.
- `npx tsx --test --test-name-pattern='release isolation|agent files' scripts/test-demo-books.ts` checks all five existing releases with the current registry as foreign-book inputs.

Run the saved browser probe from the repository root using the existing sibling book-engine Python environment. It uses only bundled chrome-headless-shell, stops its temporary HTTP server and deletes EPUB downloads. It visits both title pages and every chapter, checks external tool targets, downloads EPUBs through the existing UI and parses their XML. See check-browser-epub.json for actual outcomes. Screenshots are evidence, not visual acceptance.

Only new conversion files under next-books, this evidence folder and demo-books.ts are owned. The original publications, previous book JSON files, original-publications.json, canonical-sites, reader core, export implementation and Course Design folder are untouched. No dependencies were added. No deploy, push, tag or production release was performed.

## Canonical text and edition decisions

Existing canonical originals were inspected at books/web-published/academic-productivity and books/web-published/developing-competence in the writing repository. They remain untouched. Academic Productivity's canonical strategies were inspected alongside current source; Developing Competence's canonical overview was inspected alongside the seven-section source. No claim of a complete Folio freshness reconciliation is made. Its canonical Folio also has Engagement Types and Accessibility files outside this authorised seven-section source conversion.

Academic Productivity explicitly states Creative Commons Attribution 4.0 International License in components/Layout.tsx, alongside an all-rights-reserved footer. The explicit grant is retained; the conflicting footer is preserved in accounting. Developing Competence supplies no licence grant in inspected source; none is invented. The source README files supply the existing edutools.fyi source addresses; no new canonical book URL is assigned. Dominik Lukeš is the author identified by this commission and canonical author collection; Developing Competence's app itself lacks an author credit.

The source titles are retained without invented subtitles. Proposed style: practical reader masthead, source blue/indigo accents, existing framework typography (the original apps use Inter). No new typography asset or cover is introduced. Covers are pending. The concise guide selection and final edition identity need author acceptance; the parent handles covers, independent review and release packaging.

## Verification limits

The build/typecheck and four focused content tests passed. The current publication-content and agent-export core suites passed. Browser evidence confirms separate per-book last-section, read-section, highlights and preference storage keys. Six existing agent/release isolation tests passed, including all five earlier books. The earlier full demo test suite contains a fixed five-book registry assertion; it was not rewritten outside ownership, and will need its expected count updated by the integration owner. New books are intentionally added directly to demoBooks while nextBooks retains the previous pair's embed-specific contract. This avoids changing previous cover and embed assumptions.

The first EPUB browser probe used a text-content button name instead of its accessible name and timed out. The corrected probe uses the accessible name Download eBook. The corrected rerun passed; its outcomes are recorded in check-browser-epub.json. EPUB XML/table checks do not constitute epubcheck certification. No large visual matrix, store package or public deployment was run.
