---
title: Shared book reader frontpage design files
register: FOR DOMINIK
date: 2026-10-25
status: design-only
---

# Frontpage design files

Open [the interactive mockups](frontpage-designs-sol-2026-10-25.html) from disk. [The design report](report-reader-frontpage-designs-2026-10-25.md) explains the three alternatives, book adaptations, sources and remaining limits.

- [The interface copy](copy-frontpage-designs.md) supplies all authored labels, notices and comparison wording.
- [The current book snapshot](sources-frontpage-books.md) supplies exact book wording, cover descriptions and the complete contents trees.
- The two `style-frontpage-*.css` files hold the book layouts and comparison styling.
- The two `behaviour-frontpage-*.js` files hold the mock interactions and comparison behaviour.
- `assets/` contains the copied provisional covers, exact Lucide icon paths and icon licence.
- `evidence/` contains the focused check, its results and 18 screenshots.

Rebuild from the repository root with:

```sh
node docs/design/2026-10-25-frontpage-sol/render-frontpage-designs.mjs
```

The build reads only files in this design folder and writes only its HTML. It embeds the Markdown content, CSS, behaviour, images and icons. It needs Node, with no install, network access or server.

The focused check uses the already installed Playwright package and bundled headless shell on this machine:

```sh
node docs/design/2026-10-25-frontpage-sol/evidence/check-frontpage-mockups.mjs
```

The checked HTML is a design artefact. It does not read saved reader state or implement reader settings, narration, reading or EPUB export. The source books and production reader remain separate.
