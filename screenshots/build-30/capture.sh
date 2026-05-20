#!/bin/bash
# capture.sh — capture the same surface on iPhone 17 Pro Max + iPad Pro 13"
# at the same instant. Run from any terminal while both simulators are
# booted and showing the screen you want to capture.
#
# Usage:  ./capture.sh <slug>
# Slugs:  01-sign-in  02-resolve-hub  03-scoring  04-workspace
#         05-market-pulse  06-profile
#
# The script saves to:
#   screenshots/build-30/iPhone-17-Pro-Max/<slug>.png
#   screenshots/build-30/iPad-Pro-13/<slug>.png
#
# If both simulators are showing different surfaces (which is normal —
# you'll navigate on each independently), you can also pass --iphone-only
# or --ipad-only to capture just one side:
#
#   ./capture.sh 02-resolve-hub --iphone-only
#
set -e

IPHONE_UDID="1F50240B-BF5C-4421-8DF5-1877840DA121"
IPAD_UDID="318AE3D5-A0A5-481E-87F6-35A10600CF15"

SLUG="${1:-}"
if [ -z "$SLUG" ]; then
  echo "Usage: $0 <slug> [--iphone-only|--ipad-only]"
  echo "Slugs: 01-sign-in 02-resolve-hub 03-scoring 04-workspace 05-market-pulse 06-profile"
  exit 1
fi

OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IPHONE_OUT="$OUT_DIR/iPhone-17-Pro-Max/$SLUG.png"
IPAD_OUT="$OUT_DIR/iPad-Pro-13/$SLUG.png"

case "${2:-}" in
  --iphone-only)
    xcrun simctl io "$IPHONE_UDID" screenshot "$IPHONE_OUT"
    echo "✓ iPhone: $IPHONE_OUT"
    ;;
  --ipad-only)
    xcrun simctl io "$IPAD_UDID" screenshot "$IPAD_OUT"
    echo "✓ iPad:   $IPAD_OUT"
    ;;
  *)
    xcrun simctl io "$IPHONE_UDID" screenshot "$IPHONE_OUT"
    xcrun simctl io "$IPAD_UDID"   screenshot "$IPAD_OUT"
    echo "✓ iPhone: $IPHONE_OUT"
    echo "✓ iPad:   $IPAD_OUT"
    ;;
esac
