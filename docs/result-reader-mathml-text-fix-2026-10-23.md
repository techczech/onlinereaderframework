---
title: Reader MathML visible-text repair
date: 2026-10-23
register: FOR DOMINIK
status: implementation-complete-ownership-released
agent: Codex implementation sub-agent
source_sha256_original_module:
  publication-html.ts: 08b3989164082381941433e014d9c7a251bc89ca44e46bbb301a290043655e0e
  test-original-reader-browser.mjs: ec75dc85cb9c02240b91408b428f700c8577e8ac245090497b45231131bef657
  test-original-reader-headless.mjs: 4ff587dc70a74cfda767e29f6be9a67efaf53c1a2a0e02db63946a45661dcd3c
---

No action needed. FOR DOMINIK.

- **The reader now includes rendered maths text once.** Hidden MathML alternatives and phantom text no longer enter its shared visible-text model.
- **All 36 existing Node tests and 48 browser checks passed.** The browser run includes 20 new MathML checks.
- **Implementation ownership is released.** The parent retains rebuilding, final audit and release acceptance. Nothing is required from Dominik.

## Observed defect and correction

The supplied [before evidence](../research/evidence-reader-mathml-text-before-2026-10-23.json) was reproduced independently in the existing headless browser harness. These are the exact observed strings, including whitespace:

```json
{
  "source": "Before $x$ after.",
  "before": {
    "publicationPlainText(renderPublicationContent(source))": "Before xx after.",
    "publicationContentToText(source)": "Before  x  after."
  },
  "after": {
    "publicationPlainText(renderPublicationContent(source))": "Before x after.",
    "publicationContentToText(source)": "Before  x  after."
  }
}
```

The DOM traversal visited both the visible `<mi>x</mi>` and the invisible `<annotation encoding="application/x-tex">x</annotation>`. [publication-html.ts](../packages/reader-core/src/original/publication-html.ts) now excludes `annotation`, `annotation-xml` and `mphantom` subtrees only when their namespace is `http://www.w3.org/1998/Math/MathML`. Ordinary HTML elements with those names remain readable. Visible MathML identifiers, operators, numbers and text remain in the model.

The production change adds exactly three lines: a set of excluded local names, a comment and the namespace-aware early return. Removing those additions reproduces the supplied original helper SHA-256, `7bee6cfbd656bdb80971f6aa86ba92e6b71e15edc4d64b2b5dd1276bcf0fc98b`. The Unicode fold mapping and both range consumers therefore retain their existing code. Search in `Sidebar.tsx` and read-aloud in `MarkdownRenderer.tsx` already obtain their text through `publicationPlainText`; neither caller needed an edit.

## Test-first browser evidence

The new `runOriginalReaderMathMLChecks` suite was added to [the existing browser regressions](../packages/reader-core/src/original/test-original-reader-browser.mjs) and wired into [the existing headless runner](../packages/reader-core/src/original/test-original-reader-headless.mjs) before the production change.

The first command exited **1**, with **11 of 20 checks failing**:

```sh
node packages/reader-core/src/original/test-original-reader-headless.mjs runOriginalReaderMathMLChecks
```

The failures included the exact duplicated `Before xx after.` result, failure to find the complete visible phrase, no cross-maths range, hidden annotation text acquiring a range/highlight, and phantom text entering the model. The explicit semantics fixture returned `Before x+1 unithidden-texhidden-alternative after.` instead of `Before x+1 unit after.`. The phantom fixture returned `Before xhidden-phantom+1 after.` instead of `Before x+1 after.`. Ordinary HTML text and ordinary highlighting after maths already passed, establishing the behaviour to preserve.

After the repair, all **20 MathML checks passed**. They cover generated Markdown maths with actual semantics/annotation nodes; exact reader and canonical-helper text; search across maths; a cross-maths range with non-zero rendered geometry; exact ordinary range and visibly painted highlight restoration after maths; unchanged complete MathML markup; both annotation kinds, including nested HTML in `annotation-xml`; explicit `mphantom` exclusion with visible siblings retained; and ordinary HTML elements sharing MathML local names.

The ordinary restored range and painted mark both contain exactly `after.`. The complete MathML subtree before and after that decoration is identical:

```html
<math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mi>x</mi></mrow><annotation encoding="application/x-tex">x</annotation></semantics></math>
```

## Verification

- `npm test` exited **0**: 23 publication-content tests, 8 original-reader tests and 5 real-book tests passed. The native ESM regression performs a fresh complete core TypeScript compilation in removable repository-owned scratch.
- `node packages/reader-core/src/original/test-original-reader-headless.mjs` exited **0**: 14 existing reader checks, 12 Unicode annotation checks, 20 MathML checks and 2 actual quote-image checks passed. This preserves the existing cross-markup, note, footnote, overlap and Unicode regressions.
- After adding an informational native-range serialisation field to the test output, the focused MathML command above exited **0** again, with all 20 checks passing.
- Source hashes were read back and matched the frontmatter. No original-reader `.test-*` scratch directory remained.

The harness bundles the current checkout in memory and uses the existing origin at `http://127.0.0.1:8773` for its production stylesheet. It runs Python Playwright from the sibling `book-engine/.venv` with bundled **Chromium headless shell 153.0.8010.12**, cache build `chromium_headless_shell-1243`. It never launches real Chrome. Browser scratch stays under the owning repository and is removed by the harness. No server, framework or dependency was added.

## Limits and ownership

The returned cross-maths range now spans the requested visible phrase. Applying the shared model to its cloned contents yields exactly `Before x after.`. Native browser `Range.toString()` still yields `Before xx after.` because a contiguous native range includes the preserved hidden annotation node. The regression records that exact native serialisation as `nativeRangeText`; the visible-text assertion uses the shared model. This repair does not change native DOM serialisation or remove source markup.

This is a bounded browser DOM text-model correction. It does not verbalise natural-language maths, change the canonical TeX helper, extend computed-style visibility detection, or change the server-side no-document fallback. The browser checks establish the shared helper behaviour and painted geometry; they do not claim a speech-engine playback test or final packaged-release acceptance.

Only the three owned source/test files and this receipt were edited. Other workers' code and manifests were preserved. No Git mutations, push, secret or `.env` access, deployment, delegation, or application-design changes occurred. The parent's candidate helper hash will legitimately change; rebuilding and the final audit remain with the parent. **Ownership is released; no action is required from Dominik.**
