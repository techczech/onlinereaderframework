---
title: Release support for Academic Reading and Readability at dominiklukes.net/books/
date: 2026-10-28
register: FOR AGENTS
status: implemented and tested on an uncommitted working tree; independent security and write-path review owed; nothing built for release, imported, committed or deployed
ownership: released to parent
---

# Result

Reader release builds, verifies and records both converted books as folder editions:

- `academic-reading` → `https://dominiklukes.net/books/academic-reading/`
- `readability-foundations` → `https://dominiklukes.net/books/readability/`

The website has a guarded importer for those two exact folders and lists imported books in `robots.txt`, `sitemap.xml` and `llms.txt`. The three original editions keep their addresses and output. Every file other than two JavaScript chunks per book is byte-identical to a build from committed `3a40d62`. No public-site claim. No deployment.

Not done by design: no Git command, commit, push, release build into `build/release-books/`, import into the real `public/`, deploy, DNS, version bump, or full public source export. Existing `build/release-books/` editions from `8bd5f8f` are untouched.

# Parent commands (after committing both repos' owned files)

The reader tree must be clean apart from `build/`, `docs/`, `research/` and `.codex`. Otherwise manifests record `sourceTreeDirty: true` and both `verify:release` and the importer refuse.

```sh
# reader: apps/reader-demo
npm run build:release -- --book converted        # or --book all (five); --book originals (three)
npm run verify:release -- --book converted       # must print "<book>: PASS, deployable (tree <sha>, N files)"

# website: repository root
bun scripts/import-reader-books.ts --expect-tree academic-reading=<tree sha> --expect-tree readability-foundations=<tree sha>
bun run build
DLNET_SKIP_BUILD=1 bun test tests/reader-books.test.ts tests/agent-layer.test.ts tests/dead-links.test.ts
```

The importer reruns the reader's `verify:release`. Its default reader path is `../../05_publications/onlinereaderframework`; `--reader` overrides it, and `--book <id>` imports one book. Commit `public/books/academic-reading/`, `public/books/readability/`, `public/_headers` and `src/content/reader-books.json`.

After a preview deploy, observe live headers. Emulation is not delivery:
- `/books/<f>/` should carry the reader CSP, `frame-ancestors 'none'` and `X-Frame-Options: DENY`.
- `/books/<f>/embeds/<book>/<id>/` should carry `Content-Security-Policy: sandbox allow-scripts; …connect-src 'none'…frame-ancestors 'self'` and no `X-Frame-Options`.
- The preview should also carry `X-Robots-Tag: noindex`.

# Changes

## Reader core seam (review)

- `packages/reader-core/src/embed/embed-model.ts` adds optional `PublicationEmbeds.base`, an absolute edition folder. Validation: `/` or ≤ 8 safe segments, refused as a whole like `root`. `resolvePublicationEmbedUrl(path, root, pageURL, editionBase?)` takes the origin only from `pageURL` (`window.location.href`) and resolves `root` below `base`. `document.baseURI` is still never used. An undefined base gives the previous behaviour.
- `PublicationEmbedFrame.tsx` passes `embed.base`.
- `embed.test.mjs` adds one test: five edition addresses, origin from page, and 11 refused bases.
- The embed contract documents the field.

## Reader release (review: write path, isolation)

- `src/canonical-sites.ts` adds only the two agreed URLs. The three originals are unchanged.
- `scripts/release/release-books.ts` is the release registry: three originals plus the two converted books from `demo-books.ts`, using the same canonical objects (Readability is unversioned CC BY). It provides `editionBase(site)` (lowercase folders only) and CLI choices `<id>|originals|converted|all`.
- `scripts/release/edition-assets.ts` plans a converted book's pinned cover (`converted-book-assets.json`, decision "3 and 2") and its embeds.
  - Each embed must hash-match `next-books-provenance.json` outputs.
  - The embed manifest must equal the demo registry's descriptors.
  - `checkPublicationEmbeds` must pass.
  - Every read goes through a lstat chain from the app root with O_NOFOLLOW and fstat.
- `edition-plan.ts`:
  - Sets `base` and refuses a converted book at `/` and an original in a folder.
  - Projects the cover to `<base>covers/<id>.jpg` (`projection.ts`).
  - Writes no `robots.txt` in a folder edition.
  - Scopes `_headers` to the folder via `securityHeaders({ base, embedRoot })`. Output with no options is byte-identical to v1.
