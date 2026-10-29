---
title: "Czech Navigator approved reader bookmark repair and hosting preparation"
kind: "evidence"
created: "2026-10-29T18:38:45Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/czech-navigator-candidate"
sources:
  - file: research/validation-czech-navigator-bookmark-repair.json
  - file: research/validation-czech-navigator-coverage.json
  - file: research/validation-czech-navigator-epub.txt
  - file: hosting-czech-navigator.md
---
The reader direction was approved with “Yes, continue with this reader” at 2026-10-29T18:35:45.535Z in the Czech Navigator DTC review report. The parent collected the response.

Only the exact dangling Collocation hyperlink to _Toc55636603 is unwrapped in derivative Markdown feeding both web and EPUB. Its visible text “Error! Bookmark not defined.” remains. A pre-repair derivative HTML comparison proves every other HTML byte unchanged. The archived Markdown hash remains 15cd2e53891ee72399775be88900e9ba867c54302894467545500ed5e187633f.

The production build passes. EPUBCheck reports 0 fatals / 0 errors / 0 warnings / 0 infos. Coverage passes: 12 web sections and EPUB chapters, 308 tables, 9,652 cells and identical ordered cell text. The focused renderer suite passes 23/23. Existing browser evidence covers chapter navigation, Czech search and mobile horizontal table scrolling; browser checks were not rerun for this link-only repair. EPUB text comparison retains the known three generated-footnote-marker differences. Current EPUB hash and upload file hashes are in the referenced JSON records.

Cloudflare Pages dist assets are prepared, with robots/noindex response controls, no-transform, local assets and EPUB MIME. Existing standalone book/demo catalogue deployments and framework deployment evidence were inspected. hosting-czech-navigator.md records exact preview/production commands and account/project/domain prerequisites. No DNS, public upload, store publication or shared framework change occurred. No authenticated Cloudflare project/domain availability or live header delivery check was performed. The Vite build emits its existing large-chunk warning.

Latest Word comparison remains pending after repeat OneDrive timeouts; no same-path retry occurred. No canonical Folio is declared. Credits and original CC BY-NC-SA 4.0 are retained. Parent independent verification and publication authority remain outstanding. Documentation was checked for source fidelity and current status; historical one-error evidence is explicitly labelled as history.
