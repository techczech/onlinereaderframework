---
title: Focused closure of source export guards and recovery reporting
date: 2026-10-27
status: repaired-awaiting-independent-review
---

# Final guard corrections

The parent applied these bounded review fixes directly. No runtime reader source or manuscript bytes changed.

## Source exporter

Complete URL tokens, rather than substrings, must equal a specifically reviewed fixture literal before the privacy scanner masks them. Every approved literal is limited to one occurrence unless its existing rule specifies otherwise; additional occurrences, longer paths and other files remain subject to the full scanner. New regression assertions failed before the repair (exit 1) and pass afterwards (exit 0).

Source and destination paths are now checked component by component with lstat and realpath. The script refuses symbolic-link ancestors and leaves before prior-evidence reads, source input/traversal, candidate deletion/materialisation, named archive/manifest/checksum/evidence writes, scratch creation and scratch cleanup. Self-tests verify alias refusal for build, source and all four named output leaves without changing the outside canary. The previous review supplies the red filesystem reproductions; the parent did not rerun those destructive simulations against real outputs.

The full exporter with --online exits 0: isolated npm install, build, exported Node tests and native imports all pass. Every one of the 125 candidate files is byte-identical to the earlier review snapshot. The regenerated compressed archive SHA-256 is 502b7a14a3eb030a34a1038d249b2cd0f50a910a89883f365b2e6b9c29988e0b under Node v26.12.1; the builder used Node v24.22.1. The compressed archive identity changed, not its member bytes. Scratch was removed and no input drift occurred during generation.

## Book recovery message

The final book review found that earlier failures reported the restored good edition as incomplete output. The failure result now names the actual remaining new-build directory, and separately names a retained previous edition if rollback itself fails. The CLI describes the latter as recovery material, explicitly not for deletion. The previous edition is still kept until manifest publication, and failed publications still have no deployable manifest.

The regression covers temporary-manifest write, old-directory rename, new-directory rename, final-manifest rename, and rollback failure. It failed before correction. Evidence logs and exact source hashes are in evidence-reader-release-guard-closures-2026-10-27/. A fresh independent security/write-path re-check is required before publication. No external publication or deployment occurred.

## Checksum evidence serialisation before the local commit

The normal secret scan reported 14 generic-key matches in four checksum snapshots. Each matched value was verified as a SHA-256 digest. Their hash maps were re-encoded as explicit path/digest records, with a round-trip equality assertion for every path and value. Existing evidence readers accept both representations. These evidence files and reader scripts have different serialised bytes after review; recorded hashes and findings are preserved. The normal scanner and commit hooks remain enabled. No production source or public candidate file changed in this formatting step.
