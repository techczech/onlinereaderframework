---
title: Independent review of public agent URL configuration
date: 2026-10-25
reviewer: Codex review sub-agent
status: changes-requested
scope: Public agent URL configuration and generated URI contract
---

# Independent public URL configuration review

No action needed. FOR DOMINIK. **The public URL configuration needs corrections before acceptance.** The parent session owns fixes and checkpoints.

- The default agent folder works at root and nested reader addresses, including during a private preview.
- Custom folders produce public prompt links to files that the generator does not write.
- The generator accepts invalid public origins, and the component's validation misses some private-host forms and unsafe resource paths.
- The canonical generator writes 305 files with the correct three book origins. No public endpoint was requested or deployed.

## Scope and independence

This is an independent review of the current working tree supplied as being after `fde5076`. No Git operation was performed, so that revision relationship was not independently established. No other agent was used. Production sources, original sites, book data, WriteFlex and ReadFlex were not edited. Only this report and its adjacent `review-config-evidence/` belong to this review. Review ownership is released at handoff.

Thirteen inspected files have matching before/after SHA-256 hashes in the evidence folder. Four additional source files have supplementary hashes. These identify the inspected snapshot; they do not establish a historical diff or independently validate the builder's larger test receipt.

## Specification and priority

1. **The latest review brief and user correction are the controlling specification.** They require compact public-web presentation, public index/full/chapter prompts, local preview downloads, root/subpath/custom-folder consistency, rejection or ignoring of invalid public origins, attachment fallback without private-host disclosure, preservation of source/licence content, and no deployment. The brief specifically asks to test the builder's custom-folder limitation rather than accept it as a waiver.
2. `docs/design/2026-10-25-web-agent-box/README.md:7–18` is the builder's behaviour receipt. Its line 10 documents the current default-folder assumption; it cannot override the controlling custom-folder requirement. Lines 34–36 correctly distinguish deployment preparation and the single multi-origin index from live deployment.
3. `docs/design/2026-10-25-outline-anchored-agent/agent-access.md`, under “Module contract” and “Host integration”, supplies the existing generator-directory and reader-path contract. The newer brief controls any conflict.

## Standards used

The framework's own API and boundary rules are the standards, rather than a new deployment design:

- `packages/reader-core/src/agent-export/agent-paths.ts:1–13,24–45` says the component and generator share file addresses, validates relative generator directories, and describes public-origin rejection. Line 39 specifically claims generators call the public-origin validator and throw when invalid.
- `packages/reader-core/src/agent-export/agent-export.ts:15–20,70–92,167–175` defines the reader root, configurable output directory, and book-specific root-index origin.
- `packages/reader-core/src/original/types.ts:66–72` allows relative or absolute resource paths and a public reader origin. An absolute path inside a configured prefix is therefore part of this review, rather than an excluded configuration.
- `apps/reader-demo/scripts/build-agent-files.ts:19,36–46` confines writes to the build root. The review preserved those guards and used an isolated copy of the unchanged script.

## Findings

### 1. P2: A custom agent directory gives the public prompt dead links

**Locations:** `packages/reader-core/src/original/agent/AgentAccess.tsx:45–55`, especially line 50; compare `packages/reader-core/src/agent-export/agent-export.ts:71,85–86`.

**Reproduction:** Generate the fixture with `{siteUrl: 'https://public.example.org/sub/reader/', directory: 'static/agent'}` and render with `{siteUrl: 'https://public.example.org/sub/reader/', path: 'static/agent/'}`. Repeat with `/sub/reader/static/agent/` and an absolute URL under that same served prefix. The generator writes `static/agent/review-book/index.md`, and its manifest and root index agree. The component instead names `https://public.example.org/sub/reader/agent/review-book/index.md`. The full-text and chapter prompts have the same mismatch.

The controlled deployment serves only the selected generated directory. All custom-folder public prompt requests return 404, while local download, index and manifest requests return 200. This reproduces at `/` and `/sub/reader/`, for home and chapter prompts, with relative, absolute-path and absolute-URL configuration: **12 failing browser assertions**. The default-folder variants pass.

**Required correction:** Make the public prompt directory agree with the generated directory, including supported absolute paths under the configured prefix. Merely documenting that custom folders apply only to downloads does not satisfy this brief. No additional deployment pipeline is needed to demonstrate the mismatch.

