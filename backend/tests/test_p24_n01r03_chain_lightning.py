"""Chain Lightning RU name reaches an existing database (p24n01r03)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.config import Config
from alembic.script import ScriptDirectory

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
VERSIONS = BACKEND / "alembic" / "versions"


def test_chain_lightning_seed_names_are_chain_ru():
    catalog = json.loads(
        (BACKEND / "data/srd/2014/catalog.json").read_text(encoding="utf-8")
    )
    row = next(item for item in catalog if item.get("slug") == "chain_lightning")
    assert row["name_ru"] == "Цепная молния"
    assert row["name_en"] == "Chain Lightning"

    spells = json.loads(
        (BACKEND / "data/srd/2024/live/spells_srd.json").read_text(encoding="utf-8")
    )
    live = next(item for item in spells["entries"] if item.get("slug") == "chain-lightning")
    assert live["name_ru"] == "Цепная молния"

    blob = ""
    for name in ("creatures_srd.json", "creatures_aud.json", "creatures_rtw.json"):
        blob += (BACKEND / "data/srd/2024/live" / name).read_text(encoding="utf-8")
    assert "Пляшущая молния" not in blob
    assert "Цепная молния" in blob


def test_alembic_head_is_chain_lightning_rename():
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    assert script.get_heads() == ["p24n01r03"]
    rev = script.get_revision("p24n01r03")
    assert rev is not None
    assert rev.down_revision == "p24n01r02"
    text = (VERSIONS / "p24n01r03_chain_lightning_ru.py").read_text(encoding="utf-8")
    assert "Цепная молния" in text
    assert "chain_lightning" in text
    assert "chain-lightning" in text
    assert "characters" in text
    assert "catalog_name_revisions" in text


def _postgres_url() -> str:
    import os

    return (
        os.environ.get("TEST_DATABASE_URL")
        or os.environ.get("DATABASE_URL")
        or "postgresql+psycopg://dvarf:dvarf@127.0.0.1:5432/dvarf_mig"
    )


def _postgres_up() -> bool:
    try:
        engine = sa.create_engine(_postgres_url(), pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(sa.text("SELECT 1"))
        engine.dispose()
        return True
    except Exception:
        return False


@pytest.mark.skipif(not _postgres_up(), reason="Postgres not available")
def test_sheet_json_phrase_becomes_chain_lightning():
    """The same replace the migration runs on characters.sheet."""
    engine = sa.create_engine(_postgres_url(), pool_pre_ping=True)
    old = "Пляшущая молния"
    new = "Цепная молния"
    sheet = {
        "spells": {
            "known": [
                {
                    "id": "spell:chain_lightning",
                    "name": old,
                    "catalog_id": "186d1f78-d202-592b-a533-35d029ea03a6",
                    "prepared": True,
                }
            ]
        }
    }
    with engine.begin() as conn:
        conn.execute(sa.text("DROP TABLE IF EXISTS chain_ru_sheet_probe"))
        conn.execute(sa.text("CREATE TABLE chain_ru_sheet_probe (sheet jsonb NOT NULL)"))
        conn.execute(
            sa.text("INSERT INTO chain_ru_sheet_probe (sheet) VALUES (CAST(:sheet AS jsonb))"),
            {"sheet": json.dumps(sheet, ensure_ascii=False)},
        )
        conn.execute(
            sa.text(
                """
                UPDATE chain_ru_sheet_probe
                SET sheet = replace(sheet::text, :old_ru, :new_ru)::jsonb
                WHERE sheet::text LIKE :like_ru
                """
            ),
            {"old_ru": old, "new_ru": new, "like_ru": f"%{old}%"},
        )
        name = conn.execute(
            sa.text("SELECT sheet #>> '{spells,known,0,name}' FROM chain_ru_sheet_probe")
        ).scalar()
        conn.execute(sa.text("DROP TABLE chain_ru_sheet_probe"))
    engine.dispose()
    assert name == new
