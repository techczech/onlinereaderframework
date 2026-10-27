# Review: single-book release builds (2026-10-27)

Independent security and write-path review of the release build for the three books (Linguistics, Deliberate Practice, Language Muscle), as described in `docs/result-reader-release-builds-2026-10-27.md`. Source at HEAD `24ff254` plus the uncommitted release files. Reviewer: Claude Opus 5.5, review seat. No production code changed, nothing deployed, no Git operations, no browser or screen run. Scope excluded: the source exporter, templates and licence files that another worker owns, the website repository, and editorial choices about the books.

## Verdict

**The three folders in `build/release-books/` are clean on the privacy boundary.** Each carries one book only, has no local paths or source maps, ships safe HTML, and matches its manifest byte for byte. Two decisions are still open before they are published: the Notion icon in Deliberate Practice, which ships in more places than the builder's note says, and the old Linguistics addresses that the new edition drops.

**The build script is not yet safe to reuse as the release path.** I found four defects (findings 1–4). None affects today's three folders, because today's content and folder layout do not trigger them, but each one is cheap to trigger. The builder's receipt plans a rebuild after the commit to get a clean-source hash, so fixes 1–4 should land before that rebuild. The build writes files, so the fix round needs a re-review.

## Findings, most severe first

### 1. The folder guard checks only the path text; a symlink lets Vite empty a folder outside the build tree (write path, high, latent)

`apps/reader-demo/scripts/build-release.ts:42-43` checks that `outDir` *as written* starts with `build/release-books/`. Line 49 then runs Vite with `emptyOutDir: true`. Vite's `emptyDir` (`node_modules/vite/dist/node/chunks/config.js:2148-2170`) reads the folder through any symlink and deletes everything in it except `.git`.

- **Reproduced in scratch.** I made `release-books/linguistics` a symlink to a folder holding `keep-me.txt`. The lexical guard passed, the build ran, `keep-me.txt` was deleted and the build was written into the target folder. When `release-books` itself was the symlink, the same thing happened one level up. Evidence: `hostile-builds.json`, first two cases.
- **Current state:** `build/`, `build/release-books/` and the three edition folders are real folders, not symlinks (`audit-editions.json` → `releaseRootChain`).
- **Fix:** before each build, `lstat` every component from the repository's `build/` down to the edition folder and refuse any symlink. Also require `realpath(build/release-books)` to equal `realpath(repo)/build/release-books`. The physical guard in `hostile-builds.mts` (`physicalGuard`) shows the check: it refused both symlink cases that the lexical guard let through. The manifest write at line 57 needs the same guard.

### 2. A `$` in book text corrupts the published page (content integrity, high, latent)

`apps/reader-demo/scripts/release/release-plugin.ts:47-49` inserts the page title, head tags and page body with `String.prototype.replace(string, string)`. In the replacement string, `$&`, `` $` ``, `$'` and `$$` are special patterns. Any section text, title or description that contains one of them is spliced with pieces of the template.

- **Reproduced in scratch.** A section whose text was ``Price: $& and $' and $` and $$ end.`` produced a page with 8 `<html>` and 8 `<head>` elements, the `<!--ORF_BODY-->` marker left in the body, and a title cut off by the module script tag. The verifier passed this page; its only failure was the missing cover image, which is expected in scratch. Evidence: `hostile-builds.json` → "dollar replacement patterns".
- **Current state:** no page in the three real books contains these patterns. All 560 generated pages (298 section and root pages, 262 Linguistics alias pages) appear verbatim in the shipped files (`pagesBodyNotVerbatim: []` for all three). The next manuscript edit that adds, say, `$'` would break the page silently.
- **Fix:** use a replacer function (`.replace(marker, () => value)`) or `split(marker).join(value)` at lines 48 and 49. Then add three checks to `verify-edition.ts`: no `<!--ORF_` marker left in any file, exactly one `<html>`, `<head>` and `<title>` per page, and each page's body is the generator's output verbatim. The last check is the one `audit-editions.ts` already runs.

