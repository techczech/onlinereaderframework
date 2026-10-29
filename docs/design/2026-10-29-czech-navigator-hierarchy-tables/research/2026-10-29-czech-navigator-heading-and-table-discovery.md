---
register: "FOR DOMINIK"
date: "2026-10-29"
status: "proposed-awaiting-design-verdict"
title: "Czech Navigator heading and table discovery"
kind: "evidence"
created: "2026-10-29T21:40:13Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/docs/design/2026-10-29-czech-navigator-hierarchy-tables"
sources:
  - file: /Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/czech-navigator-candidate/source/edition-czech-navigator.html
---

# Czech Navigator chapters, headings and tables

Czech Navigator needs chapter-sized reading screens, a meaningful local outline and tables that remain understandable on a phone. Apply the design to this book first, then extract the reviewed contracts into the Online Reader Framework. This proposal does not authorise a production build or deployment.

## Requirements and evidence

The current builder splits generated HTML at every `h2` and exports EPUB with `--split-level=2`. It creates 12 flat screens. The Parts of speech screen contains 167 of the book's 308 tables. The generated HTML contains 85 tables with merged cells and 272 without `th` cells; these categories overlap. Structural counts identify review targets, not semantic eligibility for transforms.

The supplied screenshot shows Function at nearly body-text emphasis and sentence-like entries in the right outline. Source lines 238 and 255 are sixth-level lead-ins to examples, not useful destinations in a chapter outline. Source line 495, Function, is a genuine recurring local heading under a case. Preserve the wording of all three while distinguishing their roles.

Evidence: `inventory-czech-navigator-tables-headings.json` contains every generated heading, table ordinal, HTML line, ancestor context, exact table HTML and source hashes. Source manuscript remains read-only. The generated edition is evidence of the conversion, not proof of Word fidelity.

## Recommended book structure

![Recommended contents tree](visual-czech-navigator-tree.svg)

Keep Title and contents as front matter. Introduction is a chapter. Parts of speech is a section with an overview screen containing its existing introductory prose; its left-hand children are Nouns, Adjectives, Pronouns, Numerals, Verbs, Adverbs, Prepositions, Conjunctions, How and when Czech words change their forms, and How parts of speech interact when combined in a sentence. The final two are synthesis chapters rather than invented additional word classes. Do not lose them when splitting.

Word Order, Pronunciation, Spelling, Idioms, Phraseology and Vocabulary, Differences between standard and non-standard Czech, Czech Trivia, and Czech Grammar as Czechs Learn It remain direct chapters in this first mapping. Acknowledgements and licensing details and Complete Table of Contents remain back matter screens. This mixed tree follows the supplied direction; it does not assert that all remaining chapters have equal length or should never be split. Review exceptions from actual content during import.

Every section overview and chapter starts at its title when selected explicitly. A separate Resume action restores a saved location; browser Back restores the previous position. Section title links open the overview; a separate labelled disclosure control expands its children. Chapter title links navigate. The active chapter is exposed in the left tree. The right outline contains only headings belonging to that chapter, normally its first two local levels, with deeper levels available by disclosure. It never repeats the chapter title or prose lead-ins. On a phone, Contents and In this chapter are separate labelled disclosures above the article, with focus returned to their trigger on closing.

## Heading mapping for review

| Source example | Proposed reading role | Outline treatment |
|---|---|---|
| Parts of speech, manuscript 121, h2 | Section overview title | Left group with linked overview |
| Nouns, 147, h3 | Chapter title | Left child; article h1 |
| Gender, 149, h4 | First local heading | Right primary entry; article h2 |
| What is gender?, 151, h5 | Second local heading | Right nested entry; article h3 |
| There are some which are almost exception proof:, 238, h6 | Example lead-in | Keep exact text as bold lead-in; omit from outline |
| The rest are shared by two genders about 50/50:, 255, h6 | Example lead-in | Same treatment |
| Kdo? Co? - Nominative…, 493, h4 | First local heading | Right primary entry |
| Function / Form, 495 / 506, h6 | Second local heading within this case | Render as h3 despite skipped source level |
| Typical Word Order of a Czech Sentence, 8579, h3 | First local heading within Word Order | Article h2, not another chapter by default |

These are reviewed examples, not a blanket heading-number conversion. A complete import review must resolve the remaining heading roles. Use semantic heading elements with a visible scale: chapter 2rem bold; first local 1.5rem bold with 2rem space above; second local 1.2rem bold with 1.5rem above; deeper 1.05rem bold with 1rem above; body follows the reader's text-size preference. Never use colour alone to distinguish levels. The article outline has no skipped semantic levels after role mapping.

