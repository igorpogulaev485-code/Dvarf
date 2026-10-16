"""Eval B8: сильная пати — сырой DMG «hard» слишком лёгок; party_power поднимает бюджет."""

from app.dnd.encounter_budget import EncounterDifficulty, budget_adjusted, budget_base
from app.dnd.encounter_compose import compose_encounter
from app.dnd.encounter_pool import BestiaryMonsterRef
from app.dnd.sheet_signals import PartyMemberSnapshot, analyze_party


def _strong_sheet() -> dict:
    return {
        "combat": {
            "ac": 20,
            "concentration": {"spell_id": "haste", "name": "Ускорение"},
            "effects": [{"id": "e1", "name": "Ускорение", "linked_concentration": True}],
        },
        "weapons": [
            {"name": "Длинный лук +2", "damage": "1d8+7", "damage_type": "колющий"},
            {"name": "Рапира", "damage": "1d8+5", "damage_type": "колющий"},
        ],
        "spells": {
            "slots": {
                "1": {"max": 4, "used": 0},
                "2": {"max": 3, "used": 0},
                "3": {"max": 3, "used": 0},
                "4": {"max": 3, "used": 0},
                "5": {"max": 2, "used": 0},
            },
            "known": [
                {
                    "name": "Огненный шар",
                    "level": 3,
                    "prepared": True,
                    "range": "150 фт.",
                    "damage": "8d6",
                },
                {
                    "name": "Полёт",
                    "level": 3,
                    "prepared": True,
                    "range": "касание",
                    "damage": "",
                },
            ],
        },
        "resources": [
            {"id": "r1", "name": "Ярость", "max": 4, "used": 0},
            {"id": "r2", "name": "Ki", "max": 8, "used": 1},
        ],
        "attunements": [
            {"id": "a1", "name": "Плащ защиты", "item_id": None, "notes": ""},
            {"id": "a2", "name": "Кольцо защиты", "item_id": None, "notes": ""},
        ],
        "inventory": {
            "items": [
                {"id": "i1", "name": "Зелье высшего лечения", "qty": 4, "notes": ""},
                {"id": "i2", "name": "Свиток огненного шара", "qty": 2, "notes": ""},
            ]
        },
        "companions": [
            {"id": "c1", "name": "Скакун", "hp_max": 19, "hp_current": 19},
            {"id": "c2", "name": "Фамильяр", "hp_max": 2, "hp_current": 2},
        ],
    }


def test_strong_party_power_above_dmg_baseline() -> None:
    members = [
        PartyMemberSnapshot(level=8, hp_max=78, sheet=_strong_sheet()),
        PartyMemberSnapshot(level=8, hp_max=72, sheet=_strong_sheet()),
        PartyMemberSnapshot(level=8, hp_max=65, sheet=_strong_sheet()),
        PartyMemberSnapshot(level=7, hp_max=58, sheet=_strong_sheet()),
    ]
    analysis = analyze_party(members)
    base = budget_base(analysis.levels, EncounterDifficulty.hard)
    adjusted = budget_adjusted(
        analysis.levels, EncounterDifficulty.hard, analysis.party_power
    )
    assert analysis.party_power > 1.3
    assert adjusted > base
    assert analysis.anti_air_ok is True


def test_strong_party_deadly_compose_has_boss_and_pack() -> None:
    members = [PartyMemberSnapshot(level=8, hp_max=75, sheet=_strong_sheet()) for _ in range(4)]
    pool = [
        BestiaryMonsterRef(
            "orc-war", "Вождь орков", "4", 1100, "humanoid", "орк", ("холмы",), False
        ),
        BestiaryMonsterRef(
            "orc", "Орк", "1/2", 100, "humanoid", "орк", ("холмы",), False
        ),
        BestiaryMonsterRef(
            "goblin", "Гоблин", "1/4", 50, "humanoid", "гоблиноид", ("холмы",), False
        ),
        BestiaryMonsterRef(
            "wyvern", "Виверна", "6", 2300, "dragon", None, ("горы",), True
        ),
    ]
    prop = compose_encounter(
        members=members,
        monsters=pool,
        difficulty=EncounterDifficulty.deadly,
        theme_ids=["orc"],
        similar=True,
        environments=["холмы"],
        waves=1,
    )
    levels = (8, 8, 8, 8)
    assert prop.party_power > 1.3
    assert prop.budget_total > budget_base(levels, EncounterDifficulty.deadly)
    wave = prop.waves[0]
    assert wave.boss.options
    assert wave.pack.options
    assert wave.pack.suggested_count >= 1
    assert all(not o.fly for o in wave.boss.options)
    assert all(not o.fly for o in wave.pack.options)
