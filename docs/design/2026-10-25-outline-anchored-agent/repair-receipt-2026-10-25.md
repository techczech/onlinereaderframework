---
title: Repair receipt for the four review findings (agent export, contrast)
date: 2026-10-25
register: FOR AGENTS
builder: Sonnet 5.5 (implementation sub-agent)
responds-to: review-integration.md (verdict changes-requested; 3 × P2, 1 × P3)
status: fixes implemented and verified locally; parent fresh diff review owed
---

No action needed. Scope: the four findings only. No filesystem-writer change, no author content, no new dependencies, no Git, no deploy.

## Decisions

1. **Chapter references** (`agent-links.ts`, new). Same-book `#/id`, `#/id#frag`, `?section=id` (and `?book=<this book>`) in HTML sections are rewritten to the exported chapter file: `<seg>.md` from a chapter file, `chapters/<seg>.md` from `full.md` (the target is the real agent file; no fragile full-book anchors), absolute with `siteUrl`. Book start → `index.md`. Other books, `https:` citations, `#local` fragments and code samples (escaped in sanitised HTML, so never `<a>`) untouched. Unknown chapter: href kept as written and recorded in the new additive `manifest.unresolvedLinks` (`{ section, href }`), never pointed at another file. Markdown sections keep the author's bytes exactly; their reader routes (outside code) are listed in a `> Chapter links in this section…` note placed after the source text. Reuses the EPUB helper's route concepts (legacy `#/`, `?section`, decode, unknown target) without copying its throwing behaviour.
2. **Directory** (`agentDirectory` in `agent-paths.ts`, used by `buildAgentBook` and `buildAgentRootIndex`). Chosen contract: relative nested path of plain segments (`[A-Za-z0-9._-]`); `.` segments and trailing `/` dropped; absolute, `..`, empty segment, backslash, `%`, `:`/scheme, control characters, non-string/null and empty throw before any file object. Reader depth is derived from the segment count (`static/agent` → one extra `../`). Host writer containment unchanged.
3. **Contrast** (`support.css`, `anchored-reading.ts`). The block-level `color` rule is removed. Contrast now paints the remainder of each eligible word through `::highlight(publication-anchored-rest)` (priority −1, same exclusion test as the lead ranges). No text wrapped, offsets and node identity unchanged, `anchoredRanges` unchanged for callers; `applyAnchoredReading` registers and clears both highlights.
4. **Verbatim Markdown**. `sectionBody` no longer trims; title heading, front matter and separators surround the source string.

## Verification (exit codes)

| Command (repo root unless noted) | Exit | Result |
| --- | --- | --- |
| `node src/agent-export/test-agent-export.mjs` (in `packages/reader-core`) | 0 | 16 tests, 6 new |
| Mutation: restore trim / disable link resolution / disable directory check, then the same command | 1 each | the matching new tests fail (trim: 2; links: 3; directory: 1); sources restored, 16 pass |
| `python3 docs/design/2026-10-25-outline-anchored-agent/evidence-review-fixes/run-review-integration.py` | 0 | all six steps exit 0: sub-path Vite build, export probe (20 PASS), browser probe (23 PASS), extra contrast probe (5 PASS), packed consumer and invalid-output writer |
| Old block-colour rule appended to `dist/reader.css`, then the extra contrast probe | 1 | `Contrast leaves every excluded kind…` fails; restored, then 0 |
| `npm run build`, `npm test`, `npm run verify:package` | 0, 0, 0 | 305 agent files; all unit suites pass (23, 16, 96, 5); packed consumer passes |

Red for the original probe is the earlier review: `evidence-review-integration/final-command-exits.json` (export probe exit 1 with 6 failures, browser probe exit 1 with 1). Those files are not overwritten; new outputs are in `evidence-review-fixes/`.

## Evidence folder `evidence-review-fixes/`

Probe copies are the review's own, same logic, writing next to themselves. `probe-browser-integration.py`, `probe-package-integration.py` and `build-browser-fixture.mjs` are byte-identical to the review's. `probe-agent-integration.mts` differs in three marked ways: expected HTML bodies apply the intended link rewrite (written independently of the generator, every other byte still compared); the chapter-link check resolves each exported href to a generated file; the root index must reject bad directories too. `run-review-integration.py` differs only in the extra probe step and in recording current hashes (`source-hashes-after-repair.json`) instead of failing on the pre-repair snapshot. `probe-contrast-extra.py` is new. Result files: `agent-review-results.json`, `browser-review-results.json`, `contrast-extra-results.json`, `package-review-results.json`, `final-command-exits.json`, logs.

## Source hashes (sha256, first 16)

`agent-export.ts` f5a0577b90160d47 · `agent-links.ts` (new) 575df73841f29c20 · `agent-paths.ts` 658cae58204d3828 · `agent-export.test.mjs` eb9c6d40fbceca83 · `anchored-reading.ts` 34837aa4b7dc25a7 · `support.css` 51c8ac88d7481c0d. Docs: `agent-access.md` updated (directory contract, link rewrite, verbatim Markdown, Contrast mechanism, removed the dead-link limit).

## Limits

- The 362-check matrix, the six-layout front-page matrices and the toolbar/reading-support browser suites were not rerun (not touched). The Markdown link note is exercised by unit fixtures only; the three real books contain no Markdown reader routes. Only one real internal route exists (Language Muscle `step-2` → `fine-tuning-aims`).
- A second highlight doubles the range count (about 1,600 for a typical chapter). Very long chapters are still not windowed.
- Heading fragments after a chapter route are carried over unchanged; the exporter does not verify that the fragment id exists in the target.
- No audible speech, screen reader, deployment or network test. Ownership released; scratch folders removed by the runner; no other agents used.
