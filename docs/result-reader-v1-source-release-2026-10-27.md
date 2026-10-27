---
title: Online Reader Framework v1.0.0 public source candidate
date: 2026-10-27
register: FOR AGENTS
status: candidate-prepared-not-published
---

Builder receipt. Nothing was committed, pushed, published, deployed or sent to npm. No browser or screenshot run (Terra later). Not an acceptance claim.

## Authorised scope (user, 2026-10-27)

v1.0.0, open source MIT, GitHub Pages project page, website link, credit/links to readability and academic-reading guides. "Built with" links on books: future, not added. Package stays `private: true`; no npm publish.

## Candidate

- Folder: `build/public-reader-source/` (git-ignored). Archive `build/reader-source-release.tar.gz`, `…manifest.json` (per-file SHA-256 and size), `…sha256`, `…evidence.json`.
- Archive SHA-256: `c030a57cb4aeb1ec30ea15d023f7acf76e0de243b95692c706e0786c1058223d`. 125 files, 223,581 bytes. Deterministic: two consecutive runs gave one hash. The hash depends on file content only, not on Git state; a rerun after the parent commits the owned files must give the same hash.
- Regenerate: `node scripts/prepare-reader-source-release.mjs --online` (offline default fails ENOTCACHED for `@types/qrcode` in the local npm cache; `--online` only fetches lockfile-pinned registry tarballs, lifecycle scripts off, `--min-release-age=7`). `--self-test` runs the audit self-tests alone.
- Source HEAD at run: `24ff25434457928cacdfedc8f91645d58c2615c0`, working tree dirty. Node v24.22.1, npm 11.19.1. No input changed during the run.
- Checks in an isolated scratch copy (removed afterwards, `scratchRemoved: true`): linked-core build and native import; real `npm ci`; build; `npm test` (publication content 22 pass, agent export 15 pass, node tests 71 pass, 0 fail); native package-name import incl. agent-file generation and the browser-only EPUB boundary. Generated `reader.css` SHA-256 `e19a2aa55ec9d853b9a77a15086dcce6b6433b50b8bdff57d50bbed63f0501a4`, local fonts only, no external URL; unchanged by the lock change below.
- README snippets checked separately in a scratch install of the candidate (removed): the `PublicationReader`/`ReaderShell` TSX example type-checks (tsc strict, 0 errors); the `reader-core/agent` example runs and writes `agent/<id>/{index.md,chapters/…,full.md,manifest.json}`; each named export in "Other exports" is a function or object.

## Files that go public (allowlist, 125)

