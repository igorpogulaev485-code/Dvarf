"""P24-M02B-bard: FRHoF Moon + RTW Spirits — pools, names, create-at, rollbacks, PHB intact."""

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
from tests.test_p24_m03_create import _spell_pick, build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

MOON = "bard__college-of-the-moon"
SPIRITS = "bard__college-of-the-spirits"
BOOK_SLUGS = (MOON, SPIRITS)
CHECKPOINT_LEVELS = (3, 5, 6, 11, 14, 20)

# CHA-heavy bard
_ABILITIES = {"str": 8, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 16}

FORBIDDEN_2024_LIVING = (
    "Духи извне",
    "Сказания извне",
    "Сеанс духов",
)


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("name", ["subclasses_frhof.json", "subclasses_rtw.json"])
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


def test_moon_catalog_names_and_summaries():
    entry = _entry(MOON, "subclasses_frhof.json")
    assert entry["name_ru"] == "Коллегия луны"
    blob = json.dumps(entry, ensure_ascii=False)
    for bad in FORBIDDEN_2024_LIVING:
        assert bad not in blob
    by_id = _feat_map(MOON, "subclasses_frhof.json")
    assert by_id["moons-inspiration"]["name_ru"] == "Вдохновение луны"
    moon = by_id["moons-inspiration"]["summary_ru"]
    assert "…" not in moon
    assert len(moon) > 200
    assert "Вдохновенное затмение" in moon
    assert "Лунная живучесть" in moon
    primal = by_id["primal-lore"]["summary_ru"]
    assert "…" not in primal
    assert len(primal) > 120
    assert "Друидический" in primal
    bless = by_id["blessing-of-moonlight"]["summary_ru"]
    assert "…" not in bless
    assert "Лунный луч" in bless
    assert len(bless) > 150
    eventide = by_id["eventides-splendor"]["summary_ru"]
    assert "…" not in eventide
    assert "Тень новолуния" in eventide or "Резонанс полнолуния" in eventide


def test_spirits_catalog_names_forbidden_and_summaries():
    entry = _entry(SPIRITS, "subclasses_rtw.json")
    assert entry["name_ru"] == "Коллегия духов"
    blob = json.dumps(entry, ensure_ascii=False)
    for bad in FORBIDDEN_2024_LIVING:
        assert bad not in blob
    by_id = _feat_map(SPIRITS, "subclasses_rtw.json")
    assert by_id["channeler"]["name_ru"] == "Проводник"
    assert by_id["spirits-from-beyond"]["name_ru"] == "Замогильные духи"
    assert by_id["empowered-channeling"]["name_ru"] == "Улучшенный призыв"
    channeler = by_id["channeler"]["summary_ru"]
    assert "…" not in channeler
    assert len(channeler) > 200
    assert "Указание" in channeler
    spirits = by_id["spirits-from-beyond"]["summary_ru"]
    assert "…" not in spirits
    assert len(spirits) > 400
    assert "Управляемый призыв" in spirits
    empowered = by_id["empowered-channeling"]["summary_ru"]
    assert "…" not in empowered
    assert "Духовные стражи" in empowered
    assert len(empowered) > 200
    mystic = by_id["mystical-connection"]["summary_ru"]
    assert "…" not in mystic
    assert len(mystic) > 80


def _pools(slug: str, level: int) -> dict[str, object]:
    return {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            slug, level, total_level=level, abilities=_ABILITIES
        )
    }


def test_moonlight_blessing_pool_at_6():
    assert _pools(MOON, 5).get("moonlight_blessing") is None
    row = _pools(MOON, 6)["moonlight_blessing"]
    assert row.name_ru == "Благословение лунного света"
    assert row.max == 1
    assert row.reset == "long"


