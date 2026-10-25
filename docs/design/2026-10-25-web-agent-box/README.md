# Web agent box (2026-10-25)

Replaces the large "this copy is hosted at a private address" box. The reader is designed for the public web; the box is a small panel that gives a reader's AI assistant the book's public text addresses.

## Behaviour

- **Panel:** heading, one sentence, the prompt as ordinary wrapped text with one Copy button, a collapsed "Try a question" list (three small rows, each copies prompt plus question), and quiet links: full text (download), chapter index, manifest, and "Copy a prompt for the downloaded file". Width at most 46rem, aligned to the page's content column on the classic home and all six front-page layouts; under a chapter it stays a one-line disclosure.
- **No text focus rectangle:** the prompt is not a tab stop. Buttons, links and summaries keep a 2px accent focus outline.
- **Which address the prompt uses:** `agent={{ siteUrl }}` when configured (validated by `canonicalSiteUrl`: written exactly as `http(s)://host/path`, no credentials, query, fragment, `.`/`..` segment or escaped slash, not a private host including final-dot and IPv4-in-IPv6 forms; a bad value is ignored); otherwise the page's own address when it is public; otherwise the prompt is the "attached text" prompt and the lead says to download and attach the text. A private address is never printed.
- **Files on a deployment:** `path` (default `agent/`) is a folder relative to the reader's root (the page's folder), or an absolute path or http(s) address inside that root or inside `siteUrl`. Its place below the root is the generator's `directory`; the prompt names the same folder under `siteUrl`, so `path: 'static/agent/'` with `directory: 'static/agent'` points at `<siteUrl>static/agent/<book>/…`. A folder with another scheme or origin, credentials, a query or fragment, `.`/`..` (raw or escaped) or an escaped slash is ignored and `agent/` is used, so no configuration produces an unsafe link.
- **Downloads stay local:** the download and index links always use the address the page is served from, so a preview keeps working before anything is deployed. Only the prompt points at the public address.
- **Source footer link removed** from the classic home and all six layouts. The licence, author note, in-book attributions, and `source_url` in agent files and EPUB are unchanged.

## Configuration

- Reader: `PublicationAgentAccess.siteUrl?: string`. The demo reads `apps/reader-demo/src/canonical-sites.ts`: Linguistics `https://linguistics.dominiklukes.net/`, Deliberate Practice `https://deliberatepractice.dominiklukes.net/`, Language Muscle `https://buildingyourlanguagemuscle.edutools.fyi/` (addresses from the estate catalogue; they are the existing public sites, not deployments of the new agent files).
- Generator: `buildAgentBook` and `buildAgentRootIndex` refuse a `siteUrl` that `canonicalSiteUrl` refuses, before any file exists, and the root index checks each export's own `siteUrl` again; the error never repeats the value. The demo applies the same check to `READER_SITE_URL` and to the canonical map. `build-agent-files.ts --canonical` writes each book's links against its own address; `buildAgentBook` returns the `siteUrl` it used and `buildAgentRootIndex` links each book there, so `llms.txt` never points one book at another's origin. Default build stays relative. `READER_SITE_URL` still applies to books without a canonical address. Root and sub-path addresses are both normalised to a trailing slash.
- Reader links keep the reader's own `?book=<id>` form. On the multi-book demo it selects the book; a single-book domain ignores it.

## Verification (local, 127.0.0.1:8773, relative-link build)

| Check | Result |
| --- | --- |
| `npm run build` (core, demo typecheck, vite, agent files) | exit 0, 305 files |
| `npm test` (23, agent export 19, reader 96, books 5) | all pass |
| `docs/design/2026-10-25-web-agent-box/check-web-agent-box.py` (3 books x classic + 6 layouts x 1440/390: containment, own public prompt, no private address, no other book's address, local downloads served, no source link, licence kept, keyboard copy, focus outline, chapter disclosure) | 510 checks, 0 failures |
| `apps/reader-demo/scripts/check-agent-access-ssr.tsx` (server render; configured, bad and private values) | 9 ok |
| `test-frontpage-browser.mjs` | 279 checks, no failures |

Screenshots in `screens/`. The page was previewed on the Tailscale address and showed the Linguistics public prompt with no host warning. The built-in preview failed twice on snapshot; screenshots come from the bundled headless Chromium.

## Limits

- No new agent URL is live; nothing was deployed or fetched. The public prompts point at addresses that serve the existing sites until the generated `agent/` folders are deployed there.
- Under `--canonical` the root `llms.txt` is one demo file linking three origins; each domain still needs its own `llms.txt` at deployment.
- No sub-path browser build; sub-path is covered by unit tests of link generation. Speech, anchored reading and navigation were not touched or re-run.
- Review owed: the new `siteUrl` option and `AgentBookExport.siteUrl` field (config contract).

## URL boundary repair

The public-URL configuration review (`review-config.md`) asked for five corrections. They are made and checked in `repair-config.md`, with evidence in `repair-config-evidence/`.

## Final local checkpoint verification

The final independent URL review is clean within its stated scope. The parent reran the complete root build successfully and compared served bytes on both localhost and the Tailscale preview with the rebuilt index and three book resource files; all eight comparisons matched. Public agent files have not been deployed.

The normal pre-commit secret scan initially flagged 25 SHA-256 checksum records in nine review manifests. Every value in those manifests was verified as a 64-character hexadecimal digest or null. Explicit algorithm/path/digest records preserve every path and digest exactly. The final evidence runner accepts both the original map and these records. This changes the manifests’ serialised bytes after review; it changes no recorded checksum, production source or review conclusion. Verification hooks remain enabled.
