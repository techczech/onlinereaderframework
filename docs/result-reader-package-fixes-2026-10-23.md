---
title: Reader package build and native Node import fixes
date: 2026-10-23
register: FOR DOMINIK
status: implemented-and-verified
scope: Complete standalone core package build and native ESM compatibility
reviewed_baseline: 08324558cd38c0f05467522be4fe0940fe8854e7
---

No action needed. FOR DOMINIK.

- **The core build now creates every advertised export**, including the stylesheet, bundled fonts and three font notices, without demo dependencies or manuscripts.
- **An actual tarball installs offline and imports in native Node** without browser globals. The installed Vite consumer also builds with its exported CSS.
- **Original styling is preserved.** Core owns the existing CSS, Tailwind configuration, pinned font/build dependencies and a text fixture containing actual publication classes.
- **Package ownership is released to the parent.** The parent owns the final shared build, release-plan update and notice reconciliation. Nothing is required from Dominik.

I read the complete [package review](review-reader-epub-package-2026-10-23.md) and [original upgrade plan](plan-original-reader-upgrade-2026-10-23.md). This change addresses Standards 3 and the native ESM limitation in Standards 4. The EPUB service and original reader modules remained with their other workers.

`npm --prefix packages/reader-core run build`, from the monorepo root, now cleans generated output, compiles JavaScript and declarations, then builds CSS and fonts. The root build invokes this complete command once and subsequently builds the demo; its redundant separate styles invocation is removed. Root build scripts remain required monorepo inputs. No dependency on demo installation, imported books or original-source worktrees remains in either core build script.

Core devDependencies now own the existing installed font and styling versions: Inter 5.3.0, Merriweather 5.3.0, Material Symbols Outlined 5.3.9, Tailwind 3.4.19, typography plugin 0.5.20, PostCSS 8.5.30 and Autoprefixer 10.6.1. The core manifest and lockfile match. Installation used npm offline, ignored lifecycle scripts and retained `min-release-age=7`. The parent's `qrcode` 1.5.4 patch remains; `encode-utf8` is absent from the core lockfile.

The core stylesheet input is byte-identical to the source demo's existing CSS. Tailwind's dark mode, theme, typography, animations and plugin configuration are equivalent; only content discovery changes to core-relative inputs. The text fixture contains all 66 unique classes extracted from actual Language Muscle section HTML, plus the original Deliberate Practice host-body classes retained by the demo. It contains no author prose. This also retains `antialiased`, which had previously come only from the demo's HTML. Original reader CSS is concatenated without alteration. Font faces, weights and filenames use the same existing font packages. Source demo CSS, HTML, configuration and imports were not edited.

The public barrel and 14 owned legacy files now use explicit `.js` relative specifiers. Directory exports name `/index.js`. Existing exported APIs are preserved, as are TypeScript's existing Bundler resolution and Vite's source alias. The UI and EPUB workers supplied their own corresponding import fixes. A final static scan found no remaining extensionless static or dynamic relative imports in core TS/TSX files; no outside-ownership edits remain for the parent to request.

**Failing checks preceded fixes.** The added isolated-build regression first compiled successfully, then exited 1 with `Standalone core build must create its exported reader.css`. The installed-tarball Node check then exited 1 with `ERR_MODULE_NOT_FOUND` for `reader-core/dist/types`, before the legacy import changes. A separate CSS requirement first failed with `Missing original reader styling: .antialiased`, then passed after retaining the actual host-body classes in the fixture.

**Final verification passed** on Node v26.12.1 and npm 11.20.0:

```sh
node scripts/verify-reader-package.mjs
npm --prefix apps/reader-demo run check
```

The package verifier builds a fresh isolated monorepo containing core and the two root build scripts. It excludes shared `dist` and links only core's own installed dependencies. The demo, its dependencies, manuscripts and original worktrees are absent from that build tree. It checks CSS, all fixture classes, typography/animation/dark-mode requirements, original CSS preservation, 112 local font references and all three font notices.

It then packs that generated core, checks its actual bytes with the existing distribution auditor, installs the actual tarball offline, and runs a fresh native Node process. The process confirms that `window`, `document`, `DOMParser` and `XMLSerializer` are absent; imports `reader-core`; checks old and new public functions; renders Markdown; and verifies that both publication EPUB generation/download calls reject with the intended browser API requirement. The installed consumer imports the package and `reader-core/reader.css` without a source alias and completes a Vite production build. Installation and build scratch are removed in `finally`; no package-consumer scratch directories remained.

The full verifier still uses the demo's existing Vite for the separate consumer check and real-book inputs for the distribution auditor. Those are verification dependencies, not core build dependencies. `node scripts/verify-reader-package.mjs --standalone-only` exercises only the complete isolated core build and CSS/font checks. Neither command touches shared core `dist`.

An additional comparison passed for byte-identical input CSS, equivalent Tailwind configuration excluding discovery paths, manifest/lock synchronisation and the retained qrcode patch. The source demo's TypeScript check passed after the explicit `.js` changes. No shared root build, browser interaction or visual-acceptance check was run by this worker. Tailwind's stale Browserslist-data advisory and Vite's existing large-chunk advisory were non-fatal and remain visible.

The final tested package contained 205 files and 3517858 unpacked bytes. It passed the auditor's actual-tarball allowlist, export-target, private-path, source-map and manuscript-span exclusions with zero pack findings. These remain the existing auditor's documented heuristics, not rights clearance. The tarball was removed with installation scratch; the built consumer and detailed JSON evidence remain in `build/packaged-consumer-dist/` and `build/evidence-reader-package.json`. Concurrent work means the parent should freeze its own final tarball after integration.

```text
Tested tarball SHA-256: dd0259f226760243cf7b5cd8577c5aa0282a274dd6e9de0c548c2670e3e75be6
Generated reader.css SHA-256: 3979e073b4265f4a99544a06e1eb668a6f058d0537f5dc34fe5d224cf5decf3a
Core package-lock.json SHA-256: 3e396594fc23ac30d019f675ed3e0221d8e74f5f0d339bfa4e988c762fcf011e
Core styles/reader.css SHA-256: 25c154c986ef62444b277e360238304e1146f8c0c1f97701abf13dc674751b95
Core styles/tailwind.config.cjs SHA-256: 9a7f9dbee8a397d945350416544a9bafb7d02150ae5f634898f878cad38f3970
Core styles/publication-classes.txt SHA-256: fbf970067a7b252a01a16fb869282da4fb28d5e9d1311c401d65cb385fe60373
Original reader CSS SHA-256: e7f02c42795a247bcad4af281667a365b0fb361b695bb0db4c696cfefff9509f
```

**The installed-notice inventory remains separate from the passing package audit.** It reports four missing-notice locations: the demo's Darwin esbuild binary, Darwin Rollup binary and `dlv`, plus core's newly installed development copy of `dlv`. These are recorded in the detailed JSON evidence and have been reported to the parent for reconciliation with the supplemental-notice evidence. The verifier does not describe that inventory as passing.

Changed ownership covers root `package.json`; core `package.json` and `package-lock.json`; the three assigned build/verification scripts; three new files under core `styles/`; the public barrel; and legacy relative-import declarations in the existing adapter, navigation hook, utilities, old EPUB generator, block renderer, reader components and tool panels. No core TypeScript configuration change was needed. No original reader, publication-content or publication EPUB service file was edited by this worker. No originals, secrets, `.env` files, Git state, deployment or publication were modified. The package retains `private: true`.

The parent can now checkpoint these owned files, run its final shared build and update the release-plan commands and completed status. **Package ownership is released; no action is needed from Dominik.**
