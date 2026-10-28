#!/bin/sh
# Rebuild and check both converted books from the read-only original sources. Run from the repository root.
# Scratch output stays in .scratch-two-book/ (deleted at the end); evidence is written to docs/design/2026-10-28-two-book-conversion/evidence/.
set -u
ROOT=$(pwd); B=apps/reader-demo/src/books/next-books/build-source; TSX=apps/reader-demo/node_modules/.bin/tsx
S=.scratch-two-book; EV=docs/design/2026-10-28-two-book-conversion/evidence
ACADEMIC=/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/academic-reading-framework
READABILITY=/Users/dominiklukes/worktrees/guides/readability-foundations
FOLIO=/Users/dominiklukes/gitrepos/02_writing-creation/writing/books/web-published
mkdir -p "$S" "$EV" apps/reader-demo/interactives
LOG="$EV/command-log.txt"; : > "$LOG"
step() { name=$1; shift; "$@" >"$S/step.out" 2>&1; code=$?; tail -3 "$S/step.out" | cut -c1-300 | sed "s/^/    /" >> "$S/step.tail"; printf '%s\texit %s\t%s\n' "$name" "$code" "$*" >> "$LOG"; echo "$name: exit $code"; }
: > "$S/step.tail"
step render-academic-and-diagrams  $TSX $B/build-academic.tsx "$ACADEMIC" "$S"
step convert-readability-sections  $TSX $B/build-readability.tsx "$READABILITY" "$S"
step assemble-books-and-manifest   $TSX $B/assemble.ts "$S"
step build-embeds                  $TSX $B/build-embeds.tsx "$READABILITY" "$S" apps/reader-demo/interactives
step render-original-sections      $TSX $B/render-originals.tsx "$ACADEMIC" "$READABILITY" "$S/originals-text.json"
step render-original-states        $TSX $B/oracle-states.tsx "$READABILITY" "$S/oracle-states.json"
step check-books                   $TSX $B/check-books.ts "$S" "$EV/books-check-report.json"
step check-embeds-in-chrome        node $B/check-embeds.mjs apps/reader-demo/interactives "$S" "$EV/browser-check-report.json"
step compare-folio                 $TSX $B/compare-folio.ts "$FOLIO" "$EV/folio-differences.json"
step provenance                    $TSX $B/build-provenance.ts "$S"
cat "$LOG"
