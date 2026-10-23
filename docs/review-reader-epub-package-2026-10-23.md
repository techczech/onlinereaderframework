---
title: Independent review of original-reader EPUB export and packaging
date: 2026-10-23
reviewer: GPT-6 Astra
register: FOR DOMINIK
status: changes-required
reviewed_commit: 08324558cd38c0f05467522be4fe0940fe8854e7
scope: Publication EPUB service, export controls, clean package build and distribution audit
---

No action needed. FOR DOMINIK.

**Verdict: changes required.** Two demonstrated export defects block acceptance of the reusable EPUB service. The documented package-build sequence also needs correction before release rehearsal. The tested real-book exports and browser controls work; these findings concern inputs and build paths their successful checks do not cover.

- All three immutable real-book snapshots and both supplied fixtures passed independently through EPUBCheck with zero messages.
- Supported reader routes can become external links or abort export, and XML cleanup can invalidate previously unique content IDs.
- The supplied tarball contains its stylesheet and fonts, but the core-only build removes them without rebuilding them.
- Public distribution remains gated by the recorded licence, notice and scope decisions. This review grants no rights or publication approval.

The review is against **08324558cd38c0f05467522be4fe0940fe8854e7**, resolved from the requested short hash. The initial architecture review and upgrade plan were read. Findings use repository-relative source locations at that commit. The separate reader UI/content review owns the earlier implementation; this report does not repeat its broad interaction audit.

## Spec

### 1. Medium, blocking: Export does not recognise all routes supported by the reader

**Evidence:** [EPUB link rewriting](../packages/reader-core/src/services/publication-epub/index.ts:79) treats every non-`#/` link as an ordinary URL. At [line 94](../packages/reader-core/src/services/publication-epub/index.ts:94), it splits a `#/` route at `#` but never separates its query string. The actual [reader link handler](../packages/reader-core/src/original/use-publication-reader.ts:224) accepts both query routes and legacy hash routes; [the route decoder](../packages/reader-core/src/original/publication-model.ts:50) removes legacy query parameters before looking up the section.

**Reproduction:** Export a book with sections `a` and `b`, source URL `https://example.org/reader`, and either of these links in section `a`:

```html
<a href="?section=b">B query</a>
<a href="#/b?text=target">B legacy</a>
```

The first becomes `https://example.org/reader?section=b`, taking the ebook reader out of the archive instead of to the included chapter. Without a source URL, the link loses its `href`. The second rejects the entire export with `Publication chapter link targets a section outside the EPUB: b?text=target`, although section `b` exists. Both are supported navigation forms in the live reader. The first archive even passes EPUBCheck: structural validation cannot detect this loss of internal navigation.

**Required correction:** Resolve same-book links through a route interpretation consistent with the reader, then map the resolved section and any applicable fragment to archive targets. Retain genuine external hyperlinks. Add both cases to the browser exporter checks. This is a compatibility correction, not a request to redesign routing.

### 2. Medium, blocking: XML cleanup can create duplicate IDs and broken references

**Evidence:** [The XHTML copier](../packages/reader-core/src/services/publication-epub/epub-xhtml.ts:44) starts from the shared renderer's sanitised, ID-normalised HTML. [Attribute copying](../packages/reader-core/src/services/publication-epub/epub-xhtml.ts:58) then removes XML-forbidden characters from each value independently. [Serialisation](../packages/reader-core/src/services/publication-epub/epub-xhtml.ts:32) checks XML parsing, not ID uniqueness or reference integrity. [Link rewriting](../packages/reader-core/src/services/publication-epub/index.ts:80) skips every ordinary local fragment.

**Reproduction:** Supply HTML containing IDs `a` + U+0001 + `b` and `ab`, plus a link to `#a%01b`. The shared renderer distinguishes the IDs, but export returns two elements with `id="reader-content-ab"` and a link to the now-absent `#reader-content-a%01b`. EPUBCheck reports **three errors**, including duplicate IDs and an undefined fragment. Two SVG gradient IDs differing only by U+0001 likewise collapse; that archive returns successfully but produces **two duplicate-ID errors**. Its paint reference can consequently address the wrong gradient.

