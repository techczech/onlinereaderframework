---
title: Original reader framework upgrade
status: building
date: 2026-10-23
---

# Original reader framework upgrade

Dominik authorised updating this existing framework with the best of Deliberate Practice and Building Your Language Muscle, using their actual code, followed by a public-release plan. Sol High implements; Astra independently reviews. Credit checkpoint: 18:00 Europe/London on 23 October.

## Design authority

Reuse the original Deliberate Practice shell, home, reading controls, notes, reflections, sharing and typography. Reuse Language Muscle recursive navigation for hierarchical books. Preserve source markup and classes wherever practical; record necessary adaptations. The old generic framework interface and the rejected Python preview are not the visual baseline. Originals remain read-only.

Original installed sources: `/Users/dominiklukes/worktrees/guides/deliberate-practice-guide` and `/Users/dominiklukes/worktrees/guides/building-your-language-muscle`. Detailed evidence: sibling `book-engine/docs/audit-original-reader-reuse-2026-10-23.md` and its original-reader screenshots.

## Integration contract

New original-derived module: `packages/reader-core/src/original/`. Export `PublicationReader` receiving `{ book: PublicationBook }`. Book fields: `id`, `title`, `author`, optional `subtitle`, `description`, `sections`, optional `downloads` (array of `{label, href}`), optional `sourceUrl`. Section fields: `id`, `title`, `category` (string), `content` (string), optional `format` (`markdown` default or `html`), optional recursive `children`. UI worker owns types here. Stable book IDs namespace persistence. Optional richer home configuration may be added without changing this minimum contract. Preserve existing public core API.

Independent content module: `packages/reader-core/src/publication-content/`. Export `renderPublicationContent(content: string, format: 'markdown' | 'html' = 'markdown'): string` from its index. This returns sanitised rich HTML with footnotes, tables, images, code and links; original renderer retains its layout, speech, annotation and reflection controls around this seam. Expose a plain-text helper for full-content search if useful. Content worker owns this module plus package dependency changes. UI worker imports this function and does not reimplement Markdown parsing.

Parent owns demo integration, real-book adapters, root build/export integration and release documentation. Shared checkout: every worker preserves others’ edits. No worker commits shared work while others are active; parent checkpoints ownership-bounded changes.

## Required acceptance

Three real-book demos: Deliberate Practice, Language Muscle, and Linguistics (253 answers, nine themes). Desktop and mobile retain the designed reader; local storage remains isolated per book; search covers complete content; URLs restore sections; rich content remains intact and unsafe HTML cannot execute. Verify package build as well as source-linked demo. Independent Astra review resolves material findings before acceptance. Export pipeline remains available; do not claim UI approval from EPUB checks.

## Public-release boundary

Prepare package documentation, provenance, licensing inventory, reproducible build/test instructions and release steps. Do not publish packages, deploy sites, alter repository visibility or enable paid AI services during this task. Identify any concrete remaining release decisions in the release plan.

## Implementation checkpoints

The original reader and content extraction is committed as `cbcb1cb`; reusable EPUB export and clean package integration as `0832455`. Real home ebook buttons work for all three books. Public API `PublicationReaderProps.epub` accepts explicit image assets or `false`; no hidden resource fetching occurs. Source comparison now verifies 515 inputs and preserves original recursive expansion flags.

Astra's first implementation review found two concrete defects: Unicode case expansion shifts restored annotation offsets, and a split book title loses the identifying subtitle on quote cards. Sol High repairs are active; do not treat this plan or the initial passing tests as acceptance. The ebook/package review is independent and still active. Supplemental third-party notice evidence is being collected without inventing a software licence.
