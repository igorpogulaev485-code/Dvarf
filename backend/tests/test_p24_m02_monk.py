"""P24-M02-monk: 2024 monk tables, RU names, Focus, MA die, PHB subclasses."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_subclasses as sub24
from tests.test_p24_m03_create import build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

FOCUS_BY_LEVEL = {1: 0, 2: 2, 3: 3, 5: 5, 11: 11, 20: 20}
MA_DIE = {1: "1к6", 4: "1к6", 5: "1к8", 10: "1к8", 11: "1к10", 16: "1к10", 17: "1к12", 20: "1к12"}
MOVE_FT = {1: 0, 2: 10, 5: 10, 6: 15, 9: 15, 10: 20, 13: 20, 14: 25, 17: 25, 18: 30, 20: 30}

MONK_FEATURE_NAMES_RU = {
    "martial-arts": "Боевые искусства",
    "unarmored-defense": "Защита без доспехов",
    "monks-focus": "Монашеская сосредоточенность",
    "unarmored-movement": "Движение без доспехов",
    "uncanny-metabolism": "Феноменальный метаболизм",
    "deflect-attacks": "Отражение атак",
    "slow-fall": "Медленное падение",
    "extra-attack": "Дополнительная атака",
    "stunning-strike": "Ошеломляющий удар",
    "empowered-strikes": "Усиленные удары",
    "evasion": "Увёртливость",
    "acrobatic-movement": "Движение акробата",
    "heightened-focus": "Повышенная сосредоточенность",
    "self-restoration": "Восстановление себя",
    "deflect-energy": "Отражение энергии",
    "disciplined-survivor": "Дисциплина сохранения",
    "perfect-focus": "Полная сосредоточенность",
    "superior-defense": "Совершенная защита",
    "body-and-mind": "Тело и разум",
}

PHB_SUBCLASSES = {
    "monk__warrior-of-the-hand": "Воин открытой ладони",
    "monk__warrior-of-shadow": "Воин тени",
    "monk__warrior-of-mercy": "Воин милосердия",
    "monk__warrior-of-the-elements": "Воин стихий",
}

_ABILITIES = {"str": 10, "dex": 16, "con": 14, "int": 10, "wis": 16, "cha": 8}


def _monk_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["monk"]["data"]
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


def test_monk_feature_names_ru():
    feats = _monk_features()
    for fid, name in MONK_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid


def test_uncanny_metabolism_is_level_2():
    levels = {
        row["level"]: [f["id"] for f in row.get("features") or []]
        for row in e24.load_class_catalog()["monk"]["data"]["levels"]
    }
    assert "uncanny-metabolism" in levels[2]
    assert "monks-focus" in levels[2]


@pytest.mark.parametrize("level,points", sorted(FOCUS_BY_LEVEL.items()))
def test_focus_points_table(level: int, points: int):
    snap = e24.compute_progression([{"slug": "monk", "level": level}])
    pools = {r.pool_id: r for r in snap.resources}
    if points <= 0:
        assert "focus_points" not in pools
    else:
        assert pools["focus_points"].max == points
        assert pools["focus_points"].name_ru == "Очки сосредоточенности"
        assert pools["focus_points"].reset == "short"


@pytest.mark.parametrize("level,die", sorted(MA_DIE.items()))
def test_martial_arts_die_table(level: int, die: str):
    snap = e24.compute_progression([{"slug": "monk", "level": level}])
    assert snap.scales.get("monk:martial_arts_die") == die


@pytest.mark.parametrize("level,ft", sorted(MOVE_FT.items()))
def test_unarmored_movement_table(level: int, ft: int):
    snap = e24.compute_progression([{"slug": "monk", "level": level}])
    got = snap.scales.get("monk:unarmored_movement_ft")
    if ft <= 0:
        assert got in (0, None)
    else:
        assert got == ft


def test_uncanny_metabolism_pool_from_level_2():
    snap1 = e24.compute_progression([{"slug": "monk", "level": 1}])
    assert all(r.pool_id != "uncanny_metabolism" for r in snap1.resources)
    snap = e24.compute_progression([{"slug": "monk", "level": 2}])
    pool = next(r for r in snap.resources if r.pool_id == "uncanny_metabolism")
    assert pool.max == 1
    assert pool.name_ru == "Феноменальный метаболизм"
    assert pool.reset == "long"


def test_monk_subclass_comes_at_level_3():
    assert e24.load_class_catalog()["monk"]["data"]["subclass_level"] == 3
    snap = e24.compute_progression(
        [{"slug": "monk", "level": 3, "subclass_slug": "monk__warrior-of-the-hand"}]
    )
    assert snap.subclass_level == 3


def test_monk_no_weapon_mastery():
    data = e24.load_class_catalog()["monk"]["data"]
    assert data["weapon_mastery"]["enabled"] is False


def test_body_and_mind_scale_at_20():
    snap19 = e24.compute_progression([{"slug": "monk", "level": 19}])
    assert "monk:body_and_mind" not in snap19.scales
    snap20 = e24.compute_progression([{"slug": "monk", "level": 20}])
    assert snap20.scales["monk:body_and_mind"] == {"dex": 4, "wis": 4, "cap": 25}


def test_phb_subclasses_present_and_named():
    data = json.loads((BACKEND_LIVE / "subclasses_ph24.json").read_text(encoding="utf-8"))
    srd = json.loads((BACKEND_LIVE / "subclasses_srd.json").read_text(encoding="utf-8"))
    names = {
        e["slug"]: e["name_ru"]
        for e in data["entries"] + srd["entries"]
        if e["slug"] in PHB_SUBCLASSES
    }
    assert names == PHB_SUBCLASSES
    # Cyrillic «с» in «стихий», not Latin c
    elements = names["monk__warrior-of-the-elements"]
    assert "с" in elements
    assert "c" not in elements.replace("Воин", "")


def test_open_hand_feature_names():
    blocks = e24.load_subclass_catalog()["monk__warrior-of-the-hand"]["data"]["features"]
    names = {f["id"]: f["name_ru"] for block in blocks for f in block["features"]}
    assert names["open-hand-technique"] == "Техники открытой ладони"
    assert names["wholeness-of-body"] == "Целостность тела"
    assert names["fleet-step"] == "Быстрые ноги"
    assert names["quivering-palm"] == "Дрожащая ладонь"


@pytest.mark.parametrize(
    "slug,level,expected_ids",
    [
        ("monk__warrior-of-the-hand", 3, {"open-hand-technique"}),
        ("monk__warrior-of-the-hand", 6, {"wholeness_of_body"}),
        ("monk__warrior-of-the-hand", 11, {"fleet-step"}),
        ("monk__warrior-of-the-hand", 17, {"quivering-palm"}),
        ("monk__warrior-of-shadow", 3, {"shadow-arts"}),
        ("monk__warrior-of-shadow", 6, {"shadow-step"}),
        ("monk__warrior-of-shadow", 11, {"improved-shadow-step"}),
        ("monk__warrior-of-shadow", 17, {"cloak-of-shadows"}),
        ("monk__warrior-of-mercy", 3, {"hand-of-healing", "hand-of-harm", "implements-of-mercy"}),
        ("monk__warrior-of-mercy", 6, {"physicians-care"}),
        ("monk__warrior-of-mercy", 11, {"flurry_of_healing_and_harm"}),
        ("monk__warrior-of-mercy", 17, {"hand_of_ultimate_mercy"}),
        ("monk__warrior-of-the-elements", 3, {"elemental-attunement", "manipulate-elements"}),
        ("monk__warrior-of-the-elements", 6, {"elemental-burst"}),
        ("monk__warrior-of-the-elements", 11, {"stride-of-the-elements"}),
        ("monk__warrior-of-the-elements", 17, {"elemental-epitome"}),
    ],
)
def test_subclass_checklist_presence(slug: str, level: int, expected_ids: set[str]):
    """Feature ids may appear as shared options, catalog rows, or dedicated pools."""
    shared = {o.feature_id for o in sub24.shared_options_for_subclass(slug, level)}
    pools = set(_pools(slug, level))
    catalog = e24.load_subclass_catalog()[slug]["data"]["features"]
    cat_ids = {
        f["id"]
        for block in catalog
        if int(block.get("level") or 0) <= level
        for f in block.get("features") or []
    }
    # pools use underscores
    found = shared | cat_ids | {p.replace("_", "-") for p in pools} | pools
    for eid in expected_ids:
        assert eid in found or eid.replace("-", "_") in found, (slug, level, eid, found)


def test_wholeness_and_mercy_pools():
    pools6 = _pools("monk__warrior-of-the-hand", 6)
    assert pools6["wholeness_of_body"].max == max(1, (16 - 10) // 2)
    assert pools6["wholeness_of_body"].name_ru == "Целостность тела"
    pools17 = _pools("monk__warrior-of-mercy", 17)
    assert pools17["hand_of_ultimate_mercy"].name_ru == "Рука абсолютного милосердия"
    assert pools17["flurry_of_healing_and_harm"].max == max(1, (16 - 10) // 2)


def test_level_rollback_thresholds_scales():
    """Откат через пороги снимает кость / движение / Body and Mind."""
    assert e24.compute_progression([{"slug": "monk", "level": 5}]).scales[
        "monk:martial_arts_die"
    ] == "1к8"
    assert e24.compute_progression([{"slug": "monk", "level": 4}]).scales[
        "monk:martial_arts_die"
    ] == "1к6"
    assert e24.compute_progression([{"slug": "monk", "level": 10}]).scales[
        "monk:unarmored_movement_ft"
    ] == 20
    assert e24.compute_progression([{"slug": "monk", "level": 9}]).scales[
        "monk:unarmored_movement_ft"
    ] == 15
    assert "monk:body_and_mind" not in e24.compute_progression(
        [{"slug": "monk", "level": 19}]
    ).scales


def test_multiclass_monk_wizard_focus_by_monk_level():
    snap = e24.compute_progression(
        [
            {"slug": "monk", "level": 3, "subclass_slug": "monk__warrior-of-the-hand"},
            {"slug": "wizard", "level": 2},
        ]
    )
    pools = {r.pool_id: r for r in snap.resources}
    assert pools["focus_points"].max == 3
    assert snap.scales.get("monk:martial_arts_die") == "1к6"


def test_create_monk_at_5_and_11():
    for level, die, focus, move in (
        (5, "1к8", 5, 10),
        (11, "1к10", 11, 20),
    ):
        payload = build_valid_payload(
            "monk",
            ability_method="manual",
            base_abilities={
                "str": 10,
                "dex": 15,
                "con": 14,
                "int": 10,
                "wis": 14,
                "cha": 8,
            },
            class_levels=[
                {
                    "slug": "monk",
                    "level": level,
                    "subclass_slug": "monk__warrior-of-the-hand",
                }
            ],
        )
        result = create24.validate_create_2024(create24.payload_from_dict(payload))
        assert sum(int(r["level"]) for r in result.sheet["classes"]) == level
        prog = e24.compute_progression(
            [{"slug": "monk", "level": level, "subclass_slug": "monk__warrior-of-the-hand"}],
            abilities=_ABILITIES,
        )
        pools = {r.pool_id: r for r in prog.resources}
        assert pools["focus_points"].max == focus
        assert prog.scales["monk:martial_arts_die"] == die
        assert prog.scales["monk:unarmored_movement_ft"] == move
        # Unarmored defense AC uses DEX+WIS
        combat = result.sheet.get("combat") or {}
        assert int(combat.get("ac") or 0) >= 10
        # Weapons: simple + light martial melee — never full martial.
        weapons = (result.sheet.get("proficiency") or {}).get("weapons") or {}
        assert weapons.get("simple") is True
        assert weapons.get("martial") is False
        extras = weapons.get("extras") or []
        assert any("лёгк" in str(x).lower() or "легк" in str(x).lower() for x in extras)
        # Race grant baseline so desk adds Unarmored Movement live.
        grant = result.sheet.get("race_grant") or {}
        assert int(grant.get("speed") or 0) == int(combat.get("speed") or 0)
        assert int(grant.get("speed") or 0) > 0


def test_monk_unarmored_movement_thresholds_match_desk():
    """2/6/10/14/18 breakpoints — same numbers the sheet adds to race speed."""
    expected = {2: 10, 6: 15, 10: 20, 14: 25, 18: 30}
    for level, bonus in expected.items():
        snap = e24.compute_progression([{"slug": "monk", "level": level}])
        assert snap.scales.get("monk:unarmored_movement_ft") == bonus


@pytest.mark.parametrize(
    "name",
    ["classes_srd.json", "subclasses_srd.json", "subclasses_ph24.json"],
)
def test_frontend_catalog_copy_is_byte_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def test_out_of_pack_subclasses_exist_on_site_catalog():
    """Мистический воин / отвары / змея — не PHB; карточки могут быть в AU и т.п."""
    catalog = e24.load_subclass_catalog()
    mystic = "monk__warrior-of-the-mystic-arts"
    assert mystic in catalog
    assert mystic not in PHB_SUBCLASSES
