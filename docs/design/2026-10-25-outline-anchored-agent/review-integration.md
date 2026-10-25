---
title: Independent review of agent exports, anchored reading and outline preferences
date: 2026-10-25
reviewer: Codex GPT-6.1 Sol
register: FOR DOMINIK
verdict: changes-requested
scope: current working tree supplied after 78efbe5
ownership: review document and evidence-review-integration only
---

No action needed. FOR DOMINIK. **Changes are requested before accepting the integration.** The parent session owns fixes.

- **Three P2 findings remain:** an unusable chapter reference, unchecked export directories, and contrast styling that changes excluded maths.
- **One P3 finding remains:** the generator removes authored trailing Markdown whitespace despite its verbatim contract.
- **All substantive book bodies are present.** Synthetic speech, the isolated subpath build, private-host prompts and focused outline checks passed their targeted assertions.

## SPEC

### P2: The exported Language Muscle chapter reference remains unusable

**Location:** `packages/reader-core/src/agent-export/agent-export.ts:58`; the authored reference is in `apps/reader-demo/src/books/original-publications.json:243`.

The HTML export sanitises the chapter but retains `<a href="#/fine-tuning-aims">`. In `agent/language-muscle/chapters/step-2.md`, that resolves to the same Markdown file with a fragment; it cannot reach the separate Fine-tuning your aims chapter. The same reference in `full.md` names no generated anchor. This breaks the requested usable chapter references even though the text and hierarchy are complete. Documenting this known limitation does not satisfy full agent access.

**Reproduction:** Generate the real Language Muscle book, read the `step-2.md` body, and resolve the retained href against its exported URL. The probe records `https://books.example/sub/agent/language-muscle/chapters/step-2.md#/fine-tuning-aims`, while the target chapter file is `fine-tuning-aims.md`.

**Parent repair:** Resolve reader chapter references to the corresponding exported chapter or an explicit reader URL. Handle chapter and full-book contexts, including fragments, without changing code examples or unrelated authored text. Preserve the original author source.

**Evidence:** [Agent results](evidence-review-integration/agent-review-results.json), failed `language-muscle: source chapter links usable from exported Markdown`.

### P2: Contrast mode softens MathML despite excluding it from anchored reading

**Location:** `packages/reader-core/src/original/reading-support/support.css:47`.

The selector excludes elements inside maths, but applies the softened colour to their enclosing paragraph. MathML then inherits that colour. The browser fixture changed the formula's computed colour from `rgb(37, 48, 60)` to `color(srgb 0.418667 0.448 0.48)` when Contrast was enabled. No anchored ranges entered the formula, and its DOM stayed intact; the defect is the inherited colour change. It contradicts the requirement to leave excluded maths alone.

**Reproduction:** Render a paragraph containing inline MathML, record the formula's colour, enable anchored reading with Contrast, and compare. The focused browser probe performs those steps using the framework component.

**Parent repair:** Soften eligible prose while preserving excluded descendants' existing colours. Retain the invariant that text nodes, markup and canonical offsets do not change. Cover inline maths and explicitly ignored content, rather than checking only whether highlight ranges intersect them.

**Evidence:** [Browser results](evidence-review-integration/browser-review-results.json), failed `contrast leaves ignored MathML colour unchanged`.

## STANDARDS

### P2: The directory option bypasses path safety and assumes a fixed depth

**Locations:** `packages/reader-core/src/agent-export/agent-export.ts:64`, `:77`, `:78`, and `:155`.

Book and section IDs are escaped, but `options.directory` is used directly in returned file paths. The pure API accepts `../outside`, `/absolute`, and `safe/../../outside`. Resolving those returned paths against a host's output root escapes that root. **The generator itself performs no writes**, and the demo's fixed directory plus writer guard protect its normal integration. The finding concerns the new framework contract consumed by other hosts.

A non-malicious nested directory also fails: with `directory: 'safe/nested'`, a chapter's relative reader URL resolves under `/sub/safe/`, rather than `/sub/`, because the generator hardcodes three parent steps. These cases share the unchecked directory contract.

**Reproduction:** Call `buildAgentBook(fixture, { directory })` for the four values above. The probe computes the resulting paths and reader URLs without writing them outside the review output root.

**Parent repair:** Validate the directory consistently in both generators. Either require one safe directory segment or support normalised relative nested directories and derive reader-link depth accordingly. Reject absolute paths and traversal before returning any files. Keep independent containment checks in host writers.

**Evidence:** [Agent results](evidence-review-integration/agent-review-results.json), three failed directory rejection assertions and the failed nested-directory reader-root assertion. The separate demo writer test rejected an invalid `--out` before creating it.

### P3: Markdown is not preserved verbatim for all valid source strings

