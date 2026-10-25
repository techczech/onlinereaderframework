---
title: Repair receipt for the two remaining closure findings
date: 2026-10-25
register: FOR AGENTS
builder: Sonnet 5.5 (implementation sub-agent)
responds-to: review-integration-closure.md (P2 excluded-content crossing, P3 whitespace-only Markdown)
status: fixed and verified locally; parent diff review and checkpoint owed
---

No action needed. Scope: the two findings. No API, dependency, UI or manuscript change; no Git, push or deploy.

## Changes
1. **P2** `anchored-reading.ts` `anchoredRangeSets`: `rangeOf` (endpoint-only test) replaced by `rangesOf`, which walks every canonical point in `[from,to)`, skips points whose text node is inside `pre, code, kbd, samp, math, [data-reading-support-ignore]`, and emits one range per run of consecutive offsets in one text node. No painted range can intersect an excluded subtree. Canonical text, offsets, node identity and live markup unchanged (`publicationTextModel` reused). Rest ranges are emitted only when the lead has at least one eligible segment (as before). A word split by inline markup yields one range per text node. Priorities stay −1 (Paragraph dimming and synthetic speech at 0 still win).
2. **P3** `agent-export.ts` `sectionBody`: the structural branch is chosen by `!section.content` (empty string only). Whitespace-only content takes the normal branch: `# <title>\n\n` + the raw bytes. Counts and "no text of its own" index markers still use `trim()`.
3. Test: `agent-export.test.mjs` adds `whitespace-only Markdown keeps its bytes…` (` \n\t  `, `\n`, NBSP, `x  \n\n  `, and empty still gets the explanation).

## Evidence (`evidence-review-closure-fixes/`, new; prior review folders untouched)
- Red on old code: `red-boundary-old-source.log` (old `rangeOf` restored temporarily: rest `naryCODEsuffix.` crosses `code`; painted text includes `CODE`). The new unit test also fails (exit 1, 16 pass / 1 fail) with the old `trim()` condition restored.
- Green: `python3 …/evidence-review-closure-fixes/run-review-closure.py` exit 0, all ten steps 0: agent unit 17 tests; subpath build; export probe 20; browser probe 23; contrast-extra 5; package consumer; closure variants 64/64 (whitespace-only now exact); boundary probe 6/6 (adds painted-text-equals-eligible-text for code, kbd, samp, MathML, ignored span, and unchanged inline author colour in a split token); coexistence 11. Scratch removed in `finally`.
- Also: `npm run build` exit 0 (`npm-build.log`), `tsc --noEmit` in reader-core exit 0, `node --test` reading-preferences + read-aloud 33/33. Not run: full `npm test`, front-page/React matrices.
- Preview servers on 127.0.0.1:8773 and 100.85.55.122:8773 serve the rebuilt dist, HTTP 200 each, left running.

## Hashes (sha256 first 16)
`agent-export.ts` b997fcef4a544caa · `agent-export.test.mjs` 869ad9b0464dcde5 · `anchored-reading.ts` 6b8b72636cd76125. Previous: f5a0577b90160d47, eb9c6d40fbceca83, 34837aa4b7dc25a7. `support.css` unchanged.

## Limits
Original red probe and earlier logs not overwritten. No audible voice, screen-reader or real-device claim.
