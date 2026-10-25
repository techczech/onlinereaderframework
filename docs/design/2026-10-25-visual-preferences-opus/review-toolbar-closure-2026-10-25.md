---
title: Independent closure review of the reader toolbar repairs
register: FOR DOMINIK
date: 2026-10-25
reviewer: Codex Sol 6.1, independent of the repair builder
status: four-findings-closed
scope: Four previously verified P2 findings and their repair regions only
---

# Independent closure review of the reader toolbar repairs

**No action needed. FOR DOMINIK. All four earlier findings are closed at the reviewed source hashes.** No new actionable defect was found in the repair regions.

- **The two specification findings are closed.** Self-disabling menu actions retain enabled keyboard focus, and orphan recordings offer no player.
- **The two standards findings are closed.** Idle renderer cleanup leaves another renderer's speech alone, and expired callbacks cannot clear newer playback state.
- **Independent narrow execution passed.** The builder's repair test passed 23/23, and the closure fixture with independent extensions passed 36/36; both commands exited 0.
- **Ownership is released to the parent session.** The parent owns checkpointing and acceptance. Dominik has no action to take.

## Scope and comparison

I read the earlier review, its exact locations, reproductions and source hashes, then the repair receipt and the current three production files. Review was confined to the focus repair in `ReaderToolbar.tsx`, recording availability in `PublicationReader.tsx`, and speech lifecycle repairs in `MarkdownRenderer.tsx`, with the controller and control components read to check those contracts. The approved four-control design and frontpage were not reopened.

No Git operation was performed. The repair receipt says its pre-repair source copy was deleted, so an independent byte-for-byte production baseline diff was unavailable within this restriction. This is a closure review of the identified repair regions against the earlier source evidence and current reproductions; it does not certify an exhaustive working-tree diff. The probe adaptation was compared directly with the original using filesystem `diff -u`.

## Spec

### Closed: Formatting reset breaks keyboard containment

**Current location:** `packages/reader-core/src/original/toolbar/ReaderToolbar.tsx:52–70`; existing Tab and Escape handling remains at lines 91–99.

The effect records the focused section/footer and restores focus when the active control disables itself or disappears. It selects an enabled control from that group, falling back to the menu. The original reproduction now passes: increase size, activate Reset formatting, press Tab and Shift+Tab, then Escape. Focus stays within Formatting and Escape returns to its toolbar control.

The independent extension also activates Reset with Enter at 390 × 800, traverses 22 Tab presses and 22 reverse Tab presses, and verifies Escape return. Keyboard activation at the lower limits of all four spacing/size steppers retains enabled menu focus. Turn all off moves focus to the enabled Keyboard shortcuts control in the same footer. An ordinary size change keeps focus on its still-enabled stepper. Evidence appears in `evidence-review-toolbar-closure-2026-10-25.mjs:103–140` and its JSON results.

### Closed: An orphan recording opens an empty player

**Current location:** `packages/reader-core/src/original/PublicationReader.tsx:25–26` and `:45–50`.

Availability now requires both `safeRecordingSource(track.src)` and a matching section in the same `reader.sections` passed to the player. This agrees with `listening/listening-controller.ts:66–73`. A book with sections one/two and a `/valid.wav` track for missing offers neither Recorded audiobook nor a player surface. A mixed orphan/valid track list still offers the player. A matching section with a `javascript:` source offers neither surface.

The new repair test asserts absence of the player surface itself, strengthening the adapted earlier probe's empty-message assertion. The earlier probe adaptation correctly skips Open player when it no longer exists; forcing that absent click would create a harness timeout, not a remaining UI finding. Source validity here means the controller's accepted metadata and source rules; network media availability is not established.

## Standards

### Closed: An idle renderer cancels another renderer's speech

**Current location:** `packages/reader-core/src/original/MarkdownRenderer.tsx:72–86` and `:134–140`.

Unmount, content cleanup and Stop now call shared cancellation only while this renderer holds an utterance. With renderer A speaking, mounting idle renderer B, changing B's content, invoking B's Stop and unmounting B produce no cancellation. A's toolbar remains active. A's own Stop still cancels; a speaking renderer's content change and unmount still cancel its speech.

The independent extension repeats idle B's lifecycle while A is paused and confirms that A still offers Resume without a cancellation. This closes the reported idle-renderer case. It does not establish arbitration among two renderers that both own queued utterances or unrelated external speech clients; that broader design was not introduced or reviewed here.

### Closed: Stale callbacks clear newer playback state

**Current location:** `packages/reader-core/src/original/MarkdownRenderer.tsx:119–140`; state reporting remains at lines 61–64.

