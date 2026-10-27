---
title: Final review of the three book release closure repairs
date: 2026-10-27
reviewer: Claude Opus 5.5 (independent; did not write the repairs)
status: one-finding
---

# Final review of the three book release closure repairs

**Result: two of the three repairs are closed. The late-failure rollback keeps the previous edition safe in every failure point I injected, but its failure message names the restored previous edition as the "incomplete output". An operator or agent who cleans up that folder deletes the only good edition.** This is a one-line fix in `build-edition.ts`. The deploy gate still refuses all three editions because the source is uncommitted, as it must.

This review answers `docs/receipt-reader-book-release-three-fixes-2026-10-27.md` and checks it against the three findings of `docs/review-reader-book-release-closure-2026-10-27.md`. I changed only this report and the new folder `docs/evidence-review-reader-book-release-final-2026-10-27/`. My probe scratch lived in `build/review-final-probe/` and is removed. No production edits, Git changes, credentials, network, deployment, browser or other agents were used. The source release exporter (`scripts/prepare-reader-source-release.mjs`, also changed since the closure review) is under separate review and excluded here. The earlier evidence folder is byte-identical before and after this review (`prior-closure-evidence-hashes-before.txt`).

Reviewed source, by SHA-256 (matching the receipt's `manifest-three-fixes-source.json`):

| File | SHA-256 |
|---|---|
| `apps/reader-demo/scripts/release/build-edition.ts` | `699e492d…e2e3193` |
| `apps/reader-demo/scripts/release/static-pages.ts` | `deeb3e44…d744cb` |
| `apps/reader-demo/scripts/release/projection.ts` | `b3955cde…b525b544` |
| `apps/reader-demo/scripts/release/test-release-write.ts` | `cfa47ea3…f880de` |
| `apps/reader-demo/scripts/release/test-release-repair.ts` | `2578937a…9edd` |

Full hashes are in `reviewed-source-sha256.txt`. Apart from the excluded exporter, these five are the only files under `apps/`, `packages/`, `scripts/`, `package.json` and `LICENSE` modified after the closure review was written.

## Finding

### P2 — After a promotion failure, the message names the restored previous edition as the leftover incomplete output

**Where:** `apps/reader-demo/scripts/release/build-edition.ts:154` returns `quarantine: newMoved ? staging : folder`. The release command prints that path at `apps/reader-demo/scripts/build-release.ts:32` as `NOT BUILT; no manifest written; incomplete output left in <path>`.

When the failure happens before the new tree reaches the edition path, `newMoved` is false. The new tree is still in `.incomplete-<book>-<stamp>/`, and the edition path holds the restored previous edition. The code reports the edition path. Three of the four promotion steps fail this way: writing the temporary manifest, moving the previous edition aside, and moving staging into place. Only the final manifest rename, the case the parent's regression covers, reports the right folder.

**Reproduction:** from `apps/reader-demo`, run `npx tsx --test ../../docs/evidence-review-reader-book-release-final-2026-10-27/probe-late-failures.mts`. The recorded run (`probe-late-failures.log`) exits **1**. For each of the three cases it prints, for example:

```
[staging moved into place] failures=["could not publish the edition: injected rename EACCES"] quarantine=language-muscle listing=[".incomplete-language-muscle-…","language-muscle"]
AssertionError: quarantine reported as the restored previous edition (staging moved into place)
```

The CLI would print `incomplete output left in build/release-books/language-muscle`. That folder is the previous edition, byte-identical to before the run. Deleting it as instructed loses the only built copy. The release tools then have no edition for that book until a rebuild succeeds.

A related misreport occurs when recovery itself fails. With the manifest rename and the reverse rename both failing, the new tree stays at the edition path and the previous edition stays in `.previous-<book>-<stamp>/`. The result reports the non-existent staging path, and nothing names the `.previous-…` folder that holds the good edition. The `recovery needs attention` line does warn the operator, so this half is lower risk.

**Required repair:** report the folder that actually holds the new tree. That is `staging` whenever the reverse rename ran or was never needed, and `folder` only when the new tree was moved in and could not be moved back. When recovery fails with the previous edition still aside, also name the `.previous-…` folder. Extend the parent's late-failure test to the three earlier promotion steps and assert the reported path. No other behaviour needs to change.

## The data-safety requirements hold

Each case in `probe-late-failures.mts` builds a real edition in an owned fake repository, injects one failure into the second build, and checks the result. **In all four promotion failure points the previous tree hash is restored, no manifest exists, `verify:release` refuses, the new tree is kept under its `.incomplete-…` name, no temporary manifest or `.previous-…` folder is left, and a sentinel outside the release folder is untouched.** The only failing assertion is the reported path above.

- **Recovery failure:** both trees are kept, the previous edition's bytes are intact in `.previous-…`, no manifest is written, and verification refuses. A later successful rerun treats the stuck new tree as its previous edition and deletes only that. The original `.previous-…` folder survives. A stale `.language-muscle.manifest.json.tmp-…` file is left. Its name is not a manifest name, so nothing deploys it.
- **Cleanup failure after the commit point:** the edition and its manifest are published, and the undeletable `.previous-…` is retained with a log line. This matches the receipt.
- **First build with no previous edition, failing at the manifest rename:** no edition folder and no manifest are left, and the new tree is kept in staging.

**Links and paths outside the release folder:** every create, rename, write and delete in the success and failure paths, including the recovery block at `build-edition.ts:138–153` and the cleanup at `:158`, calls `assertReleasePath` first. That guard refuses symbolic links anywhere from `build/` down. `hashEdition` refuses symbolic links inside a tree. `rmSync` runs only on the uniquely stamped `.previous-…` folder. The rerun of the earlier closure probe passes its symlink guard cases (`probe-closure-rerun.log`). I found no path by which failure handling follows a link or deletes outside `build/release-books/`.

**The earlier probe's two failing cases are not new defects.** The copied probe (`probe-closure-rerun.mts`, rerun unchanged apart from its output folder) exits **1**:

- `manifest-failure` fails only on `assert.ok(error)`, because `buildEdition` now returns `ok: false` instead of throwing. Its own observation (`manifest-failure-result.json`) shows the substantive requirement is met: old and current tree hash `1555c6a2…ec6150` are equal, no manifest exists, and no `.previous-…` folder is left.
- `promotion-gap` fails on the known limit: between the two renames the edition path is absent. The code comment (`build-edition.ts:8`) and the receipt both state this. Neither claims an atomic exchange. Thrown errors at that point are rolled back, as the probe above shows. As briefed, I do not report this again.

## Static licence links: closed

`static-pages.ts:35` renders the licence anchor only when `safePublicationHref` accepts the address, and `:86` omits the JSON-LD licence on the same condition. Both use the same function as the two interactive render sites (`Home.tsx:66`, `frontpage/layouts.tsx:127`). The root page, section pages and standalone pages all use the one `licence()` helper.

`probe-licence-href.mts` pushes 14 addresses through the root, section, standalone and head output. It includes tab- and newline-split `javascript:`, leading spaces and control characters, mixed case, `vbscript:`, `data:`, `file:`, an entity-encoded colon and attribute-breaking quotes. **No unsafe protocol and no attribute break reaches any output** (`probe-licence-href.log`, exit **0**). The guard uses the WHATWG URL parser, which strips the same characters browsers strip. Disguised schemes are therefore judged as a browser would read them. Deliberate Practice and Language Muscle tree hashes are unchanged from the closure review (`2d172711…2981758`, `43dc0d7e…1cc60`), so the fix did not change their output.

## Linguistics book-wide licence: closed

The projection (`projection.ts:33–37`) sets, for Linguistics only, `home.license` to CC BY-SA 4.0 and `home.authorNote` to the "Licence and reuse" paragraph of the preserved about page. That page is pinned by hash `a1401727…1c69e23`. I extracted the paragraph from it and compared it word for word: **the note is that paragraph with its one link removed**, including "including to train AI models, with attribution". The canonical book JSON is unchanged (`git diff --quiet` exit 0). The repair test checks that section bytes are unchanged.

In the current Linguistics edition (tree `6ccd8765…39f4e2b3`):

- The static root shows the licence link and the full grant, and its JSON-LD carries the licence.
- The reader bundle carries both, for the interactive home footer.
- `llms.txt`, `agent/linguistics/index.md`, `manifest.json` and `full.md` carry the CC BY-SA 4.0 label and link. They do not carry the training sentence. The closure finding asked for the licence field there, so this meets it.

The rerun of the root-notice audit (`root-notice-rerun.log`, exit **0**) confirms a licence link and the training permission on the root. It also confirms that all 253 answers keep their original link, question credit and Stack Exchange licence notice.

**Licence separation holds.** Each answer page now ends with a book-level "Licence: CC BY-SA 4.0" line after the answer's own notice. For 243 answers that notice is CC BY-SA 3.0. The previous site had exactly this arrangement: its answer pages showed the answer's CC BY-SA 3.0 notice and a footer granting CC BY-SA 4.0 for the book. The author's own text explains it ("Each answer page shows the licence the answer carries on Stack Exchange"). The earlier audit's strict one-licence-per-page check failed on this footer. My copy restricts that check to the answer text, a change marked in the script. **No edition file outside the JavaScript bundles mentions MIT.** The framework's MIT licence is not presented as covering any book.

## Standards and gate checks

| Check | Command | Exit |
|---|---|---|
| Release suite | `npm run test:release` (in `apps/reader-demo`) | 0, 17/17 (`test-release.log`) |
| Type check | `npm run check` | 0 (`app-check.log`) |
| Late-failure probe | `npx tsx --test …/probe-late-failures.mts` | 1, finding above |
| Licence href probe | `npx tsx …/probe-licence-href.mts` | 0 |
| Earlier closure probe, copied | `apps/reader-demo/node_modules/.bin/tsx …/probe-closure-rerun.mts` | 1, both cases explained above |
| Root-notice audit, copied | `python3 -I …/audit-preservation-rerun.py --assert-root-notice` (repository root) | 0 |
| Deploy gate | `npm run verify:release -- --book <each>` | 1 for all three (`deploy-gate-verify.log`) |

**The deploy gate refuses all three editions, and the only reason it gives is uncommitted source:** `FAIL built from uncommitted source (sourceTreeDirty is not false)`, with 35 uncommitted changes. That refusal must stand. It clears only after the parent commits the source and rebuilds, and the rebuilt manifests should be checked again then. The edition hashes I observed are in `edition-manifests-observed.txt`.

## Not a finding: residual note

`packages/reader-core/src/agent-export/agent-export.ts:105` copies the licence address into the Markdown and JSON agent files without the URL check. Those files are served as text, not HTML, all three books use `https` addresses, and this file was outside the change. I mention it so the same check can be added if agent files are ever rendered as HTML.
