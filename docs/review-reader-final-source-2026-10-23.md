---
title: Final narrow review of reader behaviour and frozen source release
date: 2026-10-23
register: FOR DOMINIK
reviewer: GPT-6 Astra
status: no-remaining-material-findings-within-scope
reviewed_commit: 280b66761e8a4436066bd05040f9167dedcfc01b
runtime_sha256: ed01649710a154c0d8b0ad202e39e8160f962345cfcf1f90636c7faf46452d9c
source_sha256: 5b50174e1fac17ccb4419a89c5eaa37a43a9d6f7ba2a196796b8cca3eaf95ada
publication_authorised: false
---

No action needed. FOR DOMINIK.

**No remaining material findings within scope.** The frozen reader changes and the two exact local release archives pass this independent review. This verdict covers technical behaviour and the inspected distribution boundary; it does not authorise publication or establish legal clearance.

- **MathML selection works through the actual reader.** All 160 supplied browser assertions passed independently, including highlighting, note editing, navigation and reload.
- **Both declared React versions accept the exact package.** Fresh normal installations, strict host types and native imports passed with React 18.3.1 and 19.2.0.
- **The clean source builds without the demo.** Its 29 included Node tests passed, and its rebuilt runtime archive matches the frozen package byte for byte.
- **The source archive is reproducible and excludes the inspected private material.** Its complete manifest, transformations, provenance and three font notices match their inputs.

## Scope and frozen evidence

The reviewed commit is `280b66761e8a4436066bd05040f9167dedcfc01b`. Both archives are under [the frozen release directory](../build/final-280b667/):

```text
reader-core-0.1.0.tgz
205 regular files; 3,164,734 archive bytes
SHA-256 ed01649710a154c0d8b0ad202e39e8160f962345cfcf1f90636c7faf46452d9c

reader-source-release.tar.gz
66 regular files; 102,217 archive bytes
SHA-256 5b50174e1fac17ccb4419a89c5eaa37a43a9d6f7ba2a196796b8cca3eaf95ada
```

I checked the actual bytes against the frozen release record, source manifest, source evidence, both runtime receipts and combined React matrix. All 64 source-input hashes in the frozen source evidence match `git show` at the reviewed commit. Its recorded start/end commits match, with no dirty input or input change during preparation. The production source, templates and build scripts remained unchanged during this review.

I read the original upgrade and public-release plans, the two previous follow-up reviews and their repair receipts, and the MathML text/selection, React compatibility, template-separation and source-boundary records. The previous Unicode/title and EPUB/package findings remain closed. This review does not repeat the broad UI or EPUBCheck audit. The post-review production diff does not change the EPUB service, original stylesheet, content renderer or real-book snapshot.

## Spec

### MathML text, real selection and restoration pass

The namespace-aware exclusion in `packages/reader-core/src/original/publication-html.ts:35` skips MathML `annotation`, `annotation-xml` and `mphantom` subtrees while retaining HTML elements with those names. Selection capture in `use-publication-reader.ts:136` now reads the canonical text of `range.cloneContents()`. It therefore saves authored `x` when Chromium exposes rendered italic `𝑥`, and omits the preserved hidden annotation that native range serialisation includes.

Decoration in `publication-html.ts:135` adds the existing highlight classes and identifier to MathML elements containing matched text. It leaves their children and token text intact. Ordinary HTML still receives range-based marks. The Unicode matcher and complete-code-point boundary mapping remain unchanged from the closed repair.

I independently ran the existing headless runner against source matching the frozen commit. **160/160 assertions passed:** 14 ordinary reader checks, 12 Unicode checks, 20 MathML checks, two quote-image checks and 112 assertions through the actual React selection flow. The four selection scenarios cover a simple formula, mixed bold/link/Unicode content, ordinary text after an expanding Unicode prefix, and a maths-only selection. The real Highlight button and note input persist the canonical quotation; real navigation and full page reload restore it. Formula structure, dimensions, visible text, yellow decoration and margin notes remain intact, without foreign HTML inside MathML.

Additional independent probes passed for repeated dotted-I expansion, supplementary Deseret case matching after an emoji, contextual Greek sigma, a multi-character MathML token with both annotation forms and phantom content, and an ordinary HTML annotation element. They checked canonical restored text, decoration and unchanged formula structure. Partial lowercase expansions and either half of an emoji surrogate pair were rejected.

The documented limits remain accurate: partial-token selection colours the whole MathML token; previously saved rendering-dependent quotations are not migrated. This is not natural-language maths speech, and the browserless fallback is not newly certified as a rendered MathML text model.

### Full identity reaches the browser and Notebook

`apps/reader-demo/src/App.tsx:20` and `packages/reader-core/src/original/ReaderLayout.tsx:366` now use the same full-title helper. Its public export is present at `packages/reader-core/src/index.ts:34`.

Using the rebuilt existing preview on port 8773, I checked the actual document title and clicked **Export to Markdown** for each real book. Downloaded Notebook headings contained “Deliberate Practice: A Universal Learning Method”, “Building Your Language Muscle”, and the complete linguistics title ending “Linguistics Stack Exchange, 2013–2016”. The overlapping word “Answers” appeared once. This used disposable browser storage with a review reflection, not changes to book data or an existing user profile.

