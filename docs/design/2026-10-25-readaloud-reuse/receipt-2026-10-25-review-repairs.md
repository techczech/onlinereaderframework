---
title: Repair of the four verified review findings in the online reader
date: 2026-10-25
register: for-dominik
status: built and verified in headless Chromium; fresh diff-only re-review owed to the parent
baseline: f1d956f plus the uncommitted work reviewed in review-integration.md
---

No action needed. FOR DOMINIK.

- **All four findings are repaired at their root cause.** Each has a regression that fails when its fix is removed and passes with it in place.
- **The earlier recording-test hang is not claimed as resolved.** The unchanged isolated recording test ran once more and finished in 1.5 seconds. Its eight-minute hang still has no established cause.
- **The parent owns the fresh diff-only re-review.** Nothing was committed, pushed or deployed. Every user correction already built is untouched.

## What was wrong and what changed

### 1. A superseded reader cancelled another reader's speech

**Root cause.** Each reader's speech controller decided whether it could cancel from its own status. The browser has one speech engine, so an older reader that still believed it was speaking could cancel the newer reader's speech. Nothing passed ownership from one controller to the next.

**Change.** The shared engine now has one owner (`read-aloud-controller.ts`, a per-engine slot). Start takes the engine first. The previous owner is told, goes idle at once and, from then on, can neither cancel, pause or resume the engine nor hear its events. Its stop, dispose and content replacement now leave the newer playback alone. A controller that never started still never touches the engine. The same-controller guard against late end, error and boundary events is unchanged, and a reader that takes the engine back is guarded against its own earlier callbacks.

### 2. The watchdog stopped speech the engine said was running

**Root cause.** The watchdog treated the lack of word-boundary events as the lack of speech, and stopped the third time the engine said it was busy. A voice without word boundaries therefore had 18 seconds per sentence. The browser adapter never observed the engine's own start event, so "has not started" and "is running without word events" looked identical.

**Change.** The browser capability attaches the engine's `start` event to each utterance (`browserReadAloudCapability`). That uses a synchronous, restored wrapper on the page's `speechSynthesis.speak` for the duration of one call, because the vendored player cannot report start events and was not changed.
- Once an utterance has started, it is judged only by whether the engine still says it is speaking, indefinitely. If the engine stops saying so without an end or error event, the controller reports that the browser stopped reading without saying why.
- An utterance that has not started gets five silence intervals (30 seconds by default). After that it is reported as never started, and the failure message and stop are kept. A slow voice that starts in time is not an error.
- Pause no longer spends the wait. Resume re-arms it.
- A capability that gives no start events, such as the synthetic probe engine, is judged only by `busy()`. A busy engine is never stopped for missing word events.

### 3. Browser speech started before the recording was paused

**Root cause.** Pausing the recording depended on a React state change after the controller had already submitted the utterance. The browser's click or key gesture has to submit speech in the same tick, so ordering could not be guaranteed that way.

**Change.** The controller now has an `onEngage` hook (`ReadAloudOptions`) that runs synchronously, once per Start, Resume or skip-from-pause, after the engine is claimed and before `speechSynthesis.speak()` or `resume()`. It runs on the shared path, so the toolbar button and the keyboard shortcut are covered together. The host registers a pause function from the recorded player (`registerPause` on the listening panel); `PublicationReader` calls it from the hook. Speech is submitted in the same synchronous gesture, so the browser's permission to play is kept. The old state-driven pause signal still exists as a backstop. The reverse direction was already synchronous: the recorded Play stops browser speech before it plays, including paused speech, and a new check covers the paused case. Formatting, menus and hiding the panel still leave the recording playing.

### 4. Back restored the passage but the outline marker was elsewhere

**Root cause.** The two outline presentations each kept their own marker, and only the clicked one was updated. Back and Forward restored scroll and focus without telling either. The restored heading is centred, so it does not enter the observer's top-of-scroller band, and the marker stayed where it had last been. A later resize then showed the second outline disagreeing.

