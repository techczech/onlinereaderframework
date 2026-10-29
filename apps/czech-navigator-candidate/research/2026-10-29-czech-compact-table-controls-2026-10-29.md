---
title: "Czech Navigator compact table controls publication"
kind: "evidence"
created: "2026-10-29T23:15:26Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/czech-navigator-candidate"
sources:
  - url: "https://czechnavigator.dominiklukes.net/"
  - url: "https://ec172010.czechnavigator.pages.dev/"
---
Published 2026-10-29 to existing Cloudflare Pages czechnavigator project, branch main, deployment https://ec172010.czechnavigator.pages.dev/ and custom domain https://czechnavigator.dominiklukes.net/ . No DNS changes.

Default header is 32.8px, ordinal visually hidden, table expanded, tools closed. Table tools reveals search and the existing reviewed transformations. Hidden controls respect hidden CSS even in full-width mode. Empty status has no height and tool paragraphs have explicit utility typography. Source-layout disclaimer removed. Validation and header-restoration gates unchanged. Source has 308 tables: 20 reviewed and 288 faithful.

Framework and direct Vite builds passed without Python/EPUB/source generation. All 20 reviewed tables passed semantic browser interactions. Inherited table regression passed and refused 320 malformed reviews. Focused local and live hidden bundled Chromium checks passed at desktop 1440 and mobile 390 on actual Kolik?/hodně/velmi/moc table 147, reviewed table 10 and merged table 2: Enter/Space disclosure, Escape focus return, search/reopen/clear, collapse, full width/Escape, unchanged cell text and reset without duplicates. Results/screenshots: research/repair-czech-reader/local-chrome-* and live-chrome-*. The scripts folder contains check-czech-table-chrome.mjs and adapted existing browser flows.

Live JS matches local build exactly; neither disclaimer sentence is present in any production JS. Hashes: research/repair-czech-reader/live-chrome-asset-hashes.json. Live CSS index-CBV_cuUe.css SHA-256 c4caa94853859e739c076dd9432a0592fc3ded4e617806c80589f70eea138caf. Public EPUB before/after SHA-256 b70a8f756f26ee92e6a7807beaf6da0f4e41c8d778d28345d99420aba23d36e5. Static agent/export build bytes equal existing public sources.

Concurrent WMF source files were preserved and excluded from staging. After Vite copied public files, dist WMF files were replaced byte-for-byte with existing live images to keep publication focused. Other dirty files and shared manifests remain unstaged. No PR created.
