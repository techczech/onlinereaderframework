---
title: Repair of the public agent URL boundary
date: 2026-10-25
builder: Opus 5.5 (hard seat, security-sensitive URL validation)
status: ready-for-re-review
answers: review-config.md
---

# Public agent URL boundary: repair receipt

No action needed. FOR DOMINIK. **The five findings in `review-config.md` are fixed as one URL contract that the generators, the demo build and the reader box share.** Nothing was deployed, published or fetched from a public host. An independent security re-review is owed before acceptance.

- A custom agent folder now gives working public prompt links, at a site root and under a sub-path, whether the folder is configured as a relative path, an absolute path or an address.
- Both generators, the root index and the demo build refuse an unusable public address before writing anything, and never repeat the refused value in the error.
- Private-host aliases (a final DNS dot, numeric IPv4 forms, IPv4 inside IPv6) are recognised, so they never appear in a prompt that asks a hosted assistant to fetch them.
- No configuration of the folder can produce a `javascript:` link or a link outside the reader's prefix; an unusable folder is ignored and the default `agent/` is used.

## The contract

**Public address (`siteUrl`, `READER_SITE_URL`, the canonical map).** `canonicalSiteUrl` checks the raw text before the URL parser runs, because the parser silently repairs `https:host`, `/../`, `%2e%2e`, tabs, backslashes and numeric IPv4. It accepts only `http(s)://host/path` written exactly. It refuses credentials, any `?` or `#` (even empty), `.` or `..` segments (raw or escaped), escaped `/` or `\`, malformed escapes, whitespace and controls, characters that could close a Markdown link (`()[]<>"'`), a host ending in a final dot, and private hosts. It returns the parser's normalised form with one trailing slash. It never throws. The reader ignores a refused value quietly; the generators throw through the internal `requireSiteUrl`. `undefined` and `''` still mean "relative links", as before.

**Private hosts.** `isPrivateHost` classifies both the raw value and the parser's form, and fails closed on anything that is not a host. Private means: loopback, RFC 1918, link-local, CGNAT/Tailscale `100.64/10`, `0/8`, multicast and reserved, IPv6 loopback, unique-local, link-local, site-local and multicast; IPv4 embedded in IPv6 (mapped `::ffff:`, compatible, NAT64 `64:ff9b::/96` and local-use, 6to4) by the embedded address; single-label names; and `localhost`, `.local`, `.localdomain`, `.internal`, `.lan`, `.home.arpa`, `.ts.net`, all after removing final dots. No DNS lookup or network call is made.

