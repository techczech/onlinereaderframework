#!/bin/zsh
# Runs the sketch's self-test in Playwright's bundled headless shell (not installed Chrome).
# usage: run-visual-preferences-selftest.sh <width> <height> <a|b|c[-dark]> <name>
# Writes only to a temporary folder, prints the console summary, and saves screenshot-<name>.png beside this script.
B=$(command ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell | tail -1)
E=${0:A:h}; T=$(mktemp -d)
python3 -c "
import sys; s=open(sys.argv[1]).read(); t=open(sys.argv[2]).read()
open(sys.argv[3],'w').write(s.replace('</body></html>','<script>'+t+'</script></body></html>'))" "$E/../visual-preferences-options-2026-10-25.html" "$E/probe-visual-preferences-selftest.js" "$T/selftest.html"
"$B" --disable-gpu --no-sandbox --user-data-dir="$T/profile" --hide-scrollbars --window-size=$1,$2 --virtual-time-budget=4000 --enable-logging=stderr --v=0 --screenshot="$E/screenshot-$4.png" "file://$T/selftest.html#$3" 2>&1 | grep -a "CONSOLE" | sed -E 's/^.*CONSOLE:[0-9]+\] "//; s/", source:.*$//'
rm -rf "$T"
