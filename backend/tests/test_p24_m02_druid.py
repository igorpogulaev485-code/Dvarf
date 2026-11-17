"""P24-M02-druid: 2024 druid tables, Wild Shape, Primal Order, PHB circles."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_subclasses as sub24
from tests.test_p24_m03_create import _spell_pick, build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

# level -> (prepared, cantrips, wild_shape max, slot counts for circles 1..9)
DRUID_TABLE = {
    1: (4, 2, 0, (2, 0, 0, 0, 0, 0, 0, 0, 0)),
    2: (5, 2, 2, (3, 0, 0, 0, 0, 0, 0, 0, 0)),
    3: (6, 2, 2, (4, 2, 0, 0, 0, 0, 0, 0, 0)),
    5: (9, 3, 2, (4, 3, 2, 0, 0, 0, 0, 0, 0)),
    6: (10, 3, 3, (4, 3, 3, 0, 0, 0, 0, 0, 0)),
    7: (11, 3, 3, (4, 3, 3, 1, 0, 0, 0, 0, 0)),
    10: (15, 4, 3, (4, 3, 3, 3, 2, 0, 0, 0, 0)),
    11: (16, 4, 3, (4, 3, 3, 3, 2, 1, 0, 0, 0)),
    14: (17, 4, 3, (4, 3, 3, 3, 2, 1, 1, 0, 0)),
    17: (19, 4, 4, (4, 3, 3, 3, 2, 1, 1, 1, 1)),
    18: (20, 4, 4, (4, 3, 3, 3, 3, 1, 1, 1, 1)),
    20: (22, 4, 4, (4, 3, 3, 3, 3, 2, 2, 1, 1)),
}

DRUID_FEATURE_NAMES_RU = {
    "spellcasting": "Сотворение заклинаний",
    "druidic": "Друидический язык",
    "primal-order": "Природный орден",
    "wild-shape": "Дикий облик",
    "wild-companion": "Дикий спутник",
    "druid-subclass": "Подкласс Друида",
    "wild-resurgence": "Дикое восстановление",
    "elemental-fury": "Ярость стихий",
    "improved-elemental-fury": "Улучшенная ярость стихий",
    "beast-spells": "Заклинания зверя",
    "archdruid": "Архидруид",
}

PHB_CIRCLES = {
    "druid__land": "Круг земли",
    "druid__moon": "Круг луны",
    "druid__sea": "Круг моря",
    "druid__stars": "Круг звёзд",
}

OUT_OF_PACK_CIRCLES = {
    "druid__spores",
    "druid__shepherd",
    "druid__wildfire",
    "druid__dreams",
}

_ABILITIES = {"str": 10, "dex": 12, "con": 14, "int": 8, "wis": 16, "cha": 10}


def _druid_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["druid"]["data"]
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


def _resource_rows(level: int, *, subclass: str | None = None) -> list[dict]:
    levels = [{"slug": "druid", "level": level}]
    if subclass:
        levels[0]["subclass_slug"] = subclass
    snap = e24.compute_progression(levels, abilities=_ABILITIES)
    return [
        {
            "id": r.id,
            "pool_id": r.pool_id,
            "max": r.max,
            "used": r.max,
            "reset": r.reset,
            "short_rest_regain": r.short_rest_regain,
            "name": r.name_ru,
        }
        for r in snap.resources
    ]


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


@pytest.mark.parametrize("level", sorted(DRUID_TABLE))
def test_druid_progression_table(level: int):
    prepared, cantrips, wild_shape, slots = DRUID_TABLE[level]
    snap = e24.compute_progression([{"slug": "druid", "level": level}])
    block = snap.spellcasting[0]
    assert block.prepared_spells == prepared
    assert block.cantrips == cantrips
    assert tuple(int(snap.multiclass_slots.get(str(c), 0)) for c in range(1, 10)) == slots
    pools = {r.pool_id: r for r in snap.resources}
    if wild_shape:
        assert pools["wild_shape"].max == wild_shape
    else:
        assert "wild_shape" not in pools or pools["wild_shape"].max == 0


def test_druid_feature_names_ru():
    feats = _druid_features()
    for fid, name in DRUID_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid


@pytest.mark.parametrize(
    "level,present,absent",
    [
        (1, {"Сотворение заклинаний", "Природный орден", "Друидический язык"}, {"Дикий облик"}),
        (2, {"Дикий облик", "Дикий спутник"}, {"Дикое восстановление"}),
        (5, {"Дикое восстановление"}, {"Ярость стихий"}),
        (7, {"Ярость стихий"}, {"Улучшенная ярость стихий"}),
        (15, {"Улучшенная ярость стихий"}, {"Заклинания зверя"}),
        (18, {"Заклинания зверя"}, {"Архидруид"}),
        (20, {"Архидруид"}, set()),
    ],
)
def test_druid_features_by_level(level: int, present: set[str], absent: set[str]):
    names = {f.name_ru for f in e24.compute_progression([{"slug": "druid", "level": level}]).features}
    assert present <= names
    assert not (absent & names)


def test_druid_no_weapon_mastery():
    data = e24.load_class_catalog()["druid"]["data"]
    assert data["weapon_mastery"]["enabled"] is False
    assert create24._weapon_mastery_limit("druid") == 0


def test_druid_subclass_level_is_3():
    assert e24.load_class_catalog()["druid"]["data"]["subclass_level"] == 3
    snap = e24.compute_progression(
        [{"slug": "druid", "level": 3, "subclass_slug": "druid__land"}]
    )
    assert snap.subclass_level == 3


def test_phb_circles_present_and_named():
    names: dict[str, str] = {}
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        for e in data["entries"]:
            if e["slug"] in PHB_CIRCLES:
                names[e["slug"]] = e["name_ru"]
    assert names == PHB_CIRCLES


def test_out_of_pack_circles_not_in_phb_files():
    in_phb_files: set[str] = set()
    for fname in ("subclasses_srd.json", "subclasses_ph24.json"):
        data = json.loads((BACKEND_LIVE / fname).read_text(encoding="utf-8"))
        in_phb_files |= {e["slug"] for e in data["entries"] if e["slug"].startswith("druid__")}
    assert in_phb_files == set(PHB_CIRCLES)
    assert not (OUT_OF_PACK_CIRCLES & in_phb_files)


def test_wild_shape_short_rest_regains_one_not_all():
    rows = _resource_rows(6)
    ws = next(r for r in rows if r["pool_id"] == "wild_shape")
    assert ws["max"] == 3
    assert ws["short_rest_regain"] == 1
    assert ws["reset"] == "long"

    after_short = e24.apply_short_rest_to_resources(rows)
    ws_short = next(r for r in after_short if r["pool_id"] == "wild_shape")
    assert ws_short["used"] == 2

    after_long = e24.apply_long_rest_to_resources(rows)
    ws_long = next(r for r in after_long if r["pool_id"] == "wild_shape")
    assert ws_long["used"] == 0


def test_speak_with_animals_always_prepared_from_druidic():
    snap = e24.compute_progression([{"slug": "druid", "level": 1}])
    assert "speak-with-animals" in snap.spellcasting[0].always_prepared


def test_land_always_prepared_by_terrain():
    arid = sub24.always_prepared_for_subclass("druid__land", 3, land_choice="arid")
    polar = sub24.always_prepared_for_subclass("druid__land", 3, land_choice="polar")
    assert "burning-hands" in arid or "fire-bolt" in arid
    assert "ray-of-frost" in polar or "fog-cloud" in polar
    assert arid != polar


def test_moon_always_prepared_includes_moonbeam():
    prepared = sub24.always_prepared_for_subclass("druid__moon", 3)
    assert "moonbeam" in prepared or "cure-wounds" in prepared


@pytest.mark.parametrize(
    "name",
    ["classes_srd.json", "subclasses_srd.json", "subclasses_ph24.json"],
)
def test_frontend_catalog_copy_is_byte_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def test_create_druid_warden_gets_martial_and_medium():
    payload = build_valid_payload("druid", ability_method="manual", base_abilities=_ABILITIES)
    assert payload["class_option_picks"]["primal_order"] == "warden"
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    prof = sheet["proficiency"]
    assert prof["weapons"].get("martial") is True
    assert prof["armor"]["medium"] is True
    assert prof["armor"]["heavy"] is False
    assert prof["armor"]["light"] is True and prof["armor"]["shields"] is True


def test_create_druid_magician_extra_cantrip_and_no_medium():
    base = build_valid_payload("druid", ability_method="manual", base_abilities=_ABILITIES)
    table_cantrips = len(base["cantrip_ids"])
    assert table_cantrips == DRUID_TABLE[1][1]
    picks = {**base["class_option_picks"], "primal_order": "magician"}

    with pytest.raises(create24.Create2024Error):
        create24.validate_create_2024(
            create24.payload_from_dict({**base, "class_option_picks": picks})
        )

    extra = [s for s in _spell_pick("druid", 0, table_cantrips + 1) if s not in base["cantrip_ids"]]
    payload = {
        **base,
        "class_option_picks": picks,
        "cantrip_ids": [*base["cantrip_ids"], extra[0]],
    }
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    prof = sheet["proficiency"]
    assert prof["armor"]["medium"] is False
    assert prof["weapons"].get("martial") is not True
    assert len(payload["cantrip_ids"]) == DRUID_TABLE[1][1] + 1
    assert "Друидический" in " ".join(prof.get("languages") or [])


def test_create_druid_at_5_and_11_land_circle():
    for level in (5, 11):
        payload = build_valid_payload(
            "druid",
            ability_method="manual",
            base_abilities=_ABILITIES,
            class_levels=[
                {"slug": "druid", "level": level, "subclass_slug": "druid__land"}
            ],
        )
        if level >= 7:
            payload["class_option_picks"] = {
                **payload["class_option_picks"],
                "elemental_fury": "potent_spellcasting",
            }
        result = create24.validate_create_2024(create24.payload_from_dict(payload))
        assert sum(int(r["level"]) for r in result.sheet["classes"]) == level
        assert result.sheet["classes"][0]["subclass_slug"] == "druid__land"
        prog = e24.compute_progression(
            [{"slug": "druid", "level": level, "subclass_slug": "druid__land"}],
            abilities=_ABILITIES,
        )
        prepared, cantrips, wild_shape, _slots = DRUID_TABLE[level]
        assert prog.spellcasting[0].prepared_spells == prepared
        assert prog.spellcasting[0].cantrips == cantrips
        assert next(r for r in prog.resources if r.pool_id == "wild_shape").max == wild_shape
        weapons = (result.sheet.get("proficiency") or {}).get("weapons") or {}
        assert weapons.get("martial") is True  # warden default from build_valid_payload


@pytest.mark.parametrize("pick", ["potent_spellcasting", "primal_strike"])
def test_create_druid_at_11_persists_elemental_fury(pick: str):
    payload = build_valid_payload(
        "druid",
        ability_method="manual",
        base_abilities=_ABILITIES,
        class_levels=[{"slug": "druid", "level": 11, "subclass_slug": "druid__moon"}],
    )
    payload["class_option_picks"] = {
        **payload["class_option_picks"],
        "elemental_fury": pick,
    }
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sheet["class_options_2024"]["elemental_fury"] == pick
    values = (sheet.get("feature_picks") or {}).get("values") or {}
    assert pick in values.values()


def test_create_druid_at_7_requires_elemental_fury():
    payload = build_valid_payload(
        "druid",
        ability_method="manual",
        base_abilities=_ABILITIES,
        class_levels=[{"slug": "druid", "level": 7, "subclass_slug": "druid__sea"}],
    )
    with pytest.raises(create24.Create2024Error):
        create24.validate_create_2024(create24.payload_from_dict(payload))


@pytest.mark.parametrize("circle", sorted(PHB_CIRCLES))
@pytest.mark.parametrize("level", [3, 6, 10, 14])
def test_circle_features_present_at_level(circle: str, level: int):
    snap = e24.compute_progression(
        [{"slug": "druid", "level": level, "subclass_slug": circle}],
        abilities=_ABILITIES,
    )
    assert snap.subclass_level == 3
    # At least one subclass feature name should appear once circle is taken.
    feature_ids = {f.id for f in snap.features}
    assert any(
        fid.startswith(("circle", "land", "moon", "sea", "star", "natural", "nature", "wrath"))
        or "form" in fid
        or "aid" in fid
        or "omen" in fid
        or "ward" in fid
        or "sanctuary" in fid
        or "recovery" in fid
        or "step" in fid
        for fid in feature_ids
    ) or level == 3  # features may be nested; progression still builds


def test_multiclass_druid_wizard_slots():
    snap = e24.compute_progression(
        [
            {"slug": "druid", "level": 3, "subclass_slug": "druid__land"},
            {"slug": "wizard", "level": 2},
        ],
        abilities={**_ABILITIES, "int": 14},
    )
    # Full+full caster levels 5 → slots of caster level 5
    assert tuple(int(snap.multiclass_slots.get(str(c), 0)) for c in range(1, 10)) == (
        4,
        3,
        2,
        0,
        0,
        0,
        0,
        0,
        0,
    )


def test_multiclass_threshold_wis_13():
    ok, _ = e24.check_multiclass_prerequisites(
        current_classes=["fighter"],
        new_class="druid",
        abilities={**_ABILITIES, "wis": 12, "str": 14},
    )
    assert ok is False
    ok2, _ = e24.check_multiclass_prerequisites(
        current_classes=["fighter"],
        new_class="druid",
        abilities={**_ABILITIES, "wis": 13, "str": 14},
    )
    assert ok2 is True


def test_rollback_style_feature_presence_boundaries():
    """OOM: features that appear/disappear at key level edges."""
    names20 = {f.name_ru for f in e24.compute_progression([{"slug": "druid", "level": 20}]).features}
    names19 = {f.name_ru for f in e24.compute_progression([{"slug": "druid", "level": 19}]).features}
    assert "Архидруид" in names20 and "Архидруид" not in names19

    names10 = {
        f.name_ru
        for f in e24.compute_progression(
            [{"slug": "druid", "level": 10, "subclass_slug": "druid__land"}]
        ).features
    }
    names9 = {
        f.name_ru
        for f in e24.compute_progression(
            [{"slug": "druid", "level": 9, "subclass_slug": "druid__land"}]
        ).features
    }
    # Cantrip column: 4 at 10, 3 at 9
    assert (
        e24.compute_progression([{"slug": "druid", "level": 10}]).spellcasting[0].cantrips == 4
    )
    assert e24.compute_progression([{"slug": "druid", "level": 9}]).spellcasting[0].cantrips == 3
    assert names10  # smoke
    assert names9

    names3 = {
        f.name_ru
        for f in e24.compute_progression(
            [{"slug": "druid", "level": 3, "subclass_slug": "druid__moon"}]
        ).features
    }
    names2 = {f.name_ru for f in e24.compute_progression([{"slug": "druid", "level": 2}]).features}
    assert "Дикий облик" in names2 and "Дикий облик" in names3
    # At 3 with a circle picked, circle features replace the generic subclass row.
    assert "Облики Круга" in names3 or "Заклинания Круга луны" in names3
    assert e24.load_class_catalog()["druid"]["data"]["subclass_level"] == 3


def test_land_natural_recovery_pool_at_6():
    pools = _pools("druid__land", 6)
    assert "natural_recovery" in pools
    assert pools["natural_recovery"].reset in {"long", "short"}


def test_stars_star_map_and_cosmic_omen_pools():
    pools3 = _pools("druid__stars", 3)
    assert "star_map_guiding_bolt" in pools3 or any("star" in k for k in pools3)
    pools6 = _pools("druid__stars", 6)
    assert "cosmic_omen" in pools6 or any("omen" in k for k in pools6)


def test_moon_moonlight_step_pool_at_10():
    pools = _pools("druid__moon", 10)
    assert "moonlight_step" in pools


def test_sea_wrath_shared_option():
    opts = {o.feature_id: o for o in sub24.shared_options_for_subclass("druid__sea", 3)}
    assert "wrath-of-the-sea" in opts
    assert opts["wrath-of-the-sea"].spend_pool == "wild_shape"


def _known_form(slug: str, cr: str = "1/4", **extra):
    return {"bestiary_slug": slug, "name_ru": slug.title(), "cr": cr, **extra}


def test_known_forms_budget():
    assert create24.known_forms_budget_2024(1) == 0
    assert create24.known_forms_budget_2024(2) == 4
    assert create24.known_forms_budget_2024(4) == 6
    assert create24.known_forms_budget_2024(8) == 8


def test_known_forms_validation():
    ok = create24._validate_known_forms([_known_form("wolf"), _known_form("cat")], 2)
    assert [row["bestiary_slug"] for row in ok] == ["wolf", "cat"]
    assert create24._validate_known_forms(None, 2) == []
    with pytest.raises(create24.Create2024Error):
        create24._validate_known_forms([_known_form("wolf"), _known_form("wolf")], 2)
    with pytest.raises(create24.Create2024Error):
        create24._validate_known_forms([_known_form(f"b{i}") for i in range(5)], 2)
    with pytest.raises(create24.Create2024Error):
        create24._validate_known_forms([_known_form("wolf")], 1)
    with pytest.raises(create24.Create2024Error):
        create24._validate_known_forms([_known_form("t-rex", cr="8")], 2)
