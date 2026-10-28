---
date: "2026-10-28"
status: "independently reviewed local preview; author feedback pending; not published"
title: "Academic Reading and Readability reviewed reader previews"
kind: "evidence"
created: "2026-10-28T01:54:24Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework"
sources:
  - file: docs/status-two-book-reader-preview-2026-10-28.md
  - file: docs/design/2026-10-28-two-book-conversion/review-integrated-books-closure-2026-10-28.md
---

Academic Reading Framework (Increasing Reading Productivity) and Foundations of Readability now run in the shared reader. Ten and fourteen chapters preserve the original prose and seventeen homepage descriptions, relocated verbatim to chapter introductions. Nine self-contained interactive HTML documents retain the cognition map, two reading diagrams, cramped-text reveal, font adjustment, readability checker and three slide comparisons. Original apps and canonical Folios were read-only. Instructional Videos and Dyslexia were excluded.

## Review links

- Academic Reading: http://100.85.55.122:8773/?book=academic-reading&review=1
- Readability: http://100.85.55.122:8773/?book=readability-foundations&review=1

The Vite preview server is bound only to the authorised Tailscale address on port 8773. The demo middleware supplies the isolated embed CSP; this has been observed in its actual HTTP responses. This does not establish live Cloudflare header delivery. The review parameter hides developer selectors; the ordinary demo retains them. The server is a session preview, not an installed background service.

## Evidence and acceptance

Embed security review and its origin fix are independently clean. Integration review's missing-home-copy, asset traversal/symlink and licence-version findings are independently closed. Final closure reports, hashes and raw failures are in docs/design/2026-10-28-two-book-conversion/. Expanded book accounting passes 70/70; the full integration browser check passed 438/438 before the later prose/copying repairs. Subsequent independent checks cover all seventeen summary paragraphs in book/agent/EPUB output, 122 interaction checks, nine byte-identical interaction rebuilds and hostile copier cases. Root build/types/full unit suite completed with zero reported failures. The final review-parameter rebuild passed; Haiku observed clean homes at 1280 and 390 and retained review mode on Start Reading. Parent inspected the final Academic mobile and Readability desktop screenshots. No real-device, screen-reader, real speech, Firefox/Safari or production-release acceptance claim.

## Limits and remaining work

One slide photograph is a neutral placeholder. Covers unchosen. Academic has no newly assigned licence or final public route; prior direction remains a book under dominiklukes.net. Readability carries source CC BY without an inferred version. Original appendix references remain. Frames follow the operating-system colour scheme rather than a manual reader theme. The cognition map pans horizontally on narrow screens and offers full view and text alternatives. Annotating a chapter reloads its interaction state, as documented in the embed contract.

New-book production planning must copy planned embeds, provide and verify actual hosting headers and settle canonical URLs. The existing edition verifier's ordinary-word accessibility false positive remains unresolved; no final production release check was claimed through the test workaround. No live book or public MIT archive was changed. Before any new public source release, extend manuscript privacy anchors for both books and run the source-export review gates; manuscript files remain excluded from the public allowlist.

Author feedback request: _DTC/onlinereaderframework/2026-10-28-review-academic-reading-and-readability.md. No publication decision collected yet.
