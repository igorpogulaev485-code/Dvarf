"""P24-M02a: 2024 class tables, resources, rest, spell prep, multiclass."""

from __future__ import annotations

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24


CLASS_SLUGS = [
    "barbarian",
    "bard",
    "cleric",
    "druid",
    "fighter",
    "monk",
    "paladin",
    "ranger",
    "rogue",
    "sorcerer",
    "warlock",
    "wizard",
    "artificer",
]

CHECKPOINT_LEVELS = (1, 3, 5, 11, 20)


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


def test_catalog_loads_13_classes():
    catalog = e24.load_class_catalog()
    for slug in CLASS_SLUGS:
        assert slug in catalog, slug
    assert catalog["fighter"]["data"]["subclass_level"] == 3
    assert catalog["fighter"]["data"]["epic_boon_level"] == 19
    assert 4 in catalog["fighter"]["data"]["feat_levels"]
    assert 19 not in catalog["fighter"]["data"]["feat_levels"]


@pytest.mark.parametrize("slug", CLASS_SLUGS)
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_progression_checkpoints(slug: str, level: int):
    subclass = e24.SRD_SUBCLASS_BY_PARENT.get(slug)
    # Artificer: pick first EFA specialty if present
    if slug == "artificer":
        subs = [
            s
            for s, row in e24.load_subclass_catalog().items()
            if (row["data"] or {}).get("parent_class") == "artificer"
        ]
        subclass = sorted(subs)[0] if subs else None

    snap = e24.compute_progression(
        [{"slug": slug, "level": level, "subclass_slug": subclass if level >= 3 else None}],
        abilities={"str": 16, "dex": 14, "con": 14, "int": 12, "wis": 12, "cha": 14},
    )
    assert snap.total_level == level
    assert snap.proficiency_bonus == e24.proficiency_bonus_for_level(level)
    assert snap.subclass_level == 3
    if level >= 4:
        assert 4 in snap.feat_levels_reached
    if level >= 19:
        assert snap.epic_boon_reached is True
    else:
        assert snap.epic_boon_reached is False

    # Features unlocked (at least class features at this level)
    assert any(f.class_level <= level for f in snap.features)

    if level >= 3 and subclass:
        assert any(f.source == "subclass" for f in snap.features), slug

    # Resource / spell sanity by class family
    pool_ids = {r.pool_id for r in snap.resources}
    scales_keys = set(snap.scales)

    if slug == "fighter":
        assert "second_wind" in pool_ids
        sw = next(r for r in snap.resources if r.pool_id == "second_wind")
        expected_sw = {1: 2, 3: 2, 5: 3, 11: 4, 20: 4}[level]
        assert sw.max == expected_sw
        assert sw.short_rest_regain == 1
        if level >= 2:
            assert "action_surge" in pool_ids
            surge = next(r for r in snap.resources if r.pool_id == "action_surge")
            assert surge.blocks_magic_action is True
            assert surge.max == (2 if level >= 17 else 1)
        if level >= 9:
            assert "indomitable" in pool_ids

    if slug == "barbarian":
        assert "rages" in pool_ids
        assert any(k.endswith(":rage_damage") for k in scales_keys)

    if slug == "bard":
        assert "bardic_inspiration" in pool_ids
        bi = next(r for r in snap.resources if r.pool_id == "bardic_inspiration")
        assert bi.max == snap.proficiency_bonus
        assert bi.distinct_from_heroic is True
        assert bi.reset == ("short" if level >= 5 else "long")
        assert snap.spellcasting
        assert snap.spellcasting[0].prepared_spells > 0

    if slug == "monk" and level >= 2:
        assert "focus_points" in pool_ids
        fp = next(r for r in snap.resources if r.pool_id == "focus_points")
        assert fp.max == level

    if slug == "cleric" and level >= 2:
        assert "channel_divinity" in pool_ids

    if slug == "druid" and level >= 2:
        assert "wild_shape" in pool_ids

    if slug == "paladin":
        assert "lay_on_hands_hp" in pool_ids
        loh = next(r for r in snap.resources if r.pool_id == "lay_on_hands_hp")
        assert loh.max == 5 * level
        if level >= 3:
            assert "channel_divinity" in pool_ids

    if slug == "ranger":
        assert "favored_enemy_uses" in pool_ids
        if snap.spellcasting:
            assert "hunters-mark" in snap.spellcasting[0].always_prepared

    if slug == "rogue":
        assert any(k.endswith(":sneak_attack") for k in scales_keys)

    if slug == "sorcerer" and level >= 2:
        assert "sorcery_points" in pool_ids

    if slug == "warlock":
        assert snap.spellcasting
        assert snap.spellcasting[0].progression == "pact"
        assert snap.multiclass_pact is not None
        assert snap.multiclass_pact["count"] >= 1

    if slug == "wizard":
        assert "arcane_recovery" in pool_ids
        assert snap.spellcasting
        prep = {1: 4, 3: 6, 5: 9, 11: 16, 20: 25}[level]
        assert snap.spellcasting[0].prepared_spells == prep

    if slug == "artificer" and level >= 2:
        assert any(k.endswith(":replicate_magic_items") for k in scales_keys)


def test_action_surge_blocks_magic():
    assert e24.action_surge_allows_action("attack") is True
    assert e24.action_surge_allows_action("dash") is True
    assert e24.action_surge_allows_action("magic") is False
    assert e24.action_surge_allows_action("Магия") is False
    assert e24.action_surge_allows_action("cast") is False


