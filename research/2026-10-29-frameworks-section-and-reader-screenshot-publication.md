---
status: "published"
title: "Frameworks section and reader screenshot publication"
kind: "evidence"
created: "2026-10-29T04:20:29Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework"
sources:
  - file: docs/release-reader-v1-1-2026-10-29/apps-page-frameworks/result-frameworks-section-2026-10-29.md
---

The personal Apps page has a dedicated Frameworks section and filter. Online Reader Framework is the section’s first item, with an authentic screenshot of the Academic Reading web edition. All other app records and wording are unchanged.

Website commit: e7f0c8f686267652ec919ede03ce147b08c41e82. Production deployment: https://258c4da7.dominiklukes-net.pages.dev . Live section: https://dominiklukes.net/apps/#g-frameworks .

The screenshot was copied unchanged from docs/release-two-books-2026-10-28/live-preview-browser/step1-desktop-academic-reading.png, captured during the prior deployed-preview browser check. It includes the selected cover, navigation, reading controls and action icons. The image is on the Apps card; the existing detail-page template does not display app screenshots.

The website was built from a committed archive, excluding concurrent uncommitted editorial work. Build passed; 1,094 relevant tests passed. Live Apps HTML, framework record HTML, app JSON and screenshot bytes exactly match the staged build. No fresh screenshot of the catalogue was captured. An initial additional assertion assumed record pages rendered screenshots; that assumption failed after the build and tests passed and was corrected without changing the detail-page template.

Catalogue deployment record updated and pushed in a84ceb1. The five published books and public framework release are unchanged. Private integration history was not pushed.
