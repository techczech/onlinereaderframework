# Single-book release builds (2026-10-27)

Builder receipt for the production build of the three books on the approved reader (HEAD `24ff254`). No reader UI or manuscript content changed. Nothing was deployed, committed or uploaded; no browser run was made (the screenshot pass belongs to Terra). Not an acceptance claim: file-level checks only.

## Command

From `apps/reader-demo` (or the repo root, same arguments):

```
npm run build:release -- --book linguistics|deliberate-practice|language-muscle|all
```

Output: `build/release-books/<book>/` (the deployable folder; `build/` is git-ignored) and `build/release-books/<book>.manifest.json` (not deployed: per-file SHA-256 and size, a tree hash, source HEAD, a dirty-source flag, Node version, the command). Vite empties only the edition's own folder. A second run on the same source gave identical tree hashes.

| Book | Address it is built for | Files | Bytes | Tree SHA-256 |
| --- | --- | --- | --- | --- |
| Linguistics | https://linguistics.dominiklukes.net/ | 909 | 10,419,122 | `dc6e6bb0417fe984598dfd5c0406eb560885563d75990f2aff3fbc52e47ad8ad` |
| Deliberate Practice | https://deliberatepractice.dominiklukes.net/ | 165 | 6,086,375 | `a5399c4247bfb2c4e10661b1794a952f1199ffe8da5d375da20a334dd0df2c16` |
| Language Muscle | https://buildingyourlanguagemuscle.edutools.fyi/ | 147 | 5,501,391 | `14351640d4268899125c5125e6214a359fd158c01a6144fe3b5885b2e86fb2c2` |

The manifests record `sourceTreeDirty: true` because these changes are uncommitted; rebuild after the commit for a clean-source hash.

## Source changed

- `apps/reader-demo/src/release.ts` (new): `RELEASE_BOOK`, set by the build; null in the demo.
- `apps/reader-demo/src/release-routes.ts` (new): pure route model shared by browser and build.
- `apps/reader-demo/src/App.tsx`: in a release the book is pinned (`?book` ignored), `?frontpage` and `?homedepth` are ignored, the layout chooser is not rendered, the tab title is the book title without "— Online Reader Framework", and the Deliberate Practice chapter icon is only referenced by that book's release. With `RELEASE_BOOK` null the demo behaves as before. Per-book front pages are unchanged (Linguistics `opus-colour-band`; the other two classic).
- `apps/reader-demo/src/main.tsx`: in a release, before mounting, strips `book`/`frontpage`/`homedepth` and turns a section or previous-site path into `?section=<id>` (history replace).
- `apps/reader-demo/scripts/build-release.ts` (new): orchestrator using Vite's `build()` API; writes only each edition's folder and one manifest file at a fixed path.
- `apps/reader-demo/scripts/release/release-plugin.ts`, `static-pages.ts`, `verify-edition.ts`, `test-release.ts` (new).
- `apps/reader-demo/package.json` (`build:release`, `test:release`) and root `package.json` (`build:release`; `test:release` added to `npm test`).

No change to `packages/reader-core`, Folio, manuscripts or the original guide repos.

## What each edition contains

- Reader bundle with only that book's manuscript and only its own public address (a plugin replaces the combined book file and `canonical-sites.ts` at build time; no other book's text, section ids or address is in any file).
- `index.html` with title, description, canonical, `index, follow`, Open Graph and Book JSON-LD, and the book's contents as plain HTML in `#root` (replaced when the reader mounts). One static page per section at `/<section-id>/index.html`, with its full sanitised text (the reader's own `renderPublicationContent`), canonical link, previous/next and contents links. Same-book `#/chapter` links are rewritten to those pages.
- `llms.txt`, `agent/<book>/index.md`, `full.md`, `manifest.json`, `chapters/<id>.md`: the generator's bytes for this book at its own address (the check compares every file byte-for-byte). Linked from the root page in the body and in `<head>`.
- `robots.txt` (allow all, sitemap), `sitemap.xml` (root and sections), the book's cover.
- Licence and attribution text stays inside the content and the agent files. No `public/` folder is copied, so the cover provenance file, `upload.md` and the demo `llms.txt` are not shipped.

## Routes and aliases

- Section addresses: `/<section-id>/` (static page) and `?section=<id>` (reader).
- Hash routes of the original single-page books (`#/<section-id>`, Deliberate Practice and Language Muscle) are the reader's existing `sectionFromUrl` behaviour; a unit test covers them.
- Linguistics previous-site addresses, taken from the old static site's `dist` (all 253 `/answers/<id>/` match section ids): `/answers/<id>/` for every answer and `/sections/<name>/` for `theme-<name>` (9 themes). Each is a small `noindex, follow` page with a canonical link and a refresh to the new address (no host redirect rules needed), and the browser also maps these paths to `?section=`.
- The brief did not list the authorised aliases, so the above is my reading of the original site. Not covered, flagged for the parent: the old `/about/` and `/download/` (with `key-issues-in-language.epub` and `.pdf`), and `/llms-full.txt`.

## Checks run

- `npm run check` (tsc, src): pass. The new scripts type-check with `tsc` against the same options minus Node types (not installed here): no errors outside missing `node:` modules.
- `npm run test:release`: 7 pass. Root `npm test` once: reader-core 23 + 26, reader 96, books 5, release 7, all pass.
- Demo `npm run build` (tsc, vite, agent files): pass; 305 agent files as before.
- `verify-edition.ts`, run on every build, pass for all three: required files; canonical, no `noindex`, no demo title; one static page per section and alias; agent files equal the generator's; llms.txt links the book's own files; no `.map` or `sourceMappingURL`; no `/Users/`, `/private/var/`, `100.85.`, `127.0.0.1`, `.ts.net` or `file://` in any text file; no provenance or fixture file names; no other book's section ids or addresses; no demo chooser text in JS or HTML; Deliberate Practice's icon only in its own bundle.

## Limits and flags

- No browser run: the pinned behaviour, front-page layouts, path aliases and reader mount over the static text are unverified in a browser.
- The static text is unstyled HTML (no Tailwind prose) and shows until JavaScript loads; no hydration, the reader replaces it.
- `.demo-frontpage-chooser` CSS (a few rules) still ships in the stylesheet; the element is not rendered. Each bundle also still names the other books' cover file names and alt text (from the shared identity table); no cover images.
- Bundles carry all Inter, Merriweather and Material Symbols font subsets, as the demo does (about 5 MB per edition); the main JS is over Vite's 500 kB warning size.
- Deliberate Practice's EPUB embeds `command-line_gray.svg`; its provenance note says redistribution rights are not established. It is unchanged here and parent should decide.
- The cover images are marked "provisional existing cover candidate" in their provenance file.
- Reader links inside agent files keep the `?book=<id>&section=<id>` form; a pinned edition ignores `book` and honours `section`.
- Trailing-slash-less section URLs and unknown paths need host behaviour (404 page, redirect) that this build does not supply.
- Dependency harvest status: I found no harvest status record to read; not checked beyond that.
- No new schema or write path beyond the fixed-path manifest write. Scratch: none left (a temporary hash comparison in `/tmp` was removed).
