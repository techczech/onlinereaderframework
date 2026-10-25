---
title: Independent closure review of the reader front-page repairs
date: 2026-10-25
register: FOR DOMINIK
reviewer: Codex gpt-6.1-sol
status: changes-required
baseline: Original review source hashes; parent identifies uncommitted work after 47e7354. No Git commands run.
evidence: evidence-closure/
---

**No action needed. FOR DOMINIK.** Three original findings are closed. Search activation is repaired, but its pending-request cancellation still needs correction. This is an independent review of the repairs; the reviewer made no production fixes. The parent session owns the remaining correction and release acceptance. Dominik has no action here.

- **Structural topics survive the explicit depth cap.** The fallback preserves the nearest readable pages without exposing every descendant.
- **Notes opens from the front page.** Seeded highlights and reflections remain available and unchanged.
- **Dark topic-card contrast passes the targeted checks.** Entry text measures 12.20:1 and Show all measures 6.51:1.
- **A cancelled Search request can return later.** Reopening navigation can revive a request interrupted by closing it.

## Scope and source identity

I read the exact original review, its source-hash inventory, the repair receipt, and the changed model, sidebar effect, layout wiring, toolbar condition, stylesheet tokens, demo query and configuration explanation. This review compares the repair with the original findings rather than repeating the whole reader review.

[Current source hashes](evidence-closure/hashes-frontpages-closure.json) identify the exact reviewed bytes and the seven files changed within the original review's inventory. The layout components, front-page component, copy, layout keys, controller, public types, package exports, stylesheet builder, original book JSON and both prototype designs still match the original hashes. No Git-based diff was obtained because the brief prohibits Git. Original source locations and the repair's current code provide the comparison; the baseline commit supplied by the parent is not independently verified.

The source hashes were unchanged at the end. [Served-byte receipt](evidence-closure/receipt-served-bytes-closure.json) confirms that the index and referenced JavaScript/CSS served on port 8773 match the local demo distribution. This is local browser evidence, not a fresh build or installed-package verification.

## SPEC closure

### Closed — Explicit depth one removes structural topics

**Source:** `packages/reader-core/src/original/frontpage/frontpage-model.ts:52–55, 78–86`; configuration explanation at `docs/configuration-publication-reader.md:79`.

The original failure dropped an entire root topic when truncation left it with no readable entry. The repair retains that topic and lists the nearest readable pages below its structural descendants. It stops descending when a readable page is reached. A root with its own page continues to obey the ordinary cap. Zero continues to hide everything. The supplied configuration object is not rewritten.

The independent synthetic fixture tests depths zero through four, including a structural chain, a readable page with its own readable child, a root with its own text, and a mixed branch. It establishes that the fallback does **not** flatten every descendant: the child below the nearest readable page stays absent until the configured depth reaches it. A mixed branch with an already readable capped entry also keeps its deeper page hidden. Root ids and source order remain intact. All three real books were checked at depths zero, one and two for duplicate ids and recorded counts.

In the built Linguistics reader, depth zero produces no contents. At depths one and two, the Colour band layout retains the exact **Contents** and **Full contents** labels. Contents has zero descendant links; Full contents has 253. Thus the fallback does not make the two views identical or force the summary open. The full list's ids are retained in the browser evidence.

This accepts the documented, narrow exception to the cap for an otherwise unreadable structural topic. It does not interpret depth one as permission to expose all descendants, or claim that Full contents ignores the configured cap.

**Evidence:** [Independent model results](evidence-closure/results-depth-closure.json), [model probe](evidence-closure/probe-depth-closure.mjs), and `depthViews` in [browser results](evidence-closure/results-frontpages-closure.json). Model command exited 0; browser measurement command exited 0.

### Closed — Notes is missing from front pages

**Source:** `packages/reader-core/src/original/toolbar/ReaderToolbar.tsx:124`. Notes is now unconditional; it uses the existing drawer callback and does not introduce an annotation store.

At both 1440 and 390 px, the front page contains Listen, Formatting, Assist and Notes. Independently seeded highlights appear through Notes, and the seeded reflection appears after selecting Reflections. The reader stays on the front page and both stored values remain byte-identical. The initial generic probe guessed the wrong drawer heading and reported `drawerVisible: false`; that measurement is invalid as a drawer test. The dedicated follow-up checks actual content and passes.

**Evidence:** [Notes results](evidence-closure/results-notes-closure.json), [dedicated probe](evidence-closure/probe-notes-closure.py) and its log. Final command exited 0. This closes the conditional omission. The earlier desktop article-toolbar cutoff did not reproduce in the original review and is not reopened. The article path is unchanged apart from removing the home-only condition; I did not repeat its full toolbar walkthrough.

## STANDARDS closure

### Open, P2 — Closing navigation does not consume a pending Search request

**Original activation defect:** Repaired in the targeted checks. Enter on the front-page Search button followed by typing `mus` focuses the sidebar input and enters `mus`, at both desktop and mobile widths. Closing navigation and issuing another Search request also works. Window and reader scroll positions remain zero in these normal activation checks.

