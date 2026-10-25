---
title: Parent handoff for the three reader frontpage designs
register: FOR AGENTS
date: 2026-10-25
status: ownership-released
---

# Parent handoff

- Ownership released: `docs/design/2026-10-25-frontpage-sol/` only.
- Entry: `frontpage-designs-sol-2026-10-25.html`; full rationale/source map: `report-reader-frontpage-designs-2026-10-25.md`.
- Brief: three materially different frontpages; three real books; desktop/phone; current tree; source-faithful book/app middle ground. Parent presents; Dominik chooses before production. Four separate toolbar controls: Listen, Formatting, Assist, Notes.
- Recommendation: Jacket. Alternatives: Reading desk for return visits; Open contents for reference browsing.
- Current title retained for Linguistics. No future essays or new title branded as approved. All covers explicitly provisional in comparison copy.
- 461 focused assertions / 36 combinations; 18 screenshots. Exact IDs/order, tree counts, correct first content destination, two-level configuration, search, expansion, mock dialogues, keyboard comparison, images, no overflow, under 2000px. Maximum 1872px at 360px. No production or root suites.
- Content contract: Markdown JSON blocks compile into one HTML; separate CSS/behaviour/build files. Representative copy edit/restoration verified. Source hash equals current demo snapshot.
- No production/original-app/manuscript edits. No Git, root build, persistent server, publication, deployment, subagent or model call.
- Browser preview transport twice returned `Too many server browser tabs are open. Close one with t3_preview_close, or reuse a tabId from preview_status tabs.` No tab exposed by status; none closed. Followed repository's installed bundled-headless-shell workflow for local file interaction checks. T3 HTML preview/render route available separately.

## Registration boundary

Pending, not attempted. Installed ReportScout `src/catalogue.mjs:addReport` calls Git rev-parse/status/pull/add/commit even with `--in-place`. No no-Git switch exists on this path. Parcel prohibits Git. Do not imply registration completed.

Parent command, when authorised:

```sh
node /Users/dominiklukes/gitrepos/06_apps-utilities/01_desktop-apps/report-scout/scripts/report-scout.mjs add /Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/docs/design/2026-10-25-frontpage-sol/frontpage-designs-sol-2026-10-25.html --in-place --title "Three frontpage designs for the shared book reader" --keywords reader,frontpage,books,design,sol --project onlinereaderframework --source /Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/docs/design/2026-10-25-frontpage-sol/report-reader-frontpage-designs-2026-10-25.md --by sol6.1
```

## Design contract and self-review

- Pattern: visual design exploration/contact sheet; explicit brief overrides simultaneous alternatives with one candidate per tab. Preserve complete alternatives, attached trade-offs, same books and states, recommendation.
- Jacket thesis: paper, large cover and editorial title; contents below; primary reading action next to title. Hover/focus makes actions visible; tree expansion and tab changes expose meaning. Reduced motion respected.
- Desk thesis: restrained original-app controls, small cover, compact masthead; next-page panel opposite contents. Contents-first thesis: narrow book column opposite broad searchable tree.
- Journeys drawn: first visit → start; returning sample → resume/restart; browse → expand/select; title search → clear/empty/select; download/reader toolbar → explicit design notice. All three books in both frame modes.
- Does not settle: production menus, full-text search, recorded audio, actual EPUB generation, saved progress schema, production scroll ownership, final covers/title, final accessibility acceptance.
- Review: same-agent source/brief and prose pass only; no independent review claimed. Verified all copy stays within request; no rewritten manuscript or borrowed AI-coach promises. Renderer consumes canonical Markdown. Final prose preserves count distinctions and provisional status.

## Evidence correction

- Found and fixed: frame height animated for 150ms while a focused screenshot was accepted at 80ms. Reproduced with a failing containment assertion; removed height animation. Final check requires the rendered iframe to fit its stage before accepting a screenshot. All 18 screenshots regenerated. Final settled-height maximum: 1872px, 461 assertions. Earlier 1767/1586 figures are superseded.
