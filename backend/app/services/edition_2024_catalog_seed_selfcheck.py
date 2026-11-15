"""Run: PYTHONPATH=backend python -m app.services.edition_2024_catalog_seed_selfcheck"""

from __future__ import annotations

from app.services.edition_2024_catalog_seed import (
    assert_raw_dump_not_activated,
    load_wave_rows,
    normalize_background_data,
    normalize_entry_payload,
    normalize_feat_data,
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

    bg = normalize_background_data({})
    assert "asi" in bg and "origin_feat" in bg

    feat = normalize_feat_data({})
    assert "category" in feat

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
    assert planned == []
    assert_raw_dump_not_activated(planned)
    print("edition_2024_catalog_seed selfcheck ok")


if __name__ == "__main__":
    main()
