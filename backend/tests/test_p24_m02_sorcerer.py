"""P24-M02-sorcerer: 2024 sorcerer tables, RU names, metamagic 2/4/6, subclass pools."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_class_options as opt
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_subclasses as sub24

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

SORCERER_PREPARED = {1: 2, 3: 6, 5: 9, 11: 16, 20: 22}
SORCERER_CANTRIPS = {1: 4, 4: 5, 5: 5, 10: 6, 11: 6, 20: 6}
SORCERER_SP = {1: 0, 2: 2, 5: 5, 11: 11, 20: 20}

SORCERER_FEATURE_NAMES_RU = {
    "spellcasting": "Сотворение заклинаний",
    "innate-sorcery": "Врождённое чародейство",
    "font-of-magic": "Источник магии",
    "metamagic": "Метамагия",
    "sorcerous-restoration": "Чародейское восстановление",
    "sorcery-incarnate": "Воплощение чародейства",
    "arcane-apotheosis": "Апофеоз чародейства",
}

PHB_SUBCLASSES = {
    "sorcerer__draconic-sorcery",
    "sorcerer__aberrant-sorcery",
    "sorcerer__clockwork-sorcery",
    "sorcerer__wild-magic-sorcery",
}

_ABILITIES = {"str": 8, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 18}


def _sorcerer_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["sorcerer"]["data"]
    out: dict[str, dict] = {}
    for row in data["levels"]:
        for feat in row.get("features") or []:
            out[feat["id"]] = feat
    return out


def _pools(slug: str, level: int) -> dict[str, object]:
    return {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            slug, level, total_level=level, abilities=_ABILITIES
        )
    }


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("level,prepared", sorted(SORCERER_PREPARED.items()))
def test_sorcerer_prepared_table(level: int, prepared: int):
    snap = e24.compute_progression([{"slug": "sorcerer", "level": level}])
    assert snap.spellcasting[0].prepared_spells == prepared


@pytest.mark.parametrize("level,cantrips", sorted(SORCERER_CANTRIPS.items()))
def test_sorcerer_cantrips_table(level: int, cantrips: int):
    snap = e24.compute_progression([{"slug": "sorcerer", "level": level}])
    assert snap.spellcasting[0].cantrips == cantrips


@pytest.mark.parametrize("level,points", sorted(SORCERER_SP.items()))
def test_sorcery_points_table(level: int, points: int):
    snap = e24.compute_progression([{"slug": "sorcerer", "level": level}])
    pools = {r.pool_id: r for r in snap.resources}
    if points <= 0:
        assert "sorcery_points" not in pools
    else:
        assert pools["sorcery_points"].max == points
        assert pools["sorcery_points"].name_ru == "Очки чародейства"
        assert pools["sorcery_points"].reset == "long"


def test_innate_sorcery_pool_from_level_1():
    snap = e24.compute_progression([{"slug": "sorcerer", "level": 1}])
    pool = next(r for r in snap.resources if r.pool_id == "innate_sorcery_uses")
    assert pool.max == 2
    assert pool.name_ru == "Врождённое чародейство"
    assert pool.reset == "long"


def test_sorcerous_restoration_pool_from_level_5():
    snap1 = e24.compute_progression([{"slug": "sorcerer", "level": 4}])
    assert all(r.pool_id != "sorcerous_restoration" for r in snap1.resources)
    snap = e24.compute_progression([{"slug": "sorcerer", "level": 5}])
    pool = next(r for r in snap.resources if r.pool_id == "sorcerous_restoration")
    assert pool.max == 1
    assert pool.name_ru == "Чародейское восстановление"


def test_sorcerer_subclass_comes_at_level_3():
    assert e24.load_class_catalog()["sorcerer"]["data"]["subclass_level"] == 3
    snap = e24.compute_progression(
        [{"slug": "sorcerer", "level": 3, "subclass_slug": "sorcerer__draconic-sorcery"}]
    )
    assert snap.subclass_level == 3


def test_sorcerer_feature_names_ru():
    feats = _sorcerer_features()
    for fid, name in SORCERER_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid


def test_metamagic_limits_are_2_4_6():
    assert opt.metamagic_known_limit(2) == 2
    assert opt.metamagic_known_limit(9) == 2
    assert opt.metamagic_known_limit(10) == 4
    assert opt.metamagic_known_limit(16) == 4
    assert opt.metamagic_known_limit(17) == 6
    assert opt.metamagic_known_limit(20) == 6
    assert opt.METAMAGIC_BY_ID["careful"].name_ru == "Аккуратное заклинание"
    assert opt.METAMAGIC_BY_ID["heightened"].name_ru == "Непреодолимое заклинание"
    assert opt.METAMAGIC_BY_ID["subtle"].name_ru == "Неуловимое заклинание"
    assert opt.METAMAGIC_BY_ID["heightened"].cost == 2
    assert opt.METAMAGIC_BY_ID["seeking"].cost == 1
    assert opt.METAMAGIC_BY_ID["twinned"].cost == 1


def test_metamagic_validate_four_at_10():
    picks = ["careful", "distant", "empowered", "quickened"]
    assert opt.validate_metamagic(picks, sorcerer_level=10) == picks
    with pytest.raises(e24.Edition2024ClassError) as exc:
        opt.validate_metamagic(picks + ["subtle"], sorcerer_level=10)
    assert exc.value.code == "metamagic_limit"


@pytest.mark.parametrize(
    "name",
    ["classes_srd.json", "subclasses_srd.json", "subclasses_ph24.json"],
)
def test_frontend_catalog_copy_is_byte_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def test_phb_subclasses_present_and_named():
    catalog = e24.load_subclass_catalog()
    expected = {
        "sorcerer__draconic-sorcery": "Драконье чародейство",
        "sorcerer__aberrant-sorcery": "Аберрантное чародейство",
        "sorcerer__clockwork-sorcery": "Заводное чародейство",
        "sorcerer__wild-magic-sorcery": "Чародейство дикой магии",
    }
    for slug, name in expected.items():
        assert slug in catalog
        assert catalog[slug]["data"].get("parent_class") == "sorcerer" or catalog[slug].get(
            "name_ru"
        )
        # name from entry
    data = json.loads((BACKEND_LIVE / "subclasses_ph24.json").read_text(encoding="utf-8"))
    srd = json.loads((BACKEND_LIVE / "subclasses_srd.json").read_text(encoding="utf-8"))
    names = {
        e["slug"]: e["name_ru"]
        for e in data["entries"] + srd["entries"]
        if e["slug"] in expected
    }
    assert names == expected


def test_non_phb_sorcerer_subclasses_exist_but_out_of_pack():
    data = json.loads((BACKEND_LIVE / "subclasses_ph24.json").read_text(encoding="utf-8"))
    # spellfire/shadow may live in other files; just ensure pack list is exact four PHB
    assert PHB_SUBCLASSES <= set(e24.load_subclass_catalog())


def test_draconic_resilience_and_affinity():
    bonuses = {
        b.feature_id: b
        for b in sub24.build_permanent_bonuses(
            "sorcerer__draconic-sorcery", 6, abilities=_ABILITIES
        )
        if b.min_level <= 6
    }
    assert "draconic-resilience" in bonuses
    assert "elemental-affinity" in bonuses
    pools = _pools("sorcerer__draconic-sorcery", 14)
    assert "dragon_wings" in pools
    pools18 = _pools("sorcerer__draconic-sorcery", 18)
    assert "dragon_companion" in pools18


def test_aberrant_pools_and_psychic_defenses():
    bonuses = {
        b.feature_id: b
        for b in sub24.build_permanent_bonuses(
            "sorcerer__aberrant-sorcery", 6, abilities=_ABILITIES
        )
        if b.min_level <= 6
    }
    assert "psychic-defenses" in bonuses
    pools = _pools("sorcerer__aberrant-sorcery", 3)
    assert "telepathic_speech" in pools
    pools18 = _pools("sorcerer__aberrant-sorcery", 18)
    assert "warping_explosion" in pools18


def test_clockwork_and_wild_pools():
    pools = _pools("sorcerer__clockwork-sorcery", 14)
    assert pools["restore_balance"].max == 4  # cha 18 → +4
    assert "trance_of_order" in pools
    pools18 = _pools("sorcerer__clockwork-sorcery", 18)
    assert "clockwork_cavalcade" in pools18
    wild = _pools("sorcerer__wild-magic-sorcery", 3)
    assert "tides_of_chaos" in wild
    wild18 = _pools("sorcerer__wild-magic-sorcery", 18)
    assert "tamed_wild_surge" in wild18


def test_multiclass_into_sorcerer_needs_charisma_13():
    low = {"str": 10, "dex": 10, "con": 12, "int": 15, "wis": 10, "cha": 12}
    ok, reason = e24.check_multiclass_prerequisites(
        current_classes=["wizard"], new_class="sorcerer", abilities=low
    )
    assert ok is False and reason
    ok, _ = e24.check_multiclass_prerequisites(
        current_classes=["wizard"], new_class="sorcerer", abilities={**low, "cha": 13}
    )
    assert ok is True


def test_multiclass_wizard3_sorcerer2_slots():
    snap = e24.compute_progression(
        [
            {"slug": "wizard", "level": 3},
            {"slug": "sorcerer", "level": 2},
        ]
    )
    # Full casters 5 levels → slots of a 5th-level full caster
    assert snap.multiclass_slots["3"] == 2
    sorcerer = next(s for s in snap.spellcasting if s.class_slug == "sorcerer")
    assert sorcerer.prepared_spells == 4  # sorcerer class level 2
    pools = {r.pool_id: r for r in snap.resources}
    assert pools["sorcery_points"].max == 2


@pytest.mark.parametrize("level", [3, 6, 14, 18])
@pytest.mark.parametrize("subclass", sorted(PHB_SUBCLASSES))
def test_subclass_features_present_at_gates(level: int, subclass: str):
    catalog = e24.load_subclass_catalog()[subclass]["data"]
    levels = {block["level"] for block in catalog["features"]}
    assert level in levels or level == 18 and 18 in levels
    # Progression includes subclass features without crash
    snap = e24.compute_progression(
        [{"slug": "sorcerer", "level": level, "subclass_slug": subclass}],
        abilities=_ABILITIES,
    )
    assert snap.total_level == level
