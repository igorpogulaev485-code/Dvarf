#!/usr/bin/env bash
# Refuse to deploy a tree that is missing contours already on Timeweb prod,
# or that is not a descendant of the declared prod tip (anti-overwrite).
# Machine locks are loaded from docs/FEATURE_LOCK.md — edit that file to add
# a non-wipeable feature; do not only hardcode markers here.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${DVARF_SKIP_PREFLIGHT:-}" == "1" ]]; then
  echo "preflight: SKIPPED (DVARF_SKIP_PREFLIGHT=1) — only with explicit Игорь ok" >&2
  exit 0
fi

MISSING=0
require() {
  local path="$1"
  local why="$2"
  if [[ ! -e "$ROOT/$path" ]]; then
    echo "MISSING: $path  ($why)" >&2
    MISSING=1
  else
    echo "ok: $path"
  fi
}

require_grep() {
  local path="$1"
  local pattern="$2"
  local why="$3"
  if [[ ! -f "$ROOT/$path" ]]; then
    echo "MISSING: $path  ($why)" >&2
    MISSING=1
    return
  fi
  if ! grep -qE "$pattern" "$ROOT/$path"; then
    echo "FAIL: $path missing /$pattern/  ($why)" >&2
    MISSING=1
  else
    echo "ok: $path ~ $pattern"
  fi
}

echo "=== Dvarf prod preflight (anti-overwrite) ==="
echo "tree: $ROOT"
echo

# ---------------------------------------------------------------------------
# 0) Tip ancestry — MUST contain current prod tip (hard gate)
# ---------------------------------------------------------------------------
TIP_FILE="$ROOT/deploy/prod-tip"
if [[ ! -f "$TIP_FILE" ]]; then
  echo "MISSING: deploy/prod-tip (declared prod tip branch)" >&2
  MISSING=1
else
  TIP_BRANCH="$(grep -vE '^\s*(#|$)' "$TIP_FILE" | head -n1 | tr -d '[:space:]')"
  echo "declared prod tip: $TIP_BRANCH"
  if [[ -z "$TIP_BRANCH" ]]; then
    echo "FAIL: deploy/prod-tip is empty" >&2
    MISSING=1
  elif [[ ! -d "$ROOT/.git" ]]; then
    echo "WARN: no .git in tree — tip ancestry check skipped (markers still required)" >&2
  else
    TIP_REF=""
    for cand in "origin/$TIP_BRANCH" "$TIP_BRANCH"; do
      if git rev-parse --verify "$cand" >/dev/null 2>&1; then
        TIP_REF="$cand"
        break
      fi
    done
    if [[ -z "$TIP_REF" ]]; then
      echo "FAIL: tip ref not found locally: $TIP_BRANCH (or origin/$TIP_BRANCH)" >&2
      echo "      run: git fetch origin $TIP_BRANCH" >&2
      MISSING=1
    else
      TIP_SHA="$(git rev-parse "$TIP_REF")"
      HEAD_SHA="$(git rev-parse HEAD)"
      echo "tip:  $TIP_REF ($TIP_SHA)"
      echo "HEAD: $HEAD_SHA ($(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo detached))"
      if git merge-base --is-ancestor "$TIP_SHA" "$HEAD_SHA"; then
        echo "ok: HEAD is descendant of (or equal to) prod tip"
      else
        echo "FAIL: HEAD does NOT contain prod tip $TIP_BRANCH" >&2
        echo "      Deploying this tree would overwrite tip features on Timeweb." >&2
        echo "      Merge tip first:" >&2
        echo "        git fetch origin $TIP_BRANCH" >&2
        echo "        git merge origin/$TIP_BRANCH" >&2
        echo "      Do NOT deploy an older parallel lineage (this already wiped mobile)." >&2
        MISSING=1
      fi
    fi
  fi
fi
echo

# ---------------------------------------------------------------------------
# 1) Machine locks from docs/FEATURE_LOCK.md
# ---------------------------------------------------------------------------
LOCK_FILE="$ROOT/docs/FEATURE_LOCK.md"
if [[ ! -f "$LOCK_FILE" ]]; then
  echo "MISSING: docs/FEATURE_LOCK.md (feature lock registry)" >&2
  MISSING=1
else
  echo "=== FEATURE_LOCK machine rows ==="
  # Parse markdown table rows after the "Machine locks" heading until next "## ".
  python3 - "$LOCK_FILE" <<'PY' || MISSING=1
import re, sys
from pathlib import Path

root = Path(".").resolve()
text = Path(sys.argv[1]).read_text(encoding="utf-8")
m = re.search(r"## Machine locks \(preflight\)\n(.*?)(?:\n## |\Z)", text, re.S)
if not m:
    print("FAIL: FEATURE_LOCK.md missing '## Machine locks (preflight)' section", file=sys.stderr)
    sys.exit(1)
section = m.group(1)
rows = []
for line in section.splitlines():
    if not line.startswith("|"):
        continue
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if len(cells) < 4:
        continue
    kind, path, pattern, label = cells[0], cells[1], cells[2], cells[3]
    if kind in ("kind", "------") or kind.startswith("-"):
        continue
    rows.append((kind, path, pattern, label))

if not rows:
    print("FAIL: no machine lock rows parsed from FEATURE_LOCK.md", file=sys.stderr)
    sys.exit(1)

missing = 0
for kind, path, pattern, label in rows:
    full = root / path
    why = label or path
    if kind == "exists":
        if full.exists():
            print(f"ok: {path}")
        else:
            print(f"MISSING: {path}  ({why})", file=sys.stderr)
            missing = 1
    elif kind == "grep":
        if not full.is_file():
            print(f"MISSING: {path}  ({why})", file=sys.stderr)
            missing = 1
            continue
        body = full.read_text(encoding="utf-8", errors="replace")
        if re.search(pattern, body):
            print(f"ok: {path} ~ {pattern}")
        else:
            print(f"FAIL: {path} missing /{pattern}/  ({why})", file=sys.stderr)
            missing = 1
    else:
        print(f"FAIL: unknown lock kind {kind!r} for {path}", file=sys.stderr)
        missing = 1

print(f"feature locks checked: {len(rows)}")
sys.exit(missing)
PY
fi
echo

# Spot-check: digital sheet must not still say multiclass is backlog-only
if grep -q 'Мультикласс — в backlog; пока один класс' \
  frontend/src/features/characters/MinimalSheetEditor.tsx 2>/dev/null; then
  echo "FAIL: MinimalSheetEditor still has multiclass backlog hint — merge sheet P5 tip" >&2
  MISSING=1
else
  echo "ok: multiclass backlog hint absent"
fi

echo
if [[ "$MISSING" -ne 0 ]]; then
  cat >&2 <<'EOF'
PREFLIGHT FAILED.

Этот tree нельзя заливать на Timeweb: не хватает контуров tip и/или HEAD не содержит
объявленный prod tip. Деплой затёр бы их (sync-and-up заменяет всё /opt/dvarf кроме .env).

Обязательно:
  1) git fetch origin <prod-tip>     # tip в deploy/prod-tip и AGENTS.md
  2) git merge origin/<prod-tip>     # НЕ параллельная «тонкая» ветка
  3) разрешить конфликты, сохранив И mobile, И desktop catch-up
  4) добавить/починить маркеры в docs/FEATURE_LOCK.md
  5) снова ./deploy/preflight-prod.sh

Обход только с явного ok Игоря:
  DVARF_SKIP_PREFLIGHT=1 ./deploy/sync-and-up.sh
EOF
  exit 1
fi

echo "PREFLIGHT OK — tree contains prod tip + FEATURE_LOCK markers."
