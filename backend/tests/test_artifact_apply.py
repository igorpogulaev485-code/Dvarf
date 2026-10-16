"""D1: apply setting-artifact abilities onto a character sheet."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

from app.services.artifact_apply import (
    apply_artifact_to_sheet,
    format_abilities_notes,
    normalize_abilities,
    sum_passive_bonuses,
)


def test_normalize_and_sum_passives():
    abilities = normalize_abilities(
        [
            {
                "kind": "passive",
                "name": "+1 КД",
                "bonus_target": "ac",
                "bonus_value": 1,
            },
            {
                "kind": "passive",
                "name": "+1 атака",
                "bonus_target": "attack",
                "bonus_value": 1,
            },
            {
                "kind": "passive",
                "name": "Сила",
                "bonus_target": "ability",
                "bonus_value": 2,
                "ability_key": "str",
            },
            {"kind": "resource", "name": "Заряды", "charges": 3, "reset": "dawn"},
            {
                "kind": "action",
                "name": "Вспышка",
                "action_cost": "bonus",
                "text": "Свет 20 фт",
            },
        ]
    )
    assert len(abilities) == 5
    assert abilities[3]["reset"] == "long"  # dawn → long
    mods = sum_passive_bonuses(abilities)
    assert mods["ac"] == 1
    assert mods["attack"] == 1
    assert mods["abilities"]["str"] == 2
    notes = format_abilities_notes(abilities, "Клинок бури")
    assert "Клинок бури" in notes
    assert "+1 КД" in notes or "+1" in notes


def test_apply_artifact_to_sheet_active():
    artifact = SimpleNamespace(
        id=uuid4(),
        name="Кольцо защиты",
        rarity="редкий",
        description="Тёплый металл",
        requires_attunement=True,
        abilities=[
            {
                "kind": "passive",
                "name": "Страж",
                "bonus_target": "ac",
                "bonus_value": 1,
            },
            {
                "kind": "resource",
                "name": "Щит",
                "charges": 2,
                "reset": "long",
            },
        ],
        attack_damage="",
        attack_damage_type="",
        attack_ability="str",
        attack_range_kind="melee",
        weight_lb=0.1,
    )
    sheet = {
        "abilities": {"dex": {"score": 14}, "str": {"score": 10}},
        "combat": {},
        "inventory": {"coins": {"gp": 5}, "items": []},
        "attunements": [],
        "resources": [],
        "weapons": [],
    }
    result = apply_artifact_to_sheet(sheet, artifact=artifact, qty=1)
    assert result["active"] is True
    items = sheet["inventory"]["items"]
    assert len(items) == 1
    assert items[0]["item_kind"] == "magic"
    assert items[0]["magic_mods"]["ac"] == 1
    assert len(sheet["attunements"]) == 1
    assert sheet["attunements"][0]["item_id"] == items[0]["id"]
    assert len(sheet["resources"]) == 1
    assert sheet["resources"][0]["max"] == 2
    assert sheet["combat"]["ac"] == 10 + 2 + 1  # 10+dex(+2)+1


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
    sheet: dict = {"inventory": {"items": []}, "weapons": [], "combat": {}, "abilities": {}}
    apply_artifact_to_sheet(sheet, artifact=artifact)
    assert sheet["weapons"][0]["magic_bonus"] == 1
    assert "1d8" in sheet["weapons"][0]["damage"]
    assert "+1" in sheet["weapons"][0]["damage"]
    assert sheet["weapons"][0]["source_kind"] == "artifact"
