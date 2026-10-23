---
title: Publication content renderer and integration contract
status: implemented
updated: 2026-10-23
---

# Publication content

The module provides synchronous rich HTML, complete search text and heading targets for the original reader. It supports browser bundles and server-side rendering without `window`, `document` or a DOM shim.

## Exports

```ts
renderPublicationContent(content: string, format: 'markdown' | 'html' = 'markdown'): string
publicationContentToText(content: string, format: 'markdown' | 'html' = 'markdown'): string
getPublicationHeadings(content: string, format: 'markdown' | 'html' = 'markdown'): PublicationHeading[]

interface PublicationHeading {
  id: string;
  text: string;
  level: number;
}
```

The parent owns the package barrel. Import these functions from this module and re-export the three functions and, if useful, the `PublicationHeading` type. All three functions use the same sanitised content-tree pipeline. Pass the section's original content and format to each function. Do not independently parse source headings or strip markup with regular expressions. Hosts can memoise results for a section.

Search text includes every paragraph, table cell, code block, footnote and image alternative. Inline formatting does not split phrases such as `working **memory**`. Maths contributes its TeX annotation once. The helper is plain text, not an escaped HTML fragment; insert it as text when showing search results.

## Parsing, sanitisation and anchors

[Markdown-it](https://github.com/markdown-it/markdown-it) handles CommonMark syntax, tables, strikethrough, autolinks, nested formatting, reference links and escaped code. [Its footnote plugin](https://github.com/markdown-it/markdown-it-footnote) handles reference notes, repeated references and inline `^[notes]`. There is no custom Markdown grammar.

The HTML output and supplied HTML both pass through the HTML5 parser `hast-util-from-html`, [hast-util-sanitize](https://github.com/syntax-tree/hast-util-sanitize) and the HTML serializer. The schema preserves the original Language Muscle classes. It removes executable elements, event properties, arbitrary data properties, names, inline styles and unsafe URL schemes. Links allow HTTP, HTTPS, mail and telephone schemes; images allow HTTP/HTTPS and relative URLs. Data, blob, file, JavaScript and VBScript URLs are excluded. Checkboxes are always disabled. Code examples remain escaped text.

Source IDs receive the `reader-content-` namespace to avoid DOM clobbering. Supplied IDs already in that namespace retain priority and their exact value unless duplicated. Remaining collisions receive deterministic numeric suffixes. Existing fragments, footnote targets, return links, ARIA references and local diagram references are updated together. Generated heading IDs support Unicode and come from the parsed heading text. Unknown fragments, including the original `#/chapter` routes, remain intact for the reader's route handler. IDs are unique within one rendered section; hosts showing several sections simultaneously must isolate them or add a separate namespace.

After sanitisation, the module only assigns IDs and rewrites validated local references on tree nodes, then serialises them with escaping. The returned HTML is the insertion boundary. Later annotations must use DOM text/range operations and safe element APIs; interpolating unsanitised text or notes into this HTML would invalidate that boundary. Re-rendering the output in `html` mode is idempotent.

The original Language Muscle cone diagram is retained through an explicit static SVG subset: shapes, text, a gradient and markers. Its two gradient style declarations become validated presentation attributes. Gradient and marker references stay local and follow renamed IDs. SVG scripts, embedded HTML, animation, images, external resources and arbitrary styles are excluded. Table text alignment similarly becomes a validated HTML alignment attribute.

## Maths and styling

[@mdit/plugin-katex](https://mdit-plugins.github.io/katex.html) uses KaTeX with `output: 'mathml'`, `trust: false`, bounded expansion and bounded size. Dollar delimiters, LaTeX bracket delimiters and fenced `math` blocks are supported. Unsupported maths remains readable rather than aborting a chapter. Macro state resets between render calls.

**This renderer needs no KaTeX CSS or KaTeX fonts.** It emits native MathML, not KaTeX's positioned HTML layout. [KaTeX documents this output option](https://katex.org/docs/options). Modern browsers render the MathML directly; an older browser without MathML support may display maths poorly. The retained `katex` and `katex-block` classes are wrappers, not a dependency on KaTeX's stylesheet. A future switch to `htmlAndMathml` would require a different sanitisation policy and bundled KaTeX styles/fonts.

The reader's own typography, icons and Tailwind classes still require the parent's original-reader stylesheet package. The core manifest exports `reader-core/reader.css` and marks CSS as a side effect. The parent generates that stylesheet and its assets; this worker did not run the stylesheet build.

## Checks

From `packages/reader-core`:

```sh
npm run test:publication-content
node src/publication-content/check-original-publication-content.mjs
npm run build
```

The first command compiles only this module and runs Node's built-in test runner. Its temporary output stays inside this directory and is removed in `finally`. The source-check script uses the existing demo's esbuild installation, bundles in memory and reads the two original worktrees without changing them. It also checks the demo's imported books. See [the evidence report](report-publication-content-2026-10-23.md) for results and limits.

Dependencies were installed with `--min-release-age=7 --ignore-scripts` and pinned in the owning package lockfile. The chosen math plugin requires Node 22 or newer for its supported tooling environment. The original quote modal additionally requires `qrcode@1.5.3` and `@types/qrcode`; those belong to the copied reader UI, rather than this content module.
