# Reader Framework Guide

This guide explains how to use and extend the reader framework, and how to run the lightweight implementation locally.

## What You Get Out of the Box
- Content-as-data model (`data/content/*`)
- Block renderer (`components/blocks/BlockRenderer.tsx`)
- Reader shell with sidebar + TOC (`components/reader/*`)
- Landing view (`components/home/Home.tsx`)
- Search modal (`components/tools/SearchModal.tsx`)
- Highlights with export to Markdown
- EPUB export from content data
- Progress tracking + bookmarks
- Readability controls (font size, line height, width)

## Quick Start
1. Install dependencies:
```
npm install
```
2. Run the dev server:
```
npm run dev
```
3. Open the URL printed by Vite (typically `http://localhost:5173`).

## Authoring Content
Add or edit sections under `data/content`.

Example section:
```ts
export const SAMPLE_CONTENT: SectionConfig[] = [
  {
    id: 'intro',
    title: 'Welcome',
    order: 1,
    blocks: [
      {
        id: 'intro-heading',
        type: 'text',
        variant: 'heading',
        content: 'Welcome to the Reader Framework'
      }
    ]
  }
];
```

## Block Types
Start with the basic blocks and expand as needed:
- `text` (heading, subheading, paragraph, quote)
- `list` (bullet, ordered, checklist, grid)
- `callout` (tip, warning, example, note)

Extend block types by:
1. Updating `types.ts`.
2. Adding a renderer in `components/blocks/BlockRenderer.tsx`.

## Navigation Model
- Landing page is shown when the active section is `home`.
- Reader page is shown when a valid section is selected.
- The active section is controlled by `useReaderNavigation` and synced to the URL query string.

## TOC
- The TOC is generated from `text` blocks with `heading` or `subheading` variants.
- Each heading uses the block `id` as the anchor.

## Search
- Open search from the sidebar or with `Ctrl+K`/`Cmd+K`.
- The search index is generated from the section data (`utils/search.ts`).

## Highlights
- Select text in the reader to reveal the highlight toolbar.
- Highlights are stored in `localStorage` and listed in the sidebar.
- Export highlights from the sidebar to Markdown.

## Progress + Bookmarks
- Use the Progress panel to mark the current section as read.
- Bookmarks are stored in `localStorage` and shown with a star in the sidebar.

## Readability Controls
- Control font size, line height, and width from the sidebar.
- Settings persist in `localStorage`.

## EPUB Export
- Click `Download EPUB` in the sidebar.
- EPUB is built from the same section data used by the reader.

## Where To Customize
- Landing page: `components/home/Home.tsx`
- Reader shell and layout: `components/reader/ReaderShell.tsx`
- Sidebar content: `components/reader/Sidebar.tsx`
- Content rendering: `components/blocks/BlockRenderer.tsx`
- Search: `components/tools/SearchModal.tsx`
- Highlights export: `utils/highlightExport.ts`
- EPUB generation: `services/epub/epubGenerator.ts`

## Running in Production
This starter uses Vite. Build output is static and can be deployed to any static host.
```
npm run build
npm run preview
```
