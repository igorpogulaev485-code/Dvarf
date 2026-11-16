"""ADM-01 migration: одна голова Alembic, ревизия поверх фактического предка."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/adm01framework01_admin_framework.py"
)

EXPECTED_TABLES = ("admin_roles", "admin_secrets", "admin_audit_log")


def _load_migration():
    spec = importlib.util.spec_from_file_location("adm01framework01", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, tables: set[str], columns: dict[str, set[str]] | None = None):
        self.tables = set(tables)
        self.columns = {k: set(v) for k, v in (columns or {}).items()}

    def get_table_names(self) -> list[str]:
        return sorted(self.tables)

    def get_columns(self, table: str) -> list[dict[str, str]]:
        return [{"name": n} for n in sorted(self.columns.get(table, set()))]


class FakeOp:
    def __init__(self):
        self.tables: set[str] = {"users"}
        self.columns: dict[str, set[str]] = {"users": {"id", "email"}}
        self.indexes: dict[str, set[str]] = {}
        self.calls: list[str] = []
        self._bind = object()

    def get_bind(self):
        return self._bind

    def create_table(self, name: str, *args: Any, **kwargs: Any) -> None:
        self.tables.add(name)
        self.calls.append(f"create_table:{name}")
        cols: set[str] = set()
        for col in args:
            cname = getattr(col, "name", None)
            if cname:
                cols.add(cname)
        self.columns[name] = cols

    def drop_table(self, name: str) -> None:
        self.tables.discard(name)
        self.columns.pop(name, None)
        self.calls.append(f"drop_table:{name}")

    def create_index(self, name: str, table: str, cols: list[str], **kwargs: Any) -> None:
        self.indexes.setdefault(table, set()).add(name)
        self.calls.append(f"create_index:{name}")

    def drop_index(self, name: str, table_name: str | None = None, **kwargs: Any) -> None:
        table = table_name or ""
        self.indexes.setdefault(table, set()).discard(name)
        self.calls.append(f"drop_index:{name}")


def test_migration_file_exists_and_revises_previous_head():
    mod = _load_migration()
    assert mod.revision == "adm01framework01"
    assert mod.down_revision == "wapi08partych01"
    text = MIGRATION.read_text(encoding="utf-8")
    for table in EXPECTED_TABLES:
        assert re.search(table, text)


def test_alembic_single_head_and_adm01_in_history():
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    revisions = {rev.revision for rev in script.walk_revisions()}
    assert "adm01framework01" in revisions
    assert "wapi08partych01" in revisions
    # Не хардкодим голову: после этой пачки она должна быть adm01.
    assert heads[0] == "adm01framework01"


def test_upgrade_downgrade_idempotent(monkeypatch):
    mod = _load_migration()
    fake = FakeOp()

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "create_table", fake.create_table)
    monkeypatch.setattr(alembic_op, "drop_table", fake.drop_table)
    monkeypatch.setattr(alembic_op, "create_index", fake.create_index)
    monkeypatch.setattr(alembic_op, "drop_index", fake.drop_index)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(sa, "inspect", lambda _bind: FakeInspector(fake.tables, fake.columns))

    mod.upgrade()
    for table in EXPECTED_TABLES:
        assert table in fake.tables
    mod.upgrade()  # idempotent
    mod.downgrade()
    for table in EXPECTED_TABLES:
        assert table not in fake.tables
