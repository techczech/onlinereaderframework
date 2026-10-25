---
title: Independent closure review of public agent URL configuration
date: 2026-10-25
reviewer: Codex review sub-agent
status: changes-requested
scope: Five public URL configuration findings and regressions in their repair
answers: review-config.md
repair: repair-config.md
evidence: review-config-closure-evidence/
---

# Public agent URL configuration closure review

No action needed. FOR DOMINIK. **Changes are still required: four original findings close, but custom-folder handling still breaks local preview downloads for a supported absolute canonical URL.** The parent session owns the repair and another security-boundary re-review.

- Public prompts now match generated custom folders at root and nested reader addresses.
- Generator validation, private-host alias rejection, unsafe-resource fallback and the original raw-URL checks pass independent verification.
- One P2 issue remains: a canonical absolute folder sends all three resource links to the public destination during a private preview.
- Production sources and earlier evidence remain unchanged. Review scratch was removed, and review ownership is released.

## Specification and review boundary

The controlling specification is the supplied re-review brief: canonical public prompts must coexist with downloads from the served preview; root, sub-path and supported custom folders must agree; invalid origins and unsafe paths must fail closed; source attribution must remain; deployment is not authorised. The five findings and probes in `review-config.md` define the review classes. `repair-config.md` and its evidence describe the proposed correction, not independent proof of acceptance.

The local standards agree with that requirement. `PublicationAgentAccess` documents that downloads use the folder where the page is served (`packages/reader-core/src/original/types.ts:68–71`). The component says the same (`original/agent/AgentAccess.tsx:21–26,47–48`), as does the “Downloads stay local” item in this design folder’s README. The generator directory contract remains `agentDirectory` in `agent-export/agent-paths.ts:24–34`.

This is a source and runtime re-review of the repair’s declared changed-file inventory and directly supporting code, including both new internal URL modules. All 18 entries in the builder’s final hash list match the inspected files. **No Git operation was performed**, so the relationship to the supplied `fde5076` revision and the complete historical diff were not independently established. The reviewed snapshot is identified by SHA-256, not by a new commit. No other agent was used, and no production fix was made.

## Remaining finding

### P2: An absolute canonical folder bypasses local preview downloads

**Source:** `packages/reader-core/src/agent-export/agent-location.ts:49–53`, consumed at line 28 and `packages/reader-core/src/original/agent/AgentAccess.tsx:47–48`.

On a private page at `http://127.0.0.1:18793/sub/reader/`, configure:

```json
{
  "siteUrl": "https://public.example.org/sub/reader/",
  "path": "https://public.example.org/sub/reader/static/agent/"
}
```

The generated folder is `static/agent`. The public prompt correctly names that folder. However, `locate` matches the canonical prefix and returns that prefix as `local`. `agentLocations` forwards it unchanged. All three anchors therefore name `https://public.example.org/sub/reader/static/agent/review-book/…` instead of the same folder under the preview origin.

The independent browser fixture deliberately makes the public agent files unavailable. The full-text, chapter-index and manifest anchors then return **404**, while the corresponding generated local files return **200**. This reproduces at `/` and `/sub/reader/`, for both home and chapter prompts: four failing browser assertions. Two pure API assertions independently reproduce the incorrect `local` field, including when the preview and canonical prefixes differ. Only fixture requests were used.

This prevents preview downloads before deployment, which is explicitly required. It does not demonstrate executable links, credential disclosure or a filesystem escape. The required correction is to derive the directory from an accepted current or canonical prefix, then construct browser downloads under the actual reader root. The canonical prefix should continue to supply the public prompt.

**Why the reported green tests miss it:** `agent-export.test.mjs:332` explicitly expects the canonical public address in the `local` field for this case. The builder’s extra browser acceptance also requires public-origin downloads (`repair-config-evidence/accept-config-browser.py:46–51`) and serves both origins successfully. Those assertions encode the wrong requirement; they cannot establish preview-local downloads. The original 88-check probe covers absolute URLs under the *current* origin, and passes unchanged.

**Evidence:** `variants-results.json` contains the two API failures. `variants-browser-results.json` contains the four browser failures, exact anchors, simulated public 404s and local 200 controls. Both are in the distinct closure evidence folder.

## The five original findings

