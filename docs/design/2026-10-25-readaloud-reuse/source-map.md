---
title: Read-aloud and assist source map
date: 2026-10-25
register: for-agents
---

Source reuse for the reader's read-aloud, ruler and dimming. Hashes are SHA-256 of the file as inspected on 2026-10-25. No source repo was changed.

## Copied (byte-identical)

| Reader file | Source | Source hash | Source repo commit |
|---|---|---|---|
| `packages/reader-core/src/original/read-aloud/flex-speech.ts` | `readflex/packages/speech/src/index.ts` (`@flex/speech`) | `6de33926ef26f3b6aa2a31262c1b79dff975fa354f3c7059e8a6781b7a57de62` | file last changed `c7de65fd3ead14cda4f639cf14e92a8c3e0269d3`; repo HEAD `babc4549068dc80d75149220a9d0de80c9c8657b` |

- Why copied, not imported: ReadFlex is a private Bun workspace package in another repo; the reader must build alone. The file has no imports, so no dependency is added.
- Why byte-identical: so drift is detectable. `read-aloud/test-read-aloud.mjs` fails if the hash changes; refresh by recopying and updating the hash and this table.
- Used as is: `createSpeechPlayer`, `webSpeechCapabilities`, `fakeSpeechCapabilities` (tests), `segmentSentences`, `chooseInstalledVoice`, `normaliseSpeechRate`, `SpeechVoice`, `Speakable`. Unused exports (Kokoro voices, rendered-audio adapters) stay for hash integrity; the bundler drops them.
- Licence: neither repo carries a LICENSE file or licence field; both are the owner's own code. No notice to preserve beyond this provenance.
- WriteFlex `editor/sentences.ts` (`44b974bd77838c029edfb485ecf8f7fdf1c12df4cfa6226406841ef2dd10c6f4`, commit `bdf257262d9ad89d4cf93a249f1799d84fb4e529`) holds the same `segmentSentences` logic as the ReadFlex file (compared modulo whitespace and semicolons). Only the ReadFlex copy is vendored.

## Adapted

| Reader file | Source | Source hash | What changed |
|---|---|---|---|
| `reading-support/line-geometry.ts` | `writeflex-desktop/src/renderer/src/editor/line-overlay.ts` (`tileLines`, `clampRect`, `bandRect`, `dimRects`, `rulerShape`) | `b1e5eb067a709757657b348a82cc032a761cd35472c5236b1aed1b2105bd37b0` | Pure functions kept. Ruler covers 1, 2 or 3 lines (WriteFlex: thin, 1, 3, 5, all below). `visualLines()` is new: it reads wrapped lines from DOM text rectangles where WriteFlex asks CodeMirror. |
| `reading-support/reading-preferences.ts` `DIM_LEVELS` | `writeflex-desktop/src/renderer/src/styles/app.css` `.wf-lo-dim` | `0c4c3448318fe6d2e5906f54fd041355a1a9b86a139232f2b09cfc714ebb1e5e` | Light 0.5, medium 0.72, dark 0.9 and the shade colours `rgb(28 28 32)` on paper, black on a dark page. |
| `read-aloud/read-aloud-speakable.ts` | `readflex/apps/shell/src/renderer/clean-view-speech.ts` (`projectCleanDocumentForSpeech`) | `ccb39fa19d673f427f17dd71875db2c785c75659ea0f7ffc6f877925b7346e79` | Same `Speakable` shape (segments, pieces, source offsets). Source here is the reader's canonical publication text model, not ReadFlex's PDF clean document. |
| `read-aloud/use-read-aloud.ts` voice refresh | `readflex/apps/shell/src/renderer/use-clean-speech.ts` (`refreshVoices`) | `7bc3406ed20bc66d4de00c37f0da3d2260a5b032bb24cd46e1215d4240621a91` | Same pattern: read on mount, on `voiceschanged`, after a delay. Added a third read and a "settled" flag so an empty list can be stated honestly. |
| `read-aloud/ReadAloudControls.tsx` | `readflex/apps/shell/src/renderer/read-aloud-transport.tsx` (`79d6d1f475276f23f1c20de5c7a0b3561ec5601128420430e9b7398710cc4ab9`), `voice-menu.tsx` (`c04aa013fd9b525ebdace66cb2d0b0db3e706d01e05f2a051b60b9855eb60954`) | as listed | Pattern only: transport with previous/next sentence and paragraph, voice list with language and "system" grouping, speed select. Written against the reader's menu classes; no React, icon or CSS import from ReadFlex. |

## New (no source existed)

- `read-aloud/read-aloud-controller.ts`: one controller per chapter around the vendored player. It adds the guard (below), per-book saved choices, honest problem states and a silence watchdog. It does not rewrite the player's state machine.
- `read-aloud/read-aloud-highlight.ts`: canonical-offset to `Range`, painted with the CSS Highlight API (same pipeline as the recorded audiobook highlight).

## Where the vendored player needed a guard

- The player expects exactly one cancellation error per `cancel()`. Browsers differ: some report `end`, some nothing. `guardCapability()` in the controller acknowledges each cancel itself and drops every later event from a cancelled utterance, so a stopped or replaced utterance cannot advance or clear newer playback.
- The player's `skipParagraph(-1)` lands on the last sentence of the previous paragraph. The controller sends "previous paragraph" to the first sentence instead, through `playFrom`. ReadFlex's own test covers only forward paragraph skips. Not changed in ReadFlex; worth a ReadFlex follow-up.
- `skipSentence`/`skipParagraph` restart reading even when paused, so a skip while paused resumes.
