"""I03: spellcasting bonuses, foci, and spellcaster attunement stay idempotent."""

from __future__ import annotations

from app.services.gear_catalog_seed import (
    GearRecord,
    diff_gear_catalog,
    planned_gear_rows,
    refresh_character_sheet,
)


def test_i03_spell_rules_and_second_plan_is_empty() -> None:
    planned = planned_gear_rows()
    by_slug = {row.slug: row for row in planned}

    tool = by_slug["all_purpose_tool_1"]
    assert tool.data["is_spell_focus"] is True
    assert tool.data["effects"][0] == {
        "type": "spellcasting_bonus",
        "value": 1,
        "applies_to": "both",
        "requires_held": True,
        "class_scoped": True,
    }
    assert tool.data["attunement_classes"] == ["artificer"]

    grimoire = by_slug["arcane_grimoire_2"]
    assert grimoire.data["effects"][0]["value"] == 2
    assert grimoire.data["effects"][0]["class_scoped"] is True
    assert grimoire.data["attunement_classes"] == ["wizard"]

    amulet = by_slug["amulet_of_the_devout_1"]
    assert amulet.data["effects"][0]["requires_held"] is False
    assert amulet.data["effects"][0]["class_scoped"] is True
    assert amulet.data["attunement_classes"] == ["cleric", "paladin"]

    sickle = by_slug["moon_sickle_3"]
    types = [row["type"] for row in sickle.data["effects"]]
    assert types[:3] == ["attack_bonus", "damage_bonus", "spellcasting_bonus"]
    assert sickle.data["attunement_classes"] == ["druid", "ranger"]

    power = by_slug["staff_of_power"]
    power_types = {row["type"]: row for row in power.data["effects"]}
    assert power_types["attack_bonus"]["value"] == 2
    assert power_types["damage_bonus"]["value"] == 2
    assert power_types["ac_bonus"]["value"] == 2
    assert power_types["spellcasting_bonus"]["applies_to"] == "attack"
    assert "class_scoped" not in power_types["spellcasting_bonus"]
    assert power.data["is_spell_focus"] is True

    magi = by_slug["staff_of_the_magi"]
    magi_types = [row["type"] for row in magi.data["effects"]]
    assert "ac_bonus" not in magi_types
    assert "save_bonus" not in magi_types
    assert magi_types.count("spellcasting_bonus") == 1
    spell = next(row for row in magi.data["effects"] if row["type"] == "spellcasting_bonus")
    assert spell["applies_to"] == "attack"
    assert spell["value"] == 2

    robe = by_slug["robe_of_the_archmagi"]
    robe_spell = next(row for row in robe.data["effects"] if row["type"] == "spellcasting_bonus")
    assert robe_spell == {
        "type": "spellcasting_bonus",
        "value": 2,
        "applies_to": "both",
        "requires_held": False,
    }

    pearl = by_slug["pearl_of_power"]
    assert pearl.data["attunement_spellcaster"] is True
    assert "attunement_classes" not in pearl.data

    for slug in (
        "ruby_of_the_war_mage",
        "lorehold_primer",
        "prismari_primer",
        "quandrix_primer",
        "silverquill_primer",
        "witherbloom_primer",
        "wand_of_fireballs",
        "wand_of_web",
        "wand_of_wonder",
        "ruby_weave_gem",
    ):
        assert by_slug[slug].data["attunement_spellcaster"] is True, slug

    ruby = by_slug["ruby_weave_gem"]
    assert ruby.data["is_spell_focus"] is True
    assert all(row["type"] != "spellcasting_bonus" for row in ruby.data["effects"])

    hat = by_slug["hat_of_wizardry"]
    assert hat.data["is_spell_focus"] is True
    assert "attunement_spellcaster" not in hat.data

    apparatus = by_slug["mizzium_apparatus"]
    assert apparatus.data["attunement_classes"] == ["sorcerer", "warlock", "wizard"]
    assert apparatus.data.get("attunement_spellcaster") is not True

    changes, stats = diff_gear_catalog(planned)
    assert changes == []
    assert stats.inserted == 0
    assert stats.updated == 0
    assert stats.deactivated == 0


def test_refresh_copies_spellcasting_rules_once() -> None:
    catalog = GearRecord(
        id="cccccccc-cccc-cccc-cccc-cccccccccccc",
        kind="item",
        slug="pearl_of_power",
        edition="2014",
        name_ru="Жемчужина силы",
        name_en="Pearl of Power",
        source="DMG",
        sort_order=1,
        is_active=True,
        parent_id=None,
        external_ref=None,
        data={
            "requires_attunement": True,
            "attunement_spellcaster": True,
            "is_spell_focus": True,
            "effects": [{"type": "resource", "id": "pearl_power", "max": 1, "restore": "dawn"}],
        },
    )
    item = {
        "id": "item-pearl",
        "name": "Моя жемчужина",
        "catalog_id": catalog.id,
        "qty": 2,
        "equipped": True,
        "notes": "не трогать",
        "effects": [],
        "requires_attunement": True,
    }
    sheet = {"inventory": {"items": [item], "notes": "заметки"}, "weapons": [{"id": "atk"}]}
    updated, changed = refresh_character_sheet(sheet, [catalog])
    assert changed == 1
    refreshed = updated["inventory"]["items"][0]
    assert refreshed["name"] == "Моя жемчужина"
    assert refreshed["notes"] == "не трогать"
    assert refreshed["qty"] == 2
    assert refreshed["attunement_spellcaster"] is True
    assert refreshed["is_spell_focus"] is True
    assert refreshed["effects"] == catalog.data["effects"]
    assert updated["inventory"]["notes"] == "заметки"
    assert updated["weapons"] == [{"id": "atk"}]
    again, again_changed = refresh_character_sheet(updated, [catalog])
    assert again_changed == 0
    assert again is updated
