---
title: Reader MathML selection capture and restoration repair
date: 2026-10-23
register: FOR DOMINIK
status: implementation-complete-ownership-released
agent: Codex implementation sub-agent
sources:
  - result-reader-mathml-text-fix-2026-10-23.md
  - ../research/evidence-reader-mathml-selection-before-2026-10-23.json
verified_source_sha256:
  publication-html.ts: 944b35bec537915d31e1d2900fada2867b68d9349d183ec914850e6b32b66dc6
  use-publication-reader.ts: 92e5873ac72090057bb9b1a61d9d4532fe648998abfcbd0c37b03fe15dc5a6d8
  test-original-reader-browser.mjs: e916d62e6c9668b13dd7f21babe8f3d27f1a00ba87aa8ee6d55e1bce522e3398
  test-original-reader-headless.mjs: 7e2fb1be1d2745cf05da295b886b499c2e21d8639e15c4ca306aa4a971b62861
---

No action needed. FOR DOMINIK.

- **The actual reader now saves canonical quotations across maths.** Selection, Highlight, note editing, navigation and full page reload pass through the public React component.
- **Maths highlighting preserves the formula tree.** Existing MathML tokens receive the original yellow highlight colours; HTML marks remain outside MathML.
- **All 160 browser checks and 36 Node tests passed.** Implementation ownership is released to the parent for the final audit and release work. Nothing is required from Dominik.

## Reproduced failure and repair

The supplied selection evidence was reproduced in bundled headless Chromium against the current checkout. Selecting the rendered paragraph from `Before $x$ after.` produced these exact values:

```json
{
  "Selection.toString()": "Before \n𝑥\n after.",
  "Range.toString()": "Before xx after.",
  "savedBefore": "Before 𝑥 after.",
  "savedAfter": "Before x after."
}
```

The regression was written and run before changing production code. The real Highlight button saved the rendering-dependent italic character. The saved note survived storage, but the quotation could not match the canonical reader model, so neither the highlight nor its margin note restored.

`use-publication-reader.ts` now captures `publicationTextModel(range.cloneContents()).text`. This uses the selected DOM range and the same visible-text rules as search and restoration. It retains authored Unicode rather than converting the browser's rendered mathematical alphabet. The existing exclusions for MathML `annotation`, `annotation-xml` and `mphantom`, and the existing Unicode offset mapping, remain intact.

Applying only that capture repair made canonical quote persistence and note restoration pass. The same UI regression then failed 18 formula-tree and namespace assertions: the existing decorator inserted HTML `<mark>` elements inside MathML `<mi>`, `<mo>` and `<mn>` tokens. The bounded correction in `publication-html.ts` adds the original amber background and text colour classes plus the highlight identifier to the existing MathML token. It adds no MathML children, changes no token text, preserves existing attributes/classes and leaves annotation subtrees intact. Ordinary HTML keeps its existing range-based marks.

## Verified React flows

The new browser regression mounts the public `PublicationReader` with four isolated test sections:

1. The simple maths paragraph selects and saves exactly `Before x after.`.
2. The mixed paragraph selects and saves exactly `İ 😀 Before bold x+1 and linked after.`, across ordinary text, bold text, native MathML and a link.
3. The ordinary paragraph selects and saves exactly `Working memory and a link boundary`, after an authored `İ 😀` prefix and across bold/link boundaries.
4. Selecting only the visible maths identifier saves exactly `x` and restores its yellow decoration and margin note.

For every section, Python Playwright creates a real browser Selection, clicks the real Highlight button and fills the React note input. It verifies the saved quotation and note in browser storage, closes the drawer, navigates to another section using the reader's navigation, reopens the notes drawer and returns by clicking the saved note's section button. It then performs an actual `page.reload()`, mounts the current source bundle again and verifies restoration from browser storage. The test never calls the reader hook's save or navigation handlers directly.

At initial save, note navigation and full reload, assertions verify the exact decorated quotation, unchanged canonical visible text, yellow painted geometry, preserved bold/link source, visible margin note, unchanged complete formula/annotation structure after removing only decoration attributes, unchanged formula dimensions, and no foreign HTML anywhere in the generated MathML. Note navigation also retains the canonical quotation in the URL; the note input restores after reload. These are **112 assertions through the actual React reader**, separate from the existing helper-range tests.

## Verification

Both commands exited **0** against the final source:

```sh
node packages/reader-core/src/original/test-original-reader-headless.mjs
npm test
```

The browser command passed 14 original reader checks, 12 Unicode annotation checks, 20 hidden-MathML checks, 2 quote-image identity checks and 112 actual selection/annotation UI checks: **160 total**. The focused selection suite also passed before the final exact-text and formula-dimension assertions were added. The earlier capture-only run established that all quote/note flow assertions passed while the 18 MathML structure/namespace assertions still failed; the final run closes those failures.

The Node command passed 23 publication-content tests, 8 original-reader tests and 5 real-book tests: **36 total**. This includes a fresh complete core TypeScript compilation and native ESM import into removable repository-owned scratch. `git diff --check` also passed.

The harness bundles the current checkout in memory and uses the existing local preview at port 8773 only for production CSS. Its existing Python Playwright environment is the sibling `book-engine/.venv`; its browser is bundled **Chromium headless shell 153.0.8010.12**, cache build `chromium_headless_shell-1243`. This UI run uses the demo's installed **React 18.3.1**. It launches no real Chrome and adds no browser, server, framework or dependency. The fixture route now matches query strings so navigation and reload continue to load the test document. Repository-owned browser and TypeScript scratch is removed on completion.

## Remaining limits and ownership

Native `Selection.toString()` still exposes rendering-dependent mathematical Unicode, and native `Range.toString()` still includes preserved hidden annotation text. Those DOM API behaviours remain; production quote capture uses neither serialisation. No old saved quotation is migrated.

MathML decoration colours an existing source token. Selecting part of a multi-character token retains the exact selected quotation but colours that token as a unit; this repair does not split or semantically rewrite expressions. It introduces no maths speech or new annotation interface. The browser evidence covers the four stated selection flows in bundled Chromium, not browser engines or input gestures outside that run. The parent's already-passing React 18/19 compatibility matrix was not rerun or changed here. Rebuilding release artefacts, the final audit and release acceptance remain with the parent.

Only `publication-html.ts`, `use-publication-reader.ts`, `test-original-reader-browser.mjs`, `test-original-reader-headless.mjs` under `packages/reader-core/src/original/`, and this requested receipt were edited. Other workers' changes were preserved. No Git mutation, manifest edit, deployment, push, secret or `.env` access, or delegation occurred. **Implementation ownership is released. Nothing is required from Dominik.**
