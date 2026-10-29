---
title: Online Reader Framework v1.1.0 public source candidate
date: 2026-10-29
register: FOR AGENTS
status: dirty-working-tree-candidate-prepared-not-published
builder: Claude Opus 5.5 (implementation sub-agent; security/write-path seat)
review: owed — independent review by the parent; not self-accepted
---

Builder receipt. No Git operation, commit, push, tag, release, deploy or npm publication. No live book, manuscript, WriteFlex or `apps/` file changed. Authorisation: Dominik, "yes, finish the framework release" (additive v1.1.0, GitHub source/release, existing Pages site).

## Candidate

- Folder `build/public-reader-source/` (146 files). Archive `build/reader-source-release.tar.gz`, `…manifest.json`, `…sha256`, `…evidence.json` (git-ignored). Copies of manifest, sha256 and the path-redacted evidence in this folder.
- Archive SHA-256 `bef6d91ef82e9cb93753cec1ef4affdd4e3088885ca25c6b3062388910274502`, 146 files. Uncompressed tar SHA-256 `9ab5d23aafde1ec269ee0d8a97bbc47af41a7d449d9759ac3efc864dcbfaf4a4` (new manifest field `uncompressedTarSha256`).
- Reproducible: a second full run gave identical archive, tar and all 146 member hashes.
- **Dirty-source candidate.** HEAD `bf10299` at start and end, with the tracked and untracked inputs listed in evidence (`sourceState: dirty-working-tree-candidate`, `trackedInputChangesAtStart`, `untrackedInputsAtStart`). No input changed during the run. It is not the release. The parent commits, regenerates from the clean commit and compares the uncompressed tar or the manifest's member hashes; the gzip hash may differ if Node/zlib differs.
- Previous v1 candidate preserved before replacement: `build/retired-reader-source-v1-source-candidate-502b7a14a3eb/` (125 member files and the four output files, each member verified against its manifest). Public v1.0.0 commit `f8453b8…`, tag and `build/public-reader-v1-git/` untouched. All older evidence untouched.
- Offline install mode (lockfile-matched cache copy, `--ignore-scripts`, `--min-release-age=7`), Node v24.22.1, npm 11.19.1. Scratch removed (`scratchRemoved: true`).

## What changed (exact files)

Modified: `package.json` (1.1.0), `packages/reader-core/package.json` (1.1.0), `packages/reader-core/package-lock.json` (two version fields only), `scripts/prepare-reader-source-release.mjs`, `scripts/templates/reader-source-release/{README.md,LICENSING.md,site/index.html,test-reader-native-import.mjs}`.

New: `scripts/templates/reader-source-release/CHANGELOG.md`; `examples/reader-example/{README.md,package.json,package-lock.json,index.html,build.mjs,serve.mjs,hosting-headers.mjs,test-example.mjs,src/main.jsx,src/example-book.mjs,embeds/line-spacing.html}`; `scripts/check-reader-example-browser.mjs` (private, not exported); this folder.

SHA-256 at hand-off:

```
53128c2ab8ad36c85be9a345ab52c1ad75cd3b02b9956756ab588f169fff801a  package.json
28a9ffb441950a46447ca8db5b6b170398caa67433edcbd4b189244db315785a  packages/reader-core/package.json
c8d716bf151ec4f015f60571dbb3e1b0d469074ca79e53cefc02359419eca6c4  packages/reader-core/package-lock.json
adc31916caeb5c0c99e56aba0b784ab78db74b501c27872bd9ec7777c64375dd  scripts/prepare-reader-source-release.mjs
ef9463d0a2b2d90901aa8ecafd90bd5364b793a289d56fcd142e80bef8a4b43a  scripts/check-reader-example-browser.mjs
a1002c205d1f5d847ea3a69f915dbe4b972c4db47831dd7f9b0e48762cccdcce  scripts/templates/reader-source-release/LICENSING.md
c17e760b2c3dd4225ddaaaedf2a657160a5a22a7db2fd3deaa2c54598a46a885  scripts/templates/reader-source-release/README.md
b90d14d9e65b4fc78da81fd8786cb71202da21f1e6671588463120fa485eba93  scripts/templates/reader-source-release/CHANGELOG.md
7ef6bec882f110fdcb965a8bb26fe24fcc6953ad086d3d76162e963a32dd7cc1  scripts/templates/reader-source-release/test-reader-native-import.mjs
64de4cf703801f2e886f43ee748d1ed63edc105bcebc3e532411105a89cf1a89  scripts/templates/reader-source-release/site/index.html
25f9d072c449a7790debed4346f5dc75d03e9a244fc2ab2c5ea95e53f090e043  examples/reader-example/README.md
6c135be4ede0658e171ecec87ca383733c3339804967492baff730cabeef5dce  examples/reader-example/package.json
a10dc743e22e65d07c1b59267cf06b19a0bfe65c276c549732247db9884d3ff3  examples/reader-example/package-lock.json
64012e3a66af7f99407816f023801422514ce50da7c008a594353c2a72bcd32f  examples/reader-example/index.html
f29056f916b8d113c9df7ee53aebe28733596774d1bb8295bf2c1dcf1eb56f87  examples/reader-example/build.mjs
c63b3a7aa15a8bc10fa602863e0476bc097cc7da993c07ced738da1d8b39a73f  examples/reader-example/serve.mjs
24b5bae783e36f7721e3a7647aff3a89937191eba14b53f673014168d7e0841f  examples/reader-example/hosting-headers.mjs
53c0492f35a8f5424bec7e957079e12afb5a74041cb7f27978a6938045fa4bd5  examples/reader-example/test-example.mjs
02225d2be76a9c4f2214638ca4bbe91e7691310db7c961f11c563a03ed6435f6  examples/reader-example/src/main.jsx
440e736cfcad3eebe2d2faeb98eb1565dce00269c8312ed9de602aa04348741f  examples/reader-example/src/example-book.mjs
470755a2df3e51e59316c24da4040782ddfa1735a446cf2e5931e0aa79a45280  examples/reader-example/embeds/line-spacing.html
17f4ec5046b58b643956f23f9c529fce33a8b3c3c7775b0236abff09baedb67e  docs/release-reader-v1-1-2026-10-29/check-guard-red-mutations.py
```

