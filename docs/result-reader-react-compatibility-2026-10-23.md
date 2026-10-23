---
title: Reader package React compatibility result
date: 2026-10-23
status: passed
scope: Installed reader-core tarball consumers with React 18.3.1 and React 19.2.0
---

# Reader package React compatibility

- **Both React versions pass** normal package installation, host TypeScript checks, native Node import and bundled browser interactions.
- React and ReactDOM peers now declare `^18.3.1 || ^19.2.0`. The core and demo continue to use React 18.
- No production TypeScript changes were needed. The parent retains the app-lock refresh, public README templates and final source audit.

## Installed consumer matrix

Each row uses a fresh installation of the actual tarball. Both rows tested identical package bytes.

| Installed dependency or check | React 18 consumer | React 19 consumer |
| --- | --- | --- |
| React | 18.3.1 | 19.2.0 |
| ReactDOM | 18.3.1 | 19.2.0 |
| `@types/react` | 18.3.27 | 19.2.2 |
| `@types/react-dom` | 18.3.7 | 19.2.2 |
| TypeScript | 5.9.3 | 5.9.3 |
| QRCode | 1.5.4 | 1.5.4 |
| Normal npm peer resolution and `npm ls --all` | Passed. | Passed. |
| Host TypeScript, `strict: true`, `skipLibCheck: false` | Passed. | Passed. |
| Native Node import and browser-only EPUB guard | Passed. | Passed. |
| Vite production bundle and headless browser interaction | Passed. | Passed. |

The original retained package rejected a React 19.2.0 installation with `ERESOLVE`, explicitly requiring `react@^18.3.1`. The prospective broader peers first passed in isolated package copies. The final matrix then passed using the repository manifests with no candidate override.

Installation uses the public npm registry, `--ignore-scripts`, `--min-release-age=7`, `--strict-peer-deps`, `--legacy-peer-deps=false` and `--force=false`. These runs allowed registry access; they do not depend on a claim that an offline cache contains every package.

## APIs and behaviour checked

The TypeScript fixture imports **`PublicationReader`, `PublicationReaderProps`, `PublicationBook` and `PublicationCoaching`** from the installed public entry point. It checks JSX, `React.createElement`, assignment to the host's `ComponentType`, coaching render callbacks and the `epub: false` prop. It also checks **legacy `ReaderShell`, `ReaderProps` and `SectionConfig`**, including headings, feature flags and the home callback. Expected type errors verify that missing required props and an invalid coaching return value remain rejected.

A fresh Node process has no `window`, `document`, `DOMParser` or `XMLSerializer`. It imports the installed package and verifies the `PublicationReader`, `ReaderShell`, `parseMarkdownToSections`, `generateEpub`, `generatePublicationEpub`, `downloadPublicationEpub` and `publicationDisplayTitle` exports. It executes Markdown rendering and title composition. Both new publication EPUB functions reject with their explicit browser-only error.

For **each React version**, the actual production bundle passes these browser interactions:

- The publication reader starts from its home page and renders rich Markdown, a table, bold text and bundled fonts.
- A real DOM text selection creates a highlight. Editing its note survives a page reload.
- The highlight link reaches the real browser clipboard with the correct book, section and quotation.
- Quote sharing generates a PNG with the QRCode dependency and supplies the expected download filename.
- Navigation reaches the second section and survives reload. Page sharing copies that section without a stale quotation.
- Mobile navigation opens and closes at 390 by 844 pixels without horizontal overflow.
- The legacy reader renders and navigates to its second section.

Both browsers report zero page errors, console errors, failed requests, HTTP errors or external requests. The fixture wraps the reader in `React.StrictMode`; the tested output is a production bundle. This check does not exercise React's development-only repeated effects.

The existing standalone-build checks also pass: the original reader CSS remains included, all extracted publication classes remain available, **112 font references** resolve locally, and all three font licence notices are present. Actual tarball exclusions report no issues.

## Runtimes and retained evidence

The run completed at `2026-10-23T13:42:54.712Z` with Node `v26.12.1`, npm `11.20.0`, Vite `7.3.7`, Python `3.11.7`, Playwright `1.64.0` and bundled Chromium headless shell `153.0.8010.12`. No system Chrome was launched. Browser contexts and temporary loopback servers close in `finally`; installation scratch directories are removed in `finally`.

The canonical retained tarball is [`build/reader-core-verified.tgz`](../build/reader-core-verified.tgz). Its SHA-256 is:

```text
a2c233b86004d6fe3144626d38fa64aa5e999ce490a6639d5541a8b03c1a86fd
```

The canonical package metadata identifies **React 19.2.0** as its test host and records this same hash. Each version also retains its own tarball, package metadata, browser evidence, screenshots and logs:

- [The combined matrix evidence](../build/evidence-reader-react-compatibility.json) records both hosts and their matching tarball hashes.
- [The React 18 package evidence](../build/evidence-reader-package-react-18.3.1.json) and [React 19 package evidence](../build/evidence-reader-package-react-19.2.0.json) record exact installed versions and host type checks.
- [The React 18 browser evidence](../build/reader-react-18.3.1-browser/evidence-reader-react-browser.json) and [React 19 browser evidence](../build/reader-react-19.2.0-browser/evidence-reader-react-browser.json) record the exercised interactions and browser runtime.
- [The original peer-resolution failure](../build/log-reader-react19-original-peer-resolution.txt) records the unsupported starting state.
- [The scope verification](../build/evidence-reader-react-compatibility-scope.json) records peer-only changes, frozen artefact preservation and scratch cleanup.

These generated files remain in the existing ignored `build/` directory. Reproduce the matrix from the repository root with:

```sh
node scripts/check-reader-react-compatibility.mjs --online
```

The runner uses the existing sibling `book-engine/.venv/bin/python`. `--python /absolute/path/to/python` selects another interpreter that already has Playwright. A single host can be checked with `node scripts/verify-reader-package.mjs --react-version 19.2.0 --online`; omitting the version retains the React 18.3.1 default. Browser and consumer sources remain separate template files.

## Ownership and remaining work

Only the peer ranges changed in the core manifest and lockfile; reversing those two values reproduces their starting checksums exactly. Installed core and demo React/ReactDOM remain 18.3.1. QRCode remains pinned to 1.5.4. This task made no production source edits, Git mutations, pushes, deployments or secret configuration reads.

All **four files in the frozen `build/review-e1bd378/` artefact** retain their starting bytes. Concurrent edits to `publication-html.ts` and the two original-reader browser/headless test files were preserved. The successful final matrix tested the resulting package; it does not close the parent's final source audit or repeat the earlier complete EPUB review.

Ownership is released for the core peer metadata, package verifier, consumer templates, compatibility checks and this report. The parent can continue the app-lock refresh, public README templates and final source audit.