## Journeys to approve

![Journey states](visual-czech-navigator-journeys.svg)

**Find a case explanation.** A learner enters Parts of speech, expands it and selects Nouns. Nouns opens at the top. They choose the nominative case in In this chapter, then read its visibly subordinate Function heading. It is right when the left side still shows Nouns under Parts of speech and the right side contains no Verbs headings or sentence lead-ins.

**Read a wide table on a phone.** The learner reaches the noun model table, keeps its source order and scrolls horizontally inside a labelled table region. They can expand it into a full-width reading view or collapse it intentionally to a summary containing its identity and Show table. It is right when every source cell remains reachable and the page itself does not overflow. Tables begin expanded; screen size alone never hides their data.

**Compare forms safely.** The learner chooses Browse on an annotated regular table, filters, hides a non-key column, sorts an eligible column or swaps axes. A visible status states the active changes. No matches shows zero results with Clear search and Reset table. Return to source restores the complete faithful table. It is right when every displayed value maps to its source cell and resetting restores source order, columns and orientation.

**Adopt another book.** The builder presents the actual outline, several heading samples and representative table structures. The author confirms section, chapter and local roles and exceptions before conversion. It is right when home contents, left navigation, right outline, reading screens and EPUB navigation derive from the same reviewed mapping.

## Tables: faithful reading first

![Actual table states](visual-czech-navigator-tables.svg)

Use restrained borders, generous cell padding, clear group-header bands, preserved inline emphasis and a horizontally scrollable region. Preserve spans, blank cells, punctuation, order and text exactly. Header cells and associations require content review: absence of `th` does not mean the first row is a header. A sticky row or column may be enabled only where its role is established. The ordinary view always retains the entire table, including explanatory prose and footnotes.

Table 10, generated HTML line 451, is a regular three-column singular noun paradigm with explicit Singular / kamarád / muž headers. It is a candidate for per-table text search, independent case-row sorting, hiding either model column and transposition, after review confirms row independence and retention of the case labels. Default order remains the manuscript's grammatical sequence, not alphabetical order. Keep the first column as an identity column. Do not interpret Ø or ^ as missing values.

Table 2, line 107, is the agreement summary. Singular and Plural span three columns each. The TY and dobré cells span four rows across masculine and feminine examples. Sorting single rows or filtering away their shared context changes meaning. Default capabilities: faithful display, collapse, full-width and in-place text highlighting only. A future group browser must operate on explicitly reviewed groups that include all intersecting spans; if this joins the whole table into one group, row filtering offers no useful capability and remains unavailable.

Table 1, line 43, is a headerless symbol legend: C / consonant / > / changes into. Do not label its first row as headers or infer a dataset. Table 3, line 185, is a warning laid out as a two-cell table containing ! and an explanatory paragraph. Table 48, line 2811, combines comparative forms with merged explanatory example rows. These remain faithful reading tables; search highlights text without removing rows, and no data transforms are offered until a separately reviewed annotation establishes safe units.

## Conservative capability contract

Each table annotation records source hash and locator, stable table identity, reviewed header and row-header cell IDs, explicit `headers` associations, grouping membership, and capabilities separately: find/highlight, row-or-group filter, sort by named column and comparator, selectable columns, transpose. All transforming capabilities default to false. Each enabled capability records a reason and reviewer; an annotation becomes stale after source structure changes. Structural validation checks span coverage and valid references; semantic judgement determines whether a grouping means what it claims.

Filtering keeps complete approved groups with required headers and contextual notes. Sorting moves whole approved groups stably; it never sorts characters within a cell. Column hiding keeps identity and context columns and cannot slice a span; dependent columns hide together or that operation is unavailable. Transposition is limited to reviewed rectangular matrices with explicit axes; transpose header associations along with the cells. Never unmerge cells, fill blanks, copy shared values into new records, guess labels or silently flatten prose to make an operation available. Disabled transforms are omitted; the adjacent Browse availability explanation states why when needed.

Source view is always one action away. Browse is a projection over the canonical table, not a replacement or an editable second dataset. Local table search is literal text search, labelled separately from book search; preserve Czech text and state whether matching ignores case or diacritics. Filters match the displayed text, including symbols. No matches has Clear search and Reset table; a stale annotation falls back to source with a short explanation. Reset restores the entire source table. Table search, sort, columns and orientation last only for the current table visit by default; collapse state can last for this book session. Global reading preferences retain their existing scope. No settings leak between books.

