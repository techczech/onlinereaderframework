# Interactive embeds

A book can show a self-contained interactive HTML document (a diagram, a simulator) inside a chapter. The host application registers it; the chapter text cannot.

- **Manuscript side.** The section content contains the readable alternative as one block element with an `id`, for example `<div id="explorer-text">…full explanation…</div>`. That prose is the canonical text: search, notes, read-aloud, reading assist, EPUB and the agent Markdown files carry it unchanged. The content sanitiser still removes `iframe`, `script`, `style`, `data-*` and event attributes.
- **Host side.** `PublicationReader` receives `embeds={{ root: 'embeds/', items: [{ id, sectionId, anchor, src, title, caption?, height?, resize? }] }}`. In the live reader each valid item becomes a frame placed just before its anchor, with a visible title, a "Skip to text version" link and an "Open full view" link. Invalid items are dropped with a console warning; the prose still shows.
- **Check at build time.** `checkPublicationEmbeds(book, embeds)` returns problems: invalid descriptors, missing sections or anchors, or an alternative shorter than 80 characters.

## Security model

- `src` is a relative path of plain segments under `root`, ending `.html`. At run time it must resolve on the page's own origin inside the root folder. Remote, `data:`, `blob:` and `javascript:` addresses are refused.
- Frames are `sandbox="allow-scripts"` only, with no same-origin access, popups, top navigation, forms, modals or downloads. `allow` denies camera, microphone, geolocation, display capture, payment, USB, fullscreen, autoplay and clipboard. `referrerpolicy="no-referrer"`.
- Serve the embed folder with `Content-Security-Policy: sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'`. The `sandbox` directive keeps the document in an opaque origin even when it is opened directly as a full view, and it still holds if the frame attribute is ever weakened.
- The only message the reader accepts is `{ type: 'reader-embed:height', version: 1, height }`. It must come from that frame's own window with origin `"null"`. The height is clamped to the descriptor's bounds. The reader sends nothing to the frame.

## Writing an embed document

Make one HTML file with all script and CSS inline and no network requests. Do not rely on storage, cookies, popups or dialogs. It must work at 320 px wide and from the keyboard. To size the frame to its content, bundle `startReaderEmbedHeightReporting` from `reader-core/embed-child`.
