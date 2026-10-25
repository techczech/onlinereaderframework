---
title: Independent closure review of agent export and anchored-reading repairs
date: 2026-10-25
register: FOR DOMINIK
reviewer: Codex GPT-6.1 Sol
verdict: changes-requested
scope: Four findings in review-integration.md; supplied uncommitted repair state after 78efbe5
ownership: This document and evidence-review-integration-closure only
---

No action needed. FOR DOMINIK. **Two findings are closed; two remain open in narrower cases.** The parent session owns repairs and the next checkpoint.

- **Chapter-file resolution is closed.** The real Language Muscle reference and independent chapter/full-book HTTP cases reach their exported targets.
- **Directory validation and reader depth are closed.** Both generators reject unsafe inputs, and nested relative directories retain the reader root.
- **Contrast remains open at P2.** The new remainder highlight can cross excluded inline content between its endpoints.
- **Verbatim Markdown remains open at P3.** Non-empty prose retains its trailing bytes, but a whitespace-only source string is still discarded.

## SPEC

### P2 remains open: the new remainder range can include excluded descendants

**Locations:** `packages/reader-core/src/original/reading-support/anchored-reading.ts:63`, `:76`, `:77`; the range receives the softened colour at `support.css:47` in the same folder.

The original parent-colour defect is repaired. Standard inline MathML and code, `pre`, `kbd`, `samp`, ignored spans and custom author colours pass exact computed-colour comparisons. The new range builder, however, tests only the first and last text points of each range. An excluded element between those points passes that test.

**Reproduction:** Append `<p>extraordinary<code>CODE</code>suffix.</p>` to the framework's rendered chapter, let its block indexing settle, then enable Contrast through Assist. The lead range does not intersect the code, but the remainder range is `naryCODEsuffix.` and `range.intersectsNode(code)` is true. The code's base colour remains `rgb(17, 24, 39)`; its applicable remainder-highlight colour is `color(srgb 0.418667 0.448 0.48)`. The range therefore reaches text explicitly excluded from anchored reading. The same probe finds crossings through inline `kbd`, `samp`, MathML and an ignored span.

This is a narrow variant of the original exclusion finding. It does not establish a DOM or offset mutation: **the complete chapter markup and canonical text remain identical**. The earlier endpoint-only exclusion checks miss it because both endpoints lie in ordinary prose.

**Parent repair:** Ensure the entire painted range excludes ignored descendants, including a descendant inside a token. Keep the unchanged DOM, text and offsets, and recheck both lead and remainder ranges.

**Evidence:** [Boundary probe](evidence-review-integration-closure/probe-contrast-boundary.py), [four results, one failure](evidence-review-integration-closure/contrast-boundary-results.json). The final command exits **1** without a harness exception.

### Closed: exported chapter references reach the intended chapter files

**Locations:** `packages/reader-core/src/agent-export/agent-links.ts:20`, `:44`; chapter/full-book contexts are supplied by `agent-export.ts:91`.

The earlier `step-2` → `#/fine-tuning-aims` failure now resolves to `fine-tuning-aims.md` from the chapter and `chapters/fine-tuning-aims.md` from `full.md`. The earlier 295-section body/hierarchy probe passes, including its separate untrimmed real-Markdown source comparisons.

The copied expected-HTML rewrite is **not the sole evidence**. A separate fixture serves generated files through a real loopback HTTP server. Across default and nested directories, relative and absolute addresses, and chapter/full-book contexts, **36 target fetches return the intended chapter text**. Query-form routes and a valid heading fragment are covered. Escaped authored code, citation URLs, another book's query, unrelated query parameters, local fragments and href-like title text remain unchanged. Unknown chapters retain their authored href and appear once per source section/href in `unresolvedLinks`; generated manifest file/section counts remain consistent.

Heading fragments retain the documented limit. The independent fixture also exports `#/target#missing-heading`: its chapter exists, its heading does not, and the fragment passes through unchanged. That is not counted as an unresolved chapter. This review closes chapter-file resolution and does not claim heading validation.

**Evidence:** [Independent HTTP/byte/directory probe](evidence-review-integration-closure/probe-closure-variants.mts), [results](evidence-review-integration-closure/closure-variant-results.json), [real-book results](evidence-review-integration-closure/agent-review-results.json).

## STANDARDS

### P3 remains open: whitespace-only Markdown is not preserved verbatim

**Location:** `packages/reader-core/src/agent-export/agent-export.ts:59`.

Removing the final trim fixes the original non-empty Markdown reproduction. Exact chapter-body checks now pass for zero ending newlines, trailing spaces, multiple newlines, hard breaks and fenced-code trailing whitespace. Full-book separators remain outside those source strings. A genuinely empty structural section still receives the expected generated explanation.

