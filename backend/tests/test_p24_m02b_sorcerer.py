"""P24-M02B-sorcerer: FRHoF Spellfire + RTW Shadow — pools, names, catalog, PHB intact."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_create_levels as levels
from app.dnd import edition_2024_subclasses as sub24
from tests.test_p24_m03_create import build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

BOOK_SLUGS = (
    "sorcerer__spellfire-sorcery",
    "sorcerer__shadow-sorcery",
)

CHECKPOINT_LEVELS = (3, 5, 6, 11, 14, 18, 20)

_ABILITIES = {"str": 8, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 16}
# CHA 16 → mod +3


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("name", ["subclasses_frhof.json", "subclasses_rtw.json"])
def test_book_catalog_be_fe_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def _feat_map(slug: str, file_name: str) -> dict[str, dict]:
    data = json.loads((BACKEND_LIVE / file_name).read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["slug"] == slug)
    return {
        feat["id"]: feat
        for block in entry["data"]["features"]
        for feat in block["features"]
    }


def test_spellfire_catalog_complete_names_and_formulas():
    by_id = _feat_map("sorcerer__spellfire-sorcery", "subclasses_frhof.json")
    burst = by_id["spellfire-burst"]["summary_ru"]
    assert by_id["spellfire-burst"]["name_ru"] == "Прорыв чаропламени"
    assert "Вспышка огня заклинаний" not in burst
    assert "Поддерживающие огни" in burst
    assert "Сияющее пламя" in burst
    assert "модификатор Харизмы" in burst
    assert "…" not in burst and not burst.rstrip().endswith("модифи")

    absorb = by_id["absorb-spells"]["summary_ru"]
    assert "Контрзаклинание" in absorb
    assert "1к4" in absorb

    honed = by_id["honed-spellfire"]["summary_ru"]
    assert "1к8" in honed
    assert "Поддерживающими огнями" in honed
    assert not honed.rstrip().endswith("Подд")

    crown = by_id["crown-of-spellfire"]["summary_ru"]
    assert "Горящая жизнь" in crown
    assert "Полёт" in crown
    assert "Избежание заклятий" in crown
    assert "5 Очков чародейства" in crown
    assert "…" not in crown


def test_shadow_catalog_complete_names_and_formulas():
    by_id = _feat_map("sorcerer__shadow-sorcery", "subclasses_rtw.json")
    power = by_id["power-of-shadow"]["summary_ru"]
    assert "Глаза тьмы" in power
    assert "120" in power and "10" in power
    assert "Сила могилы" in power
    assert "Сл 5" in power
    assert not power.rstrip().endswith("до")

    beasts = by_id["beasts-of-ill-omen"]["summary_ru"]
    assert by_id["beasts-of-ill-omen"]["name_ru"] == "Звери дурных знамений"
    assert "Звери дурного знамения" not in beasts
    assert "3 Очка" in beasts or "3 очка" in beasts.lower()
    assert "Призыв духа зверя" in beasts or "Вызов зверя" in beasts
    assert "Концентрации" in beasts or "концентрации" in beasts.lower()

    walk = by_id["shadow-walk"]["summary_ru"]
    assert "120" in walk
    assert "Тусклого света" in walk or "тусклого" in walk.lower()

    umbral = by_id["umbral-form"]["summary_ru"]
    assert "Теневая устойчивость" in umbral
    assert "Бестелесное перемещение" in umbral
    assert "6 Очков" in umbral or "6 очков" in umbral.lower()


@pytest.mark.parametrize("slug", BOOK_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_book_subclass_checkpoints(slug: str, level: int):
    snap = e24.compute_progression(
        [{"slug": "sorcerer", "level": level, "subclass_slug": slug}],
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


def _bonuses(slug: str, level: int) -> dict[str, object]:
    return {
        b.feature_id: b
        for b in sub24.build_permanent_bonuses(slug, level, abilities=_ABILITIES)
    }


def test_spellfire_burst_name_and_honed_formulas():
    bonuses3 = _bonuses("sorcerer__spellfire-sorcery", 3)
    assert "spellfire-burst" in bonuses3
    assert bonuses3["spellfire-burst"].name_ru == "Прорыв чаропламени"
    value = bonuses3["spellfire-burst"].value
    assert isinstance(value, dict)
    assert value.get("radiant_damage") == "1d4"
    assert value.get("temp_hp_add_sorcerer_level") is False

    bonuses14 = _bonuses("sorcerer__spellfire-sorcery", 14)
    assert bonuses14["spellfire-burst"].value.get("radiant_damage") == "1d8"
    assert bonuses14["spellfire-burst"].value.get("temp_hp_add_sorcerer_level") is True
    assert "honed-spellfire" in bonuses14


def test_spellfire_absorb_counterspell_always_prepared():
    free3 = sub24.always_prepared_for_subclass("sorcerer__spellfire-sorcery", 3)
    assert "counterspell" not in free3
    assert "cure-wounds" in free3
    free6 = sub24.always_prepared_for_subclass("sorcerer__spellfire-sorcery", 6)
    assert "counterspell" in free6
    bonuses = _bonuses("sorcerer__spellfire-sorcery", 6)
    assert "absorb-spells" in bonuses
    assert bonuses["absorb-spells"].value.get("restore_sp_on_counterspell_fail") == "1d4"


def test_spellfire_burst_pool_on_hot_at_3():
    pools = _pools("sorcerer__spellfire-sorcery", 3)
    assert "spellfire_burst" in pools
    assert pools["spellfire_burst"].max == 1
    assert pools["spellfire_burst"].name_ru == "Прорыв чаропламени"
    assert pools["spellfire_burst"].on_hot is True
    assert _pools("sorcerer__spellfire-sorcery", 2).get("spellfire_burst") is None


def test_spellfire_crown_pool_at_18():
    pools = _pools("sorcerer__spellfire-sorcery", 18)
    assert "crown_of_spellfire" in pools
    assert pools["crown_of_spellfire"].max == 1
    assert pools["crown_of_spellfire"].name_ru == "Корона чаропламени"
    assert _pools("sorcerer__spellfire-sorcery", 17).get("crown_of_spellfire") is None


def test_shadow_grave_pool_is_one_not_cha_mod():
    pools = _pools("sorcerer__shadow-sorcery", 3)
    row = pools["power_of_shadow"]
    assert row.max == 1  # not CHA mod (+3)
    assert row.name_ru == "Сила могилы"
    bonuses = _bonuses("sorcerer__shadow-sorcery", 3)
    assert bonuses["power-of-shadow"].value.get("darkvision_ft") == 120
    assert bonuses["power-of-shadow"].value.get("blindsight_ft") == 10
    assert bonuses["power-of-shadow"].value.get("grave_hp") == 3 + 3  # cha + level


def test_shadow_beasts_and_umbral():
    bonuses6 = _bonuses("sorcerer__shadow-sorcery", 6)
    assert bonuses6["beasts-of-ill-omen"].name_ru == "Звери дурных знамений"
    assert bonuses6["beasts-of-ill-omen"].value.get("cost_sp") == 3
    assert bonuses6["beasts-of-ill-omen"].value.get("summon") == "summon-beast"

    pools14 = _pools("sorcerer__shadow-sorcery", 14)
    assert "shadow_walk" in pools14
    assert pools14["shadow_walk"].name_ru == "Хождение по теням"
    assert pools14["shadow_walk"].on_hot is True

    pools18 = _pools("sorcerer__shadow-sorcery", 18)
    assert "umbral_form" in pools18
    assert pools18["umbral_form"].max == 1
    assert "shadow-walk" in _bonuses("sorcerer__shadow-sorcery", 14)


def test_shadow_always_prepared_table():
    free3 = sub24.always_prepared_for_subclass("sorcerer__shadow-sorcery", 3)
    assert "darkness" in free3
    assert "bane" in free3
    free5 = sub24.always_prepared_for_subclass("sorcerer__shadow-sorcery", 5)
    assert "hunger-of-hadar" in free5
    free9 = sub24.always_prepared_for_subclass("sorcerer__shadow-sorcery", 9)
    assert "contagion" in free9


def test_phb_sorcerer_paths_still_intact():
    for slug, pool_id, name in (
        ("sorcerer__wild-magic-sorcery", "tides_of_chaos", "Волны хаоса"),
        ("sorcerer__clockwork-sorcery", "restore_balance", "Восстановление баланса"),
        ("sorcerer__aberrant-sorcery", "telepathic_speech", "Телепатическая речь"),
    ):
        pools = _pools(slug, 3 if pool_id != "telepathic_speech" else 3)
        assert pool_id in pools
        assert pools[pool_id].name_ru == name
    bonuses = {
        b.feature_id: b
        for b in sub24.build_permanent_bonuses(
            "sorcerer__draconic-sorcery", 3, abilities=_ABILITIES
        )
    }
    assert "draconic-resilience" in bonuses
    wild = sub24.shared_options_for_subclass("sorcerer__wild-magic-sorcery", 6)
    assert any(o.feature_id == "bend-luck" for o in wild)


def test_no_wrong_spellfire_shared_option_name():
    opts = sub24.shared_options_for_subclass("sorcerer__spellfire-sorcery", 3)
    assert opts == []
    # Beasts also moved to dialog/calc (cost 3 SP), not a 1-SP shared stub.
    shadow_opts = sub24.shared_options_for_subclass("sorcerer__shadow-sorcery", 6)
    assert all(o.feature_id != "beasts-of-ill-omen" for o in shadow_opts)


def test_vestige_companion_name_is_predtecha():
    pools = {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            "warlock__vestige-patron", 3, total_level=3, abilities=_ABILITIES
        )
    }
    assert pools["vestige_companion"].name_ru == "Спутник-предтеча"


@pytest.mark.parametrize(
    "slug,from_level,to_level",
    [
        ("sorcerer__spellfire-sorcery", 3, 2),
        ("sorcerer__shadow-sorcery", 11, 10),
        ("sorcerer__spellfire-sorcery", 18, 17),
        ("sorcerer__shadow-sorcery", 20, 19),
    ],
)
def test_book_sorcerer_rollback_levels(slug: str, from_level: int, to_level: int):
    payload = build_valid_payload(
        "sorcerer",
        ability_method="manual",
        base_abilities={"str": 8, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 15},
        class_levels=[
            {
                "slug": "sorcerer",
                "level": from_level,
                "subclass_slug": slug,
            }
        ],
    )
    sheet = deepcopy(
        create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    )
    assert sum(int(r["level"]) for r in sheet["classes"]) == from_level
    if from_level >= 3:
        assert sheet["classes"][0].get("subclass_slug") == slug
    free_before = set(sub24.always_prepared_for_subclass(slug, from_level))
    levels.rollback_last_level_gain(sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == to_level
    if to_level < 3:
        assert not sheet["classes"][0].get("subclass_slug")
    else:
        free_after = set(sub24.always_prepared_for_subclass(slug, to_level))
        # Higher-circle always-prepared from from_level must not remain as a requirement.
        assert free_after <= free_before
    if from_level == 18 and to_level == 17:
        assert "crown_of_spellfire" not in {
            p.pool_id
            for p in sub24.build_subclass_resources(
                slug, 17, total_level=17, abilities=_ABILITIES
            )
        }
