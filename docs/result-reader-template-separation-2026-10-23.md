---
title: Reader release and verification template separation
date: 2026-10-23
register: FOR DOMINIK
status: implemented-and-verified
scope: Separate authored templates from the source-release and installed-package orchestrators
---

No action needed. FOR DOMINIK.

- **Both orchestrators now read separate templates.** Their generated JavaScript, consumer JSX/HTML and source README/licensing copy retain their original bytes.
- **The source candidate is identical.** The archive and complete manifest match the preliminary candidate byte for byte, with 66 files and zero changed members.
- **Installed-package verification passed offline.** The retained successful tarball matches its recorded SHA-256 and npm integrity.
- **Implementation ownership is released to the parent.** The bounded refactor is ready for its narrow final review; nothing is required from Dominik.

## Changes

The source exporter reads these files through its existing regular-file input function, which records their hashes and detects changes during the run:

- The exported native-import check comes from [the native-import template](../scripts/templates/reader-source-release/test-reader-native-import.mjs).
- The public source README comes from [separate Markdown](../scripts/templates/reader-source-release/README.md).
- The source licensing text comes from [separate Markdown](../scripts/templates/reader-source-release/LICENSING.md).

The installed-package verifier reads [the native-import probe](../scripts/templates/reader-package-consumer/test-reader-native-import.mjs), [consumer JSX](../scripts/templates/reader-package-consumer/consumer.jsx) and [consumer HTML](../scripts/templates/reader-package-consumer/index.html) from files beside the other templates. The native probe still executes in a fresh Node process rooted in consumer scratch. Its explicit public API assertions, including publicationDisplayTitle and its title/subtitle result, remain unchanged.

The exported native-import wrapper also retains its original child-process code so the source archive remains identical. All six template files were compared with the evaluated original literals before verification. Their whitespace, escaping and final-newline presence were preserved. README and licensing wording was extracted without revision; no publication prose was added.

Only the two assigned orchestrators, these six templates and this result note were authored. The public schema, file allowlist, archive construction, provenance projection, privacy checks, retained-tarball metadata and finally cleanup remain unchanged. No server is introduced; the existing consumer verification uses a Vite production build.

## Verification

The following commands exited successfully on Node v26.12.1 and npm 11.20.0:

~~~sh
node --check scripts/prepare-reader-source-release.mjs
node --check scripts/verify-reader-package.mjs
node scripts/prepare-reader-source-release.mjs --self-test
node scripts/prepare-reader-source-release.mjs --online
node scripts/verify-reader-package.mjs
~~~

The source preparation passed both linked and installed core builds, both native import checks, isolated npm installation and 29 Node tests (22 content tests and seven original-reader tests). The final source audit reported no issues, all three source templates appeared in captured input hashes, and no source input changed during the run.

**Source candidate comparison:** both the saved archive and complete manifest were compared against a pre-edit snapshot, rather than relying on the expected hash. The archive remains 101917 bytes with 66 files; no path, member hash, member size or manifest field changed.

~~~text
Source archive SHA-256:
1f9b3c0b8b6701758d31b715191d3bd5ed8ddb9938b2c53e940a12380779c792
~~~

The installed-package verifier passed the standalone CSS/font checks, actual-tarball exclusions, offline installation, native import, browser-only EPUB rejection and consumer production build. The retained tarball contains 205 files and 3518027 unpacked bytes. Its actual SHA-256 and SHA-512 integrity match [the package evidence](../build/evidence-reader-package.json), whose artifact field still names [the retained successful tarball](../build/reader-core-verified.tgz). Its SHA-256 also matches the pre-refactor retained artifact.

~~~text
Retained installed-package SHA-256:
f8f695b71f0cddc4a4f691dc238f8ef05ce2383a724c6bad63f4baf832aa42c5
~~~

The existing four installed-notice inventory findings remain recorded separately from the zero tarball-exclusion findings. Browserslist's stale-data advisory and Vite's chunk-size advisory were non-fatal.

A before/after comparison confirmed 10259 existing files under core and the demo's installed dependencies were unchanged, including shared core source, node_modules and dist. Both verification scratch roots were removed by their existing finally blocks; the comparison snapshot was removed after these checks. No Git mutation, deployment, publication or delegation was performed.

The parent can now run the narrow final review. Implementation ownership is released.
