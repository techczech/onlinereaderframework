---
title: Course Design conversion inventory and acceptance mapping
date: 2026-10-29
status: proposed
scope: documentation only
---

# Course Design conversion

Source: `/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/course-design-frameworks`. Read-only. Inspected `data.ts`, `types.ts`, `App.tsx`, and `components/SectionView.tsx`. No source edits. Reader root has no AGENTS.md at inspection. This record is an initial source inspection, not conversion or release acceptance.

## Source and provenance

`data.ts` declares title “Frameworks for thinking about online course development”, author Dominik Lukeš, website https://dominiklukes.net and lastUpdated “Nov 2025”. Retain that source date as metadata; do not silently replace it with conversion date. Preserve every string, including grammatical errors, exact list order, column order, blank cells and embedded newlines. No author-text revisions are authorised.

| Source section id | Kind | Required representation |
|---|---|---|
| about | text | Introductory paragraphs and licence notice |
| qa-checklist | checklist | Category headings and exact item ids/text; optional interactive checks |
| engagement-matrix | matrix | Five engagement rows across Zoom, Canvas, Other |
| icap-framework | matrix | Four modes in source order; activity/tool lists |
| activity-planner | planner | Ten numbered rows, four columns, empty planning cells |
| learning-matrix | matrix | Six learning types, offline and online lists |
| modular-planner | planner | Five rows; preserve introductory examples and newline boundaries |
| building-checklist | checklist | Readiness category and five items |
| appendices | text | Three appendices with original headings, paragraphs and lists |

Source types distinguish text blocks, checklist categories/items and matrices with ordered columns and keyed cells. Derive a per-value provenance map using section id plus property/index path, source file hash and conversion version. Keep source, derived content and rendering separate. Do not recast the material as a tree or graph. The source contains generated planner rows (`Array.from`); preserve their ten-row meaning while retaining the source expression in provenance.

The About image uses https://picsum.photos/800/200, alt “Creative Commons Licence”, and a separate URL https://creativecommons.org/licenses/by-sa/4.0/. The renderer ignores the image URL property. Treat the photo as a placeholder, not licence artwork. Proposed rendering: retain the recorded licence label as a link to the source CC notice; omit the random photo. This is a rendering correction requiring coordinator agreement, not evidence for unrelated asset rights.

## Observed interaction semantics

ChecklistRenderer keeps checked ids in component state, computes percentage, and offers Reset. MatrixRenderer renders matrices as tables and planner cells as contentEditable. No saved planner state is established by the inspected implementation. Do not promise persistence, download, synchronisation or cross-device recovery. App navigation selects sections in state. Checklist state lifecycle across navigation needs an explicit regression check rather than an inferred persistence contract.

## Minimal reusable proposal

The reader already provides `packages/reader-core/src/embed/embed-model.ts`, `embed-check.ts`, `PublicationEmbedFrame.tsx`, and `embed-child.ts`. Its descriptors anchor frames before written alternatives. Reuse these without changing sandbox permissions or message protocol. First derive semantic chapter content containing every checklist item, table header/cell, example and blank worksheet structure. This written content is the common basis for search, notes, assist, read-aloud, EPUB and agent text. Add optional host-registered interactions only after that content passes coverage checks.

No shared edit is yet authorised. Proposed first implementation is an example/book adapter and local interactive resources using existing descriptors; exact shared paths must be agreed by the parent. A new core schema, generic worksheet engine, persistence API or graph model has no demonstrated requirement yet. If the current sanitiser/exporter drops table structure or list cells, reproduce that failure and propose a narrow fix separately.

## Journeys and acceptance

| Reader aim | Acceptance evidence required |
|---|---|
| Read a framework in order or jump to a section | All nine source sections in exact order; stable section anchors; original reader navigation retained |
| Compare framework entries | Semantic headers and list cells remain associated; keyboard and narrow-screen access; no missing text |
| Evaluate a course | Exact checklist labels and ids; keyboard toggle and Reset; progress matches checked items; written checklist available without embed |
| Plan a course | Both worksheets preserve source rows, headers and examples; editable cells are labelled; state lifetime is stated accurately |
| Find and annotate a passage | Search reaches text in tables/checklists; notes anchors survive navigation; assist sees the same written text |
| Listen or export | Read-aloud, EPUB and agent full text include all authored strings in meaningful source order, without interactive control debris |
| Read without interaction | Written alternatives remain usable when frames fail or are refused; no source content exists only inside a frame |
| Keep existing books working | Existing reader/export suites and representative current-book checks remain green before integration |

Coverage gate: compare the ordered source string inventory against written reader content, EPUB and agent outputs; explicitly account for metadata, navigation descriptions and the omitted photo URL. Distinguish authored strings from UI labels and user entries. Never publish user worksheet entries in agent text or canonical exports by default.

## Dependencies and limits

Parent agreement is required before any shared core, demo or release edits. Parent owns edition identity, cover and publication. Five live books and reader v1.1 are user-supplied baselines, not independently verified here. No live checks, build, deployment, production code or Instructional Videos conversion occurred. Further work: inspect existing authorised design receipts and complete adapter-path agreement; then implement through the authorised implementer role and run meaningful coverage/export/interaction checks. Genuine new design choices go through DTC.
