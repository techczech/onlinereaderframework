---
title: "Czech Navigator website publication and live verification"
kind: "evidence"
created: "2026-10-29T18:46:30Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/czech-navigator-candidate"
sources:
  - url: "https://czechnavigator.dominiklukes.net/"
  - url: "https://b2da53ce.czechnavigator.pages.dev"
---
Published the approved rough archive reader on 2026-10-29 without rebuilding. All 135 local dist hashes matched the approved hosting manifest before upload. Cloudflare production deployment: b2da53ce-caf5-46b5-8276-06967afe8e30; project czechnavigator, branch main, existing Dominik account.

Custom domain: czechnavigator.dominiklukes.net. Exact DNS name was vacant; associated Pages domain first, then created only its proxied CNAME to czechnavigator.pages.dev using existing Bitwarden DNS token. Root and unrelated records untouched. Custom HTTPS is working; Cloudflare API still reported domain validation pending at the last check. Initial 522 propagation and Python urllib 403 evidence retained; curl and Chromium succeeded. API certificate completion is not claimed.

Live custom-host checks: all 134 served file hashes match approved manifest (index.html follows redirect to /; _headers is configuration). EPUB HTTP 200, application/epub+zip, 409884 bytes; SHA256 7660bec393bc5402230d065c70ef43c666f921679e2a09fcc6546e4c480fab23. Noindex/nofollow and no-transform response headers verified. Hidden bundled Chromium verified chapter navigation, 167 tables in the selected chapter, slovesa search with two results, and horizontal mobile table scrolling (scrollLeft 50; viewport/document width both 390). Screenshots and browser logs retained beside this record.

Edition limits: approved rough archive source; latest Word comparison remains pending. Original licence/credits and source notice retained. No editorial changes, rebuild, store upload, authentication grant changes or background service.

Detailed evidence: validation-czech-navigator-live-http-final.json; validation-czech-navigator-live-browser-final.txt; headers-czech-navigator-epub.txt; evidence-czech-navigator-cloudflare.json; evidence-czech-navigator-domain-final.json.
