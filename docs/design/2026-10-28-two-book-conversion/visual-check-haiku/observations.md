# Visual check of the two-book preview (hidden screenshot pass, 28 Oct 2026)

This is a visual look at the built preview of the Academic Reading book and the Readability Foundations book. It is not a test verdict. It covers four views at 1280 × 900 and 390 × 844. It does not cover a keyboard pass, a screen reader, Safari or Firefox, or any phone hardware.

## Screenshots

| File | What it shows |
|---|---|
| `academic-home-1280.png` | Academic Reading front page: title, author, description, Start Reading / Search / Download eBook, contents in two columns |
| `academic-cognition-section-1280.png` | Cognition Explorer section: chapter list on the left, frame at 590 px with "Skip to text version" and "Open full view", the map, "On this page" on the right |
| `academic-cognition-after-node-click-1280.png` | After clicking the Scanning node: node highlighted, related arrows kept, Scanning panel open |
| `readability-home-1280.png` | Readability Foundations front page |
| `readability-formatting-section-1280.png` | Visual examples (Text): cramped-text frame at the top, same width as the text column |
| `readability-cramped-after-click-1280.png` | After clicking the cramped box: the same sentence shown clearly inside the frame, prose version below |
| `academic-home-390.png` | Academic Reading front page at phone width |
| `academic-cognition-section-390.png` | Cognition Explorer at phone width: frame at 334 px, map cut off at the right edge |
| `readability-home-390.png` | Readability Foundations front page at phone width |
| `readability-formatting-section-390.png` | Visual examples (Text) at phone width |

## Observations

**Working as expected**

- **Title, author and toolbar** show on both books at both widths. The toolbar is present; at 390 it is icons only, with no visible text labels.
- **Chapter hierarchy:** the left chapter list groups chapters under headings and marks the current one. On the Cognition Explorer page the "On this page" outline shows one entry, "How to read this map:", which matches the one heading on that page.
- **Frame width:** the frame is 590 px at 1280, the same width as the text column beside it. At 390 it is 334 px, inside the 390 px viewport.
- **Overflow:** no page-level horizontal overflow at either width, and no element measured past the right edge.
- **Type size:** body text is 19 px on a 32 px line at 1280, and 18 px on a 31 px line at 390.
- **Clicks:** clicking the Scanning node opens its panel and keeps the related arrows highlighted while the others fade (shot 3). Clicking the cramped box swaps in the clear text (shot 6). I only clicked at 1280 for the cramped box; at 390 I clicked the node only.
- **Console and network:** no console errors or warnings, and no request leaves the local server, at either width.

**Things to look at**

- **Cognition map is wider than its frame at both widths.** At 1280 the rightmost node, Re-coding, sits against the edge of the frame (shot 2). At 390 only part of the map shows, and the nodes at the right edge are cut off (shot 8). The frame does say "Scroll horizontally to view full diagram", so the map is reachable, but it is not fully visible on first view at phone width.
- **"Reset View" wraps onto two lines at 390** beside the map heading (shot 8). Minor.
- **Floating controls cover the contents list on the front pages.** The "Book" chooser at bottom left, and "Front page layout" at bottom right at 1280, sit over the lower part of the contents list at both widths (shots 1, 4, 7, 9). This looks like preview scaffolding. It is not on the known-limits list, so I have counted it as a finding. Whether it stays in the build is a decision for Dominik.
- **Cramped text is very small in its cramped state** (shot 5). That is the point of the demonstration, and the clear text beneath is readable. I have not counted it as a defect.

**Not checked in this pass**

- **Font-size demo:** not in any screenshot, and its frame width was not measured. This is a gap.
- **Slide examples:** the Visual examples (Slides) section was not captured.
- **Skip links:** the "Skip to text version" link is present in each frame header. Its keyboard behaviour was not exercised here.

**Known limits, not counted as defects:** no chosen cover, placeholder photograph in one slide example, unversioned CC BY source line (visible on the Readability front page), no licence or public route on the Academic book, and frames follow the operating-system colour rather than the reader's theme. Shots were taken in light mode.

## Method and limits

- Driver: `visual-check.mjs` in this folder. It serves `apps/reader-demo/dist` on an ephemeral loopback port, applies the embed Content-Security-Policy under `/embeds/`, and uses the bundled headless shell (build 1243). It loads Playwright from a sibling checkout because this repository has no installed copy.
- The driver expects that sibling path, so it will not run on another machine as written.
- Only the browser and server started by the driver were used. Both were closed at the end of the run.
