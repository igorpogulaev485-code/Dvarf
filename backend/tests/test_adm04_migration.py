"""ADM-04 migration: feedback_messages, одна голова Alembic."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/adm04feedback01_feedback_messages.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("adm04feedback01", MIGRATION)
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
            "admin_roles",
            "admin_secrets",
            "admin_audit_log",
            "product_events",
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


def test_migration_revises_adm03():
    mod = _load_migration()
    assert mod.revision == "adm04feedback01"
    assert mod.down_revision == "adm03metrics01"
    text = MIGRATION.read_text(encoding="utf-8")
    assert re.search(r"feedback_messages", text)
    assert re.search(r"rate_account_id", text)
    assert re.search(r"is_anonymous", text)
    assert re.search(r"ondelete=\"SET NULL\"", text) or re.search(r"ondelete='SET NULL'", text)


def test_alembic_single_head_includes_adm04():
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    revisions = {rev.revision for rev in script.walk_revisions()}
    assert "adm04feedback01" in revisions
    assert "adm03metrics01" in revisions
    ancestors: set[str] = set()
    stack = [heads[0]]
    while stack:
        rev_id = stack.pop()
        if rev_id in ancestors:
            continue
        ancestors.add(rev_id)
        cur = script.get_revision(rev_id)
        if cur is None or cur.down_revision is None:
            continue
        down = cur.down_revision
        if isinstance(down, (list, tuple, set)):
            stack.extend(down)
        else:
            stack.append(down)
    assert "adm04feedback01" in ancestors
    assert "adm03metrics01" in ancestors


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

    assert "feedback_messages" not in fake.tables
    mod.upgrade()
    assert "feedback_messages" in fake.tables
    assert any("ix_feedback_messages_rate_created_at" in c for c in fake.calls)
    mod.upgrade()  # idempotent
    mod.downgrade()
    assert "feedback_messages" not in fake.tables
