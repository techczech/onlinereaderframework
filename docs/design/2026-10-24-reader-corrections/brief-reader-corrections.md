---
title: Book identity and desktop reader correction
register: FOR DOMINIK
date: 2026-10-24
status: provisional-working-preview
---

# Book identity and reading controls

The current preview fails the author’s desktop and navigation requirements. Earlier technical acceptance is superseded for these surfaces. Preserve the original reader’s working text, annotations and exports while correcting the presentation.

## Journeys and right-when conditions

1. A reader opens a book. Its own cover, colours and masthead identify it immediately. The reader can start, search or browse its actual contents. Right when the three books are recognisably distinct and every contents entry points to its real section.
2. A reader opens a long chapter on a desktop. The sidebar shows each section once, the text uses a comfortable book-width column, and local headings appear only when useful. Right when a 1440-pixel desktop does not squeeze the article to a phone-width strip.
3. A reader needs support. The visible Reading settings button opens named controls for appearance, text and focus, with explicit selected values and a reset. Right when a reader can find and undo an adjustment without deciphering an icon grid.
4. A reader wants to listen. Listen distinguishes recorded audiobook tracks from browser speech; playback exposes progress, speed and chapter navigation. Right when recordings resume reliably, absent audio is explained and unavailable recordings never silently become synthetic speech.

## Working design

Retain the existing publication layout rather than inventing a new app shell. A book cover sits beside its home title. Linguistics uses warm editorial colours; Deliberate Practice uses an ink/red practical identity; Language Muscle uses green/cream and a literary masthead. Existing cover candidates are reused provisionally, not declared final print-cover choices.

The desktop reading area allocates width to the article first. The optional local heading rail sits outside the article’s measure. At smaller widths it hides before the article becomes cramped; mobile navigation remains a drawer. The chapter title is not repeated as a local contents entry.

The home and sidebar use one canonical section tree with configurable depth. The public configuration supplies book appearance, interface labels and contents settings. Default wording is Search, Table of contents, Reading settings and Listen. The source manuscripts are not changed to customise the interface.

The bottom Read Your Way matrix is replaced by a clearly labelled settings surface available near the article. Its groups explain page appearance, text layout and focus support. WriteFlex/ReadFlex source inspection determines the reusable reading-support controls. UnityBC source inspection determines the recording player’s behaviour.

## States to verify

Home with/without a cover; shallow/nested contents; contents hidden and depth limited; normal/dark reading; desktop/mobile; settings open/closed/reset; support enabled/disabled; audio absent/ready/loading/playing/paused/ended/failed; recording without timings; resume after reload; book switching; blocked browser storage; keyboard focus and Escape; browser speech unsupported.

This preview does not settle final cover selection, finished audiobook production or public release. Those remain separate from implementing the requested reading experience.
