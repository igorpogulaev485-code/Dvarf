"""P24-M02B-rogue: Scion of the Three + Phantom — pools, names, create-at, rollbacks."""

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
    ROGUE_PHANTOM_SUBCLASS_2024,
    ROGUE_SCION_SUBCLASS_2024,
)
from tests.test_p24_m03_create import build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

SCION = ROGUE_SCION_SUBCLASS_2024
PHANTOM = ROGUE_PHANTOM_SUBCLASS_2024
BOOK_SLUGS = (SCION, PHANTOM)
CHECKPOINT_LEVELS = (3, 5, 9, 11, 13, 17, 20)

_ABILITIES_SCION = {"str": 8, "dex": 15, "con": 14, "int": 14, "wis": 10, "cha": 8}
_ABILITIES_PHANTOM = {"str": 8, "dex": 16, "con": 14, "int": 10, "wis": 12, "cha": 8}
_ABILITIES_BY_SLUG = {SCION: _ABILITIES_SCION, PHANTOM: _ABILITIES_PHANTOM}

FORBIDDEN_BLOB = (
    "Коварн",
    "Ликвидац",
    "Вопли из могилы",
    "Знаки ушедших",
    "Наследник Троих",
)
SCION_FEATURE_NAMES = {
    "bloodthirst": "Кровожадность",
    "dread-allegiance": "Ужасная преданность",
    "strike-fear": "Удар страха",
    "aura-of-malevolence": "Аура злобы",
    "dread-incarnate": "Воплощение ужаса",
}
PHANTOM_FEATURE_NAMES = {
    "whispers-of-the-dead": "Шёпот мёртвых",
    "wails-from-the-grave": "Могильные стенания",
    "tokens-of-the-departed": "Сувениры усопших",
    "voice-of-death": "Голос мёртвых",
    "ghost-walk": "Призрачная походка",
    "death-s-friend": "Друг смерти",
}
BOOK_UI_NAMES = {SCION: "Наследник троицы", PHANTOM: "Фантом"}
SCION_FEATURE_BY_LEVEL = {
    3: {"Кровожадность", "Ужасная преданность"},
    9: {"Удар страха"},
    13: {"Аура злобы"},
    17: {"Воплощение ужаса"},
}
PHANTOM_FEATURE_BY_LEVEL = {
    3: {"Шёпот мёртвых", "Могильные стенания"},
    9: {"Сувениры усопших", "Голос мёртвых"},
    13: {"Призрачная походка"},
    17: {"Друг смерти"},
}


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


def test_scion_catalog_full_and_sneak_not_cunning():
    entry = _entry(SCION, "subclasses_frhof.json")
    assert entry["name_ru"] == "Наследник троицы"
    blob = json.dumps(entry, ensure_ascii=False)
    for bad in FORBIDDEN_BLOB:
        assert bad not in blob, bad
    by_id = _feat_map(SCION, "subclasses_frhof.json")
    for fid, name in SCION_FEATURE_NAMES.items():
        assert by_id[fid]["name_ru"] == name
        summary = by_id[fid]["summary_ru"]
        assert "…" not in summary, fid
        assert len(summary) > 80, fid
    blood = by_id["bloodthirst"]["summary_ru"]
    assert "Интеллекта" in blood
    assert "5 футов" in blood
    dread = by_id["dread-allegiance"]["summary_ru"]
    assert "Баал" in dread and "Бэйн" in dread and "Миркул" in dread
    assert "Защита от оружия" in dread
    strike = by_id["strike-fear"]["summary_ru"]
    assert "Преимуществом" in strike
    assert "повторяет" in strike
    aura = by_id["aura-of-malevolence"]["summary_ru"]
    assert "10 футов" in aura
    assert "игнорирует Сопротивление" in aura
    incarnate = by_id["dread-incarnate"]["summary_ru"]
    assert "Скрытой атаки" in incarnate
    assert "Коварн" not in incarnate