**Change.** The URL fragment is now the source of truth, read by both outlines (`TableOfContents.tsx`). On click, Back, Forward, hash change, a deep link and a chapter change, both outlines mark the heading the URL names, or nothing when it names none. The reader fires a `publication-location` event after it moves by itself. The mark holds until the reader moves the text by wheel, touch, scroll keys or scrollbar; then the marker follows the heading at the reading line. The earlier 1.2-second timed pin is gone. A resize no longer counts as reading, which is what a first version of this repair got wrong; the real-book probe caught it. Forward and direct copied-subsection URLs, rich labels, duplicate ids and the compact outline are unchanged.

## Files

- `packages/reader-core/src/original/read-aloud/read-aloud-controller.ts`: engine ownership, start evidence, watchdog, engage hook.
- `packages/reader-core/src/original/read-aloud/use-read-aloud.ts`: passes the engage hook through.
- `packages/reader-core/src/original/MarkdownRenderer.tsx`: removed the effect-based recording pause.
- `packages/reader-core/src/original/PublicationReader.tsx`, `listening/ListeningPanel.tsx`, `listening/listening-types.ts`: synchronous pause of the recording. `registerPause` is an optional addition to the listening panel's props, for the host that mounts it; no new dependency.
- `packages/reader-core/src/original/TableOfContents.tsx`, `use-publication-reader.ts`: shared location state.
- Tests: `read-aloud/test-read-aloud.mjs` (8 new), new `read-aloud/test-read-aloud-ownership-browser.mjs`, `toolbar/test-toolbar-recorded-browser.mjs` (3 new ordering checks), `test-navigation-fixture-browser.mjs` (10 new).
- Evidence: `evidence-repair-2026-10-25-integration-seams.json` in this folder, produced by the reviewer's unchanged `probe-integration-seams.mjs` after the repair.
- Not touched: the vendored `flex-speech.ts`, the reviews, raw source prototypes, author or book data, ReadFlex, WriteFlex, manuscripts, other bundles, dependencies.

## Decisions

- Ownership is a module-level slot keyed by the engine object. Any alternative, such as per-reader tokens passed through React, would have needed new props on every renderer.
- The start event is attached by a restored wrapper because the vendored player is byte-identical to ReadFlex's file and must stay so (hash `6de33926…7de62`, still asserted by a unit test).
- A start-reporting engine that never starts is still failed after 30 seconds. An engine that gives no start events is trusted while it says it is speaking, because nothing else is available to it.
- The recording is paused by a synchronous callback, not by a React effect.
- The outline releases its mark on user input, not on scroll distance.
- Resume and skip-from-pause ordering are covered by controller unit tests. The page cannot put a recording and paused speech in an overlapping state, because the recorded Play ends the speech first.

## Commands and exits (source state at the hashes below)

| Command | Exit | Result |
|---|---|---|
| `npx tsc --noEmit -p packages/reader-core` | 0 | clean |
| `npm run build` (twice, the second after the final edit) | 0 | reader package and demo |
| `npm test` | 0 | 23 + 87 + 5 tests, 0 failures (read-aloud 16 → 24) |
| `npm run verify:package` | 0 | installed consumer built |
| `read-aloud/test-read-aloud-browser.mjs` | 0 | 46/46 |
| `read-aloud/test-read-aloud-ownership-browser.mjs` (new) | 0 | 18/18 |
| `reading-support/test-assist-width-browser.mjs` | 0 | 37/37 |
| `toolbar/test-toolbar-repair-browser.mjs` | 0 | 23/23 |
| `toolbar/test-toolbar-recorded-browser.mjs` | 0 | 14/14 (11 + 3 new, with the ordering assertion) |
| `test-navigation-fixture-browser.mjs` | 0 | 59/59 (49 + 10 new) |
| `test-navigation-books-browser.mjs` against the rebuilt demo on port 8773 | 0 | 47/47 |
| `listening/test-reader-listening-headless.mjs`, unchanged | 0 | finished in 1.5 s |
| `probe-integration-seams.mjs`, unchanged reviewer probe | 0 | see below |

I did not run the front-page layout suite, the full matrix of widths, or any real-voice run. None of the changes touch front-page code.

## Red, then green

The sources the four repairs replace were never committed, so there is no committed "before". Each repair was shown meaningful by taking the key line out of the repaired code and watching the new regressions fail, then restoring it:

