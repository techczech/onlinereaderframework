# Repair: single-book release builds (2026-10-27)

Builder receipt for the fix round on the release build of the three books, answering `docs/review-reader-book-release-2026-10-27.md` (findings 1–8) and the parent's decisions on the open publication choices. Builder: Claude Opus 5.5 (write-path seat). Source at HEAD `24ff254` plus uncommitted changes, including the other worker's. Nothing was deployed, committed or uploaded. No browser run and no Git change. The reviewer's evidence folder was not touched or re-run. The fix touches the write path, so it needs a re-review.

## Result

- **All three editions are rebuilt and pass the strengthened checks.** Each manifest records `sourceTreeDirty: true`, so `verify:release` refuses all three, as intended. The parent should commit, rebuild, then run `verify:release` before any deploy.
- **The write path is now staged.** It checks every folder for symlinks, refuses bad section ids and colliding paths before writing anything, builds into a staging folder, and writes the manifest only after a passing build, as the last step.
- **Kept from the previous Linguistics site:** every old answer and section Markdown path, `llms-full.txt`, `about/`, `download/` with the previous EPUB and PDF byte for byte, and `404.html`. All three editions also ship a `_headers` file with security headers and a `404.html` page.
- **Deliberate Practice:** the Notion icon is replaced, in the release only, by a new icon drawn for this repository. No Notion icon bytes or icon address remain in any edition.

| Book | Files | Bytes | Tree SHA-256 | Before the repair |
| --- | --- | --- | --- | --- |
| Linguistics | 1,178 | 15,271,579 | `3ad8f09070e6ed9714d145f43ce6be7796e58f4310567798876db1ca85a05927` | 909 files, `dc6e6bb0…` |
| Deliberate Practice | 168 | 6,088,166 | `2d17271143ab06f13670ea08d4d57e8d648475c69776de4fbe2880c0b2981758` | 165 files, `a5399c42…` |
| Language Muscle | 149 | 5,503,085 | `43dc0d7ec66941f56ac76792fe775300e61c2db3b2c3c950d717813232c1cc60` | 147 files, `14351640…` |

The added files are: Linguistics 262 old Markdown paths, `llms-full.txt`, two downloads, `about/`, `download/`, `404.html` and `_headers`; Deliberate Practice `_headers`, `404.html` and `media/terminal-icon.svg`; Language Muscle `_headers` and `404.html`. All three are built from source HEAD `24ff254`, with `sourceTreeDirty: true` and 35 uncommitted paths listed in each manifest.

## Findings 1–8

1. **Symlink guard** (`scripts/release/write-guard.ts`). `assertReleasePath` runs before every create, rename, write and delete. It refuses:
   - a path outside `build/release-books/`, or one containing `..`;
   - a symlink anywhere from `build/` down to the target;
   - a component of the wrong type (a file where a folder is expected, or the reverse);
   - a release root whose `realpath` is not inside the repository.

   `walkFiles` refuses symlinks and special files inside an edition. The early guard in `build-edition.ts` checks the release root, the edition folder, the manifest and the staging path before Vite runs. Vite now runs with `emptyOutDir: false` into a new staging folder, so it never empties anything.
2. **`$` in book text** (`scripts/release/render-shell.ts`). Every insertion uses a replacer function through `replaceOnce`, which also throws unless its marker occurs exactly once. This covers the four `transformIndexHtml` replacements and the head and body markers. The verifier now checks every page:
   - no `<!--ORF_` marker in any text file;
   - exactly one `<html>`, `<head>` and `</head>`, and one `<title>` in the head;
   - the exact escaped title, a single canonical link with the exact address, and the right robots tag;
   - the generated body verbatim inside `<div id="root">…</div>`.
3. **Failed builds** (`scripts/release/build-edition.ts`). The steps run in this order:
   1. Plan and check; a refusal at this step writes nothing.
   2. Delete `<book>.manifest.json`.
   3. Build into `build/release-books/.incomplete-<book>-<stamp>/`.
   4. Verify. On failure the staging folder stays under that name, the previous edition folder is untouched, and no manifest exists.
   5. Move the previous edition to `.previous-<book>-<stamp>`, rename staging into place, hash the folder again, then delete the previous edition.
   6. Write the manifest through a temporary file created with `wx`, then rename it into place.

   Manifests are written only on success, with `checks.failures: []`. The schema is now `online-reader-framework/release-manifest@2`, so manifests from before the repair are refused. **New check before deploy:** `scripts/release/verify-existing-edition.ts` (`npm run verify:release -- --book <id>|all`). It passes only when all of these hold:
   - the path is guarded;
   - the manifest has the current schema, names this book, folder and address, and records no check failures;
   - `sourceTreeDirty === false`;
   - the files on disk are exactly the manifest's list, with matching sizes, SHA-256 hashes, totals and tree hash;
   - the full artefact check passes again against the current source.

   A different HEAD, or uncommitted changes made after the build, are reported as notes, not failures, because committing docs after the build changes HEAD without changing the edition.
