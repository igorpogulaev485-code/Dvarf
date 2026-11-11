"""I02: alignment catalog, attunement rules, Ioun caps, inventory refresh."""

from __future__ import annotations

from app.services.alignment_catalog import (
    ALIGNMENT_SLUGS,
    migrate_sheet_alignment,
    recognize_alignment,
)
from app.services.gear_catalog_seed import (
    GearRecord,
    diff_gear_catalog,
    planned_gear_rows,
    refresh_character_sheet,
)


def test_alignment_phrases_from_the_pack() -> None:
    assert recognize_alignment("Законно-добрый") == "lawful_good"
    assert recognize_alignment("законопослушный добрый") == "lawful_good"
    assert recognize_alignment("ЗД") == "lawful_good"
    assert recognize_alignment("LG") == "lawful_good"
    assert recognize_alignment("Lawful Good") == "lawful_good"
    assert recognize_alignment("Истинно нейтральный") == "neutral"
    assert recognize_alignment("Нейтральный") == "neutral"
    assert recognize_alignment("N") == "neutral"
    assert recognize_alignment("TN") == "neutral"
    assert recognize_alignment("добрый парень") is None
    assert recognize_alignment("lawful_good") == "lawful_good"
    assert "unaligned" in ALIGNMENT_SLUGS


def test_sheet_keeps_unrecognized_alignment_text() -> None:
    recognized, tag = migrate_sheet_alignment(
        {"identity": {"alignment": "Законно-добрый", "background": "Солдат"}}
    )
    assert tag == "recognized"
    assert recognized["identity"]["alignment"] == "lawful_good"
    assert recognized["identity"]["alignment_text"] is None
    assert recognized["identity"]["background"] == "Солдат"

    kept, kept_tag = migrate_sheet_alignment({"identity": {"alignment": "добрый парень"}})
    assert kept_tag == "kept"
    assert kept["identity"]["alignment"] is None
    assert kept["identity"]["alignment_text"] == "добрый парень"

    again, again_tag = migrate_sheet_alignment(recognized)
    assert again_tag == "unchanged"
    assert again is recognized

    still, still_tag = migrate_sheet_alignment(kept)
    assert still_tag == "unchanged"
    assert still is kept


def test_i02_gear_rules_and_second_plan_is_empty() -> None:
    planned = planned_gear_rows()
    by_slug = {row.slug: row for row in planned}

    strength = by_slug["ioun_stone_strength"]
    assert strength.data["effects"] == [
        {"type": "ability_mod", "ability": "str", "value": 2, "max": 20}
    ]
    assert "максимум 20" in strength.data["description_ru"]

    for slug in (
        "belt_of_giant_strength_hill",
        "belt_of_giant_strength_stone",
        "belt_of_giant_strength_fire",
        "belt_of_giant_strength_cloud",
        "belt_of_giant_strength_storm",
    ):
        assert by_slug[slug].data["single_attunement_family"] is True
        assert by_slug[slug].data["family_slug"] == "belt_of_giant_strength"

    assert by_slug["amulet_of_the_devout_1"].data["attunement_classes"] == ["cleric", "paladin"]
    assert by_slug["amulet_of_the_devout_2"].data["attunement_classes"] == ["cleric", "paladin"]
    assert by_slug["staff_of_power"].data["attunement_classes"] == ["sorcerer", "warlock", "wizard"]
    assert by_slug["dwarven_thrower"].data["attunement_races"] == ["dwarf"]
    assert by_slug["book_of_exalted_deeds"].data["attunement_alignments"] == ["good"]
    assert by_slug["book_of_vile_darkness"].data["attunement_alignments"] == ["evil"]
    assert by_slug["robe_of_the_archmagi"].data["alignment_color_gate"] is True
    assert "monk" not in (by_slug["book_of_vile_darkness"].data.get("attunement_classes") or [])

    changes, stats = diff_gear_catalog(planned)
    assert changes == []
    assert stats.inserted == 0
    assert stats.updated == 0
    assert stats.deactivated == 0


def test_refresh_copies_attunement_rules_and_is_idempotent() -> None:
    catalog = GearRecord(
        id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        kind="item",
        slug="belt_of_giant_strength_hill",
        edition="2014",
        name_ru="Пояс силы холмового великана",
        name_en="Belt of Hill Giant Strength",
        source="DMG",
        sort_order=1,
        is_active=True,
        parent_id=None,
        external_ref=None,
        data={
            "requires_attunement": True,
            "family_slug": "belt_of_giant_strength",
            "variant_key": "hill",
            "single_attunement_family": True,
            "effects": [{"type": "ability_score", "ability": "str", "value": 21}],
        },
    )
    item = {
        "id": "item-1",
        "name": "Мой пояс",
        "catalog_id": catalog.id,
        "qty": 1,
        "equipped": True,
        "notes": "с персонажа",
        "effects": [{"type": "ability_score", "ability": "str", "value": 19}],
        "requires_attunement": True,
    }
    sheet = {"inventory": {"items": [item], "notes": ""}, "weapons": [{"id": "atk"}]}
    updated, changed = refresh_character_sheet(sheet, [catalog])
    assert changed == 1
    refreshed = updated["inventory"]["items"][0]
    assert refreshed["name"] == "Мой пояс"
    assert refreshed["notes"] == "с персонажа"
    assert refreshed["catalog_slug"] == "belt_of_giant_strength_hill"
    assert refreshed["single_attunement_family"] is True
    assert refreshed["family_slug"] == "belt_of_giant_strength"
    assert refreshed["effects"] == catalog.data["effects"]
    assert updated["weapons"] == [{"id": "atk"}]
    again, again_changed = refresh_character_sheet(updated, [catalog])
    assert again_changed == 0
    assert again is updated
