---
title: Final security diff re-review of reader agent URL configuration
date: 2026-10-25
reviewer: Codex independent review sub-agent
status: clean-in-scope
scope: Latest two-file canonical-folder download repair and targeted URL safety regressions
answers: review-config-closure.md
repair: repair-config-closure.md
evidence: review-config-final-evidence/
---

# Final reader agent URL security diff review

No action needed. FOR DOMINIK. **The remaining canonical-folder download finding is closed. No security finding remains within this review’s scope.** The parent session can refresh the final preview and checkpoint the work.

- A folder configured with its full canonical public URL now downloads from the current preview origin and reader prefix.
- Public prompts use the canonical prefix and the same validated directory. Root, nested and different preview/public prefixes pass.
- The four previously closed URL safety classes remain closed in the targeted regression checks.
- The final independent runs pass 130 API/server-render assertions, 39 unchanged browser assertions and 43 additional browser checks. All 123 additional download responses match the generated file bytes exactly.

## Contract, scope and independence

The controlling specification is the supplied security diff re-review brief. Public prompts must use the canonical reader prefix plus the configured resource directory; downloads must use the current page’s origin and reader prefix plus that same directory. Relative paths, absolute paths and current/canonical absolute URLs are supported only within the validated prefixes. Unsafe configuration must fail closed without exposing private addresses or credentials in prompts or logs.

The supporting local standards are `packages/reader-core/src/original/types.ts:68–71`, the download construction in `original/agent/AgentAccess.tsx:47–48`, and `agent-export/agent-paths.ts:24–34`. The original findings in `review-config.md`, remaining finding in `review-config-closure.md`, and builder’s `repair-config-closure.md` were read in that order before judging closure.

This review covers the latest supplied diff in **`agent-location.ts` and `agent-export.test.mjs`**, plus the directly supporting URL validators, generator and component needed to verify it. It is independent of the Opus builder. No other agent, Git operation, production fix, push or deployment was used. The supplied relationship to `fde5076` was not independently established through Git. This verdict does not certify all uncommitted features or the whole application.

## Why the remaining finding closes

At `packages/reader-core/src/agent-export/agent-location.ts:42–55`, `locate` now returns only a validated generator directory. At lines 25–30, `agentLocations` constructs `local` from the current reader root and `public` from the canonical public prefix using that same directory. A match against the canonical prefix therefore no longer makes the canonical host the download origin.

The earlier validation gates remain present: raw unsafe text, schemes, query/fragment/credential markers, dot segments, exact prefix containment and `agentDirectory` validation still run before either address is constructed. The change neither introduces a fetch nor changes the host filesystem writer.

The independent browser checks exercise the original canonical absolute-folder defect at `/`, `/sub/reader/` and `/preview/x/`, with different public prefixes, default/custom folders, trailing-slash variants, and home/chapter queries. They also exercise relative, absolute-path and current-origin absolute-URL folders at those page roots, including `index.html`, query and fragment addresses. All three resource anchors have the exact expected local URLs. Their 123 fetched bodies equal the generated files byte for byte; the fetched manifests parse with the expected book identity. Home prompts match the exact public index/full URLs, and chapter prompts match the exact public chapter/index URLs derived from the generated manifest.

Every public resource request in the additional fixture deliberately receives **status 200 with HTML**. Missing local paths do too. Such a response fails the type, fixture-route and byte comparisons. A deliberate HTML negative control passes only because it is recognised as an invalid download. HTTP 200 alone never establishes success.

The old test assertion expecting a public address in `local` is legitimately corrected at `agent-export.test.mjs:332–333`. The new test at lines 348–374 adds preview/canonical prefix and rejection coverage; it does not remove a validation assertion. The targeted independent probes establish the result separately from those builder tests.

## Earlier URL safety findings

**Invalid generator origins remain rejected.** The unchanged 130-check API/server-render probe tests both generator APIs and hand-constructed root-index exports. Malformed schemes, credentials, query/fragment delimiters, private hosts and traversal forms are refused without echoing the supplied credential or refused value. The original generator probe also records rejection of all its malformed inputs. The demo CLI itself is unchanged and was not rerun in this round.

**Private-host prompts remain suppressed.** Numeric and mapped loopback/private addresses, final-dot private aliases and Unicode hostname normalisations retain attachment fallback. The additional browser cases contain neither hosted-fetch URLs nor private-address warnings in the attachment prompt. Captured browser logs contain no refused configuration values; only React’s development information messages occur.

