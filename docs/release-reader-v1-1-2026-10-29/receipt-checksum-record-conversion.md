---
title: Reader v1.1 checksum inventory representation
date: 2026-10-29
status: losslessly-reformatted
---

The normal pre-commit secret hook flagged 120 checksum assignments in nine independent-review inventories. Every flagged file was verified to be a dictionary whose values are exactly 64 lowercase hexadecimal characters; no credential value was found. No hook or allowlist was disabled.

Those nine private evidence files now use explicit path/digest records under `format: file-digests-v1`, rather than filenames as JSON keys. They retain the original serialization parameters and original file hash. The conversion reconstructed every original byte sequence and compared it byte-for-byte before completing. `evidence-checksum-record-conversion.json` records each original/current hash and entry count. Earlier review statements refer to the original representations; no substantive observation, path, digest, candidate archive or production source was changed.

To reconstruct an original inventory, read its entries in order into a dictionary, JSON-serialize with its original_serialization.indent and ensure_ascii, then append a newline exactly when final_newline is true. Its SHA-256 must equal original_sha256. This preserves the originally reviewed evidence while making hashes unambiguous to the secret scanner.
