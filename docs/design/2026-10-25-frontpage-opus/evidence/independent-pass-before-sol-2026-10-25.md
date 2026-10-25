---
title: Front page for the shared book reader, three Opus directions
register: FOR DOMINIK
date: 2026-10-25
status: design-suggestion
reviewed_code: 6ce09ff plus the uncommitted toolbar work in progress (read only)
author: Claude Opus 5.5 design consultation
sketch: frontpage-designs-opus-2026-10-25.html (rendered from copy-frontpage-opus-2026-10-25.md by render-frontpage-opus.mjs)
evidence: evidence/
---

**No action needed. FOR DOMINIK.** This is a design consultation on the front page of the shared book reader (Linguistics, Deliberate Practice, Language Muscle). It changes no production code. The sketch has three layouts you can switch between, for each of the three books, on a laptop or a phone, for a first visit or a returning reader.

## What the front page has to do

1. **Get a first-time reader started.** One clear button that names the first chapter and its length.
2. **Let a returning reader carry on.** The same button becomes Continue reading with the chapter's name, plus a read count.
3. **Let anyone browse or search the real contents**, at a depth that suits the book: 253 answers need topics first; 21 or 9 chapters can all be shown.
4. **Offer the eBook.**

It is not a marketing page. It promises nothing the books do not contain, and it shows no future Medium or Metaphor Hacker material.

**The real contents, as counted from the reader's data** (`apps/reader-demo/src/books/original-publications.json`):
- Linguistics: 9 topics holding 253 answers, about 78,700 words. Topics are groups with no text of their own. There is no introduction, so Start reading opens the first answer.
- Deliberate Practice: 21 chapters in one flat list, each labelled with one of 8 headings (Introduction, Principles & Theory, and so on), about 37,300 words.
- Language Muscle: 12 entries. Three are group headings with almost no text (Introduction, Building Your Muscle, Appendices); nine are chapters, one of which (Fine-tuning your aims) stands on its own. About 13,100 words.

## Recommendation: A, the title page beside the contents

On a laptop the page is laid out like an open book. The left side is a title page: cover, title in the book's own style, author, description, the Start or Continue button, Search and Download eBook, then a short list of facts (size, reading time, licence). It stays in place while you scroll. The right side holds the contents, with a **Show** switch for the depth.

- **Linguistics** opens on its 9 topics with a count each ("32 answers"). Opening a topic lists its answers with their year. "Topics and answers" shows all 253.
- **Deliberate Practice** opens with all 21 chapters under their 8 headings, each with its reading time. In the laptop sketch all 21 fit on one screen.
- **Language Muscle** opens with its three groups and their chapters, and Fine-tuning your aims as a chapter on its own.
- **Returning:** Continue reading names the chapter, a bar shows "6 of 21 read", read chapters carry a tick and the last one is marked Last read.
- **Phone:** the cover sits beside the title, the buttons run the full width, and the contents follow with the same Show switch.

**Why A.**
- It does all four jobs on the first laptop screen without scrolling: start or continue, search, eBook and the contents.
- It is the smallest change from today's front page: the same parts (`Home.tsx:26-63`), rearranged into two columns, with the button styling made sleeker.
- Each book keeps its own character through its paper, accent, cover and title style, which already exist in `App.tsx:7-9` and `reader-original.css:135-147`: Linguistics in a red serif with a red-and-blue rule taken from its cover; Deliberate Practice in a heavy sans under a red bar; Language Muscle in a green italic serif, with the second half of its title in green as the original guide had it.
- The look borrows from the originals: rounded buttons, one strong primary button with a soft shadow, lucide icons beside every label. It does not take their gradients or feature cards.

## The other two directions

- **B, Search and topic map.** A short masthead, a large search field, then each topic or heading as a tile with its count and first three titles. It suits a 253-answer reference book best, and it is the most different from a book. For Language Muscle's nine chapters the search field is more than the book needs.
- **C, Colour band and numbered parts.** A band in the book's colour carries the title, with the cover overlapping its lower edge; below it a start strip and the parts as large numbered rows (01–09) with chapters in columns. It gives the strongest per-book identity and is the nearest to the originals' coloured hero. The cost: on a laptop the contents start below the band, so the first screen shows less of the book. Numbers go on parts and topics only, because Language Muscle's chapter titles already carry their own ("1. About this guide", "Step 1: …").

What I would take from B and C into A: the year beside each Linguistics answer and the per-topic read count (B), and the Language Muscle accent on the second half of its title (shared by all three).

## Things the sketch turned up

