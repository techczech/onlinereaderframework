---
title: Independent review of configurable reader front pages
date: 2026-10-25
register: FOR DOMINIK
reviewer: Codex gpt-6.1-sol
status: changes-required
baseline: Current working files; parent identifies base as 47e7354; no Git commands run.
evidence: evidence-review/
---

**No action needed. FOR DOMINIK.** The six configurable reader front pages need four corrections before acceptance. The public package and saved-position checks passed. This is an independent review; the reviewer wrote no implementation or production fixes.

- **An explicit contents depth of one loses structural topics.** This affects the public configuration contract.
- **Notes is absent on front pages.** The reported desktop chapter-page cutoff did not reproduce.
- **Search does not move keyboard focus into search.** Opening the sidebar alone does not complete that journey.
- **Dark topic cards have low text contrast.** Their new background needs a dark-theme treatment.

The implementation owner receives these findings. Dominik has no review task here. Release acceptance remains with the parent session.

## Scope and evidence

I read the implementation receipt, the six layouts and their shared model, configuration declarations and exports, storage controller, demo routing, packaged stylesheet build, original prototype behaviour and styles in both design folders, and the existing package-verification script. I used the original prototype geometry as the design reference, including the jacket spread, reading panel beside contents, narrow book column, title beside contents, topic tiles, and overlapping colour band.

The exact reviewed file bytes are recorded in [source-hashes.json](evidence-review/source-hashes.json). The supplied base commit is contextual information, not a Git-verified diff. Findings refer to the working files at those hashes.

The native T3 browser opened an owned tab at `http://localhost:8773/`. Two consecutive snapshot attempts both returned exactly: `Preview snapshot failed: Preview automation snapshot timed out after 15000ms.` I then used bundled `chromium_headless_shell` through the existing book-engine Python Playwright environment. No installed Chrome was used.

## SPEC findings

### P2 — Explicit contents depth one removes topics that contain readable pages

**Requirement:** Honour `navigation.homeDepth` and preserve the actual tree's identities and order. Depth limits should limit nesting, rather than erase non-empty branches.

**Source:** `packages/reader-core/src/original/frontpage/frontpage-model.ts:74–78`. The model first truncates descendants to the configured depth, then drops a branch when the truncated readable count is zero. This mistakes a hidden descendant for an empty branch. It also happens at greater depths when the first readable descendant lies below the cap.

**Reproduction:** In the actual installed package, use a root `group` with no own text and a readable child, plus a root `meaningful` with own text. Select Colour band and `navigation: { homeDepth: 1 }`. Only `meaningful` appears. At depth two, `group` reappears. A book composed entirely of structural topics loses the entire front-page contents at depth one.

**Evidence:** `evidence-review/installed-browser-results.json`, records for depths 0–3; reproducible with `probe-installed.py`. Depth one produces `groupTitles: ["meaningful1 entry"]`. The shared model means this affects all six layouts.

**Required disposition:** Preserve structural headings whose complete subtree contains readable content, independently of the depth cap. Continue to honour zero as hiding contents. Counts must remain explicit about what they count. This review makes no implementation change.

### P2 — Front pages omit the separately required Notes control

**Requirement:** Listen, Formatting, Assist and Notes remain separately visible and usable.

**Source:** `packages/reader-core/src/original/toolbar/ReaderToolbar.tsx:124–126` renders Notes only when `!props.isHome`.

**Reproduction:** Open a front page for any of the three books at 1440 px. The toolbar contains only Listen, Formatting and Assist; Notes is absent from the DOM. This is conditional omission, rather than the title pushing Notes beyond the viewport. Saved notes cannot be opened directly from the front page.

**Evidence:** `evidence-review/browser-results.json` records all three books. The dark screenshots also show the three controls. This existing condition fails the explicit four-control requirement for the newly delivered front pages; its age does not waive that requirement.

**Required disposition:** Make Notes available on the front page under the agreed toolbar behaviour, or obtain an explicit scope exception from the parent/user. The reviewer does not grant that exception.

## STANDARDS findings

### P2 — Activating front-page Search leaves focus on its trigger

**Expected behaviour:** A keyboard user activating Search can immediately type into the search field.

**Source:** The shared trigger is `packages/reader-core/src/original/frontpage/layouts.tsx:100–102`; the handler at `use-publication-reader.ts:242` opens the sidebar and requests search focus. The sidebar attempts focus in `Sidebar.tsx:114–119`, while its visibility is controlled by transitions in `reader-original.css:73–79`. The intended focus request does not result in input focus in the tested browser. I have not established the precise transition/effect ordering responsible.

**Reproduction:** Open Linguistics with Colour band, focus its Search button and press Enter. After 600 ms the sidebar is open, but `document.activeElement` is still `BUTTON.publication-front-secondary`, with text `searchSearch`. This reproduces at both 1440 and 390 px. Immediate typing therefore does not enter the search field.

**Evidence:** `evidence-review/browser-results.json`, the two `searchFocus` records; `probe.py` repeats the interaction. This confirms the builder's reported limitation. The new front pages make this a primary journey, so shared/classic behaviour is not sufficient grounds to accept it.

**Required disposition:** Complete the focus transfer when the field becomes focusable and verify Enter followed by typing, on desktop and mobile drawer layouts.

### P2 — Dark topic-map cards reduce body and action text contrast

**Expected behaviour:** Ordinary-sized contents and action text remain readable under the existing dark appearance setting.

**Source:** `packages/reader-core/src/original/frontpage/frontpage.css:160` mixes 40% white into the paper background for every topic tile, including dark mode. Shared entry text inherits the light ink colour, and Show all uses the lightened accent.

