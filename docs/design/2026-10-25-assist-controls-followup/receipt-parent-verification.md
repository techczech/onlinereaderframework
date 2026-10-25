---
title: Parent verification of compact controls, theme and assistance
register: FOR DOMINIK
date: 2026-10-25
status: verified-for-local-preview
---

The coordinating session ran the focused nested-content regression against the final sources with a distinct result label:

`RESULT_LABEL=parent-verified-nested node docs/design/2026-10-25-assist-controls-followup/probe-nested-own-text.mjs`

Exit 0; 63 checks passed, no page errors. Results are in `parent-verified-nested-results.json`. The checks exercise Light, Medium and Dark, independent parent lead/child/tail targets, keyboard order, line-window targeting, and preservation of authored markup, live nodes, text, MathML and selection.

Earlier independent closure closed heading targeting, note shading, tooltip interaction and the font-corrected layout gate, leaving the nested-parent variant. The final targeted repair is verified here rather than commissioning another broad review. The builder reports the unchanged closure probe passing 31/31 and the build and focused gates passing; those were not all repeated by the coordinating session.

Evidence caveat: the builder accidentally overwrote four failing reviewer outputs with passing runs. The original review text and failing log remain, and the overwrite is documented in `fix-nested-own-text-receipt.md`; no claim is made that the overwritten screenshots or JSON retain their original failing state.

Limits: bare own text needs the CSS Highlight API for Paragraph dimming without changing markup. The final probe uses bundled headless Chromium, not a physical device or screen reader. No manuscript, original ReadFlex or original WriteFlex source was changed. No public push or deployment occurred.
