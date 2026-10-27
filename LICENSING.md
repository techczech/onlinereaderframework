# Licensing summary

This repository has three kinds of material, and each has its own terms.

## 1. The framework software: MIT

All source code in this repository (`packages/reader-core/src`, the build scripts, the tests and the project page under `docs/`) is released under the MIT licence. The text is in [LICENSE](LICENSE). Copyright 2026 Dominik Lukeš.

Some of the code was first written in the author's earlier applications (Deliberate Practice, Building Your Language Muscle, ReadFlex and WriteFlex). The author holds the rights in those parts and releases them under the same MIT licence. `provenance-reader-source.json` names each original file and its SHA-256.

## 2. Fonts and icons: their own licences

The stylesheet build copies three font families into `packages/reader-core/dist/fonts` from the `@fontsource` packages listed in the lockfile. They are not under the MIT licence of the software. Each is under the SIL Open Font License 1.1, and its own notice is kept in `packages/reader-core/notices` and copied beside the fonts at build time:

| Font | Package | Notice file |
| --- | --- | --- |
| Inter | `@fontsource/inter` 5.3.0 | `packages/reader-core/notices/LICENSE-inter.txt` |
| Merriweather | `@fontsource/merriweather` 5.3.0 | `packages/reader-core/notices/LICENSE-merriweather.txt` |
| Material Symbols Outlined | `@fontsource/material-symbols-outlined` 5.3.9 | `packages/reader-core/notices/LICENSE-material-symbols-outlined.txt` |

Keep these notices with any copy of the fonts you distribute.

## 3. Books and other content: not included, not covered

This repository contains no book. The MIT licence does not apply to the text, images or covers of any publication built with the framework, including [Deliberate Practice](https://deliberatepractice.dominiklukes.net/), [Building Your Language Muscle](https://buildingyourlanguagemuscle.edutools.fyi/) and [Key Issues in Language](https://linguistics.dominiklukes.net/). Each of those has its own terms, set out on its own site.

## Dependencies

Dependencies are not copied into the repository. `packages/reader-core/package-lock.json` pins the exact versions that `npm run setup` installs, and each package keeps its own licence. The direct runtime dependencies are `@mdit/plugin-katex`, `hast-util-from-html`, `hast-util-sanitize`, `hast-util-to-html`, `hast-util-to-text`, `jszip`, `markdown-it`, `markdown-it-footnote` and `qrcode`. Counting their transitive packages, the lockfile's runtime set declares 84 MIT, 9 ISC, 2 BSD-2-Clause (`entities`), 1 PSF-2.0 (`argparse`), 1 `(MIT OR GPL-3.0-or-later)` (`jszip`, where the MIT option applies) and 1 `(MIT AND Zlib)` (`pako`). Build-only tools (TypeScript, Tailwind CSS, PostCSS and the font packages) are not shipped in the built package, apart from the fonts above.

If you bundle the built package into an application, check the licences of the dependencies that end up in your bundle. Some transitive packages add conditions beyond their top-level declaration, such as the Zlib notice in `pako`.

## Package registry

`package.json` still says `"private": true`, so `npm publish` refuses to run. This release is source on GitHub; it is not published to npm.