def test_spirit_guardians_pools_at_6():
    assert _pools(SPIRITS, 5).get("spirit_guardians_free") is None
    assert _pools(SPIRITS, 5).get("spirit_guardians_cover") is None
    free = _pools(SPIRITS, 6)["spirit_guardians_free"]
    assert free.name_ru == "Духовные стражи (без ячейки)"
    assert free.max == 1
    assert free.reset == "long"
    cover = _pools(SPIRITS, 6)["spirit_guardians_cover"]
    assert cover.name_ru == "Проявление духов (укрытие)"
    assert cover.max == 1
    assert cover.reset == "short"


def test_book_shared_options():
    moon = {o.feature_id: o for o in sub24.shared_options_for_subclass(MOON, 6)}
    assert moon["moons-inspiration"].kind == "bonus"
    assert moon["moons-inspiration"].name_ru == "Вдохновение луны"
    spirits = {o.feature_id: o for o in sub24.shared_options_for_subclass(SPIRITS, 6)}
    assert spirits["spirits-from-beyond"].kind == "bonus"
    assert spirits["spirits-from-beyond"].name_ru == "Замогильные духи"
    assert "Духи извне" not in spirits["spirits-from-beyond"].name_ru


def test_moon_always_prepared_moonbeam():
    assert "moonbeam" not in sub24.always_prepared_for_subclass(MOON, 5)
    free6 = sub24.always_prepared_for_subclass(MOON, 6)
    assert "moonbeam" in free6
    free14 = sub24.always_prepared_for_subclass(MOON, 14)
    assert "moonbeam" in free14


def test_spirits_always_prepared_spirit_guardians():
    assert "spirit-guardians" not in sub24.always_prepared_for_subclass(SPIRITS, 5)
    free6 = sub24.always_prepared_for_subclass(SPIRITS, 6)
    assert "spirit-guardians" in free6
    free14 = sub24.always_prepared_for_subclass(SPIRITS, 14)
    assert "spirit-guardians" in free14


