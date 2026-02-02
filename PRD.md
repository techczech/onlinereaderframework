# Reader Framework PRD (Complete Plan)

## Summary
A reusable, reader-first framework for publishing teaching materials and guides as high-quality web readers. The framework standardizes reading UX (TOC, highlights, search, progress, export), keeps content as data, and allows optional AI tools without making them required.

## Problem
Teaching guides are repeatedly re-implemented across projects, leading to inconsistent UX, duplicated effort, and slow launches. A shared reader framework should make new guide sites fast to build while preserving best-in-class readability and interaction patterns.

## Goals
- Provide a reusable reader scaffold for teaching materials.
- Standardize high-quality reading UX and accessibility.
- Support content-as-data authoring with block rendering.
- Keep optional AI enhancements modular and non-blocking.
- Minimize time to launch a new guide by reusing proven components.

## Non-Goals
- Full CMS or multi-author editorial workflow.
- Server-side rendering requirements.
- Mandatory AI features.

## Target Users
- Educators and researchers publishing guides.
- Learners consuming long-form teaching content.
- Developers creating new guide-based sites.

## Key User Stories
- As a learner, I can read comfortably and adjust font size, line height, and width.
- As a learner, I can highlight passages and export notes.
- As a learner, I can share a direct link to a specific passage.
- As an author, I can add new content via structured blocks.
- As a maintainer, I can launch a new guide without rebuilding the reader.

## Scope
### Must Have
- Content-as-data model and block renderer.
- Reader mode + home/landing mode.
- Table of contents and local search.
- Highlights with local persistence and export to Markdown.
- EPUB export from the same content source.
- Readability controls (font size, line height, width).

### Should Have
- Progress tracking and bookmarks.
- Layout switcher (scroll vs step).
- Shareable links to sections and highlights.

### Could Have
- Share cards with QR codes.
- AI coach, highlight summaries, and planning tools.
- PDF export.
- Cloud sync for highlights/progress.

## Functional Requirements
- FR1: Content is stored as typed data and rendered via a block renderer.
- FR2: Deep links open a specific section and optionally a specific highlight.
- FR3: Highlights are persisted locally and exportable to Markdown.
- FR4: Search index is generated from content data and used by a search modal.
- FR5: EPUB export uses the same content source as the reader.
- FR6: Readability settings persist in localStorage.
- FR7: Reader mode + landing mode are part of the same SPA shell.
- FR8: Layout switcher (scroll vs step) is a first-class option.

## Non-Functional Requirements
- Fast initial load on static hosting.
- Works offline after initial load.
- Fully keyboard navigable.
- WCAG AA contrast and focus states.

## Tech Constraints
- React + TypeScript.
- Static hosting compatibility.
- ES modules + import maps, with optional Vite build for production.

## Analytics (Optional)
- Section visits and completion rate.
- Highlight count per section.
- Feature usage (TOC, search, export).

## Risks
- Content model becomes too rigid for future guides.
- Optional AI tools accidentally become required dependencies.
- EPUB output diverges from on-screen structure.

## Success Metrics
- 50% reduction in time to launch a new guide.
- 80% of guide sites use the reader core.
- 20% increase in average completion rate.

## Milestones
1. Core scaffold + block renderer.
2. TOC, search, highlights, and readability controls.
3. EPUB export and shareable deep links.
4. Optional AI add-ons and advanced exports.

## Reference Projects
- `../academic-reading-framework`
- `../academic-productivity`
- `../building-your-language-muscle`
- `../readability-foundations`
- `../deliberate-practice-guide`

---

## Evidence From Existing Projects (What We Reuse)

### Reader Mode vs Landing Mode
`academic-reading-framework` uses a single SPA that switches between a landing view and a reader view based on state.
Snippet:
```tsx
const isReaderMode = selectedPointId !== null;
```

### Content as Data + Block Rendering
`readability-foundations` formalizes a block system and a renderer that maps block types to UI.
Snippet:
```tsx
switch (block.type) { /* render by type */ }
```

### TOC From Headings
`deliberate-practice-guide` parses Markdown headings and builds a TOC with focus/keyboard support.
Snippet:
```tsx
const match = line.match(/^(#{1,3})\s+(.+)$/);
```

### Highlights + Export
`building-your-language-muscle` and `deliberate-practice-guide` persist highlights and export them to Markdown.
Snippet:
```tsx
localStorage.setItem('userHighlights', JSON.stringify(highlights));
```

