---
title: Interactive HTML embed contract (reader-core)
date: 2026-10-28
status: contract v1 — implementation built, independent security review owed
owner: reader-core embed seam (implementation sub-agent); content integrator follows this file
---

# Interactive HTML embed contract, v1

FOR AGENTS. Stable API for placing an author's local, self-contained interactive HTML (a diagram, a simulator) inside a reader chapter. Content integrators follow this file; do not change the API without updating it.

## Principle

- Manuscript HTML stays untrusted. The sanitiser is unchanged: `iframe`, `script`, `style`, `data-*` and event attributes are still stripped from section content.
- The host (application code passing `PublicationReader` props) registers each embed. A manuscript can only *contain the prose alternative*; it can never define, load or configure a frame.
- The prose alternative is ordinary section content. Search, notes/highlights, read-aloud, reading assist, EPUB, agent Markdown/llms files and static pages therefore carry the prose automatically and never the frame. No export code changes.
- In the live reader only, the frame is inserted immediately before the prose alternative's anchor element.

## 1. Manuscript side (section content)

Write the prose alternative as one element with an authored `id`. Any allowed block element works; recommended:

```html
<div id="cognition-explorer-text">
  <p><strong>Text version of the interactive diagram.</strong> …full equivalent explanation: every node, every relationship…</p>
</div>
```

Markdown sections may embed this HTML block (Markdown-it runs with `html: true`, then the sanitiser).

Rules:
- `id` must be unique in the section and match `^[A-Za-z][A-Za-z0-9_-]{0,63}$`. The sanitiser prefixes it to `reader-content-<id>`; the descriptor uses the authored id (the prefixed form is also accepted).
- The anchor's visible text is the canonical alternative and must convey the interaction's teaching content, not its UI labels ("Click a node" is not an alternative). `checkPublicationEmbeds` refuses anchors under 80 characters of text.
- Optionally wrap the long prose in `<details><summary>…</summary>…</details>`; still searchable and spoken.
- If an online full view should be reachable from EPUB/agent outputs, write an ordinary `https://` link to the embed's public address in the prose. The framework adds none.

## 2. Host side (descriptor)

```ts
import { PublicationReader, type PublicationEmbeds } from 'reader-core';

const embeds: PublicationEmbeds = {
  root: 'embeds/',                       // default 'embeds/'; relative folder under the page's folder (or under `base`)
  base: '/books/a-book/',                // optional (added 28 Oct, release of the two converted books): absolute edition folder on the page's origin
  items: [{
    id: 'cognition-explorer',            // ^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$ ; unique
    sectionId: 'cognition',              // a section of this book
    anchor: 'cognition-explorer-text',   // authored id of the prose alternative in that section
    src: 'cognition-explorer/index.html',// path under root; see §3
    title: 'Cognition Explorer: interactive diagram of reading processes', // iframe accessible name, 3–200 chars
    caption: 'Select a node to see how it relates to the others.',            // optional, ≤ 300 chars, plain text
    height: { initial: 560, min: 320, max: 1400 },  // optional CSS px; defaults 480 / 240 / 1600, clamped to 120–4000
    resize: true,                        // optional, default true: accept height messages (§5)
  }],
};

<PublicationReader book={book} embeds={embeds} />
```

`embeds` is also accepted as `false` (off). An invalid `base` refuses the whole registry, as an invalid `root` does. Invalid descriptors are dropped individually (reason logged once with `console.warn`); the prose alternative still renders. Strings are rendered as text only, never as HTML.