4. **Section ids** (`scripts/release/route-checks.ts`). Every id must match `^[a-z0-9][a-z0-9-]{0,99}$`. Ids are refused if they are a reserved name (`agent assets covers media answers sections about download home index.html 404.html llms.txt llms-full.txt robots.txt sitemap.xml _headers`) or a duplicate ignoring case. All real ids pass (test). `outputPathProblems` refuses a planned path that is not a plain relative path, is duplicated ignoring case, or is both a file and a folder; `planProblems` also refuses planned paths under Vite's `assets/`. These checks run before any write, and again in `generateBundle` over the whole bundle. Every planned file is listed in one place, `scripts/release/edition-plan.ts`, which the build, the checks and the verifier all use.
5. **Notion icon** (`scripts/release/projection.ts`, `src/books/epub-assets.ts`, `src/books/assets/terminal-icon.svg`). The release projection replaces the one `<img src="https://www.notion.so/icons/command-line_gray.svg" alt="https://www.notion.so/icons/command-line_gray.svg" width="40px" />` in `limitations-working-memory` with `<img src="/media/terminal-icon.svg" alt="" width="40px" />`.
   - The build throws on any other count, any other section, or any `notion.so/icons/` left behind.
   - The EPUB image table now lives in `src/books/epub-assets.ts`. The demo keeps the original capture there; the release plugin replaces that module with this book's table (href `/media/terminal-icon.svg`, the new bytes), so the release EPUB embeds the new icon. `App.tsx` reads the table; its `RELEASE_BOOK` branch for the icon is gone.
   - The canonical JSON and manuscripts are unchanged.
   - The new icon is a rounded rectangle, a chevron and a line, drawn for this repository and released under MIT. Its provenance is in `src/books/assets/provenance-terminal-icon.json` (SHA-256 `beef4f87…429f`).
6. **Previous Linguistics addresses** (`scripts/release/previous-site.ts`, `previous-linguistics-site.json`). Old `answers/<id>.md` and `sections/<name>.md` now hold the bytes of the new `agent/linguistics/chapters/<id>.md` (or `theme-<name>.md`), and `llms-full.txt` the bytes of the new `full.md`.
   - The EPUB and PDF are copied byte for byte from the old `dist/`, only if their pinned SHA-256 and size match: EPUB `bc62337f…a588`, 410,926 bytes; PDF `90e831f1…e585`, 2,693,387 bytes.
   - `about/`, `download/` and `404.html` are new pages without scripts. Each quotes the old page's `<main>` verbatim; the old files are hash-pinned, and the build refuses a main text containing scripts, styles, forms or event handlers.
   - Existing alias pages are unchanged.
   - Deliberate Practice and Language Muscle get a `404.html` with the same two-sentence wording.
   - `_headers` (`scripts/release/headers.ts`) is described under "Security headers" below.
7. **Swap confirmation and boundary checks.** The plugin counts its three module replacements (the books file, `canonical-sites.ts`, `epub-assets.ts`) and throws in `generateBundle` unless all three happened. The verifier now probes for every other book's:
   - title;
   - description (20 characters or more);
   - host name, from both its `canonicalSites` address and its `sourceUrl`;
   - section ids over 12 characters;
   - up to 40 text samples, each a 60-character run of characters that no escaping changes.

   The sampling method is first proven on the edition's own text: every own sample must be found in its own bundle, or the check fails. The verifier also requires the folder to hold exactly the planned files plus `assets/*`, and compares every planned file byte for byte.
8. **Dirty flag** (`sourceState` in `build-edition.ts`). It runs `git status --porcelain --untracked-files=all -- . ':(exclude)build' ':(exclude)docs' ':(exclude)research' ':(exclude).codex'`, so config files, package manifests, lock files, covers and the previous-site pin all count. The manifest lists up to 200 dirty paths.

## Security headers

Every edition's `_headers` has `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `/assets/*` caching for one hour, as the old site had. The Content-Security-Policy is:

