---
title: Repair receipt, toolbar review findings
register: FOR AGENTS
date: 2026-10-25
builder: Sonnet 5.5 (medium)
closes: review-toolbar-2026-10-25.md (four P2 findings)
---

## Changed files
Production:
- `packages/reader-core/src/original/toolbar/ReaderToolbar.tsx` (finding 1)
- `packages/reader-core/src/original/PublicationReader.tsx` (finding 2)
- `packages/reader-core/src/original/MarkdownRenderer.tsx` (findings 3, 4)

New: `toolbar/test-toolbar-repair-browser.mjs` (23 checks), `evidence-repair-probe-2026-10-25.mjs`, `evidence-repair-probe-before-2026-10-25.json`, `evidence-repair-probe-after-2026-10-25.json`, this receipt.
Untouched: earlier receipt, review report and its `.mjs`/`.json`, front-page designs, manuscripts, package.json, dependencies, public API/schema.

## Fixes
1. Reset keyboard containment: reproduced. Chromium keeps a just-disabled button as `document.activeElement`, so the Tab trap (`panel.contains(target)`) never saw a live element and Tab went to Home. Toolbar now remembers the last focused section/footer in the open menu; after any render, if the active element is outside the menu or is disabled, focus moves to the first enabled control in that group, else the checked/first control of the menu (sheet head skipped). Same hole fixed for steppers at their limit and Turn all off. Escape/return and open-time focus unchanged.
2. Orphan recording: reproduced. `hasRecordedAudio` now also requires `track.sectionId` to match a section of `reader.sections`, the same set the controller uses.
3. Speech ownership: reproduced. A renderer cancels shared `speechSynthesis` on unmount, content change or Stop only when it holds its own current utterance (`utterance.current`).
4. Stale callbacks: reproduced. `onend`/`onerror` act only if their utterance is still `utterance.current`; stop, replace, end and unmount clear it.

## Reproduction before / after
| Probe | Before | After |
|---|---|---|
| `test-toolbar-repair-browser.mjs` against pre-repair sources (scratch copy) | 11/23 | 23/23 |
| review probe re-run (`evidence-repair-probe-2026-10-25.mjs`) | 24/30 (the review's same six failures) | 30/30 |

"Before" used a scratch copy of `src` with the three fixes reversed (deleted afterwards). The repair probe differs from the review probe only by env overrides and by not clicking the now-absent Open player for an orphan track; run unmodified, the review probe times out at that click on the fixed code, which is the expected consequence of fix 2. Speech is a stub in all runs; no real voice is claimed.

## Commands (repo root)
| Command | Exit |
|---|---|
| `node packages/reader-core/node_modules/typescript/bin/tsc --noEmit -p packages/reader-core` | 0 |
| `node …/toolbar/test-toolbar-repair-browser.mjs` | 0 (23/23) |
| `node …/toolbar/test-toolbar-recorded-browser.mjs` | 0 (11/11) |
| `node …/test-reader-layout-navigation-headless.mjs` | 0 |
| `node …/reading-support/test-reading-support-browser.mjs` | 0 |
| `node docs/design/…/evidence-repair-probe-2026-10-25.mjs` | 30/30 |
| `npm run build` | 0 |
| `npm test` (full unit, once) | 0 |

## Limits
- Native T3 preview not attempted this round; bundled headless Chromium shell only (no Chrome).
- `check-reader-toolbar.py` and sidebar matrix not rerun (no layout/CSS change; the probe's real-book and sidebar-scroll steps passed).
- The new repair test is not in `npm test` (browser tests are run by hand, as before).
- After a self-disabling action, focus moves to the group's first control or the menu's first/checked control; not tested with a screen reader.

## Ownership
Released. No Git operations, push or deploy performed; scratch directories removed.
