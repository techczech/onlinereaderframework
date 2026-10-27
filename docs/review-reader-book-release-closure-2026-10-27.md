---
title: Independent closure review of the three reader book releases
reviewed: 2026-10-27
reviewer: Codex, GPT-6.1 Sol
register: FOR DOMINIK
status: changes-required
scope: Book release security, write path, preservation and publication notices
source_head: 24ff25434457928cacdfedc8f91645d58c2615c0
---

# Independent closure review of the three book releases

- **The release path is not clean:** two reproducible security/write-path defects remain, and Linguistics has one publication-notice gap.
- **The current editions remain blocked.** Their manifests record uncommitted source, and the actual deploy verifier refuses all three with exit 1.
- **The other original repairs hold.** The focused suite passes all 14 tests; independent fixture probes and audits confirm the symlink guards, literal dollar patterns, section identifiers, module replacements, output hashes and retained files.

This review answers `docs/review-reader-book-release-2026-10-27.md`, `docs/result-reader-release-builds-2026-10-27.md` and the complete `docs/repair-reader-book-release-2026-10-27.md`, using the repaired source and current editions. I did not write the implementation. I changed only this report and the new `docs/evidence-review-reader-book-release-closure-2026-10-27/` evidence folder. The existing release tests also created their usual temporary build fixtures and removed them. No production changes, Git mutation, credentials, external writes, deployment, agents, browser, GUI, speech or screenshots were used. The unfinished source exporter, templates, software licence and root/core manifests are excluded from review; manifest path names were checked only for source-state coverage.

## Unresolved standards findings

### 1. P2 — Static licence links bypass the reader's URL safety boundary

**Source:** `apps/reader-demo/scripts/release/static-pages.ts:35`, consumed by the root, section and standalone pages at lines 41, 60 and 114. `verify-edition.ts:44–47` compares planned bytes, and `verify-existing-edition.ts:60–64` repeats that check, so both accept the unsafe generator output.

A book's `home.license.href` is HTML-escaped but has no URL-scheme check. In an owned two-section fixture, setting it to `javascript:alert(1)` produces:

```html
<a href="javascript:alert(1)">Unsafe fixture licence</a>
```

The real Vite build succeeds; the library deploy verifier returns `ok: true`, with no failures. By contrast, the reader's existing `safePublicationHref` rejects that same value (`packages/reader-core/src/original/publication-model.ts:78–84`), and its home footer applies that guard (`frontpage/layouts.tsx:127–129`). The ordinary section-body sanitiser also removes the fixture's script, event handler and script URL. This is specifically a metadata-to-static-HTML bypass.

**Boundary and current impact:** the source is locally supplied publication metadata, not a demonstrated remote input. None of the three current editions contains this unsafe link. A correctly enforced `script-src 'self'` policy mitigates execution; that does not make the generated link safe, and host enforcement is outside this review. The release generator violates the existing reader boundary and its claim to emit only markup the reader accepts.

**Required repair:** apply the established safe-publication-URL rule before rendering the licence anchor, and make this fixture fail closed or omit the rejected link. This needs no new policy or editorial choice.

**Reproduction:** from the repository root, run `apps/reader-demo/node_modules/.bin/tsx docs/evidence-review-reader-book-release-closure-2026-10-27/probe-closure.mts`. The recorded run exits **1**; its `unsafe-link` assertion fails after both build and verification accept the link. Evidence: `unsafe-link-result.json`, `probe-results.json` and `probe-closure.log`. The optional selector `unsafe-link` runs that case alone.

### 2. P2 — A late manifest failure deletes the previous edition; the directory promotion is not atomic

**Source:** `apps/reader-demo/scripts/release/build-edition.ts:108–116` and `129–133`.

The previous edition is deleted at line 116, before the temporary manifest is written and renamed. I built a valid fixture, changed its title, then injected an `EACCES`-shaped error only at the final manifest rename. The build rejects, there is no published manifest, the replacement edition occupies the canonical folder, and there is **no previous edition left under the release root**. The old tree hash is `1555c6a2fed75e286b8dafa56969c21816805d032fdc4e5a550822fbd2ec6150`; the failed run leaves `8a652b740b8e4eefc0b69fc02e8f1dd8050b331cf19de213b3bbcf52fe97b24e` instead. The injected failure changes no implementation file.

