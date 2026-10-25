---
title: Independent re-review of reader speech and navigation repairs
date: 2026-10-25
register: for-dominik
reviewer: Codex gpt-6.1-sol
status: changes-required
scope: Four prior findings and their repair seams; production unchanged
---

No action needed. FOR DOMINIK.

- **Three of the four original findings close.** The watchdog, recording-start order and outline location marker pass the targeted independent checks.
- **Speech ownership remains open at P2.** The original cancellation reproduction passes, but taking over from a paused reader can leave the newer reader silent while it displays “speaking”.
- **The new recording callback has a separate P3 lifecycle defect.** Replacing its registration owner leaves the old host holding the pause function and gives the new host no function.
- The parent owns repair and checkpointing this verdict. Dominik has no action to take.

## Scope and comparison

I read [the exact original integration review](review-integration.md), [the navigation review](../2026-10-25-navigation-readability/review-restoration.md), [the combined repair receipt](receipt-2026-10-25-review-repairs.md) and [the navigation repair receipt](../2026-10-25-navigation-readability/receipt-2026-10-25-review-repair.md) before examining the repair seams.

This is a **repair-only re-review**, bounded by the earlier source-hash inventory and the repair receipt. Current repair hashes match the receipt. No Git command was run, so no fresh Git patch was retrieved. The earlier review's broader reuse, ruler, appearance and category-restoration assessment was not reopened. The comparison and final integrity evidence establish that the reviewed sources stayed unchanged during this run.

## SPEC verdicts

### 1. Speech ownership: OPEN, with a remaining P2 paused-takeover defect

The original failure is repaired: starting B idles A; A's stop, pause, resume, content reload, disposal and late start/boundary/end/error callbacks leave B alone. The unchanged earlier two-renderer probe also shows B still speaking after A unmounts.

**Remaining source:** `packages/reader-core/src/original/read-aloud/read-aloud-controller.ts:84–89,100–113,250–261,319–322`.

Ownership is transferred before the old controller is stopped. Its guarded `cancel()` now follows the non-owner branch at line 107, which clears only its local `paused` flag. The new controller's flag starts false, so its cancellation does not resume the shared engine at line 106. The engine can therefore retain the paused state that the existing comment at line 105 explicitly anticipates.

**Exact reproduction:** From the repository root, run `node docs/design/2026-10-25-readaloud-reuse/probe-integration-closure.mjs`. Its synthetic engine retains its global paused flag across cancellation and emits an utterance start only when unpaused. Mount two real `MarkdownRenderer` instances, start A, pause A, then start B. The check named `real renderer takeover of paused predecessor starts speech` fails with:

```json
{"a":"idle","b":"speaking","enginePaused":true,"newUtteranceStarted":false}
```

The direct-controller reproduction reports the same failure. Old A's subsequent pause/resume correctly cannot touch the engine; that protection also means it cannot recover B. These failures reproduced in two completed probe runs. They use synthetic speech, not an audible browser voice.

**Consequence:** Taking over a paused reading surface can queue a silent new utterance under a “speaking” interface. The new start watchdog will eventually report that it never began. **Repair criterion:** The new authorised owner must clear the predecessor's engine pause before submitting its utterance, while preserving the old owner's revoked cancellation and event authority. Add the paused-predecessor case to the ownership regression; the current speaking-predecessor tests pass without exercising it.

### 2. Missing-boundary watchdog: CLOSED

**Source:** `read-aloud/read-aloud-controller.ts:340–368,403–421`, relative to `packages/reader-core/src/original/`.

The independent probe uses an `EventTarget` utterance and sends `start` through the actual browser adapter wrapper. With no boundary events, started speech remains active through nine accelerated silence intervals. A pause longer than the complete start window remains paused without an error; resume re-arms monitoring and keeps active speech alive. Making the engine inactive without end/error produces the intended failure message.

