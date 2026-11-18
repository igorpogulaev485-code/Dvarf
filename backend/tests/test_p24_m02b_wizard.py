"""P24-M02B-wizard: AU + FRHoF book wizard subclasses — pools, names, catalog, PHB intact."""

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

BOOK_SLUGS = (
    "wizard__conjurer",
    "wizard__enchanter",
    "wizard__necromancer",
    "wizard__transmuter",
    "wizard__bladesinger",
)

CHECKPOINT_LEVELS = (3, 5, 6, 10, 11, 14, 20)

_ABILITIES = {"str": 8, "dex": 14, "con": 14, "int": 16, "wis": 10, "cha": 10}
# INT 16 → mod +3


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("name", ["subclasses_au.json", "subclasses_frhof.json"])
def test_book_catalog_be_fe_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def test_undead_thralls_named_slugi_in_catalog():
    data = json.loads((BACKEND_LIVE / "subclasses_au.json").read_text(encoding="utf-8"))
    for entry in data["entries"]:
        if entry["slug"] != "wizard__necromancer":
            continue
        for block in entry["data"]["features"]:
            for feat in block["features"]:
                if feat["id"] == "undead-thralls":
                    assert feat["name_ru"] == "Неживые слуги"
                    assert "рабы" not in feat["name_ru"].lower()
                    return
    raise AssertionError("undead-thralls not found")


def test_bladesinger_catalog_is_complete_not_truncated():
    data = json.loads((BACKEND_LIVE / "subclasses_frhof.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["slug"] == "wizard__bladesinger")
    by_id = {
        feat["id"]: feat
        for block in entry["data"]["features"]
        for feat in block["features"]
    }
    song = by_id["bladesong"]["summary_ru"]
    assert "Техника фехтования" in song
    assert "модификатор Интеллекта" in song
    assert "Сосредоточенность" in song
    assert "Акробатика" in song
    assert "Магическое восстановление" in song
    assert not song.rstrip().endswith("этим оружием")

    training = by_id["training-in-war-and-song"]["summary_ru"]
    assert "Заклинательной фокусировки" in training or "фокусировк" in training.lower()
    assert "Акробатика" in training and "Выступление" in training

    extra = by_id["extra-attack"]["summary_ru"]
    assert "заговор" in extra.lower()

    defense = by_id["song-of-defense"]["summary_ru"]
    assert "5" in defense
    assert not defense.rstrip().endswith("равное")


@pytest.mark.parametrize("slug", BOOK_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_book_subclass_checkpoints(slug: str, level: int):
    snap = e24.compute_progression(
        [{"slug": "wizard", "level": level, "subclass_slug": slug}],
        abilities=_ABILITIES,
    )
    assert snap.total_level == level
    if level >= 3:
        assert any(f.source == "subclass" for f in snap.features), slug
    else:
        assert not any(f.source == "subclass" for f in snap.features)


def _pools(slug: str, level: int) -> dict[str, object]:
    return {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            slug, level, total_level=level, abilities=_ABILITIES
        )
    }


def test_conjurer_transposition_pool_is_int_mod():
    pools = _pools("wizard__conjurer", 3)
    row = pools["benign_transposition"]
    assert row.name_ru == "Безопасный перенос"
    assert row.max == 3  # INT 16
    assert row.reset == "long"
    pools14 = _pools("wizard__conjurer", 14)
    assert "splintered_summons" in pools14


def test_enchanter_hypnotic_name_and_pool():
    pools = _pools("wizard__enchanter", 3)
    row = pools["hypnotic_presence"]
    assert row.name_ru == "Гипнотизирующее присутствие"
    assert "Гипнотическое" not in row.name_ru
    assert row.max == 3
    pools6 = _pools("wizard__enchanter", 6)
    assert pools6["split_enchantment"].max == 3
    pools10 = _pools("wizard__enchanter", 10)
    assert pools10["instinctive_charm"].max == 1


def test_transmuter_stone_name():
    pools = _pools("wizard__transmuter", 3)
    assert pools["transmuters_stone"].name_ru == "Камень преобразования"
    assert "преобразителя" not in pools["transmuters_stone"].name_ru


def test_necromancer_thralls_calc_formula():
    bonuses = {
        b.feature_id: b
        for b in sub24.build_permanent_bonuses(
            "wizard__necromancer", 6, abilities=_ABILITIES
        )
    }
    row = bonuses["undead-thralls"]
    assert row.name_ru == "Неживые слуги"
    value = row.value
    assert isinstance(value, dict)
    # INT +3 + half of 6 = 3 → 6
    assert value["thrall_bonus_hp"] == 6
    assert value["thrall_damage_bonus"] == 3
    assert value.get("thrall_bonus_hp_per_wizard_level") is not True


def test_bladesinger_pools_and_calcs():
    pools = _pools("wizard__bladesinger", 3)
    assert pools["bladesong"].max == 3
    assert pools["bladesong"].name_ru == "Песнь клинка"
    bonuses = {
        b.feature_id: b
        for b in sub24.build_permanent_bonuses(
            "wizard__bladesinger", 10, abilities=_ABILITIES
        )
    }
    assert "bladesong" in bonuses
    assert bonuses["bladesong"].value.get("weapon_attack_damage_int") is True
    assert bonuses["bladesong"].value.get("acrobatics_advantage") is True
    assert bonuses["bladesong"].value.get("regain_one_on_arcane_recovery") is True
    assert "extra-attack" in bonuses
    assert bonuses["extra-attack"].value.get("replace_one_with_wizard_cantrip_action") is True
    assert "song-of-defense" in bonuses
    assert bonuses["song-of-defense"].value.get("reduce_damage_slot_level_times") == 5


def test_phb_wizard_schools_still_intact():
    for slug, pool_id, name in (
        ("wizard__abjurer", "arcane_ward", "Волшебный щит"),
        ("wizard__diviner", "portent", "Знамение"),
        ("wizard__evoker", "overchannel", "Перегрузка"),
        ("wizard__illusionist", "illusory_self", "Собственная иллюзорность"),
    ):
        level = 14 if slug == "wizard__evoker" else 10 if slug != "wizard__abjurer" else 3
        pools = _pools(slug, level)
        assert pool_id in pools
        assert pools[pool_id].name_ru == name


def test_au_savant_texts_still_free_book():
    data = json.loads((BACKEND_LIVE / "subclasses_au.json").read_text(encoding="utf-8"))
    for entry in data["entries"]:
        if entry["slug"] not in {
            "wizard__conjurer",
            "wizard__enchanter",
            "wizard__necromancer",
            "wizard__transmuter",
        }:
            continue
        for block in entry["data"]["features"]:
            for feat in block["features"]:
                if feat["id"].endswith("-savant"):
                    text = feat["summary_ru"]
                    assert "без затрат" in text or "бесплатно" in text, feat["id"]