### 3. A failed build leaves an emptied or partial folder next to the previous run's manifest (write path, medium)

Vite empties the edition folder at the start of the build (`build-release.ts:49`). The manifest is written only at the end (line 57). If the build throws, the old manifest stays at its fixed path and describes files that no longer exist. Examples of a throw are a bad file name, a missing marker, or two pages with the same address. If the verifier reports failures, the script still writes the manifest, sets exit code 1 and leaves the folder looking deployable (lines 57-64).

- **Reproduced in scratch:** in every failing case the previous edition was gone and the previous manifest remained (`previousEditionRemains: false`, `staleManifestRemains: true`). Section ids `index.html` and `llms.txt` left 11 files of a partial edition. In one run, files were still being written into scratch after the build promise had rejected and the folder had been removed. Vite's writes run in parallel and do not stop at the first error.
- **Fix:** delete `<book>.manifest.json` before building. Build into a fresh staging folder under `build/release-books/`, created with the guard from finding 1, and rename it into place only after the verifier passes. Write the manifest last. The deploy step should hash the folder again, compare it with the manifest, and refuse if `checks.failures` is not empty or `sourceTreeDirty` is true.

### 4. Section ids are not validated before they become file names (write path, medium, latent)

Section ids become folder names through `encodeURIComponent` (`apps/reader-demo/src/release-routes.ts:12`, `25`; `static-pages.ts:61`, `68`). `encodeURIComponent` leaves `.` and `..` unchanged. Results from scratch builds (`hostile-builds.json`):

| Section id | Result |
| --- | --- |
| `..`, `.`, empty | Rollup refuses the file name, but only after Vite has emptied the folder (see finding 3). This guard comes from Rollup 4.64.7 (`isPathFragment`, `validateOutputBundleFileNames`), not from this code. |
| `theme-..` (Linguistics) | Its old-site alias becomes `sections/../index.html`. Rollup normalises that to `index.html`, so **the home page is overwritten by a `noindex` redirect page**. The verifier catches this. |
| `theme-.` | Writes `sections/index.html`. Nothing reports it. |
| `CaseA` and `casea` | The second page overwrites the first on the Mac's case-insensitive disk. The verifier catches this. |
| `index.html`, `llms.txt` | The page path collides with a fixed file. The build fails with EISDIR and leaves a partial folder. |
| `agent` | Builds. The verifier gives a misleading failure ("agent folder holds another book"). |
| `a/../../escape`, `%2e%2e` | Safely encoded; no escape. |

No file was written outside the edition folder in any case. Every real id passes `^[a-z0-9][a-z0-9-]{0,99}$`, is unique ignoring case and avoids reserved names (`audit-editions.json` → `sectionIds`).

- **Fix:** before building, refuse any id that does not match `^[a-z0-9][a-z0-9-]{0,99}$`, any id that equals a reserved top-level name (`agent`, `assets`, `covers`, `answers`, `sections`, `index.html`, `llms.txt`, `robots.txt`, `sitemap.xml`), and any two ids that differ only in case. Also assert that page paths and alias paths are unique and do not overlap.

### 5. The Notion icon ships in Deliberate Practice's public JavaScript and is hotlinked from its pages (publication decision, medium)

The builder reports that the EPUB embeds `command-line_gray.svg`. In fact the asset reaches the public in three ways (`audit-editions.json` → `notionIconFiles`; check in this review):