- `release-plugin.ts` adds two swapped modules: `src/release-embeds.ts` (this book's descriptors with `base`, `{}` for originals) and `src/book-identities.ts` (this book's appearance entry only). It still refuses a bundle unless every swap happened.
- `build-edition.ts`: `releaseViteConfig(plan)` sets Vite `base: plan.base`, and the tests build with the same config. The manifest gains `edition {base, cover, embeds[source, sha256, bytes]}` for converted books only. Staging, swap, manifest-last, rollback and write-guard are unchanged.
- `src/main.tsx` and `src/release-routes.ts`: `releaseLocation(…, base)` reads routes below `import.meta.env.BASE_URL`, turns `<base><section>/` (with or without a final slash) into `<base>?section=`, and turns the slash-less edition address into `<base>`. Paths outside the folder are ignored. Domain-root behaviour is unchanged (tested).
- `src/App.tsx` reads `releaseEmbeds` and `bookIdentities`. The demo is unchanged.

## Verifier (`verify-edition.ts`, `verify-existing-edition.ts`)

- **False positive fixed.**
  - Another book's section id made only of letters (`accessibility`) is probed only as an identifier: `id`/`sectionId` values with optionally escaped quotes, `?section=`/`&section=`, `#/`, `chapters/<id>.md`, or a route folder under the other book's address.
  - Every other long id is probed as a whole token, not inside a longer slug. Readability's `cognitive-load` had matched Academic's heading anchor `reader-content-cognitive-load-model`, the same class of error.
  - No ids were renamed. The demo test's renaming workaround is removed.
- **Added probes:** other books' cover file and embed titles/folders. A folder address is now probed as host plus folder, so the two books on one host are told apart and `dominiklukes.net` in Linguistics prose is not flagged.
- **Unchanged probes:** titles, descriptions, 40 text samples with own-bundle control, source hosts, private paths, Notion icon, demo chooser, source maps.
- **Folder checks:**
  - every page loads `<base>assets/*.js`;
  - no root-relative `src`/`href` outside the folder in pages;
  - no stylesheet `url(/…)` outside the folder;
  - no `"/covers|assets|agent|embeds|media/` in the bundle;
  - the cover is at `<base>covers/`;
  - no `robots.txt`;
  - every `_headers` rule starts with `base`.
- **Embed checks:**
  - exactly the planned `embeds/<own>/…` files;
  - each self-contained: no outside src, link, `@import` or `url()`, no fetch, XHR, WebSocket, EventSource, beacon, worker or `window.open`, no form, base or refresh;
  - the exact sandbox rule is present;
  - descriptors and `base` are in the bundle.
- `verify-existing-edition` also requires the manifest's `edition` record to equal the current plan. Both CLIs use the five-book registry, and `others` now always covers all four other books.

## Source export guard

`scripts/prepare-reader-source-release.mjs` builds manuscript exclusion anchors from all five manuscripts (`MANUSCRIPT_INPUTS`) and records their hashes in evidence. The self-test asserts that a span of each book is refused. Manuscripts remain outside the allowlist. A full export was not run, because it would rewrite the local candidate.

## Website (`dlnet`)

- `scripts/import-reader-books.ts` handles exactly two destinations, `public/books/academic-reading` and `public/books/readability`. It refuses before any change:
  - the reader `verify:release` failing;
  - a manifest with the wrong schema, book, site, folder or `edition.base`;
  - `sourceTreeDirty`, recorded failures, or no 40-hex source head;
  - a mismatched `--expect-tree`;
  - an unsafe, absolute, traversing or case-duplicate path;
  - an unexpected top-level file such as `robots.txt`;
  - missing required files;
  - a file list that does not reproduce the tree hash;
  - disk contents that differ from the list;
  - any symbolic link or special file in the reader edition or chain, `public`, `public/books`, the destination, `public/_headers` or `src/content`;
  - header rules outside the folder, unexpected headers, comments, any detach outside the embed rule (including `X-Robots-Tag`), or an embed rule that lacks the sandbox or allows same origin;
  - unbalanced markers in the site `_headers`.