## Accessibility, exports and continuity

Use native table markup with caption or a reviewed adjacent heading association, and `scope` for simple headers or explicit cell IDs and `headers` for complex associations. A blank corner cell remains blank. Native buttons, inputs and checkboxes work by keyboard; sort buttons expose aria-sort on their column headers. Label scroll regions and ensure keyboard horizontal scrolling. Announce filter counts politely. Expanding, collapsing, resetting or changing orientation preserves meaningful focus; a hidden focused control returns focus to its trigger. Sticky headers must not cover focussed cells or zoomed text. Validate small screens, 200% text and screen-reader reading order during implementation.

No-JavaScript pages and EPUB contain every cell and every heading in source order, expanded and unfiltered, with no dependency on browser settings. Start each section overview and chapter on a fresh EPUB reading unit with break-before; keep internal headings in flow with their hierarchy styles. Exports never use the filtered DOM as their content source.

Keep the book identity stable. Preserve existing heading IDs and build an explicit old-screen-plus-anchor to new-chapter-plus-anchor mapping. Existing section-only links open their section overview; existing anchors route to the owning new chapter. Search results use that same map. Do not invalidate highlights or bookmarks by copying content into a new identity. Migrate saved positions by exact anchors or text-model identity where available; unresolved positions remain recoverable legacy bookmarks with a clear message, never guessed offsets. A legacy read tick on Parts of speech must not mark all child chapters as read. Count chapter completion separately from overview visits and retain the prior record for migration. Compatibility verification must cover direct URLs, back/forward, search, bookmarks, highlights and agent exports before release.

## Builder conversation and framework adoption

Suggested builder wording: “Which headings name grouping sections, which begin their own reading chapters, and which organise the text inside a chapter? Here is the outline I found, with examples from the manuscript. I propose Parts of speech as a section, Nouns and Verbs as chapters within it, and Gender and Case as local headings within Nouns. Shorter top-level items such as Word Order can be chapters directly. Please correct the roles and any exceptions; heading numbers and length alone do not decide them.”

Then show the resulting left tree, one chapter's right outline, paragraph lead-ins and EPUB breaks. Ask about deeper outlines only for chapters that need them. Review table examples separately: “Which cells are shared labels or explanations? Which complete groups can move or disappear without changing meaning?” Save the book-specific decisions with source locators and hashes. Builder guidance and skill updates are a later adoption deliverable; no skill file is changed here.

Proposed content verbs are read-only projections: resolveLocation(bookId, legacyLocation), getOutline(bookId, chapterId, depth), getTableSource(bookId, tableId), and previewTableView(bookId, tableId, approvedOperations). Each takes stable source identity and returns provenance with content. Annotation proposals require author approval before becoming the book mapping. Collapse and sidebar toggles are view configuration rather than content operations. These are contract sketches, not a newly implemented API.

## Staged order and acceptance

1. **Hierarchy and headings in Czech Navigator.** Confirm the mapping, split reading units, implement the two outlines and semantic type scale, preserve links and reading state, and export section/chapter breaks. Accept when Nouns opens at its title, its local outline is bounded and existing anchored links and saved content remain recoverable.
2. **Faithful table display in Czech Navigator.** Review table roles and header associations, improve spacing and mobile scrolling, add intentional collapse/full-width and complete static/EPUB fallback. Accept against the regular, merged, headerless and prose examples above with exact cell text and span preservation.
3. **Safe optional table browsing, then framework adoption.** Deliver per-table search/filter, column visibility, sorting and axis transposition wherever explicitly reviewed as valid, with reset and source recovery; retain faithful-only behaviour elsewhere. Extract the hierarchy contract, table capability annotations, migration rules, examples and builder conversation into the reusable framework after Czech Navigator validation. These requested features remain planned scope; sequencing is not cancellation or permission to enable unsafe global transforms.

Journeys and visual states remain proposals until Dominik's design verdict. This folder deliberately does not create missing global CONTEXT or ADR scaffolding outside its ownership. No root AGENTS.md, CONTEXT.md or docs/adr directory was present during inspection. The existing PRD, reuse/publication documentation, October sidebar design and DTC roadmap informed this proposal. The parent session must inspect the proposal before presenting the decision review.
