---
title: Three focused book release closure repairs
date: 2026-10-27
status: repaired-awaiting-independent-review
---

# Three book release closure repairs

The parent applied the three bounded findings directly, following the current instruction to fix small review findings without another builder delegation. Production changes are confined to release build tools; public core source, original book JSON and manuscripts are unchanged.

- Static licence links now reuse `safePublicationHref`, matching the interactive reader. Unsafe licence URLs render no anchor, and unsafe licence metadata is omitted from JSON-LD.
- The previous edition is retained until final manifest publication succeeds. A late write or rename failure invalidates the manifest, quarantines the failed new tree and restores the previous tree. The temporary manifest is prepared before directory promotion. Cleanup occurs after the commit point. The two directory renames are explicitly not a crash-atomic exchange; process interruption can leave recoverable `.previous` and `.incomplete` directories. No crash-atomic claim is made. Recovery failure preserves the previous directory and returns a failure rather than deleting it.
- The Linguistics release projection exposes its already-published CC BY-SA 4.0 grant through the existing home licence/author-note fields. Its reuse paragraph is the preserved about-page paragraph with HTML removed. This also supplies book-level agent licence metadata. Authored section bytes and the canonical JSON remain unchanged.

Three meaningful regressions were added before the fixes: unsafe licence schemes, the Linguistics reuse notice and failure of the final manifest rename. The focused suite failed with exit 1 before repair and passes 17/17 with exit 0 after repair. The late-failure test uses a real Vite fixture and injects EACCES only at the final manifest rename. It verifies the old tree hash is restored and the manifest remains absent. A unique staging suffix prevents a failed run from colliding with an immediate retry.

The application type-check and all three edition builds exit 0. Build output still records uncommitted source, intentionally preventing deployment until the parent freezes the source and rebuilds. Earlier reviewer evidence was not overwritten. New evidence and source hashes are in `evidence-reader-book-release-three-fixes-2026-10-27/`.

No browser, deployment, audible voice or new full root suite was run during this focused repair. A fresh independent security/write-path review is required before deployment.
