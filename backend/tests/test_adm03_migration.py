"""ADM-03 migration: product_events, одна голова Alembic."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/adm03metrics01_product_events.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("adm03metrics01", MIGRATION)
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
        self.tables: set[str] = {"users", "admin_roles", "product_events"} if False else {
            "users",
            "admin_roles",
            "admin_secrets",
            "admin_audit_log",
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


def test_migration_revises_adm02():
    mod = _load_migration()
    assert mod.revision == "adm03metrics01"
    assert mod.down_revision == "adm02userhelp01"
    text = MIGRATION.read_text(encoding="utf-8")
    assert re.search(r"product_events", text)
    assert re.search(r"event_type", text)
    assert re.search(r"ix_product_events_type_created_at", text)


def test_alembic_single_head_includes_adm03():
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    revisions = {rev.revision for rev in script.walk_revisions()}
    assert "adm03metrics01" in revisions
    assert "adm02userhelp01" in revisions
    ancestors: set[str] = {heads[0]}
    cur = script.get_revision(heads[0])
    while cur is not None:
        down = cur.down_revision
        if down is None:
            break
        if isinstance(down, (list, tuple, set)):
            ancestors.update(down)
            break
        ancestors.add(down)
        cur = script.get_revision(down)
    assert "adm03metrics01" in ancestors
    assert "adm02userhelp01" in ancestors


def test_upgrade_downgrade(monkeypatch):
    mod = _load_migration()
    fake = FakeOp()

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(mod, "op", fake)

    def inspect_bind(_bind):
        return FakeInspector(fake.tables, fake.indexes)

    monkeypatch.setattr(sa, "inspect", lambda _bind: inspect_bind(_bind))

    # upgrade needs op methods on alembic.op if migration uses op. directly — it uses op from alembic
    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "create_table", fake.create_table)
    monkeypatch.setattr(alembic_op, "create_index", fake.create_index)
    monkeypatch.setattr(alembic_op, "drop_index", fake.drop_index)
    monkeypatch.setattr(alembic_op, "drop_table", fake.drop_table)

    assert "product_events" not in fake.tables
    mod.upgrade()
    assert "product_events" in fake.tables
    assert any(c.startswith("create_index:ix_product_events_type_created_at") for c in fake.calls)
    mod.upgrade()  # idempotent
    mod.downgrade()
    assert "product_events" not in fake.tables
