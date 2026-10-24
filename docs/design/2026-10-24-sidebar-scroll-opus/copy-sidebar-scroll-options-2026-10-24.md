---
title: Sidebar and scrolling — three arrangements
register: FOR DOMINIK
date: 2026-10-24
status: design-suggestion
renderer: render-sidebar-scroll-options.mjs
data: excerpts-linguistics-sidebar-mock-2026-10-24.json
---

<!-- Canonical copy for sidebar-scroll-options-2026-10-24.html. The renderer reads every label below; edit here, then re-render. Block syntax: "## option <id>" starts an arrangement; "key: value" lines set fields; "- " lines under "### <list>" are list items. -->

# Sidebar and scrolling: three arrangements

intro: Each sketch is a small working model of the Linguistics book, using its real topics and answers. Pick an arrangement below, then scroll and click inside the frame. Dashed outlines mark what scrolls: orange is the contents list, blue is the text. Grey areas never scroll.

recommendation: Recommended: A. It keeps the reader’s present layout and book identity, fixes the four measured faults, and reuses Language Muscle’s own contents behaviour. B is the choice only if the reader must sit inside other websites without a fixed height. C suits phones and very long books, but is new to these three.

tabs-label: Arrangement
default-tab: a

legend-contents: Contents scrolls here
legend-article: Text scrolls here
legend-page: The whole page scrolls
legend-fixed: Stays put

## comparison
heading: How they differ
columns: | Today | A | B | C

### rows
- Contents starts at | about half-way down | under a short header | under a short header | under a short header
- Clicking a topic name | opens an empty page | opens the topic | opens the topic | shows its answers
- Current answer on arrival | can be off-screen | brought into view | brought into view | brought into view
- Keyboard after choosing | still scrolls the list | scrolls the text | scrolls the page | scrolls the text
- Size of the change | — | small: sidebar and focus | large: every scroll measurement | medium: new list behaviour

## option today
badge: Today
name: Today, as measured
summary: Search, Home and Notes take the top 199 pixels and stay put. Below them, the cover, title, progress bar and the first topics share one scrolling list, so the topics start about halfway down a 900-pixel screen. Clicking a topic name opens an empty topic page instead of opening the topic.
search: Search
home: Home
notes: Notes & Highlights
contents-heading: Table of contents
progress: Progress 0%
group-click: navigate
reveal: none
focus: sidebar

### facts
- The answer opened from a link sits below the visible part of the list (measured at 1,026 px on a 900 px screen).
- After a chapter click, Page Down and the arrow keys scroll the list, not the text.
- Clicking “Typology” opened an empty Typology page and ticked it as read.

## option a
badge: A · Recommended
name: Pinned header, one contents list
summary: One short pinned header carries the cover, the book title (which goes to the book’s home page) and Search. Everything below it is the contents list. A topic row opens and closes the topic; only answers open a page. After you pick an answer, the text takes over the keyboard.
search: Search this book
progress: 0 of 253 read
contents-heading: Table of contents
group-click: toggle
reveal: nearest
focus: article

### facts
- Origin: Language Muscle’s original sidebar, where topic rows only open and close.
- The list keeps its position and open topics when you go to the home page, close the sidebar or change chapter.
- Opening the book at an answer centres it in the list; Previous and Next move the list only when the answer would be hidden.

## option b
badge: B
name: The page scrolls, the contents stays beside it
summary: The browser page itself scrolls the text, as on a documentation site. The contents column sticks to the side and scrolls on its own. Space, Page Down, Back and find-in-page work as on any web page without the reader steering focus.
search: Search this book
progress: 0 of 253 read
contents-heading: Table of contents
group-click: toggle
reveal: nearest
focus: page

### facts
- Suits putting the reader inside another website where the host page gives it as much height as the text needs.
- A larger change: the reader’s scroll-to-highlight, heading tracking and reading ruler measure the text box today and would have to measure the page instead.
- Sticky contents only hold if the reader is shown at a fixed height; inside a frame that grows to the full text height they scroll away.

## option c
badge: C
name: Topics first, then answers
summary: The contents shows the nine topics. Choosing a topic replaces the list with that topic’s answers and a row back to all topics. The longest list is 45 answers instead of a 253-entry tree.
search: Search this book
progress: 0 of 253 read
back: All topics
contents-heading: Topics
group-click: drill
reveal: nearest
focus: article

### facts
- Origin: the drill-in list used by iPad and phone reading apps; it is new to these three books.
- Never shows two topics open at once, so the list cannot grow long by accident.
- Deliberate Practice has no topics and would show its 21 chapters as one list.

## labels
open-topic: Open topic
close-topic: Close topic
focus-note-article: Keyboard now scrolls the text
focus-note-sidebar: Keyboard still in the list
focus-note-page: Keyboard scrolls the page
empty-topic: This topic page has no text of its own; it lists the answers below.
chapter-count: answers
no-excerpt: This sketch carries text for the first ten Semantics and pragmatics answers only.
previous: Previous
next: Next
