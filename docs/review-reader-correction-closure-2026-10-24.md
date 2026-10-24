---
title: Independent closure review of the two reader correction findings
date: 2026-10-24
register: FOR DOMINIK
reviewer: GPT-6 Astra through Codex in T3 Code
reviewed_commit: b415202c6bd79e0fe8338c7ad1082967920785e4
review_baseline: 53fc823023ea5d6751350233c60d9f845ed03231
status: clear-within-two-finding-scope
scope: Language Muscle body typography and mounted Listen keyboard focus
---

# Independent reader correction closure review

**Both original P2 findings are closed at the reviewed commit. No remaining regression was found within these two scopes.**

- The actual Language Muscle introduction paragraph responds to text size and typeface preferences without replacing its paragraph or text node.
- Listen accepts keyboard activation, focuses Close on each opening, and returns focus to its trigger after Escape.
- Real HTML audio continues through closing, reopening and settings changes, without replacing the media instance or stealing settings focus.

## Spec: Language Muscle paragraph typography — closed

**Source:** `packages/reader-core/src/original/reading-support/support.css:12–18`.

The new rule applies the preference directly to body blocks carrying manuscript utility classes. Heading elements are outside this added selector, as are body blocks nested inside pre/code/kbd/samp/MathML. This addresses the original container-only inheritance failure.

On the existing preview at `http://127.0.0.1:8773/?book=language-muscle&section=intro-group`, the actual first paragraph begins “Welcome to your new language learning journey.” With fresh storage, it measured **20px**, Merriweather/Georgia/serif, and **68px high**. Selecting 28 and sans changed that same paragraph to **28px**, Inter/system-ui/sans-serif, and **95.1875px high**. These are paragraph measurements, not container measurements.

The independently executed closure script confirmed unchanged article text, paragraph identity and first text-node identity; selecting the paragraph still returned its complete text. An additional probe retained a Range created before changing settings: its complete paragraph text remained unchanged afterwards. The real Introduction heading remained **30px**. Heading font family follows the existing inherited typeface preference; preserving heading hierarchy does not mean freezing its font family.

The existing support browser test also passed its selection/text-node identity and MathML-tree checks. Code/MathML selector exclusions were inspected; this review does not claim an exhaustive computed-typography comparison of every code or maths element.

## Standards: mounted Listen keyboard focus — closed

**Source:** `packages/reader-core/src/original/PublicationReader.tsx:30–38,46–51`; existing panel keyboard handling is at `packages/reader-core/src/original/listening/ListeningPanel.tsx:56–60`.

The opening effect depends only on `listeningOpen` and focuses the existing Close button. The hidden wrapper retains the mounted panel, and the close callback restores the saved trigger. Settings changes do not rerun that opening effect.

Independently, focusing the toolbar Listen button and pressing Enter moved focus inside the visible player. Escape hid it and returned focus to Listen; repeating Enter and Escape passed again. The configured full PublicationReader fixture additionally asserted that **Close itself received focus**, including both reopenings during playback.

The fixture bundles the current reader source in memory and supplies the actual Language Muscle book with a 24-second silent WAV. Two successive keyboard close/reopen cycles retained the exact HTML audio object, its instance count, playing state and position beyond the two-second seek. Changing text size retained input focus and playback.

An additional probe checked focus after 450ms delays, first on Text size and then on an explicitly focused Typeface control. Both retained focus. Audio advanced from **2.000000 to 3.354870 seconds at 1.5×**, with **one unchanged media instance** and no pause, emptied or ended events during the observed cycles and settings changes. No page errors occurred.

## Evidence independently run

The browser was Playwright's bundled headless shell, version **153.0.8010.12**, through the existing sibling book-engine Python environment. This used the explicitly authorised fallback after the earlier T3 snapshot timeouts, the existing server on port 8773, and in-memory intercepted fixture responses. No new server or system Chrome was used.

```sh
../book-engine/.venv/bin/python scripts/check-reader-corrections.py --closure-only
node packages/reader-core/src/original/reading-support/test-reading-support-browser.mjs
```

The closure command passed **17/17 checks**. The support command passed **14 named checks**. The separate in-memory probe passed **12/12 checks**, including repeated fixture assertions and the additional delayed-focus, playback-progress, retained-range and heading-size observations above. These counts describe separate runs, not unique coverage totals.

The first additional probe exposed three mistaken harness assumptions: selecting an option programmatically need not focus its select; filling the numeric control changes the active selection; and inherited heading typeface is expected to change. The corrected probe explicitly focused controls, examined a retained Range separately from input selection, and checked heading size. These were probe corrections; no production change was made.

## Inspected evidence and limits

The original independent review and the repair receipt were read, including the exact production diff and reported red/green results. The pre-fix red run was **inspected, not independently rerun**. The parent evidence JSON was counted directly: **54 checks, all passing, with no page errors**. The broad browser run was not repeated here.

The parent reports **63 passing root Node tests**, unchanged **515 source hashes and 253 answers**, and a passing final repaired React 18 package/browser matrix. React 19 was still running in the latest parent update available for this review. Those checks remain parent-reported and are not prerequisites silently claimed as completed here.

No full book recordings exist in the current demos; their missing-recording state is expected. The silent WAV establishes real HTML audio lifecycle behaviour, not audible narration or book alignment. This review does not reopen the broad UI, packaging, security or licensing review.

The branch reference was read directly before and after testing and named the exact reviewed commit above. The two production files, closure script and publication JSON retained identical SHA-256 values across this review. The only retained file written by this reviewer is this document. The support test removed its repository-local scratch directory; the additional probes created no fixture files. No source changes, Git commands, push, deployment, secrets access or delegation occurred.

**Return to the parent session:** both assigned findings are independently closed. No user decision is required.
