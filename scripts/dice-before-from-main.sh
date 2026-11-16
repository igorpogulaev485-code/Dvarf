#!/usr/bin/env bash
# Honest sheet-2014-before-* from origin/main (no dice FAB).
# Writes: $DICE_SHOT_DIR/sheet-2014-before-{1440,390}.png
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WT="${DICE_MAIN_WORKTREE:-/tmp/dvarf-main-dice-before}"
OUT="${DICE_SHOT_DIR:-/opt/cursor/artifacts/dice-v1}"
PORT="${DICE_BEFORE_PORT:-5185}"
BRANCH_FE="$ROOT/frontend"

mkdir -p "$OUT"

if [[ ! -d "$WT/.git" && ! -f "$WT/.git" ]]; then
  git -C "$ROOT" fetch origin main
  git -C "$ROOT" worktree add "$WT" origin/main
fi

# Temporary baseline preview (not committed to main).
mkdir -p "$WT/frontend/src/pages"
cat >"$WT/frontend/src/pages/PlayDeskBaselinePreviewPage.tsx" <<'EOF'
import { useState } from 'react'
import { MinimalSheetEditor } from '../features/characters/MinimalSheetEditor'
import { sampleClassic2014Character } from '../features/classicSheet/sampleClassicCharacter'
import type { CharacterDetail } from '../shared/api/characters'

export function PlayDeskBaselinePreviewPage() {
  const [character, setCharacter] = useState<CharacterDetail>(() => ({
    ...sampleClassic2014Character,
    id: 'preview-baseline-2014',
    rules_edition: '2014',
    name: 'Торин Камнебород',
  }))

  return (
    <main className="page page--app" data-testid="play-desk-baseline-preview">
      <MinimalSheetEditor
        key={character.id}
        character={character}
        onSaved={setCharacter}
        onToast={() => undefined}
      />
    </main>
  )
}
EOF

if ! grep -q 'PlayDeskBaselinePreviewPage' "$WT/frontend/src/App.tsx"; then
  # shellcheck disable=SC2016
  python3 - <<'PY'
from pathlib import Path
p = Path("/tmp/dvarf-main-dice-before/frontend/src/App.tsx")
text = p.read_text()
needle = "import { ClassicSheetPreviewPage } from './pages/ClassicSheetPreviewPage'\n"
insert = needle + "import { PlayDeskBaselinePreviewPage } from './pages/PlayDeskBaselinePreviewPage'\n"
if "PlayDeskBaselinePreviewPage" not in text:
    text = text.replace(needle, insert, 1)
route_needle = '            <Route path="/dev/classic-sheet-preview" element={<ClassicSheetPreviewPage />} />\n'
route_insert = route_needle + '''            <Route
              path="/dev/play-desk-baseline-preview"
              element={<PlayDeskBaselinePreviewPage />}
            />
'''
if "/dev/play-desk-baseline-preview" not in text:
    text = text.replace(route_needle, route_insert, 1)
p.write_text(text)
print("wired App.tsx")
else:
    print("App.tsx already wired")
PY
fi

if [[ ! -d "$WT/frontend/node_modules" ]]; then
  ln -s "$BRANCH_FE/node_modules" "$WT/frontend/node_modules"
fi

# Kill stale server on PORT
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
fi

cd "$WT/frontend"
npm run dev -- --host 127.0.0.1 --port "$PORT" >/tmp/dice-before-vite.log 2>&1 &
VITE_PID=$!
trap 'kill "$VITE_PID" 2>/dev/null || true' EXIT

for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${PORT}/dev/play-desk-baseline-preview" >/dev/null; then
    break
  fi
  sleep 1
done

cd "$BRANCH_FE"
DICE_SHOT_DIR="$OUT" DICE_E2E_BASE="http://127.0.0.1:${PORT}" \
  npx playwright test --config=playwright.dice.config.ts e2e/dice-before-from-main.spec.ts

echo "Before shots → $OUT/sheet-2014-before-*.png"
