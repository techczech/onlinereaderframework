---
title: Reader v1.1 example source and preview boundary repairs
date: 2026-10-29
status: repaired-candidate-awaiting-independent-closure
register: FOR DOMINIK
---

# Both reviewed boundaries repaired

The parent repaired the two P2 findings from `review/findings-independent-release-review.md`. No publication, commit, tag or live-site change occurred in this repair round.

The example build checks every embed source component below its real example directory, refuses a linked leaf or directory, opens the leaf with O_NOFOLLOW and requires a regular file. It reads those validated sources before replacing any previous dist output. The existing descriptor/path checks and output guards are retained.

The preview resolver now requires a real directory root with its canonical path unchanged, including all ancestor components. Startup resolves its build metadata through that guarded resolver before reading it, so a linked root, ancestor or metadata leaf is refused. Every request checks the root again, so replacing it with a link after startup gives 404 instead of outside bytes. No public interface, allowlist, privacy exception, dependency or CSP changed in these repairs.

## Red and green

Three regression tests were added to the existing example test file. The unfixed run (`repair-boundaries-red.log`) exits 1: the existing seven tests pass and all three new tests fail. The source link copies the canary, the preview root resolves outside, and replacing the root after startup returns 200 rather than 404. The corrected run (`repair-boundaries-green.log`) exits 0, 10/10. Both linked leaf and linked-directory build cases pass the refusal checks, keep the previous dist sentinel and emit no embed output. The root tests also cover a linked ancestor and metadata file.

An initial parent invocation used the wrong working directory when adding the tests; no test file was changed then. The original seven-test green output is kept separately as `repair-boundaries-baseline-before-added-tests.log`. The actual red run above followed the corrected edit.

The full exporter exits 0 (`repair-export-green.log`): privacy self-tests, linked and isolated package build/native imports, actual locked offline core/example installs, all exported Node tests and both example modes succeed. The new ten-check example suite passes in both isolated modes. `repair-example-browser.json` and its log record 56/56 bundled-headless checks, exit 0, with the corrected preview server. Existing reviewer and builder evidence is unchanged.

## Exact corrected candidate

Archive SHA-256: 479728473301002b3fc6ad5da09166bc0f30653a805bb2abc0eb1ac51e05c390.
Uncompressed tar SHA-256: a24e3d2054bee50b879fc0570c951f07e35a00dbafd183e9d4c9c18c5ff5790f.
Only the three repaired example members and their derived provenance hashes differ from the previous 146-file candidate.
146 files; saved manifest `manifest-reader-v1-1-boundary-repaired.json`. Three repaired source hashes are explicit records in `hashes-reader-v1-1-boundary-repaired.json`. The saved exporter evidence redacts only the owning repository's absolute path, not outcomes.

The previous reviewed archive and its three companion metadata files are preserved under `build/retired-reader-v1-1-before-boundary-repairs/`, with its original bef6d91e…0274502 hash checked. The v1.0 archive/checkout are untouched.

## Limits and next step

This remains a dirty-source candidate; commit and regenerate only after independent closure. The checks prove static-link refusal and the tested post-start root replacement, not race-atomic protection against simultaneous local filesystem changes between checks and reads. The full private root suite was not repeated because only the three example files changed; the exported full suite and relevant browser checks were repeated. Browser/voice/EPUBCheck limits from the original receipt remain.

The parent requests a fresh focused independent review of these repairs and the exact corrected projection. Publication remains authorised and continues after clean review; no decision is needed from Dominik.