**Unsafe resource schemes and traversal remain rejected.** JavaScript/data schemes, raw/encoded/double-encoded traversal or separators, credentials, foreign CDN origins, changed scheme or port, lookalike hosts and out-of-prefix paths fall back to the local default folder. Unsafe anchors were inspected rather than executed. The additional browser cases fetch and compare the default generated bytes, so fallback is verified beyond an href inspection.

**Raw URL normalisation remains guarded.** Scheme-repaired forms, literal/escaped dot segments and even empty query/fragment delimiters retain rejection. The earlier observations about trimmed outer whitespace, retained double-encoded canonical path text and rejected final-dot public domains are unchanged; this small diff does not reopen them as a new exploit class.

## Overlapping-prefix limit

One separate observation records the expressly accepted inconsistent configuration: `siteUrl` is `https://public.example.org/`, the current page is under `/sub/reader/` on that host, and the folder URL lies inside both. The existing current-page prefix wins, yielding directory `static/agent`, local `/sub/reader/static/agent/`, and public `/static/agent/`. The resolver’s prefix order is unchanged. Both results remain inside their validated prefixes. Under the controlling brief’s treatment of this conflicting configuration, this is not a new material contradiction or an open security finding. Exact inputs and outputs are retained in `overlap-observation.json`.

## Evidence, reproduction and limits

All **114 builder post-repair hashes match** the current files. Reversing the supplied two-file diff into review scratch succeeds with exit 0 and reconstructs both recorded pre-repair hashes, including a byte-identical match to the saved old resolver. The reviewed current hashes are:

- `agent-location.ts`: `1a6206ad226ebb0e356ce289a1372916e456fc59b3772e932e0744f15bd6640b`.
- `agent-export.test.mjs`: `2254fbcbe85f66d47a56e99a7fe50c88d19b14ca32d4b26d2cfda7f1f25ca0e2`.

The evidence folder retains source snapshots, the independently derived resolver diff, diff/baseline verification, before/after hashes, probe sources, JSON results and logs. All **164 snapshotted existing files remain unchanged**, including earlier review/repair evidence, source/manuscript data, validators, component, CSS and writer.

Reproduce from the repository root with `python3 docs/design/2026-10-25-web-agent-box/review-config-final-evidence/run-config-final.py`. `command-exits.json` records the five exact child commands and working directories: fixture generator, 130 API/server-render assertions, overlapping-prefix observation, 39 browser variants and 43 additional browser checks all exit 0. The runner itself exits 0. The three copied earlier probes are byte-identical to the independent closure review’s sources, with hashes retained.

The first additional browser run exited 1 because this reviewer’s probe incorrectly required the home prompt’s full-text URL and a `/sections/` path in chapter prompts. All its download byte hashes already matched. That probe mistake was corrected against the existing chapter/index prompt contract and generated `manifest.sections[0].file`. Initial source/results/exits and the correction receipt are preserved; they are not presented as a passing run or a product finding. The final probe additionally compares literal bytes and parses the downloaded manifest.

Native T3 preview was attempted first. Its first local navigation returned `chrome-error://chromewebdata/`; the retry returned exactly `Preview automation open failed: Navigation to http://127.0.0.1:18793/ failed: ERR_CONNECTION_REFUSED`. The authorised fixture-interception workflow then used bundled Playwright `chrome-headless-shell`, never installed Chrome. All browser requests were intercepted and fulfilled or blocked; no public site was contacted, no server was started and no audible voice was used. The owned native preview tab was closed.

The original 88-check browser suite, builder’s 905-check acceptance and 26-test unit suite were read as earlier/builder evidence, not rerun or counted as independent results here. Types/core build results remain builder-reported. The full demo build, layout/front-page, React and speech matrices were not rerun. Source hashes and this URL-only diff show no change to authored-body preservation, compact UI or filesystem containment; those broader systems were not re-audited.

All fixture, browser temporary and compiled files stayed under review scratch, removed in `finally`, including after the failed probe. As expressly allowed in the brief, tsx used its normal external temporary IPC socket to avoid the macOS socket-path length limit. No review scratch remains. **Review ownership is released; the parent session owns the final preview build and checkpoint.** Nothing is required from Dominik.
