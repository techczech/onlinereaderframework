---
title: Reader heading roles and conservative table reviews
register: FOR AGENTS
date: 2026-10-29
---

# Heading roles

Map semantic roles explicitly. Section: grouping in book.sections with recursive children. Chapter: routable reading unit with its own title and content. Local heading: retained within chapter content and exposed in On this page; do not promote every manuscript heading to a chapter. Preserve original IDs and bind compatibility.anchorOwners to actual HTML id attributes, never data attributes. Preserve empty topics and source order. Czech Navigator has 22 units and 1230 actual anchors; these counts describe this edition, not framework defaults.

# Table reviews

Default to faithful source rendering. Retain cell text, order, spans and uncertain header associations. Shape alone cannot establish linguistic row or column meaning. Reviewed annotations must bind exact table identity, dimensions, cell coordinates, text, tags, spans, identity column and header relationships. The runtime validator rejects incomplete bindings, unsafe or colliding namespaces and mismatched headers before attaching transformations. Consult table-surface.ts and source/annotations in the Czech candidate for the actual schema.

Advertise sorting, filtering, column selection and transposition only for validated reviewed tables. Keep the identity column and at least one context column visible. Reset restores source order and text. Merged or unreviewed tables retain faithful browsing, search and focus without inferred transforms. Czech Navigator currently has 20 reviewed transform tables and 288 faithful tables. This is a scoped annotation decision, not a claim that all source header relationships are known.

# Build and publication

When rebuilding is authorised: semantic generation, served exports, then Vite. EPUB regeneration changes ZIP hashes. For an already reviewed build, freeze source and every dist asset and compare with independent review hashes before publishing; do not rebuild solely to publish. Keep semantic review evidence outside public output. Preserve noindex policy and original credits/licence.
