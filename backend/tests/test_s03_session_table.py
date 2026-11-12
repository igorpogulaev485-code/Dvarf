"""S-03: полоска, типизированный урон, G12, Изучить, вдохновение."""

from __future__ import annotations

from uuid import uuid4

from app.services import session_table_s03 as s03
from app.services.lobby import _combatant_out, _parse_combatants


def test_hp_band_thresholds():
    assert s03.hp_band(60, 60) == "ok"
    assert s03.hp_band(30, 60) == "warn"
    assert s03.hp_band(20, 60) == "critical"
    assert s03.hp_band(0, 60) == "down"
    assert s03.hp_label_hero("ok") == "Здоров"
    assert s03.hp_label_enemy("ok") == "Цел"
    assert s03.hp_label_enemy("critical") == "Тяжело ранен"


def test_typed_damage_resist_vuln_immune_temp_hp():
    amt, note = s03.adjust_incoming_damage(
        20, "fire", resistances=["огонь"], immunities=[], vulnerabilities=[]
    )
    assert amt == 10
    assert "Сопротивление" in note

    amt, note = s03.adjust_incoming_damage(
        10, "cold", resistances=[], immunities=["холод"], vulnerabilities=[]
    )
    assert amt == 0

    amt, note = s03.adjust_incoming_damage(
        5, "slashing", resistances=[], immunities=[], vulnerabilities=["рубящий"]
    )
    assert amt == 10

    cur, temp = s03.apply_damage_through_temp_hp(40, 8, 10, hp_max=60)
    assert temp == 0
    assert cur == 38


def test_study_skill_table():
    assert s03.study_skill_for_creature_type("Огр")["skill_ru"]  # default Анализ for unknown
    assert s03.study_skill_for_creature_type("великан")["skill"] == "investigation"
    assert s03.study_skill_for_creature_type("нежить")["skill"] == "religion"
    assert s03.study_skill_for_creature_type("аберрация")["skill"] == "arcana"
    assert s03.study_skill_for_creature_type("зверь")["skill"] == "animal_handling"
    assert s03.default_study_dc("2") == 12
    assert s03.default_study_dc("1/2") == 10


def test_g12_redacts_statblock_for_player():
    row = {
        "id": "e1",
        "name": "Гоблин",
        "hp_current": 7,
        "hp_max": 7,
        "ac": 15,
        "speed": 30,
        "cr": "1/4",
        "actions": [{"name_ru": "Скимитар", "text_ru": "атака"}],
        "traits": [{"name_ru": "Нимбл", "text_ru": "…"}],
        "damage_resistances": ["огонь"],
        "damage_immunities": [],
        "damage_vulnerabilities": [],
        "condition_immunities": [],
        "members": [{"id": "m1", "name": "Гоблин", "hp_current": 7, "hp_max": 7}],
        "statblock_revealed": False,
        "studied_by": [],
        "conditions": [{"slug": "poisoned", "name": "Отравленный", "catalog_id": None}],
    }
    uid = str(uuid4())
    hidden = s03.redact_combatant_row(row, see_hidden=False, user_id=uid)
    assert hidden["statblock_visible"] is False
    assert hidden["ac"] is None
    assert hidden["actions"] == []
    assert hidden["damage_resistances"] == []
    assert hidden["_hp_numbers_hidden"] is True
    assert hidden["hp_label"] == "Цел"

    out = _combatant_out(row, see_hidden=False, user_id=uid)
    assert out.statblock_visible is False
    assert out.ac is None
    assert out.actions == []
    assert out.damage_resistances == []
    assert out.hp_numbers_hidden is True
    assert out.conditions[0].name == "Отравленный"

    master = _combatant_out(row, see_hidden=True, user_id=uid)
    assert master.statblock_visible is True
    assert master.ac == 15
    assert len(master.actions) == 1
    assert master.damage_resistances == ["огонь"]


def test_g12_reveal_and_study_open_statblock():
    row = {
        "id": "e2",
        "name": "Огр",
        "hp_current": 59,
        "hp_max": 59,
        "ac": 11,
        "actions": [{"name_ru": "Палица", "text_ru": "…"}],
        "traits": [],
        "bonus_actions": [],
        "reactions": [],
        "legendary_actions": [],
        "damage_resistances": [],
        "damage_immunities": [],
        "damage_vulnerabilities": [],
        "condition_immunities": [],
        "members": [{"id": "m1", "name": "Огр", "hp_current": 59, "hp_max": 59}],
        "statblock_revealed": True,
        "studied_by": [],
        "type_ru": "великан",
        "cr": "2",
    }
    uid = str(uuid4())
    revealed = _combatant_out(row, see_hidden=False, user_id=uid)
    assert revealed.statblock_visible is True
    assert revealed.ac == 11

    row2 = dict(row)
    row2["statblock_revealed"] = False
    row2["studied_by"] = [uid]
    row2["study_snapshots"] = {
        uid: {"hp_current": 59, "hp_max": 59, "at": "2026-11-12T00:00:00Z"}
    }
    studied = _combatant_out(row2, see_hidden=False, user_id=uid)
    assert studied.statblock_visible is True
    assert studied.studied_by_me is True
    assert studied.study_snapshot is not None
    assert studied.study_snapshot.hp_current == 59


def test_tick_effects_rounds():
    effects = [
        {
            "id": "a",
            "name": "Щит веры",
            "duration": {"unit": "round", "value": 10, "remaining_rounds": 1},
        },
        {"id": "b", "name": "Вечный", "duration": {"unit": "minute", "value": 10}},
    ]
    next_fx = s03.tick_effects_rounds(effects, rounds_passed=1)
    assert len(next_fx) == 1
    assert next_fx[0]["id"] == "b"


def test_parse_combatants_keeps_study_fields():
    raw = [
        {
            "id": "e1",
            "name": "Гоблин",
            "hp_current": 7,
            "hp_max": 7,
            "statblock_revealed": True,
            "studied_by": ["u1"],
            "effects": [{"id": "fx1", "name": "Баф"}],
            "members": [{"id": "m1", "name": "Гоблин", "hp_current": 7, "hp_max": 7}],
        }
    ]
    parsed = _parse_combatants(raw)
    assert parsed[0]["statblock_revealed"] is True
    assert parsed[0]["studied_by"] == ["u1"]
    assert parsed[0]["effects"][0]["name"] == "Баф"


def test_inspiration_after_roll_default_off():
    assert s03.parse_inspiration_after_roll({}) is False
    assert s03.parse_inspiration_after_roll({"inspiration_after_roll": True}) is True
