---
title: Repair of the canonical-folder preview download finding
date: 2026-10-25
builder: Claude Opus 5.5 implementation sub-agent
status: repaired-awaiting-security-re-review
answers: review-config-closure.md
evidence: repair-config-closure-evidence/
---

# Canonical-folder preview downloads: repair receipt

No action needed. FOR DOMINIK. **The reader's "Ask an agent" box now keeps its download, chapter-index and manifest links on the page being previewed when the book's folder is written as its full public address; the prompt still names the public address.** The parent session owns the security-boundary re-review before this is accepted or checkpointed.

- The remaining P2 finding from the closure review is fixed in one function. The reviewer's own variant probes went from 2 + 4 failures to none.
- A new browser acceptance (905 checks) fetches every download link and compares its bytes with the generated file in the selected folder. Before the fix it failed 180 times, all on this case; after it, none.
- No other production file changed. All earlier review and evidence files are byte-identical.

## What was wrong and what changed

`locate` in `packages/reader-core/src/agent-export/agent-location.ts` returned the matched prefix plus the folder as the `local` (download) address. When the configured folder was a full `siteUrl` address, the matched prefix was the public one, so downloads went to the public host before anything was deployed there.

The two-origin contract is now explicit in the code: `locate` returns only the generator directory, found below the current reader root or below `siteUrl` with the same validation as before. `agentLocations` then builds both addresses from that one directory:

