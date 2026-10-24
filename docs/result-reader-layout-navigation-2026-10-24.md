---
title: Publication reader layout and navigation corrections
register: FOR DOMINIK
date: 2026-10-24
status: implementation-ready-for-parent-integration
---

# Publication reader layout and navigation corrections

- The article now measures 701 pixels at a 1440-pixel desktop viewport with both navigation rails visible.
- Home and sidebar navigation follow the actual section tree. Labels, depth, covers and mastheads use the publication configuration.
- Reading settings use a native dialog with explicit article width, theme and focus controls. The parent can insert the reading-support and audiobook controls through the agreed props.

## Layout and book identity

The previous width setting constrained the article and local contents together, with additional padding inside the article card. The corrected layout gives the article its own default measure of 70ch. The local contents rail has a separate, nonshrinking 12rem allocation and appears only when the main area has at least 1000 pixels available. Removing the card padding restores usable text width. An empty local contents rail returns no element; h1 is excluded, and h2 through h6 retain their actual heading IDs.

The default width remains `md`. Saved explicit narrow settings remain authoritative, with a visible reset. There is no destructive preference migration: the earlier default was already `md`, and its CSS meaning is corrected. Wide and full-width choices remain available.

Home displays the supplied real cover beside the title on desktop. Editorial, practical and literary mastheads differ in typography, spacing and treatment. Accent, paper and ink are scoped reader colour variables. Invalid colour names, invalid hex lengths, declarations, URLs and variable references are rejected. Dark mode uses its own readable paper and ink colours.

## Navigation and labels

`PublicationBook.labels` accepts `search`, `tableOfContents`, `readingSettings` and `listen`. Defaults are Search, Table of contents, Reading settings and Listen. Explicit contents labels override legacy home overview copy. The existing Start Reading wording remains unchanged.

`PublicationBook.navigation` accepts `homeDepth`, `sidebarDepth` and `showHomeContents`. Home defaults to two actual tree levels; false hides its contents. Depth zero produces an empty list. Sidebar depth is unlimited unless configured. Both views preserve source section IDs and order without manufacturing category groups. Sidebar nesting uses one indentation calculation rather than accumulating margins.

## Parent integration contract

`ReaderLayoutProps` now exposes:

- `readingSettingsExtra?: React.ReactNode`, inserted inside the native settings dialog.
- `readingSurface?: (children: React.ReactNode) => React.ReactNode`, wrapping only the existing MarkdownRenderer while preserving the contentRef ancestry.
- `listeningPanel?: React.ReactNode`, rendered near the reader root.
- `onListen?: () => void`, invoked by the visible Listen button.
- `onBrowserSpeechStart?: () => void`, forwarded to the existing renderer for audio exclusivity.
- `onResetReadingSupport?: () => void`, composed with the reader settings reset.

`PublicationReaderProps.audio` accepts readonly `PublicationAudioTrack` values from the listening module. The parent owns wiring these props through BookReader. Without onListen, the toolbar explicitly says Browser read-aloud, disables unavailable speech and never presents synthetic speech as an audiobook.

The basic dialog owns article width, colour theme and navigation focus. Numeric text size, spacing and local reading overlays are intentionally supplied by the parent's reading-support controls, avoiding duplicate controls. Existing keyboard shortcuts and the old ruler state remain available. Native settings dialogs suppress background shortcuts, including Escape's background state resets. Mobile save and page-sharing controls remain accessible beside the chapter breadcrumb.

## Verification

The focused navigation suite first failed all five initial tests against the previous views. It now passes seven tests covering recursive order, duplicate removal, depth, visibility, neutral/custom labels, real cover/masthead rendering, invalid colour rejection and label precedence. The invalid-colour regression was also observed failing before its correction.

The focused headless browser suite passes against a current-source fixture using the package's generated styles and bundled Chromium headless shell. Article widths were 700.75 pixels at 1440 and 1473 pixels, 696 pixels at 1024, 700.75 pixels at 768, 350 pixels at 390 and 280 pixels at 320. Neither the document nor the main area overflowed horizontally. The rail remained visible at 1440/1473 and hid at smaller tested widths. A chapter containing only h1 rendered no rail. The suite also verified an explicit narrow setting, reset, native dialog closure and restored trigger focus, background shortcut suppression, retained focus mode after Escape, dark mode, a short mobile dialog and visible mobile save/share controls.

The original reader and new focused tests passed together: 15 tests. The existing publication-content suite passed all 23 tests. Full core TypeScript checking with `--noEmit` passed after the listening owner corrected its concurrently written highlight module. An earlier package build stopped on that module's temporary errors; this is not evidence of a final root build. No root build was run after the final integration props; the parent owns that check after every module is released.

Astra reviewed the patch and identified three issues: modal shortcuts, mobile save/share access and invalid colour acceptance. All three were corrected with focused verification. A second read-only closure review confirmed the shortcut and mobile fixes and found three malformed numeric colour forms. Those three cases were added to the regression and observed failing, then rejected by tightened numeric syntax. No other concrete blockers were found in that review.

## Scope and limits

Only the assigned original reader files, the new navigation helper, focused tests and this receipt were edited. Demo App, cover assets, original applications, manuscripts, import snapshots, EPUB algorithms and annotation algorithms were preserved. There were no commits or pushes.

The browser fixture verifies layout and controls without requiring the demo build. It does not establish final integrated audiobook/reading-support behaviour, the actual three-book preview or user acceptance. The parent retains its before screenshots and will run its own three-book browser check after the root build.
