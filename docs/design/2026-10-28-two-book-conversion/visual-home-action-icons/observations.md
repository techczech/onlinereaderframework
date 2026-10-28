# Home action icons: observation pass (2026-10-28)

No action needed. This is a hidden screenshot and DOM observation, not a test verdict or security review.

## What was checked

- Page: `http://100.85.55.122:8773/?book=academic-reading&review=1` (parent preview, left running).
- Viewports: 1280×900 and 390×844, DPR 1.
- Browser: bundled `chrome-headless-shell` (Playwright cache, build 1243), headless. No installed Chrome, no desktop session.
- Driver: `check-home-icons.mjs` in this folder. It reads the page only; it does not edit product files.
- Screenshots: `home-1280.png` and `home-390.png` (full-page captures; the 390 capture is one viewport tall).

## Result

| Button | Icon (aria-hidden) | 1280 | 390 |
|---|---|---|---|
| Start Reading | arrow_forward | Icon 19×19 px at x 423, label starts x 450 (gap 7 px) | Icon at x 41, label at x 67, same 7 px gap |
| Search | search | Icon 19×19 px at x 587, label starts x 614 | Icon at x 205, label at x 231 |
| Download eBook | download | Icon 19×19 px at x 707, label starts x 734 | Icon at x 41, label at x 67; button wraps to a second row |

- Icons are drawn as glyphs in both screenshots. Rendered width is 19 px, not the wider raw-word width, so the Material Symbols glyph is in use and no raw ligature names show.
- No icon overlaps its label. Each icon sits inside its button bounds.
- Each label is one line (`labelLineRects` 1). The 390 Download button wraps onto its own row without clipping.
- `document.fonts` reported Inter faces. The list was capped at 20 entries, so the Material Symbols face status was not read directly. The glyph rendering above is the evidence.
- Icons carry `aria-hidden="true"`. Buttons have no `aria-label`; the accessible name is the visible label text (`Start Reading`, `Search`, `Download eBook`).

## Overflow and errors

- Page horizontal overflow: 0 px at both widths.
- Elements past the right edge: none at both widths.
- Button internal overflow: 0 px.
- Console errors or warnings: none.
- Failed responses (4xx/5xx): none.
- Request hosts: only `100.85.55.122:8773`. No external hosts.

## Readability spot check (390, DOM only)

- Labels: 14 px, line-height 21 px, weight 600, Inter.
- Approximate text-to-background contrast: 5.61:1 at both widths.

## Cleanup

- Browser closed by the driver.
- No scratch files created. Only this folder was written to.
- Parent preview server was not touched and is still serving.
