---
title: Agent access, anchored reading, collapsible outline and quiet chapter rows
status: implemented locally, not deployed
updated: 2026-10-25
---

# What changed

Four features, all in the framework (`packages/reader-core`), not only the demo.

## 1. Collapsible "On this page"

- Desktop rail: the heading is the control (`<h4><button aria-expanded aria-controls>`). Folded, the rail shrinks to a 2.25rem icon button and the reading layout gives the width back (`data-collapsed` on the nav, `:has()` in `reader-original.css`). The compact outline for narrow windows was already a collapsible disclosure and is unchanged.
- The choice is a view preference per book: `publication-reader:<book id>:outline:v1` (`outline-preference.ts`). Blocked storage keeps the choice for the visit.
- Escape inside the open outline folds it and returns focus to the toggle. `N` unfolds a folded outline and moves into it; when the rail is not on screen it still falls back to the compact outline.
- Heading tracking, the URL fragment, `aria-current` and the chapter text are untouched by folding (the tracking effects do not depend on the fold).

## 2. Chapter rows, not boxes

`frontpage/frontpage.css` only. Chapter entries in all six layouts and the classic home's contents are rows with a hairline under them; hover and keyboard focus add a faint accent tint (and an inset 2px bar on hover); the last-opened chapter has an accent bar and its "Last opened" label. The Search map layout's group tiles lose their border, radius and fill and keep a rule above. The focus outline stays (drawn inside the row). Order, labels (Contents / Full contents), read ticks and column flow are unchanged.

## 3. Anchored reading (from WriteFlex)

Source (read-only, inspected 2026-10-25, `writeflex-desktop` at `cd75e8cb`):

| WriteFlex file | Reused |
| --- | --- |
| `editor/sentences.ts` | `leadLength`, copied unchanged (letters-only ramp: ≤3 → 1, ≤6 → 2, ≤9 → 3, else ⌈35 %⌉) |
| `editor/anchored-reading.ts` | the `\S+` word walk and `min(leadLength(token), token.length)` lead span |
| `editor/focus-modes.ts` | `normaliseLeadStyle` with the `contrast` default; the CSS rules for contrast and colour |

Local changes: no CodeMirror windowing or edit mapping (the text is read-only), so the marks are CSS Custom Highlight ranges over the reader's canonical text model (`publicationTextModel`), the same one search, notes and read-aloud use. No text node is wrapped or split, so selection, notes, MathML and speech positions are unaffected. WriteFlex's third style, **bold**, is left out: a highlight cannot set `font-weight`, and the only way to get it is to wrap text nodes. Code, `pre`, `kbd`, `samp`, MathML and `[data-reading-support-ignore]` are not emphasised, matching the reading surface's own ignore list.

Contrast softens the rest of each eligible word with a second highlight (`publication-anchored-rest`, priority −1, over the remainder of each word) instead of recolouring the paragraph, so MathML, code, `kbd`, `samp`, `pre` and `[data-reading-support-ignore]` keep exactly the colour they inherit or the author set; Off removes both highlights and leaves no style on the text. It is an independent switch in Assist (not part of the Paragraph / Line window / Ruler group), with a Contrast / Colour choice, stored per book (`anchored`, `leadStyle` in the reading-support preferences). "Turn all off" clears it and the overlay and leaves formatting alone. Where `CSS.highlights` is missing the switch is disabled with an explanation and nothing is shown as active. The highlight is registered at priority −1 so read-aloud's own highlights sit on top; the two can run together.

## 4. Agent access

### Files (`agent-export/`, generated from the `PublicationBook` the reader displays)

```
llms.txt                              one line per book
agent/<book>/index.md                 title, author, licence, counts, every section in order with file + reader link
agent/<book>/full.md                  the whole book
agent/<book>/manifest.json            schema online-reader-framework/agent-book@1: ids, order, depth, parent, path, format, file, readerUrl, words, characters, counts
agent/<book>/chapters/<id>.md         one file per section (front matter + text)
```

