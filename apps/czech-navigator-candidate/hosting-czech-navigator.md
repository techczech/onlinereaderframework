---
title: Czech Navigator Cloudflare Pages hosting preparation
status: published-https-working-domain-api-pending
updated: 2026-10-29
---

# Czech Navigator hosting

The proposed standalone Cloudflare Pages project is `czechnavigator`, serving `dist/` at the root of the desired `czechnavigator.dominiklukes.net` hostname. This follows the existing standalone `deliberatepractice`, `languagemuscle` and framework demo `onlinereader` catalogue records. The two newer books imported under the main website use a different folder-based route; this candidate needs no main-website import.

## Commands after publication authority

Run in this candidate directory. The installed CLI is `/opt/homebrew/bin/wrangler`. These commands have been prepared but not executed.

1. Verify the authenticated account with `/opt/homebrew/bin/wrangler whoami`, then list its projects with `/opt/homebrew/bin/wrangler pages project list`. Account access and project-name availability have not been verified in this task.
2. If the project does not exist, create it with `/opt/homebrew/bin/wrangler pages project create czechnavigator --production-branch main`.
3. The exact next upload command for the reviewed current bytes is `/opt/homebrew/bin/wrangler pages deploy dist --project-name czechnavigator --branch candidate --commit-dirty=true`. This creates a publicly reachable preview; it therefore requires the parent's publication authority even though search indexing is blocked.
4. After preview delivery checks and production authority, deploy the same dist folder with `/opt/homebrew/bin/wrangler pages deploy dist --project-name czechnavigator --branch main --commit-dirty=true`.

The dirty flag accurately acknowledges the existing uncommitted candidate; it does not commit or stage framework work. Do not substitute the demo or another book's output. `npm run build` regenerates the EPUB and can change its ZIP hash; revalidate and record the new hash after any rebuild.

## Hostname prerequisites

After authority, add `czechnavigator.dominiklukes.net` through the Pages project's Custom domains screen. Confirm control of the `dominiklukes.net` Cloudflare zone, existing DNS records and conflicts before changing them. Follow the Pages-provided DNS target, expected to be `czechnavigator.pages.dev`; do not invent a target or add DNS before the Pages custom-domain association. Wait for hostname and TLS activation, then verify HTTPS, chapters/search, local font/media loads, EPUB response bytes and mobile table scrolling on the actual host. No DNS, account, project existence or certificate readiness is claimed here.

## Prepared assets and limits

Vite copies public/_headers and public/robots.txt into dist. The HTML and response policy retain noindex/nofollow; robots.txt disallows crawling. These are indexing controls, not access control. Headers set EPUB MIME, nosniff and no-transform; hashed assets have immutable caching. Header delivery has not been tested on Cloudflare. The existing approved UI and relative asset base are unchanged. No public-indexing switch, analytics, store package, shared release manifest or canonical Folio is added.

The upload folder is technically prepared for a preview of the archive-based reference reader. Authorisation, authenticated account/project checks, domain association, live checks and catalogue registration of any actual new deployment remain for the parent. Source comparison remains pending after repeated OneDrive timeouts. Preserve the source's CC BY-NC-SA 4.0 and credits.

## Local precedents inspected

- `_CATALOG/entities/deployments/cloudflare-pages-onlinereader.md`.
- `_CATALOG/entities/deployments/cloudflare-pages-deliberatepractice.md`.
- `_CATALOG/entities/deployments/cloudflare-pages-languagemuscle.md`.
- Framework `docs/evidence-reader-v1-publication-2026-10-27/deploy-deliberate-practice-production.log`.
- Framework `research/2026-10-28-two-book-web-publication-and-cloudflare-delivery.md`.

## Publication receipt — 2026-10-29

Published the unchanged verified dist to production branch main. Website: https://czechnavigator.dominiklukes.net/ . Deployment: https://b2da53ce.czechnavigator.pages.dev/ (b2da53ce-caf5-46b5-8276-06967afe8e30). All 134 served files matched approved hashes, including the EPUB. Custom HTTPS and hidden bundled Chromium checks passed; Cloudflare API domain validation still pending at last check. See research/2026-10-29-czech-navigator-website-publication-and-live-verification.md for evidence and limits. Earlier preparation sections describe the prepublication state.
