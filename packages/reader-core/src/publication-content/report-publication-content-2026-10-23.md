---
title: Publication renderer implementation evidence
status: implemented-module-checks-passed
updated: 2026-10-23
scope: Publication content module and reader-core manifest dependencies
---

# Publication renderer evidence

**The renderer is implemented and its module checks pass.** The core TypeScript package also builds. Browser layout, installed-package styling, annotations and final independent review remain integration checks for the parent.

- The renderer preserves rich Markdown and original Language Muscle HTML classes and its static diagram.
- Search text and heading targets use the same sanitised tree pipeline as rendered HTML.
- Maths uses native MathML and requires no KaTeX stylesheet or fonts.

## Changed files

The owned module contains `index.ts`, `publication-schema.ts`, `publication-content.test.mjs`, `test-publication-content.mjs`, `check-original-publication-content.mjs`, this report and its [integration README](README.md). The package manifest and lockfile add the renderer dependencies, a test command, the requested stylesheet export/side-effect declaration, and the original quote modal's `qrcode@1.5.3` with `@types/qrcode@1.5.6`.

No original-reader component, demo, package barrel or stylesheet source was edited by this worker. The core build generated its usual distribution output. No Git mutation, secret read, deployment, original-worktree modification or further delegation occurred.

## Verification

`npm run test:publication-content` compiles the module independently and passes **23 Node built-in tests**. Tests cover complex nested/reference links, quoted `>` attributes, reference and inline footnotes with repeated references and return targets, image alt text, GFM tables, nested lists, fenced code, MathML, complete text beyond the previous excerpt limit, deterministic heading IDs, supplied-ID collisions, eight malicious HTML/URL cases, static SVG preservation/security, sanitisation idempotence and macro isolation. Feature regressions were observed failing before their implementation. Temporary compilation directories are removed after each run.

`node src/publication-content/check-original-publication-content.mjs` passes. It builds the browser-targeted module entirely in memory and executes it in a JavaScript context with no Node or DOM globals. It then reads the actual original source modules and checks every section for nonempty output/text, unique IDs and idempotence.

For Language Muscle, all **12 sections and 99 headings** pass; all **363 class-bearing elements** retain their original class lists. Its one SVG diagram retains the original shape, text, gradient and marker counts. For Deliberate Practice, all **21 sections and 156 headings** pass. The source SHA-256 values are:

```text
Language Muscle bookContent.ts
bda8e81df46e5c633969a695fc0fc26994b62aac472bcd8787bdfd4268411698
Deliberate Practice data.ts
d6bef0e8f811d06a7bfcf4d1386ba8dbd92667f9e0297c3bc174e7f2d83c5f30
```

The same script checks the parent's imported demo data separately. It passes for Deliberate Practice's 21 sections, Language Muscle's 12 sections and Linguistics' **253 answers, six content headings and 1,204 links**. These adapter checks establish renderability, nonempty complete text, unique IDs and idempotence; they do not independently establish adapter completeness against every upstream answer.

`npm run build` completes with exit status zero after the requested QR-code dependencies are installed. Both dependency-install commands used `--min-release-age=7 --ignore-scripts`, with npm's cache kept under the core package. The final install audited **117 packages with zero reported vulnerabilities**. This applies to the core package at that check, rather than the separately managed demo dependency tree.

## Adaptations and limits

Source IDs outside `reader-content-` are namespaced and their local references change with them. IDs already in that namespace retain priority; duplicates receive suffixes. This preserves compatible supplied IDs and avoids clobbering browser globals. The scope is one rendered section. The contents list should use `getPublicationHeadings` or the actual rendered DOM, rather than an independent source slugger.

The static SVG allowance exists because the actual Language Muscle source contains the cone diagram at `bookContent.ts:690–741`. Only its required static elements and presentation properties are supported. Gradient styles become validated attributes, and local SVG references are rewritten with IDs. Unsupported embedded/interactive resources are removed. This is deliberately narrower than arbitrary SVG support.

KaTeX emits only MathML, with trust disabled and expansion/size bounded. No KaTeX CSS/font files need adding to the parent's style pack. This uses modern browser MathML support; no live browser layout comparison or old-browser compatibility check was performed. The math plugin's supported tooling environment requires Node 22 or newer.

The returned HTML has passed sanitisation before deterministic tree-level anchor changes and escaped serialisation. The UI worker owns safe DOM range annotation decoration and the final insertion boundary. This module's string tests do not establish highlight recovery, rendering-boundary browser exploit resistance, responsive design fidelity or installed-package styling. The parent owns those integration checks and the final Astra review.

## Sources

The upgrade plan and initial architecture review were read from the repository's `docs/` directory. Original content authority was `/Users/dominiklukes/worktrees/guides/building-your-language-muscle/bookContent.ts` and `/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/data.ts`; both stayed read-only. The sibling original-reader audit supplied component/source context.

Primary library documentation checked during implementation: [Markdown-it](https://github.com/markdown-it/markdown-it), [its footnote plugin](https://github.com/markdown-it/markdown-it-footnote), [the HTML parser](https://github.com/syntax-tree/hast-util-from-html), [the sanitiser](https://github.com/syntax-tree/hast-util-sanitize), [plain-text extraction](https://github.com/syntax-tree/hast-util-to-text), [the maths plugin](https://mdit-plugins.github.io/katex.html), [KaTeX output/trust options](https://katex.org/docs/options), and [npm's minimum-release-age setting](https://docs.npmjs.com/cli/v11/using-npm/config/#min-release-age).
