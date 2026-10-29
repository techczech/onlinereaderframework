# Example book

A small book in the Online Reader Framework reader. Its text is invented demonstration text, written for this repository and released under the MIT licence with the code. Use it to see the reader working, and as a starting point for your own book.

## What it shows

- Chapters inside chapters, and Markdown and HTML sections with headings, lists, a table, a quotation and a footnote.
- The reading settings and assists, notes, bookmarks and read-aloud that every reader has.
- One interactive example, `embeds/line-spacing.html`, placed before its written text version in the chapter "Line spacing: an interactive example".
- An EPUB download (the "Download eBook" button on the front page) and agent files under `dist/agent/`.

## Build and preview

From the repository root, after `npm run setup` and `npm run build`:

```sh
npm run example           # build into examples/reader-example/dist
npm run test:example      # Node checks of the build
npm run example:preview   # http://127.0.0.1:4173/
```

Or inside this folder: `npm run build`, `npm test`, `npm run preview` (`node serve.mjs --port 8080` for another port). The example reads the built package from `../../packages/reader-core`, so rebuild it after you change the package.

`npm run example:no-embeds` (or `npm run build:no-embeds` here) builds the book without the interactive example.

## Files

- `src/example-book.mjs`: the book and the embed registry. The browser entry and the build both read it, so the reader, the EPUB and the agent files show the same text.
- `src/main.jsx`: mounts `PublicationReader`.
- `embeds/line-spacing.html`: the interactive example, one file with inline script and styles and no network access. The build inlines the height helper from `reader-core/embed-child` where the file says `<!-- reader-embed-child -->`.
- `build.mjs`: runs Vite, checks the embed registry, writes the embed, the agent files, `_headers` and `example-build.json`. It writes only inside `dist/`.
- `hosting-headers.mjs`: the response headers for the reader pages and the embed folder.
- `serve.mjs`: a local preview of `dist/` that sends those headers. It listens on 127.0.0.1 only and serves only files inside `dist/`.
- `test-example.mjs`: Node checks of the built files, the headers and the preview server.

## Hosting

`dist/` is a static site. The reader pages and the embed folder need different response headers, and the embed folder's header is what keeps an embed sandboxed when someone opens it directly.

- **Cloudflare Pages:** deploy `dist/` as the root of a site. Cloudflare reads `dist/_headers`. This deployment of the example has not been tested; the live editions use the same policies.
- **Another server:** send the headers in `hosting-headers.mjs` for the same paths. If the site is not at the root of its address, adjust the paths.
- **GitHub Pages or any host that cannot set headers:** deploy the output of `npm run example:no-embeds`. It contains no embed folder, and the chapter shows the text version only.

The page uses relative addresses, so it also works from a sub-folder.
