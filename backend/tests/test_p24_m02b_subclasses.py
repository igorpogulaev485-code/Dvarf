"""P24-M02b: all 2024 book subclasses — resources, shared options, calcs, text."""

from __future__ import annotations

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_subclasses as e24sub


CHECKPOINT_LEVELS = (3, 11)
THRESHOLD_CASES = (
    ("fighter__champion", 15, "crit_threshold", 18),
    ("fighter__champion", 18, "crit_threshold", 18),
    ("cleric__light-domain", 6, "warding_reset", "short"),
    ("warlock__celestial-patron", 5, "healing_light", 6),
    ("wizard__abjurer", 6, "arcane_ward", 15),
    ("wizard__diviner", 14, "portent", 3),
    ("wizard__diviner", 11, "portent", 2),
    ("sorcerer__draconic-sorcery", 6, "hp_per_level", 1),
    ("paladin__oath-of-devotion", 18, "aura_radius_ft", 30),
    ("paladin__oath-of-devotion", 11, "aura_radius_ft", 10),
)


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


def test_all_subclass_packs_loaded():
    catalog = e24sub.load_subclass_catalog()
    assert len(catalog) >= 76
    sources = {row.get("source") for row in catalog.values()}
    assert "srd-5.2" in sources or any("srd" in str(s) for s in sources)
    assert any(s.startswith("artificer__") for s in catalog)
    assert "fighter__battlemaster" in catalog
    assert "cleric__grave-domain" in catalog
    assert "warlock__vestige-patron" in catalog


@pytest.mark.parametrize("subclass_slug", e24sub.list_all_subclass_slugs())
@pytest.mark.parametrize("level", CHECKPOINT_LEVELS)
def test_subclass_checkpoints(subclass_slug: str, level: int):
    parent = e24sub.subclass_parent(subclass_slug)
    assert parent, subclass_slug
    land = "arid" if subclass_slug == "druid__land" else None
    snap = e24.compute_progression(
        [
            {
                "slug": parent,
                "level": level,
                "subclass_slug": subclass_slug,
                "land_choice": land,
            }
        ],
        abilities={"str": 16, "dex": 14, "con": 14, "int": 16, "wis": 14, "cha": 14},
    )
    assert snap.total_level == level
    assert snap.subclass_level == 3
    assert any(f.source == "subclass" for f in snap.features), subclass_slug
    for f in snap.features:
        if f.source == "subclass":
            assert f.automation in {
                "resource",
                "shared_option",
                "always_prepared",
                "third_caster",
                "calc",
                "text",
            }, (subclass_slug, f.id, f.automation)

    always = []
    for block in snap.spellcasting:
        always.extend(block.always_prepared)
    report = e24sub.classify_subclass(subclass_slug, level=level)
    expected_spells = e24sub.always_prepared_for_subclass(
        subclass_slug, level, land_choice=land
    )
    if expected_spells:
        assert set(expected_spells).issubset(set(always)), (
            subclass_slug,
            expected_spells,
            always,
        )
        assert report["always_prepared_count"] == len(expected_spells)

    for pool_id in report["resources"]:
        assert any(r.pool_id == pool_id for r in snap.resources), (subclass_slug, pool_id)

    if subclass_slug in e24sub.THIRD_CASTER_SUBCLASSES:
        third = [b for b in snap.spellcasting if b.progression == "third"]
        assert third, subclass_slug
        assert third[0].spells_known and third[0].spells_known > 0
        assert snap.multiclass_slots["1"] >= 2


@pytest.mark.parametrize("subclass_slug", e24sub.list_all_subclass_slugs())
def test_subclass_threshold_levels_when_relevant(subclass_slug: str):
    """Extra checkpoints at 18/20 for subclasses that unlock high-level formulas."""
    parent = e24sub.subclass_parent(subclass_slug)
    for level in (18, 20):
        report = e24sub.classify_subclass(subclass_slug, level=level)
        snap = e24.compute_progression(
            [{"slug": parent, "level": level, "subclass_slug": subclass_slug}],
            abilities={"str": 16, "dex": 14, "con": 14, "int": 16, "wis": 14, "cha": 14},
        )
        for pool_id in report["resources"]:
            assert any(r.pool_id == pool_id for r in snap.resources), (
                subclass_slug,
                level,
                pool_id,
            )


