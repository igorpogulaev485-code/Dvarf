"""P24-M02-warlock: 2024 warlock tables, pact magic, invocations, PHB patrons."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.config import settings
from app.dnd import edition_2024_class_options as opt
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_create as create24
from app.dnd import edition_2024_subclasses as sub24
from tests.test_p24_m03_create import build_valid_payload

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_LIVE = REPO_ROOT / "backend" / "data" / "srd" / "2024" / "live"
FRONTEND_COPY = REPO_ROOT / "frontend" / "src" / "shared" / "dnd" / "data" / "edition2024"

WARLOCK_PREPARED = {
    1: 2,
    3: 4,
    5: 6,
    11: 11,
    20: 15,
}
WARLOCK_CANTRIPS = {1: 2, 4: 3, 5: 3, 10: 4, 11: 4, 20: 4}
WARLOCK_INVOCATIONS = {
    1: 1,
    2: 3,
    5: 5,
    9: 7,
    11: 7,
    12: 8,
    17: 9,
    18: 10,
    20: 10,
}
WARLOCK_PACT = {
    1: (1, 1),
    2: (1, 2),
    3: (2, 2),
    5: (3, 2),
    9: (5, 2),
    11: (5, 3),
    17: (5, 4),
    20: (5, 4),
}

WARLOCK_FEATURE_NAMES_RU = {
    "eldritch-invocations": "Таинственные воззвания",
    "pact-magic": "Магия договора",
    "magical-cunning": "Магическая искусность",
    "warlock-subclass": "Подкласс Колдуна",
    "contact-patron": "Связь с покровителем",
    "mystic-arcanum": "Таинственный арканум",
    "eldritch-master": "Таинственный мастер",
}

PHB_SUBCLASSES = {
    "warlock__archfey": "Архифея",
    "warlock__celestial-patron": "Небожитель",
    "warlock__fiend-patron": "Исчадие",
    "warlock__greate-old-one-patron": "Великий древний",
}

OUT_OF_PACK = {
    "warlock__undead",
    "warlock__vestige-patron",
}

_ABILITIES = {"str": 8, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 16}


def _warlock_features() -> dict[str, dict]:
    data = e24.load_class_catalog()["warlock"]["data"]
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


@pytest.mark.parametrize("level,prepared", sorted(WARLOCK_PREPARED.items()))
def test_warlock_prepared_table(level: int, prepared: int):
    snap = e24.compute_progression([{"slug": "warlock", "level": level}])
    assert snap.spellcasting[0].prepared_spells == prepared


@pytest.mark.parametrize("level,cantrips", sorted(WARLOCK_CANTRIPS.items()))
def test_warlock_cantrips_table(level: int, cantrips: int):
    snap = e24.compute_progression([{"slug": "warlock", "level": level}])
    assert snap.spellcasting[0].cantrips == cantrips


@pytest.mark.parametrize("level,expected", sorted(WARLOCK_PACT.items()))
def test_warlock_pact_slots_table(level: int, expected: tuple[int, int]):
    slot_level, count = expected
    snap = e24.compute_progression([{"slug": "warlock", "level": level}])
    assert snap.multiclass_pact == {"level": slot_level, "count": count}
    assert snap.spellcasting[0].pact_slots == {"level": slot_level, "count": count}
    # Pact never merges into multiclass full-caster slots for pure warlock.
    assert snap.multiclass_slots == {} or all(
        int(v) == 0 for v in (snap.multiclass_slots or {}).values()
    )


@pytest.mark.parametrize("level,count", sorted(WARLOCK_INVOCATIONS.items()))
def test_warlock_invocation_limits(level: int, count: int):
    assert opt.warlock_invocation_limit(level) == count
    snap = e24.compute_progression([{"slug": "warlock", "level": level}])
    assert snap.scales.get("warlock:eldritch_invocations") == count


def test_magical_cunning_and_contact_patron_pools():
    snap1 = e24.compute_progression([{"slug": "warlock", "level": 1}])
    assert all(r.pool_id != "magical_cunning" for r in snap1.resources)
    snap2 = e24.compute_progression([{"slug": "warlock", "level": 2}])
    pool = next(r for r in snap2.resources if r.pool_id == "magical_cunning")
    assert pool.max == 1
    assert pool.name_ru == "Магическая искусность"
    assert pool.reset == "long"

    snap8 = e24.compute_progression([{"slug": "warlock", "level": 8}])
    assert all(r.pool_id != "contact_patron" for r in snap8.resources)
    snap9 = e24.compute_progression([{"slug": "warlock", "level": 9}])
    contact = next(r for r in snap9.resources if r.pool_id == "contact_patron")
    assert contact.max == 1
    assert contact.name_ru == "Связь с покровителем"


def test_mystic_arcanum_pools_by_level():
    for level, expected in (
        (10, set()),
        (11, {"mystic_arcanum_6"}),
        (13, {"mystic_arcanum_6", "mystic_arcanum_7"}),
        (15, {"mystic_arcanum_6", "mystic_arcanum_7", "mystic_arcanum_8"}),
        (17, {"mystic_arcanum_6", "mystic_arcanum_7", "mystic_arcanum_8", "mystic_arcanum_9"}),
        (20, {"mystic_arcanum_6", "mystic_arcanum_7", "mystic_arcanum_8", "mystic_arcanum_9"}),
    ):
        snap = e24.compute_progression([{"slug": "warlock", "level": level}])
        pools = {r.pool_id for r in snap.resources if r.pool_id.startswith("mystic_arcanum_")}
        assert pools == expected


def test_warlock_subclass_comes_at_level_3():
    assert e24.load_class_catalog()["warlock"]["data"]["subclass_level"] == 3
    snap = e24.compute_progression(
        [{"slug": "warlock", "level": 3, "subclass_slug": "warlock__fiend-patron"}]
    )
    assert snap.subclass_level == 3


def test_warlock_no_weapon_mastery():
    data = e24.load_class_catalog()["warlock"]["data"]
    assert data["weapon_mastery"]["enabled"] is False


def test_warlock_feature_names_ru():
    feats = _warlock_features()
    for fid, name in WARLOCK_FEATURE_NAMES_RU.items():
        assert feats[fid]["name_ru"] == name, fid
    # Eldritch Master summary must describe 2024 Magical Cunning upgrade, not 2014 ritual.
    summary = feats["eldritch-master"]["summary_ru"].lower()
    assert "искусность" in summary or "магическая" in summary
    assert "все" in summary


def test_invocation_catalog_ru_and_count():
    assert len(opt.ELDRITCH_INVOCATIONS_2024) == 28
    by_id = {row.id: row for row in opt.ELDRITCH_INVOCATIONS_2024}
    assert by_id["agonizing-blast"].name_ru == "Мучительный взрыв"
    assert by_id["pact-of-the-tome"].name_ru == "Договор гримуара"
    assert by_id["lessons-of-the-first-ones"].name_ru == "Уроки древних"
    assert by_id["investment-of-the-chain-master"].name_ru == "Облачение хозяина цепи"
    assert by_id["devouring-blade"].requires_invocation == "thirsting-blade"
    assert by_id["thirsting-blade"].requires_pact == "blade"
    # Out-of-pack invocations must not be present.
    assert "pact-of-the-talisman" not in by_id
    assert "pact-of-the-legion" not in by_id


def test_invocation_validation_prereqs():
    ok = opt.validate_eldritch_invocations(
        ["pact-of-the-blade", "armor-of-shadows", "eldritch-mind"],
        warlock_level=2,
    )
    assert ok == ["pact-of-the-blade", "armor-of-shadows", "eldritch-mind"]
    with pytest.raises(e24.Edition2024ClassError) as exc:
        opt.validate_eldritch_invocations(
            ["thirsting-blade"],
            warlock_level=5,
        )
    assert exc.value.code == "invocation_pact"


@pytest.mark.parametrize(
    "name",
    ["classes_srd.json", "subclasses_srd.json", "subclasses_ph24.json"],
)
def test_frontend_catalog_copy_is_byte_identical(name: str):
    assert (BACKEND_LIVE / name).read_bytes() == (FRONTEND_COPY / name).read_bytes()


def test_phb_subclasses_present_and_named():
    data = json.loads((BACKEND_LIVE / "subclasses_ph24.json").read_text(encoding="utf-8"))
    srd = json.loads((BACKEND_LIVE / "subclasses_srd.json").read_text(encoding="utf-8"))
    names = {
        e["slug"]: e["name_ru"]
        for e in data["entries"] + srd["entries"]
        if e["slug"] in PHB_SUBCLASSES
    }
    assert names == PHB_SUBCLASSES


def test_out_of_pack_patrons_not_in_phb_pack_list():
    """Нежить / Предтеча may exist in catalogs but are out of this pack."""
    catalog = e24.load_subclass_catalog()
    for slug in OUT_OF_PACK:
        # May or may not be present; if present, not in PHB pack assertion set.
        assert slug not in PHB_SUBCLASSES
        if slug in catalog:
            assert catalog[slug]["data"].get("parent_class") == "warlock"


def test_archfey_spell_list_plant_growth():
    data = json.loads((BACKEND_LIVE / "subclasses_ph24.json").read_text(encoding="utf-8"))
    entry = next(e for e in data["entries"] if e["slug"] == "warlock__archfey")
    block5 = next(b for b in entry["data"]["spell_list"] if b["level"] == 5)
    assert block5["spells"] == ["blink", "plant-growth"]


@pytest.mark.parametrize(
    "slug,level,expected_ids",
    [
        ("warlock__archfey", 3, {"archfey-spells", "steps-of-the-fey"}),
        ("warlock__archfey", 6, {"misty-escape"}),
        ("warlock__archfey", 10, {"beguiling-defenses"}),
        ("warlock__archfey", 14, {"bewitching-magic"}),
        ("warlock__celestial-patron", 3, {"celestial-spells", "healing-light"}),
        ("warlock__celestial-patron", 6, {"radiant-soul"}),
        ("warlock__celestial-patron", 10, {"celestial-resilience"}),
        ("warlock__celestial-patron", 14, {"searing-vengeance"}),
        ("warlock__fiend-patron", 3, {"fiend-spells", "dark-ones-blessing"}),
        ("warlock__fiend-patron", 6, {"dark-ones-own-luck"}),
        ("warlock__fiend-patron", 10, {"fiendish-resilience"}),
        ("warlock__fiend-patron", 14, {"hurl-through-hell"}),
        (
            "warlock__greate-old-one-patron",
            3,
            {"great-old-one-spells", "awakened-mind", "psychic-spells"},
        ),
        ("warlock__greate-old-one-patron", 6, {"clairvoyant-combatant"}),
        ("warlock__greate-old-one-patron", 10, {"eldritch-hex", "thought-shield"}),
        ("warlock__greate-old-one-patron", 14, {"create-thrall"}),
    ],
)
def test_subclass_checklist_presence(slug: str, level: int, expected_ids: set[str]):
    pools = set(_pools(slug, level))
    catalog = e24.load_subclass_catalog()[slug]["data"]["features"]
    cat_ids = {
        f["id"]
        for block in catalog
        if int(block.get("level") or 0) <= level
        for f in block.get("features") or []
    }
    bonuses = {
        b.feature_id
        for b in sub24.build_permanent_bonuses(slug, level, abilities=_ABILITIES)
        if b.min_level <= level
    }
    found = cat_ids | {p.replace("_", "-") for p in pools} | pools | bonuses
    for eid in expected_ids:
        assert eid in found or eid.replace("-", "_") in found, (slug, level, eid, found)


def test_subclass_resource_pools():
    archfey = _pools("warlock__archfey", 10)
    assert archfey["steps_of_the_fey"].max == max(1, (16 - 10) // 2)
    assert archfey["steps_of_the_fey"].name_ru == "Шаг феи"
    assert archfey["beguiling_defenses"].max == 1

    celestial = _pools("warlock__celestial-patron", 14)
    assert celestial["healing_light"].max == 1 + 14
    assert celestial["searing_vengeance"].max == 1

    fiend6 = _pools("warlock__fiend-patron", 6)
    assert fiend6["dark_ones_own_luck"].max == max(1, (16 - 10) // 2)
    fiend14 = _pools("warlock__fiend-patron", 14)
    assert fiend14["hurl_through_hell"].max == 1

    goo = _pools("warlock__greate-old-one-patron", 6)
    assert goo["clairvoyant_combatant"].max == 1
    assert goo["clairvoyant_combatant"].reset == "short"


def test_fiend_dark_ones_blessing_calc_2024():
    bonuses = sub24.build_permanent_bonuses(
        "warlock__fiend-patron", 5, abilities=_ABILITIES
    )
    blessing = next(b for b in bonuses if b.feature_id == "dark-ones-blessing")
    assert blessing.value.get("temp_hp") == max(1, 3 + 5)
    assert blessing.value.get("ally_kill_within_ft") == 10
    note = (blessing.note_ru or "").lower()
    assert "10" in note and "союз" in note


def test_short_rest_resources_do_not_reset_magical_cunning():
    snap = e24.compute_progression([{"slug": "warlock", "level": 5}])
    resources = [
        {
            "id": r.id,
            "pool_id": r.pool_id,
            "max": r.max,
            "used": r.max,
            "reset": r.reset,
            "name": r.name_ru,
        }
        for r in snap.resources
    ]
    after = e24.apply_short_rest_to_resources(resources)
    cunning = next(r for r in after if r.get("pool_id") == "magical_cunning")
    # Magical Cunning is long-rest only — used stays spent after short rest.
    assert cunning.get("used") == cunning.get("max")
    long_after = e24.apply_long_rest_to_resources(resources)
    cunning_long = next(r for r in long_after if r.get("pool_id") == "magical_cunning")
    assert cunning_long.get("used") == 0


def test_multiclass_warlock_wizard_pact_separate():
    snap = e24.compute_progression(
        [
            {"slug": "warlock", "level": 3, "subclass_slug": "warlock__fiend-patron"},
            {"slug": "wizard", "level": 2},
        ]
    )
    assert snap.multiclass_pact == {"level": 2, "count": 2}
    # Wizard 2 + warlock excluded → half/full multiclass slots from wizard only.
    assert snap.multiclass_slots.get("1", 0) >= 3
    assert "3" not in snap.multiclass_slots or snap.multiclass_slots.get("3", 0) == 0

    snap2 = e24.compute_progression(
        [
            {"slug": "wizard", "level": 2},
            {"slug": "warlock", "level": 3, "subclass_slug": "warlock__archfey"},
        ]
    )
    assert snap2.multiclass_pact == {"level": 2, "count": 2}


def test_create_warlock_at_5_and_11():
    for level, slot_level, slot_count, prepared, cantrips, inv in (
        (5, 3, 2, 6, 3, 5),
        (11, 5, 3, 11, 4, 7),
    ):
        payload = build_valid_payload(
            "warlock",
            ability_method="manual",
            base_abilities=_ABILITIES,
            class_levels=[
                {
                    "slug": "warlock",
                    "level": level,
                    "subclass_slug": "warlock__fiend-patron",
                }
            ],
        )
        result = create24.validate_create_2024(create24.payload_from_dict(payload))
        assert sum(int(r["level"]) for r in result.sheet["classes"]) == level
        prog = e24.compute_progression(
            [
                {
                    "slug": "warlock",
                    "level": level,
                    "subclass_slug": "warlock__fiend-patron",
                }
            ],
            abilities=_ABILITIES,
        )
        assert prog.multiclass_pact == {"level": slot_level, "count": slot_count}
        assert prog.spellcasting[0].prepared_spells == prepared
        assert prog.spellcasting[0].cantrips == cantrips
        assert prog.scales.get("warlock:eldritch_invocations") == inv
        weapons = (result.sheet.get("proficiency") or {}).get("weapons") or {}
        assert weapons.get("simple") is True
        assert weapons.get("martial") is not True


def test_create_warlock_rollback_thresholds():
    payload = build_valid_payload(
        "warlock",
        ability_method="manual",
        base_abilities=_ABILITIES,
        class_levels=[
            {
                "slug": "warlock",
                "level": 3,
                "subclass_slug": "warlock__archfey",
            }
        ],
    )
    sheet = create24.validate_create_2024(create24.payload_from_dict(payload)).sheet
    assert sheet["classes"][0].get("subclass_slug") == "warlock__archfey"
    from app.dnd import edition_2024_create_levels as levels

    levels.rollback_last_level_gain(sheet)
    assert sum(int(r["level"]) for r in sheet["classes"]) == 2
    assert not sheet["classes"][0].get("subclass_slug")
    prog = e24.compute_progression([{"slug": "warlock", "level": 2}], abilities=_ABILITIES)
    assert prog.multiclass_pact == {"level": 1, "count": 2}
    assert prog.scales.get("warlock:eldritch_invocations") == 3


def test_level_rollback_pact_and_arcanum_thresholds():
    assert e24.compute_progression([{"slug": "warlock", "level": 5}]).multiclass_pact == {
        "level": 3,
        "count": 2,
    }
    assert e24.compute_progression([{"slug": "warlock", "level": 4}]).multiclass_pact == {
        "level": 2,
        "count": 2,
    }
    assert e24.compute_progression([{"slug": "warlock", "level": 11}]).multiclass_pact == {
        "level": 5,
        "count": 3,
    }
    assert e24.compute_progression([{"slug": "warlock", "level": 10}]).multiclass_pact == {
        "level": 5,
        "count": 2,
    }
    pools11 = {
        r.pool_id
        for r in e24.compute_progression([{"slug": "warlock", "level": 11}]).resources
    }
    pools10 = {
        r.pool_id
        for r in e24.compute_progression([{"slug": "warlock", "level": 10}]).resources
    }
    assert "mystic_arcanum_6" in pools11
    assert "mystic_arcanum_6" not in pools10
    pools20 = {
        r.pool_id
        for r in e24.compute_progression([{"slug": "warlock", "level": 20}]).resources
    }
    pools19 = {
        r.pool_id
        for r in e24.compute_progression([{"slug": "warlock", "level": 19}]).resources
    }
    # Eldritch Master is a feature (text), Magical Cunning pool remains.
    assert "magical_cunning" in pools20 and "magical_cunning" in pools19
    names20 = {
        f.name_ru
        for f in e24.compute_progression([{"slug": "warlock", "level": 20}]).features
    }
    names19 = {
        f.name_ru
        for f in e24.compute_progression([{"slug": "warlock", "level": 19}]).features
    }
    assert "Таинственный мастер" in names20
    assert "Таинственный мастер" not in names19