`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' data:; media-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`

Reasons for each allowance, from reading the code and the built files:

- The only script is the module bundle. JSON-LD is a data block.
- No HTML file has a `style` attribute or a `<style>` element, and no CSS has `url(data:`.
- React sets styles through the DOM style object, and `AgentAccess` uses `style.cssText`; the policy does not block either.
- KaTeX writes `style` attributes internally, but the reader's sanitiser strips `style`.
- The quote card shows a canvas `data:` URL (with its QR code) and fetches that URL to copy it, hence `data:` in `img-src` and `connect-src`.
- No book text loads an outside image, so no third-party origin is allowed.

**Not observed in a browser.** The screen pass should check the reader, the quote card, the EPUB download and the listening controls under this policy.

## Tests (red, then green)

- `scripts/release/test-release-repair.ts`, 4 tests: the symlink guard on the edition folder, release root, `build/` and manifest, with an outside sentinel left intact; `$` patterns in the title, head and body; section ids; output paths. **Red:** the old logic was first moved unchanged into `write-guard.ts`, `render-shell.ts` and `route-checks.ts`, and the tests ran against it: 4 fail, each on its own assertion (`check-repair-unit-red.log`). **Green** after the fix.
- `scripts/release/test-release-write.ts`, 3 tests, using real Vite builds of a two-section fake book into a fake repository under `build/test-release-write-<pid>/` (deleted at the end). Every case checks that an outside sentinel folder holds only its sentinel afterwards. The cases are:
  - a symlinked edition folder, release root or manifest is refused before any build, and the manifest symlink itself is left in place;
  - the ids `index.html`, `theme-..`, `agent` and `CaseA` are refused with the previous folder and manifest unchanged;
  - a book with every `$` pattern builds, `verify:release` passes it, then refuses it after an extra file is added or the manifest says dirty;
  - a second build whose verification fails (a twin book shares its text) leaves the previous edition hash-identical, no manifest, and a `.incomplete-` folder, and `verify:release` then refuses the edition.

  These tests were written after the fix, so they have no red run.
- `npm run test:release` now runs all three files: **14 pass, 0 fail.**

## Commands run (from `apps/reader-demo`, logs in `docs/evidence-repair-reader-book-release-2026-10-27/`)

| Command | Result | Log |
| --- | --- | --- |
| `node_modules/.bin/tsx --test scripts/release/test-release-repair.ts` (old logic) | 4 fail | `check-repair-unit-red.log` |
| `node_modules/.bin/tsx --test scripts/release/test-release-write.ts` | 3 pass | `check-repair-write-first.log` |
| `npm run test:release` | 14 pass | `check-repair-test-release.log` |
| `npm run check` (tsc over `src`) | pass | `check-repair-typecheck-src.log` |
| `node_modules/.bin/tsc --noEmit … --typeRoots ../../packages/reader-core/node_modules/@types --types node scripts/build-release.ts scripts/release/*.ts src/vite-env.d.ts` | 0 errors | `check-repair-typecheck-scripts.log` |
| `npm run build:release -- --book all` | 3 built, checks pass | `check-repair-build-all.log` |
| `npm run verify:release -- --book all` | exit 1: each book fails only on `sourceTreeDirty` | `check-repair-verify-existing.log` |
| `python3 -I docs/evidence-repair-reader-book-release-2026-10-27/audit-repaired-editions.py` (repo root) | see below | `audit-repaired-editions.json` |

The script type check uses the Node types that `packages/reader-core` already has installed (`@types/node` 26.6.5). The demo app has no Node types of its own, so `npm run check` still covers only `src`. Root `npm test` and the demo `npm run build` were not run: the change touches only release code and the demo's EPUB image table, which `npm run check` and the release builds cover. The hashes of the editions before the repair are in `release-before-repair.txt`.

**Independent audit** (`audit-repaired-editions.json`, read-only):
- every manifest matches the disk and its tree hash;
- no symlinks, markers or scripts in the standalone pages;
- every page has one `<html>`, `<head>` and `<title>`;
- no Notion icon pattern in any file;
- the new icon file equals the repository's;
- the Deliberate Practice static page and agent chapter carry the new `<img>`;
- all 535 old Linguistics files outside `pagefind/` and `assets/` exist at the same path;
- 262 of 262 old Markdown paths equal the new chapter bytes, and `llms-full.txt` equals `full.md`;
- the downloads are hash-identical to the old ones;
- the about, download and 404 main texts are verbatim.