1. **Custom directories remain open for complete closure.** The original hard-coded public `agent/` prompt is corrected: generated paths, manifest, root index and home/chapter prompts agree for the tested relative, absolute-path and current-origin absolute-URL forms. The supported canonical absolute-URL form has the P2 download regression above.
2. **Invalid public origins in the generators are closed.** Both public generator APIs and the root index’s hand-constructed-export boundary reject the tested invalid values without echoing the synthetic `u:p` credential. The actual demo CLI rejects eight invalid environment values before creating output. Valid environment fallback and canonical generation succeed.
3. **Private-host aliases in hosted prompts are closed.** Final-dot private names, numeric loopback forms, mapped private IPv4 and material Unicode hostname normalisations are rejected. Browser checks retain the attachment prompt on the private preview. No DNS lookup was used to classify hosts.
4. **Executable resource schemes and path traversal are closed.** Unsafe links were inspected without clicking. Raw and encoded traversal, double-encoded traversal and separators, credentials, foreign origins, path-case mismatches and slash-boundary lookalikes fall back to the local default folder. No tested unsafe value becomes an active executable or out-of-prefix anchor.
5. **The original raw URL normalisation finding is closed.** Scheme repair such as `https:example.org`, literal or encoded dot segments, and even empty query/fragment delimiters are refused before export. Generator and UI handling agree for those cases.

## Exact compatibility and normalisation observations

Ordinary dotted domains, internationalised domains, public IPv4, tested public IPv6 and mapped public IPv4 are accepted. Path case is preserved. The implementation deliberately rejects a public domain with a final DNS dot: `canonicalSiteUrl('https://public.example.org./')` returns `undefined`, while `isPrivateHost('public.example.org.')` returns `false`. This is the stricter accepted-input contract documented in the repair, not evidence that such a domain is private or invalid DNS. No universal DNS-validity or public-reachability claim is made.

Two details qualify the repair receipt’s wording. `agent-url.ts:19` trims outer whitespace before checking raw text, so leading tabs/spaces and a final newline around an otherwise valid URL are accepted. Internal tabs, malformed schemes, traversal and query/fragment markers remain rejected. A doubly encoded origin segment such as `%252e%252e` is retained, rather than decoded twice. Resource folders containing such escapes are rejected by the directory boundary. There is no second decoder in the inspected address-construction path, so this observation does not establish a traversal bypass. These observations are recorded in `variants-results.json`; they do not reopen the five original examples as a new exploit class.

## Independent execution

The full commands, working directories and actual child exit codes are recorded in `command-exits.json`. No passing assertions inside a failing command are treated as a green result.

- The existing agent-export suite passes **25/25, exit 0**. Its normal TypeScript compilation inputs and test source were used, with compiled output redirected into review scratch rather than the source tree.
- The byte-identical original generator probe completes with **exit 0**. It is observational. The byte-identical original browser probe passes **88/88, exit 0**.
- Independent API and server-render variants have **128 passes and 2 failures, exit 1**. Independent browser variants have **35 passes and 4 failures, exit 1**. All six failures reproduce the single P2 issue above.
- The unchanged server-render script passes **17/17, exit 0**. Additional no-DOM cases include omitted and undefined paths, valid defaults, a custom path and an invalid origin. Default-path browser cases mount without page exceptions.
- The byte-identical demo generator in an isolated review-owned mirror writes **305 canonical files, exit 0**. Each of the three books has its own correct manifest and root-index origin. Valid environment fallback also writes 305 files, exit 0. Eight invalid environment runs each exit 1 with no output directory and no refused-value echo. The CLI acceptance script passes **13/13, exit 0**.

The builder’s larger acceptance, mutation, package, root build and root test receipts were read but were not rerun or counted as independent results. The 510-check layout matrix, 279-check front-page matrix, React/speech matrices and real audio were not repeated. Hashes confirm the inspected layout, CSS, footer, canonical map and reader wiring match the recorded repair snapshot; focused unit checks continue to exercise authored text and attribution preservation. Host filesystem writer containment is unchanged and was inspected, not expanded or re-proved through a filesystem attack exercise.

Native T3 preview was tried first: loopback navigation succeeded, then both snapshots returned exactly `Preview snapshot failed: Preview automation snapshot timed out after 15000ms.` The authorised fixture-interception workflow used bundled Playwright `chrome-headless-shell`, never installed Chrome. All page requests in those browser probes were fulfilled from fixtures or refused; the independent probe recorded no outside request and no page exception. No live deployed endpoint was fetched or claimed working.

## Evidence, cleanup and handoff

The new `review-config-closure-evidence/` contains probe sources, raw results, logs, command exits and before/after hashes. All **74 snapshotted files** retain matching hashes, including production sources and the earlier review/repair evidence. The copied original probes are byte-identical, with both hashes recorded in `closure-summary.json`.

For reproduction, run `run-config-closure.py` from this evidence folder with Python, then run the recorded original and independent browser commands against its generated fixture. Run `probe-config-variants.mts` with the existing demo `tsx`, and `probe-config-cli.py` with Python. Keep `TMPDIR` inside the review scratch folder and remove scratch in a finally step. The retained command records give the exact paths used in this run.

Review scratch, browser profiles and the isolated CLI output were removed. The task-owned loopback server was stopped through its own session, and the native preview tab was closed. There was no production edit, original-site/manuscript edit, Git action, paid service, audible voice, push or deployment. **Review ownership is released.** The parent session should repair the canonical-folder download regression and obtain another focused security-boundary re-review before accepting closure or checkpointing the fix.