- **Language Muscle's title is stored in two halves:** title "Building Your", subtitle "Language Muscle". Shown as title and subtitle it reads badly. The sketch shows it as one title, with the second half in green, through a per-book setting. A builder should add that setting rather than guess from the words.
- **Linguistics' description is the same sentence as its subtitle.** The sketch shows it once.
- **The Deliberate Practice cover says "Guide to Deliberate Practice"**, while the book is titled "Deliberate Practice: A Universal Learning Method". The covers are provisional; this one disagrees with the title.
- **The proposed Linguistics title** ("Language Beyond Grammar — Essays and Answers About How Language Works") is behind a switch marked as not approved. Its subtitle promises essays, and the book has none yet.
- **The original Language Muscle front page advertised an AI Coach, a Resource Audit, a Goal Tuner and a Sprint Builder** (`building-your-language-muscle/App.tsx:653-678`). None of them is in the current book, so none appears.
- **Deliberate Practice's three feature cards** (Working Memory, Mental Schemas, Targeted Practice, `book.home.features`) are not in my layouts. They summarise chapters that the contents already list, and they push the contents down. Say if you want them kept.
- **On the front page the sidebar repeats the contents.** The reader renders the front page inside the normal layout, sidebar included (`ReaderLayout.tsx:54-58`, `:127`). The sketch assumes the sidebar starts closed on the front page and opens from Table of contents.

## What a later build would need

This is for after the toolbar work now in progress lands; none of it should start while that work owns `ReaderLayout.tsx`, `use-publication-reader.ts`, `reader-original.css` and the `toolbar/` folder.

- **Change:** `Home.tsx` (layout, Start/Continue, Show switch, read ticks); the front-page rules in `reader-original.css:134-188`; a small helper that groups Deliberate Practice's flat chapters under their headings for display only. `publication-navigation.ts:17` says categories must not become tree levels, and they would not: headings are labels, not sections, and they cannot be opened as pages.
- **Saved state:** Continue reading needs the last opened chapter per book. The reader already saves read and bookmarked chapters per book (`use-publication-reader.ts:32-33`); this would be one more value of the same kind. It is not a change to the book format.
- **Book settings:** the default depth exists (`navigation.homeDepth`, `App.tsx:14`) and would become the Show switch's starting value (Linguistics 1, the others 2). The joined Language Muscle title needs one new setting.
- **Reading times** come from word counts at 230 words a minute.
- **Do not change** the toolbar, the sidebar's behaviour, chapter pages, notes, listening, book identities or covers.
- **Checks for that build:** Start opens the first chapter; Continue opens the saved chapter; Show switches depth and the count of listed entries matches the book (253, 21, 9); no sideways scroll at 360 and 728; Escape closes search and returns focus; no recorded-audio offer anywhere.

## Original sources reused

- **Deliberate Practice front page:** `/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/components/Home.tsx:30-81` (hero, rounded buttons with icons, eBook button with a busy state) and `:117-149` (contents grouped by heading in cards). A uses the grouping without the cards; C's band is a calmer version of the hero.
- **Language Muscle front page:** `/Users/dominiklukes/worktrees/guides/building-your-language-muscle/App.tsx:634-680` (centred serif title with the second half in the accent, pill Start Reading button with an arrow) and `:69-95` plus `:815-825` (read sections saved per book, progress percentage and bar). The progress bar and Continue follow these.
- **Icons:** copied as SVG from lucide-react 0.554.0 in the Language Muscle guide's own install (`icons-frontpage-opus.svg` names each source file). The production toolbar uses Material Symbols names for the same ideas (headphones, text_fields, eyeglasses, ink_highlighter); a build should use whichever set the toolbar ends up with.
- **Current reader:** `Home.tsx`, `App.tsx:6-14`, `reader-original.css:134-188`, `publication-navigation.ts:17-21`, `publication-model.ts:4` (how the title and subtitle are joined).

## Verification and limits

- The sketch is one self-contained HTML file (about 380 KB, the three covers embedded as small copies). Copy, data, styles, behaviour and icons are separate files; `render-frontpage-opus.mjs` puts them together and `extract-books-frontpage.mjs` rebuilds the data from the reader's book file.
- **Mock checks only, not acceptance of any build:** a probe run in Playwright's bundled headless Chromium (`evidence/probe-frontpage-selftest.js`) passed 168 of 168 checks at 360, 728 and 1440 px windows. It covers all three layouts, books and screens: no sideways scroll inside the mock, the four toolbar controls in the approved order, Listen saying there is no recording, Escape closing a menu and returning focus, title search, the eBook notice, the returning state, the entry counts (253, 21, 9) and group counts (9, 8, 4), the not-approved title marking, and the sketch page staying under 2,000 px tall at 360 (1,805) and 728 (1,572).
- The sketch's search looks at titles only; the reader's search also looks inside the text. Progress for a returning reader is invented and labelled as an example.
- Fonts: the sketch asks for Merriweather and Inter and falls back to Georgia and the system sans when they are not installed, so the type is close to the reader's but not identical.
- The T3 preview tools take a page as inline text, and this page is too large to pass that way, so screenshots come from the bundled headless Chromium only.
