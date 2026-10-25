#!/bin/zsh
# Screenshots the sketch in Playwright's bundled headless shell (never installed Chrome).
# usage: run-frontpage-shot.sh <width> <height> <state hash, e.g. a-linguistics-desktop-first> <name> [probe.js]
# With a probe, its console lines are printed. Writes screenshot-<name>.png beside this script; temporary files are removed.
B=$(command ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell | tail -1)
E=${0:A:h}; T=$(mktemp -d)
python3 -c "
import sys; s=open(sys.argv[1]).read(); t=open(sys.argv[2]).read() if len(sys.argv)>4 and sys.argv[4] else ''
open(sys.argv[3],'w').write(s.replace('</body></html>','<script>'+t+'</script></body></html>'))" "$E/../frontpage-designs-opus-2026-10-25.html" "${5:-/dev/null}" "$T/s.html" "${5:-}"
"$B" --disable-gpu --no-sandbox --user-data-dir="$T/profile" --hide-scrollbars --window-size=$1,$2 --virtual-time-budget=3000 --enable-logging=stderr --v=0 --screenshot="$E/screenshot-$4.png" "file://$T/s.html#$3" 2>&1 | grep -a "CONSOLE" | sed -E 's/^.*CONSOLE:[0-9]+\] "//; s/", source:.*$//'
rm -rf "$T"