def test_battlemaster_superiority_l3_l11():
    for level, expected in ((3, 4), (11, 5)):
        snap = e24.compute_progression(
            [{"slug": "fighter", "level": level, "subclass_slug": "fighter__battlemaster"}]
        )
        pool = next(r for r in snap.resources if r.pool_id == "superiority_dice")
        assert pool.max == expected
        assert pool.reset == "short"
        assert snap.scales.get("fighter:superiority_dice:die") in {"d8", "d10", "d12"}


def test_psi_warrior_energy_dice():
    snap3 = e24.compute_progression(
        [{"slug": "fighter", "level": 3, "subclass_slug": "fighter__psi-warrior"}]
    )
    pool3 = next(r for r in snap3.resources if r.pool_id == "psionic_energy_dice")
    assert pool3.max == 4
    assert pool3.short_rest_regain == 1
    assert snap3.scales["fighter:psionic_energy_dice:die"] == "d6"

    snap11 = e24.compute_progression(
        [{"slug": "fighter", "level": 11, "subclass_slug": "fighter__psi-warrior"}]
    )
    pool11 = next(r for r in snap11.resources if r.pool_id == "psionic_energy_dice")
    assert pool11.max == 8
    assert snap11.scales["fighter:psionic_energy_dice:die"] == "d10"


def test_alchemist_elixirs_and_spells():
    snap = e24.compute_progression(
        [{"slug": "artificer", "level": 3, "subclass_slug": "artificer__alchemist"}],
        abilities={"int": 16},
    )
    elixir = next(r for r in snap.resources if r.pool_id == "experimental_elixir")
    assert elixir.max == 2
    always = snap.spellcasting[0].always_prepared
    assert "healing-word" in always
    assert "ray-of-sickness" in always

    snap11 = e24.compute_progression(
        [{"slug": "artificer", "level": 11, "subclass_slug": "artificer__alchemist"}],
        abilities={"int": 16},
    )
    elixir11 = next(r for r in snap11.resources if r.pool_id == "experimental_elixir")
    assert elixir11.max == 4
    reagents = next(r for r in snap11.resources if r.pool_id == "restorative_reagents")
    assert reagents.max == 3  # INT 16 → +3
    always11 = snap11.spellcasting[0].always_prepared
    assert "gaseous-form" in always11
    assert "mass-healing-word" in always11


def test_land_circle_requires_land_choice():
    no_land = e24.compute_progression(
        [{"slug": "druid", "level": 5, "subclass_slug": "druid__land"}]
    )
    always_empty = no_land.spellcasting[0].always_prepared
    arid = e24.compute_progression(
        [
            {
                "slug": "druid",
                "level": 5,
                "subclass_slug": "druid__land",
                "land_choice": "arid",
            }
        ]
    )
    always_arid = arid.spellcasting[0].always_prepared
    assert len(always_arid) > len(always_empty)
    assert "blur" in always_arid or "burning-hands" in always_arid


def test_life_domain_still_always_prepared():
    snap = e24.compute_progression(
        [{"slug": "cleric", "level": 5, "subclass_slug": "cleric__life-domain"}]
    )
    always = snap.spellcasting[0].always_prepared
    assert "bless" in always
    assert "cure-wounds" in always
    assert "mass-healing-word" in always


def test_grave_domain_spells_l3_l11():
    snap3 = e24.compute_progression(
        [{"slug": "cleric", "level": 3, "subclass_slug": "cleric__grave-domain"}]
    )
    always3 = snap3.spellcasting[0].always_prepared
    assert "false-life" in always3
    snap11 = e24.compute_progression(
        [{"slug": "cleric", "level": 11, "subclass_slug": "cleric__grave-domain"}]
    )
    always11 = snap11.spellcasting[0].always_prepared
    assert "raise-dead" in always11
    assert "dispel-evil-and-good" in always11


