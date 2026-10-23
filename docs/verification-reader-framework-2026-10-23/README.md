---
title: Original reader framework desktop and mobile evidence
date: 2026-10-23
status: captured-not-author-acceptance
---

# Reader framework visual evidence

These captures show the actual original-derived reader with real books at 1440-pixel desktop and 390-pixel mobile widths. They are runtime evidence, not author approval of the interface. `browser-capture.json` records URLs, downloaded ebook sizes, page errors and horizontal-overflow checks. The three real ebook buttons produced ZIP/XML-valid archives. `installed-package-browser.json` separately records actual installed-package rendering, local fonts and mobile navigation.

The original application comparison captures remain in sibling `book-engine/docs/original-reader-inspection-2026-10-23/`. Those originals were not changed. The framework's later MathML text-model correction does not alter the captured layout; final verification records its behaviour separately.

Rebuild with `npm run build`. Run `scripts/capture-reader-preview.py` through the existing project Playwright environment while the local preview serves the demo on port 8773. The installed-package check uses a temporary server and always shuts it down. Both use bundled headless Chromium, with no user Chrome automation.