- Write order:
  1. Stage and re-hash under `.reader-books-import/`. The edition `_headers` is never copied.
  2. Move previous folders aside, move staged folders in, and re-hash.
  3. Write `public/_headers` with the marked block per book; every other byte is kept.
  4. Write `src/content/reader-books.json` last.
- Any failure after the first move restores folders, `_headers` and the record. The previous folders are deleted only after commit, and the record keeps the replaced tree hash.
- `src/lib/reader-books.ts` and `src/content/reader-books.json` hold the import record, initially empty, which only an import fills. They validate folder and URL.
- `robots.txt` adds `Sitemap:` per imported book. `sitemap.xml` adds each book address. `llms.txt` adds `## Books`, linking each book's `llms.txt`, address and full text. None of these change while no book is imported.
- `tests/agent-layer.test.ts` keeps `books/` out of site-page checks (the editions are checked separately) and adds imported book addresses to its expected sitemap and llms counts.
- `tests/reader-books.test.ts`: see Evidence.
- `.gitignore` adds `.reader-books-import/` and `.reader-books-test-*/`.
- No main-site page gains a CSP or frame header. The Pages-preview `X-Robots-Tag: noindex` rules are untouched. Book pages say `index, follow`.

Untouched as instructed: `src/content/guides.json`, the two cover assets (Sonnet), `docs/plans/site-rebuild/screens/preview-pass/`, original guide repositories, Folios, domains and Cloud Run services.

# Evidence (all in `evidence/`; exits are the commands' own)

| Check | Result |
|---|---|
| Reader `npm run build` | exit 0; 335 agent files |
| Reader `npm test` | exit 0. Suites: 23/23, 26/26, embed 8/8, 96/96, demo-books 19/19, release 26/26 (8 new) |
| Embed unit tests | base test passes; the old resolver ignored `base` |
| Source export `--self-test` | exit 0, with the new five-book anchor assertions |
| Anchor pre-scan | `packages/reader-core` and `scripts/templates`: 1035 new-book anchors, 158 files, 0 hits |
| Five editions from the working tree (`working-tree-editions.json`) | all built and passed the new verifier; identical tree hashes on two separate runs (deterministic) |
| Converted editions | Academic 147 files, tree `a185201757de…`; Readability 158 files, tree `bc727d5ef93c…` |
| Originals vs committed `3a40d62` (`compare-original-editions.json`) | exit 0. All non-bundle files identical, or pages differing only in hashed bundle names (Linguistics 538 + 525; Deliberate Practice 31 + 22; Language Muscle 21 + 13). 113/115 bundle files identical; only two JS chunks per book differ |
| Verifier red/green (`verifier-false-positive.json`) | committed verifier with five books: 9 failures, 5 shown for `accessibility` in Linguistics prose. New verifier: 0. Planted `{id:"accessibility"}` is reported |
| Release red cases (`test-release-books.ts`) | 15 tamperings of a real Academic edition, each reported: other book's id, route, embed folder, cover; missing, extra, outside-loading and fetching embeds; unscoped headers; missing embed rule; root addresses in bundle and page; robots; demo UI; private path |
| Release hostile assets | embed byte change, cover change, leaf and folder symlinks, manifest traversal, manifest drift, six unsafe paths. Write path into a fake repo, then `verifyExistingEdition` passes |
| Website importer tests | 33/33, exit 0. Three sound imports (both, re-import, single book). 22 refusals (including an injected failure after staging) with the host snapshot unchanged and no staging left. 5 late failures (`after-first-move`, `after-all-moves`, `before-record`, `after-record`, first-import `before-record`) restore the previous site byte for byte. Headers unit tests |
| Website typecheck (importer, test, lib) | exit 0 |
| Scratch rehearsal: import of working-tree editions into a copy of the website, then build | import exit 0; site build exit 0; `_headers` diff is additions only |
| Scratch rehearsal tests | agent-layer 1035/1035, dead-links 1/1, reader-books 33/33 (built-site part with books imported), guides 6/6, record-pages 19/19, exports 9/9 |
| Browser (`browser-subpath.json`, chrome-headless-shell from the Playwright cache, emulated Pages serving and `_headers`) | 72/72; details below |

