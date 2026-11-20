"""P24-M02-ranger: 2024 ranger tables, Favored Enemy, PHB conclaves, Druidic Warrior."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_subclasses as sub24
from tests.test_p24_m03_create import build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

# level -> (prepared, favored_enemy max, slot counts 1..5)
RANGER_TABLE = {
    1: (2, 2, (2, 0, 0, 0, 0)),
    3: (4, 2, (3, 0, 0, 0, 0)),
    5: (6, 3, (4, 2, 0, 0, 0)),
    11: (10, 4, (4, 3, 3, 0, 0)),
    20: (15, 6, (4, 3, 3, 3, 2)),
}

RANGER_FEATURE_NAMES_RU = {
    "spellcasting": "Сотворение заклинаний",
    "favored-enemy": "Избранный враг",
    "weapon-mastery": "Оружейное мастерство",
    "deft-explorer": "Ловкий исследователь",
    "fighting-style": "Боевой стиль",
    "ranger-subclass": "Подкласс Следопыта",
    "extra-attack": "Дополнительная атака",
    "roving": "Вездеходность",
    "expertise": "Компетентность",
    "tireless": "Неутомимость",
    "relentless-hunter": "Неустанный охотник",
    "natures-veil": "Природная завеса",
    "precise-hunter": "Меткий охотник",
    "feral-senses": "Звериные чувства",
    "epic-boon": "Эпический дар",
    "foe-slayer": "Истребитель врагов",
}

PHB_RANGER_SUBCLASSES = {
    "ranger__hunter-ranger": "Охотник",
    "ranger__beastmaster": "Повелитель зверей",
    "ranger__fey-wanderer": "Странник фей",
    "ranger__gloom-stalker": "Сумрачный охотник",
}

OUT_OF_PACK_RANGER_SUBCLASSES = {
    "ranger__winter-walker",
    "ranger__hollow-warden",
}

HUNTER_FEATURE_NAMES_RU = {
    "hunters-lore": "Знания охотника",
    "hunters-prey": "Добыча охотника",
    "defensive-tactics": "Оборонительная тактика",
    "superior-hunters-prey": "Добыча превосходного охотника",
    "superior-hunters-defense": "Превосходная защита охотника",
}

HUNTER_2014_OPTION_NAMES_FORBIDDEN = {
    "Убийца великанов",
    "Стальная воля",
    "Мультиатака",
}

_ABILITIES = {"str": 16, "dex": 10, "con": 14, "int": 8, "wis": 16, "cha": 10}


def _ranger_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["ranger"]["data"]
    out: dict[str, dict] = {}
    for row in data["levels"]:
        for feat in row.get("features") or []:
            out[feat["id"]] = feat
    return out


def _hunter_subclass_features() -> dict[str, dict]:
    data = e24.load_subclass_catalog()["ranger__hunter-ranger"]["data"]
    out: dict[str, dict] = {}
    for block in data.get("features") or []:
        for feat in block.get("features") or []:
            out[feat["id"]] = feat
    return out


def _resource_rows(level: int, *, subclass: str | None = None) -> list[dict]:
    levels = [{"slug": "ranger", "level": level}]
    if subclass:
        levels[0]["subclass_slug"] = subclass
    snap = e24.compute_progression(levels, abilities=_ABILITIES)
    return [
        {
            "id": r.id,
            "pool_id": r.pool_id,
            "max": r.max,
            "used": r.max,
            "reset": r.reset,
            "short_rest_regain": r.short_rest_regain,
            "name": r.name_ru,
        }
        for r in snap.resources
    ]


def _snap(level: int, *, subclass: str | None = "ranger__hunter-ranger"):
    row: dict = {"slug": "ranger", "level": level}
    if level >= 3 and subclass:
        row["subclass_slug"] = subclass
    return e24.compute_progression([row], abilities=_ABILITIES)


def _pool_max(snap, pool_id: str) -> int | None:
    for r in snap.resources:
        if r.pool_id == pool_id:
            return int(r.max)
    return None


def _feature_names(snap) -> set[str]:
    return {f.name_ru for f in snap.features}


def _always(snap) -> set[str]:
    if not snap.spellcasting:
        return set()
    return set(snap.spellcasting[0].always_prepared)


def _first_turn_bonus_ft(snap) -> int | None:
    bonuses = snap.scales.get("ranger:subclass_permanent_bonuses") or []
    for row in bonuses:
        if row.get("kind") != "speed":
            continue
        value = row.get("value") or {}
        if isinstance(value, dict) and "first_turn_bonus_ft" in value:
            return int(value["first_turn_bonus_ft"])
    return None


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("level", sorted(RANGER_TABLE))
def test_ranger_progression_table(level: int):
    prepared, favored, slots = RANGER_TABLE[level]
    snap = e24.compute_progression([{"slug": "ranger", "level": level}], abilities=_ABILITIES)
    assert snap.proficiency_bonus == e24.proficiency_bonus_for_level(level)
    block = snap.spellcasting[0]
    assert block.prepared_spells == prepared
    assert block.cantrips == 0
    assert tuple(int(snap.multiclass_slots.get(str(c), 0)) for c in range(1, 6)) == slots
    pools = {r.pool_id: r for r in snap.resources}
    assert pools["favored_enemy_uses"].max == favored
    assert "Метка охотника" in pools["favored_enemy_uses"].name_ru
    assert pools["favored_enemy_uses"].reset == "long"


def test_ranger_feature_names_ru():
    feats = _ranger_features()
    for fid, name in RANGER_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid


@pytest.mark.parametrize(
    "level,present,absent",
    [
        (
            1,
            {"Сотворение заклинаний", "Избранный враг", "Оружейное мастерство"},
            {"Боевой стиль", "Ловкий исследователь", "Дополнительная атака"},
        ),
        (
            2,
            {"Боевой стиль", "Ловкий исследователь"},
            {"Вездеходность", "Неутомимость", "Добыча охотника"},
        ),
        (5, {"Дополнительная атака"}, {"Компетентность", "Неутомимость"}),
        (9, {"Компетентность"}, {"Неутомимость", "Природная завеса"}),
        (10, {"Неутомимость"}, {"Природная завеса", "Неустанный охотник"}),
        (13, {"Неустанный охотник"}, {"Меткий охотник", "Звериные чувства"}),
        (14, {"Природная завеса"}, {"Меткий охотник"}),
        (18, {"Меткий охотник", "Звериные чувства"}, {"Истребитель врагов"}),
        (19, {"Эпический дар"}, {"Истребитель врагов"}),
        (20, {"Истребитель врагов", "Эпический дар"}, set()),
    ],
)
def test_ranger_features_by_level(level: int, present: set[str], absent: set[str]):
    names = {
        f.name_ru for f in e24.compute_progression([{"slug": "ranger", "level": level}]).features
    }
    assert present <= names
    assert not (absent & names)


def test_ranger_has_weapon_mastery_two():
    data = e24.load_class_catalog()["ranger"]["data"]
    assert data["weapon_mastery"]["enabled"] is True
    assert create24._weapon_mastery_limit("ranger") == 2
    snap = e24.compute_progression([{"slug": "ranger", "level": 1}])
    assert snap.scales.get("ranger:weapon_mastery") == 2


def test_ranger_subclass_level_is_3():
    assert e24.load_class_catalog()["ranger"]["data"]["subclass_level"] == 3


def test_favored_enemy_resource_meta_name():
    meta = e24.RESOURCE_META["favored_enemy_uses"]
    assert meta["name_ru"] == "Метка охотника (бесплатно)"


def test_hunters_mark_always_prepared_with_favored_enemy():
    for level in (1, 5, 20):
        snap = e24.compute_progression([{"slug": "ranger", "level": level}], abilities=_ABILITIES)
        assert "hunters-mark" in snap.spellcasting[0].always_prepared


def test_tireless_and_natures_veil_uses_wis_mod():
    snap9 = e24.compute_progression([{"slug": "ranger", "level": 9}], abilities=_ABILITIES)
    assert _pool_max(snap9, "tireless_uses") is None
    assert _pool_max(snap9, "natures_veil_uses") is None
    snap10 = e24.compute_progression([{"slug": "ranger", "level": 10}], abilities=_ABILITIES)
    assert _pool_max(snap10, "tireless_uses") == 3
    assert _pool_max(snap10, "natures_veil_uses") is None
    snap14 = e24.compute_progression([{"slug": "ranger", "level": 14}], abilities=_ABILITIES)
    assert _pool_max(snap14, "tireless_uses") == 3
    assert _pool_max(snap14, "natures_veil_uses") == 3


def test_phb_ranger_subclasses_present_and_named():
    names: dict[str, str] = {}
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        for e in data["entries"]:
            if e["slug"] in PHB_RANGER_SUBCLASSES:
                names[e["slug"]] = e["name_ru"]
    assert names == PHB_RANGER_SUBCLASSES


def test_out_of_pack_ranger_subclasses_not_in_phb_files():
    catalog = e24.load_subclass_catalog()
    for slug in OUT_OF_PACK_RANGER_SUBCLASSES:
        assert slug in catalog
        assert slug not in PHB_RANGER_SUBCLASSES
    in_phb_files: set[str] = set()
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        in_phb_files |= {
            e["slug"] for e in data["entries"] if e["slug"].startswith("ranger__")
        }
    assert in_phb_files == set(PHB_RANGER_SUBCLASSES)
    for slug in PHB_RANGER_SUBCLASSES:
        assert catalog[slug] is not None


def test_hunter_feature_names_ru_and_no_2014_prey_options():
    feats = _hunter_subclass_features()
    for fid, name in HUNTER_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid
    blob = json.dumps(feats, ensure_ascii=False)
    for forbidden in HUNTER_2014_OPTION_NAMES_FORBIDDEN:
        assert forbidden not in blob
    prey = feats["hunters-prey"]
    assert "Убийца колосса" in prey["summary_ru"] or "Крушитель орды" in prey["summary_ru"]


def test_hunter_subclass_features_on_sheet_at_15():
    snap = e24.compute_progression(
        [{"slug": "ranger", "level": 15, "subclass_slug": "ranger__hunter-ranger"}],
        abilities=_ABILITIES,
    )
    names = {f.name_ru for f in snap.features if f.source == "subclass"}
    assert set(HUNTER_FEATURE_NAMES_RU.values()) <= names
    assert not (HUNTER_2014_OPTION_NAMES_FORBIDDEN & names)


def test_gloom_stalker_dread_ambusher_not_2014_extra_attack():
    snap3 = e24.compute_progression(
        [{"slug": "ranger", "level": 3, "subclass_slug": "ranger__gloom-stalker"}],
        abilities=_ABILITIES,
    )
    names = {f.name_ru for f in snap3.features}
    assert {"Угроза из засады", "Сумрачное зрение"} <= names
    assert _first_turn_bonus_ft(snap3) == 10
    scales_blob = json.dumps(snap3.scales, ensure_ascii=False).lower()
    assert "extra_attack" not in scales_blob
    assert "дополнительная атака" not in scales_blob

    snap11 = e24.compute_progression(
        [{"slug": "ranger", "level": 11, "subclass_slug": "ranger__gloom-stalker"}],
        abilities=_ABILITIES,
    )
    names11 = {f.name_ru for f in snap11.features}
    assert "Охотничья ярость" in names11


def test_fey_wanderer_summon_fey_always_prepared_at_9():
    snap8 = e24.compute_progression(
        [{"slug": "ranger", "level": 8, "subclass_slug": "ranger__fey-wanderer"}],
        abilities=_ABILITIES,
    )
    assert "summon-fey" not in set(snap8.spellcasting[0].always_prepared)
    snap9 = e24.compute_progression(
        [{"slug": "ranger", "level": 9, "subclass_slug": "ranger__fey-wanderer"}],
        abilities=_ABILITIES,
    )
    always = set(snap9.spellcasting[0].always_prepared)
    assert "summon-fey" in always
    for spell in sub24.always_prepared_for_subclass("ranger__fey-wanderer", 9):
        assert spell in always


def test_half_up_multiclass_ranger_wizard_slots():
    assert e24.multiclass_caster_level([("ranger", 5)]) == 3
    snap = e24.compute_progression(
        [
            {"slug": "ranger", "level": 5, "subclass_slug": "ranger__hunter-ranger"},
            {"slug": "wizard", "level": 2},
        ],
        abilities=_ABILITIES,
    )
    assert e24.multiclass_caster_level([("ranger", 5), ("wizard", 2)]) == 5
    assert snap.multiclass_slots["1"] == 4
    assert snap.multiclass_slots["2"] == 3
    assert snap.multiclass_slots["3"] == 2


def test_create_ranger_at_1_no_fighting_style_required():
    payload = build_valid_payload("ranger", ability_method="manual", base_abilities=_ABILITIES)
    payload["fighting_style_slug"] = None
    payload["level"] = 1
    assert len(payload.get("weapon_mastery_ids") or []) == 2
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sheet["classes"][0]["level"] == 1
    fe = next(
        r
        for r in (sheet.get("class_progress_2024") or {}).get("resources") or []
        if r.get("pool_id") == "favored_enemy_uses"
    )
    assert fe["max"] == 2


def test_create_ranger_fighting_style_from_level_2():
    payload = build_valid_payload("ranger", ability_method="manual", base_abilities=_ABILITIES)
    payload["level"] = 2
    payload["fighting_style_slug"] = "archery"
    result = create24.validate_create_2024(create24.payload_from_dict(payload))
    assert result.sheet is not None


def test_create_ranger_druidic_warrior_materialize():
    payload = build_valid_payload(
        "ranger",
        ability_method="manual",
        base_abilities=_ABILITIES,
        class_levels=[{"slug": "ranger", "level": 2}],
        fighting_style_slug="druidic-warrior",
    )
    payload["class_option_picks"] = {
        **(payload.get("class_option_picks") or {}),
        "druidic_warrior_cantrips": ["guidance", "druidcraft"],
    }
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sheet is not None
    assert sum(int(r["level"]) for r in sheet["classes"]) == 2

    create_picks = (sheet.get("create_2024") or {}).get("class_option_picks") or {}
    assert create_picks.get("druidic_warrior_cantrips") == ["guidance", "druidcraft"]

    values = (sheet.get("feature_picks") or {}).get("values") or {}
    entry = next(
        str(row.get("id") or "class-ranger")
        for row in sheet["classes"]
        if str(row.get("slug") or "") == "ranger"
    )
    assert values.get(f"{entry}:fighting_style_ranger") == "druidic_warrior"
    assert values.get(f"{entry}:druidic_warrior_cantrips") == "guidance,druidcraft"

    known = (sheet.get("spells") or {}).get("known") or []
    dw = [
        row
        for row in known
        if str(row.get("id") or "").startswith("feature-spell:druidic_warrior_cantrips:")
    ]
    assert len(dw) == 2
    for row in dw:
        assert row.get("level") == 0
        assert row.get("prepared") is True
        assert row.get("prepared_locked") is True
        assert row.get("class_slug") == "ranger"
        assert row.get("prepare_source_label") == "Воин-друид"
    assert (sheet.get("spells") or {}).get("casting_ability") == "wis"


@pytest.mark.parametrize("companion", ["land", "sea", "sky"])
def test_create_ranger_beastmaster_primal_companion(companion: str):
    """PHB 2024: beastmaster must pick land/sea/sky; mirrored to feature_picks."""
    payload = build_valid_payload(
        "ranger",
        ability_method="manual",
        base_abilities=_ABILITIES,
        subclass_slug="ranger__beastmaster",
        class_levels=[{"slug": "ranger", "level": 5, "subclass_slug": "ranger__beastmaster"}],
    )
    payload["class_option_picks"] = {
        **(payload.get("class_option_picks") or {}),
        "primal_companion": companion,
    }
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    values = (sheet.get("feature_picks") or {}).get("values") or {}
    entry = next(
        str(row.get("id") or "class-ranger")
        for row in sheet["classes"]
        if str(row.get("slug") or "") == "ranger"
    )
    assert values.get(f"{entry}:primal_companion") == companion
    assert (sheet.get("class_options_2024") or {}).get("primal_companion") == companion


def test_create_ranger_beastmaster_requires_primal_companion():
    payload = build_valid_payload(
        "ranger",
        ability_method="manual",
        base_abilities=_ABILITIES,
        subclass_slug="ranger__beastmaster",
        class_levels=[{"slug": "ranger", "level": 5, "subclass_slug": "ranger__beastmaster"}],
    )
    with pytest.raises(create24.Create2024Error, match="Первичн"):
        create24.validate_create_2024(create24.payload_from_dict(payload))


def test_create_ranger_druidic_warrior_requires_two_cantrips():
    payload = build_valid_payload(
        "ranger",
        ability_method="manual",
        base_abilities=_ABILITIES,
        class_levels=[{"slug": "ranger", "level": 2}],
        fighting_style_slug="druidic-warrior",
    )
    payload["class_option_picks"] = {
        **(payload.get("class_option_picks") or {}),
        "druidic_warrior_cantrips": ["guidance"],
    }
    with pytest.raises(create24.Create2024Error, match="Воин-друид"):
        create24.validate_create_2024(create24.payload_from_dict(payload))


@pytest.mark.parametrize(
    "name",
    ["classes_srd.json", "subclasses_srd.json", "subclasses_ph24.json"],
)
def test_frontend_catalog_copy_is_byte_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def test_rollback_3_to_2_drops_subclass_features_keeps_hunters_mark():
    hi = _snap(3)
    lo = _snap(2)
    hunter_l3 = {"Знания охотника", "Добыча охотника"}
    assert hunter_l3 <= _feature_names(hi)
    assert not (hunter_l3 & _feature_names(lo))
    assert "hunters-mark" in _always(hi)
    assert "hunters-mark" in _always(lo)


def test_rollback_20_to_19_drops_foe_slayer():
    hi = _snap(20)
    lo = _snap(19)
    names_hi, names_lo = _feature_names(hi), _feature_names(lo)
    assert "Истребитель врагов" in names_hi
    assert "Истребитель врагов" not in names_lo
    assert "Эпический дар" in names_lo


def test_rollback_2_to_1_keeps_spellcasting_loses_fighting_style():
    hi = _snap(2, subclass=None)
    lo = _snap(1, subclass=None)
    assert lo.spellcasting and lo.spellcasting[0].prepared_spells == 2
    assert "Сотворение заклинаний" in _feature_names(lo)
    assert "hunters-mark" in _always(lo)
    names_hi, names_lo = _feature_names(hi), _feature_names(lo)
    assert "Боевой стиль" in names_hi
    assert "Боевой стиль" not in names_lo
    assert "Ловкий исследователь" in names_hi
    assert "Ловкий исследователь" not in names_lo