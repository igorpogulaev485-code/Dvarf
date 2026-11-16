"""P24-M02b: all 2024 book subclasses — resources, always-prepared, text features."""

from __future__ import annotations

import pytest

from app.core.config import settings
from app.dnd import edition_2024_classes as e24
from app.dnd import edition_2024_subclasses as e24sub


CHECKPOINT_LEVELS = (3, 11)


def test_rules_edition_2024_still_closed():
    assert settings.rules_edition_2024_open is False


def test_all_subclass_packs_loaded():
    catalog = e24sub.load_subclass_catalog()
    assert len(catalog) >= 76
    # Packs present
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
        abilities={"str": 16, "dex": 14, "con": 14, "int": 16, "wis": 12, "cha": 14},
    )
    assert snap.total_level == level
    assert snap.subclass_level == 3
    assert any(f.source == "subclass" for f in snap.features), subclass_slug
    # Every subclass feature carries an automation tag
    for f in snap.features:
        if f.source == "subclass":
            assert f.automation in {
                "resource",
                "always_prepared",
                "third_caster",
                "text",
            }, (subclass_slug, f.id, f.automation)

    always = []
    for block in snap.spellcasting:
        always.extend(block.always_prepared)
    report = e24sub.classify_subclass(subclass_slug, level=level)
    # If catalog has non-land spell_list rows at this level, always-prepared must surface
    sub = e24sub.load_subclass_catalog()[subclass_slug]
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

    # Resource pools from subclass automation appear on the snapshot
    for pool_id in report["resources"]:
        assert any(r.pool_id == pool_id for r in snap.resources), (subclass_slug, pool_id)

    if subclass_slug in e24sub.THIRD_CASTER_SUBCLASSES:
        third = [b for b in snap.spellcasting if b.progression == "third"]
        assert third, subclass_slug
        assert third[0].spells_known and third[0].spells_known > 0
        assert snap.multiclass_slots["1"] >= 2


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
    # Without land pick, land-tagged rows are skipped
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


def test_2014_strip_untouched_by_subclass_module():
    from app.dnd.edition_2024_classes import strip_class_progress_from_sheet_for_2014

    sheet = {
        "class_progress_2024": {"resources": []},
        "classes": [{"name": "Воин", "level": 5}],
    }
    out = strip_class_progress_from_sheet_for_2014(sheet)
    assert "class_progress_2024" not in out


def test_automation_report_covers_all():
    report = e24sub.automation_report(level=11)
    assert len(report) == len(e24sub.list_all_subclass_slugs())
    # At least some resource + always-prepared subclasses
    assert any(r["resources"] for r in report)
    assert any(r["always_prepared_count"] > 0 for r in report)
    assert any(r["third_caster"] for r in report)