A never-started utterance gets a bounded wait after resume, and eventually reports failure. The unchanged earlier probe separately retains speech when its capability supplies no start events but reports busy. The wrapper restores both an own `speak` method and an inherited one. This closes the missing-boundary finding within the synthetic-engine scope; it does not verify a native voice's start event.

### 3. Recording arbitration order: CLOSED for the reader integration

**Source:** `PublicationReader.tsx:30,45–49`, `MarkdownRenderer.tsx:62–63`, `read-aloud/use-read-aloud.ts:38–41`, and `listening/ListeningPanel.tsx:30–41`.

The unchanged earlier ordering probe passes 12/12, including its formerly failing assertion that the real silent-WAV recording is already paused at speech submission. The focused recording-toolbar probe passes 14/14, including menu Start, the keyboard shortcut and recording Play while browser speech is paused. Hiding the panel and changing formatting preserve recording playback.

The independent controller probe observes synchronous engagement on Start, Resume and skip from pause. Re-rendering a renderer with a changed engage callback calls the current callback on Resume. The no-output type check passes, and a source SSR render with a configured recording succeeds without `window` or `document`. Optional-prop omission is exercised by the existing no-recording cases. The callback-replacement lifecycle finding below is separate from these successful current-host ordering checks.

### 4. Back/Forward outline marker: CLOSED

**Source:** `TableOfContents.tsx:143–193` and `use-publication-reader.ts:118–148`.

At the Deliberate Practice Schemas chapter on port 8773, both outlines match the fragment after two subsection choices, Back, Forward and the outline shortcut at compact width in the unchanged earlier probe. The new independent probe also checks Back followed by resize from 1280 to 1024, Forward at compact width and reloading the copied subsection URL. Both markers stay on the URL destination throughout. A subsequent real wheel input releases that destination and moves both markers together to the heading at the reading line.

The served JavaScript and CSS match the local rebuilt preview bytes recorded in the integrity evidence. No shared rebuild was performed. This closes the original marker divergence; no broader navigation feature audit was undertaken.

## STANDARDS finding

### P3: Replacing the recorded player's pause-registration owner loses registration and cleanup

**Source:** `packages/reader-core/src/original/listening/ListeningPanel.tsx:30–35`; the new prop's stated unmount contract is at `listening/listening-types.ts:38–39`.

**Exact reproduction:** The same independent closure probe mounts `ListeningPanel` with callback A, then re-renders the same mounted panel with callback B. A receives the pause function. B receives nothing. Unmount then sends `null` to B, while A still retains the function. The completed evidence records this sequence:

```json
[["a",true],["b",false]]
```

The effect runs only when `controller` changes, but cleanup reads the latest callback from a ref. Registration and cleanup therefore address different owners after a callback replacement. A stable-owner mount/unmount control passes, and the current `PublicationReader` callbacks write the same stable ref, explaining why its ordering checks pass.

**Consequence:** A host that changes the callback's destination while retaining the panel cannot synchronously pause through the new destination, and the former host retains a disposed controller's callback after unmount. This is a lower-severity lifecycle defect in the newly introduced seam. **Repair criterion:** Balance each registration with cleanup to its registering owner, and register with a replacement owner when that prop changes. This does not require reopening the rest of the listening API.

No other standards finding was established in this bounded re-review.

## Commands, exits and evidence

All paths below are relative to the repository root. Exact stdout, stderr, durations and process exits are retained in [the focused check evidence](evidence-closure-focused-checks.json) and [the browser check evidence](evidence-closure-browser-checks.json).

| Command | Exit | Observed result |
|---|---:|---|
| `node --test packages/reader-core/src/original/read-aloud/test-read-aloud.mjs` | 0 | 24/24 passed. |
| `node packages/reader-core/node_modules/typescript/bin/tsc --noEmit -p packages/reader-core` | 0 | The type check passed. |
| `node docs/design/2026-10-25-readaloud-reuse/probe-integration-seams.mjs` | 0 | Original takeover, busy/no-boundary and history/resize states are repaired. |
| `node docs/design/2026-10-25-readaloud-reuse/probe-recorded-speech-order.mjs` | 0 | 12/12 passed, including submission order. |
| `node packages/reader-core/src/original/toolbar/test-toolbar-recorded-browser.mjs` | 0 | 14/14 passed, including paused-speech exclusion. |
| `node docs/design/2026-10-25-readaloud-reuse/probe-integration-closure.mjs` | **1** | Final run: 15/19 seam checks passed; four assertions expose the two findings above. SSR and both navigation assertions also succeeded within this failing command. |

