"""P24-M02-fighter: 2024 fighter tables, Second Wind, PHB subclasses, EK prepared."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_subclasses as sub24

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

# level -> (second_wind, weapon_mastery, action_surge, indomitable, attacks)
FIGHTER_TABLE = {
    1: (2, 3, 0, 0, 1),
    3: (2, 3, 1, 0, 1),
    5: (3, 4, 1, 0, 2),
    11: (4, 5, 1, 1, 3),
    20: (4, 6, 2, 3, 4),
}

FIGHTER_FEATURE_NAMES_RU = {
    "fighting-style": "Боевой стиль",
    "second-wind": "Второе дыхание",
    "weapon-mastery": "Оружейное мастерство",
    "action-surge": "Всплеск действий",
    "tactical-mind": "Тактическое мышление",
    "fighter-subclass": "Подкласс воина",
    "extra-attack": "Дополнительная атака",
    "tactical-shift": "Тактическое смещение",
    "indomitable": "Непоколебимость",
    "tactical-master": "Тактическое решение",
    "two-extra-attacks": "Две дополнительные атаки",
    "studied-attacks": "Изучающие выпады",
    "epic-boon": "Эпический дар",
    "three-extra-attacks": "Три дополнительные атаки",
}

PHB_FIGHTER_SUBCLASSES = {
    "fighter__champion": "Чемпион",
    "fighter__battlemaster": "Мастер боевых искусств",
    "fighter__eldritch-knight": "Мистический рыцарь",
    "fighter__psi-warrior": "Пси-воин",
}

# Book AU/FRHoF paths are opened by P24-M02B-fighter (separate test file).
OUT_OF_PACK_FIGHTER_SUBCLASSES = {
    "fighter__cavalier",
    "fighter__samurai",
    "fighter__echo-knight",
    "fighter__rune-knight",
    "fighter__purple-dragon-knight",
}

CHAMPION_FEATURE_NAMES_RU = {
    "improved-critical": "Улучшенный критический удар",
    "remarkable-athlete": "Выдающийся атлет",
    "additional-fighting-style": "Дополнительный боевой стиль",
    "heroic-warrior": "Героический воин",
    "superior-critical": "Превосходный критический удар",
    "survivor": "Вызов смерти",
}

BATTLEMASTER_FEATURE_NAMES_RU = {
    "combat-superiority": "Боевое превосходство",
    "student-of-war": "Ученик войны",
    "know-your-enemy": "Знай своего врага",
    "improved-combat-superiority": "Улучшенное боевое превосходство",
    "relentless": "Неутомимый",
    "ultimate-combat-superiority": "Абсолютное боевое превосходство",
}

ELDRITCH_KNIGHT_FEATURE_NAMES_RU = {
    "spellcasting": "Сотворение заклинаний",
    "weapon-bond": "Связь с оружием",
    "war-magic": "Боевая магия",
    "eldritch-strike": "Мистический удар",
    "arcane-charge": "Магический рывок",
    "improved-war-magic": "Улучшенная боевая магия",
}

PSI_WARRIOR_FEATURE_NAMES_RU = {
    "psionic-power": "Псионическая сила",
    "telekinetic-adept": "Телекинетический адепт",
    "guarded-mind": "Охраняемый разум",
    "bulwark-of-force": "Оплот силы",
    "telekinetic-master": "Мастер телекинеза",
}

_ABILITIES = {"str": 16, "dex": 14, "con": 14, "int": 16, "wis": 10, "cha": 8}


def _fighter_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["fighter"]["data"]
    out: dict[str, dict] = {}
    for row in data["levels"]:
        for feat in row.get("features") or []:
            out[feat["id"]] = feat
    return out


def _subclass_features(slug: str) -> dict[str, dict]:
    data = e24.load_subclass_catalog()[slug]["data"]
    out: dict[str, dict] = {}
    for block in data.get("features") or []:
        for feat in block.get("features") or []:
            out[feat["id"]] = feat
    return out


def _pool_max(snap, pool_id: str) -> int | None:
    for r in snap.resources:
        if r.pool_id == pool_id:
            return int(r.max)
    return None


def _attacks_for_level(level: int) -> int:
    if level >= 20:
        return 4
    if level >= 11:
        return 3
    if level >= 5:
        return 2
    return 1


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("level", sorted(FIGHTER_TABLE))
def test_fighter_progression_table(level: int):
    sw, wm, surge, indom, attacks = FIGHTER_TABLE[level]
    snap = e24.compute_progression(
        [{"slug": "fighter", "level": level}],
        abilities=_ABILITIES,
    )
    assert snap.proficiency_bonus == e24.proficiency_bonus_for_level(level)
    pools = {r.pool_id: r for r in snap.resources}
    assert pools["second_wind"].max == sw
    assert pools["second_wind"].short_rest_regain == 1
    assert snap.scales.get("fighter:weapon_mastery") == wm
    if surge:
        assert pools["action_surge"].max == surge
        assert pools["action_surge"].blocks_magic_action is True
    else:
        assert "action_surge" not in pools
    if indom:
        assert pools["indomitable"].max == indom
    else:
        assert "indomitable" not in pools
    assert _attacks_for_level(level) == attacks


def test_fighter_feature_names_ru():
    feats = _fighter_features()
    for fid, name in FIGHTER_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid


@pytest.mark.parametrize(
    "level,present,absent",
    [
        (
            1,
            {"Боевой стиль", "Второе дыхание", "Оружейное мастерство"},
            {"Всплеск действий", "Тактическое мышление", "Дополнительная атака"},
        ),
        (
            2,
            {"Всплеск действий", "Тактическое мышление"},
            {"Подкласс воина", "Тактическое смещение"},
        ),
        (5, {"Дополнительная атака", "Тактическое смещение"}, {"Непоколебимость"}),
        (9, {"Непоколебимость", "Тактическое решение"}, {"Две дополнительные атаки"}),
        (11, {"Две дополнительные атаки"}, {"Изучающие выпады"}),
        (13, {"Изучающие выпады"}, {"Три дополнительные атаки"}),
        (19, {"Эпический дар"}, {"Три дополнительные атаки"}),
        (20, {"Три дополнительные атаки", "Эпический дар"}, set()),
    ],
)
def test_fighter_features_by_level(level: int, present: set[str], absent: set[str]):
    names = {
        f.name_ru for f in e24.compute_progression([{"slug": "fighter", "level": level}]).features
    }
    assert present <= names
    assert not (absent & names)


def test_fighter_has_weapon_mastery_three_to_six():
    data = e24.load_class_catalog()["fighter"]["data"]
    assert data["weapon_mastery"]["enabled"] is True
    assert data["weapon_mastery"]["change_after_long_rest"] == 1
    assert create24._weapon_mastery_limit("fighter") == 3
    assert e24.compute_progression([{"slug": "fighter", "level": 1}]).scales.get(
        "fighter:weapon_mastery"
    ) == 3
    assert e24.compute_progression([{"slug": "fighter", "level": 16}]).scales.get(
        "fighter:weapon_mastery"
    ) == 6


def test_fighter_subclass_level_is_3():
    assert e24.load_class_catalog()["fighter"]["data"]["subclass_level"] == 3


def test_second_wind_short_rest_regains_one():
    rows = [
        {
            "id": "feat:fighter:second_wind:second_wind",
            "pool_id": "second_wind",
            "max": 2,
            "used": 2,
            "reset": "long",
            "short_rest_regain": 1,
        }
    ]
    after = e24.apply_short_rest_to_resources(rows)
    assert after[0]["used"] == 1


def test_action_surge_blocks_magic_only_helper():
    assert e24.action_surge_allows_action("attack") is True
    assert e24.action_surge_allows_action("magic") is False
    assert e24.action_surge_allows_action("Магия") is False


def test_phb_fighter_subclasses_present_and_named():
    names: dict[str, str] = {}
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        for e in data["entries"]:
            if e["slug"] in PHB_FIGHTER_SUBCLASSES:
                names[e["slug"]] = e["name_ru"]
    assert names == PHB_FIGHTER_SUBCLASSES


def test_out_of_pack_not_required_in_phb_picker_set():
    # Banneret / cavalier etc. may exist in other packs; PHB picker is the four above.
    assert PHB_FIGHTER_SUBCLASSES.keys().isdisjoint(OUT_OF_PACK_FIGHTER_SUBCLASSES)


@pytest.mark.parametrize(
    "slug,names",
    [
        ("fighter__champion", CHAMPION_FEATURE_NAMES_RU),
        ("fighter__battlemaster", BATTLEMASTER_FEATURE_NAMES_RU),
        ("fighter__eldritch-knight", ELDRITCH_KNIGHT_FEATURE_NAMES_RU),
        ("fighter__psi-warrior", PSI_WARRIOR_FEATURE_NAMES_RU),
    ],
)
def test_subclass_feature_names_ru(slug: str, names: dict[str, str]):
    feats = _subclass_features(slug)
    for fid, name in names.items():
        assert feats[fid]["name_ru"] == name, f"{slug}:{fid}"


def test_champion_no_survivor_2014_name_and_has_defy_death():
    feats = _subclass_features("fighter__champion")
    assert feats["survivor"]["name_ru"] == "Вызов смерти"
    snap = e24.compute_progression(
        [{"slug": "fighter", "level": 18, "subclass_slug": "fighter__champion"}],
        abilities=_ABILITIES,
    )
    assert snap.scales.get("fighter:crit_threshold") == 18
    bonuses = snap.scales.get("fighter:subclass_permanent_bonuses") or []
    names = {b.get("name_ru") for b in bonuses}
    assert "Вызов смерти" in names
    assert "Выживший" not in names
    assert "Улучшенный критический удар" in names


def test_battlemaster_four_dice_at_3_and_die_scale():
    snap3 = e24.compute_progression(
        [{"slug": "fighter", "level": 3, "subclass_slug": "fighter__battlemaster"}],
        abilities=_ABILITIES,
    )
    assert _pool_max(snap3, "superiority_dice") == 4
    snap10 = e24.compute_progression(
        [{"slug": "fighter", "level": 10, "subclass_slug": "fighter__battlemaster"}],
        abilities=_ABILITIES,
    )
    pools = {r.pool_id: r for r in snap10.resources}
    assert pools["superiority_dice"].max == 5
    assert pools["superiority_dice"].meta.get("die") == "d10"
    assert _pool_max(snap10, "know_your_enemy") == 1
    snap18 = e24.compute_progression(
        [{"slug": "fighter", "level": 18, "subclass_slug": "fighter__battlemaster"}],
        abilities=_ABILITIES,
    )
    assert {r.pool_id: r for r in snap18.resources}["superiority_dice"].meta.get("die") == "d12"


def test_eldritch_knight_prepares_not_known():
    third = sub24.third_caster_block("fighter__eldritch-knight", 3)
    assert third is not None
    assert third["prepared_spells"] == 3
    assert int(third.get("spells_known") or 0) == 0
    assert third.get("prepare_mode") == "prepared"
    assert third.get("spell_list") == "wizard"
    snap = e24.compute_progression(
        [{"slug": "fighter", "level": 3, "subclass_slug": "fighter__eldritch-knight"}],
        abilities=_ABILITIES,
    )
    assert snap.spellcasting
    block = snap.spellcasting[0]
    assert block.prepared_spells == 3
    assert not block.spells_known
    assert snap.scales.get("fighter:third_caster_prepared") == 3
    snap11 = e24.compute_progression(
        [{"slug": "fighter", "level": 11, "subclass_slug": "fighter__eldritch-knight"}],
        abilities=_ABILITIES,
    )
    assert snap11.spellcasting[0].prepared_spells == 8
    assert snap11.spellcasting[0].slots.get("2") == 3


def test_psi_warrior_bulwark_is_half_cover_not_temp_hp():
    snap = e24.compute_progression(
        [{"slug": "fighter", "level": 15, "subclass_slug": "fighter__psi-warrior"}],
        abilities=_ABILITIES,
    )
    pools = {r.pool_id: r for r in snap.resources}
    assert pools["psionic_energy_dice"].max == 10
    assert pools["psionic_energy_dice"].meta.get("die") == "d10"
    assert pools["bulwark_of_force"].max == 1
    assert pools["bulwark_of_force"].meta.get("effect") == "half_cover"
    assert "temp" not in str(pools["bulwark_of_force"].meta).lower()


def test_multiclass_fighter_no_simple_weapons_and_ek_third():
    grants = e24.MULTICLASS_PROFICIENCIES["fighter"]
    assert "martial" in grants["weapons"]
    assert "simple" not in grants["weapons"]
    assert grants["skills"] == 0
    assert "heavy" not in grants["armor"]
    # EK levels count as 1/3 caster in multiclass.
    total = e24.multiclass_caster_level([("wizard", 1)])
    # Add EK via subclass path in compute_progression:
    snap = e24.compute_progression(
        [
            {"slug": "wizard", "level": 1},
            {"slug": "fighter", "level": 6, "subclass_slug": "fighter__eldritch-knight"},
        ],
        abilities=_ABILITIES,
    )
    # wizard 1 + fighter 6/3 = 1+2 = 3 caster levels → full slots L3
    assert snap.multiclass_slots.get("2") == 2


def test_catalog_mirrors_synced():
    for name in ("classes_srd.json", "subclasses_srd.json", "subclasses_ph24.json"):
        be = (BACKEND_LIVE / name).read_text(encoding="utf-8")
        fe = (FRONTEND_COPY / name).read_text(encoding="utf-8")
        assert json.loads(be) == json.loads(fe), name


def test_frontend_mirrors_have_approved_names():
    data = json.loads((FRONTEND_COPY / "classes_srd.json").read_text(encoding="utf-8"))
    fighter = next(e for e in data["entries"] if e["slug"] == "fighter")
    names = {
        f["name_ru"]
        for row in fighter["data"]["levels"]
        for f in row.get("features") or []
    }
    assert "Тактическое мышление" in names
    assert "Тактический ум" not in names
    assert "Изучающие выпады" in names