**Evidence:** `review-config-evidence/generator-results.json` (`cases`) and `browser-results.json` (`observations`, custom-directory checks).

### 2. P2: Both generator APIs accept public origins the component rejects

**Locations:** `packages/reader-core/src/agent-export/agent-export.ts:82,170–175`; `apps/reader-demo/scripts/build-agent-files.ts:21–29`; compare `packages/reader-core/src/agent-export/agent-paths.ts:37–45`.

**Reproduction:** Call `buildAgentBook` with each of `javascript:alert(1)`, `file:///tmp/book`, `https://u:p@example.org/sub/`, `https://example.org/sub/?x=1`, `https://example.org/sub/#frag`, and `http://127.0.0.1:8773/`. Every call returns an export. The generated addresses contain the supplied scheme, credentials, query, fragment or private host. Both `buildAgentRootIndex([export])` and a direct root-index `siteUrl` option retain these values. The returned `AgentBookExport.siteUrl` propagates them as well.

The demo's environment-variable check rejects non-HTTP schemes but accepts credential-bearing, private, query-bearing and fragment-bearing HTTP URLs. Only its known canonical-map branch calls `canonicalSiteUrl`. The module comment saying generators use that validator is therefore inaccurate. This can put credentials or private addresses into publishable exports, or create links whose appended agent path is actually query/fragment text. No real credential was used; `u:p` is synthetic fixture input.

**Required correction:** Validate and normalise origins at both public generator boundaries, and apply the same contract to the environment fallback. Invalid generator configuration should fail before output is written; the UI should retain its quiet fallback.

**Evidence:** `review-config-evidence/generator-results.json` (`invalid`, including `generated`, `returnedSiteUrl`, `root` and `directRoot`). The probe's exit 0 means it completed recording observations, not that validation passed.

### 3. P2: Private-host aliases are accepted as public and printed in fetch prompts

**Locations:** `packages/reader-core/src/agent-export/agent-paths.ts:43–45,69–78`; `packages/reader-core/src/original/agent/AgentAccess.tsx:49–59,70–72`.

**Reproduction:** On the private fixture preview, configure `http://[::ffff:127.0.0.1]/`, `https://localhost./` or `https://box.tail123.ts.net./`. The validator accepts all three. The first is normalised to `http://[::ffff:7f00:1]/`; the others bypass hostname comparisons because of the final DNS dot. The component prints those addresses in the public-fetch prompt and shows the hosted-reading lead instead of the attachment lead. `https://box.local./` is also accepted by the pure validator.

These are **three failing browser assertions** against the explicit no-private-host prompt requirement. Ordinary loopback and Tailscale values do fall back correctly. No DNS resolution or request to any of these hosts was made.

**Required correction:** Classify normalised private-host forms, including final DNS dots and IPv4-mapped IPv6, before selecting a hosted-fetch prompt.

**Evidence:** `review-config-evidence/browser-results.json` (private-preview checks) and `generator-results.json` (`invalid`).

### 4. P2: Resource paths can emit JavaScript links or escape the reader prefix

**Locations:** `packages/reader-core/src/original/agent/AgentAccess.tsx:22–28,55,85–86`; compare the generator-directory rejection at `packages/reader-core/src/agent-export/agent-paths.ts:24–34`.

**Reproduction:** On `https://public.example.org/sub/reader/`, configure a valid public `siteUrl` and `path: 'javascript:alert(1);void(0)//x'`. The three resource anchors retain `javascript:` hrefs, including `javascript:alert(1);void(0)//x/review-book/full.md`. `new URL` parses this value successfully; it does not restrict protocols. The private-host classification suppresses no resource anchors. A `download` attribute is not protocol validation.

With `path: '../agent/'` or `'%2e%2e/agent/'`, the anchors instead resolve outside `/sub/reader/`, to `/sub/agent/review-book/...`. The generator's directory contract rejects both corresponding directory values. These are **three failing browser assertions**. Safe absolute paths and URLs under the configured prefix were tested and pass their local-link assertions.

The unsafe anchors were inspected only; they were not clicked. The component does not itself fetch them, and this review did not establish an untrusted end-user path into configuration or a server-side fetch vulnerability. The finding concerns the requested configuration boundary, not a claimed newly introduced exploit.

