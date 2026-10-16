"""D1+: apply setting-artifact abilities onto a character sheet."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

from app.services.artifact_apply import (
    apply_artifact_to_sheet,
    format_abilities_notes,
    normalize_abilities,
    sum_passive_bonuses,
)


def test_normalize_extended_kinds():
    abilities = normalize_abilities(
        [
            {"kind": "passive", "name": "+1 КД", "bonus_target": "ac", "bonus_value": 1},
            {
                "kind": "passive",
                "name": "бег",
                "bonus_target": "speed",
                "bonus_value": 10,
            },
            {
                "kind": "passive",
                "name": "спас",
                "bonus_target": "save",
                "bonus_value": 1,
                "ability_key": "wis",
            },
            {"kind": "spell_slot", "name": "Ячейка", "slot_level": 2, "slot_count": 1},
            {
                "kind": "spell_slot",
                "name": "Pact",
                "slot_level": 0,
                "slot_count": 1,
                "pact_level": 3,
            },
            {
                "kind": "spell",
                "spell_name": "Огненный снаряд",
                "spell_level": 1,
                "damage": "3d6",
                "casting_time": "1 действие",
                "range": "120 фт",
            },
            {
                "kind": "companion",
                "companion_name": "Волк",
                "hp_max": 11,
                "ac": 13,
                "companion_type": "зверь",
            },
            {
                "kind": "resistance",
                "damage_type": "огонь",
                "resist_mode": "resistance",
            },
            {
                "kind": "weapon",
                "name": "Удар",
                "damage": "1d8",
                "damage_type": "рубящий",
                "ability": "str",
                "magic_bonus": 1,
                "ranged": False,
            },
            {"kind": "resource", "name": "Заряды", "charges": 3, "reset": "dawn"},
            {
                "kind": "action",
                "name": "Вспышка",
                "action_cost": "bonus",
                "charges": 1,
                "reset": "long",
                "text": "Свет 20 фт",
            },
        ]
    )
    assert len(abilities) == 11
    assert abilities[9]["reset"] == "long"  # dawn → long
    mods = sum_passive_bonuses(abilities)
    assert mods["ac"] == 1
    assert mods["speed"] == 10
    assert mods["saves"]["wis"] == 1
    notes = format_abilities_notes(abilities, "Клинок бури")
    assert "Клинок бури" in notes
    assert "ячейка" in notes.lower() or "Ячейка" in notes


def test_apply_full_kit():
    artifact = SimpleNamespace(
        id=uuid4(),
        name="Посох архимага",
        rarity="легендарный",
        description="Древний дуб",
        requires_attunement=True,
        abilities=[
            {"kind": "passive", "name": "Страж", "bonus_target": "ac", "bonus_value": 1},
            {
                "kind": "passive",
                "name": "Спас",
                "bonus_target": "save",
                "bonus_value": 1,
                "ability_key": "dex",
            },
            {
                "kind": "passive",
                "name": "Ночь",
                "bonus_target": "darkvision",
                "bonus_value": 60,
            },
            {"kind": "spell_slot", "slot_level": 3, "slot_count": 1, "name": "Ячейка 3"},
            {
                "kind": "spell",
                "spell_name": "Огненный шар",
                "spell_level": 3,
                "damage": "8d6",
                "prepared": True,
            },
            {
                "kind": "companion",
                "companion_name": "Бес",
                "hp_max": 10,
                "ac": 13,
                "companion_type": "фамильяр",
            },
            {
                "kind": "resistance",
                "damage_type": "огонь",
                "resist_mode": "resistance",
            },
            {"kind": "resource", "name": "Заряды", "charges": 7, "reset": "long"},
            {
                "kind": "weapon",
                "name": "Удар посохом",
                "damage": "1d6",
                "damage_type": "дробящий",
                "ability": "str",
                "magic_bonus": 1,
            },
        ],
        attack_damage="",
        attack_damage_type="",
        attack_ability="str",
        attack_range_kind="melee",
        weight_lb=4,
    )
    sheet = {
        "abilities": {"dex": {"score": 14}, "str": {"score": 10}},
        "saves": {},
        "combat": {"speed": 30},
        "identity": {},
        "inventory": {"coins": {"gp": 5}, "items": []},
        "attunements": [],
        "resources": [],
        "weapons": [],
        "spells": {"slots": {"3": {"max": 1, "used": 0}}, "known": []},
        "companions": [],
    }
    result = apply_artifact_to_sheet(sheet, artifact=artifact, qty=1)
    assert result["active"] is True

    items = sheet["inventory"]["items"]
    assert items[0]["item_kind"] == "magic"
    assert items[0]["artifact_snapshot"]["attack_role"] == "artifact"
    assert len(sheet["attunements"]) == 1

    assert sheet["combat"]["ac"] == 10 + 2 + 1
    assert sheet["combat"]["speed"] == 30
    assert any(
        r.get("damage_type") == "огонь" for r in sheet["combat"]["damage_resistances"]
    )
    assert sheet["identity"]["darkvision"] == 60
    assert sheet["saves"]["dex"]["magic_bonus"] == 1

    assert sheet["spells"]["slots"]["3"]["max"] == 2  # was 1 + 1
    assert any(s.get("name") == "Огненный шар" for s in sheet["spells"]["known"])

    assert len(sheet["companions"]) == 1
    assert sheet["companions"][0]["name"] == "Бес"
    assert sheet["companions"][0]["type"] == "фамильяр"

    assert any(r.get("max") == 7 for r in sheet["resources"])
    assert any(w.get("magic_bonus") == 1 for w in sheet["weapons"])


def test_apply_greataxe_mode_and_requirement():
    """Секира из кампании: СИЛ 15+, 1d12, режим бонусом → 2d12 + преимущество."""
    artifact = SimpleNamespace(
        id=uuid4(),
        name="Секира бури",
        rarity="редкий",
        description="Только для сильных",
        requires_attunement=False,
        abilities=[
            {
                "kind": "requirement",
                "ability_key": "str",
                "min_score": 15,
            },
            {
                "kind": "mode",
                "name": "Ярость клинка",
                "action_cost": "bonus",
                "charges": 1,
                "reset": "short",
                "duration": "1 минута",
                "duration_rounds": 10,
                "active_damage": "2d12",
                "active_damage_type": "магический",
                "advantage": True,
            },
        ],
        attack_damage="1d12",
        attack_damage_type="рубящий",
        attack_ability="str",
        attack_range_kind="melee",
        weight_lb=7,
    )
    sheet: dict = {
        "inventory": {"items": []},
        "weapons": [],
        "combat": {},
        "abilities": {"str": {"score": 16}},
        "saves": {},
        "spells": {},
        "companions": [],
        "resources": [],
    }
    apply_artifact_to_sheet(sheet, artifact=artifact)
    item = sheet["inventory"]["items"][0]
    assert item["req_ability"] == "str"
    assert item["req_score"] == 15
    weapon = sheet["weapons"][0]
    assert weapon["damage"] == "1d12"
    assert weapon["req_score"] == 15
    assert weapon["activation"]["active_damage"] == "2d12"
    assert weapon["activation"]["advantage"] is True
    assert weapon["activation"]["action_cost"] == "bonus"
    assert weapon["mode_active"] is False
    assert len(sheet["resources"]) == 1
    assert sheet["resources"][0]["max"] == 1
    assert sheet["resources"][0]["reset"] == "short"
    assert weapon["activation"]["resource_id"] == sheet["resources"][0]["id"]


def test_apply_weapon_artifact_bakes_bonuses():
    artifact = SimpleNamespace(
        id=uuid4(),
        name="Меч +1",
        rarity="",
        description="",
        requires_attunement=False,
        abilities=[
            {"kind": "passive", "name": "+", "bonus_target": "attack", "bonus_value": 1},
            {"kind": "passive", "name": "+", "bonus_target": "damage", "bonus_value": 1},
        ],
        attack_damage="1d8",
        attack_damage_type="рубящий",
        attack_ability="str",
        attack_range_kind="melee",
        weight_lb=3,
    )
    sheet: dict = {
        "inventory": {"items": []},
        "weapons": [],
        "combat": {},
        "abilities": {},
        "saves": {},
        "spells": {},
        "companions": [],
    }
    apply_artifact_to_sheet(sheet, artifact=artifact)
    assert sheet["weapons"][0]["magic_bonus"] == 1
    assert "1d8" in sheet["weapons"][0]["damage"]
    assert "+1" in sheet["weapons"][0]["damage"]
    assert sheet["weapons"][0]["source_kind"] == "artifact"