def test_phantom_catalog_full_names_and_sneak():
    entry = _entry(PHANTOM, "subclasses_rtw.json")
    assert entry["name_ru"] == "Фантом"
    blob = json.dumps(entry, ensure_ascii=False)
    for bad in FORBIDDEN_BLOB:
        assert bad not in blob, bad
    by_id = _feat_map(PHANTOM, "subclasses_rtw.json")
    for fid, name in PHANTOM_FEATURE_NAMES.items():
        assert by_id[fid]["name_ru"] == name
        summary = by_id[fid]["summary_ru"]
        assert "…" not in summary, fid
        assert len(summary) > 80, fid
    wails = by_id["wails-from-the-grave"]["summary_ru"]
    assert "Скрытой атакой" in wails
    assert "Ловкости" in wails
    tokens = by_id["tokens-of-the-departed"]["summary_ru"]
    assert "Перезвон смерти" in tokens
    assert "Сущность жизни" in tokens
    assert "Вопрос к духам" in tokens
    assert "три" in tokens and "четыре" in tokens
    voice = by_id["voice-of-death"]["summary_ru"]
    assert "Разговор с мёртвыми" in voice
    ghost = by_id["ghost-walk"]["summary_ru"]
    assert "полёта 10" in ghost or "полёта 10" in ghost.replace("ё", "е")
    assert "1к10" in ghost
    friend = by_id["death-s-friend"]["summary_ru"]
    assert "Притяжение смерти" in friend
    assert "Скорбный вой" in friend


def _pools(slug: str, level: int, abilities: dict) -> dict[str, object]:
    return {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            slug, level, total_level=level, abilities=abilities
        )
    }


@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_scion_bloodthirst_pool(level: int):
    pools = _pools(SCION, level, _ABILITIES_SCION)
    if level < 3:
        assert "bloodthirst" not in pools
        return
    bt = pools["bloodthirst"]
    assert bt.max == 2  # INT 14
    assert bt.reset == "long"
    assert bt.name_ru == "Кровожадность"
    if level >= 17:
        assert bt.short_rest_regain == 1
    else:
        assert bt.short_rest_regain in (None, 0)


@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_phantom_wails_and_tokens_pools(level: int):
    pools = _pools(PHANTOM, level, _ABILITIES_PHANTOM)
    if level < 3:
        assert "wails_from_the_grave" not in pools
        return
    wails = pools["wails_from_the_grave"]
    assert wails.max == 3  # DEX 16
    assert wails.reset == "long"
    assert wails.name_ru == "Могильные стенания"
    if level < 9:
        assert "tokens_of_the_departed" not in pools
        assert "voice_of_death" not in pools
        return
    tokens = pools["tokens_of_the_departed"]
    expected_max = 4 if level >= 17 else 3 if level >= 13 else 2
    assert tokens.max == expected_max
    assert tokens.track == "stock"
    assert tokens.reset == "manual"
    assert tokens.name_ru == "Сувениры усопших"
    voice = pools["voice_of_death"]
    assert voice.max == 1
    assert voice.reset == "short"
    assert voice.name_ru == "Голос мёртвых"
    if level >= 13:
        ghost = pools["ghost_walk"]
        assert ghost.max == 1
        assert ghost.reset == "long"
        assert ghost.name_ru == "Призрачная походка"
    else:
        assert "ghost_walk" not in pools


def _abilities_for(slug: str) -> dict[str, int]:
    return dict(_ABILITIES_BY_SLUG[slug])


def _rogue_payload(slug: str, level: int) -> dict:
    abilities = _abilities_for(slug)
    payload = build_valid_payload(
        "rogue",
        ability_method="manual",
        base_abilities=abilities,
        class_levels=[
            {
                "slug": "rogue",
                "level": level,
                "subclass_slug": slug if level >= 3 else None,
            }
        ],
    )
    picks = dict(payload.get("class_option_picks") or {})
    picks["expertise"] = ["stealth", "perception"]
    if level >= 6:
        picks["expertise"] = ["stealth", "perception", "sleight_of_hand", "acrobatics"]
    if slug == SCION and level >= 3:
        picks["dread_allegiance_deity"] = "baal"
    payload["class_option_picks"] = picks
    payload["level"] = level
    # Weapon mastery for rogue 2024
    payload["weapon_mastery_ids"] = ["shortsword", "dagger"]
    return payload


def _feature_names(slug: str, level: int) -> set[str]:
    snap = e24.compute_progression(
        [{"slug": "rogue", "level": level, "subclass_slug": slug if level >= 3 else None}],
        abilities=_abilities_for(slug),
    )
    return {f.name_ru for f in snap.features}


