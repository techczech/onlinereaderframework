---
title: Independent review of the reader corrections
date: 2026-10-24
register: FOR DOMINIK
reviewer: GPT-6 Astra through Codex in T3 Code
commit: 53fc823023ea5d6751350233c60d9f845ed03231
status: changes-required
scope: User-reported reader corrections and new support/audio integration
---

# Independent reader corrections review

**Two reproducible findings remain at the frozen commit.** The reader corrections are not yet clear within the reviewed scope.

- Language Muscle's introduction paragraph ignores the numeric text-size setting.
- Opening Listen leaves keyboard focus outside the player, so Escape does not close it.
- The configured full-reader audio fixture passes playback continuity, speech coordination, chapter navigation, resume, book isolation and measured highlighting checks.

No production files, manuscripts, Git state or deployments were changed by this review. The only retained review artefact is this document. Temporary review fixtures were removed.

## Specification finding

### P2 — Language Muscle body text does not respond to the text-size control

**Location:** `packages/reader-core/src/original/reading-support/support.css:4–12`, particularly the font-size assignment at line 8.

The support stylesheet sets font size on the article container. Language Muscle contains paragraphs with their own explicit size classes, so those paragraphs do not inherit the selected size. The introduction's actual paragraph retains its `text-lg` size. This violates the brief's text-layout adjustment journey even though the container-level check passes.

Reproduce on the existing frozen preview:

1. Open `http://127.0.0.1:8773/?book=language-muscle&section=intro-group` at a 1440 × 1000 viewport with fresh browser storage.
2. Inspect the first paragraph inside `[data-publication-content]`. Its class is `text-lg text-slate-600 mb-4`, and its text begins “Welcome to your new language learning journey.”
3. Open Reading settings, set Text size to 28, then close the dialog.
4. Compare the paragraph's computed font size and height with the initial measurements.

**Observed independently:** the article container becomes `28px`, but the paragraph remains `18px`. Its height remains `61.1875px` before and after. A separate earlier run at phone width also reproduced the unchanged 18px paragraph.

**Required correction:** make the reading-size preference affect actual body text carrying manuscript size classes, while preserving the source manuscript and intentional heading hierarchy. Closure must measure a real Language Muscle paragraph before and after changing the setting; measuring only the article is insufficient.

## Standards finding

### P2 — Opening the permanently mounted player never transfers keyboard focus

**Location:** `packages/reader-core/src/original/PublicationReader.tsx:31–34` and `41–46`. The relevant child behaviour is in `packages/reader-core/src/original/listening/ListeningPanel.tsx:19–29` and `56–57`.

The integration keeps ListeningPanel mounted inside a hidden container. Its mount-time focus call therefore runs while the panel is hidden. Opening Listen only changes visibility, so the focus call is never repeated. Escape is handled inside the panel, but keyboard events continue to originate from the toolbar trigger.

Reproduce with either the configured full-reader fixture or the existing real-book preview:

1. Focus the visible Listen button and press Enter.
2. Check whether the Recorded audiobook region contains `document.activeElement`.
3. Press Escape without first clicking or tabbing into the player.

**Observed independently:** the panel opens, focus remains on the Listen button, `panel.contains(document.activeElement)` is false, and the panel remains visible after Escape. This was reproduced using keyboard activation on the real preview, as well as pointer activation in the configured fixture. Closing through the panel's Close button does return focus to Listen.

The listening module's integration receipt explicitly requires the host to focus a control when reopening a mounted hidden panel. The current integration misses that requirement and the brief's keyboard-focus/Escape state.

**Required correction:** transfer focus into the panel after each opening, while retaining the mounted media instance and returning focus to the trigger on close. Closure must cover initial opening and reopening with Enter and Escape, including while a recording is playing.

## Independently exercised checks

The browser was Playwright's bundled `chrome-headless-shell`, launched through the existing sibling `book-engine/.venv` Python environment. No system Chrome was used. The previously reported T3 snapshot failure authorised this fallback.

**Real books on port 8773:** all three covers loaded successfully; Search and Table of contents used neutral labels; home contents counts matched the actual source tree at the configured two-level depth. The Linguistics Costello article measured 794.875px at both 1440px and 1920px viewport widths, 696px at 1024px, and 350px at 390px. None of those views overflowed horizontally or repeated the chapter title in the local contents rail. The fixture with only an h1 rendered no local contents rail and had a 700.75px desktop article. Appearance configuration supplies separate cover paths, colours and mastheads; this review does not approve final cover artwork.

**Configured PublicationReader fixture:** the fixture bundled the actual public reader component and used the generated reader stylesheet. It supplied a three-level section tree, two 24-second silent WAV tracks, one chapter without a recording, and explicit canonical character/time spans. It exercised the complete reader integration, not only ListeningPanel.

- Recordings did not autoplay. Closing the panel preserved playback. Changing numeric text size and the line-window setting preserved the same audio instance and its playing state.
- Browser speech paused the recording, and starting the recording cancelled browser speech. These coordination checks used a controlled speech-synthesis stub and real HTML audio; they do not establish audible speech quality or operating-system voice behaviour.
- Follow text created a CSS Highlight at the supplied span without changing article text, and disabling it removed the transient highlight. Next passage sought to the measured eight-second start.
- Next recorded chapter skipped the unrecorded section and changed the actual reader route and article. Selecting the unrecorded section displayed the explicit missing-recording state and disabled Play.
- Returning to a recorded chapter restored its position. Reload restored seven seconds and 1.5× speed without autoplay. Switching book IDs stopped the old recording and restored fresh position/speed for the new book.
- Three-level home contents rendered recursively; changing depth to one and zero limited or removed its entries. A custom Search label appeared.
- Saving a highlight worked with the ruler enabled. A note accepted typing at the selected cursor position and survived reload. These checks exercise annotation integration; they are not a complete annotation/export regression suite.

The completed combined fixture/live-preview run reported no uncaught page errors. Preliminary harness runs needed an audio response advertising byte ranges and a role-based chapter selector; apparent seek/follow failures disappeared after those fixture corrections and are not product findings.

## Inspected evidence and review limits

The review read the correction brief, the actual-source reuse audit, the layout/navigation receipt, the support receipt, the listening receipt, relevant implementation code, and the parent's saved browser evidence. That JSON contains **38 passing checks**, including combined reset and the explicit no-recording state. Its original red baseline and other module checks were inspected or described in receipts, not independently rerun here.

The parent reports 63 passing root Node tests, source comparison covering 515 hashes and 253 answer bodies/order, a passing standalone package verifier, and passing refreshed installed React consumers. Those remain parent-reported checks. The refreshed consumer test changed only its ambiguous Close navigation selector; production was held at the frozen commit. The local branch reference still named the requested commit at the final read.

No full recordings are configured in the real books, so their missing-recording state is expected. Synthetic fixture audio proves integration behaviour, not real audiobook/text alignment. Error/loading/end transitions, denied storage, the full React/package matrix, final artwork acceptance and every support mode were not independently exhausted in this bounded review. No full security or licensing research was undertaken. Previously closed EPUB, Unicode and package findings were not reopened.

The next review should verify these two corrections against its new frozen source and recheck that focus changes preserve playback. No additional finding is asserted within this review's actual scope.
