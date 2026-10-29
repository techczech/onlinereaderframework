---
title: Reader book-root subdomain migration
created: 2026-10-29
status: prepared-for-parent-review
agent: Codex gpt-6.1-sol
---

The reader now targets seven book-root subdomains. The personal website’s `/books/` remains the catalogue. This handoff prepares the reader only; no deployment, DNS, website redirect, Git write or manuscript change was performed.

## Implementation

Only canonical-sites.ts, edition-plan.ts and the existing release book tests changed. Converted asset selection continues to depend on book identity. Host base independently controls paths, robots and header scope. Original books still require root addresses. Converted folder compatibility remains exercised with explicit legacy-site fixtures. The existing Vite exporter, staged write path, rollback, manifest schema, source cleanliness gate, asset pins, foreign isolation and restricted underscore IDs remain in place.

Course Design remains demo-only and has no canonical host. No manuscripts, core or EPUB code changed. Selected covers for Academic Productivity and Developing Competence remain pinned. The five older books retain their existing EPUB behaviour; this migration does not introduce EPUB covers or change their export policy. EPUB binary generation was not separately tested in this task.

## Target map and recommended Cloudflare Pages projects

| Book ID | Canonical root | Recommended project |
| --- | --- | --- |
| linguistics | https://linguistics.dominiklukes.net/ | reader-linguistics |
| deliberate-practice | https://deliberatepractice.dominiklukes.net/ | reader-deliberate-practice |
| language-muscle | https://buildingyourlanguagemuscle.dominiklukes.net/ | reader-language-muscle |
| academic-reading | https://academicreading.dominiklukes.net/ | reader-academic-reading |
| readability-foundations | https://readability.dominiklukes.net/ | reader-readability |
| academic-productivity | https://academicproductivity.dominiklukes.net/ | reader-academic-productivity |
| developing-competence | https://developingcompetence.dominiklukes.net/ | reader-developing-competence |

These are recommendations, not verified available or existing Cloudflare project names. Reuse the existing project for the two unchanged hosts where appropriate. Project creation and domain attachment remain external deployment work.

## Verification and provenance

`test-reader-baseline.log` records 30 passing release tests before implementation. `test-root-before.log` records the new academic root test failing because its old base was `/books/academic-reading/`. `test-reader-after.log` records all 37 release tests passing after implementation, including root builds for seven published books. `test-reader-typecheck.log` records a passing reader typecheck.

The focused final run in `test-root-manifests.log` records complete root manifests as `ROOT_BUILD_EVIDENCE` JSON lines, plus the final test result. These are real Vite builds of the actual app, using the existing buildEdition pipeline into disposable scratch repositories inside this checkout. The supplied `head: test` and clean source flag are synthetic test fixtures, not clean release provenance. The final academic root test explicitly changes its scratch manifest to dirty and checks that verifyExistingEdition refuses it. None of these outputs authorises external deployment.

Each root build passes verifyEdition against the other seven books in the eight-book demo registry. Tests inject every foreign book identity into each built bundle and require rejection. Root pages load `/assets/`; robots, sitemap, canonical tags, Book JSON-LD and agent exports derive from each new root. Converted assets match the legacy folder plan byte records, including the three Academic Reading and six Readability embeds. The existing verifier checks exact planned bytes and the root embed CSP. Every section’s legacy `#/id` remains untouched by release route normalisation, including the four authorised underscore IDs.

`patch-reader-subdomains.diff` is the exact patch against copies captured before editing. `hashes-reader-source.sha256` hashes reader source, core source, scripts, asset pins, covers, embed documents and package metadata at handoff. Baseline copies preserve the three edited files. All build scratch is removed by the existing test cleanup. Concurrent Czech Navigator work is outside this patch and was preserved.

## Parent deployment sequence

The parent first reviews the security and write-path implications and builds from its reviewed clean source. Do not relabel scratch manifests, exclude dirty source, or bypass the clean-source gate. Run from the reader repository:

```sh
npm run check --prefix apps/reader-demo
npm run test:release --prefix apps/reader-demo
npm run build:release -- --book all
npm run verify:release --prefix apps/reader-demo -- --book all
```

After the parent’s clean gates pass, the exact per-book deployment commands are:

```sh
npx wrangler pages deploy build/release-books/linguistics --project-name reader-linguistics
npx wrangler pages deploy build/release-books/deliberate-practice --project-name reader-deliberate-practice
npx wrangler pages deploy build/release-books/language-muscle --project-name reader-language-muscle
npx wrangler pages deploy build/release-books/academic-reading --project-name reader-academic-reading
npx wrangler pages deploy build/release-books/readability-foundations --project-name reader-readability
npx wrangler pages deploy build/release-books/academic-productivity --project-name reader-academic-productivity
npx wrangler pages deploy build/release-books/developing-competence --project-name reader-developing-competence
```

The deployed directory is each edition folder itself, so index.html, robots.txt, _headers, agent/, covers/ and embeds/ occupy the host root. The sidecar manifest stays outside the uploaded folder. Commands were prepared, not executed.

## Redirect handoff for website and old-host owners

Keep `/books/` as the catalogue. Redirect each old edition folder and its descendants to the corresponding new host, removing only the edition prefix. Include slashless entry addresses and preserve query strings. Keep section paths and `#/id` fragments unchanged; fragments are browser-side and need a browser acceptance check across redirects. Do not replace or edit author text to implement compatibility.

- `/books/academic-reading/` maps to `https://academicreading.dominiklukes.net/`.
- `/books/readability/` maps to `https://readability.dominiklukes.net/`.
- `/books/academic-productivity/` maps to `https://academicproductivity.dominiklukes.net/`.
- `/books/developing-competence/` maps to `https://developingcompetence.dominiklukes.net/`.
- `https://buildingyourlanguagemuscle.edutools.fyi/` and descendants map to the same paths at `https://buildingyourlanguagemuscle.dominiklukes.net/`.

These redirects belong to the parent website or old host, not to physical reader content. No redirect or catalogue file was edited here. Parent acceptance still includes live host attachment, HTTP headers, redirect query/fragment behaviour and root agent links after deployment.
