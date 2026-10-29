---
title: Online Reader Framework v1.1.0 published and verified
date: 2026-10-29
status: published-and-live-verified
register: FOR DOMINIK
---

# Published release

[Online Reader Framework v1.1.0](https://github.com/techczech/onlinereaderframework/releases/tag/v1.1.0) is public under MIT. The [project site](https://techczech.github.io/onlinereaderframework/) is updated, and the [runnable example source](https://github.com/techczech/onlinereaderframework/tree/v1.1.0/examples/reader-example) is included. The public repository remains separate from the private book-integration history.

The release adds the current interactive-embed support, an original MIT example book with chapters, EPUB download and generated agent text, and updated documentation. The example includes a sandboxed interactive document and a written alternative. The documented no-embeds build supports hosts such as GitHub Pages that cannot send the required sandbox response headers. No runnable example was hosted on the project site; its source is downloadable and locally runnable. Five live books and the readability/academic reading foundations are linked from the project page.

Dominik authorised this work in chat: “yes, finish the framework release”. The separate WriteFlex reader-website/EPUB export-design thread remains outside this release. No book-site footer, manuscript edit, npm publication or website redesign was introduced.

## Frozen source and exact boundary

Private source freeze: `45976efbfa7261da079633f6d24d55f341c1989d`. The full exporter ran from that clean commit. All 146 exported member hashes and the uncompressed tar matched the independently accepted corrected candidate exactly. The normal commit hooks were retained. Nine private checksum inventories were losslessly changed from filename-keyed hash maps to explicit path/digest records after the secret hook misclassified their hashes; exact original-byte reconstruction is recorded separately. This changed no public candidate member.

Public commit/tag target: `caa3c8670db3e7fb51dc519164aa7c5ab7a68fec`. Only the 146 approved files were copied into the existing public-only checkout, then its entire Git index was checked against the approved manifest before commit/push. No private history or `.git` data was copied.

Published source archive: `reader-source-release.tar.gz`, 263,514 bytes, SHA-256 `479728473301002b3fc6ad5da09166bc0f30653a805bb2abc0eb1ac51e05c390`. Uncompressed tar SHA-256 `a24e3d2054bee50b879fc0570c951f07e35a00dbafd183e9d4c9c18c5ff5790f`. Release assets also include its 146-file manifest and checksum. The private source-export evidence was not uploaded.

The v1.0 annotated tag still resolves to `f8453b87307b8910ca096e3b832e36adc8ad0b9f`. Its published archive still matches original SHA-256 `502b7a14a3eb030a34a1038d249b2cd0f50a910a89883f365b2e6b9c29988e0b`. Both earlier local candidates and earlier review evidence are retained.

## Verification

The independent full candidate review and focused closure are clean within their stated scope. The clean exporter reran the privacy audit against 13,866 manuscript spans, isolated locked offline installs, package build, exported Node tests, native imports and both example modes. Example tests pass 10/10 per mode. The relevant bundled-headless browser suite passes 56/56. The copied public Git index matches the approved manifest exactly.

The three downloaded v1.1 release assets match local approved bytes exactly. Tagged changelog, licence and example README match the reviewed source. GitHub Pages reports the public commit built successfully, and its live HTML/CSS match the reviewed files. The normal personal-site framework record still links to that stable project URL; it contains no pinned old release number, so no site edit or deployment was needed. Unrelated website editorial work was preserved. The catalogue now records v1.1 and the updated Pages/GitHub Releases deployments; the old v1 release entry is retained.

Evidence: `verification-clean-source.json`, `manifest-clean-source-v1.1.0.json`, `evidence-clean-source-v1.1.0.json`, `verification-public-release.json`, `verification-live-documents.json`, `verification-retained-v1.json`, and the independent review/closure folders. The clean exporter raw log is `log-clean-source-export.txt`.

A first parent metadata check assumed the source commit field was named sourceHead; it was corrected to headAtStart/headAtEnd. A release invocation used the wrong relative asset path and created no release; existence was checked before retrying from the correct root. The v1.0 preservation check initially assumed a lightweight tag; the accepted check dereferences its annotated tag. These were parent verification/invocation errors, not changes to the candidate or release.

## Limits

Software/demo content is MIT; fonts and separately published books retain their own terms. The package is not on npm. The example was verified locally, not deployed as its own Cloudflare/GitHub Pages site. Chromium headless only, no new physical-device, screen-reader, real speech or EPUBCheck acceptance. Filesystem guards prove static-link refusal and the tested root replacement, not race-atomic protection against simultaneous local mutation. An undeclared import resolving from an ancestor node_modules remains a disclosed installation-test limitation; all declared dependencies were proven local to the isolated test copy. No broader compatibility or hosted-example claim is made.
