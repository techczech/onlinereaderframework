---
title: Independent review of the reader toolbar
register: FOR DOMINIK
date: 2026-10-25
reviewer: Codex Sol 6.1, independent of the builder
status: findings-returned-to-parent
scope: Working-tree toolbar implementation described as following 6ce09ff
---

# Independent review of the reader toolbar

**No action needed from Dominik. The parent session should address the two specification findings before accepting this toolbar.** The speech lifecycle findings also need an explicit disposition; this review does not establish that they were introduced by the toolbar change.

- **Two specification failures are reproducible.** Resetting Formatting breaks keyboard containment, and a recording attached to a nonexistent chapter still opens an empty player.
- **Two standards findings concern speech ownership and stale callbacks.** Both were reproduced with controlled speech events, without real voice output.
- **The other focused integration checks passed.** These include separate reset groups, book persistence, annotations, MathML, mobile switching, sidebar focus and scroll, and synthetic recording continuity.
- **Fixes and release acceptance belong to the parent session.** This review changed only this report and its two evidence files. It performed no Git operations, production edits, deployment or public push.

## Spec findings

### P2 — Reset formatting allows Tab to leave an open menu

**Location:** `packages/reader-core/src/original/toolbar/ReaderToolbar.tsx:74–79` and `:158–162`.

**Requirement:** Option A explicitly keeps Tab inside the open menu and returns focus to its control on Escape.

**Reproduction:** Open a chapter, open Formatting, increase Text size, activate Reset formatting, then press Tab. The independent Chromium probe found focus on the article's **Home** breadcrumb while Formatting remained open. The reset button disables itself when the change count reaches zero. The trap only wraps when the active element equals the current first or last enabled control; it does not recover focus after that last button becomes disabled.

**Consequence:** A routine reset leaves the keyboard outside the visible menu. Escape from the breadcrumb is handled by the reader rather than the menu, so the intended close-and-return interaction is no longer reliable.

**Expected correction:** Keep or restore focus to an enabled control in the open menu when an action disables its own focused button, then retain the existing Escape return behaviour. The evidence assertion is “Tab remains in Formatting after reset becomes disabled”.

### P2 — A recording for a nonexistent chapter still offers an empty player

**Location:** `packages/reader-core/src/original/PublicationReader.tsx:26`; compare `packages/reader-core/src/original/listening/listening-controller.ts:66–73`.

**Requirement:** Recorded audiobook appears only for usable tracks; books without playable recordings must not open an empty player.

**Reproduction:** Mount a book whose section IDs are `one` and `two`, with `audio=[{sectionId:'missing',src:'/valid.wav'}]`. Open Listen. Recorded audiobook and Open player appear. Activate Open player: the panel says **“No recording for this book yet”**.

**Cause and consequence:** The new availability predicate validates only the source URL. The controller additionally requires a matching book section ID and consequently rejects the same track. The menu and player disagree about whether any recording exists. This does not affect the three current books, which have no audio configuration, but it breaks the new integration contract for stale or mismatched recording metadata. No network playback attempt is needed to reproduce it.

**Expected correction:** Derive availability using the same source and section validity rules as the controller. The two failing evidence assertions cover both the offered option and the empty player.

## Standards findings

These findings concern speech code that the implementation receipt says was retained. This review inspected current files without Git operations, so it does not assign their introduction to a particular commit. They remain relevant to the explicitly requested speech cleanup and race review.

### P2 — An idle renderer cancels speech owned by another renderer

**Location:** `packages/reader-core/src/original/MarkdownRenderer.tsx:72–87`; the unconditional stop path is also at `:134–138`.

**Reproduction:** Start browser read-aloud through the toolbar. Mount a second, idle MarkdownRenderer in another host element. Its initial content effect calls the shared `window.speechSynthesis.cancel()`. Unmount that idle renderer: its cleanup calls `cancel()` again. The probe observed one cancellation on each operation, even though the second renderer never created an utterance.

**Consequence:** Cleanup does not establish utterance ownership. An independent reader or another speech client sharing the page can lose playback because an idle renderer mounts, changes content or unmounts. The toolbar can continue showing Reading aloud because the owning renderer has not itself received a state transition in this controlled scenario.

**Expected correction:** Restrict automatic cleanup to speech owned by that renderer, or make ownership explicit at the host level. This is a multi-renderer lifecycle finding; normal formatting changes in a single reader did not cancel speech in the independent probe.

### P2 — A late callback from a cancelled utterance clears new playback state

**Location:** `packages/reader-core/src/original/MarkdownRenderer.tsx:119–127`; state reaches the toolbar through `:58–62`.

**Reproduction:** Start utterance A, stop it, and start utterance B. Deliver A's saved `onerror({error:'canceled'})` callback after B has started. The callback clears `isSpeaking` and `isPaused` without checking whether A is still current. The toolbar's active speech chip disappears even though B was the latest utterance submitted and has not ended.

