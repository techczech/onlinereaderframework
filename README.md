# Online Reader Framework Prototype

This document is the single source of truth for using and understanding the reader framework. It starts with a quick start and usage notes, then provides a complete, end‑to‑end explanation of the prototype for developers and designers.

## Getting Started

### Quick Start
1. Install dependencies:
```
npm install
```
2. Run the dev server:
```
npm run dev
```
3. Open the URL printed by Vite (typically `http://localhost:5173`).

### Local Deployment Test (README in the Reader)
This prototype is configured to load `README.md` as the guide content so you can test every feature against real, long-form text.

1. Build the app (also regenerates search index + `llms.txt`):
```
npm run build
```
2. Preview the build locally:
```
npm run preview
```
3. Open the URL Vite prints and navigate to the reader. You will see this README rendered as the guide content.

## Content Authoring

### What You Get Out of the Box
- Content-as-data model (`data/content/*`)
- Block renderer (`components/blocks/BlockRenderer.tsx`) with code blocks and inline code styling
- Reader shell with sidebar + TOC (`components/reader/*`)
- Landing view (`components/home/Home.tsx`)
- Search modal (`components/tools/SearchModal.tsx`)
- Highlights with export to Markdown
- EPUB export from content data
- Progress tracking + bookmarks
- Readability controls (font size, line height, width)
- Per-section word count + read time (toggle in sidebar)
- Collapsible TOC with level-based indentation
- `llms.txt` output for LLM-friendly text export

### Authoring Content
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

### Import a Markdown File
Use the import script to convert a `.md` file into reader content:
```
npm run import:md -- /path/to/guide.md
```
This writes `data/content/importedContent.ts`. To display that file, swap it into `data/content/sampleContent.ts`.

### Build Outputs
- Search index is generated on build.
- `llms.txt` is generated on build and served from `/llms.txt`.

---

## Architecture

### 1. Overview
The prototype delivers a reusable reading experience for teaching materials. It emphasizes:
- Content as data
- Reader-first UI
- Local-first persistence
- Optional enhancements (search, highlights, EPUB, llms.txt)

The reader is a single-page app (SPA) that switches between a landing view and the reader view.

---

### 2. Architecture Summary
The app is intentionally small and flat:
```
App.tsx
index.html
index.tsx
index.css
types.ts
data/
  content/
  searchIndex.ts
components/
  blocks/
  reader/
  tools/
  home/
services/
  epub/
utils/
  search.ts
  highlightExport.ts
  markdownParser.ts
scripts/
  build-search-index.ts
  build-llms.ts
  import-markdown.ts
public/
  llms.txt
```

The app is built with React + TypeScript and runs with Vite.

---

### 3. Content Model (Content as Data)
Content lives in `data/content/*` as typed objects. This allows the same content to drive:
- The reader UI
- Search index
- EPUB export
- `llms.txt`

#### 3.1 Section Model
Each guide is composed of `SectionConfig` objects:
```ts
export interface SectionConfig {
  id: string;
  title: string;
  order: number;
  blocks: Block[];
}
```

#### 3.2 Block Model
Blocks represent semantic units such as text, lists, and callouts:
```ts
export type Block = TextBlock | ListBlock | CalloutBlock;
```

Example content:
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
      },
      {
        id: 'intro-list',
        type: 'list',
        variant: 'bullet',
        items: ['Content as data', 'Reader-first UX']
      }
    ]
  }
];
```

---

## Reader Features

### 4. Reader Shell (Layout + Navigation)
The reader is composed of:
- Sidebar navigation
- Main content area
- Table of contents
- Selection toolbar

#### 4.1 Reader Shell Composition
```tsx
<Sidebar ... />
<main>
  <ReaderContent ... />
  <TableOfContents ... />
