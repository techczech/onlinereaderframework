---
title: Independent review of reader speech, reading aids and navigation integration
date: 2026-10-25
register: for-dominik
reviewer: Codex gpt-6.1-sol
status: changes-required
baseline: f1d956f
scope: Independent review; production files unchanged
---

No action needed. FOR DOMINIK.

- **Four P2 findings need parent-owned fixes before integration acceptance.** They concern speech ownership, the speech watchdog, recording arbitration and the current-location marker.
- **The requested reuse is real.** The speech player is byte-identical to ReadFlex; the ruler geometry and dimming derive from the inspected WriteFlex sources.
- **All existing focused checks passed.** The previously hanging isolated recording test passed unchanged in 3.16 seconds. Its earlier hang remains unexplained; it is not evidence of a recording failure in this run.
- This review authorises no release. The parent owns fixes, independent re-review of the speech seam, final validation and release decisions. Dominik has no action to take here.

## Verdict and scope

**Changes required.** The implemented interface substantially fulfils the three authorised parcels, but the new speech integration can stop valid playback or another reader's playback. Navigation restores the location in the URL and text, while its visible and accessible marker can name a different subsection.

Reviewed the tracked root diff against `f1d956f`, the newly added `original/read-aloud/` files, reading-aid geometry and the coupled navigation changes. Git access was read-only for the explicitly requested comparison; no Git state was changed. No other agents, production edits, original-source edits, manuscript edits, shared rebuild, push or deployment occurred.

[evidence-reviewed-reader-hashes.json](evidence-reviewed-reader-hashes.json) identifies 33 source/test/manifest files, the served demo assets, packaged stylesheet and eight read-only upstream sources by full SHA-256. Key reviewed identities are:

- The vendored `flex-speech.ts` hash is `6de33926ef26f3b6aa2a31262c1b79dff975fa354f3c7059e8a6781b7a57de62`.
- The renderer hash is `7517874b9d72162125b59cfe58b12b1fa6e24eb1c8b33187416a4d44203e3278`.
- The outline hash is `b4e4c688a988e22fe876705ed9948d6d0c0f76cb0b52fbb7788350c4984eea08`.

The report's line numbers refer to those files. Paths beginning `packages/` are relative to this reader repository.

## SPEC findings

### P2: A superseded renderer can cancel the newer renderer's speech

**Locations:** `packages/reader-core/src/original/read-aloud/read-aloud-controller.ts:67–74,207–211,251–254`; `packages/reader-core/src/original/read-aloud/use-read-aloud.ts:36–44,67–68`.

Each renderer constructs a controller over the same browser speech engine. Cancellation authority depends on that controller's local status. The epoch guard protects callbacks within one controller, but there is no ownership transfer between controllers.

**Reproduction:** Run `node docs/design/2026-10-25-readaloud-reuse/probe-integration-seams.mjs`. Two real `MarkdownRenderer` instances use a synthetic shared engine whose cancellation emits no callback, a browser variation the guard explicitly claims to handle. Start A, start B, then unmount A. Both controllers still report `speaking` after B starts. Unmounting A calls global `cancel()` and turns the engine's `speaking` flag false while B still reports `speaking`. See `twoAfterB` and `afterUnmountA` in [the independent seam evidence](evidence-integration-seams.json).

**Consequence:** Removing or stopping the earlier reading surface stops the current reader. The old controller can also accept events until it learns that its speech was replaced. The existing ownership unit test covers an idle controller beside a speaking controller, rather than this transfer.

**Required repair:** Give global speech a current owner and revoke the superseded controller's cancellation/event authority when another renderer takes over. Preserve the successful same-controller late-callback guard. Recheck two active renderers with delayed and absent cancellation callbacks; an earlier reader's stop, unmount or content replacement must leave the newer playback intact.

### P2: The watchdog stops speech that the engine says is running

**Location:** `packages/reader-core/src/original/read-aloud/read-aloud-controller.ts:267–280`.

