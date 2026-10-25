---
title: Canonical copy for the Opus front-page sketch
register: FOR DOMINIK (viewer text) and interface copy (mock strings)
date: 2026-10-25
renders: frontpage-designs-opus-2026-10-25.html via render-frontpage-opus.mjs
---
<!-- Format: "## <block>" or "## option <id>" or "## book <id>" holds "key: value" lines; "### <name>" starts a "- item" list. {name} is filled in by the sketch. -->

# Book reader front page: three Opus directions

## page
intro: Three front-page layouts for the shared book reader, drawn with the real contents of Linguistics, Deliberate Practice and Language Muscle. The front page has four jobs: get a first-time reader started, let a returning reader carry on, let anyone browse or search the contents, and offer the eBook. Every button works, but it only shows what the reader would do.
recommendation: I recommend A, the title page beside the contents. On a laptop it shows the cover, the start or continue button, search, the eBook and the whole contents without scrolling, and it keeps the current books' paper, type and covers while borrowing the originals' rounded buttons and icons.
mock-banner: Design sketch. Nothing here is the production reader, and none of these checks is acceptance of a build.
default-option: a
direction-label: Layout
book-label: Book
view-label: Screen
view-desktop: Laptop
view-phone: Phone
visitor-label: Reader
visitor-first: First visit
visitor-returning: Returning
title-label: Linguistics title
title-current: Current title
title-provisional: Proposed title (not approved)
provisional-title: Language Beyond Grammar
provisional-subtitle: Essays and Answers About How Language Works
provisional-note: Proposed title, not approved. The book has no essays yet.
width-note: This window is {w} px wide, so the laptop view shows the layout the reader would use at that width.
report-heading: Recommendation, sources and limits
report-note: The full report is report-frontpage-opus-2026-10-25.md beside this file.

## ui
toolbar-label: Reader controls
toc: Table of contents
listen: Listen
formatting: Formatting
assist: Assist
notes: Notes
close: Close
mock-tag: Mock menu. In the reader this button opens the approved toolbar menu of the same name.
start: Start reading
start-where: {title} · {min} min
continue: Continue reading
search: Search
b-search-label: Search titles in this book
ebook: Download eBook
contents: Contents
level-label: Show
group-count: {n} {unit}
group-read: {n} read
chapter: Chapter
minutes: {n} min
read-count: {read} of {total} read
example-progress: (example progress)
you-are-here: Last read
reading-time: {words} words, about {hours} of reading
hours: {n} hours
an-hour: an hour
provisional-cover: Provisional cover
results-count: {n} matching titles.
no-results: No title contains “{q}”.
more-results: {n} more in the reader's full results.
show-all: All {n} {unit}
show-fewer: Show fewer
source: Original website

## notices
sidebar: Mock action. This opens the contents sidebar. On the front page it starts closed, because the page itself shows the contents.
open: Mock action. The reader would open “{title}”.
ebook: Mock action. The reader would build this book's EPUB file here and download it.
source: Mock action. This would open {url}.
search-scope: The sketch searches titles only; the reader's search also looks inside the text.
listen: Read aloud starts once a chapter is open, with the browser voice. This book has no recorded audiobook, so none is offered.
formatting: Text size, typeface, spacing, width and theme for this book, saved on this device.
assist: Paragraph focus, the reading overlay and hiding navigation.
notes-first: No highlights or saved chapters in this book yet.
notes-returning: Example: your highlights and saved chapters would be listed here. The sketch has none.

## option a
badge: A
name: Title page beside the contents
summary: An open book: the title page on the left, the contents on the right. The left side stays in place while the contents scroll. On a phone the cover sits beside the title, the buttons follow, then the contents.
### facts
- Everything a visitor needs is visible on a laptop without scrolling: cover, title, Start or Continue, Search, eBook and the contents.
- The contents have a Show switch. Linguistics opens on its 9 topics, each with a count; opening a topic lists its answers. Deliberate Practice and Language Muscle open with every chapter showing.
- A returning reader gets Continue reading with the chapter's name, a read count, ticks on read chapters and a Last read marker.
- Book character comes from each book's paper, accent, cover and title style: Linguistics serif in red, Deliberate Practice heavy sans under a red bar, Language Muscle italic serif in green.
- Closest to the current reader: the same parts, reordered into two columns.

