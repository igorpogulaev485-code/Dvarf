"""Run: PYTHONPATH=backend python -m app.services.gear_catalog_seed_selfcheck

Checks the gear plan (I22 magic baseline plus later inserts, wand, hidden 13,
scrolls) and that a second diff is empty. Inventory preservation is pytest.
"""

from __future__ import annotations

from app.services.gear_catalog_seed import (
    I22_ACTIVE_MAGIC_COUNT,
    I22_DEACTIVATE_SLUGS,
    WAND_ID,
    WAND_SLUG,
    active_magic_rows,
    diff_gear_catalog,
    gear_row_key,
    item_pack_insert_keys,
    planned_gear_rows,
    split_gear_waves_at_item_packs,
)


def main() -> None:
    rows = planned_gear_rows()
    keys = [(row.kind, row.edition, row.slug) for row in rows]
    if len(keys) != len(set(keys)):
        raise SystemExit("duplicate gear kind/slug")
    before, _after = split_gear_waves_at_item_packs()
    baseline_rows = planned_gear_rows(before)
    baseline = active_magic_rows(baseline_rows)
    if len(baseline) != I22_ACTIVE_MAGIC_COUNT:
        raise SystemExit(
            f"expected {I22_ACTIVE_MAGIC_COUNT} active magic rows before gear_i packs, "
            f"got {len(baseline)}"
        )
    base_keys = {gear_row_key(row) for row in baseline}
    baseline_keys = {gear_row_key(row) for row in baseline_rows}
    magic = active_magic_rows(rows)
    magic_keys = {gear_row_key(row) for row in magic}
    if not base_keys <= magic_keys:
        raise SystemExit("I22 magic rows disappeared")
    added = magic_keys - base_keys
    new_inserts = item_pack_insert_keys() - baseline_keys
    final_keys = {gear_row_key(row) for row in rows}
    if not new_inserts <= final_keys or added != {key for key in new_inserts if key in magic_keys}:
        raise SystemExit(f"magic growth must be gear_i inserts, added={sorted(added)}")
    if len(magic) != I22_ACTIVE_MAGIC_COUNT + len(added):
        raise SystemExit(
            f"expected {I22_ACTIVE_MAGIC_COUNT + len(added)} active magic rows, got {len(magic)}"
        )
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
