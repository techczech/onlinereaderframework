# Online Reader Framework

A reusable reader framework (core library) plus a demo app for converting Markdown into a clean, readable web experience.

## Structure
- `packages/reader-core`: reusable library (components + parsing + utilities)
- `apps/reader-demo`: demo app with Markdown uploader and heading-level controls
- `docs/REUSE.md`: integration guide

## Quick Start (Demo)
```
cd apps/reader-demo
npm install
npm run dev
```

## Build Demo
```
cd packages/reader-core
npm install
npm run build

cd ../../apps/reader-demo
npm install
npm run build
npm run preview
```

## Demo Features
- Upload Markdown locally (client-only).
- Choose section heading level (Auto / H1 / H2).
- Choose TOC minimum level (H2 / H3 / H4).
- Preview in the reader with TOC, highlights, bookmarks, readability controls.

## Core Features
- Markdown parsing to `SectionConfig[]`.
- Reader UI: TOC, highlights, bookmarks, progress, readability controls.
- Search, EPUB export, `llms.txt` export.
- Inline code, code blocks with copy + wrapping, horizontal rules.

## Reuse
See `docs/REUSE.md` for integration steps and adapter guidance.
