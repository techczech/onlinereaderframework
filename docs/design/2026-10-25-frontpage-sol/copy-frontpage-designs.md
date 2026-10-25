---
title: Shared book reader frontpage design copy
register: FOR DOMINIK
date: 2026-10-25
status: three-provisional-designs
---

# Canonical interface and comparison copy

The JSON block supplies every authored interface string. Book wording and the exact contents tree are in sources-frontpage-books.md. Edit these Markdown sources, then rebuild.

```json
{
  "title": "Three ways into the book",
  "intro": "Compare the same book in three frontpage designs.",
  "tabsLabel": "Frontpage design",
  "bookLabel": "Book",
  "frameLabel": "Preview frame",
  "desktop": "Desktop",
  "phone": "Phone",
  "stateLabel": "Reading state",
  "newReader": "First visit",
  "returning": "Returning reader",
  "previewState": "Returning-reader state is a sample; no reading history is accessed.",
  "scope": "Design mockups. Contents search and expansion work. Reading, eBook and toolbar actions preview their destinations.",
  "coversNote": "Existing covers remain provisional. Current titles and current contents are retained.",
  "frameTitle": "Interactive book frontpage mockup",
  "frameCaption": "{view} frame · {width} px",
  "recommendation": "My recommendation: Jacket. It gives the cover room without delaying the contents or the first page.",
  "bookBy": "By {author}",
  "onlineEdition": "Online edition",
  "contents": "Contents",
  "tableOfContents": "Table of contents",
  "listen": "Listen",
  "formatting": "Formatting",
  "assist": "Assist",
  "notes": "Notes",
  "start": "Start reading",
  "resume": "Resume reading",
  "fromBeginning": "Start from the beginning",
  "search": "Search",
  "searchPlaceholder": "Find in contents…",
  "searchLabel": "Search the current book's contents",
  "clearSearch": "Clear search",
  "ebook": "Download eBook",
  "startHere": "Start here",
  "continue": "Continue reading",
  "lastPage": "Last opened",
  "browse": "Browse the book",
  "openEntry": "Open section",
  "previewDestination": "Preview destination",
  "destinationBody": "This would open the selected section in the reader. The mockup keeps you on the frontpage.",
  "ebookBody": "The reader generates this book as an EPUB. This mockup does not generate a file.",
  "toolbarBody": "This is the position of the separate reader control. Its menu is outside this frontpage mockup.",
  "listenBody": "Listen opens browser read-aloud. No recorded audiobook is configured for these books.",
  "close": "Close",
  "depthLabel": "Contents levels",
  "depthOne": "1 level",
  "depthTwo": "2 levels",
  "shownMatches": "{count} matching entries",
  "empty": "No contents match. Try another word.",
  "allContents": "All contents",
  "dpCount": "{entries} entries",
  "lmCount": "{entries} entries · {roots} top-level sections",
  "lingCount": "{leaves} answers · {roots} topics",
  "answerCount": "{count} answers",
  "entryCount": "{count} entries",
  "footer": "{author} · Online edition",
  "skip": "Skip to book contents",
  "variants": [
    {
      "id": "jacket",
      "number": "01",
      "name": "Jacket",
      "strap": "A book first, with the reader close at hand.",
      "rationale": "A generous cover and a quiet title page lead into the contents. The reading action stays beside the title, while every section remains one short scroll away.",
      "tradeoff": "Best for a first visit. It takes more vertical space than the other two designs, especially with the long Linguistics title."
    },
    {
      "id": "desk",
      "number": "02",
      "name": "Reading desk",
      "strap": "A compact welcome that puts the next page first.",
      "rationale": "The small cover, sans-serif masthead and rounded controls borrow from the original apps. A prominent reading panel sits beside the contents instead of a large jacket.",
      "tradeoff": "Best for returning readers. It feels more like a working reader and gives the cover less presence."
    },
    {
      "id": "contents",
      "number": "03",
      "name": "Open contents",
      "strap": "Choose a subject before choosing a first page.",
      "rationale": "A narrow book column faces a broad, searchable contents list. The hierarchy and entry counts lead the page; the cover and download stay together at the side.",
      "tradeoff": "Best for browsing Linguistics. It is the fastest route to a specific topic, but gives a sequential guide a less deliberate opening."
    }
  ]
}
```