- Ids become path segments with `agentSegment`: letters, digits, `_` and `-` stay; anything else becomes `~<hex>~`. Distinct ids never collide, `.` and `/` can never form `..`, and nothing needs URL encoding. Empty, `home`, duplicate or over-long ids throw.
- Markdown sections are the author's own bytes (code, maths, footnotes, tables, image links, attribution lines), with no trimming: trailing newlines and spaces are kept, and the title heading, front matter and separators sit outside the source string. HTML sections are written as the reader's sanitised HTML (`renderPublicationContent`), so structure is kept, not flattened. A `# Title` is added only when the text does not already start with one. Parent sections with no text list their children.
- Links are relative to the file (works under any host or sub-path). `siteUrl` makes them absolute for a deployment. Reader links use the reader's own `?book=&section=` form (`readerLink`, tested equal to `publicationUrl`).
- Only declared book fields are read. There is no browser state, note, highlight or path in the input, and the tests scan the output for `/Users/` and storage names.
- Output is confined to the build folder; the demo script refuses any other target and writes only `dist/agent` and `dist/llms.txt` (it replaces the demo's earlier hand-built `llms.txt` in the build output; `public/llms.txt` is untouched).

### Module contract

- `reader-core` (main barrel): `PublicationAgentAccess`, `agentBookLinks`, `agentSegment`, `readerLink`, `isPrivateHost`, `canonicalSiteUrl`, `agentPrompt`, `agentAttachedPrompt`, `agentExamples`, `AGENT_DIRECTORY` (pure, DOM-free).
- `reader-core/agent` (new export, build-time): `buildAgentBook(book, { siteUrl?, directory? })`. `directory` is validated by `agentDirectory` in both generators before any file path exists: one or more relative segments of letters, digits, `.`, `_`, `-` (`agent`, `static/agent`); `.` segments and a trailing `/` are dropped; absolute paths, `..`, empty segments, backslashes, `%`, `:`/schemes, control characters, non-strings and an empty result throw. Reader links gain one `../` per directory segment. Host writers still check containment themselves → `{ bookId, files: {path, content}[], manifest }`; `buildAgentRootIndex(exports, { siteUrl?, title?, summary? })` → the `llms.txt` file.
- `PublicationReader` takes `agent?: { path?: string }` (default off, `path` default `agent/`). The reader links to files the host generated; it contains no AI client, key or chat service.

### Host integration

```ts
import { buildAgentBook, buildAgentRootIndex } from 'reader-core/agent';
const exports = books.map(book => buildAgentBook(book, { siteUrl: process.env.READER_SITE_URL }));
const files = [buildAgentRootIndex(exports, { siteUrl, title }), ...exports.flatMap(e => e.files)];
// write each file under your build output; `apps/reader-demo/scripts/build-agent-files.ts` is the reference (path confinement included)
```
and render `<PublicationReader book={book} agent={{ path: `${import.meta.env.BASE_URL}agent/` }} />`. The demo's `npm run build` runs the script after `vite build`.

### The box ("Ask an agent to help you read this")

Follows the dominiklukes.net Ask box (heading, a short paste-able prompt, Copy, example prompts; inspected in `01_dlwebs/dlnet` `Hero.astro` and `lib/agent/builders.ts`). It is added for this book: the prompt names the book and its real index and full-text addresses and asks for chapter citations; on a chapter the prompt names that chapter's file. It sits above the footer on all six front pages and the classic home, and as a folded line under each chapter.

Superseded in part by `docs/design/2026-10-25-web-agent-box/README.md`: the box is now a compact panel built for the public web, and a private address is no longer explained in the page. The rules that still hold: addresses are resolved in the browser from where the page is served, a private address is never put in a prompt as if a hosted assistant could fetch it, and there are no provider links or preselected paid assistants.

# Verification (2026-10-25, local build served on 127.0.0.1:8773)

| Command (from the repo root unless stated) | Result |
| --- | --- |
| `npm run build` (core, demo, then `build-agent-files.ts`) | exit 0; 305 agent files |
| `npm test` (publication content 23, agent export 10, original reader 96, books 5) | all pass |
| `book-engine/.venv/bin/python docs/design/2026-10-25-outline-anchored-agent/check-outline-anchored-agent.py` | 362 checks, 0 failures (`evidence-check-outline-anchored-agent.log`) |
| `node packages/reader-core/src/original/frontpage/test-frontpage-browser.mjs` | 279 checks, no failures |
| `test-reading-support-browser.mjs`, `test-toolbar-repair-browser.mjs` | PASS (30/30) |
| `npm run verify:package` | packed consumer builds; new `reader-core/agent` export imports under Node |

The browser check covers: fold, unfold, `N`, Escape, focus return, URL fragment and marker for all three books at 1280 and 1440, compact outline at 390; chapter rows in all six layouts on all three books at 1440 and 390, light and dark (order and count equal to the book, no radius, border or outer shadow, no clipped title, no overflow); anchored lead-ins equal to the WriteFlex ramp, markup and text unchanged, MathML skipped, selection text intact, per-book storage, Turn all off, unsupported-browser fallback; the agent files fetched over plain HTTP (every ordered section id, non-empty text, verbatim Markdown, no private paths); and the box on all six layouts plus classic, for all three books, on a public-looking host and on a private address, plus the folded chapter version.
Screenshots: `screens/`. Not covered: a real sub-path build, and speech running together with anchored reading (no audible voice was used; only highlight priority was checked).

# Limits

- Production agent URLs are not claimed live; nothing was deployed. `READER_SITE_URL` is the switch for absolute links at deployment time.
- Same-book reader routes (`#/chapter`, `#/chapter#heading`, `?section=chapter`) in `html` sections are rewritten to the exported chapter file (`<id>.md` from a chapter file, `chapters/<id>.md` from `full.md`; absolute when `siteUrl` is set). A route to the book's start goes to `index.md`; other books' routes, citations, in-page `#fragment` links and code samples are left as written. A route to a chapter that does not exist is left as written and listed in `manifest.json` `unresolvedLinks`. Markdown sections keep their own bytes: their reader routes are listed in a short note after the section text (not inside it).
- Anchored reading paints every word of the open chapter (about 800 ranges for a typical chapter, measured at build time of the check); very long chapters are not windowed as WriteFlex's editor is.
- A sub-path deployment was verified by resolving every generated link under a `/sub/` base (unit test) and by the reader's use of `BASE_URL`; no sub-path build of the reader itself was run.

# Review owed

New cross-repo contract (agent files, `reader-core/agent` export) and a new preference seam (`anchored`, `leadStyle`, outline fold): independent review is owed by the parent after implementation.