A simpler `<a href="#missing">Missing footnote</a>` also returns an archive rather than reporting the unresolved target; EPUBCheck reports one undefined-fragment error. Normal paired Markdown footnotes passed. The problem is final reference validation, not the ordinary footnote converter.

**Required correction:** Perform XML character normalisation before assigning unique IDs and references, or reject inputs whose normalisation would invalidate them. Validate final IDs, local fragment links and SVG references after transformation. Unresolvable targets should produce explicit errors. These probes established invalid EPUB output and potential diagram misrendering; they did **not** establish script execution.

## Standards

### 3. Medium: The documented core build removes the advertised stylesheet and fonts

**Evidence:** [The new build script](../scripts/build-reader-core.mjs:7) removes all of `dist` and then runs only TypeScript. [The core manifest](../packages/reader-core/package.json:13) still exports `dist/reader.css`. Styles and fonts are produced by a separate [style builder](../scripts/build-reader-styles.mjs:9), invoked by [the root build](../package.json:8), but omitted from the [release plan's command sequence](plan-public-reader-release-2026-10-23.md:50).

**Reproduction and result:** I ran the exact compiler stage with an isolated temporary `outDir`. It passed and emitted **86 files, no CSS, no fonts and no maps**. Combined with the preceding unconditional deletion, this establishes that `npm --prefix packages/reader-core run build` leaves the advertised CSS export absent. Following the release plan's subsequent demo build and pack steps does not run the separate style builder. A consumer importing `reader-core/reader.css` then fails to resolve it.

The supplied 203-file tarball is complete because its preparation included the root style step. **This finding does not say that tarball lacks styles.** Make the supported package-build command produce the complete exported package, or make the required composition explicit and correct the release commands. The plan also still describes root `npm install` and enabled declaration maps; both descriptions are stale at this commit.

### 4. Compatibility limit: SSR-safe service import is narrower than native package import

**Evidence:** [The package entry point](../packages/reader-core/package.json:6) is ESM, but [the public barrel](../packages/reader-core/src/index.ts:1) contains extensionless relative exports. [Its new EPUB export](../packages/reader-core/src/index.ts:31) also uses a directory specifier. TypeScript's [Bundler module resolution](../packages/reader-core/tsconfig.json:10) leaves these specifiers in emitted JavaScript.

A native Node import of `packages/reader-core/dist/index.js` fails with `ERR_MODULE_NOT_FOUND` for `dist/types`, before either export API can be used. In contrast, importing the emitted service file directly succeeds without DOM globals, as does bundling and importing the entire public barrel for Node. Calling generation there rejects with the intended browser requirement. The direct service path is not an exposed package subpath.

This is an **inherited package-format limitation**, not a new DOM access regression. It does not block the verified Vite/browser consumer. Before claiming general SSR compatibility, either support native Node package resolution or document the required bundling/transpilation boundary and test that supported host path. Do not describe the successful bundled import as proof of native `import('reader-core')` support.

### Public-release gates remain open

The core manifest retains `private: true` and has no software licence field. The exact reviewed tarball contains the three font licence files. Its successful exclusion audit does not establish redistribution rights over software, content or assets.

The independently rerun distribution auditor returned **exit 1**: `pack.issues` was empty, while the installed inventory still reported missing notice files for `@esbuild/darwin-arm64`, `@rollup/rollup-darwin-arm64`, `dlv` and `encode-utf8`. This was the installed-inventory result; it does not assess the later supplemental-notice work occurring concurrently. The parent should reconcile that evidence and any justified exclusions in the release record. The unresolved software/public-scope decisions and any selected real-book asset/content rights remain release gates, not additional reasons to stop private implementation.

## Independently verified evidence

**Actual source reuse.** I read the original Language Muscle `services/epubService.ts` and Deliberate Practice `utils/epubGenerator.ts`. The new service retains LM's JSZip EPUB 3 construction sequence, recursive preorder traversal and nested navigation, plus its chapter typography. DP's five-character XML escaping and aside/stylesheet approach are recognisable in the adaptation. Generated archive filenames, DOM-based XHTML construction and explicit byte-supplied assets are justified adaptations. This is actual algorithm/style reuse rather than a replacement unrelated exporter.

**Service and archive checks.** I bundled the existing browser test in memory and ran its checks myself using the authorised sibling Python Playwright installation and bundled Chromium headless shell. The final run loaded the three book snapshots with read-only `git show` from the immutable commit, avoiding concurrent manuscript changes. EPUBCheck 5.4.0 returned zero fatals, errors, warnings and infos for all five archives: rich fixture, supplied-SVG fixture, Deliberate Practice (21 sections), Language Muscle (12) and Linguistics (262, including nine theme containers).

The checks covered mimetype placement/storage, safe archive paths, metadata escaping, recursive navigation, chapter/heading links, paired footnotes and backlinks, tables, code, SVG/MathML namespaces and manifest properties, image embedding, exact shared-renderer chapter text and rich-element counts. This establishes fidelity from the shared renderer into EPUB; it does not independently establish that the upstream real-book imports preserve every original-source feature.

**Negative and network checks.** Missing image bytes, duplicate section IDs, absent chapter routes, unsupported media types and unsafe supplied SVGs were rejected. I additionally tested PNG bytes declared JPEG, GIF bytes declared PNG and a truncated PNG with a valid signature: all rejected. SVG script/event/style/external-reference/entity payloads, a spoofed xlink namespace and an entity-obfuscated external paint URL were rejected. A control-character-obfuscated JavaScript link and an SVG JavaScript link lost their active URLs. All service checks recorded **zero network requests**. The failing custom link/ID archives are reported above; the temporary archives were removed.

**Reader controls.** On the existing source-linked preview at port 8773, Language Muscle's actual home, desktop header and expanded sidebar buttons each triggered an EPUB download with the expected archive structure. No page errors or external requests occurred during that check. A separate in-memory mount of the actual components confirmed that `epub={false}` hides generated-download controls on home and chapter views. With a configured static download and `epub={false}`, the home link and header/sidebar controls remain available; clicking the header navigated to the configured URL through a browser interception, without contacting the external host. The initial header probe timed out because the header is absent on home; the corrected check entered a chapter first and passed.

**Packaged output.** The tarball SHA-256 is `0d807c72b75a59272564033c64a8807fabb5e62b0a9491eec5aab403e4d9b357`, matching the supplied artefact. I inspected all 203 file entries; every packed `dist` file matched the existing generated output. All 112 CSS font URLs resolved inside the archive, with no external CSS resource URLs. The three font notices are present. The audit self-test passed, and the actual pack audit found no excluded manuscript, map or private-path content under its documented heuristics.

I opened the already-built installed-consumer output through in-memory browser routing, without starting a server. Inter, Merriweather and Material Symbols loaded; the reading view contained its table and footnotes, with no page errors or missing/external resource requests. The bundled public API exposed both new EPUB functions and the old reader/parser/export functions. I did not repeat the parent's offline installation or consumer build, and this narrow check does not establish full desktop/mobile visual acceptance.

## Scope, changes and handoff

Runtime evidence used Node 26.12.1, Chromium 153.0.8010.12 and EPUBCheck 5.4.0. No full root build or broad UI regression suite was rerun. The isolated TypeScript stage passed. The existing verification harness was evaluated in memory so its normal report-writing step did not overwrite another worker's evidence.

Other workers changed demo import/content files, documentation, dependency versions and notice evidence during review. Those changes were preserved; later dependency updates and supplemental notices are outside this immutable-head verdict. The reviewed service, export wiring, core build configuration and packaging scripts still matched the immutable head when checked; final real-book service checks used the commit's snapshots explicitly. Temporary compiler output and EPUB archives were confined to this repository and removed. **Only this review document remains as this reviewer's change.** No code fix, dependency installation, Git mutation, original-source edit, secret or `.env` read, deployment, persistent server or delegation occurred.

The parent implementation session should resolve the two export findings, correct the package-build recipe and rerun the affected checks. Native-package SSR support must be stated accurately. Public release remains a later, explicitly authorised step. No action is required from Dominik for this review handoff.
