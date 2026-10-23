---
title: Original publication reader integration
status: building
---

# Original publication reader

Import `PublicationReader` from `./original/PublicationReader` and the public types from `./original/types`. The parent owns the package barrel and demo integration. This module reuses the Deliberate Practice application markup and components, with recursive navigation from Language Muscle.

## Integration requirements

- React 18 and React DOM 18 remain the runtime peers.
- Quote image sharing uses the original `qrcode` package. Add `qrcode` and development types `@types/qrcode` to reader-core. No file-saver, router, AI SDK or credentials are needed.
- Import `original/reader-original.css` in the application stylesheet. The parent must arrange CSS packaging/export; TypeScript does not copy CSS.
- Tailwind must scan `packages/reader-core/src/original/**/*.{ts,tsx}` (and the installed module JS when consuming a build), enable `@tailwindcss/typography`, and use class-based dark mode. The original class names are retained. The stylesheet provides original animations and content styling.
- Load Inter (300–600), Merriweather (300, 400, 700 and italic 300), and Material Symbols Outlined (variable fill/weight). These are the original fonts and icons from Deliberate Practice `index.html`; host them locally for an offline package or use the original Google Fonts stylesheet URLs.
- The rich-content worker supplies `renderPublicationContent` from `../publication-content`; each section passes its own `format`.
- `book.home` optionally preserves book-specific hero labels, concept cards, overview text, author notes and licence. It must contain the publication's actual copy. The minimum book contract remains sufficient.
- Coaching is absent unless a host explicitly supplies the optional `coaching` render boundary. This module imports no service or credential code. AI note summaries are omitted.

Detailed provenance and check evidence will be appended after implementation.

## Home adapter shape

The selected hero, wave, start/search/download buttons, concept cards and category map all come from the original home. Supply `home.features: [{ title, description, icon }]` to retain the original concept cards with the actual publication's copy. `icon` is a Material Symbols name. Optional `home.badge`, `home.overviewTitle`, `home.overviewDescription`, `home.authorNote`, and `home.license: { label, href, imageUrl? }` control the original labels and attribution. Omit the licence when it has not been established for that book; no Deliberate Practice licence or claims are assigned to another publication.

## Navigation and persistence

Section IDs must be unique through the entire recursive tree; `home` is reserved. The reader accepts both original `?section=chapter&text=quote` and `#/chapter?text=quote` routes, and writes query routes with the stable `book` identifier. Home and chapter navigation retain unrelated host query parameters. Original Language Muscle chapter links are intercepted; ordinary heading and footnote fragments stay in the current section. The host selects a book from `?book=` before mounting the reader and restores that selection on browser history events.

`PublicationReader` itself keys its stateful inner component with `book.id`. Every persisted field uses `publication-reader:<encoded book id>:<field>`. Malformed stored values are rejected, blocked storage keeps reading functional, and storage failures produce a session-only notice. Old unnamespaced original-app data is not imported automatically.

Search, speech, highlight restoration and margin-note anchors use the same normalised rendered-text model. DOM ranges decorate selections across emphasis, links and table cells without flattening content. Heading links use the IDs in the actual rendered HTML; footnote IDs are preserved from the content sanitiser. Overlapping highlights paint the longest matching selection; the original notes drawer retains every saved record. As in the original, identical quote text highlights every matching occurrence, and margin notes anchor to the first match.

## Checks

Run the module's Node regressions from the repository root:

```sh
node --test packages/reader-core/src/original/test-original-reader.mjs
packages/reader-core/node_modules/.bin/tsc --noEmit -p packages/reader-core/tsconfig.json
```

The source-linked browser checks and source hashes are recorded in `report-original-reader-extraction.md`. Package styling, bundled assets, real-book adapters, package distribution checks and independent review remain with the parent implementation session.