This leaves the original failure-preservation finding **partially open**. Real Vite failures and verification failures before promotion now retain the old edition and invalidate its manifest, as required. Failure while publishing the manifest does not retain it. The missing manifest still makes the deploy gate refuse the folder; I found no fail-open deployment in this case.

The promotion itself uses two renames: old edition to `.previous-…`, then staging to the edition path. Immediately before the second rename, the canonical edition directory is absent. An ordinary thrown error there restores the old directory, which the probe confirms. Process termination between the renames has no such rollback. **Each rename is atomic; their combined replacement is not.** This is a local build/recovery limitation, not evidence of an outage on a deployed site. The repair receipt describes the two operations accurately; this review does not upgrade that description into a crash-atomic guarantee.

**Required repair:** keep the old edition until manifest publication succeeds and cover later failures with recovery. Preserve the fail-closed manifest behaviour. Any claim of atomic promotion must match the actual two-rename implementation or a revised implementation.

**Reproduction:** the same `probe-closure.mts` command exits **1** with failing `manifest-failure` and `promotion-gap` assertions. Their selectors run either case alone. Evidence: `manifest-failure-result.json`, `promotion-gap-result.json` and `probe-closure.log`. The successful `manifest-gates` case and separate `build-failure.log` show that earlier verifier and real Vite/module-hook failures retain the old edition.

## Unresolved specification finding

### 3. P2 — The Linguistics home page does not expose its book-wide licence and reuse notice

**Source:** `apps/reader-demo/scripts/release/static-pages.ts:35–41`; the preserved notice is emitted separately by `edition-plan.ts:53`. The Linguistics adapter begins at `apps/reader-demo/src/books/original-publications.json:289` and has no `home.license`. The selected reader home footer also renders its licence only when that field exists (`packages/reader-core/src/original/frontpage/layouts.tsx:125–130`).

The shipped Linguistics root contains neither a book licence link nor a link to `/about/`. The preserved about page contains the book's CC BY-SA 4.0 grant, attribution condition and explicit AI-training permission (`build/release-books/linguistics/about/index.html:18`). Its bytes exist, but the root offers no route to that book-wide notice. The linked agent index and manifest likewise have no book-level licence field. Per-answer credits are present and do not replace the distinct book-wide notice.

This fails the requested requirement that the root book licence, training permission and source attribution remain accessible. **The framework's MIT licence is not evidence of book rights.** No manuscript edit or new licence choice is needed to expose the already authorised notice.

**Required repair:** expose the existing book-wide notice from the Linguistics home page, using the preserved author text and its existing licence. Retain the answer-level credits.

**Reproduction:** `python3 -I docs/evidence-review-reader-book-release-closure-2026-10-27/audit-preservation.py --assert-root-notice` exits **1**, with the assertion that the root exposes neither its licence nor a link to the preserved notice. Evidence: `root-notice-contract.log` and `audit-preservation.json`.

## Original findings and clean checks

**Original finding 1, symlinks: closed within the original threat model.** Real build calls refuse symlinked `build/`, release root, edition and manifest paths before the old manifest is removed. A dangling manifest symlink is also refused. Outside sentinels remain unchanged; an invalid section identifier likewise refuses before mutation. The original single-user, no-concurrent-symlink-swap boundary remains in force. Nested symlinks in an existing edition are refused by the deploy/hash check; replacing the whole old directory does not follow those links.

**Original finding 2, dollar replacement patterns: closed.** The callback replacements preserve `$&`, `$'`, the dollar/backtick pattern, `$$`, `$1` and `$<named>` in real fixture pages, title and description. Six additional missing/duplicate template variants are refused (`render-guards.log`). Current generated bodies match their projected plan, and no build marker remains.

**Original finding 3, failed builds: partially open**, for the late failure in standards finding 2. Earlier failure handling now passes both a real Vite failure and an artefact-verification failure.