**Remaining repair defect:** `packages/reader-core/src/original/Sidebar.tsx:120–139` consumes the request on success, guard cancellation and retry exhaustion. Its cleanup at line 138 only cancels the animation frame. Closing navigation therefore leaves `shouldFocusSearch` true. The `isOpen` dependency restarts that old request when navigation reopens. `ReaderLayout.tsx:65–66` clears the flag only through the handled callback, which this cleanup does not call.

**Deterministic reproduction, at 1440 and 390 px:**

1. Open Linguistics with Search and topic map. Temporarily refuse only the sidebar input's native `focus()` calls, so the new retry path remains pending. All other browser focus calls retain native behaviour.
2. Activate Search with Enter. After about four attempted frames, activate the navigation toggle with the keyboard to close navigation.
3. Observe that the attempt count stops while navigation is closed. Restore the input's native focus behaviour.
4. Reopen navigation using the navigation toggle, without issuing another Search command. Focus moves from that toggle into the search input.

Closing cancels the running frame, but does not cancel the request. The old Search intent survives an intervening close and can later take focus on an ordinary navigation opening. **Required disposition:** consume or invalidate a pending search request when navigation closes, while preserving fresh requests and safe unmount cleanup. This reviewer makes no fix.

The focus refusal is deliberate instrumentation of the retry condition, not a claim that an uninstrumented close/reopen race reproduced on this machine. It exercises the precise condition the repair was added to handle. The stale flag and dependency restart are also directly established by source inspection.

**Other targeted lifecycle checks passed:** moving focus to a textarea or a button inside a `role="dialog"` ends retries and keeps focus there after native input focus is restored. Another explicit Search request succeeds afterwards. Exhaustion stops at exactly 30 attempts and a fresh request succeeds. Switching books in the same mounted demo stops the old attempts and leaves the new home with navigation closed; no delayed input focus occurs. These cases ran at both widths. The new callback belongs to the unexported original-sidebar props and is not added to `PublicationReaderProps` or the package export surface. The separately exported legacy Sidebar is a different component.

**Evidence:** `search` and `guards` in [browser results](evidence-closure/results-frontpages-closure.json), [browser probe](evidence-closure/probe-frontpages-closure.py). Command exited 0, meaning measurements completed; the cancellation result above remains a failure. No real-device keyboard, React 19 or screen-reader check was performed.

### Closed — Dark topic cards have low text contrast

**Source:** `packages/reader-core/src/original/frontpage/frontpage.css:3–4, 15, 54, 162`. The new raised-card and field tokens preserve the previous light values and use darker surfaces inside the reader's dark class.

Independent computed-style measurements on the original Linguistics Search and topic map reproduction give the following ratios at both widths: entry and topic-title text **12.20:1**, Show all **6.51:1**, group counts **6.40:1**, and filter input text **12.83:1**. The tile background is `[32, 38, 53]`, replacing the brightened dark surface responsible for the original 3.76:1 and 2.01:1 failures. The contrast calculation reuses the builder probe's inspected colour-compositing helper; the browser measurements were collected independently.

**Evidence:** `contrast` in [browser results](evidence-closure/results-frontpages-closure.json). Command exited 0. The builder's 36-view dark sweep and focus-outline measurements remain builder evidence; I did not repeat that matrix. The existing light group-count and Search-button observations are outside this original dark-card finding. No new light-theme contrast claim is made.

## Commands, limits and cleanup

All commands ran from the owning reader repository. Final independent commands were:

- `node docs/design/2026-10-25-configurable-frontpages/evidence-closure/probe-depth-closure.mjs` exited **0**. Its log records the synthetic boundary and real-book identity checks.
- `../book-engine/.venv/bin/python docs/design/2026-10-25-configurable-frontpages/evidence-closure/probe-frontpages-closure.py` exited **0**. Its measurements expose the remaining cancellation failure and record no page errors.
- `../book-engine/.venv/bin/python docs/design/2026-10-25-configurable-frontpages/evidence-closure/probe-notes-closure.py` exited **0**. Seeded home-note access and retained storage passed at both widths.
- The read-only source-stability and served-byte receipt command exited **0**.

Initial browser-harness commands exited 1 because a mobile pointer click was covered by the drawer, and because returning an assigned native focus function caused Playwright to invoke it. The final harness uses keyboard activation and a void-returning restoration function. An initial Notes assertion exited 1 because it looked for reflections without selecting their tab. Those logs are retained separately; they are not passing product evidence.

Native T3 was attempted first. The owned tab opened, but two consecutive snapshots each returned exactly `Preview snapshot failed: Preview automation snapshot timed out after 15000ms.` The fallback used bundled `chromium_headless_shell` through the existing book-engine Python environment, never installed Chrome. The T3 tab and all headless contexts were closed. Explicit browser-profile scratch directories were created inside this evidence folder and removed through `TemporaryDirectory`/`finally`; none remain. No review server was started; the existing port-8773 server remains running.

I did not repeat the root build, full units, 279 browser assertions, installed-package matrix or saved-position isolation checks. Their previous receipts remain separate evidence. The repaired public types and exports match the original hashes, and no packaging seam changed. No manuscripts, book JSON, production code, existing reviews or builder evidence were edited. No Git, push or deployment operation was run. Ownership of this closure document and its narrow evidence is released to the parent session, which owns the remaining Search correction and release decision.
