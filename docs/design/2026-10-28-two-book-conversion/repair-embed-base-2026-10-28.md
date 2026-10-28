---
title: Repair of interactive embed origin selection
date: 2026-10-28
status: independent re-review owed
---

The reviewer reproduced a foreign HTML base element redirecting both the frame and full-view link. The parent reproduced the same two failures before editing production; the existing seven unit checks and seventy browser checks still passed in that red run.

PublicationEmbedFrame now resolves resources from window.location.href, independently of document.baseURI. The pure resolver argument is named pageURL and documented accordingly. Relative edition roots remain relative to the actual page folder. Raw manuscript sanitisation, sandbox rules, message validation and release headers are unchanged. The embed contract now states the actual location authority.

The review probe was copied with only its evidence destination changed, retaining the reviewer’s original source and evidence. The copy has a selectable result filename so red and green evidence remain separate. The before evidence records core types, units and baseline browser exit zero, and independent edge checks exit one with the two origin failures.

Production source hashes after the repair:

- packages/reader-core/src/embed/PublicationEmbedFrame.tsx: `d6a6458862c19b07d4e44982542d8712e1654743220138ddd9b909aabc857f13`
- packages/reader-core/src/embed/embed-model.ts: `716a538c01830179fd3de26d8320317f269e3bcc10fcc2c13321cbb463b157ad`

Green verification: the copied review driver exited 0. Core TypeScript, 7 unit tests, 70 existing browser checks and all 16 independent edge checks passed. Both foreign-base frame/link targets now use the actual page origin; the foreign server request ledger is empty. Scratch was removed. Independent re-review remains owed. No live site or deployment changed.
