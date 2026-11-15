"""Run: PYTHONPATH=backend python -m app.services.edition_2024_catalog_seed_selfcheck"""

from __future__ import annotations

from app.services.edition_2024_catalog_seed import (
    EDITION_2024_CATALOG_WAVES,
    WEAPON_MASTERY_IDS,
    assert_raw_dump_not_activated,
    load_wave_rows,
    load_weapon_mastery_dictionary,
    normalize_armor_data,
    normalize_background_data,
    normalize_entry_payload,
    normalize_feat_data,
    normalize_item_data,
    normalize_race_data,
    normalize_source,
    normalize_weapon_data,
)


def main() -> None:
    assert normalize_source("srd-5.2") == "srd-5.2"
    assert normalize_source("srd-5.2.1") == "srd-5.2"

    weapon = normalize_weapon_data(
        {"properties": ["finesse", "mastery:vex", "light"], "damage": "1d6"}
    )
    assert weapon.get("mastery") == "vex"
    assert "mastery:vex" not in weapon.get("properties", [])
    assert "finesse" in weapon.get("properties", [])

    race = normalize_race_data({"speed": 30, "ability_bonuses": {"str": 2}})
    assert race["ability_bonuses"] == {"str": 2}  # cleaner keeps until apply forces empty
    race_empty = normalize_race_data({"speed": 30})
    assert race_empty["ability_bonuses"] == {}

    bg = normalize_background_data({})
    assert "asi" in bg and "origin_feat" in bg

    feat = normalize_feat_data({})
    assert "category" in feat

    armor = normalize_armor_data({})
    assert armor["stealth_disadvantage"] is False
    item = normalize_item_data({"equipment_group": "toolkit"})
    assert item["equipment_group"] == "toolkit"

    stub = normalize_entry_payload(
        {
            "kind": "class",
            "slug": "fighter",
            "name_ru": "Fighter",
            "data": {"hit_die": 10},
            "source": "srd-5.2",
        }
    )
    assert stub is None

    blocked = normalize_entry_payload(
        {
            "kind": "feat",
            "slug": "culture",
            "name_ru": "Culture",
            "data": {"category": "origin"},
            "source": "srd-5.2",
        }
    )
    assert blocked is None

    ok = normalize_entry_payload(
        {
            "kind": "feat",
            "slug": "alert",
            "name_ru": "Бдительный",
            "data": {"category": "origin", "summary": "initiative"},
            "source": "srd-5.2",
        }
    )
    assert ok is not None
    assert ok["data"]["content_layer"] == "srd"
    assert ok["data"]["category"] == "origin"

    planned = load_wave_rows()
    assert len(EDITION_2024_CATALOG_WAVES) >= 6
    races = [r for r in planned if r["kind"] == "race"]
    bgs = [r for r in planned if r["kind"] == "background"]
    weapons = [r for r in planned if r["kind"] == "weapon"]
    armor_rows = [r for r in planned if r["kind"] == "armor"]
    items = [r for r in planned if r["kind"] == "item"]
    assert len(races) == 9, len(races)
    assert len(bgs) == 4, len(bgs)
    assert len(weapons) == 38, len(weapons)
    assert len(armor_rows) == 13, len(armor_rows)
    assert len(items) == 134, len(items)
    for row in weapons:
        assert row["data"].get("mastery") in WEAPON_MASTERY_IDS
    mastery = load_weapon_mastery_dictionary()
    assert {m["id"] for m in mastery} == WEAPON_MASTERY_IDS
    for row in races:
        assert row["data"].get("ability_bonuses") in ({}, None) or row["data"][
            "ability_bonuses"
        ] == {}
        # After normalize_race_data empty default:
        assert row["data"]["ability_bonuses"] == {}
    for row in bgs:
        asi = row["data"].get("asi")
        assert isinstance(asi, dict) and len(asi.get("abilities") or []) == 3
        feat_ref = row["data"].get("origin_feat")
        assert isinstance(feat_ref, dict) and feat_ref.get("id") and feat_ref.get("name_ru")
    assert_raw_dump_not_activated(planned)
    print("edition_2024_catalog_seed selfcheck ok")


if __name__ == "__main__":
    main()