The third watchdog expiry stops playback even when `busy()` remains true. Progress is cleared by boundary/end/error events; the adapter does not observe an utterance start event. A voice without boundary events therefore has only 18 seconds per utterance at the default six-second interval.

**Reproduction:** The independent seam probe creates a controller with `busy: () => true`, no boundary events and `silenceMs: 30`. After 140 ms it reports `idle` and says speech has not started. See `busyNoBoundaryAfterThreeWatchdogs` in the evidence. This uses an accelerated clock setting; the production threshold follows directly from three 6,000 ms intervals.

**Consequence:** A valid long sentence or slow reading can be cancelled with an incorrect error instead of retaining the promised sentence-only fallback. The existing unit test checks only the first extension, then stops the controller before the third expiry.

**Required repair:** Distinguish missing start evidence from a running utterance without word events. Keep an honest bounded failure state for engines that never start; do not infer failure solely from absent word boundaries while the engine reports active speech. Verify past the complete watchdog threshold and through pause/resume.

### P2: Browser speech starts before the recorded audiobook is paused

**Locations:** `packages/reader-core/src/original/MarkdownRenderer.tsx:64–73`; `packages/reader-core/src/original/PublicationReader.tsx:48–54`; `packages/reader-core/src/original/read-aloud/read-aloud-controller.ts:198–201`.

The renderer now calls `onBrowserSpeechStart` from an effect after the controller publishes a non-idle snapshot. The controller has already submitted its utterance to `speechSynthesis.speak()`. The earlier renderer called the arbitration callback before submitting speech.

**Reproduction:** Run `node docs/design/2026-10-25-readaloud-reuse/probe-recorded-speech-order.mjs`. This is a narrow instrumented copy of the existing recording-toolbar test, with the same real silent WAV playback. Its synthetic `speak()` records whether any recording is still playing at submission. The added ordering assertion fails; all 11 original assertions pass. See [the recording-order evidence](evidence-recorded-speech-order.txt). Probe exit is 1, intentionally reporting that failed assertion.

**Consequence:** The implementation proves eventual exclusion, but permits overlap at the transition. The unchanged recorded-player module passes; this regression is in the new integration, separate from the earlier unexplained isolated-test hang.

**Required repair:** Pause the recording before submitting or resuming browser speech on every start path, including the keyboard shortcut. Preserve recorded playback while changing formatting, navigating menus or hiding its panel. Recheck ordering in both directions, as well as eventual paused state.

### P2: Back restores the subsection but leaves the outline marker elsewhere

**Locations:** `packages/reader-core/src/original/TableOfContents.tsx:94–108,124–132`; `packages/reader-core/src/original/use-publication-reader.ts:117–145`.

The two outline presentations maintain separate `activeId` values. Only the clicked instance is pinned to a chosen link. The history handler restores scroll and heading focus without informing either outline. Its centred heading can remain outside the observer's top-of-scroller activation band.

**Reproduction:** At 1280×800, open Deliberate Practice's Schemas chapter. Click “Mental representations or embodied mental schemas”, then “More about chunks and mental representations”, waiting over 1.2 seconds after each. Go Back. The URL and focused heading return to “Mental representations…”, but the visible rail retains `aria-current="location"` on “More about chunks…”. The hidden compact outline has a third location, “Why inventory”. Resizing to 1024 exposes that stale compact location. The independent probe records all four states in `navFirst`, `navSecond`, `navBack` and `afterResponsiveShortcut`.

The [navigation review](../2026-10-25-navigation-readability/review-restoration.md) records the restoration coverage and this finding in context. **Required repair:** Keep both presentations synchronised with fragment/history navigation and the chosen heading. A shared location state or equivalent explicit notification is sufficient; a new product design is unnecessary.

## STANDARDS assessment

No additional standards-only blocker was established within this scope. The four findings above relate to authorised behaviour, rather than new feature requests.

