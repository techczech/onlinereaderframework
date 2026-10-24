---
title: Recorded audiobook module implementation and integration
date: 2026-10-24
register: for-dominik
status: implemented-isolated-tests-passed
scope: packages/reader-core/src/original/listening only
agent: Codex in T3 Code
---

# Recorded audiobook module

**The recorded audiobook panel is ready for parent integration. Ownership of the new listening folder is released.**

- The panel plays supplied recordings, remembers progress per book and restores the position without starting playback.
- Measured alignment enables passage skipping and an optional Follow text control.
- Browser Read Aloud remains a separate host control, with callbacks that coordinate the two players.
- All 17 isolated Node tests and the headless React/media fixture pass. The shared reader build was not run.

## Integration API

Import the component and its types from `packages/reader-core/src/original/listening/index.ts`. Local ESM imports use `.js` specifiers, including in the emitted JavaScript. The parent owns package-root exports and shared reader props.

```ts
interface PublicationAudioTrack {
  sectionId: string;
  src: string;
  label?: string;
  alignment?: readonly {
    start: number;
    end: number;
    charStart: number;
    charEnd: number;
  }[];
}

interface ListeningPanelProps {
  bookId: string;
  sections: readonly { id: string; title: string }[];
  currentSectionId: string;
  onSelectSection(id: string): void;
  onClose(): void;
  tracks?: readonly PublicationAudioTrack[];
  onBoundary?(boundary: {
    sectionId: string;
    charStart: number;
    charEnd: number;
  } | null): void;
  onPlaybackStart?(): void;
  pauseSignal?: number;
}
```

The module also exports `PublicationAudioAlignment`, `ListeningBoundary`, and `ListeningPanelProps`. `ListeningController` and the validation/storage-key helpers are exported for isolated testing and reuse outside this panel.

**Append `listening/listening.css` in the parent's stylesheet build.** The component has no CSS import or runtime style element. Optional host colour variables are `--reader-listening-background` and `--reader-listening-color`; defaults use the browser's Canvas colours.

Keep the panel mounted outside the article and settings subtrees. Hide its containing element when `onClose` fires; hiding preserves playback. Unmounting pauses, saves and releases media resources. View and settings rerenders preserve the audio instance, including when the host passes fresh equivalent arrays. The host controls positioning and visibility. The panel is a labelled, non-modal region; Close and Escape return focus, while respecting focus already placed by the host's close handler. The host should focus a control inside the panel when reopening an already mounted hidden panel.

`onPlaybackStart` runs synchronously before each user-requested Play or Resume, including retry. Use it to stop existing browser speech. Increment `pauseSignal` when starting Browser Read Aloud; the panel pauses when that prop change commits. The host supplies the separately labelled Browser Read Aloud button, which remains usable when the panel says **“No recording for this book yet”**.

## Playback and saved progress

The panel supplies Play/Pause, previous/next recorded chapter, back/forward 15 seconds, a keyboard-accessible seek slider, elapsed/total time and speeds from 0.5× to 3×. Chapter navigation follows the supplied section order and skips sections without valid recordings. Choosing a different chapter pauses playback and restores that chapter's saved position. Playback stops at the end of a recording; it does not automatically advance to another chapter.

On initial mount or a book change, a valid saved recorded chapter takes precedence over `currentSectionId`. Otherwise the current section is selected when present, falling back to the first supplied section. Restoration does not call `onSelectSection` or start playback. Subsequent changes to `currentSectionId` select that section and pause the previous recording. Panel chapter selections call `onSelectSection` so the host can navigate the text.

Storage uses `publication-recorded-listening:v1:${encodeURIComponent(bookId)}`. It saves the selected chapter, per-chapter source URL/time and book speed. Reads validate the schema, finite non-negative times and supported speeds. Invalid JSON falls back to defaults. Blocked storage getters, read failures and quota/write failures leave playback usable and show a save-status message. Prototype-shaped section IDs are handled as ordinary IDs. Saved seconds are clamped to the loaded recording's duration. A different source URL resets that chapter's audio position; the host should version URLs when recording content changes. Blob URLs are owned by the host and must remain valid while in use.

Loading, buffering, paused, playing, ended, missing and error states are explicit. Both initial playback and resume catch rejected play promises. Media failures offer retry through Play. Generation checks and removed event listeners prevent old audio or pending promises from changing a new chapter/book. Pause, book changes and unmount capture the final media clock between time-update events.

## Measured passages and text coordinates

**The host adapter must supply alignment against the canonical rendered publication section text, using half-open UTF-16 character ranges.** Markdown/manuscript offsets, ReadFlex body offsets and UnityBC study offsets are not interchangeable. The host must verify the recording/text match and the character bounds against its canonical text; this API has no text argument with which to perform that verification.

Times are measured seconds. Alignment is accepted only when every span has finite, ordered, non-overlapping time bounds and non-negative, safe-integer, ordered character bounds. Zero-length spans are rejected. Once duration is known, an alignment extending beyond it is disabled in full. Missing or invalid alignment does not block chapter/time playback.

