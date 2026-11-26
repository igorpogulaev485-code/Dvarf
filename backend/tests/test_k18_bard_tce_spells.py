"""TCE Additional Bard Spells — catalog tags + optional feature."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
SPELLS_2014 = REPO / "frontend" / "public" / "spells-2014.json"
BARD_FEATURES = REPO / "backend" / "data" / "classes" / "features" / "bard_2014.json"

TCE_ADDITIONAL_BARD = (
    "color_spray",
    "command",
    "aid",
    "enlarge_reduce",
    "mirror_image",
    "intellect_fortress",
    "mass_healing_word",
    "slow",
    "phantasmal_killer",
    "telepathic_bond",
    "heroes_feast",
    "dream_of_the_blue_veil",
    "prismatic_spray",
    "antipathy_sympathy",
    "prismatic_wall",
)


@pytest.mark.parametrize("slug", TCE_ADDITIONAL_BARD)
def test_tce_additional_bard_spell_has_bard_class(slug: str) -> None:
    rows = {row["slug"]: row for row in json.loads(SPELLS_2014.read_text(encoding="utf-8"))}
    row = rows[slug]
    classes = row["data"]["classes"]
    assert "bard" in classes
    assert "bard" in row["data"].get("tce_additional_classes", [])


def test_phantasmal_killer_is_bard_and_wizard() -> None:
    rows = {row["slug"]: row for row in json.loads(SPELLS_2014.read_text(encoding="utf-8"))}
    classes = rows["phantasmal_killer"]["data"]["classes"]
    assert set(classes) >= {"bard", "wizard"}


def test_additional_bard_spells_optional_feature() -> None:
    pack = json.loads(BARD_FEATURES.read_text(encoding="utf-8"))
    row = next(f for f in pack["features"] if f["id"] == "additional_bard_spells")
    assert row["optional"] is True
    assert row["source_book"] == "tcoe"
    assert row["level"] == 1
    assert "Phantasmal Killer" in row["summary_ru"] or "phantasmal" in row["summary_ru"].lower()


def test_alembic_head_includes_k18() -> None:
    path = REPO / "backend" / "alembic" / "versions" / "k18bardtce01_tce_additional_bard_spells.py"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert 'revision: str = "k18bardtce01"' in text
    assert 'down_revision' in text and "k17braceammo01" in text