Build-time check (call from the book's test or release script; returns problem strings, empty when sound):

```ts
import { checkPublicationEmbeds } from 'reader-core';
const problems = checkPublicationEmbeds(book, embeds);   // descriptor validity, section exists, anchor exists once, anchor text ≥ 80 chars
```

## 3. Resource URL constraints

- `root`: relative, segments of `[A-Za-z0-9][A-Za-z0-9._-]*`, ending `/`. No scheme, host, leading `/`, `.`/`..`, `%`, `\`, query or fragment.
- `src`: 1–8 segments of the same pattern, last segment ends `.html`; same refusals; ≤ 200 chars.
- At runtime the URL is resolved against `window.location.href` (never `document.baseURI`); it must stay on the page's origin and inside the resolved root path, else refused.
- `base` (optional): `/` or `/seg/…/` (same segment rules, at most 8, ending `/`). When set, `root` resolves below `base` on the page's own origin instead of below the page's folder, so a chapter address or a slash-less edition address still reaches the edition's embeds. `base` never names a host; origin still comes from `window.location.href`. A folder release (`/books/<name>/`) sets it to Vite's `BASE_URL`; the demo leaves it unset.
- So: only local files shipped with the edition. No remote origins, no `data:`/`blob:`/`javascript:`.

## 4. Frame policy (fixed by the framework, not configurable)

- `sandbox="allow-scripts"` only. Never `allow-same-origin` (the frame gets an opaque origin: no access to the reader's DOM, cookies, localStorage notes or highlights). No `allow-popups`, `allow-top-navigation*`, `allow-forms`, `allow-modals`, `allow-downloads`, `allow-pointer-lock`, `allow-presentation`.
- `allow` denies camera, microphone, geolocation, display-capture, payment, usb, fullscreen, autoplay, clipboard-read, clipboard-write.
- `referrerpolicy="no-referrer"`, `loading="lazy"`, `title` = descriptor title.
- Chrome around the frame (`figure[data-publication-embed]`): visible title, optional caption, "Skip to text version" link (jumps to the anchor), "Open full view" link (`target="_blank" rel="noopener noreferrer"`).
- That chrome is skipped by the reader text model, so search hits, saved highlights, read-aloud and assist alignment use the canonical prose only.
- Width 100% of the text column; height = message-reported content height clamped to `[min, max]`, otherwise `initial`. On phones the frame stays full column width; the full-view link is the escape when the content needs more room. No fixed tiny frame.
- The frame reloads when its chapter's HTML changes (a highlight added or removed in that chapter). Last reported height is kept, so layout does not jump. Interaction state inside the embed is not preserved across that reload.

## 5. Embed document requirements

Each `src` is one self-contained HTML document:
- All script and CSS inline (for a Vite/React build use a single-file build, e.g. inline-everything plugin). Reason: the frame's opaque origin makes `<script type="module" src>` and `crossorigin` requests CORS requests with `Origin: null`, which a static host refuses. Inline `<script type="module">` is fine.
- Images/fonts inline as `data:` or omitted. No network requests at all (`fetch`, XHR, WebSocket, remote fonts/images, analytics).
- Must not rely on `localStorage`/`sessionStorage`/cookies (unavailable or throw in an opaque origin — wrap in try/catch if a library touches them), `window.open`, `alert/confirm/prompt`, form submission, top navigation or fullscreen.
- Responsive down to 320 px wide; keyboard-operable (every control focusable, visible focus, Enter/Space activate); respect `prefers-color-scheme` and `prefers-reduced-motion`.
- Optional height reporting — bundle the helper:

```ts
import { startReaderEmbedHeightReporting } from 'reader-core/embed-child';
const stop = startReaderEmbedHeightReporting();  // ResizeObserver on documentElement; posts at most once per animation frame
```

or post the message yourself: `parent.postMessage({ type: 'reader-embed:height', version: 1, height: <CSS px number> }, '*')`. Payload carries only a number; `'*'` is safe because nothing secret is sent and the sender cannot know the parent's origin from an opaque origin.

Host-side validation of messages: `event.source` must be that frame's own `contentWindow`; `event.origin` must be `"null"` (sandboxed, opaque); data must be a plain object with exactly these keys, `type`/`version` exact, `height` a finite number 0–100000; result clamped to `[min, max]`; ignored if within 2 px of current. One listener per mounted frame, removed on unmount. The host never sends messages into the frame and exposes no API to it.

## 6. Serving headers (release)

The site-wide release policy (`frame-ancestors 'none'`, `X-Frame-Options: DENY`, `script-src 'self'`) would block embeds. A release with embeds must emit a rule for the embed root (Cloudflare Pages `_headers` syntax), produced by `securityHeaders({ embedRoot: 'embeds/' })` in `apps/reader-demo/scripts/release/headers.ts`:

```
/embeds/*
  ! Content-Security-Policy
  ! X-Frame-Options
  Content-Security-Policy: sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'
```

The CSP `sandbox allow-scripts` directive keeps "Open full view" (top-level, same origin URL) in an opaque origin too, so a full-view tab cannot read the reader's stored notes. Without embeds `securityHeaders()` output is byte-identical to v1.

The reader page's own CSP already allows same-origin frames (`default-src 'self'` covers `frame-src`).

## 7. Stable exports

- `reader-core`: types `PublicationEmbed`, `PublicationEmbeds` (with optional `base`); `PublicationReaderProps.embeds`; functions `checkPublicationEmbeds`, `validatePublicationEmbeds`, `resolvePublicationEmbedUrl(path, root, pageURL, editionBase?)`, `readPublicationEmbedHeight`; constants `PUBLICATION_EMBED_SANDBOX`, `PUBLICATION_EMBED_ALLOW`, `PUBLICATION_EMBED_MESSAGE_TYPE`.
- `reader-core/embed-child`: `startReaderEmbedHeightReporting`, `postReaderEmbedHeight`.

## Out of scope for v1

- Host → embed messages (theme, preferences), embed state persistence, remote origins, multiple frames per anchor, embeds on the home page.
- Adding new files to the public source projection allowlist: integration step, see the receipt. Release copying of embed files is implemented for the two converted books (docs/release-two-books-2026-10-28/), with folder-scoped `_headers` rules: `securityHeaders({ base, embedRoot })` writes `<base>embeds/<book>/*`.
