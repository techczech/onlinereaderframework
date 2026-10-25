---
title: Receipt for the paused-takeover and pause-registration repairs
date: 2026-10-25
register: for-dominik
status: repaired-pending-rereview
---

No action needed. FOR DOMINIK.

Repairs for the two open findings in [the closure review](review-integration-closure.md). The review itself is unchanged. Synthetic speech only; no audible voice was used.

## Changes (relative to `packages/reader-core/src/original/`)

- **P2, `read-aloud/read-aloud-controller.ts`:** the engine's paused flag moved from each controller to the shared engine slot. When a new owner claims the engine and the slot is paused, it cancels the old speech, resumes the engine and clears the flag before submitting its utterance. A superseded reader still cannot pause, resume or cancel the engine.
- **P3, `listening/ListeningPanel.tsx`:** the registration effect now depends on `registerPause`, so each registration is cleaned up with `null` to the callback that received it, and a replacement callback is registered.
- **`PublicationReader.tsx`:** the parent callback is wrapped in `useCallback` so the effect does not re-register every render.
- **`read-aloud/test-read-aloud.mjs`:** new test for a paused-predecessor takeover (engine pause cleared; old reader cannot pause, resume or cancel the new owner; new owner can).

## Commands and exits

| Command | Exit | Result |
|---|---:|---|
| `node docs/design/2026-10-25-readaloud-reuse/probe-integration-closure.mjs` (unchanged) | 0 | All seam checks pass. The reviewer recorded exit 1 for it before the repair; the repair was written before this run, so the red baseline is the reviewer's, not a fresh run. |
| `node --test packages/reader-core/src/original/read-aloud/test-read-aloud.mjs` | 0 | 25/25. With the old per-controller flag restored the new test fails (24 pass, 1 fail). |
| `node packages/reader-core/src/original/toolbar/test-toolbar-recorded-browser.mjs` | 0 | 14/14 |
| `node docs/design/2026-10-25-readaloud-reuse/probe-recorded-speech-order.mjs` | 0 | 12/12 |
| `node docs/design/2026-10-25-readaloud-reuse/probe-integration-seams.mjs` | 0 | exit 0 |
| `node packages/reader-core/node_modules/typescript/bin/tsc --noEmit -p packages/reader-core` | 0 | type check passed |

## SHA-256

```text
ef979dc329be4a5e79ce236335b64f41fed102ab40427233a1b3a138401a79de  read-aloud/read-aloud-controller.ts
98cea6b7561ad662cf3e1c6d4bd2b7f67ec3286b4d3576d6573e2348a04d4a87  read-aloud/test-read-aloud.mjs
53c44162d5138a1e9140fd71db04a18179d3bb02de416df543b437babce22d6f  listening/ListeningPanel.tsx
4c381e78f3336e823e7df093b3d3c08e8c30fcbced949e8e6d9a7f5a08ce65e2  PublicationReader.tsx
```

## Limits

No separate unit test for the registration owner change; the unchanged closure probe is its regression. No full test matrix, no build of the served demo and no native-voice check. No Git, push or deploy. Re-review is owed (speech seam).
