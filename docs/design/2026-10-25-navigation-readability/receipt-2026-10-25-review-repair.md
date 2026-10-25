---
title: Repair of the outline location marker found in review
date: 2026-10-25
register: for-dominik
status: built and verified in headless Chromium; fresh diff-only re-review owed to the parent
---

No action needed. FOR DOMINIK.

The P2 finding in [review-restoration.md](review-restoration.md) is repaired. Back, Forward, a click, a copied subsection URL and a resize now leave the side outline and the compact outline marking the heading the URL names, and scrolling by hand then moves the marker again. The root cause, the change, the red-then-green evidence, the commands and the source hashes are in [the combined repair receipt](../2026-10-25-readaloud-reuse/receipt-2026-10-25-review-repairs.md) (finding 4).

- Real books: the rebuilt demo passes the three-book navigation suite, 47/47, and the reviewer's unchanged probe reports matching markers at Back, Forward and after the resize.
- Fixture: `test-navigation-fixture-browser.mjs` is 59/59, including ten new checks that read `aria-current` in both outlines.
- Not checked: Safari, a physical phone, a screen reader.