Previous passage seeks to the latest measured start strictly before the current time. Within a passage, this returns to its start; at its start, it selects the preceding passage. Next passage seeks to the next measured start strictly after the current time. End controls disable when no target exists. Time gaps stay gaps.

Follow text appears when valid measurements and `onBoundary` are supplied. It defaults to off and reports the complete supplied character span while the media clock is within that span's `[start, end)` interval. It does not interpolate characters or estimate word timing. Repeated callbacks for an unchanged span are suppressed. Disabling Follow text, entering a gap, ending playback, changing tracks/books, media error and unmount clear an active boundary with `null`. Pausing inside a passage retains its highlight. The host applies and removes the transient highlight without changing source text or saved annotations.

## Source reuse and adaptation

The source files below were read before implementation. Their SHA-256 hashes were checked again after testing and were unchanged. No study audio, study content, generation code or private recording was copied. This module adapts playback behaviour and interface patterns; it does not import those applications or copy their browser closures wholesale.

The UnityBC source root is `/Users/dominiklukes/gitrepos/04_projects-consultancies/02_active/ai-translation-unitybc/sample-runs/participant-demos-2026-10-13`.

- `runtime-unitybc-interpreter.js` has SHA-256 `1ab5181c07e6131cbba73fc39a3595cb08d7d83f7fe36c52c97b6400154d28ad`. Its `go`, `clear`, `persist`, `pause` and `leave` transitions informed generation guards, metadata-position restoration, transport ownership and cleanup in `listening-controller.ts`. The bilingual pair/phase loop, generated Blob cache, inter-language timers and fixed study data were omitted. Rejected playback now produces visible error feedback.
- `runtime-unitybc-interpreter-view.js` has SHA-256 `ed199db78aaaaf23316359954c4591dfc1d3358498c4c37ad4cfe819aa9eb383`. Its `chooseDisplay`, section navigation, independent playback/view state and follow controls informed the mounted panel boundary and measured-passage controls. React callbacks replace DOM selectors and the shared reader closure.
- `source/participant-unitybc-czech-lay-summary.js` has SHA-256 `a560d03d601fb6eddcc1d9a3ff3c637ada838cd4627d7e06082cc3103b8a29a7`. Its material-keyed storage, per-unit seconds, `jumpSentence`, `listen`, error feedback, page-hide handling and measured `[start, end)` highlights informed book-scoped persistence, passage seeking and boundary clearing. Embedded base64 tracks, translated copy, questionnaire logic and annotation code were omitted. Storage records are validated rather than spread into live state.

The ReadFlex source is `/Users/dominiklukes/gitrepos/06_apps-utilities/01_desktop-apps/readflex/packages/speech/src/index.ts`, with SHA-256 `6de33926ef26f3b6aa2a31262c1b79dff975fa354f3c7059e8a6781b7a57de62`. Its `renderedSpeechCapabilities` informed lazy instance-owned HTML audio, rate control and boundary/end/error handling. Its pure `renderedOffsetBoundary` helper informed the explicit offset contract. Character interpolation and ReadFlex's body-origin translation were deliberately replaced by complete supplied spans in canonical publication coordinates. Resume refusals are caught as well as initial play refusals. No Web Speech, synthesis engine or ReadFlex package dependency was introduced.

The implementation brief was `docs/audit-reading-support-reuse-2026-10-24.md`, SHA-256 `eda9bd91d5274f6ad2d1817f3a9ebf6ed93eaf21732c9b07698c9f156f461c7b`.

## Verification and ownership release

Run from the reader repository:

```sh
node --test packages/reader-core/src/original/listening/test-reader-listening.mjs
node packages/reader-core/src/original/listening/test-reader-listening-headless.mjs
```

The Node suite compiles only this folder with the installed TypeScript compiler and imports the emitted API through native Node ESM without browser globals. **All 17 tests pass.** They cover resume, book/source isolation, corrupt and denied storage, unsafe URL schemes, alignment validation, missing tracks, chapter/time/passage seeking, pending and rejected play, loading/buffering/end/error transitions, measured boundaries and late media events. Tests were run before implementation; added edge regressions were observed failing before their fixes.

The browser fixture bundles only this module with the existing esbuild and React installations. It uses the existing sibling book-engine Python Playwright environment and bundled `chrome-headless-shell`, with React StrictMode. A 24-second silent WAV is constructed in memory solely for testing; requests are intercepted locally. No study recording or generated speech asset is used or retained.

The fixture passes real media playback, reload restoration at the saved time and speed without autoplay, book isolation, retained audio through rerenders and hidden/reopened panels, playback callback ordering, pause signals, rejected-play recovery, a real media 404, measured passage navigation, Follow text clearing, separate host browser-speech access in the empty state, Escape/focus return, keyboard seeking and 320/390/768-pixel overflow checks. It reports zero uncaught page errors. Scratch directories are created inside this module and removed on success or failure.

Only the new listening folder and this result document were written by this session. Shared types, Layout, App, manifests and parent integration files were not edited. Concurrent changes remain owned by their respective sessions. No shared root build, package installation, paid generation, Git commit, push or deployment was performed. No full audiobook asset is supplied or claimed; the parent owns real-asset selection and accurate excerpt/chapter labelling.
