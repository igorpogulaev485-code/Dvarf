"""P24-M02B-fighter: Arcane Archer + Banneret («Знаменосец») — pools, names, create-at, rollbacks."""

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
from app.dnd.edition_2024_create import (
    ARCANE_SHOT_OPTION_IDS_2024,
    FIGHTER_ARCANE_ARCHER_SUBCLASS_2024,
    FIGHTER_BANNERET_SUBCLASS_2024,
    _arcane_shots_known_2024,
)
from tests.test_p24_m03_create import build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

ARCHER = FIGHTER_ARCANE_ARCHER_SUBCLASS_2024
BANNERET = FIGHTER_BANNERET_SUBCLASS_2024
BOOK_SLUGS = (ARCHER, BANNERET)
CHECKPOINT_LEVELS = (3, 5, 7, 10, 11, 15, 18, 20)

_ABILITIES_ARCHER = {"str": 13, "dex": 15, "con": 14, "int": 14, "wis": 10, "cha": 8}
_ABILITIES_BANNERET = {"str": 15, "dex": 12, "con": 14, "int": 8, "wis": 10, "cha": 14}
_ABILITIES_BY_SLUG = {ARCHER: _ABILITIES_ARCHER, BANNERET: _ABILITIES_BANNERET}

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
BOOK_UI_NAMES = {ARCHER: "Мистический лучник", BANNERET: "Знаменосец"}
ARCHER_FEATURE_BY_LEVEL = {
    3: {"Знания чародейных стрелков", "Чародейный выстрел"},
    7: {"Странствующая стрела", "Магические боеприпасы"},
    10: {"Заготовленный выстрел"},
    15: {"Неукротимая телепортация"},
    18: {"Мастерская стрельба"},
}
BANNERET_FEATURE_BY_LEVEL = {
    3: {"Посланник рыцарства", "Групповое оздоровление"},
    7: {"Групповая тактика"},
    10: {"Воодушевляющий всплеск"},
    15: {"Устойчивость команды"},
    18: {"Вдохновляющий командир"},
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


def _abilities_for(slug: str) -> dict[str, int]:
    return dict(_ABILITIES_BY_SLUG[slug])


def _fighter_payload(slug: str, level: int) -> dict:
    abilities = _abilities_for(slug)
    payload = build_valid_payload(
        "fighter",
        ability_method="manual",
        base_abilities=abilities,
        class_levels=[
            {
                "slug": "fighter",
                "level": level,
                "subclass_slug": slug if level >= 3 else None,
            }
        ],
        fighting_style_slug="defense",
    )
    picks = dict(payload.get("class_option_picks") or {})
    if slug == ARCHER and level >= 3:
        need = _arcane_shots_known_2024(level)
        picks["arcane_archer_lore_cantrip"] = "prestidigitation"
        picks["arcane_shot_options"] = list(ARCANE_SHOT_OPTION_IDS_2024[:need])
    if slug == BANNERET and level >= 3:
        picks["knightly_envoy_language"] = "elvish"
        picks["knightly_envoy_skill"] = "persuasion"
    payload["class_option_picks"] = picks
    payload["level"] = level
    return payload


def _feature_names(slug: str, level: int) -> set[str]:
    snap = e24.compute_progression(
        [{"slug": "fighter", "level": level, "subclass_slug": slug if level >= 3 else None}],
        abilities=_abilities_for(slug),
    )
    return {f.name_ru for f in snap.features}


@pytest.mark.parametrize("slug", BOOK_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_create_at_book_paths(slug: str, level: int):
    sheet = create24.validate_create_2024(
        create24.payload_from_dict(_fighter_payload(slug, level))
    ).sheet
    assert sheet["classes"][0]["level"] == level
    assert sheet["classes"][0]["name_ru"] == "Воин"
    if level >= 3:
        assert sheet["classes"][0]["subclass_slug"] == slug
        assert sheet["classes"][0]["subclass_name"] == BOOK_UI_NAMES[slug]
        assert "Баннерет" not in json.dumps(sheet["classes"][0], ensure_ascii=False)
    else:
        assert not sheet["classes"][0].get("subclass_slug")

    names = _feature_names(slug, level)
    assert "Второе дыхание" in names
    assert "Всплеск действий" in names
    if level >= 5:
        assert "Дополнительная атака" in names
    if level >= 9:
        assert "Непоколебимость" in names

    gate_map = ARCHER_FEATURE_BY_LEVEL if slug == ARCHER else BANNERET_FEATURE_BY_LEVEL
    for gate, expected in gate_map.items():
        if level >= gate:
            assert expected <= names
        else:
            assert expected.isdisjoint(names)

    pools = _pools(slug, level, _abilities_for(slug))
    if slug == ARCHER and level >= 3:
        assert pools["arcane_shot"].reset == "short"
        assert pools["arcane_shot"].max == 2
    if slug == BANNERET and level >= 3:
        assert pools["group_recovery"].reset == "short"
        assert pools["group_recovery"].max == 1


@pytest.mark.parametrize(
    "slug,hi,lo,gone",
    [
        (ARCHER, 3, 2, {"Знания чародейных стрелков", "Чародейный выстрел"}),
        (ARCHER, 7, 6, {"Странствующая стрела", "Магические боеприпасы"}),
        (ARCHER, 10, 9, {"Заготовленный выстрел"}),
        (ARCHER, 15, 14, {"Неукротимая телепортация"}),
        (ARCHER, 18, 17, {"Мастерская стрельба"}),
        (ARCHER, 20, 19, set()),
        (BANNERET, 3, 2, {"Посланник рыцарства", "Групповое оздоровление"}),
        (BANNERET, 7, 6, {"Групповая тактика"}),
        (BANNERET, 10, 9, {"Воодушевляющий всплеск"}),
        (BANNERET, 15, 14, {"Устойчивость команды"}),
        (BANNERET, 18, 17, {"Вдохновляющий командир"}),
        (BANNERET, 20, 19, set()),
    ],
)
def test_book_rollbacks(slug: str, hi: int, lo: int, gone: set[str]):
    sheet = deepcopy(
        create24.validate_create_2024(
            create24.payload_from_dict(_fighter_payload(slug, hi))
        ).sheet
    )
    levels.rollback_last_level_gain(sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == lo
    if lo < 3:
        assert not sheet["classes"][0].get("subclass_slug")
    else:
        assert sheet["classes"][0].get("subclass_slug") == slug
        assert sheet["classes"][0].get("subclass_name") == BOOK_UI_NAMES[slug]
    names_hi = _feature_names(slug, hi)
    names_lo = _feature_names(slug, lo)
    for name in gone:
        assert name in names_hi
        assert name not in names_lo
    if slug == ARCHER:
        pools_lo = _pools(slug, lo, _abilities_for(slug)) if lo >= 3 else {}
        if lo < 3:
            assert "arcane_shot" not in pools_lo
        if lo < 7:
            assert "magical_ammunition" not in pools_lo
    if slug == BANNERET and lo < 3:
        assert "group_recovery" not in _pools(slug, lo, _abilities_for(slug))


def test_finish_disabled_without_book_picks():
    archer = _fighter_payload(ARCHER, 3)
    archer["class_option_picks"] = {
        k: v
        for k, v in (archer.get("class_option_picks") or {}).items()
        if k not in {"arcane_shot_options", "arcane_archer_lore_cantrip"}
    }
    with pytest.raises(create24.Create2024Error) as archer_exc:
        create24.validate_create_2024(create24.payload_from_dict(archer))
    assert "Мистический лучник" in str(archer_exc.value)

    banneret = _fighter_payload(BANNERET, 3)
    banneret["class_option_picks"] = {
        k: v
        for k, v in (banneret.get("class_option_picks") or {}).items()
        if k not in {"knightly_envoy_language", "knightly_envoy_skill"}
    }
    with pytest.raises(create24.Create2024Error) as banneret_exc:
        create24.validate_create_2024(create24.payload_from_dict(banneret))
    assert "Знаменосец" in str(banneret_exc.value)
    assert "Баннерет" not in str(banneret_exc.value)


def test_purple_dragon_not_in_book_allowlist_and_banneret_is():
    """2024 picker opens book banneret; purple-dragon stays a 2014-only path."""
    assert ARCHER in BOOK_SLUGS
    assert BANNERET in BOOK_SLUGS
    assert "fighter__purple-dragon-knight" not in BOOK_SLUGS
    catalog = json.loads((BACKEND_LIVE / "subclasses_frhof.json").read_text(encoding="utf-8"))
    banneret = next(e for e in catalog["entries"] if e["slug"] == BANNERET)
    assert banneret["name_ru"] == "Знаменосец"
    # Purple dragon lives in 2014 data, not the 2024 FRHoF live catalog.
    assert not any(e.get("slug") == "fighter__purple-dragon-knight" for e in catalog["entries"])


def test_phb_fighter_paths_intact():
    for slug, must_have in (
        ("fighter__champion", "Улучшенный критический удар"),
        ("fighter__battlemaster", "Боевое превосходство"),
        ("fighter__eldritch-knight", "Сотворение заклинаний"),
        ("fighter__psi-warrior", "Псионическая сила"),
    ):
        names = {
            f.name_ru
            for f in e24.compute_progression(
                [{"slug": "fighter", "level": 3, "subclass_slug": slug}],
                abilities=_ABILITIES_ARCHER,
            ).features
        }
        assert must_have in names


def test_banneret_create_ui_name_is_znamenoets():
    sheet = create24.validate_create_2024(
        create24.payload_from_dict(_fighter_payload(BANNERET, 11))
    ).sheet
    assert sheet["classes"][0]["subclass_name"] == "Знаменосец"
    blob = json.dumps(sheet, ensure_ascii=False)
    assert "Баннерет" not in blob
    assert "Знаменосец" in blob
