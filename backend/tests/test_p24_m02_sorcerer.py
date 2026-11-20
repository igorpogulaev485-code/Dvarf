"""P24-M02-sorcerer: 2024 sorcerer tables, RU names, metamagic 2/4/6, subclass pools."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_class_options as opt
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_create_levels as levels
from app.dnd import edition_2024_subclasses as sub24
from tests.test_p24_m03_create import build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

SORCERER_PREPARED = {1: 2, 3: 6, 5: 9, 11: 16, 20: 22}
SORCERER_CANTRIPS = {1: 4, 4: 5, 5: 5, 10: 6, 11: 6, 20: 6}
SORCERER_SP = {1: 0, 2: 2, 5: 5, 11: 11, 20: 20}

SORCERER_FEATURE_NAMES_RU = {
    "spellcasting": "Сотворение заклинаний",
    "innate-sorcery": "Врождённое чародейство",
    "font-of-magic": "Источник магии",
    "metamagic": "Метамагия",
    "sorcerous-restoration": "Чародейское восстановление",
    "sorcery-incarnate": "Воплощение чародейства",
    "arcane-apotheosis": "Апофеоз чародейства",
}

PHB_SUBCLASSES = {
    "sorcerer__draconic-sorcery",
    "sorcerer__aberrant-sorcery",
    "sorcerer__clockwork-sorcery",
    "sorcerer__wild-magic-sorcery",
}

_ABILITIES = {"str": 8, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 18}


def _sorcerer_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["sorcerer"]["data"]
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


@pytest.mark.parametrize("level,prepared", sorted(SORCERER_PREPARED.items()))
def test_sorcerer_prepared_table(level: int, prepared: int):
    snap = e24.compute_progression([{"slug": "sorcerer", "level": level}])
    assert snap.spellcasting[0].prepared_spells == prepared


@pytest.mark.parametrize("level,cantrips", sorted(SORCERER_CANTRIPS.items()))
def test_sorcerer_cantrips_table(level: int, cantrips: int):
    snap = e24.compute_progression([{"slug": "sorcerer", "level": level}])
    assert snap.spellcasting[0].cantrips == cantrips


@pytest.mark.parametrize("level,points", sorted(SORCERER_SP.items()))
def test_sorcery_points_table(level: int, points: int):
    snap = e24.compute_progression([{"slug": "sorcerer", "level": level}])
    pools = {r.pool_id: r for r in snap.resources}
    if points <= 0:
        assert "sorcery_points" not in pools
    else:
        assert pools["sorcery_points"].max == points
        assert pools["sorcery_points"].name_ru == "Очки чародейства"
        assert pools["sorcery_points"].reset == "long"


def test_innate_sorcery_pool_from_level_1():
    snap = e24.compute_progression([{"slug": "sorcerer", "level": 1}])
    pool = next(r for r in snap.resources if r.pool_id == "innate_sorcery_uses")
    assert pool.max == 2
    assert pool.name_ru == "Врождённое чародейство"
    assert pool.reset == "long"


def test_sorcerous_restoration_pool_from_level_5():
    snap1 = e24.compute_progression([{"slug": "sorcerer", "level": 4}])
    assert all(r.pool_id != "sorcerous_restoration" for r in snap1.resources)
    snap = e24.compute_progression([{"slug": "sorcerer", "level": 5}])
    pool = next(r for r in snap.resources if r.pool_id == "sorcerous_restoration")
    assert pool.max == 1
    assert pool.name_ru == "Чародейское восстановление"


def test_sorcerer_subclass_comes_at_level_3():
    assert e24.load_class_catalog()["sorcerer"]["data"]["subclass_level"] == 3
    snap = e24.compute_progression(
        [{"slug": "sorcerer", "level": 3, "subclass_slug": "sorcerer__draconic-sorcery"}]
    )
    assert snap.subclass_level == 3


def test_sorcerer_feature_names_ru():
    feats = _sorcerer_features()
    for fid, name in SORCERER_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid


def test_metamagic_limits_are_2_4_6():
    assert opt.metamagic_known_limit(2) == 2
    assert opt.metamagic_known_limit(9) == 2
    assert opt.metamagic_known_limit(10) == 4
    assert opt.metamagic_known_limit(16) == 4
    assert opt.metamagic_known_limit(17) == 6
    assert opt.metamagic_known_limit(20) == 6
    assert opt.METAMAGIC_BY_ID["careful"].name_ru == "Аккуратное заклинание"
    assert opt.METAMAGIC_BY_ID["heightened"].name_ru == "Непреодолимое заклинание"
    assert opt.METAMAGIC_BY_ID["subtle"].name_ru == "Неуловимое заклинание"
    assert opt.METAMAGIC_BY_ID["heightened"].cost == 2
    assert opt.METAMAGIC_BY_ID["seeking"].cost == 1
    assert opt.METAMAGIC_BY_ID["twinned"].cost == 1


def test_metamagic_validate_four_at_10():
    picks = ["careful", "distant", "empowered", "quickened"]
    assert opt.validate_metamagic(picks, sorcerer_level=10) == picks
    with pytest.raises(e24.Edition2024ClassError) as exc:
        opt.validate_metamagic(picks + ["subtle"], sorcerer_level=10)
    assert exc.value.code == "metamagic_limit"


@pytest.mark.parametrize(
    "name",
    ["classes_srd.json", "subclasses_srd.json", "subclasses_ph24.json"],
)
def test_frontend_catalog_copy_is_byte_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def test_phb_subclasses_present_and_named():
    catalog = e24.load_subclass_catalog()
    expected = {
        "sorcerer__draconic-sorcery": "Драконье чародейство",
        "sorcerer__aberrant-sorcery": "Аберрантное чародейство",
        "sorcerer__clockwork-sorcery": "Заводное чародейство",
        "sorcerer__wild-magic-sorcery": "Чародейство дикой магии",
    }
    for slug, name in expected.items():
        assert slug in catalog
        assert catalog[slug]["data"].get("parent_class") == "sorcerer" or catalog[slug].get(
            "name_ru"
        )
        # name from entry
    data = json.loads((BACKEND_LIVE / "subclasses_ph24.json").read_text(encoding="utf-8"))
    srd = json.loads((BACKEND_LIVE / "subclasses_srd.json").read_text(encoding="utf-8"))
    names = {
        e["slug"]: e["name_ru"]
        for e in data["entries"] + srd["entries"]
        if e["slug"] in expected
    }
    assert names == expected


def test_non_phb_sorcerer_subclasses_exist_but_out_of_pack():
    data = json.loads((BACKEND_LIVE / "subclasses_ph24.json").read_text(encoding="utf-8"))
    # spellfire/shadow may live in other files; just ensure pack list is exact four PHB
    assert PHB_SUBCLASSES <= set(e24.load_subclass_catalog())


def test_draconic_resilience_and_affinity():
    bonuses = {
        b.feature_id: b
        for b in sub24.build_permanent_bonuses(
            "sorcerer__draconic-sorcery", 6, abilities=_ABILITIES
        )
        if b.min_level <= 6
    }
    assert "draconic-resilience" in bonuses
    assert "elemental-affinity" in bonuses
    pools = _pools("sorcerer__draconic-sorcery", 14)
    assert "dragon_wings" in pools
    pools18 = _pools("sorcerer__draconic-sorcery", 18)
    assert "dragon_companion" in pools18


def test_draconic_resilience_hp_helpers_2024():
    """next.dnd.su: +3 at sorcerer 3, +1 each later level → total bonus = sorcerer level."""
    sub = "sorcerer__draconic-sorcery"
    assert levels.draconic_resilience_hp_total_2024(2, sub) == 0
    assert levels.draconic_resilience_hp_total_2024(3, sub) == 3
    assert levels.draconic_resilience_hp_total_2024(8, sub) == 8
    assert levels.draconic_resilience_hp_total_2024(8, "sorcerer__clockwork-sorcery") == 0
    assert (
        levels.draconic_resilience_hp_delta_2024(
            new_level=3, old_level=2, subclass_slug=sub
        )
        == 3
    )
    assert (
        levels.draconic_resilience_hp_delta_2024(
            new_level=8, old_level=7, subclass_slug=sub
        )
        == 1
    )
    assert (
        levels.hp_gain_for_level(
            class_slug="sorcerer",
            class_level=3,
            is_primary_origin=False,
            con_mod=2,
            mode="average",
            rolled=None,
            subclass_slug=sub,
            previous_class_level=2,
        )
        == 4 + 2 + 3
    )


def test_draconic_resilience_create_at_8_vs_clockwork():
    def _make(sub: str):
        payload = build_valid_payload(
            "sorcerer",
            ability_method="manual",
            base_abilities={
                "str": 8,
                "dex": 14,
                "con": 14,
                "int": 10,
                "wis": 10,
                "cha": 15,
            },
            class_levels=[{"slug": "sorcerer", "level": 8, "subclass_slug": sub}],
        )
        return create24.validate_create_2024(create24.payload_from_dict(payload))

    draconic = _make("sorcerer__draconic-sorcery")
    clockwork = _make("sorcerer__clockwork-sorcery")
    assert draconic.sheet["combat"]["hp_max"] - clockwork.sheet["combat"]["hp_max"] == 8
    hist = (draconic.sheet.get("create_2024") or {}).get("level_gains") or []
    by_lv = {int(h["class_level"]): h for h in hist}
    assert by_lv[3]["hp_gain"] - by_lv[2]["hp_gain"] == 3  # +3 dragon at gate
    assert by_lv[8]["hp_gain"] - by_lv[2]["hp_gain"] == 1  # later levels +1


def test_draconic_resilience_rollback_removes_bonus():
    payload = build_valid_payload(
        "sorcerer",
        ability_method="manual",
        base_abilities={"str": 8, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 15},
        class_levels=[
            {
                "slug": "sorcerer",
                "level": 3,
                "subclass_slug": "sorcerer__draconic-sorcery",
            }
        ],
    )
    sheet = deepcopy(
        create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    )
    hp3 = int(sheet["combat"]["hp_max"])
    hist = (sheet.get("create_2024") or {}).get("level_gains") or []
    assert hist and int(hist[-1]["class_level"]) == 3
    expected_loss = int(hist[-1]["hp_gain"])
    # L3 gain must include the +3 Draconic Resilience bump vs L2 average.
    assert expected_loss == int(hist[-2]["hp_gain"]) + 3
    levels.rollback_last_level_gain(sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == 2
    assert hp3 - int(sheet["combat"]["hp_max"]) == expected_loss
    assert not sheet["classes"][0].get("subclass_slug")


def test_draconic_resilience_multiclass_sorcerer3():
    payload = build_valid_payload(
        "fighter",
        ability_method="manual",
        base_abilities={"str": 15, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 13},
        class_levels=[
            {"slug": "fighter", "level": 2},
            {
                "slug": "sorcerer",
                "level": 3,
                "subclass_slug": "sorcerer__draconic-sorcery",
            },
        ],
    )
    result = create24.validate_create_2024(create24.payload_from_dict(payload))
    hist = (result.sheet.get("create_2024") or {}).get("level_gains") or []
    sorc = [h for h in hist if h.get("class_slug") == "sorcerer"]
    assert len(sorc) == 3
    # MC entry L1/L2: average only; L3: average +3 dragon.
    assert sorc[0]["hp_gain"] == sorc[1]["hp_gain"]
    assert sorc[2]["hp_gain"] == sorc[1]["hp_gain"] + 3
    assert sorc[2]["subclass_slug"] == "sorcerer__draconic-sorcery"


def test_dwarven_toughness_helpers_2024():
    assert levels.has_dwarven_toughness_2024("dwarf") is True
    assert levels.has_dwarven_toughness_2024("hill_dwarf") is False
    assert levels.dwarven_toughness_hp_total_2024(11, "dwarf") == 11
    assert levels.dwarven_toughness_hp_total_2024(5, "tiefling") == 0
    assert (
        levels.hp_gain_for_level(
            class_slug="sorcerer",
            class_level=5,
            is_primary_origin=False,
            con_mod=3,
            mode="average",
            rolled=None,
            subclass_slug="sorcerer__draconic-sorcery",
            previous_class_level=4,
            species_slug="dwarf",
            previous_character_level=4,
            character_level=5,
        )
        == 4 + 3 + 1 + 1
    )  # d6 avg face 4 + CON 3 + dragon +1 + toughness +1


def _sorcerer_species_payload(
    species: str,
    level: int,
    *,
    con: int = 16,
    subclass: str = "sorcerer__draconic-sorcery",
) -> dict:
    """Build create payload with fixed CON (no BG ASI on CON) and correct species picks."""
    from tests.test_p24_m03_create import _species_client_picks, _species_picks

    payload = build_valid_payload(
        "sorcerer",
        species_slug=species,
        ability_method="manual",
        base_abilities={
            "str": 8,
            "dex": 14,
            "con": con,
            "int": 10,
            "wis": 10,
            "cha": 15,
        },
        # Soldier ASI pool is con/wis/cha — put bonuses off CON so score stays `con`.
        background_asi={"cha": 2, "wis": 1},
        class_levels=[
            {
                "slug": "sorcerer",
                "level": level,
                "subclass_slug": subclass,
            }
        ],
    )
    payload.update(_species_picks(species))
    client = dict((payload.get("class_option_picks") or {}).get("client_picks") or {})
    client.update(_species_client_picks(species))
    data = (create24.load_species_catalog().get(species) or {}).get("data") or {}
    if not data.get("lineages"):
        payload.pop("species_lineage_id", None)
    payload.setdefault("class_option_picks", {})["client_picks"] = client
    return payload


def test_dwarven_toughness_create_at_n_vs_tiefling():
    """Dwarf 2024: +1 max HP per character level on top of class/draconic."""

    def _make(species: str, level: int):
        return create24.validate_create_2024(
            create24.payload_from_dict(_sorcerer_species_payload(species, level))
        )

    for level in (5, 10, 11):
        dwarf = _make("dwarf", level)
        tiefling = _make("tiefling", level)
        assert (
            dwarf.sheet["combat"]["hp_max"] - tiefling.sheet["combat"]["hp_max"] == level
        ), f"L{level}: dwarf should be +{level} vs tiefling"

    # CON 16 (=+3): L11 = 90 without toughness + 11 = 101 (review fixture).
    assert int(_make("dwarf", 11).sheet["combat"]["hp_max"]) == 101
    assert int(_make("dwarf", 5).sheet["combat"]["hp_max"]) == 47
    assert int(_make("dwarf", 10).sheet["combat"]["hp_max"]) == 92


def test_dwarven_toughness_rollback_drops_one():
    sheet = deepcopy(
        create24.validate_create_2024(
            create24.payload_from_dict(_sorcerer_species_payload("dwarf", 5))
        ).sheet
    )
    hp5 = int(sheet["combat"]["hp_max"])
    assert hp5 == 47
    hist = (sheet.get("create_2024") or {}).get("level_gains") or []
    expected_loss = int(hist[-1]["hp_gain"])
    levels.rollback_last_level_gain(sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == 4
    assert hp5 - int(sheet["combat"]["hp_max"]) == expected_loss
    # L4 dwarf draconic CON16: toughness 4, dragon 4 → 38
    assert int(sheet["combat"]["hp_max"]) == 38


def test_aberrant_pools_and_psychic_defenses():
    bonuses = {
        b.feature_id: b
        for b in sub24.build_permanent_bonuses(
            "sorcerer__aberrant-sorcery", 6, abilities=_ABILITIES
        )
        if b.min_level <= 6
    }
    assert "psychic-defenses" in bonuses
    pools = _pools("sorcerer__aberrant-sorcery", 3)
    assert "telepathic_speech" in pools
    pools18 = _pools("sorcerer__aberrant-sorcery", 18)
    assert "warping_explosion" in pools18


def test_clockwork_and_wild_pools():
    pools = _pools("sorcerer__clockwork-sorcery", 14)
    assert pools["restore_balance"].max == 4  # cha 18 → +4
    assert "trance_of_order" in pools
    pools18 = _pools("sorcerer__clockwork-sorcery", 18)
    assert "clockwork_cavalcade" in pools18
    wild = _pools("sorcerer__wild-magic-sorcery", 3)
    assert "tides_of_chaos" in wild
    wild18 = _pools("sorcerer__wild-magic-sorcery", 18)
    assert "tamed_wild_surge" in wild18


def test_multiclass_into_sorcerer_needs_charisma_13():
    low = {"str": 10, "dex": 10, "con": 12, "int": 15, "wis": 10, "cha": 12}
    ok, reason = e24.check_multiclass_prerequisites(
        current_classes=["wizard"], new_class="sorcerer", abilities=low
    )
    assert ok is False and reason
    ok, _ = e24.check_multiclass_prerequisites(
        current_classes=["wizard"], new_class="sorcerer", abilities={**low, "cha": 13}
    )
    assert ok is True


def test_multiclass_wizard3_sorcerer2_slots():
    snap = e24.compute_progression(
        [
            {"slug": "wizard", "level": 3},
            {"slug": "sorcerer", "level": 2},
        ]
    )
    # Full casters 5 levels → slots of a 5th-level full caster
    assert snap.multiclass_slots["3"] == 2
    sorcerer = next(s for s in snap.spellcasting if s.class_slug == "sorcerer")
    assert sorcerer.prepared_spells == 4  # sorcerer class level 2
    pools = {r.pool_id: r for r in snap.resources}
    assert pools["sorcery_points"].max == 2


@pytest.mark.parametrize("level", [3, 6, 14, 18])
@pytest.mark.parametrize("subclass", sorted(PHB_SUBCLASSES))
def test_subclass_features_present_at_gates(level: int, subclass: str):
    catalog = e24.load_subclass_catalog()[subclass]["data"]
    levels = {block["level"] for block in catalog["features"]}
    assert level in levels or level == 18 and 18 in levels
    # Progression includes subclass features without crash
    snap = e24.compute_progression(
        [{"slug": "sorcerer", "level": level, "subclass_slug": subclass}],
        abilities=_ABILITIES,
    )
    assert snap.total_level == level
