"""Run: PYTHONPATH=backend python -m app.services.gear_catalog_seed_selfcheck

Checks the gear plan (445 active magic rows, wand, hidden 13, scrolls) and that
a second diff is empty. Inventory preservation is covered by pytest.
"""

from __future__ import annotations

from app.services.gear_catalog_seed import (
    I22_DEACTIVATE_SLUGS,
    WAND_ID,
    WAND_SLUG,
    diff_gear_catalog,
    is_magic_gear,
    planned_gear_rows,
)


def main() -> None:
    rows = planned_gear_rows()
    keys = [(row.kind, row.edition, row.slug) for row in rows]
    if len(keys) != len(set(keys)):
        raise SystemExit("duplicate gear kind/slug")
    magic = [row for row in rows if is_magic_gear(row.data, is_active=row.is_active)]
    if len(magic) != 445:
        raise SystemExit(f"expected 445 active magic rows, got {len(magic)}")
    hidden = [row for row in rows if row.slug in I22_DEACTIVATE_SLUGS]
    if len(hidden) != 13 or any(row.is_active for row in hidden):
        raise SystemExit("I22 rows must be present and inactive")
    wand = next(row for row in rows if row.slug == WAND_SLUG)
    if wand.id != WAND_ID or wand.name_en != "Wand of Viscid Globs":
        raise SystemExit("viscid globs wand lost its id or name")
    if wand.data.get("charges", {}).get("restore") != "midnight":
        raise SystemExit("wand recharge must stay midnight")
    if wand.data.get("charges", {}).get("max") != 7:
        raise SystemExit("wand must keep 7 charges")
    scrolls = [row.slug for row in rows if str(row.slug).startswith("spell_scroll")]
    if len(scrolls) != len(set(scrolls)) or len(scrolls) != 10:
        raise SystemExit(f"expected 10 unique scrolls, got {scrolls}")
    _changes, stats = diff_gear_catalog(rows)
    if stats.inserted or stats.updated or stats.deactivated:
        raise SystemExit(f"second diff must be empty, got {stats}")
    print(
        "gear_catalog_seed selfcheck ok",
        f"rows={len(rows)}",
        f"magic={len(magic)}",
        f"unchanged={stats.unchanged}",
    )


if __name__ == "__main__":
    main()