Browser probe details:
- main-site paths carry no book CSP or frame header;
- an unknown book path gets a 404 with the book's own page;
- the reader page carries its own CSP and is not frameable;
- `llms.txt`, agent index and full text, and sitemap all point at canonical folder links;
- there is no `robots.txt` in the folder;
- the slash-less edition address opens the edition;
- the cover and web fonts load from the folder;
- all five embed chapters, opened at static addresses with and without the final slash, rewrite to `<base>?section=`;
- frame count matches, every frame is in `<base>embeds/<book>/` with `sandbox="allow-scripts"`, and the full-view link equals the frame source;
- every frame loads with origin `null`, and storage, cookie, parent DOM and fetch are all blocked;
- embeds are served with the sandbox CSP and no frame ban;
- query and hash addresses work, and in-reader navigation, reload and back stay in the folder;
- agent links stay in the folder;
- full view has origin `null`, and storage, network and popup are all blocked;
- no console or page errors, no failed requests, and no off-site requests.

Rehearsal honesty: the rehearsal editions come from an uncommitted tree. In scratch only, their manifest copies were marked clean, the reader verifier was stubbed, and the committed `guides.json` was used. Sonnet's in-progress `guides.json`, copied once, failed the website build ("Search item Foundations of Readability … has no record page"). That file is outside this task. The rehearsal is not deployability evidence.

Changed and new file SHA-256 values are in `evidence/hashes-reader.txt` (25 files) and `evidence/hashes-website.txt` (9 files).

# Independent review owed (security and write path, until clean)

1. The core `base` seam: `embed-model.ts` (`basePathProblem`, `resolvePublicationEmbedUrl`) and `PublicationEmbedFrame.tsx`.
2. The release isolation swaps: `release-plugin.ts` (5 swaps), `src/release-embeds.ts`, `src/book-identities.ts`, `App.tsx`, `main.tsx`, `release-routes.ts`.
3. The asset read path: `edition-assets.ts` and `converted-book-assets.json`.
4. The plan and headers: `edition-plan.ts`, `headers.ts`, `projection.ts`, `build-edition.ts`, and the manifest `edition` record.
5. The verifier changes: whether token or structural id probes plus the new probes are no weaker for real leaks (`verify-edition.ts`).
6. The website importer write path, rollback and header merge: `scripts/import-reader-books.ts`.
7. The website endpoints and record validation: `src/lib/reader-books.ts`, `robots.txt.ts`, `sitemap.xml.ts`, `llms.txt.ts`.

# Limits

- Cloudflare `_headers` delivery is emulated, not observed. The emulation applies rules in file order, detach before set within a rule, which is the documented detach behaviour. Combined detach and set in one rule at a nested path needs the preview observation above.
- Cloudflare redirects `…/index.html` to `…/`; embed rules still match the folder form.
- Full-view embeds: CSP sandbox blocks storage, network, forms and popups. A top-level self-navigation and DNS prefetch are not governed by CSP. The embed has no stored data to send.
- Checks happen before reads (lstat chain, then O_NOFOLLOW leaf). Ancestor replacement between check and open is not proven safe, in the reader or the importer: no TOCTOU claim. The two directory renames are not crash-atomic, and recovery folders may remain after a crash.
- The original editions' JavaScript changes:
  - The release embed table is empty for originals.
  - The appearance table now carries only the book's own entry. Other originals' cover paths and colours no longer ship in each original bundle; lookup is by own id, so there is no behaviour change.
  - `releaseLocation` receives `BASE_URL`, which is `/` for originals.
- A hyphenated id is no longer found inside a longer slug, which is a narrowing. Single-word ids are found only in identifier positions.
- No real device, screen reader, real speech, Firefox or Safari, or live-site acceptance.
- One neutral placeholder photo remains, a known author-preview item. No licence is granted or changed: Academic carries none, and Readability carries unversioned CC BY. MIT covers software only. `sourceUrl` stays as provenance.
- Old guide domains, redirects (`academicreading.edutools.fyi` after publication) and Cloud Run services are untouched. Website guide records and covers are Sonnet's work.
- The edition `llms.txt` "Read in the browser" link carries `?book=<id>`, which the release strips on load. This is pre-existing generator behaviour.
- The importer deletes replaced book folders after commit; the record keeps the replaced tree hash, and host Git history is the archive once committed.
