# Selected cover integration: visual check (28 Oct 2026)

Scope: the user-selected covers on the review-mode home pages. Academic Reading option 3 "Connected ideas" (dark blue, landscape cards). Readability Foundations option 2 "Clear structure" (cream cut-paper page on pale indigo). Visual look only. Not a test verdict, not a security or content review, no formal pass or fail.

## Target and driver

- Preview: `http://100.85.55.122:8773/`, owned by the parent, left running.
- Driver: `driver.mjs` in this folder. Playwright from the sibling `dlnet` checkout, bundled headless shell build 1243. No installed Chrome.
- Source of the chosen files: `../selected-covers-2026-10-28.json` (records the exact JPEG sha256 for each cover).
- Raw output: `observations.json`, written by the driver.

## Screenshots

| File | URL | Viewport |
|---|---|---|
| `academic-reading-selected-cover-1280.png` | `?book=academic-reading&review=1` | 1280 × 900 |
| `academic-reading-selected-cover-390.png` | `?book=academic-reading&review=1` | 390 × 844 |
| `readability-foundations-selected-cover-1280.png` | `?book=readability-foundations&review=1` | 1280 × 900 |
| `readability-foundations-selected-cover-390.png` | `?book=readability-foundations&review=1` | 390 × 844 |

## Measured

| Check | Academic reading | Readability foundations |
|---|---|---|
| Image src on page | `/covers/academic-reading.jpg` | `/covers/readability-foundations.jpg` |
| Alt text | "Increasing Reading Productivity cover with linked landscape panels on dark blue" | "Foundations of Readability cover with a cream cut-paper page and a coral tab" |
| Natural size | 1600 × 2560 (ratio 0.625) | 1600 × 2560 (ratio 0.625) |
| Rendered box, 1280 | 256 × 400, `object-fit: contain` | 256 × 400, `object-fit: contain` |
| Rendered box, 390 | 120 × 192, `object-fit: contain` | 120 × 192, `object-fit: contain` |
| Served bytes, sha256 | 954,113 bytes, matches recorded (full hash below) | 875,251 bytes, matches recorded (full hash below) |
| Image loaded and complete | yes, both widths | yes, both widths |
| Centre point hit by the image itself | yes, both widths | yes, both widths |
| Title (h1) | "Increasing Reading Productivity Framework for Improving Academic Reading" | "Foundations of Readability Create accessible, easy-to-process documents and presentations" |
| Author | Dominik Lukeš | Dominik Lukeš |
| Contents entries in layout | 17, first at 1280 "Overview & Framework" | 22, first at 1280 "Five principles" |
| Demo selectors in DOM / visible | 0 / 0, both widths | 0 / 0, both widths |
| Page horizontal overflow, 1280 and 390 | 0 px | 0 px |
| Console errors or warnings, page errors, non-preview requests | none | none |

Served sha256 for Readability in full: `adbedd7db78beaf5a54e9d165b72d302158cc42ada2261745e2bd126c8e074ef`. Academic in full: `d56c130ac7f8c84f707e8d48aee205981f80efbc7c45866637f5b0b22b524539`. Both equal the recorded values.

## Aspect ratio

- The image is 0.625 wide-to-tall naturally. The rendered box at 1280 is 256 × 400 (0.64), so `object-fit: contain` letterboxes it inside the box. The drawn image is about 250 × 400, so the image is not stretched. The side margin is about 3 px per side.
- At 390 the box is 120 × 192 (0.625), so no letterboxing.

## Observations

**Working as expected**

- The chosen image loads at both widths on both books. The served bytes match the recorded sha256.
- The visible cover in each screenshot matches the chosen option: dark blue with landscape cards for Academic reading; cream cut-paper page on pale indigo for Readability.
- No overlap at the cover's centre point. Title, author, and buttons sit beside or below the cover without overlap.
- No page-level horizontal overflow at either width.
- No demo chooser in the DOM.
- No console errors, page errors, or outside requests.

**Looked at, not counted as defects**

- At 390, the Academic toolbar title is truncated with an ellipsis, as in the earlier review-home pass. The full title is in the page `<title>`.
- At 390, the Academic front-page buttons wrap, with Download eBook alone on the second row.
- At 1280 on the Readability page, a thin indigo band sits above the title block. It is decorative; no overlap is seen.
- At 390, the contents heading sits below the fold. The entries are in layout and reachable by scrolling. Scrolling was not exercised, so this is layout, not a reachability test.
- Each book has a second `<img>` element with the same src, 30 × 42 px and not visible. Probably a preload or a hidden duplicate. Not investigated.

**Not checked here**

- No keyboard pass, no screen reader, no Safari or Firefox, no phone hardware, no light/dark check beyond the default.
- No EPUB cover; this is the web-reader preview only, as scoped.
- Contents-row clicks and scroll-to-contents were not exercised.

No defects found that need a fix. Nothing was changed in the product.