Completion now requires identity with the renderer's current utterance. Stop clears that identity before cancellation. After starting A, stopping A and starting B, delivering A's saved error and end callbacks leaves B active. B's own end returns the toolbar to idle. The independent extension pauses B before delivering A's callbacks: Resume remains available, while B's current error correctly clears the paused state. Both stale callback types and current completion paths were exercised with controlled events.

## Checks, evidence and limits

The commands independently executed were:

- `node packages/reader-core/src/original/toolbar/test-toolbar-repair-browser.mjs` exited 0 with 23/23 passing checks.
- `node docs/design/2026-10-25-visual-preferences-opus/evidence-review-toolbar-closure-2026-10-25.mjs` exited 0 with 36/36 passing checks. Its fixture is explicitly derived from the builder's test; the additional cases and closure judgement are independent. Results are preserved in `evidence-review-toolbar-closure-2026-10-25.json`.

The first extension run exited 1 with 35/36 passes because the ordinary-focus case inherited text size at its maximum from the preceding stepper test. The supposedly ordinary Increase control was already disabled. Resetting fixture preferences before that case resolved the setup error; production files were unchanged.

The repair receipt's 11/23 before and 23/23 after, and its earlier probe's 24/30 before and 30/30 after, were inspected as builder evidence. Those before runs were not independently repeated. The earlier probe's filesystem diff contains the documented source/output overrides and conditional orphan-player click only. Types, build and full units remain builder-reported exit-0 checks; no full suites were repeated.

Native T3 preview was tried first. `preview_status` returned `available:false`, with no tab. `preview_open` returned exactly: **“Too many server browser tabs are open. Close one with t3_preview_close, or reuse a tabId from preview_status tabs.”** The explicitly permitted tab-limit fallback used bundled `chromium_headless_shell`, never system Chrome. All temporary browser directories were confined to the owning repository and removed in `finally`; the final scratch search found none in the reviewed locations.

Speech was synthetic state instrumentation throughout. These checks establish callback ordering, cancellation calls and toolbar state, not real voices or audible output. Mobile checks used a Chromium viewport, not a real phone. Screen-reader behaviour and simultaneous active speech arbitration were not tested. The recording gate was tested with metadata fixtures; this closure review did not repeat recording playback continuity. No production, API, dependency, manuscript, frontpage, Git, push or deployment changes were made.

## Source and evidence identity

The earlier review records pre-repair production hashes: toolbar `722a59e06e81d7ab3adaefb0c54fe0302651157d36943d24f0ba8bf5ad85de2a`, publication reader `d7ea965c55c25927568b3630750eeed944676e5e4c20d44e42b8fb79ede8eeb2`, and renderer `9b1da7ddfb23b99dddc1f052d0db3228c566387bb7367fd26b72621c5a158254`.

Current SHA-256 values identify the reviewed uncommitted bytes:

```text
2ca6186a7b36307fe8079cf89a35d28390bb23cceef7445ba1327a1031bdec20  packages/reader-core/src/original/toolbar/ReaderToolbar.tsx
c0d4710a223ea6e0ef1c49e194585b9ff2b5958a890b1af9707a89cf27d84aa5  packages/reader-core/src/original/PublicationReader.tsx
b8dc003228d79dc3f52f34638811bc020a566cdee42b57d00427ba36aff16838  packages/reader-core/src/original/MarkdownRenderer.tsx
4ae39428570bdc9bcdbd3e0e8e909ebe2efe5805d1edf22d1fb073af5188d611  packages/reader-core/src/original/toolbar/test-toolbar-repair-browser.mjs
3b7823a52b97423d0d087564c28f1d7f53c4ab61b32379f3622c2f9836e1eec3  docs/design/2026-10-25-visual-preferences-opus/evidence-review-toolbar-2026-10-25.mjs
583530d8548cca42e276e82aaab4b5d4571428db1108664adf860f3bbce91afe  docs/design/2026-10-25-visual-preferences-opus/evidence-review-toolbar-2026-10-25.json
d188b80dbdc8b674c9bce9054661f840654bef206d244dfe5d406658062e44e8  docs/design/2026-10-25-visual-preferences-opus/evidence-repair-probe-2026-10-25.mjs
dd8f22a53d286d7fe6fc5181b0f7a3d55f7034d61e537fbbe98c0eddb94c95dd  docs/design/2026-10-25-visual-preferences-opus/evidence-review-toolbar-closure-2026-10-25.mjs
df1e3c5be48376db5341e0027f6f9bee7e3b5b90e491211d661c69f735cefe5c  docs/design/2026-10-25-visual-preferences-opus/evidence-review-toolbar-closure-2026-10-25.json
```

## Ownership released

This review owns only this report and its narrow closure evidence script/results. Concurrent frontpage work and all earlier evidence were preserved. All four findings are closed; none remains open within this review. The parent session can now checkpoint the reviewed repairs and owns final acceptance. No action is required from Dominik.
