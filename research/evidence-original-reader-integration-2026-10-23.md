---
title: Original reader reuse and packaging evidence
status: implementation-in-progress
date: 2026-10-23
---

The selected design is the actual Deliberate Practice and Building Your Language Muscle code. The initial architecture review is in `docs/review-original-reader-architecture-2026-10-23.md`. Real-book snapshots retain 21 practice chapters, four Language Muscle groups, nine linguistics themes and 253 answers. Five demo completeness/attribution checks passed during integration. These are not final UI acceptance.

The original Inter, Merriweather and Material Symbols assets are locally bundled. Fontsource's official installation guidance supports importing the precise font weights/styles into a Vite build: https://fontsource.org/docs/getting-started/install . The original Tailwind typography conventions use the official plugin: https://github.com/tailwindlabs/tailwindcss-typography . Installed versions were checked against official npm metadata and the machine's seven-day minimum release age is active.

A compatible demo dependency update reduced the initial audit from 16 findings to eight. The saved audit is `audit-reader-demo-dependencies-2026-10-23.json`. Remaining findings include build-time braces <=3.0.3 and postcss-selector-parser <7.1.6; do not describe this as a clean public-release audit. No forced major migration was performed.

The installed-package verification script will install the actual tarball offline, check package contents, build a consumer without the source alias, and remove installation scratch. Its presence is not evidence of a passing run; record the result after execution.