## Exporter changes (review focus)

- Identity 1.1.0: `RELEASE.version`, status `v1.1-source-candidate`, provenance `v1.1.0-mit-source-release`; manifests still `private: true`; core lock synchronised; example manifest/lock must equal the release version and record the linked core at it; example dependencies pinned exactly (except the `file:` core link). Public `engines.node` `>=22.12` (Vite 7 requirement).
- Allowlist extended by name only: `CHANGELOG.md`, the 11 example files, `packages/reader-core/src/embed/README.md`, and Node tests `src/embed/test-embed.mjs` + `src/embed/embed.test.mjs`. Embed `.ts/.tsx/.css` (incl. `embed-child.ts`, `embed.css`) were already covered by the existing `src/**` rule. No exclusion widened; no audit suppressed.
- One new exact literal exception: `file:///tmp/book/index.html`, `embed.test.mjs` only, count 1, with its full assertion line as required context.
- Header-policy drift check: the example's two CSP strings must equal those in private `apps/reader-demo/scripts/release/headers.ts` (read as input, not exported).
- Isolation: second offline `npm ci` for the example; every declared core and example dependency must sit in the scratch copy's own `node_modules`; example build output is scanned for the private root, scratch path, `/Users/`, `nexus-onedrive` and `apps/reader-demo`.
- Isolated checks added: example build with embeds + 7 Node checks; build without embeds + 7 Node checks; native import now covers embed functions, `reader-core/embed-child` and the packaged stylesheet's embed styles and local fonts.
- `retirePreviousCandidate` at run start (before a failed run could overwrite evidence): copies a different-status candidate once into `build/retired-reader-source-<status>-<hash12>/`, verifying the archive and every member against the old manifest; never overwrites; refuses links.
- Evidence records `sourceState`, untracked inputs and `uncompressedTarSha256`.

## Example and embed security