**Required correction:** Reject unsafe resource schemes and traversal before constructing links, while preserving supported absolute paths inside the configured prefix. Invalid configuration must not become an active unsafe anchor.

**Evidence:** The final three checks in `review-config-evidence/browser-results.json` retain the exact DOM hrefs.

### 5. P3: The public-origin validator accepts raw forms outside the stated exact-URL contract

**Location:** `packages/reader-core/src/agent-export/agent-paths.ts:41–45`.

**Reproduction:** `canonicalSiteUrl('https:example.org/sub/')` returns `https://example.org/sub/`. A literal or encoded parent segment in `https://example.org/sub/../escape/` or `https://example.org/sub/%2e%2e/escape/` returns `https://example.org/escape/`, silently moving the configured prefix. A final bare `?` or `#` is accepted because the parsed `search` or `hash` is empty. The generator, meanwhile, retains these raw forms rather than using the component's normalised address.

**Required correction:** Apply the requested raw URL rules before URL-parser normalisation, and keep generator/component handling consistent. This is a lower-severity contract discrepancy: these examples did not demonstrate an open redirect, filesystem escape or network service, and the URL parser's normalisation alone is not proof of an exploit.

**Evidence:** `review-config-evidence/generator-results.json` (`invalid`, final five entries).

## Independent verification and limits

The existing focused agent-export suite **passes 19/19, exit 0**. It checks real-book section coverage, authored Markdown preservation, attribution/source content, sanitised HTML, relative URI resolution, directory guards and reader-query URLs. The new observational generator probe completed with **exit 0** and captured the root/subpath discrepancies above.

The targeted browser probe finished with **88 assertions: 70 pass, 18 fail; exit 1**. Twelve failures concern custom public folders, three concern private-host aliases, and three concern unsafe/traversing resource paths. All root/subpath default-folder prompt requests and all 24 sets of valid local download/index/manifest links pass. Ordinary invalid-origin attachment fallback, public-host fallback, and the HTTP clipboard selection fallback with focus return pass. The browser fixture bundles the current `AgentAccess` source and serves actual generated files. It is a controlled component integration, not a full reader/Vite build or a live public-site test.

The unmodified `build-agent-files.ts --canonical` ran in a review-owned mirror with a byte-identical script, links to the existing source and dependencies and its normal write guards. **It exited 0 and wrote 305 files.** Its single `llms.txt` names all three origins correctly; each manifest has its own book's origin and reader query. `sourceCopySha256` equals `originalScriptSha256` in `canonical-cli-results.json`. The shared build root was not used. The per-domain index remains deployment preparation, as the builder documents; this review adds no deployment requirement.

Source inspection confirms the source footer link is absent from the classic home and shared front-page footer while the licence links remain (`Home.tsx:63–68`; `frontpage/layouts.tsx:124–129`). Export frontmatter and manifest still retain source/licence fields (`agent-export.ts:109–115,156–157`), and EPUB still includes its source/licence links and metadata (`services/publication-epub/index.ts:73–74,193`). EPUB generation and the full front-page, layout, speech and reading-support matrices were not rerun. No claim of live public full-text accessibility is made.

Native preview was attempted first. Navigation succeeded, but both snapshot attempts returned exactly `Preview snapshot failed: Preview automation snapshot timed out after 15000ms.` The fallback used bundled Playwright `chrome-headless-shell`, never system Chrome. Browser page requests were intercepted and fulfilled from the review fixture or rejected; no public host was contacted and no audible voice was used.

## Evidence and handoff

`review-config-evidence/command-exits.json` records the final command exits. `agent-tests.log`, `generator.log`, `browser.log` and `canonical-cli.log` retain execution output. `generator-results.json`, `browser-results.json` and `canonical-cli-results.json` retain the exact URLs and generated index. The two probe sources are retained for reproduction. Rebuild the fixture with the recorded `tsx .../probe-config.mts` command, then run the browser command in `command-exits.json`; its requests are intercepted, so it does not require a live server. Remove the review-owned `scratch/` in a finally step after reproduction.

Review scratch, the isolated canonical output, and the task-owned loopback server were removed or stopped before handoff. No production fix, Git action, push, deployment, additional agent or broader review was performed. The next move belongs to the parent session: correct the configuration findings and commission a focused re-review.
