#!/usr/bin/env python3
"""Validate bestiary schema v1 + Wildfire Spirit ttg HP lock.

Usage:
  python3 backend/scripts/smoke_bestiary_schema.py
  python3 backend/scripts/smoke_bestiary_schema.py backend/data/srd/2014/bestiary_fixture_v1.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parents[1]
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from bestiary_normalize import (  # noqa: E402
    BESTIARY_DATA_SCHEMA_VERSION,
    ttg_detail_to_entry,
    validate_entry,
)

DEFAULT_FIXTURE = ROOT / "backend" / "data" / "srd" / "2014" / "bestiary_fixture_v1.json"


def assert_true(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_FIXTURE
    assert_true(path.is_file(), f"fixture missing: {path}")
    rows = json.loads(path.read_text(encoding="utf-8"))
    assert_true(isinstance(rows, list) and len(rows) >= 3, "fixture must have ≥3 entries")

    by_slug = {r["slug"]: r for r in rows}
    for slug, row in by_slug.items():
        errs = validate_entry(row)
        assert_true(not errs, f"{slug}: {errs}")
        assert_true(
            row["data"].get("schema_version") == BESTIARY_DATA_SCHEMA_VERSION,
            f"{slug}: schema_version",
        )

    wolf = by_slug.get("wolf")
    assert_true(wolf is not None, "wolf required")
    assert_true(wolf["data"]["type"] == "beast", "wolf type beast")
    assert_true(wolf["data"]["cr"] == "1/4", "wolf CR")
    assert_true(wolf["data"]["hp_average"] == 11, "wolf HP")
    assert_true(wolf["data"]["ac"] == 13, "wolf AC")
    assert_true((wolf["data"].get("speed") or {}).get("walk") == 40, "wolf speed")

    bear = by_slug.get("brown_bear")
    assert_true(bear is not None, "brown_bear required")
    assert_true(bear["data"]["cr"] == "1", "bear CR")
    assert_true("climb" in (bear["data"].get("tags") or []), "bear climb tag")

    hawk = by_slug.get("hawk")
    assert_true(hawk is not None, "hawk required")
    assert_true("fly" in (hawk["data"].get("tags") or []), "hawk fly tag")

    spirit = by_slug.get("wildfire_spirit")
    assert_true(spirit is not None, "wildfire_spirit required (conflict→ttg lock)")
    assert_true(spirit["data"]["hp_average"] == 10, "Wildfire HP base must be 10 (ttg), not 5 (dnd.su)")
    assert_true(
        bool(spirit["data"].get("hp_scaling_text")),
        "Wildfire must keep scaling text",
    )
    assert_true(spirit["data"]["type"] == "elemental", "Wildfire type")
    assert_true(spirit["data"]["cr"] == "", "Wildfire CR empty/special")
    assert_true(spirit["data"]["source_book"] == "TCE", "Wildfire book TCE")

    # Round-trip normalize from embedded raw if present
    raw_dir = ROOT / "backend" / "data" / "srd" / "2014" / "bestiary_raw"
    raw_wolf = raw_dir / "wolf.json"
    if raw_wolf.is_file():
        detail = json.loads(raw_wolf.read_text(encoding="utf-8"))
        entry = ttg_detail_to_entry(detail)
        assert_true(entry["slug"] == "wolf", "raw wolf slug")
        assert_true(not validate_entry(entry), "raw wolf validates")

    print(f"OK smoke_bestiary_schema ({len(rows)} entries) · {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
