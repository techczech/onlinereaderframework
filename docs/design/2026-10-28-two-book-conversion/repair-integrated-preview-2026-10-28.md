---
title: Integrated book preview corrections
date: 2026-10-28
status: focused checks pass; independent integration review owed
---

The content integrator recorded 434 of 438 passing checks: two skip-link checks on the tall cognition prose, one overflowing slide graphic, and one slight summary diagram overflow. The original failing evidence is preserved in docs/evidence-integration-2026-10-28/log-integration-browser.json.

The parent corrected the content-link handler to align tall targets at the start of the actual scrolling content area, retaining centring for shorter targets. Only direct content links changed; stored fragment/history scrolling is unchanged.

Generated interaction pages now have a stable data-reader-interactive attribute. Scoped source CSS permits the summary flex items to shrink and wrap; the slide comparison uses a bounded single grid column and smaller diagram shapes below 768px. Original text and graphical relationships remain. The canonical build-source CSS and HTML generator were changed; generated files were then rebuilt from read-only originals using the same conversion steps. No changes were made directly to generated editions. The source provenance output hashes and sizes were refreshed; original source evidence remains.

Verification: root npm run build exited 0. The original integration checker was copied with only its output destination changed to preserve original evidence. The copied check exited 0, 438 of 438 checks pass, at 1280px and 375px. It exercises all 24 chapters and 9 frames, text skip links, live controls, full-view isolation, annotations, theme/Assist, agent-file bytes and EPUB prose. No real device, screen reader, Safari/Firefox or live Cloudflare headers were checked.

The build log, copied probe and new result JSON live beside this receipt. No production site, original app, Folio, public repository or release write path changed. Source hashes:

- packages/reader-core/src/original/use-publication-reader.ts: `e3c63f4bdc50b61258e3510278533890f4ed79107ff6164dc171fd075862d717`
- apps/reader-demo/src/books/next-books/build-source/build-embeds.tsx: `0e64b4f2e739dfcf4247c80ba50c02693af0e6fcbf6ff3bb2d195015725758a2`
- apps/reader-demo/src/books/next-books/build-source/embeds/base.css: `eaa35c89f4307e7760049748f2cfd217c00b7db9fdba2ece103c1e89b4b81352`