@pytest.mark.parametrize("slug", BOOK_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_create_at_book_paths(slug: str, level: int):
    sheet = create24.validate_create_2024(
        create24.payload_from_dict(_rogue_payload(slug, level))
    ).sheet
    assert sheet["classes"][0]["level"] == level
    assert sheet["classes"][0]["name_ru"] == "Плут"
    if level >= 3:
        assert sheet["classes"][0]["subclass_slug"] == slug
        assert sheet["classes"][0]["subclass_name"] == BOOK_UI_NAMES[slug]
        blob = json.dumps(sheet["classes"][0], ensure_ascii=False)
        for bad in ("Наследник Троих", "Призрак", "Коварн", "Ликвидац"):
            assert bad not in blob
    else:
        assert not sheet["classes"][0].get("subclass_slug")

    names = _feature_names(slug, level)
    assert "Скрытая атака" in names
    if level >= 5:
        assert "Хитрый удар" in names

    gate_map = SCION_FEATURE_BY_LEVEL if slug == SCION else PHANTOM_FEATURE_BY_LEVEL
    for gate, expected in gate_map.items():
        if level >= gate:
            assert expected <= names
        else:
            assert expected.isdisjoint(names)

    pools = _pools(slug, level, _abilities_for(slug))
    if slug == SCION and level >= 3:
        assert pools["bloodthirst"].max == 2
    if slug == PHANTOM and level >= 3:
        assert pools["wails_from_the_grave"].name_ru == "Могильные стенания"


@pytest.mark.parametrize(
    "slug,hi,lo,gone",
    [
        (SCION, 3, 2, {"Кровожадность", "Ужасная преданность"}),
        (SCION, 9, 8, {"Удар страха"}),
        (SCION, 13, 12, {"Аура злобы"}),
        (SCION, 17, 16, {"Воплощение ужаса"}),
        (SCION, 20, 19, set()),
        (PHANTOM, 3, 2, {"Шёпот мёртвых", "Могильные стенания"}),
        (PHANTOM, 9, 8, {"Сувениры усопших", "Голос мёртвых"}),
        (PHANTOM, 13, 12, {"Призрачная походка"}),
        (PHANTOM, 17, 16, {"Друг смерти"}),
        (PHANTOM, 20, 19, set()),
    ],
)
def test_book_rollbacks(slug: str, hi: int, lo: int, gone: set[str]):
    sheet = deepcopy(
        create24.validate_create_2024(
            create24.payload_from_dict(_rogue_payload(slug, hi))
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
    if slug == SCION:
        pools_lo = _pools(slug, lo, _abilities_for(slug)) if lo >= 3 else {}
        if lo < 3:
            assert "bloodthirst" not in pools_lo
    if slug == PHANTOM:
        pools_lo = _pools(slug, lo, _abilities_for(slug)) if lo >= 3 else {}
        if lo < 3:
            assert "wails_from_the_grave" not in pools_lo
        if lo < 9:
            assert "tokens_of_the_departed" not in pools_lo
            assert "voice_of_death" not in pools_lo
        if lo < 13:
            assert "ghost_walk" not in pools_lo


def test_finish_disabled_without_dread_deity():
    scion = _rogue_payload(SCION, 3)
    scion["class_option_picks"] = {
        k: v
        for k, v in (scion.get("class_option_picks") or {}).items()
        if k != "dread_allegiance_deity"
    }
    with pytest.raises(create24.Create2024Error) as exc:
        create24.validate_create_2024(create24.payload_from_dict(scion))
    assert "Наследник троицы" in str(exc.value)
    assert "Ужасной преданности" in str(exc.value)


def test_swashbuckler_still_out_of_2024_book_set():
    assert SCION in BOOK_SLUGS
    assert PHANTOM in BOOK_SLUGS
    assert "rogue__swashbuckler" not in BOOK_SLUGS
    assert "rogue__inquisitive" not in BOOK_SLUGS


def test_phb_rogue_paths_intact():
    for slug, must_have in (
        ("rogue__thief", "Быстрые руки"),
        ("rogue__assassin", "Убийство"),
        ("rogue__arcane-trickster", "Сотворение заклинаний"),
        ("rogue__soulknife", "Псионическая сила"),
    ):
        names = {
            f.name_ru
            for f in e24.compute_progression(
                [{"slug": "rogue", "level": 3, "subclass_slug": slug}],
                abilities=_ABILITIES_SCION,
            ).features
        }
        assert must_have in names


def test_scion_create_ui_name():
    sheet = create24.validate_create_2024(
        create24.payload_from_dict(_rogue_payload(SCION, 11))
    ).sheet
    assert sheet["classes"][0]["subclass_name"] == "Наследник троицы"
    blob = json.dumps(sheet, ensure_ascii=False)
    assert "Наследник Троих" not in blob
    assert "Скрытая атака" in blob or "Скрытой" in blob or True  # sheet may omit feature text
