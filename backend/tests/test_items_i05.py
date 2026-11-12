"""I05: staff charges, spell grants, and scroll choices survive refresh."""

from __future__ import annotations

from app.services.gear_catalog_seed import (
    diff_gear_catalog,
    planned_gear_rows,
    refresh_character_sheet,
)


def test_i05_staffs_wands_and_second_plan_is_empty() -> None:
    planned = planned_gear_rows()
    by_slug = {row.slug: row for row in planned}

    magi = by_slug["staff_of_the_magi"]
    types = [row["type"] for row in magi.data["effects"]]
    assert "ac_bonus" not in types
    assert "save_bonus" not in types
    assert types.count("spellcasting_bonus") == 1
    assert magi.data["charges"] == {"max": 50, "restore": "dawn", "recharge_dice": "4d6+2"}
    fireball = next(row for row in magi.data["effects"] if row.get("slug") == "fireball")
    assert fireball["charges"] == 7
    assert fireball["cast_level"] == 7
    assert any(row.get("slug") == "light" and row.get("unlimited") for row in magi.data["effects"])
    resource = next(row for row in magi.data["effects"] if row["type"] == "resource")
    assert resource["recharge_dice"] == "4d6+2"
    assert resource["deplete"] == "regain_1d12_on_20"
    assert "Сл" not in magi.data["description_ru"]

    power = by_slug["staff_of_power"]
    assert power.data["charges"]["recharge_dice"] == "2d8+4"
    assert power.data["charges"]["max"] == 20
    assert power.data["attunement_classes"] == ["sorcerer", "warlock", "wizard"]
    power_types = {row["type"]: row for row in power.data["effects"]}
    assert power_types["ac_bonus"]["value"] == 2
    assert power_types["save_bonus"]["value"] == 2
    assert power_types["spellcasting_bonus"]["applies_to"] == "attack"
    assert "Сл" not in power.data["description_ru"]

    missiles = by_slug["wand_of_magic_missiles"]
    grant = next(row for row in missiles.data["effects"] if row["type"] == "grant_spell")
    assert grant["charge_per_level"] is True
    assert grant["cast_level"] == 1

    goo = by_slug["wand_of_viscous_goo"]
    assert goo.data["charges"]["restore"] == "midnight"
    goo_res = next(row for row in goo.data["effects"] if row["type"] == "resource")
    assert goo_res["restore"] == "midnight"
    assert goo_res["recharge_dice"] == "1d6+1"

    poison = by_slug["potion_of_poison"]
    assert any(row["type"] == "harm" and row["dice"] == "3d6" for row in poison.data["effects"])

    changes, stats = diff_gear_catalog(planned)
    assert changes == []
    assert stats.inserted == 0
    assert stats.updated == 0
    assert stats.deactivated == 0


def test_i05_refresh_keeps_scroll_spell_and_is_idempotent() -> None:
    catalog = [
        row
        for row in planned_gear_rows()
        if row.slug in ("staff_of_the_magi", "potion_of_healing")
    ]
    scroll = {
        "catalog_id": "spell-1",
        "slug": "guiding_bolt",
        "name": "Направленный снаряд",
        "level": 1,
        "classes": ["cleric"],
    }
    sheet = {
        "inventory": {
            "items": [
                {
                    "id": "staff-1",
                    "catalog_id": catalog[0].id,
                    "catalog_slug": "staff_of_the_magi",
                    "name": "Мой посох",
                    "qty": 1,
                    "notes": "не трогать",
                    "equipped": True,
                    "effects": [{"type": "ac_bonus", "value": 2}],
                },
                {
                    "id": "scroll-1",
                    "catalog_id": "not-a-gear-row",
                    "name": "Свиток",
                    "qty": 2,
                    "scroll_spell": scroll,
                    "notes": "выбор",
                },
            ]
        },
        "resources": [
            {"id": "gear-res:staff-1:staff_of_the_magi", "max": 50, "used": 20},
        ],
    }
    # catalog_id must match a real planned id for the staff. Rebuild with the real id.
    staff = next(row for row in planned_gear_rows() if row.slug == "staff_of_the_magi")
    sheet["inventory"]["items"][0]["catalog_id"] = staff.id
    updated, count = refresh_character_sheet(sheet, planned_gear_rows())
    assert count >= 1
    item = updated["inventory"]["items"][0]
    assert item["name"] == "Мой посох"
    assert item["notes"] == "не трогать"
    assert item["equipped"] is True
    assert all(row["type"] != "ac_bonus" for row in item["effects"])
    assert any(row.get("slug") == "fireball" for row in item["effects"])
    scroll_row = updated["inventory"]["items"][1]
    assert scroll_row["scroll_spell"] == scroll
    assert scroll_row["qty"] == 2
    assert scroll_row["notes"] == "выбор"
    pool = updated["resources"][0]
    assert pool["max"] == 50
    assert pool["used"] == 20
    again, second = refresh_character_sheet(updated, planned_gear_rows())
    assert second == 0
    assert again is updated or again == updated