**Reproduction:** Open Linguistics with Search and topic map, enable dark mode, and examine a topic card. The computed tile background is `color(srgb 0.44 0.456471 0.491765)`; entry text is `rgb(229, 231, 235)`. Their contrast is **3.76:1**. Show all uses `color(srgb 0.846863 0.611765 0.547059)`, giving only **2.01:1** against that tile. These ordinary-sized labels fall below a 4.5:1 body-text target. The card problem is new front-page styling.

**Evidence:** [Dark topic-map screenshot](evidence-review/dark-opus-search-map.png), computed styles in `browser-results.json`, and luminance calculations in `contrast.json`. I also sampled Jacket and Colour band. The shared filter's brightened background is marginal at 4.46:1 for entered text; the substantially weaker tile text/actions are the reported defect.

**Required disposition:** Use a dark-theme tile surface and verify both entry text and Show all, including focus visibility, against that surface.

## Other requirement dispositions

**Six real layouts:** The components preserve the six principal geometries rather than applying six palettes to one page. They share one contents/action/state model. The prototype reading-time/year metadata and second accent are omissions, but the approved contract does not require invented metadata or a second colour system. Deliberate Practice feature cards are optional material rather than a missing core layout geometry. I do not raise these as defects.

**Contents wording and truthful entries:** The shared controls use Contents and Full contents. Counts say entries, and meaningful parent pages retain their own link. Including License or Reader Guide in an entry count does not falsely describe them as chapters. The App Guide is unnumbered for the flat real-book grouping. The synthetic nested-guide case was not separately exercised.

**Desktop title crowding:** The builder's claimed Notes cutoff at 1440 px did **not** reproduce after starting a Linguistics chapter. All four controls were hit-testable; Notes occupied x=1329.08–1420 within the 1440 px viewport. See [chapter toolbar screenshot](evidence-review/chapter-toolbar.png) and the final record in `installed-browser-results.json`. This finding must not be conflated with Notes being absent on home.

**Public package:** An isolated adaptation of the existing `verify:package` script built core independently, packed it, installed it offline with strict peer dependencies, type-checked the public API with `skipLibCheck=false`, imported it in native Node ESM without DOM globals, and server-rendered all six configured layouts. Invalid layout keys were rejected by the public TypeScript type and fell back safely at runtime. The installed browser consumer rendered all six keys and invalid-key classic fallback using the shipped stylesheet. Distinct geometry selectors were checked in that stylesheet. React was 18.3.1; TypeScript was 5.9.3.

**Saved position and book isolation:** The installed consumer ignored deleted ids, non-readable structural group ids and wrong-type saved values. A valid readable grandchild offered Continue. Throwing storage reads/writes produced the storage-unavailable notice, with no page errors, and Start still navigated. In the demo, switching books in the same mounted application selected each book's own saved page. Returning to the first book restored its saved page. Seeded bookmarks, highlights and reflections retained their exact stored values. Preview back/forward restored the layout and book. See `installed-browser-results.json` and `state-results.json`.

**Depth defaults:** Explicit depths zero, two and three capped the installed consumer as expected, with meaningful parent links preserved. The automatic full/summary choice does not expose entries beyond the configured cap. Depth one has the separately reported structural-topic defect.

**Shared reader state and URLs:** Layout selection consumes the existing reader callbacks and saved data, rather than creating another annotation or playback store. Targeted Start navigation retained the `book`/`section` query route. Full historical URL compatibility and actual audio playback were not re-tested.

## Commands, limits and cleanup

All commands ran from the owning reader repository. Evidence scripts live under `docs/design/2026-10-25-configurable-frontpages/evidence-review/`:

- `../book-engine/.venv/bin/python …/probe.py` completed with exit 0 and retained browser measurements plus three dark screenshots.
- `node …/verify-package-review.mjs` completed with exit 0; `package-check.log` records the independent build, offline installation, public-type checks, native import, six-layout SSR and consumer production build. Initial review-harness fixture mistakes were corrected before the successful final run; they were not product failures.
- `../book-engine/.venv/bin/python …/probe-installed.py` completed with exit 0 and retained installed-browser results and the chapter-toolbar screenshot. An earlier run against an incomplete review fixture was interrupted, then rerun against the corrected consumer.
- `../book-engine/.venv/bin/python …/probe-state.py` completed with exit 0 and retained the book/history/annotation results.

The probe exit codes mean that measurements completed; they do not mean the findings above passed. I did not blindly repeat the full unit suite or the builder's 36-view matrix. The reported 279 browser assertions and 11 new unit tests remain builder evidence, not independently rerun evidence.

The adapted package script redirects generated output into the review evidence folder, leaving the shared root build and demo distribution untouched. Its standard JSON receipt retains the original script's nominal `build/…` path labels; the actual review output directory was `evidence-review/package-output/`. The retained package receipt records tarball and stylesheet hashes. Generated consumer bundles and tarballs were removed after inspection; the scripts, logs, measurements, hashes and screenshots remain. Isolated installation scratch was removed by the package script's `finally` block. Review browser processes and the temporary installed-consumer HTTP server were closed. The pre-existing server on 8773 was left running.

Limits: no React 19 run; no exhaustive dark-theme matrix; no audio playback or complete preferences/highlight interaction walkthrough; no independent EPUB byte inspection or download test; no pixel-by-pixel recreation audit. No sources, manuscripts, production code, existing design files, Git state, push or deployment were changed. Ownership of this review document and its targeted evidence is released to the parent. The parent owns corrections, any further review, and release acceptance.
