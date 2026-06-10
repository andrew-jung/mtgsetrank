#!/bin/bash
# Compresses card images in-place using sips (macOS built-in).
# Usage:
#   ./scripts/compress_images.sh [quality] [set-code]
#
# Examples:
#   ./scripts/compress_images.sh           # compress all sets at default quality (60)
#   ./scripts/compress_images.sh 40        # compress all sets at quality 40
#   ./scripts/compress_images.sh 60 msh   # compress one set at quality 60

QUALITY="${1:-60}"
SET_CODE="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -n "$SET_CODE" ]; then
  SEARCH_DIR="$ROOT/public/sets/$SET_CODE"
else
  SEARCH_DIR="$ROOT/public/sets"
fi

echo "Compressing JPEGs at quality $QUALITY in $SEARCH_DIR"

before=$(find "$SEARCH_DIR" -name "*.jpg" -exec stat -f%z {} \; | awk '{s+=$1} END {printf "%.1f", s/1024/1024}')

find "$SEARCH_DIR" -name "*.jpg" | while read -r file; do
  sips -s format jpeg -s formatOptions "$QUALITY" "$file" --out "$file" > /dev/null 2>&1
done

after=$(find "$SEARCH_DIR" -name "*.jpg" -exec stat -f%z {} \; | awk '{s+=$1} END {printf "%.1f", s/1024/1024}')

echo "Done. ${before}MB → ${after}MB"