**Folder (`PublicationAgentAccess.path`).** The reader's root is the folder of the page (`?book=&section=` never changes it). The configured folder must resolve inside that root, or inside `siteUrl`. Its place below that prefix must pass the generator's own `agentDirectory`, so it is exactly the generator's `directory`. Downloads use the folder where the page is served; the prompt uses `siteUrl` plus the same directory, or the page's own root when that is public. Before the URL parser runs, the folder text is refused if it has a scheme other than `http(s)://host`, credentials, `?` or `#`, escapes for `.`, `/` or `\`, controls, whitespace or backslashes, or a `.` or `..` segment after a leading `./`. A refused or out-of-scope folder is ignored and `agent/` is used. A foreign origin, including a public CDN, is refused: neither the type documentation nor `agent-access.md` documents files served from another origin, so allowing one would widen the contract.

**Writer containment** in `build-agent-files.ts` is unchanged and still independent: the output must be the demo's `dist`, and every file path is checked to stay inside it.

## Decisions

1. **No new option or public export.** The existing `path` and `siteUrl` resolve the ambiguity once the rebasing rule is defined. `canonicalSiteUrl` and `isPrivateHost` keep their names and both barrels still export them; `isPrivateHost` now takes `unknown`, which widens its input type without breaking callers. `agentLocations` and `requireSiteUrl` are internal. `verify:package` passes, and the export list is unchanged (`package-surface.log`).
2. **Two small private modules instead of one,** to avoid a circular import: `agent-url.ts` (address and host rules, no imports) and `agent-location.ts` (folder resolution, imports `agentDirectory`). `agent-paths.ts` re-exports the two public functions from `agent-url.ts`.
3. **The root index checks every export's own `siteUrl` again,** so an export built by hand cannot carry an address the generator would have refused.
4. **Error messages never repeat the refused value,** because it could hold credentials or a private address. A test asserts this.
5. **Server rendering** has no page address, so only the public folder is known: a relative folder, or an absolute one inside `siteUrl`. The browser then adds the local download address after mount, as before.
6. **A configuration where a preview at `/` points at a folder configured for `/sub/reader/`** maps its path below the current root literally (`sub/reader/static/agent`) onto `siteUrl`. That follows the rebasing rule in the brief; such a preview's local links would not find the files either.

## Files

| File | Change |
| --- | --- |
| `packages/reader-core/src/agent-export/agent-url.ts` | New. `canonicalSiteUrl`, `isPrivateHost`, internal `requireSiteUrl` and shared raw-text rules. |
| `packages/reader-core/src/agent-export/agent-location.ts` | New, internal. `agentLocations`: the rebasing contract above. |
| `packages/reader-core/src/agent-export/agent-paths.ts` | The two functions moved out and re-exported; the inaccurate comment that generators used the validator is gone. |
| `packages/reader-core/src/agent-export/agent-export.ts` | `buildAgentBook` and `buildAgentRootIndex` validate `siteUrl` before any file; the root index re-checks each export's address. |
| `packages/reader-core/src/original/agent/AgentAccess.tsx` | `useWhere` reads the page address once and calls `agentLocations`; no hard-coded `agent/` in the prompt. |
| `packages/reader-core/src/original/types.ts` | Documentation of `path` and `siteUrl` only. |
| `apps/reader-demo/scripts/build-agent-files.ts` | `READER_SITE_URL` and the canonical map use the same `canonicalSiteUrl` check before anything is written. |
| `apps/reader-demo/scripts/check-agent-access-ssr.tsx` | Eight more server-render cases: three private aliases and a malformed origin, a custom folder, four unsafe folders. |
| `packages/reader-core/src/agent-export/agent-export.test.mjs`, `test-agent-export.mjs` | Six new tests; the harness compiles `agent-location.ts`. |
| `docs/design/2026-10-25-web-agent-box/README.md` | The superseded "custom folder applies to downloads only" line is corrected; a pointer to this receipt. |

Not touched: speech, anchored reading, the outline, front-page geometry, the classic home, the CSS, the removed source footer, the canonical map and the demo's reader wiring (their hashes are unchanged in `source-hashes-after.txt`).

## Evidence

All under `repair-config-evidence/`; exits in `command-exits.json`. The prior review folder is unchanged (`prior-review-evidence-hashes.txt` matches).

| Check | Before the fix | After |
| --- | --- | --- |
| Focused agent-export tests (six new) | 19 pass, 6 fail, exit 1 | 25/25, exit 0 |
| Reviewer's browser probe, byte-identical copy | 88 checks, 18 failures, exit 1 | 88/88, exit 0 |
| Reviewer's generator probe, byte-identical copy (observational) | custom folders mismatch; invalid origins accepted | 4/4 custom-folder cases match; 17/17 invalid origins refused |
| Generator acceptance (`accept-config.mts`, the probe turned into assertions) | n/a | 154/154, exit 0 |
| Browser acceptance extras (`accept-config-browser.py`) | n/a | 48/48, exit 0, no outside request |
| Mutation check: each defect reintroduced alone | n/a | 10/10 caught by a named test; sources restored byte for byte |
| Server-render check | n/a | 17/17, exit 0 |
| T3 native preview, loopback server, sub-path page | n/a | first attempt worked; six cases, all links 200 |
| `--canonical` in an isolated mirror, byte-identical script | n/a | exit 0, 305 files, three origins correct, no private or script address |
| Six bad `READER_SITE_URL` values | n/a | each exit 1 before any output, value not echoed |
| `npm run build` / `npm test` / `npm run verify:package` | n/a | exit 0 / exit 0 (23, 25, 96, 5) / exit 0 |

The browser probes use bundled Playwright `chrome-headless-shell`, never system Chrome, because only Playwright can intercept the `public.example.org` requests; nothing reaches a real host. The T3 preview was tried for the served-fixture check and worked on the first attempt. No audio was played.

## Limits

- The 510-check web agent box matrix and the 279-check front-page matrix were not rerun: no layout, styling or markup outside the box's link and prompt addresses changed, and the build, unit suites and focused browser checks cover the changed contract.
- The public prompt addresses were fetched only through intercepted fixtures; no public host was contacted and no new agent address is claimed live.
- Production deployment and per-domain `llms.txt` remain deployment preparation, as the README already states.
- Scratch fixtures, the isolated mirror and the loopback server were removed or stopped. No Git operation was performed. Builder ownership of these files is released at handoff.