- **The icon file itself** (317 bytes, SHA-256 `414543d9…f862`, the same file as `apps/reader-demo/src/books/assets/command-line_gray.svg`) is inside `build/release-books/deliberate-practice/assets/index-Bb9VDwAt.js`. `App.tsx:3` imports it as raw text for the EPUB (lines 53-57). Anyone can download it from the live site, without generating an EPUB.
- **The manuscript text** of two sections, `limitations-working-memory` and `reviews-coaching`, contains `<img src="https://www.notion.so/icons/command-line_gray.svg">`. The static pages, the reader and the agent Markdown files (`chapters/*.md`, `full.md`) therefore load the image from notion.so whenever those sections are viewed. The `alt` text is the URL itself.
- The other two editions contain no part of the icon.

The provenance file says redistribution rights are not established. **Before publishing**, the icon file must go: either drop the raw import and its EPUB asset, or replace it with an icon you have rights to. Whether the manuscript keeps the notion.so link is an editorial choice for you; the link is not redistribution, but it does make visitors' browsers request a file from Notion.

### 6. Old Linguistics addresses that the new edition drops (publication decision, medium)

I compared the new edition with the old site's build, read-only (`../linguistics-stack-exchange-answers/dist`, 820 files; `audit-editions.json` → `oldLinguisticsSite`). All 253 `answers/<id>/` pages and all 9 `sections/<name>/` pages are kept as redirect pages. These are not kept:

- **Files for assistants:** 253 `answers/<id>.md`, 9 `sections/<name>.md` and `llms-full.txt`. The old `llms.txt` at the same address linked to all of them. Assistants and crawlers that cached those links will get "not found". This is the most important loss for the "agent files" goal. If you want them kept, copies of the new `agent/linguistics/chapters/<id>.md` and `full.md` placed at the old paths would preserve them. That requires no host rules, but it is your choice.
- **Pages and downloads:** `about/`, `download/` (with `key-issues-in-language.epub` and `.pdf`) and `404.html`. Outside links to the PDF and EPUB will break. Whether to keep them is editorial.
- **`_headers`:** the old site sent security headers (a strict Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, a referrer policy and a permissions policy). If the new edition goes to the same host, the site loses these headers. A matching header file should ship. The reader's compatibility with that Content-Security-Policy needs a browser check before release; that belongs to the later screen pass, not this review.
- **Search and assets:** `pagefind/*` and the old `assets/*` are not needed by the new reader.

`build/retired-web-editions-2026-10-27/` holds only each old home page, plus `site.css` for Linguistics. It is not a copy of the old sites. The full old Linguistics site survives only in its own repository and in the host's deployment history.

### 7. The one-book swap does not confirm that it happened (privacy boundary, low)

`release-plugin.ts:22-28` replaces the combined book file and the address list only when the module id equals one exact path. If the id ever differs, the hook silently returns nothing and all three books are bundled. I tested a symlinked app folder in scratch: Vite failed the whole build, so that route fails closed (`load-hook-fail-open.json`). The backstop in `verify-edition.ts` is narrow:

- It checks other books' section ids only when they are longer than 12 characters (line 53).
- It checks addresses only through `sourceUrl` (line 54). Language Muscle has no `sourceUrl`, so its address is never checked in the other two editions.

**Fix:** count the hook's replacements and throw in `generateBundle` unless both files were replaced. Make the verifier check every other book's `canonicalSites` address and a sample of each other book's text, as `audit-editions.ts` does.

### 8. The dirty-source flag misses inputs that change the output (provenance, low)

`build-release.ts:38` checks only `apps/reader-demo/src`, `apps/reader-demo/scripts` and `packages/reader-core/src`. These inputs change the shipped files but are not checked: `apps/reader-demo/index.html`, `public/covers/`, both `package.json` and lock files, and the Tailwind and PostCSS configuration. **Fix:** check the whole repository except `build/` and `docs/`.

## What I checked and found clean

