#!/usr/bin/env bash
# Build a clean Chrome Web Store submission ZIP.
# Includes only the files the extension needs at runtime; excludes dev/repo cruft.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(python3 -c 'import json,sys; print(json.load(open("manifest.json"))["version"])')"
OUT_DIR="$ROOT/dist"
OUT_ZIP="$OUT_DIR/pomodoro-extension-v${VERSION}.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_ZIP"

# Strip macOS metadata so it never sneaks into the zip.
find . -name .DS_Store -delete 2>/dev/null || true

INCLUDE=(
  manifest.json
  background.js
  sidepanel.html
  sidepanel.js
  sidepanel.css
  icons
  sounds
)

# Verify each path exists before zipping.
for p in "${INCLUDE[@]}"; do
  [[ -e "$p" ]] || { echo "missing: $p" >&2; exit 1; }
done

# -X strips extra file attributes; -r recurses into icons/ and sounds/.
zip -rX "$OUT_ZIP" "${INCLUDE[@]}" \
  -x '*.DS_Store' '*/.DS_Store' \
  -x 'sounds/*.mp3'  # legacy empty placeholder; remove this line once mp3 assets are intentional

echo
echo "built: $OUT_ZIP"
unzip -l "$OUT_ZIP"
