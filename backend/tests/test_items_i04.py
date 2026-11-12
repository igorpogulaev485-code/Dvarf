"""I04: conditional AC, resistances, and spell-save advantage stay idempotent."""

from __future__ import annotations

from app.services.gear_catalog_seed import (
    GearRecord,
    diff_gear_catalog,
    planned_gear_rows,
    refresh_character_sheet,
)


def test_i04_defense_rules_and_second_plan_is_empty() -> None:
    planned = planned_gear_rows()
    by_slug = {row.slug: row for row in planned}

    bracers = by_slug["bracers_of_defense"]
    ac = next(row for row in bracers.data["effects"] if row["type"] == "ac_bonus")
    assert ac == {"type": "ac_bonus", "value": 2, "condition": "no_armor_no_shield"}

    robe = by_slug["robe_of_the_archmagi"]
    assert robe.data["wear_slot"] == "robe"
    robe_types = [row["type"] for row in robe.data["effects"]]
    assert "ac_bonus" not in robe_types
    assert "save_bonus" not in robe_types
    formula = next(row for row in robe.data["effects"] if row["type"] == "ac_formula")
    assert formula["base"] == 15
    advantage = next(row for row in robe.data["effects"] if row["type"] == "save_advantage")
    assert advantage["against"] == "magic"
    spell = next(row for row in robe.data["effects"] if row["type"] == "spellcasting_bonus")
    assert spell["value"] == 2

    plate = by_slug["dwarven_plate"]
    assert plate.data["base_ac"] == 18
    assert plate.data["effects"][0] == {"type": "ac_bonus", "value": 2}

    chain = by_slug["elven_chain"]
    assert chain.data["base_ac"] == 13
    assert chain.data["effects"][0] == {"type": "ac_bonus", "value": 1}

    scale = by_slug["dragon_scale_mail_red"]
    assert scale.data["base_ac"] == 14
    types = {row["type"]: row for row in scale.data["effects"] if row["type"] != "custom_note"}
    assert types["ac_bonus"]["value"] == 1
    assert types["resistance"]["damage_type"] == "fire"

    frost = by_slug["frost_brand"]
    resist = next(row for row in frost.data["effects"] if row["type"] == "resistance")
    assert resist["damage_type"] == "fire"

    ring = by_slug["ring_of_resistance_fire"]
    assert ring.data["effects"][0] == {"type": "resistance", "damage_type": "fire"}
    assert ring.data["requires_attunement"] is True

    potion = by_slug["potion_of_resistance_fire"]
    assert potion.data["effects"][0]["temporary"] is True

    staff = by_slug["staff_of_the_magi"]
    staff_adv = next(row for row in staff.data["effects"] if row["type"] == "save_advantage")
    assert staff_adv["against"] == "spells"
    assert all(row["type"] != "ac_bonus" for row in staff.data["effects"])

    periapt = by_slug["periapt_of_proof_against_poison"]
    assert periapt.data["effects"][0]["type"] == "immunity"
    assert all(row["type"] != "resistance" for row in periapt.data["effects"])

    changes, stats = diff_gear_catalog(planned)
    assert changes == []
    assert stats.inserted == 0
    assert stats.updated == 0
    assert stats.deactivated == 0


def test_refresh_copies_defense_rules_once() -> None:
    catalog = GearRecord(
        id="dddddddd-dddd-dddd-dddd-dddddddddddd",
        kind="armor",
        slug="dwarven_plate",
        edition="2014",
        name_ru="Дварфийские латы",
        name_en="Dwarven Plate",
        source="DMG",
        sort_order=1,
        is_active=True,
        parent_id=None,
        external_ref=None,
        data={
            "armor_kind": "heavy",
            "base_ac": 18,
            "magic_bonus": 2,
            "effects": [{"type": "ac_bonus", "value": 2}],
            "requires_attunement": False,
        },
    )
    item = {
        "id": "item-plate",
        "name": "Мои латы",
        "catalog_id": catalog.id,
        "qty": 1,
        "equipped": True,
        "notes": "гравировка",
        "base_ac": 20,
        "effects": [],
    }
    sheet = {"inventory": {"items": [item], "notes": "сундук"}}
    updated, changed = refresh_character_sheet(sheet, [catalog])
    assert changed == 1
    refreshed = updated["inventory"]["items"][0]
    assert refreshed["name"] == "Мои латы"
    assert refreshed["notes"] == "гравировка"
    assert refreshed["base_ac"] == 18
    assert refreshed["magic_bonus"] == 2
    assert refreshed["effects"] == [{"type": "ac_bonus", "value": 2}]
    assert updated["inventory"]["notes"] == "сундук"
    again, again_changed = refresh_character_sheet(updated, [catalog])
    assert again_changed == 0
    assert again is updated