**Original finding 4, identifiers and collisions: closed.** Every real identifier passes. New variants include nested unsafe identifiers, duplicate/case collisions, Unicode, every reserved name, reversed file/folder collisions, backslashes and empty path components. The guards refuse these before output mutation. No outside sentinel changes were observed.

**Original finding 5, Notion icon: closed for book outputs.** No original icon URL, identifying bytes or filename appears in any edition. Deliberate Practice's static text, agent text, public asset and bundled EPUB image table use the new decorative terminal SVG. Its SHA-256 is `beef4f875e65767e78a27ee8101418b754811bf01708113f474d91c8d9d3429f`, matching its source and provenance record. The unrelated authored Notion page hyperlink remains and loads no image. The canonical manuscript JSON remains unchanged; the projection applies only to release output. The software licence grant itself is excluded from this review.

**Original finding 6, retained addresses: implemented.** All 535 old Linguistics paths outside obsolete `assets/` and `pagefind/` exist. All 262 old answer/section Markdown paths equal their new agent chapter bytes; `llms-full.txt` equals `full.md`. About, download and 404 main texts are verbatim. The old EPUB and PDF are byte-identical, with SHA-256 `bc62337f7d8e96e9003bbfa12c3911db0a335d0edb25e400a3779473229fa588` and `90e831f18ffd9627f7c9a4bea3f46b51aeab45f8eda797b7df76edd77d32e585`. Specification finding 3 concerns access to the notice, not a missing preserved file.

**Original finding 7, module-hook failure: closed.** Loading only zero, one or two of the three required modules makes `generateBundle` throw. A real minimal Vite fixture that loads none fails its build while retaining the old edition and removing its manifest. Successful builds exercise all three replacements. The independent output audit found no other book's title, description, address or manuscript text sample.

**Original finding 8, dirty source coverage: closed for the listed build inputs.** `build-edition.ts:36–40` checks the whole repository with the documented exclusions. Eleven existing input paths—including the HTML entry, cover, Tailwind/PostCSS/Vite configuration, package/lockfile paths and old-site pin—are enumerated by Git and not ignored. This check inspects path inclusion, not the other worker's unfinished manifest contents. Current manifests retain `sourceTreeDirty: true`; their refusal is mandatory and has not been waived.

The owned-fixture verifier also refuses forced check failures, missing failure arrays, old schema, dirty or null source flags, wrong tree hash/totals, changed JavaScript bytes, added files and nested symlinks. Passing fixture manifests use explicitly synthetic source provenance only to exercise the library checks; they do not make a claim about the real editions.

## Preserved copy, rights and archives

**All 253 Linguistics answers retain the original answer link, matching licence URL, question-author credit and Markdown notice.** The answer-level notices match the old answer-specific licence paragraphs: 243 use CC BY-SA 3.0 and 10 use CC BY-SA 4.0. Editor credits are retained where present. Therefore the copied sentence “Each answer page shows the licence the answer carries on Stack Exchange” is supported, despite the absent home licence field. I do not report it as misleading.

The old about page's “First edition, 2026” and AI-assisted question-summary/copy-edit statements are preserved historical production claims. The new page does not label that text as archival; however, the date alone does not contradict this year's new reader. The new answers retain question titles and attribution rather than reproducing the previous site's separate question-summary presentation. I have not treated the historical AI statement as proof that the new release generated summaries, or invented a new requirement to rewrite the authorised copy. The download page points to the actual unchanged former EPUB/PDF. No additional material false claim was established beyond the home-page notice gap above.

All three local archive hashes match their archive manifest. Reading the Linguistics tar archive without extracting it confirms all **820** former static-site files are present and byte-identical. The two original app source archives remain present. The local archive manifest records that the original Cloud Run services are retained separately; their live state was not queried under the no-external-access boundary.

## Security headers and public-output boundary

All three `_headers` files have syntactically consistent `/*` and `/assets/*` blocks, valid header fields, `nosniff`, frame denial, the recorded referrer and permissions policies, and the same 11 CSP directives as `scripts/release/headers.ts:9–22`. The policy contains no inline/eval script allowance, denies objects, base elements and framing, and limits script loading to the edition's origin. This is a source/file syntax review only. Host header application and CSP behaviour in the reader, quote card, EPUB download and listening controls remain for the later Terra preview check.

