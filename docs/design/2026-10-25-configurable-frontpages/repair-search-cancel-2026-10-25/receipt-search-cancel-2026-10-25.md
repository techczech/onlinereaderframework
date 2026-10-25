---
title: Receipt — pending Search focus request cancelled when navigation closes
date: 2026-10-25
register: FOR AGENTS
---
Finding: closure review P2 (close-reopen revives pending Search focus). Owner changed: `packages/reader-core/src/original/Sidebar.tsx` only (focus effect, ~l.120–140).
Fix: effect cleanup now cancels the frame and consumes the request via `finish()` (idempotent, `done` guard). Closing nav (isOpen false), book change or unmount ends the request; a cancelled run cannot call the handler again, so it cannot clear a newer request. Fresh request after close restarts the effect normally. No API/dependency change; ReaderLayout/use-publication-reader unchanged.
Probe: `probe-search-cancel.py <label>` — start Search with input focus refused, close nav, restore focus, put focus on the toggle, reopen via toggle, 1440 and 390 px; then two fresh Search requests must focus the input.
- before (pre-fix dist): `results-before.json` pass=false, focus stolen at both widths.
- after (rebuilt dist): `results-after.json` pass=true, no steal, fresh requests focus input x2 at both widths, no page errors.
Commands: build exit 0 (build.log); tsc --noEmit reader-core exit 0; node --test frontpage + original-reader exit 0 (test.log); probe exit 0.
Sidebar.tsx sha256 after: c5c480340710f6d8313d587041ef9d342fdb042c668559d73f4b1a8b73ec17a7
probe sha256: 7e7d9e045009b7d31e4f3deace892a00ee3cea0d6c75bb31f4dddf0b8cddf0ff
Not rerun: closure probe guards (dialog/editable/exhaustion/book-change) — closure evidence left untouched; unmount cleanup and old-callback guard by source only.