def test_bardic_not_heroic():
    snap = e24.compute_progression([{"slug": "bard", "level": 1}])
    bi = next(r for r in snap.resources if r.pool_id == "bardic_inspiration")
    assert bi.distinct_from_heroic is True
    assert "heroic" not in bi.pool_id
    assert bi.name_ru == "Бардовское вдохновение"


def test_second_wind_short_rest_regains_one():
    resources = [
        {
            "id": "feat:fighter:second_wind:second_wind",
            "pool_id": "second_wind",
            "max": 3,
            "used": 3,
            "reset": "long",
            "short_rest_regain": 1,
        },
        {
            "id": "feat:fighter:action_surge:action_surge",
            "pool_id": "action_surge",
            "max": 1,
            "used": 1,
            "reset": "short",
        },
    ]
    after_short = e24.apply_short_rest_to_resources(resources)
    by_pool = {r["pool_id"]: r for r in after_short}
    assert by_pool["second_wind"]["used"] == 2
    assert by_pool["action_surge"]["used"] == 0
    after_long = e24.apply_long_rest_to_resources(after_short)
    assert all(r["used"] == 0 for r in after_long)


def test_multiclass_prerequisites_2024():
    ok, _ = e24.check_multiclass_prerequisites(
        current_classes=["fighter"],
        new_class="wizard",
        abilities={"str": 15, "dex": 10, "con": 12, "int": 14, "wis": 10, "cha": 10},
    )
    assert ok is True

    ok2, reason = e24.check_multiclass_prerequisites(
        current_classes=["fighter"],
        new_class="wizard",
        abilities={"str": 15, "dex": 10, "con": 12, "int": 10, "wis": 10, "cha": 10},
    )
    assert ok2 is False
    assert "ИНТ" in reason or "INT" in reason.upper() or "int" in reason.lower() or "Интеллект" in reason or "ИНТ" in reason

    # Fighter any-of Str/Dex
    ok3, _ = e24.check_multiclass_prerequisites(
        current_classes=["wizard"],
        new_class="fighter",
        abilities={"str": 10, "dex": 14, "con": 12, "int": 15, "wis": 10, "cha": 10},
    )
    assert ok3 is True


def test_multiclass_spell_slots():
    # Cleric 3 + Wizard 2 = full caster 5 → slots of level 5 full caster
    snap = e24.compute_progression(
        [
            {"slug": "cleric", "level": 3, "subclass_slug": "cleric__life-domain"},
            {"slug": "wizard", "level": 2},
        ]
    )
    assert snap.multiclass_slots["1"] == 4
    assert snap.multiclass_slots["2"] == 3
    assert snap.multiclass_slots["3"] == 2
    # Prepared budgets stay per-class
    by_slug = {b.class_slug: b for b in snap.spellcasting}
    assert by_slug["cleric"].prepared_spells == 6
    assert by_slug["wizard"].prepared_spells == 5

    # Half + full: paladin 4 (2) + bard 3 (3) = caster 5
    snap2 = e24.compute_progression(
        [
            {"slug": "paladin", "level": 4, "subclass_slug": "paladin__oath-of-devotion"},
            {"slug": "bard", "level": 3, "subclass_slug": "bard__lore"},
        ]
    )
    assert e24.multiclass_caster_level([("paladin", 4), ("bard", 3)]) == 5
    assert snap2.multiclass_slots["3"] == 2


def test_multiclass_proficiencies_table():
    fighter = e24.multiclass_proficiencies_for("fighter")
    assert "martial" in fighter["weapons"]
    assert "light" in fighter["armor"]
    wizard = e24.multiclass_proficiencies_for("wizard")
    assert wizard["armor"] == []
    assert wizard["skills"] == 0


def test_life_domain_always_prepared():
    snap = e24.compute_progression(
        [{"slug": "cleric", "level": 5, "subclass_slug": "cleric__life-domain"}]
    )
    always = snap.spellcasting[0].always_prepared
    assert "bless" in always
    assert "cure-wounds" in always
    assert "revivify" in always


def test_2014_rejects_class_progress():
    with pytest.raises(e24.Edition2024ClassError):
        e24.validate_class_progress_update(
            rules_edition="2014",
            previous=None,
            incoming={"resources": []},
            sheet={"classes": [{"name": "Боец", "level": 1}]},
        )
    stripped = e24.strip_class_progress_from_sheet_for_2014(
        {"class_progress_2024": {"x": 1}, "hp": 10}
    )
    assert "class_progress_2024" not in stripped
    assert stripped["hp"] == 10


def test_validate_preserves_used_counters():
    sheet = {
        "classes": [{"name": "Боец", "level": 5, "slug": "fighter"}],
        "abilities": {"str": 16, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 10},
    }
    snap = e24.compute_progression(
        [{"slug": "fighter", "level": 5}],
        abilities=sheet["abilities"],
    )
    fragment = e24.snapshot_to_sheet_fragment(snap)
    fragment["resources"][0]["used"] = 1
    out = e24.validate_class_progress_update(
        rules_edition="2024",
        previous=fragment,
        incoming=fragment,
        sheet=sheet,
    )
    assert out is not None
    assert out["resources"][0]["used"] == 1
    assert out["proficiency_bonus"] == 3


def test_alembic_head_unchanged_expectation():
    # M02a stores progress in sheet JSON — no new migration required.
    # Guard: module import works; head remains p24n01r01 (checked in CI separately).
    assert e24.load_class_catalog()
