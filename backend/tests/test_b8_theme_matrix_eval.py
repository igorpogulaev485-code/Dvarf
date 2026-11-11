"""B8 eval: 4 сложности × темы (нежить / демоны / орки / расы) на фикстурной пати."""

from app.dnd.encounter_budget import EncounterDifficulty, budget_base
from app.dnd.encounter_compose import compose_encounter
from app.dnd.encounter_pool import BestiaryMonsterRef
from app.dnd.sheet_signals import PartyMemberSnapshot, analyze_party

_DIFFS = (
    EncounterDifficulty.easy,
    EncounterDifficulty.medium,
    EncounterDifficulty.hard,
    EncounterDifficulty.deadly,
)

_THEMES = (
    ("undead", False),
    ("demon", True),
    ("orc", True),
    ("elf", False),
    ("human", False),
    ("tiefling", True),
)


def _party() -> list[PartyMemberSnapshot]:
    sheet = {
        "combat": {"ac": 16},
        "weapons": [
            {
                "name": "Длинный лук",
                "damage": "1d8+3",
                "range_kind": "ranged",
            }
        ],
        "spells": {
            "slots": {"1": {"max": 4, "used": 0}, "2": {"max": 2, "used": 0}},
            "known": [
                {
                    "name": "Огненный снаряд",
                    "prepared": True,
                    "range": "120 фт.",
                    "damage": "1d10",
                }
            ],
        },
        "resources": [],
        "attunements": [],
        "inventory": {
            "items": [
                {"name": "Зелье лечения", "qty": 2, "item_kind": "consumable"},
            ]
        },
        "companions": [],
    }
    return [
        PartyMemberSnapshot(
            level=5,
            hp_max=38,
            sheet=sheet,
            race_name="Человек",
            class_name="Следопыт",
        )
        for _ in range(4)
    ]


def _pool() -> list[BestiaryMonsterRef]:
    return [
        BestiaryMonsterRef(
            "zombie", "Зомби", "1/4", 50, "undead", None, ("подземье",), False
        ),
        BestiaryMonsterRef(
            "wight", "Умертвие", "3", 700, "undead", None, ("подземье",), False
        ),
        BestiaryMonsterRef(
            "dretch", "Дретч", "1/4", 50, "fiend", "демон", ("подземье",), False
        ),
        BestiaryMonsterRef(
            "hezrou", "Хезроу", "8", 3900, "fiend", "демон", ("подземье",), False
        ),
        BestiaryMonsterRef(
            "orc", "Орк", "1/2", 100, "humanoid", "орк", ("холмы",), False
        ),
        BestiaryMonsterRef(
            "orc-war", "Вождь орков", "4", 1100, "humanoid", "орк", ("холмы",), False
        ),
        BestiaryMonsterRef(
            "goblin", "Гоблин", "1/4", 50, "humanoid", "гоблиноид", ("лес",), False
        ),
        BestiaryMonsterRef(
            "elf-archer", "Эльф-лучник", "1", 200, "humanoid", "эльф", ("лес",), False
        ),
        BestiaryMonsterRef(
            "elf-mage", "Эльф-маг", "3", 700, "humanoid", "эльф", ("лес",), False
        ),
        BestiaryMonsterRef(
            "guard", "Страж", "1/8", 25, "humanoid", "человек", ("город",), False
        ),
        BestiaryMonsterRef(
            "veteran", "Ветеран", "3", 700, "humanoid", "человек", ("город",), False
        ),
        BestiaryMonsterRef(
            "tiefling", "Тифлинг-головорез", "1", 200, "humanoid", "тифлинг", ("город",), False
        ),
        BestiaryMonsterRef(
            "imp", "Бес", "1", 200, "fiend", "дьявол", ("город",), True
        ),
    ]


def test_range_kind_marks_anti_air() -> None:
    members = _party()
    analysis = analyze_party(members)
    assert analysis.anti_air_ok is True
    assert analysis.signals.consumable_ready > 0


def test_matrix_difficulty_x_theme_produces_boss_and_pack() -> None:
    members = _party()
    monsters = _pool()
    levels = tuple(m.level for m in members)
    for diff in _DIFFS:
        for theme_id, similar in _THEMES:
            prop = compose_encounter(
                members=members,
                monsters=monsters,
                difficulty=diff,
                theme_ids=[theme_id],
                similar=similar,
                waves=1,
            )
            assert prop.budget_total >= budget_base(levels, diff)
            assert prop.waves, f"{diff}/{theme_id}"
            wave = prop.waves[0]
            assert wave.boss.options, f"no boss for {diff}/{theme_id}"
            assert wave.pack.options, f"no pack for {diff}/{theme_id}"
            # летающие отфильтрованы только если anti_air слабый — здесь ok, но
            # тема demon+similar может дать дьявола-беса с fly — допустимо при anti_air_ok
            if not prop.anti_air_ok:
                assert all(not o.fly for o in wave.boss.options)
                assert all(not o.fly for o in wave.pack.options)
