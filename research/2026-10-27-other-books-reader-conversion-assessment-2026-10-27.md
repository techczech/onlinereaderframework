---
title: "Other books and guides suitable for reader conversion"
kind: "evidence"
created: "2026-10-27T23:27:34Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework"
sources:
  - file: /Users/dominiklukes/gitrepos/02_writing-creation/writing/books
  - file: /Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet/src/content/guides.json
  - file: /Users/dominiklukes/gitrepos/_COORDINATION/webapps-websites/_TASK-LOG/2026-10-22-guides-under-one-address.md
---
# Other books and guides: conversion assessment

Assessed 27 October 2026. Purpose: recommend which existing works suit the released reader. Reader: Dominik, choosing the next conversion. Scope: source inventory and judgement, not full editorial review, implementation or publication permission.

## Recommendation

Convert Academic Reading first, then Foundations of Readability. Dyslexia is a short, relatively direct additional candidate. Instructional Videos is a strong longer candidate after preserving its demonstrations and cross-references. Do not flatten interactive applications into chapters merely because they are listed as guides.

## Strong candidates

**Academic Reading Framework / Increasing Reading Productivity.** An ordered Folio already exists with ten listed sections. The draft metadata records 4,728 words; a fresh whitespace count after removing frontmatter gives 4,799, so use approximately 4,800 rather than treating the metadata as exact. Six reading characteristics and the cognition material give it a coherent book structure. The Cognition Explorer Markdown describes clicking nodes but does not contain the functioning diagram. Preserve the actual CognitionExplorer component or provide an accessible static diagram plus equivalent explanation. An existing 24 October programme decision already places this work in the main website's book system. Check the current main-site book work before creating another edition or destination.

**Foundations of Readability.** Fourteen Folio sections; approximately 5,600 body whitespace words (metadata says 5,262). Clear principles, reading approaches, documents, slides, language, accessibility and evidence. It directly explains the reader's design. The existing imported Markdown contains controls and sample-state text such as Click to reveal and Total Sentences rather than equivalent teaching interactions. Preserve the actual visual comparisons, font/spacing demonstration and readability checker. A text-only import would lose substantive instruction. The site catalogue describes CC BY, whereas draft book metadata says CC BY-SA 4.0; inspect the original notices and author authority before choosing edition notices.

**Dyslexia Guide.** Source content.json has an introduction and five lessons, with explicit What to know / What to read / What to do sections. Good short-book structure and particularly relevant to the reading supports. No existing canonical book Folio was found among the six web-published Folios inspected. Extract from the source block model and preserve examples, lists and links. A short guide, not a large manuscript. No medical claim review undertaken.

**Instructional Videos Framework.** Twelve top-level Folio sections; approximately 8,900 body whitespace words (metadata says 8,388). Contains tasks, questions, multimedia principles, slides, learning tips and resources. Good handbook structure with rich internal navigation. Preserve task/question/principle relationships, SlideSimulation and video examples. Keep videos usable as linked or supported embedded resources with readable alternatives; do not flatten a simulation into its UI labels.

## Better as hybrid resources

**Course Design Frameworks.** Source data has checklists, matrices and editable planners, plus explanatory appendices. A handbook/workbook edition is useful, but replacing editable planning activities with plain text would remove much of the resource's purpose. Retain the tools or make them explicit companions.

**Developing Competence.** A coherent theory component is available in content/theory.ts. The larger application also builds frameworks, performs self-assessment, shows progress charts and generates development plans. Extracting a theory handbook is plausible; replacing the application requires a separate product decision.

**Academic Productivity.** Strategies are useful chapter material, but a substantial part is a changing tools/hardware database with AI information lookup. Prefer a stable strategy guide with a linked live tool directory, rather than freezing all product data into a book.

**Eras of AI History.** data.ts provides chronological eras, descriptions and event lists. It suits a short illustrated reference or timeline companion. The inspected source is largely an overview and chronology; do not present it as a developed narrative manuscript. Editorial fact-checking was not performed.

**LDD Navigator and Skills Learning Companion.** Existing catalogue describes navigation among behaviours, conditions and strategies for LDD, and an interactive companion for Skills. These are lower priorities for wholesale replacement. Their information relationships and activities need preservation. This judgement uses catalogue descriptions, not a detailed source review of those two applications.

## Unpublished manuscripts

Four existing draft folders broaden the candidate list beyond web guides. Counts below are rough whitespace counts of the combined Markdown, including frontmatter. They establish scale, not final manuscript length or readiness.

- Feminismus a láska: approximately 32,000 words. A split Folio has nineteen sections plus front matter, so technical conversion looks straightforward. Source status is rough-draft; author selection and editorial acceptance remain outstanding.
- Sebranka spisků 1998–2015: approximately 124,000 words. A split Folio has ninety-nine sections plus front matter. Strong fit for thematic groups, search and non-linear reading. Needs author curation of dated material, collection boundaries and overlap with the feminism collection.
- Strangers: A brief history of mutual obligation: approximately 21,000 words, seven level-two headings in the combined manuscript. A substantial draft, but rough-draft status prevents calling it publication-ready.
- The natural logistics of life / Does the internet matter: approximately 6,000 words. Imported from an old DOC as one long body with no Markdown headings. Needs structural recovery before reader conversion. The source includes a 2011 CC BY-NC notice, so do not apply the newer programme licence automatically.

## Evidence and limits

Sources inspected: current local guide catalogue; existing web guide repositories; canonical book.toml and _report-structure.json files; representative source content and interactive components; four combined draft manuscripts and two split Folio manifests. Existing source dates/import metadata do not prove freshness against every deployed site. Local frontmatter and control text explain differences from old word counts.

Public fetches were attempted for Academic Reading, Readability, Instructional Videos and Dyslexia. The web tool returned inaccessible for all four; this does not prove the sites are down. No live UI acceptance is claimed. No source text was edited, converted or published. No ranking constitutes authorisation to migrate domains. The existing Academic Reading destination decision must be reconciled before implementation.

Review: recommendations were checked against the inspected structures and the distinction between functioning interactions and imported UI text. Editorial quality, source freshness, rights and complete link coverage are not established by this assessment.