**Same original text:** 510 of the 511 Linguistics sources in this repository's import provenance are hash-identical to the source snapshot the previous build recorded (`linguistics-stack-exchange-answers/build/round-two-source-after.json`). The one left out is `book.toml`, which is not in that snapshot.

## For the parent to decide or check

- **Decorative icon alt text.** The replacement sets `alt=""` because the old alt was the Notion address, not authored text. If the original alt should be kept, change `RELEASE_ICON_ELEMENT` in `projection.ts`; keeping it would keep `notion.so/icons` in the text, and the verifier would then fail.
- **Review correction.** `reviews-coaching` carries no icon. It has an authored hyperlink to a Notion page (`notion.so/Air-Light-Time-Space-…`), which is kept and loads nothing. That link is why `notion.so` still appears in four Deliberate Practice files.
- **Old about and download text.** They are quoted unchanged from the 2026-10-23 site. Three statements in them may not fit the new reader:
  - "Each answer page shows the licence the answer carries on Stack Exchange";
  - "First edition, 2026";
  - "Question summaries were drafted with AI".

  The old download page calls the EPUB and PDF "the book". They are the previous build, with the same source text as the snapshot above; no record says which snapshot that build used. The Linguistics book data has no licence field, so these quoted pages and the downloads are where its CC BY-SA 4.0 notice appears.
- **Hosts.** `_headers` is Cloudflare Pages and Netlify syntax; on another host it is served as a plain file. A `404.html` at the root makes Cloudflare Pages answer unknown addresses with 404 instead of falling back to the app with 200. I did not check where Deliberate Practice and Language Muscle are hosted.
- **Leftover folders.** A failed build leaves `build/release-books/.incomplete-<book>-<stamp>/`. Nothing deletes these automatically; none exist now.
- **Next step:** commit, `npm run build:release -- --book all`, then `npm run verify:release -- --book all`. Deploy only a book that prints `PASS, deployable`.

## Interface changes

- `verifyEdition({ plan, others, otherSites, outDir })` replaces `{ book, others, site, outDir, expected }`.
- `releasePlugin(plan, appRoot)` replaces `(book, site, appRoot)`.
- New modules in `scripts/release/`: `build-edition.ts`, `edition-plan.ts`, `write-guard.ts`, `route-checks.ts`, `render-shell.ts`, `projection.ts`, `previous-site.ts`, `previous-linguistics-site.json`, `headers.ts`, `verify-existing-edition.ts`, and two test files. `build-release.ts` is now a thin command-line wrapper with the same arguments.
- `static-pages.ts` gains `standalonePage` and `notFoundMain`.
- The manifest is `@2`, with `sourceDirtyPaths`, `projection` and, for Linguistics, `previousSite`.
- `apps/reader-demo/package.json`: `test:release` runs three files, and there is a new `verify:release`.
- Not touched: `src/release.ts`, `src/release-routes.ts`, `main.tsx`, the root `package.json`, reader-core, the manuscripts, the exporter, templates and licence files, the old site, and the reviewer's evidence.

## Limits

- No browser run: the reader mounting, the CSP, the new icon's rendering, the EPUB export with the new icon, the 404 status on the host, and the alias refreshes are unobserved.
- I did not check the font licences, the cover licences or the provisional status of the covers.
- The previous EPUB and PDF are trusted by hash only; I did not re-validate them.
- The guard checks before each operation; it does not hold a lock, so a symlink swapped in between the check and the operation is out of scope on a single-user machine.
- Scratch: the test folders under `build/` are removed by the tests, and none remain. Nothing was written outside this repository.

## Ownership and re-review inputs

Owned and changed in this round:
- `apps/reader-demo/scripts/build-release.ts` and `apps/reader-demo/scripts/release/*`;
- `apps/reader-demo/src/App.tsx` (the EPUB image table only), `src/books/epub-assets.ts`, `src/books/assets/terminal-icon.svg` and `provenance-terminal-icon.json`;
- the scripts in `apps/reader-demo/package.json`;
- this file and `docs/evidence-repair-reader-book-release-2026-10-27/`.

For re-review, read `build-edition.ts`, `write-guard.ts`, `release-plugin.ts`, `render-shell.ts`, `edition-plan.ts`, `verify-edition.ts`, `verify-existing-edition.ts`, `projection.ts` and `previous-site.ts`, and run `npm run test:release` and the audit script. Ownership goes back to the parent.
