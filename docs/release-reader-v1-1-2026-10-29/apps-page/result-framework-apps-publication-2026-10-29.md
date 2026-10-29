---
title: Online Reader Framework published on the personal Apps page
date: 2026-10-29
status: published-and-live-verified
---

The Online Reader Framework v1.1 listing is live on [Apps](https://dominiklukes.net/apps/#app-online-reader-framework), with its [own detail page](https://dominiklukes.net/apps/online-reader-framework/). It sits under Web apps, identifies the software as a React framework and MIT release, and links to the project site and GitHub source. Its existing Resources record is retained. Copy follows the already published framework README/release description and existing resource description; no new product capability is claimed.

The website source change is only one added entry in src/content/apps.json, commit 80e56524ffe72d7545f7cb89c57e7c93dd00c4f2, pushed to main. Existing app records are unchanged. The build was generated from a Git archive of that committed source, with the installed locked dependencies reused; none of the concurrent uncommitted editorial redesign was included. The snapshot was removed after build/test, and the staged deployment output was removed after successful live verification.

The build passes. All 1,086 checks across the existing Apps, record-page, export, search, agent-layer and dead-link suites pass. Their browser checks use the committed helper's bundled chrome-headless-shell. Source and response evidence are in build-verification.json, tests.log and live-verification.json. The public Apps page, new record and apps-data.json each match the tested build byte-for-byte. No new tests or interface changes were added for this content-only update.

Production deployment: https://ded85a0f.dominiklukes-net.pages.dev/ . The live Apps URL is registered in the estate catalogue and added to the main site's deployment record. No framework source/tag, book text or book-reader functionality changed. No screenshot was invented; the listing uses the existing book icon. No additional visual or screen-reader acceptance is claimed.
