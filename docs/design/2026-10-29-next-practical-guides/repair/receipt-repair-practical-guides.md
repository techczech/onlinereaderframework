---
title: Practical guides review repairs
created: 2026-10-29
status: verified-local
---

Restored Developing Competence’s Engagement Types and Accessibility chapters from source content/competencies.ts: six dimensions, 24 level descriptions, original names and wording. The converter now includes these alongside seven theory chapters and records their inclusion in source accounting. Academic Productivity remains seven sections; Developing Competence now has nine.

Updated the existing registry expectation to seven books, retaining assertions for unchanged originals and earlier converted editions. Added a regression test that failed before restoration (4 pass, 1 fail) and passes afterwards. The new check verifies all 24 descriptions in chapter content and generated agent exports.

Content and complete demo integration tests pass 19/19, including all five existing release-isolation checks. Root build and typecheck pass. A new copy of the independent review probe passes chapter navigation, positive search and cross-book negative search, served agent order, EPUB XML and both tables, with all restored chapter paragraphs checked in the EPUB. Existing five title pages and agent text pass. The copied probe initially failed on its hardcoded seven-chapter EPUB expectation; it now derives expected chapter count from book data. Original review files are unchanged. No actual voice, EPUBCheck, screen reader, live release or cover acceptance is claimed.

The initial conversion receipt is retained as historical evidence; its seven-chapter Developing Competence description is superseded here. All original app/Folio sources and concurrent Course Design files remain unchanged. Covers and publication are still pending.

The normal secret-scanning commit check matched five recorded 64-character SHA-256 evidence entries as API keys. These are file hashes, not credentials; extant targets were checked against their recorded digests. Five exact evidence-line fingerprints are allowlisted in .gitleaksignore; original reviewer evidence remains byte-identical and secret scanning remains enabled.