def test_light_domain_warding_flare_and_channel():
    snap3 = e24.compute_progression(
        [{"slug": "cleric", "level": 3, "subclass_slug": "cleric__light-domain"}],
        abilities={"wis": 16},
    )
    flare = next(r for r in snap3.resources if r.pool_id == "warding_flare")
    assert flare.max == 3
    assert flare.reset == "long"
    channel = next(r for r in snap3.resources if r.pool_id == "channel_divinity")
    assert "radiance_of_the_dawn" in (channel.meta.get("channel_options") or [])

    snap6 = e24.compute_progression(
        [{"slug": "cleric", "level": 6, "subclass_slug": "cleric__light-domain"}],
        abilities={"wis": 16},
    )
    flare6 = next(r for r in snap6.resources if r.pool_id == "warding_flare")
    assert flare6.reset == "short"
    assert any(
        f.id == "improved_warding_flare" and f.automation == "calc"
        for f in snap6.features
        if f.source == "subclass"
    )


def test_champion_crit_thresholds():
    snap3 = e24.compute_progression(
        [{"slug": "fighter", "level": 3, "subclass_slug": "fighter__champion"}]
    )
    assert snap3.scales["fighter:crit_threshold"] == 19
    snap15 = e24.compute_progression(
        [{"slug": "fighter", "level": 15, "subclass_slug": "fighter__champion"}]
    )
    assert snap15.scales["fighter:crit_threshold"] == 18


def test_abjurer_ward_and_celestial_healing():
    snap = e24.compute_progression(
        [{"slug": "wizard", "level": 6, "subclass_slug": "wizard__abjurer"}],
        abilities={"int": 16},
    )
    ward = next(r for r in snap.resources if r.pool_id == "arcane_ward")
    assert ward.max == 15  # 2*6+3
    assert ward.track == "stock"

    cel = e24.compute_progression(
        [{"slug": "warlock", "level": 5, "subclass_slug": "warlock__celestial-patron"}],
        abilities={"cha": 16},
    )
    heal = next(r for r in cel.resources if r.pool_id == "healing_light")
    assert heal.max == 6
    assert heal.meta.get("die") == "d6"
    assert heal.meta.get("per_use_cap_ability") == "cha"


def test_draconic_permanent_bonuses():
    snap = e24.compute_progression(
        [{"slug": "sorcerer", "level": 6, "subclass_slug": "sorcerer__draconic-sorcery"}],
        abilities={"cha": 16, "dex": 14},
    )
    assert snap.scales["sorcerer:hp_per_level"] == 1
    ac = snap.scales["sorcerer:ac_formula"]
    assert ac["base"] == 10
    assert ac["mods"] == ["dex", "cha"]


def test_bard_lore_cutting_words_shared_option():
    snap = e24.compute_progression(
        [{"slug": "bard", "level": 3, "subclass_slug": "bard__lore"}],
        abilities={"cha": 16},
    )
    feat = next(f for f in snap.features if f.id == "cutting_words")
    assert feat.automation == "shared_option"
    bi = next(r for r in snap.resources if r.pool_id == "bardic_inspiration")
    opts = bi.meta.get("subclass_spend_options") or []
    assert any(o["feature_id"] == "cutting-words" for o in opts)


def test_monk_open_hand_focus_option():
    snap = e24.compute_progression(
        [{"slug": "monk", "level": 3, "subclass_slug": "monk__warrior-of-the-hand"}]
    )
    feat = next(f for f in snap.features if f.id == "open_hand_technique")
    assert feat.automation == "shared_option"
    focus = next(r for r in snap.resources if r.pool_id == "focus_points")
    opts = focus.meta.get("subclass_spend_options") or []
    assert any(o["feature_id"] == "open-hand-technique" for o in opts)


