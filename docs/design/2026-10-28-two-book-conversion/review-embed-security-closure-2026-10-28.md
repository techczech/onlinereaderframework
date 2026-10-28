---
title: Independent closure review of interactive embed URL authority
date: 2026-10-28
status: clean within repair scope
register: FOR AGENTS
---

# Verdict

**CLEAN — original P2 closed. No actionable findings in the reviewed repair.** Ownership released to parent. No action required from Dominik.

Scope: fresh independent re-review of the two-file repair described in `repair-embed-base-2026-10-28.md`, against the finding in `review-embed-security-2026-10-28.md` and updated `embed-contract.md`. No Git operations or revision comparison. Acceptance applies to exact source SHA-256 values below.

# Boundary and correction

Original source: a host-controlled HTML base element, on a host without the release base restriction. Original path: `document.baseURI` → resolver → iframe `src` and full-view `href`. The old origin comparison trusted the supplied base's origin, so a foreign base changed both targets. Manuscript sanitisation and release CSP were counterevidence against broader attacker reach; neither is needed for the corrected component boundary.

Current `packages/reader-core/src/embed/PublicationEmbedFrame.tsx:22–23`: actual `window.location.href` supplies authority; `typeof window` guards SSR. Both sinks receive the resulting absolute URL. Foreign and same-origin document bases cannot influence this URL.

Current `packages/reader-core/src/embed/embed-model.ts:138–149`: documented `pageURL` parameter; validated relative root/path; HTTP(S) only; origin, root containment, credentials, query and fragment checks retained. Caller supplies actual page location; the pure resolver does not itself discover browser location. Contract §3 agrees with this division.

Reviewed source hashes:

```text
d6a6458862c19b07d4e44982542d8712e1654743220138ddd9b909aabc857f13  packages/reader-core/src/embed/PublicationEmbedFrame.tsx
716a538c01830179fd3de26d8320317f269e3bcc10fcc2c13321cbb463b157ad  packages/reader-core/src/embed/embed-model.ts
19df5097f7909a88910d97b8816fc488a84a416ba4d2a89be97e604bafd44f61  docs/design/2026-10-28-two-book-conversion/embed-contract.md
```

Both production hashes match the parent's repair receipt and stayed identical before/after this run. Thirteen other production-source hashes match the previous independent review evidence; their exact values are recorded in the new evidence. In-memory reversal of the component's added comment, guard and resolver argument reproduces its previously reviewed hash `73b7f4c3834e7b2b8c1c702fc96e041205fceb63522350f132b5797f7ff1d839`. No production file was reverted or edited.

# Fresh verification

Command, from repository root:

```sh
node docs/design/2026-10-28-two-book-conversion/review-embed-security-closure-probe-2026-10-28.mjs
```

Driver exit: **0**. Bundled `chrome-headless-shell`, Chromium **153.0.8010.12**, headless; isolated loopback HTTP servers; no live service.

- Core TypeScript no-emit: exit **0**.
- Existing units, scratch relocated: **7/7**, exit **0**.
- Existing browser checks, scratch relocated: **70/70**, exit **0**.
- Independent SSR: actual `PublicationEmbedFrame` bundled for Node, rendered through React server renderer with neither `window` nor `document`; empty markup without exception, exit **0**.
- Independent edge checks: **37/37**, exit **0**. Includes the original 16 checks plus 21 URL-authority assertions; counts overlap the prior review and are not cumulative coverage.

New cases exercise real renderer frame/link targets under `/edition/` with a same-origin base relocating to `/relocated/`, a foreign-origin base relocating paths, an actual filename URL with query/hash, and an actual directory URL with query/hash. Both targets remain at the actual page folder's `embeds/good.html`; exact reader URL remains unchanged, including `sourceorigin` and fragment. External `sourceorigin` values do not become resource authority. Pure-function cases separately check supplied origin, encoded page dot-segment normalisation, subpath handling, and omission of page query/hash from the asset URL.

The original foreign-base frame and full-view assertions both pass. Foreign server request ledger: **[]**, explicitly asserted empty. Host pages in the added base cases deliberately lack CSP, so the URL checks establish component behaviour independently of release `base-uri` enforcement.

Existing focused browser checks retain sandbox, height-message validation, prose, keyboard and full-view isolation coverage. SSR and URL tests used synthetic fixtures; no book data was changed. Existing three books receive no new integration acceptance claim. Concurrent new-book assets/incomplete integration excluded.

# Evidence and preservation

New reproducible driver: `review-embed-security-closure-probe-2026-10-28.mjs`.

- SHA-256: `928de487079e1b736a2fa6ee640934813f4a96f124e73645aa71929517930ac5`.
- Derived from the parent's copied driver; adds independent SSR and URL cases, records pre-run hashes, changes only its own evidence destination.

New complete stdout/stderr, per-command exits, assertions and source hashes: `evidence-review-embed-security-closure-2026-10-28.json`.

- SHA-256: `c84c87153589e9e504a8e45412ec529927832c272e1320a3e261c59c14657fa5`.
- Scratch inside the owning review folder, removed in `finally`; `scratchRemoved: true`.

Earlier drivers, reports and outputs preserved. Original corrected-review evidence still hashes to `8d55a8b8159f6544ee906019e3ef401cec4addac01ac93dc0970a28f79417d08`; original supplemental prose evidence still hashes to `f1398c3865ce332872c009c48d4d445c2c4ad6e323aa9da4941ece825b7b4fbb`, matching the earlier review report.

# Limit

**Live Cloudflare acceptance remains owed later.** Local harness enforcement does not establish deployed header matching/detachment or actual production response headers. No deployment, publication, production write, Git operation, other agent, package installation or source-data edit performed. Only this closure report, its new driver and its new evidence belong to this review.
