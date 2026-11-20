"""P24-M02B-cleric: AU Arcana + FRHoF Knowledge + RTW Grave — pools, names, create-at, rollbacks, PHB intact."""

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

ARCANA = "cleric__arcana-domain"
KNOWLEDGE = "cleric__knowledge-domain"
GRAVE = "cleric__grave-domain"
BOOK_SLUGS = (ARCANA, KNOWLEDGE, GRAVE)
CHECKPOINT_LEVELS = (3, 5, 6, 9, 11, 17, 20)

_ABILITIES = {"str": 10, "dex": 12, "con": 14, "int": 10, "wis": 16, "cha": 10}
# WIS 16 → mod +3

FORBIDDEN_GRAVE_PATH = ("Путь в могилу",)


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("name", ["subclasses_au.json", "subclasses_frhof.json", "subclasses_rtw.json"])
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


def test_arcana_catalog_names_and_summaries():
    entry = _entry(ARCANA, "subclasses_au.json")
    assert entry["name_ru"] == "Домен магии"
    by_id = _feat_map(ARCANA, "subclasses_au.json")
    assert by_id["modify-magic"]["name_ru"] == "Изменение магии"
    modify = by_id["modify-magic"]["summary_ru"]
    assert "…" not in modify
    assert len(modify) > 120
    assert "Укрепляющее" in modify
    dispel = by_id["dispelling-recovery"]["summary_ru"]
    assert "…" not in dispel
    assert "Рассеивание магии" in dispel


def test_knowledge_catalog_names_and_summaries():
    entry = _entry(KNOWLEDGE, "subclasses_frhof.json")
    assert entry["name_ru"] == "Домен знаний"
    by_id = _feat_map(KNOWLEDGE, "subclasses_frhof.json")
    mind = by_id["mind-magic"]["summary_ru"]
    assert "…" not in mind
    assert len(mind) > 100
    assert "Прорицания" in mind or "прорицания" in mind.lower()
    fore = by_id["divine-foreknowledge"]["summary_ru"]
    assert "…" not in fore
    assert len(fore) > 80


def test_grave_catalog_names_forbidden_path_and_summaries():
    entry = _entry(GRAVE, "subclasses_rtw.json")
    assert entry["name_ru"] == "Домен упокоения"
    blob = json.dumps(entry, ensure_ascii=False)
    for bad in FORBIDDEN_GRAVE_PATH:
        assert bad not in blob
    by_id = _feat_map(GRAVE, "subclasses_rtw.json")
    assert by_id["path-to-the-grave"]["name_ru"] == "Путь к могиле"
    circle = by_id["circle-of-mortality"]["summary_ru"]
    assert "…" not in circle
    assert len(circle) > 200
    reaper = by_id["divine-reaper"]["summary_ru"]
    assert "…" not in reaper
    assert "Хранитель душ" in reaper


def _pools(slug: str, level: int) -> dict[str, object]:
    return {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            slug, level, total_level=level, abilities=_ABILITIES
        )
    }


def test_dispelling_recovery_pool_at_6():
    assert _pools(ARCANA, 5).get("dispelling_recovery") is None
    row = _pools(ARCANA, 6)["dispelling_recovery"]
    assert row.name_ru == "Рассеивающее восстановление"
    assert row.max == 1
    assert row.reset == "short"


def test_divine_foreknowledge_pool_at_17():
    assert _pools(KNOWLEDGE, 16).get("divine_foreknowledge") is None
    row = _pools(KNOWLEDGE, 17)["divine_foreknowledge"]
    assert row.name_ru == "Божественное предзнание"
    assert row.max == 1
    assert row.reset == "long"


def test_grave_sentinel_and_keeper_pools():
    assert _pools(GRAVE, 5).get("sentinel_at_deaths_door") is None
    sentinel = _pools(GRAVE, 6)["sentinel_at_deaths_door"]
    assert sentinel.name_ru == "Страж на пороге смерти"
    assert sentinel.max == 3  # WIS 16 → +3
    assert sentinel.reset == "long"

    assert _pools(GRAVE, 16).get("keeper_of_souls") is None
    keeper = _pools(GRAVE, 17)["keeper_of_souls"]
    assert keeper.name_ru == "Хранитель душ"
    assert keeper.max == 1
    assert keeper.reset == "short"


