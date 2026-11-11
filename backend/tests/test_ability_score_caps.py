"""PHB ability score ceilings: default 20, class/artifact raises."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

from app.services.ability_score_caps import (
    DEFAULT_ABILITY_SCORE_MAX,
    clamp_ability_score,
    resolve_ability_maxes,
)
from app.services.artifact_apply import apply_artifact_to_sheet


def test_default_ceiling_is_20():
    assert resolve_ability_maxes({})["str"] == DEFAULT_ABILITY_SCORE_MAX
    assert clamp_ability_score(22) == 20
    assert clamp_ability_score(18) == 18


def test_barbarian_20_primal_champion_raises_str_con():
    sheet = {
        "classes": [{"name": "Варвар", "level": 20, "catalog_id": None}],
        "abilities": {},
        "inventory": {"items": []},
        "attunements": [],
    }
    ceilings = resolve_ability_maxes(sheet)
    assert ceilings["str"] == 24
    assert ceilings["con"] == 24
    assert ceilings["dex"] == 20


def test_barbarian_below_20_no_raise():
    sheet = {
        "classes": [{"name": "Barbarian", "level": 19}],
        "abilities": {},
        "inventory": {"items": []},
    }
    assert resolve_ability_maxes(sheet)["str"] == 20


def test_artifact_bonus_without_max_clamps_to_20():
    """+2 INT on a 20 without max_score must stay at 20 (not 22)."""
    artifact = SimpleNamespace(
        id=uuid4(),
        name="Кольцо интеллекта",
        rarity="",
        description="",
        requires_attunement=False,
        abilities=[
            {
                "kind": "passive",
                "name": "+2 ИНТ",
                "bonus_target": "ability",
                "bonus_value": 2,
                "ability_key": "int",
            }
        ],
        attack_damage="",
        attack_damage_type="",
        attack_ability="str",
        attack_range_kind="melee",
        weight_lb=0,
    )
    sheet: dict = {
        "inventory": {"items": []},
        "weapons": [],
        "combat": {},
        "abilities": {"int": {"score": 20}},
        "saves": {},
        "skills": {},
        "spells": {},
        "companions": [],
        "resources": [],
        "classes": [],
        "attunements": [],
    }
    apply_artifact_to_sheet(sheet, artifact=artifact)
    assert sheet["abilities"]["int"]["score"] == 20
    assert sheet["abilities"]["int"].get("max_score") in (None, 20)


def test_lich_mask_raises_ceiling_and_applies_bonus():
    artifact = SimpleNamespace(
        id=uuid4(),
        name="Маска Лича",
        rarity="",
        description="",
        requires_attunement=True,
        abilities=[
            {
                "kind": "passive",
                "bonus_target": "ability",
                "bonus_value": 2,
                "ability_key": "int",
                "max_score": 22,
            }
        ],
        attack_damage="",
        attack_damage_type="",
        attack_ability="str",
        attack_range_kind="melee",
        weight_lb=1,
    )
    sheet: dict = {
        "inventory": {"items": []},
        "weapons": [],
        "combat": {},
        "abilities": {"int": {"score": 18}},
        "saves": {},
        "skills": {},
        "spells": {},
        "companions": [],
        "resources": [],
        "attunements": [],
        "classes": [],
    }
    apply_artifact_to_sheet(sheet, artifact=artifact)
    assert sheet["abilities"]["int"]["score"] == 20
    assert sheet["abilities"]["int"]["max_score"] == 22
    item = sheet["inventory"]["items"][0]
    assert item["magic_mods"]["ability_max"]["int"] == 22
    # Resolve from inventory snapshot while attuned
    ceilings = resolve_ability_maxes(sheet)
    assert ceilings["int"] == 22


def test_catalog_style_ability_max_on_magic_mods():
    sheet = {
        "abilities": {},
        "classes": [],
        "attunements": [{"id": "a1", "item_id": "i1", "name": "Пояс"}],
        "inventory": {
            "items": [
                {
                    "id": "i1",
                    "name": "Пояс силы",
                    "qty": 1,
                    "equipped": True,
                    "item_kind": "magic",
                    "requires_attunement": True,
                    "magic_mods": {"ac": 0, "attack": 0, "damage": 0, "ability_max": {"str": 23}},
                }
            ]
        },
    }
    assert resolve_ability_maxes(sheet)["str"] == 23
    assert resolve_ability_maxes(sheet)["dex"] == 20


def test_unattuned_item_does_not_raise():
    sheet = {
        "abilities": {},
        "classes": [],
        "attunements": [],
        "inventory": {
            "items": [
                {
                    "id": "i1",
                    "name": "Маска",
                    "qty": 1,
                    "equipped": False,
                    "item_kind": "magic",
                    "requires_attunement": True,
                    "magic_mods": {"ability_max": {"int": 22}},
                }
            ]
        },
    }
    assert resolve_ability_maxes(sheet)["int"] == 20
