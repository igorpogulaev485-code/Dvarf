"""Custom wiki artifacts survive grant → open/save, including legacy sheets.

No migration: effects are rebuilt from the snapshot or from setting_artifacts.
"""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

from app.services.artifact_apply import (
    apply_artifact_to_sheet,
    effects_from_abilities,
    hydrate_legacy_artifact_sheet,
    normalize_abilities,
)


def _art(**kwargs):
    base = dict(
        id=uuid4(),
        rarity="редкий",
        description="",
        requires_attunement=True,
        attack_damage="",
        attack_damage_type="",
        attack_ability="str",
        attack_range_kind="melee",
        weight_lb=1,
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


def _sheet(**extra):
    sheet = {
        "inventory": {"items": []},
        "weapons": [],
        "combat": {},
        "abilities": {"int": {"score": 18}, "str": {"score": 16}},
        "saves": {},
        "skills": {},
        "spells": {"slots": {}, "known": []},
        "companions": [],
        "resources": [],
        "attunements": [],
    }
    sheet.update(extra)
    return sheet


KINDS = (
    "passive",
    "skill",
    "tool",
    "resource",
    "action",
    "mode",
    "requirement",
    "spell_slot",
    "spell",
    "companion",
    "resistance",
    "condition_immunity",
    "weapon",
    "trait",
)


def test_each_of_14_kinds_becomes_an_effect():
    raw = [
        {"kind": "passive", "bonus_target": "ac", "bonus_value": 1, "name": "КД"},
        {"kind": "skill", "skill_key": "nature", "bonus_value": 2},
        {"kind": "tool", "tool_name": "Инструменты фальсификатора"},
        {"kind": "resource", "name": "Заряды", "charges": 3, "reset": "long"},
        {"kind": "action", "name": "Вспышка", "action_cost": "action", "text": "Свет"},
        {
            "kind": "mode",
            "name": "Ярость",
            "active_damage": "2d12",
            "advantage": True,
            "charges": 1,
            "reset": "short",
        },
        {"kind": "requirement", "ability_key": "str", "min_score": 15},
        {"kind": "spell_slot", "slot_level": 3, "slot_count": 1, "name": "Ячейка"},
        {"kind": "spell", "spell_name": "Огненный шар", "spell_level": 3},
        {
            "kind": "companion",
            "companion_name": "Дух",
            "hp_max": 30,
            "ac": 16,
            "attack_damage": "1d8",
            "attack_bonus": 4,
        },
        {"kind": "resistance", "damage_type": "огонь", "resist_mode": "resistance"},
        {"kind": "condition_immunity", "condition_slug": "frightened", "condition_name": "Испуганный"},
        {"kind": "weapon", "name": "Удар", "damage": "1d8", "magic_bonus": 1},
        {"kind": "trait", "name": "Черта", "text": "Свободный текст"},
    ]
    abilities = normalize_abilities(raw)
    assert [ab["kind"] for ab in abilities] == list(KINDS)
    effects = effects_from_abilities(abilities)
    types = {e["type"] for e in effects}
    assert "ac_bonus" in types
    assert "skill_bonus" in types
    assert "sheet_flag" in types
    assert "resource" in types
    assert "custom_note" in types
    assert "weapon_mode" in types
    assert "spell_slots" in types
    assert "artifact_spell" in types
    assert "companion" in types
    assert "resistance" in types
    assert "condition_immunity" in types
    assert "attack_bonus" in types


def test_owner_examples_roundtrip_effects_survive_open_save():
    """Grant, drop the live flag the way an old save would, hydrate, effects return."""
    examples = [
        (
            "Перо Везула",
            [
                {"kind": "skill", "skill_key": "nature", "bonus_value": 2},
                {"kind": "skill", "skill_key": "history", "bonus_value": 2},
                {"kind": "tool", "tool_name": "Инструменты фальсификатора"},
            ],
            "skill_bonus",
        ),
        (
            "Маска Лича",
            [
                {
                    "kind": "passive",
                    "bonus_target": "ability",
                    "bonus_value": 2,
                    "ability_key": "int",
                    "max_score": 22,
                },
                {"kind": "condition_immunity", "condition_slug": "frightened", "condition_name": "Испуганный"},
            ],
            "ability_mod",
        ),
        (
            "Секира бури",
            [
                {"kind": "requirement", "ability_key": "str", "min_score": 15},
                {
                    "kind": "mode",
                    "name": "Ярость клинка",
                    "active_damage": "2d12",
                    "advantage": True,
                    "charges": 1,
                    "reset": "short",
                },
            ],
            "weapon_mode",
        ),
        (
            "Коготь Араха",
            [
                {
                    "kind": "companion",
                    "companion_name": "Дух предка",
                    "hp_max": 30,
                    "ac": 16,
                    "attack_bonus": 4,
                    "attack_damage": "1d8",
                    "attack_damage_type": "некротический",
                    "duration": "1 минута",
                    "charges": 1,
                    "reset": "long",
                }
            ],
            "companion",
        ),
    ]
    for name, abilities, marker in examples:
        sheet = _sheet()
        art = _art(
            name=name,
            requires_attunement=name != "Секира бури",
            abilities=abilities,
            attack_damage="1d12" if name == "Секира бури" else "",
            attack_damage_type="рубящий" if name == "Секира бури" else "",
        )
        apply_artifact_to_sheet(sheet, artifact=art)
        item = sheet["inventory"]["items"][0]
        assert any(e.get("type") == marker for e in item["effects"])
        assert item["artifact_snapshot"]["abilities"]
        # Simulate an old client that kept the snapshot but lost effects.
        item.pop("effects")
        item.pop("artifact_live")
        if name == "Маска Лича":
            # Legacy grant had already added +2 to the stored score.
            sheet["abilities"]["int"]["score"] = 20
        again = hydrate_legacy_artifact_sheet(sheet)
        restored = again["inventory"]["items"][0]
        assert any(e.get("type") == marker for e in restored["effects"])
        assert restored["artifact_snapshot"]["name"] == name
        assert restored["artifact_live"] is True
        # A second open must not subtract the bonus again.
        if name == "Маска Лича":
            assert again["abilities"]["int"]["score"] == 18
            assert again["abilities"]["int"]["max_score"] == 22
            hydrate_legacy_artifact_sheet(again)
            assert again["abilities"]["int"]["score"] == 18


def test_legacy_lich_mask_unbakes_score_once_and_keeps_ceiling():
    """Baked INT 20 (18+2) with max 22 becomes own 18; the effect adds +2 up to 22."""
    art = _art(
        name="Маска Лича",
        abilities=[
            {
                "id": "ab-int",
                "kind": "passive",
                "bonus_target": "ability",
                "bonus_value": 2,
                "ability_key": "int",
                "max_score": 22,
            }
        ],
    )
    sheet = _sheet()
    apply_artifact_to_sheet(sheet, artifact=art)
    item = sheet["inventory"]["items"][0]
    # Pretend the pre-hotfix grant baked the score and then a save dropped effects.
    sheet["abilities"]["int"]["score"] = 20
    item.pop("effects")
    item.pop("artifact_live")
    hydrate_legacy_artifact_sheet(sheet)
    assert sheet["abilities"]["int"]["score"] == 18
    assert sheet["abilities"]["int"]["max_score"] == 22
    effect = next(e for e in item["effects"] if e["type"] == "ability_mod")
    assert effect["max"] == 22
    assert item["equipped"] is True


def test_legacy_axe_keeps_activation_and_requirement():
    art = _art(
        name="Секира бури",
        requires_attunement=False,
        abilities=[
            {"kind": "requirement", "ability_key": "str", "min_score": 15},
            {
                "id": "mode-1",
                "kind": "mode",
                "name": "Ярость клинка",
                "active_damage": "2d12",
                "advantage": True,
                "charges": 1,
                "reset": "short",
            },
        ],
        attack_damage="1d12",
        attack_damage_type="рубящий",
    )
    sheet = _sheet()
    apply_artifact_to_sheet(sheet, artifact=art)
    weapon = sheet["weapons"][0]
    weapon.pop("activation")
    weapon.pop("inventory_item_id")
    item = sheet["inventory"]["items"][0]
    item.pop("effects")
    item.pop("artifact_live")
    hydrate_legacy_artifact_sheet(sheet)
    weapon = sheet["weapons"][0]
    assert weapon["inventory_item_id"] == item["id"]
    assert weapon["activation"]["active_damage"] == "2d12"
    assert weapon["activation"]["advantage"] is True
    assert weapon["req_score"] == 15


def test_legacy_companion_becomes_full_card():
    art = _art(
        name="Коготь Араха",
        abilities=[
            {
                "id": "summon",
                "kind": "companion",
                "companion_name": "Дух предка",
                "hp_max": 30,
                "ac": 16,
                "attack_bonus": 4,
                "attack_damage": "1d8",
                "attack_damage_type": "некротический",
                "duration": "1 минута",
                "charges": 1,
            }
        ],
    )
    sheet = _sheet()
    apply_artifact_to_sheet(sheet, artifact=art)
    companion = sheet["companions"][0]
    assert companion["stats"]["hp_max"] == 30
    assert companion["stats"]["ac"] == 16
    assert "1d8" in companion["actions"]
    assert companion["notes"] == "1 минута"


def test_missing_snapshot_restored_from_setting_artifact():
    art = _art(
        name="Перо Везула",
        abilities=[{"kind": "skill", "skill_key": "nature", "bonus_value": 2}],
    )
    sheet = _sheet()
    apply_artifact_to_sheet(sheet, artifact=art)
    item = sheet["inventory"]["items"][0]
    item["artifact_snapshot"] = {"artifact_id": str(art.id)}
    item.pop("effects")
    item.pop("artifact_live")
    item.pop("magic_mods")
    hydrate_legacy_artifact_sheet(sheet, {str(art.id): art})
    effects = item["effects"]
    assert any(e["type"] == "skill_bonus" and e["skill"] == "nature" for e in effects)


def test_wiped_artifact_cannot_be_rebuilt():
    sheet = _sheet()
    sheet["inventory"]["items"] = [
        {"id": "gone", "name": "Маска Лича", "catalog_id": None, "effects": []}
    ]
    hydrate_legacy_artifact_sheet(sheet, {})
    assert sheet["inventory"]["items"][0].get("effects") == []
    assert sheet["inventory"]["items"][0].get("artifact_live") is not True