@pytest.mark.parametrize("slug", BOOK_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_book_subclass_checkpoints(slug: str, level: int):
    snap = e24.compute_progression(
        [{"slug": "bard", "level": level, "subclass_slug": slug}],
        abilities=_ABILITIES,
    )
    assert snap.total_level == level
    if level >= 3:
        assert any(f.source == "subclass" for f in snap.features), slug
    else:
        assert not any(f.source == "subclass" for f in snap.features)


def _spells_for(level: int) -> tuple[list[str], list[str]]:
    snap = e24.compute_progression(
        [{"slug": "bard", "level": level}],
        abilities=_ABILITIES,
    )
    block = snap.spellcasting[0]
    cantrips = _spell_pick("bard", 0, int(block.cantrips or 0))
    need = int(block.prepared_spells or 0)
    prepared: list[str] = []
    for circle in range(9, 0, -1):
        for slug in _spell_pick("bard", circle, 40):
            if slug not in prepared:
                prepared.append(slug)
            if len(prepared) >= need:
                break
        if len(prepared) >= need:
            break
    return cantrips, prepared[:need]


def _expertise_for(level: int, class_skills: list[str]) -> list[str]:
    need = 4 if level >= 9 else 2 if level >= 2 else 0
    if need == 0:
        return []
    pool: list[str] = []
    for skill in [*class_skills, "performance", "persuasion", "deception", "insight"]:
        if skill not in pool:
            pool.append(skill)
    return pool[:need]


def _book_option_picks(level: int, subclass: str, class_skills: list[str]) -> dict[str, object]:
    picks: dict[str, object] = {}
    expertise = _expertise_for(level, class_skills)
    if expertise:
        picks["expertise"] = expertise
    if subclass == MOON and level >= 3:
        picks["primal_lore_skill"] = "nature"
        picks["primal_lore_cantrip"] = "druidcraft"
    return picks


def _bard_payload(level: int, subclass: str) -> dict:
    cantrips, prepared = _spells_for(level)
    payload = build_valid_payload(
        "bard",
        ability_method="manual",
        base_abilities=dict(_ABILITIES),
        class_levels=[
            {
                "slug": "bard",
                "level": level,
                "subclass_slug": subclass if level >= 3 else None,
            }
        ],
        cantrip_ids=cantrips,
        prepared_spell_ids=prepared,
    )
    picks = dict(payload.get("class_option_picks") or {})
    picks.update(_book_option_picks(level, subclass, list(payload["class_skill_ids"])))
    payload["class_option_picks"] = picks
    return payload


@pytest.mark.parametrize("slug", BOOK_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_create_at_book_paths(slug: str, level: int):
    payload = _bard_payload(level, slug)
    if slug == SPIRITS:
        assert "primal_lore_skill" not in (payload.get("class_option_picks") or {})
        assert "primal_lore_cantrip" not in (payload.get("class_option_picks") or {})
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sum(int(r["level"]) for r in sheet["classes"]) == level
    if level >= 3:
        assert sheet["classes"][0].get("subclass_slug") == slug
    if slug == MOON and level >= 3:
        picks = (sheet.get("feature_picks") or {}).get("values") or {}
        assert picks.get("class-bard:primal_lore_skill") == "nature"
        assert "druidcraft" in str(picks.get("class-bard:primal_lore_cantrip") or "")


@pytest.mark.parametrize(
    "slug,from_level,to_level",
    [
        (MOON, 3, 2),
        (SPIRITS, 3, 2),
        (MOON, 6, 5),
        (SPIRITS, 6, 5),
        (MOON, 11, 10),
        (SPIRITS, 11, 10),
        (MOON, 14, 13),
        (SPIRITS, 14, 13),
        (MOON, 20, 19),
        (SPIRITS, 20, 19),
    ],
)
def test_book_bard_rollbacks(slug: str, from_level: int, to_level: int):
    payload = _bard_payload(from_level, slug)
    sheet = deepcopy(
        create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    )
    assert sum(int(r["level"]) for r in sheet["classes"]) == from_level
    if from_level >= 3:
        assert sheet["classes"][0].get("subclass_slug") == slug
    levels.rollback_last_level_gain(sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == to_level
    if to_level < 3:
        assert not sheet["classes"][0].get("subclass_slug")
        picks = (sheet.get("feature_picks") or {}).get("values") or {}
        assert "class-bard:primal_lore_skill" not in picks
        assert "class-bard:primal_lore_cantrip" not in picks
    else:
        assert sheet["classes"][0].get("subclass_slug") == slug
    if from_level == 6 and to_level == 5:
        prepared = sub24.always_prepared_for_subclass(slug, to_level)
        if slug == MOON:
            assert "moonbeam" not in prepared
        else:
            assert "spirit-guardians" not in prepared
        pools = _pools(slug, to_level)
        assert "moonlight_blessing" not in pools
        assert "spirit_guardians_free" not in pools
        assert "spirit_guardians_cover" not in pools
    if from_level == 14 and to_level == 13:
        feat_ids = {
            f.id
            for f in e24.compute_progression(
                [{"slug": "bard", "level": to_level, "subclass_slug": slug}],
                abilities=_ABILITIES,
            ).features
            if f.source == "subclass"
        }
        if slug == MOON:
            assert "eventides-splendor" not in feat_ids
        else:
            assert "mystical-connection" not in feat_ids


def test_phb_bard_lore_valor_intact():
    lore_opts = sub24.shared_options_for_subclass("bard__lore", 3)
    assert any(o.feature_id == "cutting-words" for o in lore_opts)
    valor_opts = sub24.shared_options_for_subclass("bard__valor", 3)
    assert any(o.feature_id == "combat-inspiration" for o in valor_opts)
    snap = e24.compute_progression(
        [{"slug": "bard", "level": 3, "subclass_slug": "bard__lore"}],
        abilities=_ABILITIES,
    )
    assert any(f.source == "subclass" for f in snap.features)
    glamour = _pools("bard__glamour", 3)
    assert "beguiling_magic" in glamour
    dance = sub24.build_permanent_bonuses("bard__dance", 3, abilities=_ABILITIES)
    assert any(getattr(b, "kind", None) == "ac_formula" for b in dance)