def test_paladin_devotion_channel_and_aura():
    snap = e24.compute_progression(
        [{"slug": "paladin", "level": 11, "subclass_slug": "paladin__oath-of-devotion"}]
    )
    channel = next(r for r in snap.resources if r.pool_id == "channel_divinity")
    opts = channel.meta.get("channel_options") or []
    assert "divine_sense" in opts
    assert "sacred_weapon" in opts
    assert snap.scales["paladin:aura_radius_ft"] == 10

    snap18 = e24.compute_progression(
        [{"slug": "paladin", "level": 18, "subclass_slug": "paladin__oath-of-devotion"}]
    )
    assert snap18.scales["paladin:aura_radius_ft"] == 30


def test_2014_strip_untouched_by_subclass_module():
    from app.dnd.edition_2024_classes import strip_class_progress_from_sheet_for_2014

    sheet = {
        "class_progress_2024": {"resources": []},
        "classes": [{"name": "Воин", "level": 5}],
    }
    out = strip_class_progress_from_sheet_for_2014(sheet)
    assert "class_progress_2024" not in out


def test_2014_feature_packs_unchanged_snapshot():
    """Guard: 2014 class feature JSON still present and champion crit text intact."""
    from pathlib import Path

    root = Path(__file__).resolve().parents[1] / "data" / "classes" / "features"
    fighter = (root / "fighter_2014.json").read_text(encoding="utf-8")
    assert "improved_critical" in fighter
    assert "champion" in fighter
    cleric = (root / "cleric_2014.json").read_text(encoding="utf-8")
    assert "warding_flare" in cleric
    assert "cd_preserve_life" in cleric


def test_automation_report_covers_all():
    report = e24sub.automation_report(level=11)
    assert len(report) == len(e24sub.list_all_subclass_slugs())
    assert any(r["resources"] for r in report)
    assert any(r["shared_options"] for r in report)
    assert any(r["permanent_bonuses"] for r in report)
    assert any(r["always_prepared_count"] > 0 for r in report)
    assert any(r["third_caster"] for r in report)
    # Almost all subclasses should have button and/or calc, not pure text
    pure_text = [
        r["slug"]
        for r in report
        if not (
            r["resources"]
            or r["shared_options"]
            or r["permanent_bonuses"]
            or r["always_prepared_count"]
            or r["third_caster"]
        )
    ]
    assert len(pure_text) <= 2, pure_text


@pytest.mark.parametrize(
    "subclass_slug,level,kind,expected",
    THRESHOLD_CASES,
)
def test_formula_thresholds(subclass_slug: str, level: int, kind: str, expected):
    parent = e24sub.subclass_parent(subclass_slug)
    abilities = {"str": 16, "dex": 14, "con": 14, "int": 16, "wis": 16, "cha": 16}
    snap = e24.compute_progression(
        [{"slug": parent, "level": level, "subclass_slug": subclass_slug}],
        abilities=abilities,
    )
    if kind == "crit_threshold":
        assert snap.scales[f"{parent}:crit_threshold"] == expected
    elif kind == "warding_reset":
        flare = next(r for r in snap.resources if r.pool_id == "warding_flare")
        assert flare.reset == expected
    elif kind == "healing_light":
        heal = next(r for r in snap.resources if r.pool_id == "healing_light")
        assert heal.max == expected
    elif kind == "arcane_ward":
        ward = next(r for r in snap.resources if r.pool_id == "arcane_ward")
        assert ward.max == expected
    elif kind == "portent":
        port = next(r for r in snap.resources if r.pool_id == "portent")
        assert port.max == expected
    elif kind == "hp_per_level":
        assert snap.scales[f"{parent}:hp_per_level"] == expected
    elif kind == "aura_radius_ft":
        assert snap.scales[f"{parent}:aura_radius_ft"] == expected
    else:
        raise AssertionError(kind)


def test_write_automation_report_artifact(tmp_path):
    md = e24sub.automation_report_markdown(level=11)
    assert "Жрец" in md or "cleric__" in md
    assert "| Подкласс |" in md
    out = tmp_path / "report.md"
    out.write_text(md, encoding="utf-8")
    assert out.stat().st_size > 1000
