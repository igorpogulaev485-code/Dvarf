#!/usr/bin/env bash
# Render mobile kit boards (1280×720) to JPG via Chrome headless.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT_PNG="$ROOT/out"
OUT_JPG="$(cd "$ROOT/.." && pwd)"
HTML="file://${ROOT}/boards.html"
mkdir -p "$OUT_PNG"

BOARDS=(catalog shell nav-vitals sheets scenes identity abilities create-lobby death)

for id in "${BOARDS[@]}"; do
  png="dvarf-mobile-kit-${id}.png"
  jpg="dvarf-mobile-kit-${id}.jpg"
  target="${OUT_PNG}/${png}"
  rm -f "$target"
  echo "→ $id"
  UD="$(mktemp -d /tmp/chrome-kit-XXXXXX)"
  # Chrome often hangs after --screenshot; kill once file appears.
  google-chrome --headless=new --no-sandbox --disable-gpu \
    --disable-dev-shm-usage --hide-scrollbars \
    --user-data-dir="$UD" \
    --window-size=1280,720 \
    --screenshot="$target" \
    "${HTML}?board=${id}" >/tmp/chrome-kit-render.log 2>&1 &
  CHROME_PID=$!
  ok=0
  for _ in $(seq 1 90); do
    if [[ -s "$target" ]]; then
      # give a moment to finish writing
      sleep 0.4
      ok=1
      break
    fi
    if ! kill -0 "$CHROME_PID" 2>/dev/null; then
      break
    fi
    sleep 1
  done
  kill "$CHROME_PID" 2>/dev/null || true
  wait "$CHROME_PID" 2>/dev/null || true
  pkill -9 -f "user-data-dir=${UD}" 2>/dev/null || true
  rm -rf "$UD"
  if [[ ! -s "$target" ]]; then
    echo "FAILED: no screenshot for $id"
    tail -30 /tmp/chrome-kit-render.log
    exit 1
  fi
  python3 - <<PY
from PIL import Image
img = Image.open("${target}").convert("RGB")
img.save("${OUT_JPG}/${jpg}", "JPEG", quality=88, optimize=True)
print("  wrote ${OUT_JPG}/${jpg}", img.size)
PY
done

ls -la "$OUT_JPG"/dvarf-mobile-kit-*.jpg
