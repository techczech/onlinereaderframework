# Online Reader Framework

A reusable reader framework (core library) plus a demo app for converting Markdown into a clean, readable web experience.

The goal is reuse: keep the reader logic in `reader-core` and adapt content sources via adapters so future projects do not copy-paste features.

**Structure**
- `packages/reader-core`: reusable library (components + parsing + utilities)
- `apps/reader-demo`: demo app with Markdown uploader and heading-level controls (`src/defaultMarkdown.md` is the default sample)
- `docs/REUSE.md`: integration guide

**Quick Start (Demo)**
```bash
cd apps/reader-demo
npm install
npm run dev
```

**Live Demo**
- https://onlinereader.pages.dev

**Build Demo**
```bash
cd packages/reader-core
npm install
npm run build

cd ../../apps/reader-demo
npm install
npm run build
npm run preview
```

## Architecture Overview

This project is intentionally split into a **Core** package and a **Demo** app so you can reuse the reader in other projects.

**Core: `packages/reader-core`**
- Owns all data types and UI primitives.
- Does not fetch content. It only receives `sections` and renders.
- Ships parsing helpers to convert Markdown into `SectionConfig[]`.
- Exports utilities for search, reading stats, highlights, and EPUB.

**Demo: `apps/reader-demo`**
- A thin integration layer.
- Handles file upload and user configuration.
- Converts Markdown into sections using the core adapter.
- Displays sections through the reader UI.

**Adapters**
- Adapters translate external content into `SectionConfig[]`.
- Current adapter: Markdown (`parseMarkdown`).
- Future adapters: MDX, Notion, CMS, Google Docs, etc.

## Code Organization (Core)

**Key modules**
- `types`: `SectionConfig`, `Block`, `SearchIndexEntry`, settings types.
- `utils/markdownParser.ts`: Markdown to `SectionConfig[]`.
- `adapters/markdownAdapter.ts`: `parseMarkdown(markdown, options)` wrapper.
- `components/reader/*`: `ReaderShell`, `ReaderContent`, `Sidebar`, `TableOfContents`.
- `components/tools/*`: search, highlights, progress, readability controls.
- `services/epub`: EPUB export.

**Data flow**
1. Content source produces Markdown (or another format).
2. Adapter converts into `SectionConfig[]`.
3. `ReaderShell` renders sections and manages reader state.
4. Tools and panels (search, highlights, bookmarks) use `SectionConfig[]` and local storage.

## Reuse in Other Projects

The core idea: **bring your content, keep your UI**. You only need to produce `SectionConfig[]` and pass it into `ReaderShell`.

**Minimal integration**
```tsx
import { ReaderShell, parseMarkdown, SectionConfig } from 'reader-core';

const sections: SectionConfig[] = parseMarkdown(markdown, {
  sectionHeadingLevel: 'auto',
  tocMinLevel: 2,
  fallbackTitle: 'My Guide'
});

export function MyReader() {
  return <ReaderShell sections={sections} initialSectionId={sections[0]?.id} />;
}
```

**Adapter pattern**
```ts
import { SectionConfig } from 'reader-core';

export function parseMySource(input: string): SectionConfig[] {
  // Convert your source into SectionConfig[]
  return [
    {
      id: 'intro',
      title: 'Introduction',
      order: 1,
      level: 2,
      blocks: [{ id: 'p-1', type: 'text', variant: 'paragraph', content: input }]
    }
  ];
}
```

## For LLM Agents (Codex, Claude Code)

This repo is structured to make automated refactors and reuse straightforward. The key concept is **Core + Adapters**.

**Workflow for LLM-driven reuse**
- Keep `packages/reader-core` unchanged unless you are adding new shared capabilities.
- Build a new app in `apps/<your-app>` that imports from `reader-core`.
- Add an adapter if your content source is not Markdown.
- Do not copy-paste components into the app. Keep changes inside core when they are reusable.

**Rules of engagement**
- Any UI change needed in multiple apps belongs in `reader-core`.
- Any content ingestion change belongs in an adapter.
- Any app-specific UX (landing pages, prompts, upload flows) stays in the app.

**Template instructions for an agent**
```text
Goal: Build a new reader app using reader-core.
Constraints:
- Do not modify reader-core unless functionality is reusable across apps.
- Use an adapter to convert source content to SectionConfig[].
- The app should be thin: no duplicate reader logic.
Acceptance:
- App renders ReaderShell with sections.
- Upload/import flow works locally.
- No feature regressions in existing demo.
```

## Demo Features
- Upload Markdown locally (client-only).
- Drag-and-drop file input.
- Upload template via `public/upload.md`.
- Choose section heading level (Auto / H1 / H2).
- Choose TOC minimum level (H2 / H3 / H4).
- Preview in the reader with TOC, highlights, bookmarks, readability controls.
- Download `llms.txt` from the reader sidebar (uses the current loaded content).

## Core Features
- Markdown parsing to `SectionConfig[]`.
- Reader UI: TOC, highlights, bookmarks, progress, readability controls.
- Search, EPUB export, `llms.txt` export (runtime + build-time).
- Inline code, code blocks with copy + wrapping, horizontal rules.

## Reuse Guide
See `docs/REUSE.md` for step-by-step integration and adapter guidance.

## `llms.txt` Export
There are two ways to generate `llms.txt`:
- **Runtime (recommended for user uploads):** Use the “Download llms.txt” button in the reader sidebar. This exports the **currently loaded** sections.
- **Build-time (demo default):** `npm run build` in `apps/reader-demo` generates `public/llms.txt` from `src/defaultMarkdown.md`.
