import { SearchIndexEntry } from '../types';

export const SEARCH_INDEX: SearchIndexEntry[] = [
  {
    "id": "online-reader-framework-prototype",
    "title": "Online Reader Framework Prototype",
    "excerpt": "Online Reader Framework Prototype This document is the single source of truth for using and understanding the reader framework. It starts with a quick start and usage notes, then provides a complete, end‑to‑end explanation of the prototype "
  },
  {
    "id": "getting-started",
    "title": "Getting Started",
    "excerpt": "Quick Start Install dependencies:  Run the dev server:  Open the URL printed by Vite (typically `http://localhost:5173`). Local Deployment Test (README in the Reader) This prototype is configured to load `README.md` as the guide content so "
  },
  {
    "id": "content-authoring",
    "title": "Content Authoring",
    "excerpt": "What You Get Out of the Box Content-as-data model (`data/content/*`) Block renderer (`components/blocks/BlockRenderer.tsx`) with code blocks and inline code styling Reader shell with sidebar + TOC (`components/reader/*`) Landing view (`comp"
  },
  {
    "id": "architecture",
    "title": "Architecture",
    "excerpt": "1. Overview The prototype delivers a reusable reading experience for teaching materials. It emphasizes: Content as data Reader-first UI Local-first persistence Optional enhancements (search, highlights, EPUB, llms.txt) The reader is a singl"
  },
  {
    "id": "reader-features",
    "title": "Reader Features",
    "excerpt": "4. Reader Shell (Layout + Navigation) The reader is composed of: Sidebar navigation Main content area Table of contents Selection toolbar 4.1 Reader Shell Composition  4.2 Landing vs Reader `App.tsx` decides whether to show the landing page"
  },
  {
    "id": "build-sharing",
    "title": "Build & Sharing",
    "excerpt": "16. Build Pipeline The build process auto-generates: Search index `llms.txt` 16.1 Build Script   17. How To Extend Common extensions include: More block types (tables, images, comparisons) AI tools Export to PDF Cloud sync  18. Running Loca"
  }
];