**Consequence:** Out-of-order completion can make the new toolbar report idle playback and offer Start rather than Pause. This is a deterministic event-order reproduction, not an observation of a particular browser's voice timing.

**Expected correction:** Ignore end/error callbacks from superseded utterances, and invalidate the old callbacks on stop and replacement. The evidence assertion is “late canceled utterance cannot clear new playback state”.

## Independent checks and evidence

The runnable probe is [evidence-review-toolbar-2026-10-25.mjs](evidence-review-toolbar-2026-10-25.mjs). Its final results are [evidence-review-toolbar-2026-10-25.json](evidence-review-toolbar-2026-10-25.json). It bundles the current source into an isolated fixture and also visits the existing built demo on port 8773. Scratch browser files are created beside the evidence and removed in `finally`.

| Check | Independent result |
| --- | --- |
| `node docs/design/2026-10-25-visual-preferences-opus/evidence-review-toolbar-2026-10-25.mjs` | Exit 1: 30 assertions, 24 passed and 6 failed. The six failures form the four findings above. |
| `node packages/reader-core/src/original/toolbar/test-toolbar-recorded-browser.mjs` | Exit 0: 11/11 passed. This existing focused test was independently executed. |
| `node packages/reader-core/node_modules/typescript/bin/tsc --noEmit -p packages/reader-core` | Exit 0. |
| ESM import of `packages/reader-core/dist/index.js` | Exit 0. |
| TypeScript program emit captured in memory and compared with existing build files | Exit 0: all 16 JavaScript/declaration files for the reviewed integration modules and three new toolbar modules exactly matched current source emission. No build output was written. |
| Existing packaged CSS compared with current source CSS | Exit 0: it includes the exact current `reader-original.css` and reading-support `support.css`. The new toolbar selectors therefore reach the packaged stylesheet. |
| Server rendering of the public reader with React deduplicated in an in-memory bundle | Exit 0: toolbar rendered without browser globals; no recorded surface appeared without audio. This is server rendering only, not hydration acceptance. |

The independent browser checks established the following within their fixtures:

- Legacy `fontSize='xl'` and `lineHeight='loose'` storage values were ignored; the paragraph rendered at 20 px with a 34 px line height. Reset and Assist off preserved those legacy bytes, highlights and reflection storage.
- Formatting reset preserved the active ruler. Assist off preserved the changed text size. A decorated highlight, loaded reflection and MathML `mi` node survived the settings changes. Book A's changed size survived switching through two other books and back.
- Ordinary Escape returned focus to the toolbar. At 390 × 800, the sheet reached the viewport bottom, its menu switch retained focus, and Escape returned to the newly selected Assist control. An outside pointerdown closed the menu without clearing a programmatically established text selection.
- All three real books showed the four chapter controls and no recorded player. A focused Linguistics check preserved sidebar scroll across opening and closing Formatting, then verified that selecting another visible chapter focused the article and reset its scroll.
- The synthetic recording test verified playback continuing while its panel was hidden and while formatting changed. Browser speech paused the recording; starting the recording cancelled browser speech. Hidden-player initial focus, opening focus and closing focus return also passed the independent fixture checks.

The package configuration remains ESM. Its TypeScript source glob includes the new private toolbar files, the emitted relative imports resolve, and the package's `files: [dist]` rule includes them. The root test entry includes the new model test. No full package matrix was run.

## Execution limits

Native T3 `preview_status` reported no available tab. Both attempts to open a tab failed with **“Too many server browser tabs are open. Close one with t3_preview_close, or reuse a tabId from preview_status tabs.”** The authorised fallback used the bundled `chromium_headless_shell` executable, never installed Chrome.

Speech was stubbed throughout the voice probes. The recording test used a synthetic WAV. These establish state transitions and media continuity in Chromium, not real voices, audible output, real phone behaviour or iOS Safari compatibility. The source and preference checks do not establish screen-reader behaviour. The outside-selection probe tests the menu's pointerdown handler, not a complete touch-selection gesture.

The desktop menu's absolute positioning under the toolbar actions was inspected in CSS; this review did not repeat the prior desktop text-column measurements or screenshot matrix. Notes checks covered stored bytes, loaded reflections and highlight decoration; a complete drawer editing journey was not repeated. The single targeted sidebar journey does not replace the builder's full sidebar suite.

Two initial harness attempts were corrected: the MathML probe used `inner_text`, which does not support MathML nodes, and the real-book probe tried to click a closed mobile sidebar. The final evidence uses `text_content` and direct chapter routes. An initial `npx tsc` tried to reach the registry and exited 1; the explicit installed compiler above then passed. A direct server-render attempt mixed the demo and package React installations and produced an invalid-hook error; the corrected deduplicated bundle passed. Neither harness error is reported as a production defect.

The builder's claimed full unit suite, root build and broader browser checks were read as context, not counted as independent passes. The historical corrections script was left untouched. No baseline diff or clean-tree assertion was made because this review expressly prohibited Git operations and other agents own concurrent changes.