def test_book_shared_options():
    arcana = {o.feature_id: o for o in sub24.shared_options_for_subclass(ARCANA, 6)}
    assert arcana["modify-magic"].kind == "cast"
    assert arcana["modify-magic"].name_ru == "Изменение магии"
    knowledge = {o.feature_id: o for o in sub24.shared_options_for_subclass(KNOWLEDGE, 6)}
    assert knowledge["mind-magic"].kind == "action"
    assert knowledge["mind-magic"].name_ru == "Магия разума"
    grave = {o.feature_id: o for o in sub24.shared_options_for_subclass(GRAVE, 6)}
    assert grave["path-to-the-grave"].kind == "bonus"
    assert grave["path-to-the-grave"].name_ru == "Путь к могиле"


def test_arcana_always_prepared_table():
    free3 = sub24.always_prepared_for_subclass(ARCANA, 3)
    assert "magic-missile" in free3
    assert "detect-magic" in free3
    free5 = sub24.always_prepared_for_subclass(ARCANA, 5)
    assert "counterspell" in free5
    assert "dispel-magic" in free5
    free7 = sub24.always_prepared_for_subclass(ARCANA, 7)
    assert "arcane-eye" in free7
    free9 = sub24.always_prepared_for_subclass(ARCANA, 9)
    assert "bigbys-hand" in free9
    assert "teleportation-circle" in free9


def test_knowledge_always_prepared_table():
    free3 = sub24.always_prepared_for_subclass(KNOWLEDGE, 3)
    assert "detect-magic" in free3
    assert "mind-spike" in free3
    free5 = sub24.always_prepared_for_subclass(KNOWLEDGE, 5)
    assert "dispel-magic" in free5
    free7 = sub24.always_prepared_for_subclass(KNOWLEDGE, 7)
    assert "banishment" in free7
    free9 = sub24.always_prepared_for_subclass(KNOWLEDGE, 9)
    assert "legend-lore" in free9
    assert "scrying" in free9


def test_grave_always_prepared_table():
    free3 = sub24.always_prepared_for_subclass(GRAVE, 3)
    assert "false-life" in free3
    assert "spare-the-dying" in free3
    free5 = sub24.always_prepared_for_subclass(GRAVE, 5)
    assert "revivify" in free5
    free7 = sub24.always_prepared_for_subclass(GRAVE, 7)
    assert "death-ward" in free7
    free9 = sub24.always_prepared_for_subclass(GRAVE, 9)
    assert "raise-dead" in free9
    assert "dispel-evil-and-good" in free9


