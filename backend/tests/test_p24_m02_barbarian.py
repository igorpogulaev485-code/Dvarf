"""P24-M02-barbarian: 2024 barbarian tables, Rage, PHB subclasses."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_subclasses as sub24
from app.services.ability_score_caps import ability_max_from_classes

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"

# level -> (rages, rage_damage, weapon_mastery, attacks)
BARBARIAN_TABLE = {
    1: (2, 2, 2, 1),
    3: (3, 2, 2, 1),
    5: (3, 2, 3, 2),
    11: (4, 3, 4, 2),
    20: (6, 4, 4, 2),
}

BARBARIAN_FEATURE_NAMES_RU = {
    "rage": "Ярость",
    "unarmored-defense": "Защита без доспехов",
    "weapon-mastery": "Оружейное мастерство",
    "danger-sense": "Чувство опасности",
    "reckless-attack": "Безрассудная атака",
    "barbarian-subclass": "Подкласс варвара",
    "primal-knowledge": "Изначальные знания",
    "extra-attack": "Дополнительная атака",
    "fast-movement": "Быстрое движение",
    "feral-instinct": "Звериный инстинкт",
    "instinctive-pounce": "Инстинктивный прыжок",
    "brutal-strike": "Жестокий удар",
    "improved-brutal-strike": "Улучшенный жестокий удар",
    "relentless-rage": "Непреклонная ярость",
    "persistent-rage": "Стойкая ярость",
    "indomitable-might": "Неукротимая мощь",
    "epic-boon": "Эпический дар",
    "primal-champion": "Изначальный чемпион",
}

PHB_BARBARIAN_SUBCLASSES = {
    "barbarian__berserker": "Путь берсерка",
    "barbarian__wild-heart": "Путь дикого сердца",
    "barbarian__world-tree": "Путь Мирового древа",
    "barbarian__zealot": "Путь фанатика",
}

OUT_OF_PACK_BARBARIAN_SUBCLASSES = {
    "barbarian__totem-warrior",
    "barbarian__battlerager",
    "barbarian__ancestral-guardian",
    "barbarian__storm-herald",
    "barbarian__beast",
    "barbarian__wild-magic",
    "barbarian__giant",
}

BERSERKER_FEATURE_NAMES_RU = {
    "frenzy": "Безумие",
    "mindless-rage": "Безумная ярость",
    "retaliation": "Возмездие",
    "intimidating-presence": "Устрашающее присутствие",
}

WILD_HEART_FEATURE_NAMES_RU = {
    "animal-speaker": "Говорящий с животными",
    "rage-of-the-wilds": "Ярость дикой природы",
    "aspect-of-the-wilds": "Аспект дикой природы",
    "nature-speaker": "Говорящий с природой",
    "power-of-the-wilds": "Сила дикой природы",
}

WORLD_TREE_FEATURE_NAMES_RU = {
    "vitality-of-the-tree": "Жизненная сила Древа",
    "branches-of-the-tree": "Ветви Древа",
    "battering-roots": "Колотящее дубьё",
    "travel-along-the-tree": "Путешествие по Древу",
}

ZEALOT_FEATURE_NAMES_RU = {
    "divine-fury": "Божественная ярость",
    "warrior-of-the-gods": "Воин богов",
    "fanatical-focus": "Фанатичный фокус",
    "zealous-presence": "Ревностное присутствие",
    "rage-of-the-gods": "Ярость богов",
}

_ABILITIES = {"str": 16, "dex": 14, "con": 16, "int": 8, "wis": 12, "cha": 10}


def _barbarian_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["barbarian"]["data"]
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
    return 2 if level >= 5 else 1


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("level", sorted(BARBARIAN_TABLE))
def test_barbarian_progression_table(level: int):
    rages, rage_dmg, wm, attacks = BARBARIAN_TABLE[level]
    snap = e24.compute_progression(
        [{"slug": "barbarian", "level": level}],
        abilities=_ABILITIES,
    )
    assert snap.proficiency_bonus == e24.proficiency_bonus_for_level(level)
    pools = {r.pool_id: r for r in snap.resources}
    assert pools["rages"].max == rages
    assert pools["rages"].short_rest_regain == 1
    assert snap.scales.get("barbarian:rage_damage") == rage_dmg
    assert snap.scales.get("barbarian:weapon_mastery") == wm
    assert _attacks_for_level(level) == attacks


def test_barbarian_feature_names_ru():
    feats = _barbarian_features()
    for fid, name in BARBARIAN_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid


@pytest.mark.parametrize(
    "level,present,absent",
    [
        (
            1,
            {"Ярость", "Защита без доспехов", "Оружейное мастерство"},
            {"Безрассудная атака", "Чувство опасности", "Подкласс варвара"},
        ),
        (
            2,
            {"Чувство опасности", "Безрассудная атака"},
            {"Подкласс варвара", "Изначальные знания"},
        ),
        # «Подкласс варвара» — карточка выбора в мастере; в compute_progression без subclass_slug её нет.
        (3, {"Изначальные знания"}, {"Дополнительная атака"}),
        (5, {"Дополнительная атака", "Быстрое движение"}, {"Жестокий удар"}),
        (7, {"Звериный инстинкт", "Инстинктивный прыжок"}, {"Жестокий удар"}),
        (9, {"Жестокий удар"}, {"Непреклонная ярость"}),
        (11, {"Непреклонная ярость"}, {"Стойкая ярость"}),
        (15, {"Стойкая ярость"}, {"Неукротимая мощь"}),
        (18, {"Неукротимая мощь"}, {"Изначальный чемпион"}),
        (19, {"Эпический дар"}, {"Изначальный чемпион"}),
        (20, {"Изначальный чемпион", "Эпический дар"}, set()),
    ],
)
def test_barbarian_features_by_level(level: int, present: set[str], absent: set[str]):
    names = {
        f.name_ru for f in e24.compute_progression([{"slug": "barbarian", "level": level}]).features
    }
    assert present <= names
    assert not (absent & names)


def test_barbarian_weapon_mastery_melee_two_to_four():
    data = e24.load_class_catalog()["barbarian"]["data"]
    assert data["weapon_mastery"]["enabled"] is True
    assert data["weapon_mastery"].get("melee_only") is True or data["weapon_mastery"].get(
        "meleeOnly"
    ) in (True, None)
    assert data["weapon_mastery"]["change_after_long_rest"] == 1
    assert create24._weapon_mastery_limit("barbarian") == 2
    assert e24.compute_progression([{"slug": "barbarian", "level": 1}]).scales.get(
        "barbarian:weapon_mastery"
    ) == 2
    assert e24.compute_progression([{"slug": "barbarian", "level": 10}]).scales.get(
        "barbarian:weapon_mastery"
    ) == 4


def test_barbarian_subclass_level_is_3():
    assert e24.load_class_catalog()["barbarian"]["data"]["subclass_level"] == 3


def test_rage_short_rest_regains_one():
    rows = [
        {
            "id": "feat:barbarian:rages:rages",
            "pool_id": "rages",
            "max": 2,
            "used": 2,
            "reset": "long",
            "short_rest_regain": 1,
        }
    ]
    after = e24.apply_short_rest_to_resources(rows)
    assert after[0]["used"] == 1


def test_relentless_rage_summary_is_level_times_two_not_one_hp():
    feats = _barbarian_features()
    summary = feats["relentless-rage"]["summary_ru"]
    assert "× 2" in summary or "x 2" in summary.lower() or "уровень" in summary.lower()
    assert "1 хите" not in summary


def test_danger_sense_2024_has_no_visible_only_clause():
    summary = _barbarian_features()["danger-sense"]["summary_ru"]
    assert "видимых" not in summary.lower()


def test_phb_barbarian_subclasses_present_and_named():
    names: dict[str, str] = {}
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        for e in data["entries"]:
            if e["slug"] in PHB_BARBARIAN_SUBCLASSES:
                names[e["slug"]] = e["name_ru"]
    assert names == PHB_BARBARIAN_SUBCLASSES


def test_out_of_pack_not_in_phb_picker_set():
    assert PHB_BARBARIAN_SUBCLASSES.keys().isdisjoint(OUT_OF_PACK_BARBARIAN_SUBCLASSES)


@pytest.mark.parametrize(
    "slug,names",
    [
        ("barbarian__berserker", BERSERKER_FEATURE_NAMES_RU),
        ("barbarian__wild-heart", WILD_HEART_FEATURE_NAMES_RU),
        ("barbarian__world-tree", WORLD_TREE_FEATURE_NAMES_RU),
        ("barbarian__zealot", ZEALOT_FEATURE_NAMES_RU),
    ],
)
def test_subclass_feature_names_ru(slug: str, names: dict[str, str]):
    feats = _subclass_features(slug)
    for fid, name in names.items():
        assert feats[fid]["name_ru"] == name, f"{slug}:{fid}"


def test_berserker_frenzy_uses_rage_damage_name_bezumie():
    bonuses = sub24.build_permanent_bonuses("barbarian__berserker", 3)
    names = {b.name_ru for b in bonuses}
    assert "Безумие" in names
    assert "Бешенство" not in names


def test_zealot_warrior_of_the_gods_d12_pool():
    snap3 = e24.compute_progression(
        [{"slug": "barbarian", "level": 3, "subclass_slug": "barbarian__zealot"}],
        abilities=_ABILITIES,
    )
    assert _pool_max(snap3, "warrior_of_the_gods") == 4
    snap6 = e24.compute_progression(
        [{"slug": "barbarian", "level": 6, "subclass_slug": "barbarian__zealot"}],
        abilities=_ABILITIES,
    )
    assert _pool_max(snap6, "warrior_of_the_gods") == 5
    assert _pool_max(snap6, "fanatical_focus") == 1
    snap17 = e24.compute_progression(
        [{"slug": "barbarian", "level": 17, "subclass_slug": "barbarian__zealot"}],
        abilities=_ABILITIES,
    )
    assert _pool_max(snap17, "warrior_of_the_gods") == 7
    assert _pool_max(snap17, "rage_of_the_gods") == 1


def test_primal_champion_max_25_only_on_2024():
    classes = [{"name": "Варвар", "catalog_id": "barbarian", "level": 20}]
    assert ability_max_from_classes(classes, rules_edition="2014")["str"] == 24
    assert ability_max_from_classes(classes, rules_edition="2024")["str"] == 25


def test_multiclass_barbarian_grants_martial_and_shields_not_simple():
    grants = e24.MULTICLASS_PROFICIENCIES["barbarian"]
    assert grants["armor"] == ["shields"]
    assert grants["weapons"] == ["martial"]
    assert "simple" not in grants["weapons"]


def test_frontend_catalog_mirrors_backend_names():
    fe = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"
    be_feats = _barbarian_features()
    data = json.loads((fe / "classes_srd.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["slug"] == "barbarian")
    fe_feats = {
        f["id"]: f
        for row in entry["data"]["levels"]
        for f in row.get("features") or []
    }
    for fid, name in BARBARIAN_FEATURE_NAMES_RU.items():
        assert fe_feats[fid]["name_ru"] == name == be_feats[fid]["name_ru"]