### Deep Linking to Text
`building-your-language-muscle` builds URLs with a `text` query for selection-based deep links.
Snippet:
```tsx
const deepLinkUrl = `${window.location.origin}${window.location.pathname}#/${id}?text=${encodeURIComponent(selectedText)}`;
```

### EPUB Export
`academic-reading-framework` and `deliberate-practice-guide` generate EPUBs client-side from the same content source.
Snippet:
```tsx
zip.file("mimetype", "application/epub+zip");
```

### Readability Controls
`deliberate-practice-guide` stores font size, line height, and width in localStorage and applies them globally.
Snippet:
```tsx
useEffect(() => { localStorage.setItem('fontSize', fontSize); }, [fontSize]);
```

### Optional AI Add-ons
`building-your-language-muscle` and `academic-productivity` integrate Gemini to extend static content without blocking reading.
Snippet:
```tsx
const result = await generateAuditReport(auditData);
```

---

## Proposed Architecture (Complete Plan)

### 1) Content Model
Use a typed, block-based schema inspired by `readability-foundations`. Content is data, not JSX.

```ts
export interface SectionConfig {
  id: string;
  title: string;
  order: number;
  blocks: Block[];
}
```

Rules:
- Every new guide is authored by editing `data/content/*`.
- The same content powers reading, search, and export.

### 2) Rendering Engine
- `BlockRenderer` dispatches based on `block.type`.
- Each block component is presentational and stateless.
- `RichText` (optional) parses inline syntax for links, emphasis.

### 3) Navigation + Layout
Two modes: Landing and Reader.
- Landing: overview, CTA, TOC summary.
- Reader: sidebar nav + content area.

Layouts:
- Scroll layout (primary).
- Carousel layout (optional) for step-based reading.

### 4) Reader UX Features
- TOC from headings with active state.
- Search modal using local search index.
- Highlights with notes, delete, and export.
- Progress tracking at section and global levels.
- Readability controls (font size, line height, width).
- Focus/immersive mode and reading ruler (optional).

### 5) Sharing & Export
- Deep links to sections and selected text.
- Share card generator with QR codes (optional).
- EPUB export from same content source.

### 6) Optional AI Layer
- AI services live under `services/ai/*`.
- Build-time flags or environment config enable them.
- Must never block core reading flow.

### 7) Persistence Model
- `localStorage` for highlights, progress, settings.
- Optional sync layer can be added later.

---

## Repo Skeleton (Initial Files and Purpose)
```
App.tsx                   # app shell with landing + reader modes
index.html                # entry document
index.tsx                 # react entry
types.ts                  # block schema and section types
data/content/*            # guide content data (source of truth)
data/searchIndex.ts       # generated or curated search index
components/blocks/*       # block rendering
components/layouts/*      # scroll and carousel layouts
components/reader/*       # reader shell, sidebar, content view
components/home/*         # landing view components
components/tools/*        # highlights, search, share, settings
context/*                 # navigation, preferences, progress
services/ai/*             # optional AI features
services/epub/*           # epub generation utilities
utils/*                   # helpers (slugify, search, export)
```

---

## Implementation Plan (Detailed)

### Phase 1: Core Reader
- Implement content model, BlockRenderer, and reader shell.
- Add landing/reader switch and section routing.
- Build search index and local search.

### Phase 2: Reading Tools
- Highlights + notes + export to Markdown.
- TOC with active heading tracking.
- Readability controls and persistence.
- Progress tracking and bookmarks.

### Phase 3: Export & Sharing
- EPUB generator using section data.
- Deep-linking to sections and highlights.
- Share cards with QR (optional).

### Phase 4: Optional AI
- AI coach chat.
- Highlight summary.
- Planning tools (audit, goal tuner, sprint builder).

---

## Feature-to-Source Mapping (Exact References)

### Landing/Reader split
- `academic-reading-framework/App.tsx`

### Content as data
- `readability-foundations/Architecture.md`
- `readability-foundations/components/blocks/BlockRenderer.tsx`

### TOC parsing
- `deliberate-practice-guide/components/TableOfContents.tsx`

### Highlights + export
- `deliberate-practice-guide/components/HighlightsDrawer.tsx`
- `building-your-language-muscle/App.tsx`

### Deep linking to text
- `building-your-language-muscle/App.tsx`

### EPUB export
- `academic-reading-framework/utils/epubGenerator.tsx`
- `deliberate-practice-guide/utils/epubGenerator.ts`

### Readability controls
- `deliberate-practice-guide/App.tsx`

### Optional AI tools
- `building-your-language-muscle/components/AICoach.tsx`
- `building-your-language-muscle/components/AuditTool.tsx`
- `academic-productivity/components/ToolCard.tsx`

---

## Open Questions
- Should the block schema include embedded interactive components by default, or only via a plugin registry?
- Will all guides use the same theming system, or should the reader provide theme tokens to be overridden per project?
- Should the search index be curated or generated at build time?