@pytest.mark.parametrize("slug", BOOK_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_book_subclass_checkpoints(slug: str, level: int):
    snap = e24.compute_progression(
        [{"slug": "cleric", "level": level, "subclass_slug": slug}],
        abilities=_ABILITIES,
    )
    assert snap.total_level == level
    if level >= 3:
        assert any(f.source == "subclass" for f in snap.features), slug
    else:
        assert not any(f.source == "subclass" for f in snap.features)


def _spells_for(level: int) -> tuple[list[str], list[str]]:
    snap = e24.compute_progression(
        [{"slug": "cleric", "level": level}],
        abilities=_ABILITIES,
    )
    block = snap.spellcasting[0]
    cantrips = _spell_pick("cleric", 0, int(block.cantrips or 0))
    need = int(block.prepared_spells or 0)
    prepared: list[str] = []
    for circle in range(9, 0, -1):
        for slug in _spell_pick("cleric", circle, 40):
            if slug not in prepared:
                prepared.append(slug)
            if len(prepared) >= need:
                break
        if len(prepared) >= need:
            break
    return cantrips, prepared[:need]


def _book_option_picks(level: int, subclass: str) -> dict[str, object]:
    picks: dict[str, object] = {"divine_order": "thaumaturge"}
    if level >= 7:
        picks["blessed_strikes"] = "potent_spellcasting"
    if subclass == ARCANA and level >= 3:
        picks["student_of_arcana_skill"] = "arcana"
        picks["student_of_arcana_cantrips"] = ["mage-hand", "prestidigitation"]
    if subclass == ARCANA and level >= 17:
        picks["magical_mastery_6"] = "disintegrate"
        picks["magical_mastery_7"] = "teleport"
        picks["magical_mastery_8"] = "mind-blank"
        picks["magical_mastery_9"] = "foresight"
    if subclass == KNOWLEDGE and level >= 3:
        picks["blessings_of_knowledge_tool"] = "calligraphers-supplies"
        picks["blessings_of_knowledge_skills"] = ["history", "arcana"]
    if subclass == KNOWLEDGE and level >= 6:
        picks["unfettered_mind_save"] = "cha"
    return picks


def _cleric_payload(level: int, subclass: str) -> dict:
    cantrips, prepared = _spells_for(level)
    payload = build_valid_payload(
        "cleric",
        ability_method="manual",
        base_abilities=dict(_ABILITIES),
        class_levels=[
            {
                "slug": "cleric",
                "level": level,
                "subclass_slug": subclass if level >= 3 else None,
            }
        ],
        cantrip_ids=cantrips,
        prepared_spell_ids=prepared,
    )
    picks = dict(payload.get("class_option_picks") or {})
    picks.update(_book_option_picks(level, subclass))
    payload["class_option_picks"] = picks
    return payload


@pytest.mark.parametrize("slug", BOOK_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_create_at_book_paths(slug: str, level: int):
    payload = _cleric_payload(level, slug)
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sum(int(r["level"]) for r in sheet["classes"]) == level
    if level >= 3:
        assert sheet["classes"][0].get("subclass_slug") == slug
    if slug == ARCANA and level >= 3:
        picks = (sheet.get("feature_picks") or {}).get("values") or {}
        assert picks.get("class-cleric:student_of_arcana_skill") == "arcana"
        cantrips = str(picks.get("class-cleric:student_of_arcana_cantrips") or "")
        assert "mage-hand" in cantrips and "prestidigitation" in cantrips


@pytest.mark.parametrize(
    "slug,from_level,to_level",
    [
        (ARCANA, 3, 2),
        (KNOWLEDGE, 11, 10),
        (ARCANA, 17, 16),
        (GRAVE, 20, 19),
    ],
)
def test_book_cleric_rollbacks(slug: str, from_level: int, to_level: int):
    payload = _cleric_payload(from_level, slug)
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
    else:
        assert sheet["classes"][0].get("subclass_slug") == slug
    if from_level == 17 and to_level == 16 and slug == ARCANA:
        feat_ids = {
            f.id
            for f in e24.compute_progression(
                [{"slug": "cleric", "level": to_level, "subclass_slug": slug}],
                abilities=_ABILITIES,
            ).features
            if f.source == "subclass"
        }
        assert "magical-mastery" not in feat_ids
    if from_level == 11 and to_level == 10 and slug == GRAVE:
        feat_ids = {
            f.id
            for f in e24.compute_progression(
                [{"slug": "cleric", "level": to_level, "subclass_slug": slug}],
                abilities=_ABILITIES,
            ).features
            if f.source == "subclass"
        }
        assert "divine-reaper" not in feat_ids


def test_phb_cleric_life_intact():
    life_opts = sub24.shared_options_for_subclass("cleric__life-domain", 3)
    assert any(o.feature_id == "preserve-life" for o in life_opts)
    prepared = sub24.always_prepared_for_subclass("cleric__life-domain", 5)
    assert "bless" in prepared
    assert "cure-wounds" in prepared
    snap = e24.compute_progression(
        [{"slug": "cleric", "level": 3, "subclass_slug": "cleric__life-domain"}],
        abilities=_ABILITIES,
    )
    assert any(f.source == "subclass" for f in snap.features)
    light = _pools("cleric__light-domain", 3)
    assert "warding_flare" in light
    war = _pools("cleric__war-domain", 3)
    assert war["war_priest"].name_ru == "Боевой священник"