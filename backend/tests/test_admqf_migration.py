"""ADM-QF migration: admin_roles.source, одна голова Alembic."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/admqf01_bootstrap_role_source.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("admqf01bootstrapsrc", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, tables: set[str], columns: dict[str, list[dict[str, Any]]] | None = None):
        self.tables = set(tables)
        self.columns = {k: list(v) for k, v in (columns or {}).items()}

    def get_table_names(self) -> list[str]:
        return sorted(self.tables)

    def get_columns(self, table: str) -> list[dict[str, Any]]:
        return list(self.columns.get(table, []))


class FakeOp:
    def __init__(self):
        self.tables: set[str] = {"admin_roles", "users"}
        self.columns: dict[str, list[dict[str, Any]]] = {
            "admin_roles": [
                {"name": "id"},
                {"name": "user_id"},
                {"name": "role"},
                {"name": "granted_by"},
                {"name": "created_at"},
            ]
        }
        self.calls: list[str] = []
        self._bind = object()

    def get_bind(self):
        return self._bind

    def add_column(self, table: str, column) -> None:  # noqa: ANN001
        self.columns.setdefault(table, []).append({"name": column.name})
        self.calls.append(f"add_column:{table}.{column.name}")

    def create_index(self, name: str, table: str, cols, **kwargs) -> None:  # noqa: ANN001, ANN003
        self.calls.append(f"create_index:{name}")

    def drop_index(self, name: str, table_name: str | None = None, **kwargs) -> None:  # noqa: ANN003
        self.calls.append(f"drop_index:{name}")

    def drop_column(self, table: str, name: str) -> None:
        self.columns[table] = [c for c in self.columns.get(table, []) if c.get("name") != name]
        self.calls.append(f"drop_column:{table}.{name}")


def test_migration_revises_adm05():
    mod = _load_migration()
    assert mod.revision == "admqf01bootstrapsrc"
    assert mod.down_revision == "adm05catalog01"


def test_alembic_single_head_qf():
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    assert heads[0] == "admqf01bootstrapsrc"


def test_upgrade_downgrade(monkeypatch):
    mod = _load_migration()
    fake = FakeOp()

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(mod, "op", fake)

    def inspect_bind(_bind):
        return FakeInspector(fake.tables, fake.columns)

    monkeypatch.setattr(sa, "inspect", lambda _bind: inspect_bind(_bind))
    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "add_column", fake.add_column)
    monkeypatch.setattr(alembic_op, "create_index", fake.create_index)
    monkeypatch.setattr(alembic_op, "drop_index", fake.drop_index)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)

    assert not any(c["name"] == "source" for c in fake.columns["admin_roles"])
    mod.upgrade()
    assert any(c["name"] == "source" for c in fake.columns["admin_roles"])
    mod.upgrade()  # idempotent
    mod.downgrade()
    assert not any(c["name"] == "source" for c in fake.columns["admin_roles"])