- `PublicationReader` with the real package by name (`file:../../packages/reader-core`, Vite dedupes React), 5 top-level sections and 2 nested ones; Markdown and HTML; table, list, quotation, footnote; built-in settings, assist, notes, Listen; EPUB via the reader's own `Download eBook`; agent files via `buildAgentBook`; embed registry checked with `checkPublicationEmbeds` at build time. Text is invented and labelled MIT demonstration text. No real manuscript, cover or post text (13,866 manuscript anchors from all five books: 0 hits).
- Embed: one inline HTML file, no network or storage; the build inlines the compiled `reader-core/embed-child` (refused if it ever imports anything).
- Headers in `hosting-headers.mjs`: reader pages strict (`script-src 'self'`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`); `/embeds/*` detaches both and sets `sandbox allow-scripts; default-src 'none'; … connect-src 'none' … frame-ancestors 'self'`. No CSP weakened. Written as Cloudflare `_headers`; `serve.mjs` applies the same rules locally (127.0.0.1 only, regular files inside `dist/` only, no dot names, encoded separators or links).
- `--without-embeds`: no registry, no `embeds/` folder; for GitHub Pages. Docs state plainly that GitHub Pages ignores `_headers`.
- Verified hosts: **local preview only** (Node and headless browser). Cloudflare Pages is the documented supported host; the same policies are live on the two converted guides, but this example was not deployed to Cloudflare or GitHub Pages. No hosted example was added to the project site.

## Checks (green)

- `node scripts/prepare-reader-source-release.mjs --self-test`: pass (adds embed-literal, example-allowlist and retirement cases).
- Full export run: audit 146 files, 0 issues, 10 reviewed literals; isolated core tests 22 + 15 + 8 (embed) + 71 pass; native import pass; example 7/7 with and 7/7 without embeds; dependency resolution in scratch.
- Private `npm test`: exit 0 (23, 26, 8, 96, 19, 27). Log: `log-private-full-tests.txt`.
- `node scripts/check-reader-example-browser.mjs --out docs/release-reader-v1-1-2026-10-29/check-example-browser.json`: 56/56, Playwright with bundled `chromium_headless_shell-1228` (never installed Chrome), 1280 and 375 px. Covers home, EPUB download (zip with `mimetype` first, text version, no iframe), agent link served, text version, toolbar controls, frame `sandbox="allow-scripts"` on own origin, frame growth from 240 px to the reported height, frame origin `null` with storage/cookie/parent access blocked, direct full view sandboxed by response header, no overflow, no outside requests, console errors or reader popups; build without embeds has no frame and `/embeds/` 404.
- README TSX snippets (3) type-check strict against the built declarations; negative control errors as expected.
- Project page: anchors resolve, no root-absolute links. HTTP 200 on 2026-10-29: all five books, Principles of Readability, Pages site, `blob/main/LICENSE`. `blob/main/CHANGELOG.md` 404 until published.

## Red evidence (changed guard classes)

`python3 docs/release-reader-v1-1-2026-10-29/check-guard-red-mutations.py` → `check-guard-red-mutations.json`: 9/9 caught, every file restored to its hash (M1 embed literal context removed; M2 example allowlist by pattern; M3/M4 retirement without archive/member hash; M5 example embed CSP drift; M6 unpinned example dependency; M7 embed framing ban not detached; M8 preview serves dot names; M9 no-embeds build writes embeds). First run missed M8 (test probed only non-existent paths); fixed with a real fixture (hidden file, nested hidden file, link) in `test-example.mjs`; second run caught all. The mutation runs overwrote `build/…evidence.json` with failed results; the candidate was then regenerated green.

Browser check history: first run failed on a wrong test assumption (frame content shorter than the 420 px start height cannot report less than its viewport) → start height set to 240 px; second run flagged the checker's own full-view tab as a popup → listener moved to `page.on('popup')`. Earlier failing JSON was overwritten, not preserved.

## Reproduce

```sh
cd <repo>
node scripts/prepare-reader-source-release.mjs --self-test
node scripts/prepare-reader-source-release.mjs            # add --online if the local npm cache lacks a locked tarball
python3 -c "import json;print(json.load(open('build/reader-source-release.manifest.json'))['uncompressedTarSha256'])"
node scripts/check-reader-example-browser.mjs --out docs/release-reader-v1-1-2026-10-29/check-example-browser.json   # needs ../book-engine/.venv Playwright + bundled headless shell
python3 docs/release-reader-v1-1-2026-10-29/check-guard-red-mutations.py   # then rerun the exporter: mutations overwrite build evidence
npm test
```

Clean-commit comparison: after committing, rerun the exporter and compare `files` and `uncompressedTarSha256` with `manifest-reader-source-release-v1.1.0.json` here.

## Limits

- Not reviewed independently. Not a release. Cloudflare and GitHub Pages behaviour of the example not observed. Netlify needs its own rule (stated).
- Browser: Chromium headless only; no Firefox/Safari, screen reader, real speech, touch, print or human visual review. Read-aloud, notes and settings were checked as present controls, not exercised.
- No EPUBCheck. Vite-built bundles: React licence comments not inspected.
- Isolation: undeclared imports could still resolve from a `node_modules` folder above the repository (one exists in the home folder); declared dependencies are proven local.
- Example `_headers` rules assume the site root; a sub-folder deployment needs adjusted paths (stated).
- Private root `package.json` has no example scripts; the example runs from its folder or via the public root scripts.
- `build/` is git-ignored: the archive, retired folder and candidate exist only on this machine.

## Parent to do

Independent review of the exporter diff, example server/build/headers and public docs; commit; regenerate from clean commit and compare; publish snapshot (never this history) to `techczech/onlinereaderframework`; tag v1.1.0 with `release-notes-reader-v1.1.0.md`; recheck the CHANGELOG link.
