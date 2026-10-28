---
title: Receipt — five-book demo integration (Academic Reading Framework, Foundations of Readability)
date: 2026-10-28
register: FOR AGENTS
status: integrated in the demo; automated browser evidence green except 4 recorded defects (not mine to fix); no operator acceptance claimed; nothing committed, pushed or deployed
base: uncommitted working tree on top of cef5e7f
evidence: docs/evidence-integration-2026-10-28/
---

# Result

- Demo shows 5 books: deliberate-practice, language-muscle, linguistics (unchanged) + academic-reading, readability-foundations. 24 new chapters, 9 embeds (3 + 6) live as sandboxed frames.
- Registered once: `src/books/demo-books.ts`. Nothing copied into `original-publications.json` (hash unchanged, still 3 books).
- Release isolation preserved without touching release scripts (see Registry shape).

# Changed files (app level only)

New:
- `apps/reader-demo/src/books/demo-books.ts` — registry: `demoBooks` (3 originals + 2 next-books), `demoEmbeds` (per book id, stable objects, `root` = `embeds/<book id>/`, `src` = `<embed id>/index.html`, manifest `placement` note dropped), `embedManifest`, `embedRootOf`. Readability `home.license.href` set to `https://creativecommons.org/licenses/by/` (no version; see Licences).
- `apps/reader-demo/src/books/demo-styles.ts` — imports core `embed.css` (lazy chunk only).
- `apps/reader-demo/scripts/demo-embed-assets.ts` — Vite plugin (demo config only): serves + emits exactly the 9 manifest files to `embeds/<book id>/<embed id>/index.html`; dev/preview responses carry the contract CSP (`EMBED_CONTENT_SECURITY_POLICY` imported read-only from `release/headers.ts`).
- `apps/reader-demo/scripts/test-demo-books.ts` — 12 focused tests (in `test:books`).
- `docs/evidence-integration-2026-10-28/` — browser check, logs.