- **Identity.** I hashed each folder again from disk. The tree hashes match the manifests and the receipt's table: Linguistics `dc6e6bb0…`, 909 files; Deliberate Practice `a5399c42…`, 165 files; Language Muscle `14351640…`, 147 files. Each manifest's file list equals the disk listing exactly. All three manifests record source `24ff254` with uncommitted changes (`sourceTreeDirty: true`) and no check failures. There are no symlinks in the editions.
- **One book per edition.** I searched every text file for each other book's title, description, public address, `sourceUrl`, every section id of 6 or more characters, and a 60-character piece of text from every section with text: 543, 565 and 70 probes. No title, description, address or text piece from another book was found. The only id hits are ordinary words that also appear in the book's own text ("fluency", "license", "timing", "how-to-read").
- **No private material.** No source maps, no `sourceMappingURL`, no local paths, user names, private network addresses, Tailscale addresses, `file://` links or key-shaped strings. The three pattern hits are false positives: `phon.ucl.ac.uk/home/…` links in Linguistics answers, and a `localhost` pattern inside a library's URL parser. The only non-text files are the font files and each book's own cover.
- **Safe HTML.** Across all shipped HTML I found no scripts other than the module bundle and the JSON-LD, no event-handler attributes, no `javascript:` links and no iframes. All JSON-LD parses, each page has exactly one canonical link and it is on the book's own address, and only alias pages carry the refresh. Hostile titles, description, language and content (both HTML and Markdown) produced no executable markup in scratch builds. `canonicalSiteUrl` rejected every hostile address I tried (`hostile-builds.json` → `canonicalSiteUrl`).
- **Links and routes.** Every link to the book's own address in every shipped text file points to a file that exists (71, 44 and 794 distinct links). Every section folder maps back to its section through the same `sectionForPath` the browser uses. Every Linguistics alias maps to its section, and its canonical link points to an existing page.
- **What the build writes.** Rollup 4.64.7 refuses emitted file names that leave the output folder. Apart from finding 1, the only write outside the edition folder is the manifest, at a fixed path.
- `npm run test:release`: 7 pass.

## Spec and standards, separately

- **Against the brief (spec):** the editions do what was asked. Each is pinned to one book at its existing address, carries agent files byte-identical to the generator's, and contains no other book. The gaps are decisions rather than defects: the Notion icon (finding 5) and the Linguistics paths and headers that are not kept (finding 6).
- **Code standards:** the write path and failure handling fall short of a release tool (findings 1–4), and the verifier is weaker than its description (findings 2, 7, 8). The code is otherwise small, readable and keeps one route model for the build and the browser, which is the right structure.

## Evidence

Folder `docs/evidence-review-reader-book-release-2026-10-27/`. Run each command from the repository root:

- `audit-editions.ts` → `audit-editions.json`: a read-only audit of the real folders, their manifests, the source and the old Linguistics build. Command: `apps/reader-demo/node_modules/.bin/tsx docs/evidence-review-reader-book-release-2026-10-27/audit-editions.ts`
- `hostile-builds.mts` → `hostile-builds.json`: the symlink, section-id, `$` and markup cases from findings 1–4 and from the safe-HTML check. Each case builds into a fresh `build/review-reader-book-release-scratch-2026-10-27-<pid>/` folder, which is deleted at the end. Command: `apps/reader-demo/node_modules/.bin/tsx docs/evidence-review-reader-book-release-2026-10-27/hostile-builds.mts`
- `load-hook-fail-open.mts` → `load-hook-fail-open.json`: the symlinked-app test from finding 7, in its own scratch folder, also deleted at the end.

After the runs, no scratch folders remain in `build/`. The files in `build/release-books/` have not changed since before the review.

## Limits

- No browser run. These points are still unverified in a browser: the reader mounting over the static text, path-to-section handling in `main.tsx`, the layout chooser being absent, and whether a security-header file would break the reader. They belong to the later screen pass.
- I did not check font or cover licences, the provisional status of the covers, or the other worker's licence and template files.
- The hostile cases ran against a two-section fake book built on Vite and Rollup as installed (Vite 7.3.7, Rollup 4.64.7). A Rollup upgrade could change the file-name refusal described in finding 4.