The restoration improves the requested reading structure: display-only categories, real nested topics, meaningful single-heading outlines, clean rich labels and a compact outline where the rail does not fit. These support scanning and returning to passages before typography changes are considered. Badge removal, the smaller default body size and reinstating a single-heading outline are explicit user overrides; they are not review objections. No author prose was edited or assessed for rewriting.

The focus checks establish Start-to-dock and Escape-to-opener behaviour, plus compact-outline keyboard operation. They do not establish screen-reader or physical touch acceptance.

## Reuse and integration evidence

Compared actual upstream bytes, not just matching function names. All eight upstream hashes match `source-map.md`. The full dependency-free ReadFlex speech file is identical, and its `createSpeechPlayer` implements the sentence state, skipping, voice choice and capabilities used by the controller. The publication adapter supplies its segments/pieces/source offsets from the reader's existing canonical text model. WriteFlex's `tileLines`, clamping, band and dimming geometry visibly correspond to the adaptation; its ruler options were deliberately narrowed to the requested 1/2/3 lines. The UI uses local reader styles, with no external-repository runtime import.

Read the canonical MathML/Unicode/cross-markup mapping, native Highlight ranges, ownership-aware highlight cleanup and annotation replacement handling. Existing focused browser probes passed for cross-emphasis and Unicode boundaries, MathML ranges, unchanged article markup/selection, note preservation, skip/rate/voice controls, delayed voice loading, errors, no engine and docked transport geometry. These demonstrate wiring with synthetic speech events, not audible output.

The measured reading-aid suite passed for the ruler beneath the current line, 1/2/3 lines, continuation into the following paragraph, light/dark shade colours and Dark 0.9. It also passed width distinctions at 1280/1440, the room limit at 1024, narrow-screen layout, default Normal near 590 px, smaller controls/headings/default body text and explicit article-size preservation. Source review confirmed per-book preference keys and bounded migrations without resetting notes.

A fresh source SSR render passed with no `window` or `document`. The first reviewer attempt accidentally mixed the demo's React with the core's React and produced an invalid-hook-call error; binding both renderer and React to the core installation corrected the probe. This was a review-harness mismatch, not a production finding. Package manifests and style packaging retain local fonts and relative imports. The installed-consumer build remains builder-reported; it was not rerun because its retained outputs exceed this review's write scope.

## Checks, hang investigation and limits

[evidence-review-checks.json](evidence-review-checks.json) records exact commands, process exits, durations and timeouts. Every listed existing check exited 0:

- Root units passed 23 + 79 + 5 tests.
- Read-aloud passed 46/46; reading aids, widths and scale passed 37/37.
- Navigation fixture passed 49/49; the three-book navigation suite passed 47/47.
- Recording-toolbar journeys passed 11/11.
- The **unmodified isolated recording test passed in 3.16 seconds**, inside a 45-second outer process deadline. Before that, a diagnostic copy with esbuild stage logging, Python route tracing and a 40-second child deadline passed its five journey groups with no page errors. Build, browser launch, native silent audio, seek, reload, refusal retry, missing/unsafe source handling and shutdown all completed. No harness or production repair was made.

The earlier eight-minute hang is **not reproduced and has no established root cause**. This run supports neither a persistent compatibility defect nor a claim that the prior harness was stale. Keep that historical incident distinct from the reproduced speech/recording ordering defect above.

T3 preview opened successfully, but two snapshot calls returned `Preview automation snapshot timed out after 15000ms.` The review tab was closed. All fallback browser work used bundled headless Chromium, fresh isolated contexts and repository-local scratch removed in `finally`. No installed Chrome or user profile was driven. Durable probe sources and outputs remain as narrow evidence beside this report.

No new audible speech run, physical Safari/iPhone test, screen-reader test, complete front-page matrix, shared build or release validation was performed. The reported earlier real-engine/184-voice smoke is builder evidence, not independent verification in this review. Parent-owned fixes and re-review remain necessary before accepting the integration.
