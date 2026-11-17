"""DICE-02b migration: widen session_events formula/breakdown, одна голова."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/dice02b01_widen_session_event_formula.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("dice02b01widenroll", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_migration_revises_admqf():
    mod = _load_migration()
    assert mod.revision == "dice02b01widenroll"
    assert mod.down_revision == "admqf01bootstrapsrc"


def test_alembic_single_head_includes_dice02b():
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    revisions = {rev.revision for rev in script.walk_revisions(base="base", head=heads[0])}
    assert "dice02b01widenroll" in revisions
    assert "admqf01bootstrapsrc" in revisions


class FakeInspector:
    def __init__(self, tables: set[str], columns: dict[str, list[dict[str, Any]]]):
        self.tables = set(tables)
        self.columns = columns

    def get_table_names(self) -> list[str]:
        return sorted(self.tables)

    def get_columns(self, table: str) -> list[dict[str, Any]]:
        return list(self.columns.get(table, []))


class FakeOp:
    def __init__(self) -> None:
        self.tables = {"session_events"}
        self.columns = {
            "session_events": [
                {"name": "formula"},
                {"name": "breakdown"},
            ]
        }
        self.calls: list[str] = []
        self._bind = object()

    def get_bind(self):
        return self._bind

    def alter_column(self, table: str, name: str, **kwargs) -> None:  # noqa: ANN003
        self.calls.append(f"alter_column:{table}.{name}:{kwargs.get('type_')}")


def test_upgrade_downgrade(monkeypatch):
    mod = _load_migration()
    fake = FakeOp()
    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(
        sa, "inspect", lambda _bind: FakeInspector(fake.tables, fake.columns)
    )
    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "alter_column", fake.alter_column)

    mod.upgrade()
    assert any("formula" in c for c in fake.calls)
    assert any("breakdown" in c for c in fake.calls)
    fake.calls.clear()
    mod.downgrade()
    assert any("formula" in c for c in fake.calls)