- `local` = current reader root + directory (only when the page address is known);
- `public` = `siteUrl` (or the page's own root when it is public) + directory.

No special case for any host: the rule holds for root, sub-path and custom folders (`agent`, `static/agent`, `a/b/agent`), and when the preview and public prefixes differ (`/preview/x/` against `/sub/reader/`, `/sub/reader/` against `/`). Query strings (`?book=…&section=…`) do not move the reader root. The validation path is untouched: unsafe text, `?`/`#`/`@`, non-http(s) schemes, dot segments, foreign origins, other ports or schemes on the public host, lookalike hosts and out-of-prefix paths still fall back to `agent/` under the current root. `canonicalSiteUrl`, `isPrivateHost`, the generators, `AgentAccess.tsx`, types, layout and the host filesystem writer are unchanged.

The exact diff is `repair-config-closure-evidence/repair.diff` (98 lines; both "before" sides are hash-verified against the pre-repair snapshot). Source hashes after the repair:

| File | SHA-256 |
|---|---|
| `packages/reader-core/src/agent-export/agent-location.ts` | `1a6206ad226ebb0e356ce289a1372916e456fc59b3772e932e0744f15bd6640b` (before `80fe6ee1…ababeff`) |
| `packages/reader-core/src/agent-export/agent-export.test.mjs` | `2254fbcbe85f66d47a56e99a7fe50c88d19b14ca32d4b26d2cfda7f1f25ca0e2` |
| `agent-url.ts` (unchanged) | `0a22cf017396b626be1d8eac6722c362643702395338f525ee9bff39bf008057` |
| `agent-paths.ts` (unchanged) | `105cf6c96bbe4307bfe388cce952524efdad7cfdc3d1288b48229bc515d10b45` |
| `original/agent/AgentAccess.tsx` (unchanged) | `2a1208e8408acbf7f25b6abcad9a8df0cdd21ba18cf15ede98f1c489323cccd0` |

## Tests

**Unit (`agent-export.test.mjs`).** The assertion at the old line 332, which expected the public address as the download folder, now expects the preview folder. A new test covers three `siteUrl` values × five page addresses (loopback root, sub-path, a different preview path, a `.local` host, the public page itself) × four query forms × three folders × with and without trailing slash: `local` must equal page root + folder, `public` must equal `siteUrl` + folder and match the generator's own manifest link. It also checks the server render (public only) and nine refused forms (same host outside `siteUrl`, other scheme or port, foreign CDN, protocol-relative, lookalike host, `..`, escaped slash).

**Browser acceptance (`accept-canonical-folder-browser.py`, new).** Fixture pages at `/`, `/sub/reader/` and `/preview/` carry generated files for three folders. Both the preview and the public host answer any missing path with **status 200 and an HTML page**, as a single-page static host does, so a wrong link cannot pass on a 404. For each anchor the probe asserts the exact address (preview origin + reader prefix + selected folder + book file), then fetches it and requires status 200, a non-HTML type, the route log naming that exact generated file, and identical bytes; the manifest must parse with the right book id. The prompt must contain exactly the generator's public links and no preview host. It also checks 17 hostile folders, eight private or malformed `siteUrl` values (attachment prompt, no address or IP in it, local default downloads), and no page exception, console error or outside request.

## Commands and exits

All runs used `run-repair-closure.py <phase>` from the evidence folder with the book-engine virtual-environment Python; per-step commands and exits are in `command-exits-red.json` and `command-exits-green.json`, logs in `<step>-<phase>.log`.

| Step | Red (pre-repair source) | Green (repaired) |
|---|---|---|
| Unit, current tests | 25/25, exit 0 (old tests encoded the wrong requirement) | **26/26, exit 0** |
| Unit, new tests against hash-verified pre-repair `agent-location.ts` | — | 24/26, exit 1 (both failures are this finding) |
| Reviewer's original generator probe (byte-identical copy) | exit 0 | exit 0 |
| Reviewer's API/SSR variants (byte-identical copy) | 128/130, exit 1 | **130/130, exit 0** |
| Reviewer's original browser probe (byte-identical copy) | 88/88, exit 0 | **88/88, exit 0** |
| Reviewer's browser variants (byte-identical copy) | 35/39, exit 1 | **39/39, exit 0** |
| New browser acceptance | 725/905, exit 1 (180 failures, all canonical-address downloads served the 200 HTML fallback from the public host) | **905/905, exit 0** |
| SSR check `check-agent-access-ssr.tsx` | 17/17, exit 0 | 17/17, exit 0 |

Further green runs (`extra-command-exits.json`): reader-core `tsc -p tsconfig.json --noEmit` exit 0; reader-demo `tsc --noEmit` exit 0; `npm run build --prefix packages/reader-core` exit 0 (writes the git-ignored `dist`, so the shared preview package carries the fix); `npm run test:agent-export --prefix packages/reader-core` 26/26, exit 0.

## Limits

- **tsx temporary socket.** tsx opens an inter-process socket in `TMPDIR`. Under the in-repo scratch folder that path exceeds the macOS 104-byte socket limit, so tsx steps used the system temporary folder for that socket only; tsx removes it. All fixtures, compiled output and browser files stayed in `repair-config-closure-evidence/scratch/`, which was removed in the `finally` step of each run (confirmed: `scratch removed True`).
- **Overlapping prefixes.** If the page is served on the public origin at a path different from `siteUrl` and an absolute folder lies inside both, the reader root still wins (existing order). That is an inconsistent configuration; it was not changed and not tested beyond the public-page case in the unit test.
- **Not rerun.** The 510-check layout matrix, 279-check front-page matrix, React/speech matrices, demo CLI mirror and root build/test were not rerun; no layout, CSS, generator or CLI source changed. Browser checks used Playwright's bundled `chrome-headless-shell` with every request answered from fixtures; no public endpoint was fetched and no server was started.
- The reviewer's observations (outer whitespace trimmed, double-encoded origin segment retained, final-dot public domain rejected) are unchanged.

## Ownership

Changed: `agent-location.ts`, `agent-export.test.mjs`, this receipt and the new `repair-config-closure-evidence/` folder. Original sites and books, earlier review and repair files and their evidence are unchanged: 112 of 114 snapshotted files match (`source-hashes-before.json` against `source-hashes-after.json`; the two that differ are the two files above). No Git operation, other agent, push, deployment, paid service or audio. Scratch removed; implementation ownership is released. **The parent session should send this diff for a focused security-boundary re-review and repeat until clean.**
