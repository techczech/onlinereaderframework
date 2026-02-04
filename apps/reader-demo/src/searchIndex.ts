import { SearchIndexEntry } from 'reader-core';

export const SEARCH_INDEX: SearchIndexEntry[] = [
  {
    "id": "online-reader-framework",
    "title": "Online Reader Framework",
    "excerpt": "Online Reader Framework A reusable reader framework (core library) plus a demo app for converting Markdown into a clean, readable web experience."
  },
  {
    "id": "structure",
    "title": "Structure",
    "excerpt": "`packages/reader-core`: reusable library (components + parsing + utilities) `apps/reader-demo`: demo app with Markdown uploader and heading-level controls `docs/REUSE.md`: integration guide"
  },
  {
    "id": "quick-start-demo",
    "title": "Quick Start (Demo)",
    "excerpt": ""
  },
  {
    "id": "build-demo",
    "title": "Build Demo",
    "excerpt": ""
  },
  {
    "id": "demo-features",
    "title": "Demo Features",
    "excerpt": "Upload Markdown locally (client-only). Choose section heading level (Auto / H1 / H2). Choose TOC minimum level (H2 / H3 / H4). Preview in the reader with TOC, highlights, bookmarks, readability controls."
  },
  {
    "id": "core-features",
    "title": "Core Features",
    "excerpt": "Markdown parsing to `SectionConfig[]`. Reader UI: TOC, highlights, bookmarks, progress, readability controls. Search, EPUB export, `llms.txt` export. Inline code, code blocks with copy + wrapping, horizontal rules."
  },
  {
    "id": "reuse",
    "title": "Reuse",
    "excerpt": "See `docs/REUSE.md` for integration steps and adapter guidance."
  }
];