</main>
<SelectionToolbar ... />
```

#### 4.2 Landing vs Reader
`App.tsx` decides whether to show the landing page or the reader view based on `useReaderNavigation()`.

---

### 5. Block Renderer
Blocks are rendered by `components/blocks/BlockRenderer.tsx`.
This isolates presentation from content.

The renderer supports fenced code blocks and inline code (backticks). Code blocks include a copy button and wrap long lines by default.

#### 5.1 Rendering Logic
```tsx
switch (block.type) {
  case 'text':
    return <TextBlockView block={block} />;
  case 'list':
    return <ListBlockView block={block} />;
  case 'callout':
    return <CalloutBlockView block={block} />;
}
```

#### 5.2 Anchorable Headings
Headings set `id` so TOC links can target them:
```tsx
<h2 id={block.id} className="scroll-mt-28">{block.content}</h2>
```

---

### 6. Table of Contents (TOC)
TOC items are generated from heading and subheading blocks. The TOC can be collapsed to hide H3+ subheadings while keeping top-level headings visible.

#### 6.1 TOC Extraction
```tsx
const tocItems = section.blocks
  .filter(block => block.type === 'text' && (block.variant === 'heading' || block.variant === 'subheading'))
  .map(block => ({ id: block.id, text: block.content, level: block.variant === 'heading' ? 2 : 3 }));
```

#### 6.2 Active Heading Highlight
IntersectionObserver tracks the current visible heading.

---

### 7. Search Modal
Search is performed locally against an index built from content.

#### 7.1 Build Index
```ts
export function buildSearchIndex(sections: SectionConfig[]): SearchIndexEntry[] {
  return sections.map(section => ({
    id: section.id,
    title: section.title,
    excerpt: ...
  }));
}
```

#### 7.2 Keyboard Shortcut
`Ctrl+K` / `Cmd+K` opens the search modal.

---

### 8. Highlights
Highlights are created by selecting text in the reader.

#### 8.1 Selection Toolbar
When text is selected:
```tsx
<SelectionToolbar text={selectedText} onAdd={addHighlight} />
```

#### 8.2 Persistence
Highlights are stored in `localStorage`:
```ts
localStorage.setItem('reader_highlights', JSON.stringify(updated));
```

#### 8.3 Export
Markdown export is available from the sidebar:
```ts
exportHighlightsToMarkdown(highlights);
```

---

### 9. Deep Linking
Deep links embed both section and selected text.

Example URL:
```
?section=intro&text=Reader%20Framework
```

The reader will:
- Navigate to the section
- Locate the text
- Highlight it using `<mark>`

---

### 10. Progress Tracking
Progress is local and section-based.

#### 10.1 Read State
```ts
const [readSections, setReadSections] = useState(new Set());
```

#### 10.2 Progress Panel
Shows total and completed sections with a progress bar.

---

### 11. Bookmarks
Bookmarks are stored separately and displayed as a star in the sidebar.

---

### 12. Readability Controls
Readers can adjust:
- Font size
- Line height
- Content width

Heading sizes and code block text scale proportionally with the base font size.

#### 12.1 State and Persistence
```ts
const [fontSize, setFontSize] = useState<FontSize>('base');
localStorage.setItem('reader_font_size', fontSize);
```

#### 12.2 CSS Mapping
```ts
const sizeMap = { sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-xl' };
```

---

### 13. EPUB Export
The EPUB is generated client-side from the same content source.

#### 13.1 Generator
```ts
zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
```

#### 13.2 Output
The user clicks **Download EPUB** in the sidebar.

---

### 14. llms.txt Export
An LLM-friendly plain-text export is generated for scraping and ingestion.

#### 14.1 Generator
```ts
npm run build:llms
```

#### 14.2 Output
The file is saved to:
```
public/llms.txt
```

---

### 15. Markdown Import Script
The script converts a `.md` file into `SectionConfig` data.

#### 15.1 Usage
```
npm run import:md -- /path/to/guide.md
```

#### 15.2 Output
Generated file:
```
data/content/importedContent.ts
```

---

## Build & Sharing

### 16. Build Pipeline
The build process auto-generates:
- Search index
- `llms.txt`

#### 16.1 Build Script
```json
"build": "npm run build:search-index && npm run build:llms && vite build"
```

---

### 17. How To Extend
Common extensions include:
- More block types (tables, images, comparisons)
- AI tools
- Export to PDF
- Cloud sync

---

### 18. Running Locally
```
npm install
npm run dev
```

---

### 19. Recommended Usage for Sharing
To share this framework with others:
- Publish the repo on GitHub
- Add a short demo guide under `data/content/`
- Include screenshots and a `llms.txt` output
- Provide a one-command setup in the README

---

### 20. Quick Reference
Key files:
- `App.tsx`
- `components/reader/ReaderShell.tsx`
- `components/blocks/BlockRenderer.tsx`
- `components/tools/SearchModal.tsx`
- `services/epub/epubGenerator.ts`
- `scripts/build-llms.ts`
- `scripts/build-search-index.ts`