## Reviewed source hashes

SHA-256 values below identify the source and test files read for this review. They identify current bytes, not a committed release. Paths are relative to the repository root.

| File | SHA-256 |
| --- | --- |
| `packages/reader-core/src/original/ReaderLayout.tsx` | `89ba712dbd53578edd6caeeb28df66835fcc9341ccbacad171738f4418b8d271` |
| `packages/reader-core/src/original/PublicationReader.tsx` | `d7ea965c55c25927568b3630750eeed944676e5e4c20d44e42b8fb79ede8eeb2` |
| `packages/reader-core/src/original/use-publication-reader.ts` | `f9a03c1fe6dfe752a784ac009f55d7be55e4a86ba4121666c97932b7b500d211` |
| `packages/reader-core/src/original/MarkdownRenderer.tsx` | `9b1da7ddfb23b99dddc1f052d0db3228c566387bb7367fd26b72621c5a158254` |
| `packages/reader-core/src/original/ShortcutsModal.tsx` | `19463518655ce581e86b8e6994c6513df3a8dd1b2295ef4d8ec63940ce37705d` |
| `packages/reader-core/src/original/reader-original.css` | `ac2cfbb66eb4697e4c77a3af8fc71e9ae9a8405490924fc7ef77a050a0d12461` |
| `packages/reader-core/src/original/toolbar/ReaderToolbar.tsx` | `722a59e06e81d7ab3adaefb0c54fe0302651157d36943d24f0ba8bf5ad85de2a` |
| `packages/reader-core/src/original/toolbar/controls.tsx` | `9b95643f251e565c9dac0b86f59e9710ae59f622a36e03565bd86357692415b3` |
| `packages/reader-core/src/original/toolbar/toolbar-model.ts` | `ced50f1d2fe8b8cfc5db958a7666b2421505cc48e291c8c82e6449323bdcf2bb` |
| `packages/reader-core/src/original/toolbar/test-toolbar-model.mjs` | `cdc78dd738ba38ede85256906dc2c666ff6519acc1234a3e99f7ea69310a0356` |
| `packages/reader-core/src/original/toolbar/test-toolbar-recorded-browser.mjs` | `2dc6a405a6ae4fda3cea18db7ff2543cb677e871f14b3b679068cab31643a5a6` |
| `packages/reader-core/src/original/reading-support/use-reading-support.ts` | `23a2e4df2d148bc06401cdb024de854ae9636e12746655959533ef710a4523c8` |
| `packages/reader-core/src/original/reading-support/ReadingSupportSurface.tsx` | `bf3a50604a6e116b76182ebc4251c822b26320ffff099dfb05e889826cabe29f` |
| `packages/reader-core/src/original/reading-support/reading-preferences.ts` | `f4beaf0c3d631dbf63db81ebabfe9792c06d980be06614fdaa6932d3eae999f8` |
| `packages/reader-core/src/original/reading-support/support.css` | `59380a51ac9f2a15c31944aa35394051cf8c54eebfdee7ba6bab01238a72c09b` |
| `packages/reader-core/src/original/listening/ListeningPanel.tsx` | `6e8a470b316b2c5f3318ab2eba947202754b2bef67848adf2a729d51a6e830a9` |
| `packages/reader-core/src/original/listening/listening-controller.ts` | `7c908ee5e140c1d1aab1e4655e42b55c59040d8bcf6c3020a85a12a88a5688d7` |
| `packages/reader-core/src/original/listening/listening-model.ts` | `810a8bc9ba3cc639d2a956f681ab429d151e9cae8e8b8387ad0144d5344072a5` |
| `packages/reader-core/src/original/Sidebar.tsx` | `ba5f4c93615f673d01c50109e0f27a572cde072b323cf701456a5f8a67d12d84` |
| `package.json` | `899a9f08c81d74951850536e2f3f8813f5f86067b577209e8baffb06b0f613bd` |
| `packages/reader-core/package.json` | `80371d898427f2d23724260cbe0dfc760a389aa5b0bcb2386b214059ba26e1e3` |
| `packages/reader-core/tsconfig.json` | `717df5f2cbadd451d0f59abf525d5492ed95a2ad93e8d0615813254b6a0f9ae6` |
| `scripts/build-reader-core.mjs` | `3acd5b40a088ff0ec5afea76ff6f2de94d6810e48bbc80894ab02cdbcb05cd87` |
| `scripts/build-reader-styles.mjs` | `6d455fbec33266a6ac7937486654a734dea4d1ef874fea9006e215b930804c05` |
| `scripts/check-reader-toolbar.py` | `6653a757158c9fbdd55d1fb6b35d2342b48a47aadbb7c4db4c0918cb00d27ad9` |

## Ownership returned

The independent review is complete. The parent Sol session owns fixes, any follow-up review and release acceptance. No production fixes were made. The frontpage designs and manuscripts were outside this review.