**The final closure command is red.** Its four failed assertions are the direct and rendered paused-takeover cases, replacement registration and unmount cleanup. They represent two defects, not four new findings.

The retained run history includes two reviewer-harness errors: `window.root` initially resolved to the element with `id="root"`, and a later reload waited for a visible rail at a width where it is intentionally hidden. The harness now uses its own root variable and waits for the rail to be attached. Neither error required a production change. The final two completed runs have no page errors and reproduce the same substantive findings.

Native T3 preview was tried first. Opening succeeded, but two snapshot attempts returned `Preview automation snapshot timed out after 15000ms.` The owned preview tab was closed. Fallback used bundled headless Chromium shell, isolated contexts and repository-local scratch removed in `finally`. No real Chrome profile or audible speech was used.

## Repair source identities

[The full SHA-256 inventory](evidence-closure-source-hashes.json) includes earlier-review hashes, current source/test/manifest hashes and preview assets. [Final integrity evidence](evidence-closure-integrity.json) records no source drift, matching served assets and no remaining reviewer scratch.

The following paths are relative to `packages/reader-core/src/original/`; every hash matches the builder's repair receipt:

```text
56a038b8176aa19836a5163af38abf68049e0f2f3e6c96c71399f99c2d9f3031  read-aloud/read-aloud-controller.ts
cbe9c5ad928c7df6d5d59e27e766938a1d3a8c06138433dbef8ccb2e85daed3c  read-aloud/use-read-aloud.ts
e71989136591144cc4fa848f96da52362514c6d7bb39fb7c24b9ddef44f53b83  MarkdownRenderer.tsx
50bd713bc73f673775205cd4e9f2306854d044a462f2a1fe860653f133837a94  PublicationReader.tsx
700fc11f172513330e718b8b3850a8dc07a7a5ee693f8cadb53b1c7f53cd2e7f  listening/ListeningPanel.tsx
e5d5de9a927af500d907d137184d1955641c7b5189cc2e49b2a753c489e571a5  listening/listening-types.ts
126c6dd4f703c0624734a3a7e3ea0a8d8204dbb4ebc886dd4cf70fa72ceb3923  TableOfContents.tsx
ed72d75e60018aecabcb285cc97c49ccb86cef849b63ae2bd9d8e19289877f27  use-publication-reader.ts
6de33926ef26f3b6aa2a31262c1b79dff975fa354f3c7059e8a6781b7a57de62  read-aloud/flex-speech.ts
```

The vendored speech hash and the root/core manifest hashes match the earlier review. No dependency change was identified in those manifests.

## Limits and ownership release

The builder's reported full units/build/installed-package results were not repeated. Its red-by-removing-fixes evidence concerns the then-uncommitted repair tree; this review does not call it a committed-red baseline or independently repeat those mutations.

The isolated recording test was not rerun here. The receipt reports its unchanged 1.5-second completion; the earlier eight-minute hang still has no established cause and is **not resolved by this review**. No native voice, Safari/device, physical touch or screen-reader acceptance is claimed. Accelerated watchdog probes establish control flow, not a measured 30-second native-engine journey.

Only new review documents and targeted evidence were written. Earlier reviews, production files, original applications, manuscripts and shared build output were preserved. No other agents, Git operations, push or deployment occurred. Scratch and the owned preview tab were cleaned up. **Review ownership is released; the parent owns the P2 repair, the P3 disposition, re-review and checkpointing. Dominik has no next action.**