## option b
badge: B
name: Search and topic map
summary: A reference shelf. A short masthead, then a large search field, then the topics as tiles with counts and their first three titles. Built for the 253-answer Linguistics book and still usable for the two short guides.
### facts
- Search is the page's main control and filters titles as you type; the results say which topic each answer belongs to.
- Tiles show three titles and an All button. The Show switch opens every tile at once.
- A returning reader gets a progress bar on each tile and a Continue button in the masthead.
- For Language Muscle, with only 9 chapters, the search field is more than the book needs.
- The most different from the current front page and the furthest from a book's title page.

## option c
badge: C
name: Colour band and numbered parts
summary: A course programme. A band in the book's colour carries the title, with the cover overlapping its lower edge. Under it a start strip, then the parts as large numbered rows with their chapters in columns.
### facts
- The band gives each book the strongest identity of the three layouts and is the nearest to the originals' coloured hero.
- First visit: the start strip names the first chapter and its length. Returning: it shows Continue, the chapter and the read count.
- Numbers belong to parts or topics only (01–09), never to chapters, because Language Muscle's titles already carry their own numbers.
- On a laptop the contents start below the band, so the first screen shows less of the book than A.
- The band is a new masthead style; the three current masthead styles would become colour variants of it.

## book linguistics
short: Linguistics
kind: 253 answers in 9 topics
unit: answers
unit-one: answer
level1: Topics
level2: Topics and answers
default-level: 1
map-heading: Topics
search-placeholder: Search 253 answers
written: Answers written 2013–2016 on Linguistics Stack Exchange
licence: CC BY-SA 4.0, as on Stack Exchange
returning-read: 14
cover-alt: Linguistics cover with overlapping red and blue voices

## book deliberate-practice
short: Deliberate Practice
kind: 21 chapters under 8 headings
unit: chapters
unit-one: chapter
level1: Headings
level2: Headings and chapters
default-level: 2
map-heading: Headings
search-placeholder: Search 21 chapters
licence: Creative Commons Attribution-ShareAlike 4.0 International License
returning-read: 6
cover-alt: Deliberate Practice cover with repeated ink strokes and a red correction

## book language-muscle
short: Language Muscle
kind: 9 chapters: three groups and one chapter on its own
unit: chapters
unit-one: chapter
level1: Parts
level2: Parts and chapters
default-level: 2
map-heading: Parts
subtitle-continues-title: yes
search-placeholder: Search 9 chapters
returning-read: 4
cover-alt: Language Muscle cover with interwoven green and cream ribbons

## report
### items
- Recommendation: A. It is the only layout here, Opus or Sol, that shows the start or continue button, search, the eBook and the whole contents on the first laptop screen, while each book keeps its own paper, accent, cover and title style.
- Compared with Sol (read only after these three layouts and the recommendation were finished): Sol's Jacket, which Sol recommends, stacks cover and title above the contents, so the contents start below the first screen on a laptop. Sol's Open contents is the closest to my A: a narrow book column beside a wide contents list. Sol's Reading desk is closest to the start panel in my C.
- From Sol I would keep the filter field inside the contents (useful for Linguistics' 253 answers), and the second button Start from the beginning for a returning reader.
- I would change in Sol's designs: the same "Online edition" label on all three books (my layouts use each book's own label or its real counts); the "2 levels" drop-down (my Show switch names the levels: Topics, Topics and answers); the desktop frame fixed at 1120 px (mine fills up to 1440 px, as you asked for wide desktop); numbering all 21 Deliberate Practice entries including License and Reader Guide (I number only parts, in C).
- Where Sol and I read the data differently: Language Muscle's group headings are one-sentence landing pages. Sol's Start opens the Introduction group page; mine opens 1. About this guide. Sol says "21 entries" for Deliberate Practice because the list includes License and Reader Guide; I followed your "21 chapters". Both are defensible; it is your call.
- Sources reused: the original Deliberate Practice front page (rounded buttons with icons, contents grouped by heading) and the original Language Muscle front page (title with its second half in green, rounded Start button, saved progress bar); lucide icons copied from the Language Muscle guide's own install.
- Limits: mock checks only, not acceptance of any build. Search looks at titles only. Returning progress is invented and labelled. No recorded audio is offered, because none is configured.
