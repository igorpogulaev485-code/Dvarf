"""ADM-05 migration: catalog_name_revisions, одна голова Alembic."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/adm05catalog01_catalog_name_revisions.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("adm05catalog01", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, tables: set[str], indexes: dict[str, list[dict[str, Any]]] | None = None):
        self.tables = set(tables)
        self.indexes = {k: list(v) for k, v in (indexes or {}).items()}

    def get_table_names(self) -> list[str]:
        return sorted(self.tables)

    def get_indexes(self, table: str) -> list[dict[str, Any]]:
        return list(self.indexes.get(table, []))


class FakeOp:
    def __init__(self):
        self.tables: set[str] = {
            "users",
            "catalog_entries",
            "admin_roles",
            "feedback_messages",
        }
        self.indexes: dict[str, list[dict[str, Any]]] = {}
        self.calls: list[str] = []
        self._bind = object()

    def get_bind(self):
        return self._bind

    def create_table(self, name: str, *args, **kwargs) -> None:  # noqa: ANN002, ANN003
        self.tables.add(name)
        self.calls.append(f"create_table:{name}")

    def create_index(self, name: str, table: str, cols, **kwargs) -> None:  # noqa: ANN001, ANN003
        self.indexes.setdefault(table, []).append({"name": name, "column_names": list(cols)})
        self.calls.append(f"create_index:{name}")

    def drop_index(self, name: str, table_name: str | None = None, **kwargs) -> None:  # noqa: ANN003
        table = table_name or ""
        self.indexes[table] = [i for i in self.indexes.get(table, []) if i.get("name") != name]
        self.calls.append(f"drop_index:{name}")

    def drop_table(self, name: str) -> None:
        self.tables.discard(name)
        self.indexes.pop(name, None)
        self.calls.append(f"drop_table:{name}")


def test_migration_revises_adm04():
    mod = _load_migration()
    assert mod.revision == "adm05catalog01"
    assert mod.down_revision == "adm04feedback01"
    text = MIGRATION.read_text(encoding="utf-8")
    assert re.search(r"catalog_name_revisions", text)
    assert re.search(r"uq_catalog_name_revisions_one_pending", text)
    assert re.search(r"status = 'pending'", text)
    assert re.search(r"ondelete=\"CASCADE\"", text) or re.search(r"ondelete='CASCADE'", text)
    assert re.search(r"ondelete=\"SET NULL\"", text) or re.search(r"ondelete='SET NULL'", text)


def test_alembic_single_head_includes_adm05():
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    assert heads[0] == "adm05catalog01"
    revisions = {rev.revision for rev in script.walk_revisions()}
    assert "adm05catalog01" in revisions
    assert "adm04feedback01" in revisions


def test_upgrade_downgrade(monkeypatch):
    mod = _load_migration()
    fake = FakeOp()

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(mod, "op", fake)

    def inspect_bind(_bind):
        return FakeInspector(fake.tables, fake.indexes)

    monkeypatch.setattr(sa, "inspect", lambda _bind: inspect_bind(_bind))
    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "create_table", fake.create_table)
    monkeypatch.setattr(alembic_op, "create_index", fake.create_index)
    monkeypatch.setattr(alembic_op, "drop_index", fake.drop_index)
    monkeypatch.setattr(alembic_op, "drop_table", fake.drop_table)

    assert "catalog_name_revisions" not in fake.tables
    mod.upgrade()
    assert "catalog_name_revisions" in fake.tables
    assert any("uq_catalog_name_revisions_one_pending" in c for c in fake.calls)
    mod.upgrade()  # idempotent
    mod.downgrade()
    assert "catalog_name_revisions" not in fake.tables
