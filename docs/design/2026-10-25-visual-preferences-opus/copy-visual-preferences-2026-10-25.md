---
title: Reading assistance and formatting — three arrangements
register: FOR DOMINIK
date: 2026-10-25
status: design-suggestion
renderer: render-visual-preferences.mjs
data: excerpts-books-visual-preferences-2026-10-25.json
---

<!-- Canonical wording for visual-preferences-options-2026-10-25.html. The renderer and the behaviour script read every visible string from here; edit here, then re-render. Syntax: "## <block>" or "## option <id>" starts a block; "key: value" sets a field; "- " lines under "### <list>" are list items. Product wording (what a reader of the books would see) is in "## labels"; design notes are in "## notes". -->

# Reading assistance and formatting: three arrangements

intro: Each sketch is a small working model of the shared book reader, with real text from the three books. Choose a book, then open the two menus and change the settings: the text in the frame responds. Yellow notes are design annotations, not part of the reader. Nothing here plays sound.

recommendation: Recommended: A. Two labelled menus in the existing toolbar, Reading assistance and Formatting, each opening below its button so most of the text stays visible while you change it. It keeps the toolbar you liked, brings back the icons and rounded controls of the original guides, and removes the duplicate and conflicting settings.

tabs-label: Arrangement
default-tab: a
book-label: Book
view-label: View
view-desktop: Desktop, 1040 px window
view-phone: Phone, 360 px

## comparison
heading: How they differ
columns: | A | B | C

### rows
- Where the controls are | two menus in the toolbar | one panel with two tabs | a floating bar, as in the original Deliberate Practice guide
- Clicks to reach any setting | one | one or two | one
- Stays open while you read | no: a click in the text closes it | yes | no: a click in the text closes it
- Listen | inside Reading assistance | its own button | its own button in the bar
- Phone | top bar, menus rise from the bottom | top bar, full-height panel | bottom bar within thumb reach
- Size of the change | small: toolbar and settings only | small | medium: toolbar removed, floating bar added

## option a
badge: A
name: Two menus in the toolbar
summary: The toolbar keeps its place and gains two labelled menus. Reading assistance holds listening, focus aids and hiding the navigation. Formatting holds theme, typeface, size, spacing and width. Each opens below its button; a number on the button shows how many of its settings differ from the book's defaults. On a phone the same two menus rise from the bottom of the screen, with a switch between them at the top.

### facts
- Closest to the current reader: only the toolbar and the settings window change.
- Two separate menus answer the request directly, and each is short enough to fit without scrolling on a laptop screen.
- Listen moves into Reading assistance. While the browser voice is reading, a small player with Pause and Stop appears in the toolbar.
- Weakness: Listen is one click deeper than today.

## option b
badge: B
name: One panel with two tabs
summary: One Reading settings button opens a panel on the right with two tabs, Reading assistance and Formatting. Listen stays a separate toolbar button. The panel stays open while you read, so you can try settings against a whole page of text.

### facts
- Everything in one place, with room for a short explanation under each setting.
- Listen keeps its own button, so audio stays one click away.
- Weakness: on a laptop the panel covers the "On this page" column, and the second tab is one extra click.
- Weakness: it is the most like a settings window, the least like the original guides.

## option c
badge: C
name: A floating bar, as in the original guide
summary: The toolbar is removed. A rounded bar floats at the top right of the text with Listen, Assist, Format and Notes, the way the original Deliberate Practice guide placed its dark mode, ruler and focus buttons. On a phone the same four controls and Contents sit in a bar at the bottom of the screen.

### facts
- The sleekest of the three and the nearest to the original guides.
- Every control has a word under or beside its icon; there is no grid of unlabelled icons.
- Weakness: the bar sits over the top of the text, and the book title is shown only in the sidebar.
- Weakness: the largest change to the layout you approved last round.

## labels
contents: Contents
search: Search
progress: read
assist: Reading assistance
assist-short: Assist
format: Formatting
format-short: Format
notes: Notes
listen: Listen
settings: Reading settings
settings-short: Settings
close: Close
home: Home
share: Share
save: Save
sec-listen: Listen
read-aloud: Read aloud
read-aloud-hint: Your browser's voice reads this chapter.
start: Start
pause: Pause
resume: Resume
stop: Stop
playing: Reading aloud
recorded: Recorded audiobook
sec-focus: Focus
paragraph-focus: Paragraph focus
paragraph-focus-hint: Fades the other paragraphs.
overlay: Reading overlay
overlay-off: Off
overlay-window: Line window
overlay-ruler: Ruler
window-height: Window height
lines-1: 1 line
lines-3: 3 lines
lines-5: 5 lines
dimming: Dimming
dim-light: Light
dim-medium: Medium
dim-dark: Dark
overlay-hint: Follows the pointer or a tap. With the text selected, Up and Down move it. Escape turns it off.
sec-page: Page
hide-nav: Hide navigation
hide-nav-hint: Leaves only the text on screen.
assist-reset: Turn all off
shortcuts: Keyboard shortcuts
theme: Theme
theme-light: Book paper
theme-dark: Dark
typeface: Typeface
serif: Serif
sans: Sans
size: Text size
line: Line spacing
para: Paragraph spacing
letter: Letter spacing
letter-normal: Normal
width: Text width
w-sm: Narrow
w-md: Normal
w-lg: Wide
w-full: Full
format-reset: Reset formatting
format-reset-hint: Back to this book's defaults.
saved: Saved for this book on this device.
decrease: Decrease
increase: Increase
changed: changed

## notes
recorded: Shown only when a book has recordings. None of the three books has any yet, so the reader would not show this row.
sound: Sketch only: no sound plays, and the highlight moves on a timer.
shortcut-a: Key A
shortcut-r: Key R
shortcut-f: Key F
desktop-menu: Opens below its button; it covers the right edge of the text, not the line you are reading.
phone-sheet: Rises from the bottom; the switch at the top moves between the two menus.
panel: Stays open while you read.
pill: Floats over the top of the text, as in the original guide.
