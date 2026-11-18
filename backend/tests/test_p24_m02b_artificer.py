"""P24-M02B-artificer: EFA five + RTW Reanimator — pools, names, rollbacks, PHB/EFA intact."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_subclasses as sub24

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

ALCHEMIST = "artificer__alchemist"
ARMORER = "artificer__armorer"
ARTILLERIST = "artificer__artillerist"
BATTLE_SMITH = "artificer__battle-smith"
CARTOGRAPHER = "artificer__cartographer"
REANIMATOR = "artificer__reanimator"

BOOK_SLUGS = (
    ALCHEMIST,
    ARMORER,
    ARTILLERIST,
    BATTLE_SMITH,
    CARTOGRAPHER,
    REANIMATOR,
)
CHECKPOINT_LEVELS = (3, 5, 9, 11, 15, 20)

_ABILITIES = {"str": 10, "dex": 12, "con": 14, "int": 16, "wis": 10, "cha": 8}
# INT 16 → +3
_INT_MOD = 3

EFA_NAMES = {
    ALCHEMIST: "Алхимик",
    ARMORER: "Бронник",
    ARTILLERIST: "Артиллерист",
    BATTLE_SMITH: "Боевой кузнец",
    CARTOGRAPHER: "Картограф",
}

REANIMATOR_FEATURE_NAMES = {
    "reanimator-spells": "Заклинания Реаниматора",
    "reanimator-s-skill-set": "Навыки Реаниматора",
    "reanimated-companion": "Реанимированный спутник",
    "strange-modifications": "Чуждые модификации",
    "improved-reanimation": "Улучшенная реанимация",
    "macabre-modifications": "Ужасные модификации",
    "refined-reanimation": "Отточенная реанимация",
}

FORBIDDEN_COMPANION_LABEL = "Оживлённый спутник"


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("name", ["subclasses_efa.json", "subclasses_rtw.json"])
def test_book_catalog_be_fe_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def _entry(slug: str, file_name: str) -> dict:
    data = json.loads((BACKEND_LIVE / file_name).read_text(encoding="utf-8"))
    return next(e for e in data["entries"] if e["slug"] == slug)


def _feat_map(slug: str, file_name: str) -> dict[str, dict]:
    entry = _entry(slug, file_name)
    return {
        feat["id"]: feat
        for block in entry["data"]["features"]
        for feat in block["features"]
    }


def test_reanimator_catalog_names_and_full_summaries():
    entry = _entry(REANIMATOR, "subclasses_rtw.json")
    assert entry["name_ru"] == "Реаниматор"
    blob = json.dumps(entry, ensure_ascii=False)
    assert FORBIDDEN_COMPANION_LABEL not in blob
    by_id = _feat_map(REANIMATOR, "subclasses_rtw.json")
    for fid, name in REANIMATOR_FEATURE_NAMES.items():
        assert by_id[fid]["name_ru"] == name
        summary = by_id[fid]["summary_ru"]
        assert "…" not in summary, fid
        assert len(summary) > 120, fid
        assert FORBIDDEN_COMPANION_LABEL not in summary, fid
    improved = by_id["improved-reanimation"]["summary_ru"]
    assert "4к4" in improved
    macabre = by_id["macabre-modifications"]["summary_ru"]
    assert "два" in macabre.lower()
    refined = by_id["refined-reanimation"]["summary_ru"]
    assert "Оживление" in refined
    assert "три" in refined.lower()


def test_efa_artificer_subclass_names():
    data = json.loads((BACKEND_LIVE / "subclasses_efa.json").read_text(encoding="utf-8"))
    names = {
        e["slug"]: e["name_ru"]
        for e in data["entries"]
        if e["slug"].startswith("artificer__")
    }
    assert names == EFA_NAMES
    assert REANIMATOR not in names


def _pools(slug: str, level: int) -> dict[str, object]:
    return {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            slug, level, total_level=level, abilities=_ABILITIES
        )
    }


@pytest.mark.parametrize("slug", BOOK_SLUGS)
def test_forbidden_companion_label_never_in_pool_name_ru(slug: str):
    for level in CHECKPOINT_LEVELS:
        for row in _pools(slug, level).values():
            assert FORBIDDEN_COMPANION_LABEL not in row.name_ru
            assert FORBIDDEN_COMPANION_LABEL not in (row.name_ru or "")


def test_rollback_thresholds_no_early_subclass_pools():
    for slug in BOOK_SLUGS:
        assert _pools(slug, 2) == {}
        # L4: no L5-only elixir scaling bump / L9+ / L15+ pools
        p4 = _pools(slug, 4)
        assert "restorative_reagents" not in p4
        assert "arcane_jolt" not in p4
        assert "chemical_mastery_cauldron" not in p4
        assert "eased_raise_dead" not in p4
        if slug == ALCHEMIST:
            assert p4["experimental_elixir"].max == 2  # L5-only bump to 3
        if slug == ARTILLERIST:
            assert p4["eldritch_cannon"].max == 1

        p8 = _pools(slug, 8)
        assert "restorative_reagents" not in p8
        assert "arcane_jolt" not in p8
        assert "chemical_mastery_cauldron" not in p8
        assert "eased_raise_dead" not in p8

        p14 = _pools(slug, 14)
        assert "chemical_mastery_cauldron" not in p14
        assert "eased_raise_dead" not in p14
        if slug == ARTILLERIST:
            assert p14["eldritch_cannon"].max == 1
        if slug == ALCHEMIST:
            assert p14["experimental_elixir"].max == 4  # L15 bumps to 5


def test_alchemist_pools_by_level():
    assert _pools(ALCHEMIST, 3)["experimental_elixir"].max == 2
    assert _pools(ALCHEMIST, 3)["experimental_elixir"].name_ru == "Экспериментальный эликсир"
    assert _pools(ALCHEMIST, 5)["experimental_elixir"].max == 3
    assert "restorative_reagents" not in _pools(ALCHEMIST, 5)
    p9 = _pools(ALCHEMIST, 9)
    assert p9["experimental_elixir"].max == 4
    assert p9["restorative_reagents"].name_ru == "Восстанавливающие реагенты"
    assert p9["restorative_reagents"].max == _INT_MOD
    assert "chemical_mastery_cauldron" not in p9
    p15 = _pools(ALCHEMIST, 15)
    assert p15["experimental_elixir"].max == 5
    assert p15["chemical_mastery_cauldron"].name_ru == "Бурлящий котёл Таши"
    assert p15["chemical_mastery_cauldron"].max == 1
    assert _pools(ALCHEMIST, 20)["experimental_elixir"].max == 5


def test_artillerist_eldritch_cannon_max():
    for level in (3, 5, 9, 11, 14):
        cannon = _pools(ARTILLERIST, level)["eldritch_cannon"]
        assert cannon.name_ru == "Мистическая пушка"
        assert cannon.max == 1, level
    for level in (15, 20):
        assert _pools(ARTILLERIST, level)["eldritch_cannon"].max == 2, level


def test_cartographer_atlas_max_formula():
    atlas = _pools(CARTOGRAPHER, 3)["adventure_atlas"]
    assert atlas.name_ru == "Атлас приключений"
    assert atlas.max == max(2, 1 + _INT_MOD)
    faerie = _pools(CARTOGRAPHER, 3)["mapping_faerie_fire"]
    assert faerie.name_ru == "Магия карты (Огонь фей)"
    assert faerie.max == max(1, _INT_MOD)
    # Low INT: floor at 2 for atlas
    low = {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            CARTOGRAPHER,
            3,
            total_level=3,
            abilities={**_ABILITIES, "int": 10},  # +0
        )
    }
    assert low["adventure_atlas"].max == max(2, 1 + 0) == 2


def test_battle_smith_and_reanimator_and_armorer_pools():
    assert _pools(ARMORER, 3) == {}
    assert _pools(ARMORER, 15) == {}

    bs3 = _pools(BATTLE_SMITH, 3)
    assert bs3["steel_defender"].name_ru == "Стальной защитник"
    assert bs3["steel_defender"].max == 1
    assert "arcane_jolt" not in bs3
    bs9 = _pools(BATTLE_SMITH, 9)
    assert bs9["arcane_jolt"].name_ru == "Магический импульс"
    assert bs9["arcane_jolt"].max == _INT_MOD

    r3 = _pools(REANIMATOR, 3)
    assert r3["reanimated_companion"].name_ru == "Реанимированный спутник"
    assert r3["reanimated_companion"].max == 1
    assert r3["reviving_bolt"].name_ru == "Оживляющий разряд"
    assert r3["reviving_bolt"].max == _INT_MOD
    assert "eased_raise_dead" not in r3
    r15 = _pools(REANIMATOR, 15)
    assert r15["eased_raise_dead"].name_ru == "Облегчённое воскрешение"
    assert r15["eased_raise_dead"].max == 1


@pytest.mark.parametrize("slug", BOOK_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_pools_checkpoints_key_names(slug: str, level: int):
    pools = _pools(slug, level)
    if slug == ALCHEMIST:
        assert pools["experimental_elixir"].name_ru == "Экспериментальный эликсир"
        expected = {3: 2, 5: 3, 9: 4, 11: 4, 15: 5, 20: 5}[level]
        assert pools["experimental_elixir"].max == expected
        if level >= 9:
            assert "restorative_reagents" in pools
        if level >= 15:
            assert "chemical_mastery_cauldron" in pools
    elif slug == ARMORER:
        assert pools == {}
    elif slug == ARTILLERIST:
        assert pools["eldritch_cannon"].name_ru == "Мистическая пушка"
        assert pools["eldritch_cannon"].max == (2 if level >= 15 else 1)
    elif slug == BATTLE_SMITH:
        assert pools["steel_defender"].name_ru == "Стальной защитник"
        if level >= 9:
            assert pools["arcane_jolt"].max == _INT_MOD
    elif slug == CARTOGRAPHER:
        assert pools["adventure_atlas"].max == max(2, 1 + _INT_MOD)
        assert pools["mapping_faerie_fire"].max == max(1, _INT_MOD)
    elif slug == REANIMATOR:
        assert pools["reanimated_companion"].name_ru == "Реанимированный спутник"
        assert pools["reviving_bolt"].max == _INT_MOD
        if level >= 15:
            assert "eased_raise_dead" in pools
        else:
            assert "eased_raise_dead" not in pools


def test_reanimator_always_prepared_thresholds():
    assert set(sub24.always_prepared_for_subclass(REANIMATOR, 3)) >= {
        "witch-bolt",
        "false-life",
        "spare-the-dying",
    }
    assert "blindness-deafness" not in sub24.always_prepared_for_subclass(REANIMATOR, 4)
    assert "blindness-deafness" in sub24.always_prepared_for_subclass(REANIMATOR, 5)
    assert "enhance-ability" in sub24.always_prepared_for_subclass(REANIMATOR, 5)
    assert "lightning-bolt" in sub24.always_prepared_for_subclass(REANIMATOR, 9)
    assert "animate-dead" in sub24.always_prepared_for_subclass(REANIMATOR, 9)
    assert "death-ward" in sub24.always_prepared_for_subclass(REANIMATOR, 13)
    assert "blight" in sub24.always_prepared_for_subclass(REANIMATOR, 13)
    assert "raise-dead" in sub24.always_prepared_for_subclass(REANIMATOR, 17)
    assert "antilife-shell" in sub24.always_prepared_for_subclass(REANIMATOR, 17)


@pytest.mark.parametrize("slug", BOOK_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_book_subclass_progression_features(slug: str, level: int):
    snap = e24.compute_progression(
        [{"slug": "artificer", "level": level, "subclass_slug": slug}],
        abilities=_ABILITIES,
    )
    assert snap.total_level == level
    names = {f.name_ru for f in snap.features if f.source == "subclass"}
    if level >= 3:
        assert any(f.source == "subclass" for f in snap.features), slug
    if slug == ALCHEMIST and level >= 3:
        assert "Экспериментальный эликсир" in names
    if slug == ALCHEMIST and level >= 15:
        assert "Химическое мастерство" in names
    if slug == ARTILLERIST and level >= 3:
        assert "Мистическая пушка" in names
    if slug == BATTLE_SMITH and level >= 3:
        assert "Стальной защитник" in names
    if slug == CARTOGRAPHER and level >= 3:
        assert "Атлас приключений" in names
    if slug == REANIMATOR and level >= 3:
        assert "Реанимированный спутник" in names
        assert FORBIDDEN_COMPANION_LABEL not in names
    if slug == REANIMATOR and level >= 15:
        assert "Отточенная реанимация" in names
    # Class flash-of-genius still present at 7+; smoke that class pools exist.
    if level >= 7:
        assert any(r.pool_id == "flash_of_genius" for r in snap.resources)


def test_efa_alchemist_phb_path_intact():
    """Existing EFA pack still resolves — do not regress M02 artificer."""
    snap = e24.compute_progression(
        [{"slug": "artificer", "level": 9, "subclass_slug": ALCHEMIST}],
        abilities=_ABILITIES,
    )
    names = {f.name_ru for f in snap.features}
    assert "Экспериментальный эликсир" in names
    assert "Восстанавливающие реагенты" in names
    pools = _pools(ALCHEMIST, 9)
    assert pools["experimental_elixir"].max == 4
    assert pools["restorative_reagents"].max == _INT_MOD