The earlier original-worktree proof of 515 inputs, all 253 answer bodies and their order, 21 practice sections and 12 Language Muscle sections remains supplied evidence. I confirmed the frozen snapshot hash and absence of a new book-data diff; I did not rerun that entire original-worktree comparison.

## Standards

### React peers, public declarations and native imports pass

Both frozen runtime receipts and the combined matrix identify the same actual tarball hash shown above. Their runners perform normal npm resolution with strict peers, explicit host React types and `skipLibCheck: false`. I inspected the consumer type fixtures and browser driver, including actual selection/persistence, sharing, navigation, fonts, mobile controls and legacy ReaderShell coverage.

I also freshly installed the **frozen tarball itself** into two disposable consumers. Both used `--strict-peer-deps`, `--legacy-peer-deps=false`, `--force=false`, disabled lifecycle scripts and the seven-day release-age setting. React/ReactDOM were 18.3.1 and 19.2.0 respectively; host type packages were 18.3.27/18.3.7 and 19.2.2/19.2.2. TypeScript was 5.9.3. Both dependency trees passed `npm ls --all`.

The unchanged strict consumer fixture passed for both installations, including JSX, createElement, ComponentType assignment, coaching callbacks, legacy props and expected negative type errors. Fresh native Node probes imported the package, checked existing/new APIs and full-title composition, and received the intended browser-only EPUB rejection. The installed-consumer browser matrix is inspected parent evidence, not a second independently rerun full browser matrix. My fresh 160-assertion browser run used React 18.3.1.

### Source copying and template separation preserve the intended boundary

The exporter constructs its own candidate from core source and named support inputs; it does not copy the repository wholesale. Relevant implementation is in `scripts/prepare-reader-source-release.mjs:42` for regular-file inputs, line 53 for source traversal, line 99 for the allowlist, and line 264 for candidate assembly.

All **54 unchanged source/configuration/build files** in the archive match the frozen Git bytes. I independently reconstructed the two test omissions from their exact named test boundaries and compared the resulting bytes and recorded hashes. Only the real-book identity test and original manuscript SVG fixture test are removed. The remaining tests execute successfully without those private inputs.

The archived README, licensing text and native-import script exactly match their separate templates. The package verifier also reads its native probe, JSX and HTML from separate templates; I inspected these callsites and used its type/native fixtures in the independent consumers. Its retained-artifact logic copies the installed tarball itself, and the final frozen receipts match the retained bytes.

The provenance JSON contains 15 original project/relative-file/hash mappings and verified exported-input hashes. It excludes the private extraction reports and original absolute paths. Both source manifests and the runtime package manifest retain `private: true`; no framework software licence grant is added. The README and licensing document describe an unreleased review draft.

### Exact archive exclusions and reproducibility pass

I enumerated every member in both archives: all members are unique regular files. The source archive has sorted paths, mode 0644 and zero timestamps/owners. Every source member's path, size and SHA-256 matches the external manifest, and the embedded exported-input hashes match the corresponding members.

Independent scans of textual archive members found no absolute user-home paths, private control-plane references, credential-shaped literals or copied real-manuscript spans. The manuscript scan rebuilt **12,831 distinct anchors** from the frozen private book snapshot and found none in either archive. The single generic `file:///etc/passwd` sanitisation fixture is intentional; the exporter's exact exception and rejection of an additional private file URL passed its self-tests. No demo, private review/research folder, source map, Git data, environment file, installed dependency directory or host-tool implementation is included.

I extracted the exact source archive into disposable repository-owned scratch and ran a real registry-enabled `npm ci` with its lockfile, an isolated cache and lifecycle scripts disabled. **Build, 22 content tests, seven reader tests and native package-name imports all passed.** No demo or original application checkout was present or linked into that build. The existing Browserslist advisory was non-fatal.

Every one of the **205 runtime member bytes** matched that independent source build. Packing the resulting core reproduced the frozen runtime SHA-256 exactly. Separately, I reconstructed the source ustar stream with Python's tar implementation and compressed it with the documented Node gzip implementation: the complete source archive also matched exactly. Python's different gzip implementation produced a different compressed hash despite an identical tar stream; the exact reproduction claim is for the tested Node toolchain.

All three font notices are byte-identical between the source archive, runtime archive and actual installed font packages, and contain the supplied SIL Open Font License text. The four previously documented missing development-tool notices remain separate inventory limitations; those implementations are absent from both archives. The zero production-advisory result remains inspected prior evidence, not a fresh online security audit or legal conclusion.

## Verification limits and handoff

The browser work used the existing sibling Python environment, Playwright 1.64.0 and bundled Chromium headless shell 153.0.8010.12. Node was 26.12.1 and npm 11.20.0. No system Chrome automation or new server was used. All isolated installations, download/profile scratch and browser harness scratch were removed in `finally`.

Three review-harness assumptions were corrected without production edits: the private-path scan initially matched a relative `components/home` import; the linguistics probe needed a nested answer rather than a contentless theme; and the independent MathML fixture needed the XHTML encoding on its HTML alternative to prevent HTML-parser breakout. The completed checks above passed after those corrections.

Only this review document is retained as my change. No code fix, original-worktree edit, Git mutation, push, deployment, secret/environment-file access or delegation occurred. The parent can use this report to close the narrow technical audit and complete its own release records. **The working branch must remain local:** its existing public upstream is not an approved destination for private history or fixtures. Software licensing, public scope and any later publication remain author decisions. No action is required from Dominik for this review.