`.gitignore`, `LICENSE`, `LICENSING.md`, `README.md`, `package.json`, `provenance-reader-source.json`, `docs/index.html`, `docs/style.css`, `docs/.nojekyll`, `scripts/{build-reader-core,build-reader-styles,test-reader-native-import}.mjs`, `packages/reader-core/{LICENSE,package.json,package-lock.json,tsconfig.json,styles/*,notices/LICENSE-{inter,merriweather,material-symbols-outlined}.txt}`, all 92 `.ts/.tsx/.css` under `packages/reader-core/src`, and 11 Node tests. Wording sources: `scripts/templates/reader-source-release/{README.md,LICENSING.md,site/index.html,site/style.css,test-reader-native-import.mjs}`. No Actions workflow (parent's choice: publish `main`/`docs`).

## Private exclusions

- Not exported: `apps/`, `docs/` of this repo (original docs), `research/`, manuscripts, `original-publications.json`, reports, receipts, screenshots, browser/headless scripts, `report-*.md`, `.node-version`, anything outside the allowlist. Audit: 12,831 manuscript anchors from the real book JSON found in no exported file; private-path, credential-shaped and forbidden-path checks clean.
- Tests changed on export: `publication-content.test.mjs` and `test-original-reader.mjs` omit one real-book test each (as before). `agent-export.test.mjs` is filtered: 15 generic tests kept; 11 that read the three real books or the WriteFlex checkout are dropped by name (listed in the evidence file). A retained-text check fails the run if a real book id, `books` variable, `/Users/dominik`, `apps/reader-demo` or `writeflex-desktop` survives.
- Audit exceptions (exact literals, per file, all reported in the evidence): `file:///etc/passwd` (publication-content, 1); `file:///a.wav` (listening); in `agent-export.test.mjs` `file:///tmp/x`, `file:///tmp/book`, `file:///etc/`, `file:///Users/reader/dist/index.html`, `file:///Users/reader/dist/agent/`, and three `https://u:p@…example.org` credential-in-URL rejection inputs. All invented. Everything else in those files is still audited. Self-tests cover path-specificity and that an unlisted file address is flagged.
- Public Git history: the parent publishes only this snapshot from a clean checkout; the working branch and its history must never be pushed.

## Licence components

- Software: MIT, copyright 2026 Dominik Lukeš (`LICENSE`, also `packages/reader-core/LICENSE`). Root and core manifests: version 1.0.0, `license: MIT`, author, homepage, repository, `private: true`. Core lock synchronised (`version`, `license`).
- Fonts (OFL-1.1, own notices, kept separate from the MIT grant): Inter 5.3.0, Merriweather 5.3.0, Material Symbols Outlined 5.3.9. Notice files copied from the built `dist/fonts` and recorded with SHA-256 in the evidence.
- Books: none included, none covered. `LICENSING.md` and the page say so.
- Runtime dependency set (from the lock): 84 MIT, 9 ISC, 2 BSD-2-Clause (`entities`), 1 PSF-2.0 (`argparse`), `jszip` (MIT OR GPL-3.0-or-later; MIT option), `pako` (MIT AND Zlib). Not vendored. Statement about bundling is in `LICENSING.md`.
- Provenance: 13 recorded component origins from the Deliberate Practice and Language Muscle apps plus 2 EPUB service origins, with the original file names and hashes (no local paths), and two reused-from-own-apps entries (ReadFlex speech contract, WriteFlex `leadLength`/anchored reading). Rights in those parts are asserted by the author's instruction; I did not independently verify third-party content inside the originals.

## Lock and security

`npm audit` on the core lock before: 0 critical, 0 high, 2 moderate (`@tailwindcss/typography` → `postcss-selector-parser` 6.0.10, dev only). Fixed with `overrides: { "@tailwindcss/typography": { "postcss-selector-parser": "6.1.5" } }` in `packages/reader-core/package.json` and a regenerated lock (6.1.5 released 2026-10-19, passes the 7-day age rule). `npm audit` after: 0 vulnerabilities. The lock also drops two now-redundant nested 6.1.4 copies. Build output (CSS) is byte-identical. The demo's own lock is untouched (not mine).

## Project page

`docs/index.html` + `docs/style.css` + `docs/.nojekyll`, static, no JavaScript, relative asset links (works under `/onlinereaderframework/`), `lang="en-GB"`, one h1, header/nav/main/footer, skip link, visible focus, responsive grid, light/dark via `prefers-color-scheme`, reduced-motion respected. Title "Online Reader Framework: a React reader for books on the web". Target URL https://techczech.github.io/onlinereaderframework/ (canonical link set). Checked offline: anchors resolve, no root-absolute links. Checked by HTTP HEAD on 2026-10-27: 200 for the three book sites (deliberatepractice.dominiklukes.net, buildingyourlanguagemuscle.edutools.fyi, linguistics.dominiklukes.net), https://readability.edutools.fyi/, https://academicreading.edutools.fyi/, https://readabilityprinciples.notion.site, https://dominiklukes.net/, and the GitHub repository, `/releases`, `/issues`. Expected 404 until publication: the Pages URL itself, `blob/main/LICENSE` and `blob/main/LICENSING.md`. Contrast not measured; colours chosen conservatively. No rendering run.

## Feature limits stated publicly

Front-end only; local-storage notes per book; read-aloud depends on browser voices; EPUB needs a browser; not on npm; browser-interaction scripts not distributed. No claim anywhere about the older demo Markdown-uploader app; the README describes the retained `ReaderShell` as a smaller reader with its own section type, and `PublicationReader` as the full reader.

## Flags

- Review owed (changed write-path / new public interface): the exporter's new `keepGenericTests` filter and literal exceptions (privacy gate widened by exact literals), and the new public package surface (README contract, `reader-core/agent` documented as public). Suggest cross-family review of `scripts/prepare-reader-source-release.mjs` before the first push.
- Parent to do: confirm the three book terms before saying more than "not covered"; create the GitHub v1.0.0 release/tag; enable Pages from `main` `/docs`; recheck the 404 links after publication; decide whether `.gitignore` entry `build/` and the private repo's own root `LICENSE` (copied from this repo, which also holds the books privately) cause confusion — the private repo now contains an MIT `LICENSE` file; it is not published, but it should not be read as covering the books there.
- Deliberate Practice EPUB asset `command-line_gray.svg` redistribution rights (noted by the book-release worker) are unrelated to this source release; no book assets are in it.
- Not touched: `apps/reader-demo`, `scripts/release/`, `packages/reader-core/src` runtime code.
- Changed in the private repo (uncommitted): `LICENSE`, `package.json`, `packages/reader-core/{package.json,package-lock.json}`, `scripts/prepare-reader-source-release.mjs`, `scripts/templates/reader-source-release/**`, this file.