**Reproduction:** Generate a Markdown section with `content: " \n\t  "`. The `!section.content.trim()` branch replaces those bytes with `# raw\n\nThis section has no text of its own. It contains:\n\n`. The original whitespace string is absent. This still contradicts the current promise that Markdown source strings retain their own bytes. It is a low-impact edge case; no substantive loss in the real books is observed.

**Parent repair:** Preserve whitespace-only source bytes as well as the structural explanation. Keep counts based on meaningful text if that is the chosen contract; byte preservation does not require changing those counts.

**Evidence:** The exact-body assertion in [independent results](evidence-review-integration-closure/closure-variant-results.json) is the only failed assertion in that probe: **63 pass, one fails; exit 1**.

### Closed: both generators validate directories and derive reader depth

**Locations:** `packages/reader-core/src/agent-export/agent-paths.ts:28`; `agent-export.ts:70`, `:72`, `:168`.

Both pure generators reject all **26 invalid values** in the independent fixture: absolute and multi-root paths, traversal, a backslash, encoded dots/slashes, double encoding, empty internal segments, schemes, control characters and invalid types. These are **52 rejected calls**, with no attempted writes. Dot segments normalise consistently. Multi-segment folders with letters, digits, dots, underscores and hyphens produce reader links at the correct subpath root; root discovery, manifest paths and current link helpers agree.

The demo writer's independent guard remains unchanged by hash. Its focused check still rejects an output outside the demo build folder before creating that output. Its expected child exit is **1**; the enclosing package probe exits **0**.

## Verification and limits

Fresh checks in this closure review produced these results:

- **The agent unit suite passed all 16 tests.** The real-book export probe passed 20 checks; the existing targeted browser probe passed 23; the extra standard-colour/Off probe passed five.
- **The isolated Vite subpath build and packed consumer passed.** Native Node imports and invokes the packaged agent generator; no network install was used. This packs the existing built package. The source unit suite separately compiles current agent sources.
- **The additional highlight coexistence probe passed 11 checks.** Both anchored highlights have priority −1 beneath Paragraph dimming and synthetic speech at priority 0. Actual synthetic word events retain canonical offset 47. A real pointer event places a non-zero Ruler while both anchored highlights remain active. Off removes both highlights in the exclusion-boundary fixture.
- **The independent variants remain red as described above.** The HTTP/byte/directory probe passes 63 of 64 assertions; the boundary probe passes three of four. Passing earlier checks does not make this closure green.

[Command receipts](evidence-review-integration-closure/command-exits.json) record exact arguments, working directories and exits. Reproduce the complete focused review with `python3 docs/design/2026-10-25-outline-anchored-agent/evidence-review-integration-closure/run-review-closure.py` from the repository root. Its overall expected exit for this source state is **1**, and it removes generated fixtures in `finally`.

The builder's mutation receipts and full-build/unit/package receipts were read. Their red-by-reversion results were not repeated, and no production source was reverted. The 362-check suite, complete front-page matrices, full root unit suite and deployment were not rerun. No audible voice, screen-reader acceptance, production availability or real private-network access is claimed. Private-host checks retain their earlier controlled-address scope.

T3 preview was tried first. After correcting an unsupported `about:blank` argument, an owned preview tab opened, but snapshots twice returned `Preview automation snapshot timed out after 15000ms.` That tab was closed and the authorised bundled `chromium_headless_shell` ran the browser checks. No installed Chrome was launched. An initial boundary-probe timing/button-locator error was corrected before the final recorded result; it is not a product finding.

## Source identity and ownership

The repaired-source SHA-256 prefixes match the repair receipt: `agent-export.ts` **f5a0577b90160d47**, `agent-links.ts` **575df73841f29c20**, `agent-paths.ts` **658cae58204d3828**, `agent-export.test.mjs` **eb9c6d40fbceca83**, `anchored-reading.ts` **34837aa4b7dc25a7**, and `support.css` **51c8ac88d7481c0d**. Full before/after hashes and cleanup evidence are beside the probes.

**Ownership is released.** All 118 snapshotted pre-existing files, including 66 source/configuration files and the earlier reviews/evidence, remain byte-identical. Only this closure document and its new evidence folder were authored. Generated fixtures, build output, package consumers and caches were removed from that folder; browser contexts and the loopback server were closed. Original WriteFlex, ReadFlex, site and manuscript sources were not edited. No other agents, Git operations, production fixes, pushes or deployments were used. The parent session owns the two repairs, their re-review and its checkpoint. Dominik has no action to take in this review.
