"""P24-M02B-fighter: Arcane Archer + Banneret («Знаменосец») — pools, names, create-at, rollbacks."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_subclasses as sub24
from app.dnd.edition_2024_create import (
    ARCANE_SHOT_OPTION_IDS_2024,
    FIGHTER_ARCANE_ARCHER_SUBCLASS_2024,
    FIGHTER_BANNERET_SUBCLASS_2024,
    _arcane_shots_known_2024,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

ARCHER = FIGHTER_ARCANE_ARCHER_SUBCLASS_2024
BANNERET = FIGHTER_BANNERET_SUBCLASS_2024
BOOK_SLUGS = (ARCHER, BANNERET)
CHECKPOINT_LEVELS = (3, 5, 7, 10, 11, 15, 18, 20)

_ABILITIES_ARCHER = {"str": 13, "dex": 15, "con": 14, "int": 14, "wis": 10, "cha": 8}
_ABILITIES_BANNERET = {"str": 15, "dex": 12, "con": 14, "int": 8, "wis": 10, "cha": 14}

FORBIDDEN_SUBCLASS_NAMES = ("Баннерет",)
ARCHER_FEATURE_NAMES = {
    "arcane-archer-lore": "Знания чародейных стрелков",
    "arcane-shot": "Чародейный выстрел",
    "curving-shot": "Странствующая стрела",
    "magical-ammunition": "Магические боеприпасы",
    "ever-ready-shot": "Заготовленный выстрел",
    "indomitable-teleport": "Неукротимая телепортация",
    "masterful-shots": "Мастерская стрельба",
}
BANNERET_FEATURE_NAMES = {
    "knightly-envoy": "Посланник рыцарства",
    "group-recovery": "Групповое оздоровление",
    "team-tactics": "Групповая тактика",
    "rallying-surge": "Воодушевляющий всплеск",
    "shared-resilience": "Устойчивость команды",
    "inspiring-commander": "Вдохновляющий командир",
}


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("name", ["subclasses_au.json", "subclasses_frhof.json"])
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


def test_archer_catalog_names():
    entry = _entry(ARCHER, "subclasses_au.json")
    assert entry["name_ru"] == "Мистический лучник"
    blob = json.dumps(entry, ensure_ascii=False)
    assert "Чародейный стрелок" not in entry["name_ru"]
    by_id = _feat_map(ARCHER, "subclasses_au.json")
    for fid, name in ARCHER_FEATURE_NAMES.items():
        assert by_id[fid]["name_ru"] == name
        assert "…" not in by_id[fid]["summary_ru"]
    ammo = by_id["magical-ammunition"]["summary_ru"]
    assert "Восприятие" in ammo
    assert "Внимательность" not in ammo
    tele = by_id["indomitable-teleport"]["summary_ru"]
    assert "Непоколебимость" in tele
    assert "Неукротимый" not in tele


def test_banneret_catalog_znamenoets_and_full_summaries():
    entry = _entry(BANNERET, "subclasses_frhof.json")
    assert entry["name_ru"] == "Знаменосец"
    for bad in FORBIDDEN_SUBCLASS_NAMES:
        assert bad not in entry["name_ru"]
    blob = json.dumps(entry, ensure_ascii=False)
    assert "Баннерет" not in blob
    by_id = _feat_map(BANNERET, "subclasses_frhof.json")
    for fid, name in BANNERET_FEATURE_NAMES.items():
        assert by_id[fid]["name_ru"] == name
        summary = by_id[fid]["summary_ru"]
        assert "…" not in summary, fid
        assert not summary.rstrip().endswith(("не", "союзни")), fid
        assert len(summary) > 120, fid
    gr = by_id["group-recovery"]["summary_ru"]
    assert "1к4" in gr
    assert "Харизмы" in gr
    assert "Короткий или Долгий" in gr
    rs = by_id["rallying-surge"]["summary_ru"]
    assert "Всплеск действий" in rs
    assert "Атака" in rs
    assert "Перемещение" in rs
    sr = by_id["shared-resilience"]["summary_ru"]
    assert "Непоколебимость" in sr
    assert "Неукротимый" not in sr
    ke = by_id["knightly-envoy"]["summary_ru"]
    assert "Харизма" in ke
    assert "24 часа" in ke


def _pools(slug: str, level: int, abilities: dict) -> dict[str, object]:
    return {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            slug, level, total_level=level, abilities=abilities
        )
    }


@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_archer_arcane_shot_pool(level: int):
    pools = _pools(ARCHER, level, _ABILITIES_ARCHER)
    if level < 3:
        assert "arcane_shot" not in pools
        return
    shot = pools["arcane_shot"]
    assert shot.max == 2  # INT 14
    assert shot.reset == "short"
    assert shot.name_ru == "Чародейный выстрел"
    if level >= 7:
        ammo = pools["magical_ammunition"]
        assert ammo.max == 1
        assert ammo.reset == "short"
    else:
        assert "magical_ammunition" not in pools
    assert _arcane_shots_known_2024(level) == {
        3: 2,
        5: 2,
        7: 3,
        10: 4,
        11: 4,
        15: 5,
        18: 6,
        20: 6,
    }[level]


@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_banneret_group_recovery_pool(level: int):
    pools = _pools(BANNERET, level, _ABILITIES_BANNERET)
    if level < 3:
        assert "group_recovery" not in pools
        return
    gr = pools["group_recovery"]
    assert gr.max == 1
    assert gr.reset == "short"
    assert gr.name_ru == "Групповое оздоровление"


def test_shared_options_banneret():
    opts3 = {o.feature_id: o for o in sub24.shared_options_for_subclass(BANNERET, 3)}
    assert "group-recovery" in opts3
    assert opts3["group-recovery"].spend_pool == "second_wind"
    opts10 = {o.feature_id: o for o in sub24.shared_options_for_subclass(BANNERET, 10)}
    assert "rallying-surge" in opts10
    assert opts10["rallying-surge"].spend_pool == "action_surge"
    opts15 = {o.feature_id: o for o in sub24.shared_options_for_subclass(BANNERET, 15)}
    assert "shared-resilience" in opts15
    assert opts15["shared-resilience"].spend_pool == "indomitable"


def test_arcane_shot_option_ids_are_vystrel_not_strela():
    for oid in ARCANE_SHOT_OPTION_IDS_2024:
        assert oid.endswith("_shot")
        assert not oid.endswith("_arrow")


def test_phb_fighter_still_disjoint_from_book_only_labels():
    # Purple dragon stays out of 2024 picker; book banneret is separate slug.
    assert ARCHER != "fighter__purple-dragon-knight"
    assert BANNERET != "fighter__purple-dragon-knight"
