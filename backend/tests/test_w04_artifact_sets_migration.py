"""W-04 migration: chain / noop / downgrade; no hardcoded head assert."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/w04sets8a1b2c_artifact_sets_legends.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("w04sets8a1b2c", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, tables: set[str] | None = None, columns: dict[str, set[str]] | None = None):
        self.tables = tables or set()
        self.columns = columns or {}

    def get_table_names(self) -> list[str]:
        return list(self.tables)

    def get_columns(self, table: str) -> list[dict[str, Any]]:
        return [{"name": n} for n in self.columns.get(table, set())]


class FakeBind:
    def __init__(self, inspector: FakeInspector):
        self.inspector = inspector


class FakeOp:
    def __init__(self, bind: FakeBind):
        self._bind = bind
        self.created_tables: list[str] = []
        self.dropped_tables: list[str] = []
        self.added_columns: list[tuple[str, str]] = []
        self.dropped_columns: list[tuple[str, str]] = []
        self.indexes: list[str] = []

    def get_bind(self) -> FakeBind:
        return self._bind

    def create_table(self, name: str, *args, **kwargs):  # noqa: ANN001
        self.created_tables.append(name)
        self._bind.inspector.tables.add(name)

    def drop_table(self, name: str):
        self.dropped_tables.append(name)
        self._bind.inspector.tables.discard(name)

    def add_column(self, table: str, column):  # noqa: ANN001
        self.added_columns.append((table, column.name))
        self._bind.inspector.columns.setdefault(table, set()).add(column.name)

    def drop_column(self, table: str, name: str):
        self.dropped_columns.append((table, name))
        cols = self._bind.inspector.columns.setdefault(table, set())
        cols.discard(name)

    def create_index(self, name: str, *args, **kwargs):  # noqa: ANN001
        self.indexes.append(name)

    def drop_index(self, name: str, table_name: str | None = None):
        if name in self.indexes:
            self.indexes.remove(name)


def test_migration_revision_chain():
    mod = _load_migration()
    assert mod.revision == "w04sets8a1b2c"
    assert mod.down_revision == "w03cmbt7b4e2a"


def test_alembic_single_head_contains_w04():
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    assert any(rev.revision == "w04sets8a1b2c" for rev in script.walk_revisions())
    assert any(rev.revision == "w03cmbt7b4e2a" for rev in script.walk_revisions())


def test_upgrade_downgrade_idempotent(monkeypatch):
    mod = _load_migration()
    inspector = FakeInspector(
        tables={"setting_pages", "setting_artifacts", "settings"},
        columns={"setting_pages": {"id", "title"}},
    )
    bind = FakeBind(inspector)
    fake = FakeOp(bind)

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "create_table", fake.create_table)
    monkeypatch.setattr(alembic_op, "drop_table", fake.drop_table)
    monkeypatch.setattr(alembic_op, "add_column", fake.add_column)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)
    monkeypatch.setattr(alembic_op, "create_index", fake.create_index)
    monkeypatch.setattr(alembic_op, "drop_index", fake.drop_index)
    monkeypatch.setattr(sa, "inspect", lambda _bind: inspector)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(mod.sa, "inspect", lambda _bind: inspector)

    mod.upgrade()
    assert "setting_artifact_sets" in fake.created_tables
    assert "setting_artifact_set_members" in fake.created_tables
    assert ("setting_pages", "artifact_id") in fake.added_columns

    created_once = list(fake.created_tables)
    added_once = list(fake.added_columns)
    mod.upgrade()
    assert fake.created_tables == created_once
    assert fake.added_columns == added_once

    mod.downgrade()
    assert "setting_artifact_set_members" in fake.dropped_tables
    assert "setting_artifact_sets" in fake.dropped_tables
    assert ("setting_pages", "artifact_id") in fake.dropped_columns

    mod.upgrade()
    assert "setting_artifact_sets" in inspector.tables
    assert "artifact_id" in inspector.columns.get("setting_pages", set())
