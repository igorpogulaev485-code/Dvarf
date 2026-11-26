"""OotA Light Repeating Crossbow catalog row."""

from __future__ import annotations

from pathlib import Path

from app.services.gear_catalog_seed import planned_gear_rows

REPO = Path(__file__).resolve().parents[2]
WAVE = REPO / "backend" / "data" / "srd" / "2014" / "gear_light_repeating_crossbow_v1.json"
MIGRATION = (
    REPO
    / "backend"
    / "alembic"
    / "versions"
    / "k19lrcxbow01_light_repeating_crossbow.py"
)


def test_wave_file_exists() -> None:
    assert WAVE.is_file()
    assert MIGRATION.is_file()
    text = MIGRATION.read_text(encoding="utf-8")
    assert 'revision: str = "k19lrcxbow01"' in text
    assert "k18bardtce01" in text


def test_light_repeating_crossbow_in_planned_gear() -> None:
    row = next(r for r in planned_gear_rows() if r.slug == "light_repeating_crossbow")
    assert row.kind == "weapon"
    assert row.id == "c145426a-8ee0-53a4-a7ac-4a27e87a9115"
    assert row.name_ru == "Лёгкий многозарядный арбалет"
    assert row.name_en == "Light Repeating Crossbow"
    assert row.is_active
    assert row.source == "OotA 2014"
    data = row.data
    assert data["damage"] == "1к10"
    assert data["damage_type"] == "колющий"
    assert data["category"] == "martial"
    assert data["ranged"] is True
    assert data["ability"] == "dex"
    assert set(data["properties"]) >= {"ammunition", "heavy", "two-handed", "reload"}
    assert "loading" not in data["properties"]
    assert data["range"] == {"normal": 100, "long": 400}
    assert data["cost"] == {"amount": 100, "unit": "gp"}
    assert data["weight_lb"] == 5
    assert data["source_book"] == "OotA"
    mag = next(e for e in data["effects"] if e.get("type") == "resource")
    assert mag["id"] == "magazine"
    assert mag["max"] == 6
