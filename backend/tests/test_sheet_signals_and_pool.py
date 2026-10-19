from app.dnd.encounter_pool import (
    BestiaryMonsterRef,
    filter_monster_pool,
    pick_top_by_xp,
)
from app.dnd.sheet_signals import PartyMemberSnapshot, analyze_party


def _sheet_caster(*, with_bow: bool = False, potion: bool = False) -> dict:
    weapons = []
    if with_bow:
        weapons.append(
            {
                "id": "w1",
                "name": "Длинный лук",
                "damage": "1d8+3",
                "damage_type": "колющий",
            }
        )
    else:
        weapons.append(
            {
                "id": "w1",
                "name": "Четвертной посох",
                "damage": "1d6",
                "damage_type": "дробящий",
            }
        )
    items = []
    if potion:
        items.append({"id": "i1", "name": "Зелье лечения", "qty": 3, "notes": ""})
    return {
        "combat": {"ac": 16, "concentration": {"spell_id": "bless", "name": "Благословение"}},
        "weapons": weapons,
        "spells": {
            "slots": {"1": {"max": 4, "used": 0}, "2": {"max": 3, "used": 1}, "3": {"max": 2, "used": 0}},
            "known": [
                {
                    "id": "s1",
                    "name": "Огненный снаряд",
                    "level": 0,
                    "prepared": True,
                    "range": "120 фт.",
                    "damage": "1d10",
                }
            ],
        },
        "resources": [{"id": "r1", "name": "Волшебное восстановление", "max": 1, "used": 0}],
        "attunements": [{"id": "a1", "item_id": None, "name": "Жезл магии", "notes": ""}],
        "inventory": {"items": items, "coins": {}},
        "companions": [{"id": "c1", "name": "Фамильяр", "hp_max": 2, "hp_current": 2}],
    }


def test_analyze_party_raises_power_for_geared_casters() -> None:
    members = [
        PartyMemberSnapshot(level=5, hp_max=32, sheet=_sheet_caster(with_bow=True, potion=True)),
        PartyMemberSnapshot(level=5, hp_max=40, sheet=_sheet_caster(with_bow=False, potion=True)),
    ]
    analysis = analyze_party(members)
    assert analysis.anti_air_ok is True
    assert analysis.party_power > 1.0
    assert analysis.signals.companion_count >= 2
    assert analysis.signals.has_concentration_buff is True


def test_anti_air_weak_without_ranged() -> None:
    sheet = {
        "combat": {"ac": 18},
        "weapons": [{"id": "w1", "name": "Длинный меч", "damage": "1d8+4"}],
        "spells": {"slots": {}, "known": []},
        "resources": [],
        "attunements": [],
        "inventory": {"items": []},
        "companions": [],
    }
    analysis = analyze_party([PartyMemberSnapshot(level=5, hp_max=50, sheet=sheet)])
    assert analysis.anti_air_ok is False
    assert "anti_air_weak" in analysis.notes


def test_filter_pool_themes_env_fly() -> None:
    pool = [
        BestiaryMonsterRef(
            slug="orc",
            name_ru="Орк",
            cr="1/2",
            xp=100,
            type_en="humanoid",
            subtype="орк",
            environments=("холмы",),
            fly=False,
        ),
        BestiaryMonsterRef(
            slug="goblin",
            name_ru="Гоблин",
            cr="1/4",
            xp=50,
            type_en="humanoid",
            subtype="гоблиноид",
            environments=("лес",),
            fly=False,
        ),
        BestiaryMonsterRef(
            slug="zombie",
            name_ru="Зомби",
            cr="1/4",
            xp=50,
            type_en="undead",
            subtype=None,
            environments=("подземье",),
            fly=False,
        ),
        BestiaryMonsterRef(
            slug="wyvern",
            name_ru="Виверна",
            cr="6",
            xp=2300,
            type_en="dragon",
            subtype=None,
            environments=("горы",),
            fly=True,
        ),
    ]
    # орки точные — без гоблина
    exact = filter_monster_pool(pool, theme_ids=["orc"], similar=False)
    assert [m.slug for m in exact] == ["orc"]

    # похожие — гоблин тоже
    wide = filter_monster_pool(pool, theme_ids=["orc"], similar=True)
    assert {m.slug for m in wide} == {"orc", "goblin"}

    # мультивыбор орки + нежить
    mixed = filter_monster_pool(pool, theme_ids=["orc", "undead"], similar=False)
    assert {m.slug for m in mixed} == {"orc", "zombie"}

    # локация лес
    forest = filter_monster_pool(pool, environments=["лес"], theme_ids=["orc"], similar=True)
    assert [m.slug for m in forest] == ["goblin"]

    # anti-fly
    no_fly = filter_monster_pool(pool, exclude_fly=True)
    assert all(not m.fly for m in no_fly)


def test_pick_boss_candidates() -> None:
    pool = [
        BestiaryMonsterRef("a", "А", "1", 200, "beast", None, (), False),
        BestiaryMonsterRef("b", "Б", "2", 450, "beast", None, (), False),
        BestiaryMonsterRef("c", "В", "3", 700, "beast", None, (), False),
    ]
    picks = pick_top_by_xp(pool, target_xp=500, limit=2)
    assert [p.slug for p in picks] == ["b", "c"]


def test_compose_wave_boss_and_pack_counts() -> None:
    from app.dnd.encounter_budget import EncounterDifficulty
    from app.dnd.encounter_compose import compose_encounter
    from app.dnd.sheet_signals import PartyMemberSnapshot

    sheet = {
        "combat": {"ac": 15},
        "weapons": [{"name": "Длинный лук", "damage": "1d8+2"}],
        "spells": {
            "slots": {},
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
        "inventory": {"items": []},
        "companions": [],
    }
    members = [PartyMemberSnapshot(5, 35, sheet) for _ in range(4)]
    pool = [
        BestiaryMonsterRef("orc", "Орк", "1/2", 100, "humanoid", "орк", ("холмы",), False),
        BestiaryMonsterRef(
            "orc-war", "Вождь", "2", 450, "humanoid", "орк", ("холмы",), False
        ),
        BestiaryMonsterRef(
            "goblin", "Гоблин", "1/4", 50, "humanoid", "гоблиноид", ("холмы",), False
        ),
    ]
    prop = compose_encounter(
        members=members,
        monsters=pool,
        difficulty=EncounterDifficulty.medium,
        theme_ids=["orc"],
        similar=True,
        waves=1,
    )
    wave = prop.waves[0]
    assert wave.boss.options
    assert wave.pack.options
    assert wave.boss.options[0].slug not in {m.slug for m in wave.pack.options}
    assert wave.pack.suggested_count >= 1
