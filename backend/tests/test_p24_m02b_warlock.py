"""P24-M02B-warlock: AU Vestige + RTW Undead — pools, names, create-at, rollbacks, PHB intact."""

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

VESTIGE = "warlock__vestige-patron"
UNDEAD = "warlock__undead"
BOOK_SLUGS = (VESTIGE, UNDEAD)
CHECKPOINT_LEVELS = (3, 5, 6, 10, 11, 14, 20)

_ABILITIES = {"str": 8, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 16}
# CHA 16 → mod +3

FORBIDDEN_UNDEAD = ("Облик ужаса", "Спутник-отголосок")
FORBIDDEN_VESTIGE = ("Спутник-отголосок",)


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("name", ["subclasses_au.json", "subclasses_rtw.json"])
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


def test_undead_catalog_complete_names_not_truncated():
    data = json.loads((BACKEND_LIVE / "subclasses_rtw.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["slug"] == UNDEAD)
    assert entry["name_ru"] == "Нежить"
    blob = json.dumps(entry, ensure_ascii=False)
    for bad in FORBIDDEN_UNDEAD:
        assert bad not in blob

    by_id = _feat_map(UNDEAD, "subclasses_rtw.json")
    assert by_id["form-of-dread"]["name_ru"] == "Аватар ужаса"
    dread = by_id["form-of-dread"]["summary_ru"]
    assert "…" not in dread
    assert "Иммунитет" in dread
    assert "временн" in dread.lower() or "Временн" in dread
    assert not dread.rstrip().endswith(("Иммунитет", "модифи", "до"))

    grave = by_id["grave-touched"]["summary_ru"]
    assert "…" not in grave
    assert len(grave) > 200

    husk = by_id["necrotic-husk"]["summary_ru"]
    assert "…" not in husk
    assert "некротическ" in husk.lower()

    superior = by_id["superior-dread"]["summary_ru"]
    assert "…" not in superior
    assert "полёт" in superior.lower() or "Полёт" in superior


def test_vestige_catalog_names():
    data = json.loads((BACKEND_LIVE / "subclasses_au.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["slug"] == VESTIGE)
    assert entry["name_ru"] == "Предтеча"
    blob = json.dumps(entry, ensure_ascii=False)
    for bad in FORBIDDEN_VESTIGE:
        assert bad not in blob

    by_id = _feat_map(VESTIGE, "subclasses_au.json")
    assert by_id["vestige-companion"]["name_ru"] == "Спутник-предтеча"
    assert by_id["vestige-spells"]["name_ru"] == "Заклинания Предтечи"
    assert by_id["vestige-power"]["name_ru"] == "Мощь предтечи"
    assert by_id["vestige-recovery"]["name_ru"] == "Восстановление предтечи"
    assert by_id["semblance-of-life"]["name_ru"] == "Подобие жизни"


def _pools(slug: str, level: int) -> dict[str, object]:
    return {
        p.pool_id: p
        for p in sub24.build_subclass_resources(
            slug, level, total_level=level, abilities=_ABILITIES
        )
    }


def test_form_of_dread_pool_is_cha_mod():
    pools = _pools(UNDEAD, 3)
    row = pools["form_of_dread"]
    assert row.max == 3  # CHA 16 → +3
    assert row.name_ru == "Аватар ужаса"
    assert row.reset == "long"
    assert _pools(UNDEAD, 2).get("form_of_dread") is None


def test_vestige_pools_recovery_semblance():
    assert _pools(VESTIGE, 3)["vestige_companion"].name_ru == "Спутник-предтеча"
    assert _pools(VESTIGE, 9).get("vestige_recovery") is None
    pools10 = _pools(VESTIGE, 10)
    assert pools10["vestige_recovery"].name_ru == "Восстановление предтечи"
    assert pools10["vestige_recovery"].max == 1
    assert pools10["vestige_recovery"].reset == "long"
    assert _pools(VESTIGE, 13).get("semblance_of_life") is None
    pools14 = _pools(VESTIGE, 14)
    assert pools14["semblance_of_life"].name_ru == "Подобие жизни"
    assert pools14["semblance_of_life"].max == 1


def test_necrotic_husk_pool_short_at_10():
    assert _pools(UNDEAD, 9).get("necrotic_husk") is None
    pools = _pools(UNDEAD, 10)
    assert pools["necrotic_husk"].name_ru == "Некротическая оболочка"
    assert pools["necrotic_husk"].max == 1
    assert pools["necrotic_husk"].reset == "short"


def test_undead_always_prepared_table():
    free3 = sub24.always_prepared_for_subclass(UNDEAD, 3)
    assert "bane" in free3
    assert "ray-of-sickness" in free3
    free5 = sub24.always_prepared_for_subclass(UNDEAD, 5)
    assert "speak-with-dead" in free5
    assert "summon-undead" in free5
    free9 = sub24.always_prepared_for_subclass(UNDEAD, 9)
    assert "cloudkill" in free9
    assert "antilife-shell" in free9


def test_vestige_always_prepared_war_includes_spiritual_weapon():
    free3 = sub24.always_prepared_for_subclass(VESTIGE, 3, land_choice="war")
    assert "spiritual-weapon" in free3
    assert "guiding-bolt" in free3
    assert "magic-weapon" in free3
    free5 = sub24.always_prepared_for_subclass(VESTIGE, 5, land_choice="war")
    assert "spirit-guardians" in free5 or "crusaders-mantle" in free5
    assert not sub24.always_prepared_for_subclass(VESTIGE, 3, land_choice=None)


@pytest.mark.parametrize("slug", BOOK_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_book_subclass_checkpoints(slug: str, level: int):
    snap = e24.compute_progression(
        [{"slug": "warlock", "level": level, "subclass_slug": slug}],
        abilities=_ABILITIES,
    )
    assert snap.total_level == level
    if level >= 3:
        assert any(f.source == "subclass" for f in snap.features), slug
    else:
        assert not any(f.source == "subclass" for f in snap.features)


def _spells_for(level: int, subclass: str) -> tuple[list[str], list[str]]:
    snap = e24.compute_progression(
        [{"slug": "warlock", "level": level, "subclass_slug": subclass}],
        abilities=_ABILITIES,
    )
    block = snap.spellcasting[0]
    cantrips = _spell_pick("warlock", 0, int(block.cantrips or 0))
    need = int(block.prepared_spells or 0)
    prepared: list[str] = []
    for circle in range(5, 0, -1):
        for slug in _spell_pick("warlock", circle, 40):
            if slug not in prepared:
                prepared.append(slug)
            if len(prepared) >= need:
                break
        if len(prepared) >= need:
            break
    return cantrips, prepared[:need]


def _warlock_payload(level: int, subclass: str) -> dict:
    cantrips, prepared = _spells_for(level, subclass)
    payload = build_valid_payload(
        "warlock",
        ability_method="manual",
        base_abilities=dict(_ABILITIES),
        class_levels=[
            {
                "slug": "warlock",
                "level": level,
                "subclass_slug": subclass if level >= 3 else None,
            }
        ],
        cantrip_ids=cantrips,
        prepared_spell_ids=prepared,
    )
    picks = dict(payload.get("class_option_picks") or {})
    if subclass == VESTIGE and level >= 3:
        picks["vestige_domain"] = "war"
        picks["vestige_companion_type"] = "fiend"
    payload["class_option_picks"] = picks
    return payload


@pytest.mark.parametrize("slug", BOOK_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_create_at_book_paths(slug: str, level: int):
    payload = _warlock_payload(level, slug)
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sum(int(r["level"]) for r in sheet["classes"]) == level
    if level >= 3:
        assert sheet["classes"][0].get("subclass_slug") == slug
    if slug == VESTIGE and level >= 3:
        opts = sheet.get("class_options_2024") or {}
        assert opts.get("vestige_domain") == "war"
        assert opts.get("vestige_companion_type") == "fiend"


@pytest.mark.parametrize(
    "slug,from_level,to_level",
    [
        (VESTIGE, 3, 2),
        (UNDEAD, 11, 10),
        (VESTIGE, 14, 13),
        (UNDEAD, 20, 19),
    ],
)
def test_book_warlock_rollbacks(slug: str, from_level: int, to_level: int):
    payload = _warlock_payload(from_level, slug)
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
        opts = sheet.get("class_options_2024") or {}
        assert "vestige_domain" not in opts
        assert "vestige_companion_type" not in opts
    else:
        assert sheet["classes"][0].get("subclass_slug") == slug


def test_phb_warlock_patrons_intact():
    for slug, level, pool_id, name in (
        ("warlock__archfey", 3, "steps_of_the_fey", "Шаг феи"),
        ("warlock__celestial-patron", 3, "healing_light", "Лечащий свет"),
        ("warlock__fiend-patron", 6, "dark_ones_own_luck", "Удача темнейшего"),
        ("warlock__greate-old-one-patron", 6, "clairvoyant_combatant", "Провидящий боец"),
    ):
        pools = _pools(slug, level)
        assert pool_id in pools, slug
        assert pools[pool_id].name_ru == name

    fiend = e24.compute_progression(
        [{"slug": "warlock", "level": 3, "subclass_slug": "warlock__fiend-patron"}],
        abilities=_ABILITIES,
    )
    assert any(f.source == "subclass" for f in fiend.features)
    archfey = e24.compute_progression(
        [{"slug": "warlock", "level": 3, "subclass_slug": "warlock__archfey"}],
        abilities=_ABILITIES,
    )
    assert any(f.source == "subclass" for f in archfey.features)
