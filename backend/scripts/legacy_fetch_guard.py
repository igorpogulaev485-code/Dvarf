"""B2 anti-mirror: block live fetch to ttg.club / dnd.su by default.

Historical import scripts remain in the repo for archaeology, but must not
run against those hosts unless explicitly unlocked.

Unlock (local only, never in CI/prod automation):

  DVARF_ALLOW_LEGACY_FETCH=1 python3 backend/scripts/fetch_….py
"""

from __future__ import annotations

import os
import sys


_UNLOCK = "DVARF_ALLOW_LEGACY_FETCH"


def legacy_fetch_allowed() -> bool:
    return os.environ.get(_UNLOCK, "").strip() in {"1", "true", "yes", "on"}


def require_legacy_fetch_allowed(script_name: str) -> None:
    if legacy_fetch_allowed():
        return
    print(
        f"DISABLED (B2 anti-mirror): {script_name} must not hit ttg.club / dnd.su.\n"
        f"Catalog data stays in-repo; SoT is official books + our structure.\n"
        f"To run this legacy importer intentionally:\n"
        f"  {_UNLOCK}=1 python3 backend/scripts/{script_name}\n",
        file=sys.stderr,
    )
    raise SystemExit(2)