**Location:** `packages/reader-core/src/agent-export/agent-export.ts:59`.

`text.replace(/\s+$/, '')` removes authored trailing whitespace and then adds one newline. A fixture ending in `image.png)\n\n` is exported as `image.png)\n`. The actual Markdown books passed exact source-substring comparisons; this finding concerns the broader framework promise. No substantive loss in those real books was observed.

**Parent repair:** Retain the Markdown source string exactly and add any required separators outside it. Test the exact chapter body, without trimming the expected string or joining multiple files, which can conceal the difference.

**Evidence:** [Agent results](evidence-review-integration/agent-review-results.json), failed `fixture: authored trailing Markdown whitespace retained verbatim`.

## Independent verification

The implementation receipt and its 362-check log were read. Their complete matrices were not rerun. This review used source inspection and focused additional checks:

- **Body coverage passed for all 295 sections.** The comparisons covered all 21 Deliberate Practice bodies, all 12 Language Muscle HTML bodies, and all 253 Linguistics bodies plus nine grouping sections. Every entry's original order, depth, parent, title path, chapter body, full-book position and previous/next references were checked. HTML was compared as sanitised HTML and semantic text; preserving HTML inside Markdown was accepted.
- **Public-field selection passed.** Extra book, home, licence and section fields containing synthetic notes, drafts, browser state, private paths and a private URL did not reach the files. Malicious and Unicode IDs stayed escaped and round-tripped through reader query parameters.
- **Synthetic speech passed while anchored reading was active.** The sentence highlight crossed inline emphasis, and a boundary event highlighted `emphasised` at canonical offset 47. The article markup and text remained unchanged, and both speech highlights coexisted above anchored reading. This establishes event wiring and offset meaning, not audible output.
- **Mixed paragraph dimming passed its targeted preservation check.** Bare text before and after a nested paragraph received a transparent dim highlight at priority 0 while anchored colour remained at priority −1.
- **Outline checks passed with blocked storage.** The book-specific collapse choice restored on return, another book stayed open, the article remained usable, N and Escape moved focus correctly, and Back/Forward restored one current-location marker matching the fragment.
- **An actual isolated Vite build with `--base=/sub/` succeeded.** The emitted application and generated agent files were served through Playwright routing. The chapter prompt, full-text fetch and escaped fixture filename resolved under `/sub/`. One quiet chapter-row sample retained its visible 2px keyboard outline. This was not a deployment or a repeat of all layout matrices.
- **Framework integration checks passed.** Agent access defaulted off; a configured path produced a chapter-specific public prompt and citations. The clipboard fallback copied the complete prompt and restored focus. Tailscale range endpoints, a `.ts.net` host and a `file:` page offered attachment prompts and downloads.
- **The existing packed `reader-core/agent` export passed native Node ESM import and generation.** Its CSS contained the agent box, outline toggle and anchored-reading styles. Existing local dependencies were linked into the isolated consumer; no network install or complete React-version matrix was run.

The WriteFlex lead-length function matched the inspected source after ignoring whitespace and semicolons. Read-only upstream hashes and the dominiklukes.net Ask-box source hashes are in [reuse provenance](evidence-review-integration/reuse-provenance.json).

## Commands, limits and ownership

Run `python3 docs/design/2026-10-25-outline-anchored-agent/evidence-review-integration/run-review-integration.py` from the repository root to reproduce the focused review. It removes generated fixtures in `finally`.

[Command receipts](evidence-review-integration/final-command-exits.json) contain exact arguments, working directories and exits. The export probe exited **1** with six failed assertions; the browser probe exited **1** with one failed assertion. Those seven cases form the four findings above. The Vite build, browser-fixture build and final package probe exited **0**. Within the package probe, the invalid-output writer exited **1 as expected**, before writing. The overall review is not passing.

T3 navigation reached the existing local reader, but snapshots twice failed with `Preview automation snapshot timed out after 15000ms.` The review then used bundled `chromium_headless_shell`; its own T3 tab was closed. No installed Chrome was launched. Early fixture setup errors were corrected before the final recorded probes; they are not product findings.

No audible speech, screen-reader acceptance, production endpoint availability, real private-network access or deployment is claimed. The private-host browser cases used controlled addresses. The full six-layout matrices remain prior builder evidence, not independent results from this review.

**Ownership is released.** Only this document and the distinct evidence folder were authored. All 65 recorded production source hashes remained unchanged. Generated builds, package consumers, caches and browser fixtures were removed; browser contexts were closed. Original WriteFlex, ReadFlex, site and manuscript sources were not edited. No other agents, Git operations, production fixes, pushes or deployments were used. The parent session owns fixes and final validation; Dominik has no action to take in this review.