Edited:
- `apps/reader-demo/src/App.tsx` — lazy registry load (non-release only), `Reader` component keyed by book, `embeds={library.embeds[book.id]}`, demo-only book chooser (5 books, `?book=`), `canonicalSites[book.id]` unchanged (new books have none → agent prompt uses page's own address).
- `apps/reader-demo/src/index.css` — `.demo-book-chooser`, `.demo-loading` (chooser on phones: front page only).
- `apps/reader-demo/vite.config.ts` — adds `demoEmbedAssets` plugin (release builds use `configFile: false`, never load it).
- `apps/reader-demo/scripts/build-agent-files.ts` — reads `demoBooks`; root llms summary says five books.
- `apps/reader-demo/package.json` — `test:books` also runs `test-demo-books.ts`.

Not edited (hashes recorded): `PublicationEmbedFrame.tsx` d6a64588…857f13 and `embed-model.ts` 716a538c…b157ad (both equal the security-closure review's reviewed hashes); `embed.css` 104115e9…; `release/headers.ts` ef1873f7… (already modified by the seam work, untouched by me); `release/release-plugin.ts` 0103c3bf…; `release/build-edition.ts` e5670435…; `original-publications.json` 4c436964…; `canonical-sites.ts` 8139754c…. No Folio, original app, website, dlnet, DTC file touched.

Source hashes (sha256) of the integrated inputs:
```
5d857da9be75545a378aad0cc7d36b551391135e3ffa667de32e32efcc322266  next-books/academic-reading-framework.book.json
c6efa2a83c45b3be9a1c0d4ebd85300085226e5cedd42d4a7fd25af8c4ed1041  next-books/readability-foundations.book.json
c2afc85fffbdaaa8511a62934c3876ace72c6240da1d43dc5ab8ad41d6d49b54  next-books/embed-manifest.json
10f838dd15605d2761c3a4eea4d7f2d75cadc299bea53686765fe2ca630f0427  interactives/academic-reading-framework/cognition-explorer/index.html
9671a0c95ed79a011119e38229ee627ae22976e0101d4556f47d5c71ade8fbed  interactives/academic-reading-framework/reading-articulation-layers/index.html
b5059c50c34fd0b7a3343a08301c8e878093ecd35c18ee3a4b361a59094050ab  interactives/academic-reading-framework/reading-simplified-summary/index.html
9c815a21ca4874a37e33f2cd16938c1fb89ed3d0559d2e5886113b66f33a9b96  interactives/readability-foundations/cramped-text-reveal/index.html
19f7937597a4d823c9bf28b2ba0f988655ec16322abaff25742342aad0f6f78d  interactives/readability-foundations/font-spacing-adjuster/index.html
1e3e0f7b4def79b1a458c4a58d4599b4d64ca4033db678e218c04905f088f9ae  interactives/readability-foundations/readability-checker/index.html
ce1417f7f66bf009edcbd3bc86d103e3dc05e3806dacda1cc47924bf79bfac3e  interactives/readability-foundations/slides-extraneous-text/index.html
69cd130837d6ac7f44a5dbc8a285e0708282ca352caab38a32ba11de529799f5  interactives/readability-foundations/slides-one-bullet/index.html
08040c9fd0070b37a1b1e58acd8a76ebf6de067579a7c18fe73b028ede02fa75  interactives/readability-foundations/slides-zooming-images/index.html
```
Output files of mine: App.tsx 8df06e1b…, index.css 723a1e5c…, demo-books.ts 6e9c1faf…, demo-styles.ts bd4cba65…, demo-embed-assets.ts a359960e…, test-demo-books.ts 0fd6bbee…, build-agent-files.ts 7d028cbb…, vite.config.ts f2dbf02f…, apps/reader-demo/package.json 4062e197…, check-integration-browser.py 55af266b….

# Registry shape and release isolation

- Problem: a single-book release replaces only `original-publications.json`, `canonical-sites.ts`, `epub-assets.ts` (`release-plugin.ts`). Any static import of next-books JSON reachable from `main.tsx` would ship both converted books in every existing release; the plugin's "all three replaced" guard would not catch it.
- Choice: `App.tsx` reaches `demo-books.ts` only through `Promise.all([import('./books/demo-books'), import('./books/demo-styles')])` inside `if (!RELEASE_BOOK)`. Vite's `define` makes the branch dead in a release; Rollup drops the chunk. Scripts (agent files, tests) import the registry statically from Node.
- Proof (`test-demo-books.ts`, real `releasePlugin` + `planEdition` + `verifyEdition`, temp folder under `build/`, removed in `finally`): for each of linguistics, deliberate-practice, language-muscle: verifier failures `[]`, no `embeds/` or `demo-books` file, none of 9 markers (`Cognition Explorer`, `Foundations of Readability`, `Increasing Reading Productivity`, `readability-checker`, `cramped-text-reveal`, `demo-books`, `embed-manifest`, both old addresses) and no other original's title in the bundle. Verifier run with all four other books as "others" (the two new ones included).
- Red proof: adding a static import of `demo-books` in `App.tsx` turned all 3 isolation tests red (9 pass / 3 fail); `App.tsx` restored to the shipped version afterwards.
- CSS: embed styles load with the lazy chunk, so existing releases keep their stylesheet bytes. Before this fix the demo had no embed CSS at all (`main.tsx` imports CSS files one by one; `reader.css` from `build-reader-styles.mjs` is not used by the demo): frames rendered 300 px wide with unstyled chrome. Found by screenshot, fixed in `demo-styles.ts`.

# Tests and exits

- `npm run build` (root: core build, `tsc --noEmit`, `vite build`, agent files): exit 0 (`log-root-build.txt`). Agent files: 335 files, 5 books (deliberate-practice 24, language-muscle 15, linguistics 265, academic-reading 13, readability-foundations 17).
- `npm run check --prefix apps/reader-demo` (`tsc --noEmit`): exit 0 (`log-types.txt`).
- `npm test` (full, run once at the end): exit 0 (`log-full-suite.txt`). Groups: 23/23, 26/26, 7/7 (embed unit), 96/96, test:books 17/17 (5 original + 12 new), test:release 18/18.
- Browser check: `../book-engine/.venv/bin/python docs/evidence-integration-2026-10-28/check-integration-browser.py` from the repo root, after `npm run build` in the demo: exit 1, **434/438 pass** (`log-integration-browser.json`). The 4 red checks are real defects, listed below; they stay red on purpose.
  - Setup: bundled `chrome-headless-shell` (no installed Chrome), real in-process HTTP server on an ephemeral 127.0.0.1 port serving `apps/reader-demo/dist` (the built copy, not the dev plugin) with the contract CSP on `/embeds/*`; viewports 1280×900 and 375×800; fresh browser context per viewport (storage isolated). Scratch (EPUB downloads) in a temp folder, removed.
  - Covered at both widths: book chooser lists the 5 books, switching changes address/title/book, back restores; all 24 new chapters open, exactly one h1 equal to the manuscript's own first heading, no skipped heading level, every internal route resolves, a click on an internal route opens the chapter; all 9 frames: exact `sandbox="allow-scripts"`, title, `no-referrer`, src under `embeds/<book>/…`, load, opaque origin (`self.origin === 'null'`, storage blocked), auto height equals clamp(content height, min, max) ±4 px, layout stable, sits immediately before its prose alternative, inside the viewport; each embed operated (explorer node select/related arrows/Reset/Enter, cramped reveal click+Enter, font sizes 20→22→20, checker analysis changes with text, slides/diagrams render text); keyboard: skip link focusable with visible focus, Enter focuses the text version, frame takes keyboard focus; "Open full view" opens a new tab with opaque origin and no reader storage; highlight made on the prose next to the explorer: saved, listed, frame re-renders and still works, persists across reload; theme menu (Follow computer/Light/Dark), Dark applied with frame intact; Assist opens and leaves frame chrome and frame untouched; no request leaves 127.0.0.1; no console error/warning/page error.
  - Desktop only: agent files fetched as real bytes for all 5 books (`index.md`, `full.md`, `manifest.json` 200 and non-trivial; root `llms.txt` lists all five); new books' `full.md` carry every prose alternative and no frame or chrome; "Ask an agent" links on the front pages use the page's own address (`http://127.0.0.1:<port>/agent/<book>/…`), not an old domain; front page shows title treatment, no cover image; EPUB downloaded from the reader for both new books: valid zip, one XHTML per chapter at least, every prose alternative's opening wording present, no `<iframe`, `data-publication-embed`, skip/full-view text or `sandbox=`.

# Defects found (red, not fixed — not in my ownership)

1. **Skip link lands mid-text (core, 2 red checks).** `use-publication-reader.ts` `handleContentLink` does `target.scrollIntoView({ behavior: 'smooth', block: 'center' })` for in-page `#id` links. The explorer's prose alternative is 2465 px tall (3407 px at 375), so centring puts its first ~650–990 px above the viewport; focus does go to it. Needed core change: use `block: 'start'` when `target.getBoundingClientRect().height > window.innerHeight`. Core is released to the coordinator; owed to whoever fixes core, with a re-review of that file.
2. **`slides-extraneous-text` is 514 px wide at every viewport (1 red check at 375).** Frame is 317 px wide at 375, so the slide mock-up is cut off horizontally (scrollable inside the frame only). Same 514 px when the file is opened standalone at 320, 317 and 375 px, so the earlier "no overflow at 320" claim in the conversion report does not hold for this file. Fix belongs in `build-source/build-embeds.tsx` (content preparation). `reading-simplified-summary` overflows by 4 px at 375 (1 red check, cosmetic).
3. None of the 4 red checks is in the files I own.

# Limitations (state plainly)

- Automated Chromium headless evidence only. Not an operator acceptance. Not covered: screen reader, a real phone/touch, Safari/Firefox, search UI, read-aloud, front-page layout variants for the new books, dark-mode appearance by eye, print.
- Embeds follow the OS colour scheme, not the reader theme (v1 contract has no host→embed messages): with the reader on Dark and the OS light, frames stay light. Not tested by eye.
- Highlights re-render the chapter and reload frames (documented in the contract); the check confirms frames work again after, not that embed state survives.
- Demo `dist/` has no `_headers`. Dev/preview serve the embed CSP through the plugin; a hosted demo would need `securityHeaders({ embedRoot })` output. Live Cloudflare header behaviour still unobserved (also in the closure review).
- Slide photograph: still the inline neutral placeholder (`slides-zooming-images`, grey shapes at the photo position); remote Unsplash `photo-1578916171728-46686eac8d58` has no local copy and no rights statement found, so nothing changed. Visibly provisional.
- Open author/Dominik decisions untouched (conversion report items): Academic licence (book prints none; no grant added), Readability licence version, Academic final book URL (none invented; `sourceUrl` stays `academicreading.edutools.fyi`, no `canonicalSites` entry), missing appendix references, cover, checklist as plain list. The main-site Academic Reading route stays unresolved; dlnet not touched.
- Licences: prepared Readability file linked the 4.0 deed (assumed version). The registry now links `https://creativecommons.org/licenses/by/` and keeps the label "CC BY … as stated in the original guide". That address currently redirects to the 4.0 deed (observed with `curl`); the reader text does not claim a version. The prepared JSON file itself still holds the 4.0 link: fix at source when the licence version is decided.
- Identity: both books use the appearance proposed in their files (existing masthead values `editorial`, `practical`); no cover, front page shows the title treatment.
- Agent prompt: for the new books `canonicalSites` has no entry, so the reader uses the page's own address; generated files claim no public address (`--canonical` mode skips them).

# Remaining release, projection and header integration (not done; needs write-path owners)

1. `scripts/build-release.ts` and `build-edition.ts` read `original-publications.json` only: the new books cannot be released. For a release of a converted book: `edition-plan.ts` must copy that book's embed files to `embeds/<root>/…` as planned files (origin recorded), call `securityHeaders({ embedRoot })` only for that book, `verify-edition.ts` must check the embed files byte for byte, and `canonical-sites.ts` needs the decided public address.
2. **Verifier false positive (exact seam).** `verify-edition.ts` line ~85 probes every other book's section id longer than 12 characters as a plain string. Readability's `accessibility` (13) is an ordinary word in Linguistics and Deliberate Practice text, so any release verified with the new books as "others" fails (9 and 4 false hits in those two). My test works around it by renaming that one id in its copy of the "others". Needed: probe ids as whole path/attribute tokens (not substrings of prose), or skip ids that occur in the book's own text; then drop the workaround.
3. `projection.ts` / `epub-assets` module: no change needed for converted books (no images in EPUB).
4. `prepare-reader-source-release.mjs`: add `src/embed/*`; add both new books to `manuscriptAnchors` (from the conversion report); `apps/` stays forbidden, so the new files stay out of the public MIT export.
5. Core defect 1 above; embed width defect 2 above; independent review of those fixes.
6. Live checks: phone, screen reader, Cloudflare preview headers; DTC test request is for the coordinator to raise.

# Ownership

- My files: only those under "Changed files". Production core embed seam, source-export privacy guards, release write scripts, canonical Folios, original apps and websites were not edited. Core ownership returns to the coordinator; this receipt does not change the seam's review status.
- Scratch: temp folders under `build/` and `/tmp` removed; `/tmp/*.py` probes are outside the repository and unused by the repo. The built `apps/reader-demo/dist` and `packages/reader-core/dist` are git-ignored build output.