The independent audit reports no unsafe HTML, unexpected scripts, invalid JSON-LD, route failure, broken same-site link or projected-body mismatch in the current editions. Raw cross-book identifier matches were ordinary words, library identifiers or existing source-URL fragments; none was another book's title, description, canonical address or text sample. Raw privacy matches were public `/home/…` URL paths and the library's `localhost` URL-parser pattern. These are retained in `audit-editions.json`, rather than hidden as an unexplained clean result. The copied repair audit confirms the retained binary downloads and icon by hash; it does not revalidate the EPUB/PDF content or clear font/cover rights.

## Commands, evidence and immutable scope

Commands ran from the repository root. Logs and scripts are in `docs/evidence-review-reader-book-release-closure-2026-10-27/`:

- `npm run test:release --prefix apps/reader-demo` exits **0**, with 14 passing tests (`release-tests.log`). No full root test/build loop ran.
- `python3 -I docs/evidence-review-reader-book-release-closure-2026-10-27/audit-repaired-editions.py` exits **0** (`copy-audit.log`, `audit-repaired-editions.json`). This is a copy; the earlier audit and results were not overwritten.
- `apps/reader-demo/node_modules/.bin/tsx docs/evidence-review-reader-book-release-closure-2026-10-27/audit-editions.ts` exits **0** (`boundary-audit.log`, `audit-editions.json`). This copy uses the authorised icon projection and allows the deliberately canonical-free 404 page; its raw identifier/privacy matches require the classifications above.
- `apps/reader-demo/node_modules/.bin/tsx docs/evidence-review-reader-book-release-closure-2026-10-27/probe-closure.mts` exits **1**, reproducing the three failing standards assertions described above. The separate `build-failure` selector exits **0** (`build-failure.log`). All owned scratch is removed in `finally`.
- `python3 -I docs/evidence-review-reader-book-release-closure-2026-10-27/audit-preservation.py` exits **0**; adding `--assert-root-notice` exits **1** (`preservation-audit.log`, `root-notice-contract.log`).
- `npm run verify:release --prefix apps/reader-demo -- --book all` exits **1**. Each current edition fails solely because it was built from uncommitted source (`current-deploy-gate.log`).

The three current edition tree hashes remain Linguistics `3ad8f09070e6ed9714d145f43ce6be7796e58f4310567798876db1ca85a05927`, Deliberate Practice `2d17271143ab06f13670ea08d4d57e8d648475c69776de4fbe2880c0b2981758`, and Language Muscle `43dc0d7ec66941f56ac76792fe775300e61c2db3b2c3c950d717813232c1cc60`.

`input-hashes-before.json` and `input-hashes-after.json` pin **1,688 files**, including the reviewed source, original reviews/evidence, manifests and current edition bytes. There were no changes, removals or additions in the pinned directories, and HEAD remained `24ff25434457928cacdfedc8f91645d58c2615c0`. No review or release-test scratch remains. Key reviewed source hashes are:

- `build-edition.ts`: `16c444b30bd5cdb8e66f613fd2d0e405b2b8c2dfebd0943e1a6a44f9cfa99e79`.
- `write-guard.ts`: `ffe95bf46cdf62432e7cb6b83e04945a082862819230a6f5ef443a6e1d0e425b`.
- `static-pages.ts`: `ab24631486d089e8945781ccbce464e90914c40f54105b642c7b3b9deab6db73`.
- `verify-existing-edition.ts`: `8678d34820eb47f68e21b0b5b6daaaa482def05cf37970cd451441173ad9feae`.
- Canonical manuscript JSON: `4c436964111d88112d799a9e05adb359772b1f3824effad649399f0df6e82b84`.

The next implementation round must repair the three findings and receive a fresh security/write-path re-review. The parent commit, rebuild and successful deploy gate remain required afterwards. Nothing in this review authorises bypassing that gate or substitutes for the later live preview check. No new editorial decision is requested from Dominik.