- Ownership removed (every controller may cancel; no claim): the unit test fails, and the real-renderer test fails 4 checks (A is not idle after B starts; stopping A cancels the engine; unmounting A leaves B's engine silent; A is shown the "stopped by another page" message).
- Watchdog restored to "stop at the third expiry even if busy": 4 watchdog tests fail.
- Engage hook removed: the unit test fails. Restoring the old effect-driven pause (removing the synchronous call in `PublicationReader`) fails the menu-Start and keyboard-shortcut ordering checks in the recording test, where the recording is still playing when speech is submitted.
- Outline: location following disabled fails 8 of the 10 new navigation checks; letting the intersection observer override the destination fails 6.
- The reviewer's own probe now reports, against the rebuilt demo: after B starts, A is idle and B is speaking; after A unmounts, B is speaking and the engine is busy; a busy engine with no boundary events is still speaking after the old third-watchdog point; and at Back, Forward and after the resize-and-shortcut step the rail and the compact outline both mark the heading the URL names.

## Evidence limits

- The speech engine in every speech test is synthetic and labelled. No real voice was played during this repair, and nothing was repeated from the earlier 10-second real-voice run.
- The browser's real `speechSynthesis` start event was not observed in this run. The start listener is shown against a synthetic engine that fires nothing; a real engine firing `start` on a voice without word boundaries is not independently confirmed here.
- Headless Chromium only. Not run: Safari, Firefox, iOS, a screen reader or a physical phone.
- The wrapper that attaches the start listener touches the page's `speechSynthesis.speak` for one synchronous call and restores it. A page that freezes that property would get no start events, and the engine would then be judged by `busy()` alone.
- The bounded wait is 30 seconds by default for a start-reporting engine and is not configurable beyond the existing `silenceMs`.
- Untracked `.js` files under `src/publication-content` and `src/services/publication-epub` were already present from earlier work and were left as they were.

## Source hashes (SHA-256, at the end of this repair)

```
56a038b8176aa19836a5163af38abf68049e0f2f3e6c96c71399f99c2d9f3031  read-aloud/read-aloud-controller.ts
cbe9c5ad928c7df6d5d59e27e766938a1d3a8c06138433dbef8ccb2e85daed3c  read-aloud/use-read-aloud.ts
4d02cee6710f17c0aff484d0b10480447e339bcf5be752110b1a68f0cf3c9385  read-aloud/test-read-aloud.mjs
fe5a8c30be466074f944ce8f65a5f17eb056cd6b1ca33c8b691c4e17e8665ae3  read-aloud/test-read-aloud-ownership-browser.mjs
e71989136591144cc4fa848f96da52362514c6d7bb39fb7c24b9ddef44f53b83  MarkdownRenderer.tsx
50bd713bc73f673775205cd4e9f2306854d044a462f2a1fe860653f133837a94  PublicationReader.tsx
700fc11f172513330e718b8b3850a8dc07a7a5ee693f8cadb53b1c7f53cd2e7f  listening/ListeningPanel.tsx
e5d5de9a927af500d907d137184d1955641c7b5189cc2e49b2a753c489e571a5  listening/listening-types.ts
126c6dd4f703c0624734a3a7e3ea0a8d8204dbb4ebc886dd4cf70fa72ceb3923  TableOfContents.tsx
ed72d75e60018aecabcb285cc97c49ccb86cef849b63ae2bd9d8e19289877f27  use-publication-reader.ts
9b5498ab9e1702320ab1cc0c06e4915feb64e7e8588faf10c980d5a73ffb87a7  toolbar/test-toolbar-recorded-browser.mjs
3f99d94cf10ea39923191f6c24483e5dab23470c6b4f1c7be00fe4e9c795aa1b  test-navigation-fixture-browser.mjs
6de33926ef26f3b6aa2a31262c1b79dff975fa354f3c7059e8a6781b7a57de62  read-aloud/flex-speech.ts (unchanged)
bb41ab7c8a4cde6c9ab1b46e1e18b83ab9d1e47d3ffae58fc34dd4a23c7c19de  evidence-repair-2026-10-25-integration-seams.json
```

Paths are relative to `packages/reader-core/src/original/`, except the evidence file.

## Ownership

All scratch directories created by the test runners were removed in their own `finally` blocks, and no repair scratch remains in the repository. The demo `dist` was rebuilt by `npm run build`; it is ignored by Git. This builder holds no lock and has released ownership. The parent now owns the fresh diff-only re-review of the speech seam and the navigation change.
