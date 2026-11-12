"""L-02 lobby_media migration: upgrade / noop / downgrade / upgrade; no hardcoded ids."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

MIGRATION = Path(__file__).resolve().parents[1] / "alembic/versions/l02media7b3e1_lobby_media.py"


def _load_migration():
    spec = importlib.util.spec_from_file_location("l02media7b3e1_lobby_media", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, tables: set[str]):
        self.tables = set(tables)

    def get_table_names(self) -> list[str]:
        return sorted(self.tables)


class FakeOp:
    def __init__(self):
        self.tables: set[str] = set()
        self.indexes: set[str] = set()
        self.calls: list[str] = []
        self._bind = object()

    def get_bind(self):
        return self._bind

    def create_table(self, name: str, *args: Any, **kwargs: Any) -> None:
        self.calls.append(f"create_table:{name}")
        self.tables.add(name)

    def create_index(self, name: str, table: str, *args: Any, **kwargs: Any) -> None:
        self.calls.append(f"create_index:{name}")
        self.indexes.add(name)

    def drop_index(self, name: str, table_name: str | None = None, **kwargs: Any) -> None:
        self.calls.append(f"drop_index:{name}")
        self.indexes.discard(name)

    def drop_table(self, name: str) -> None:
        self.calls.append(f"drop_table:{name}")
        self.tables.discard(name)


def test_migration_has_expected_revision_chain():
    mod = _load_migration()
    assert mod.revision == "l02media7b3e1"
    assert mod.down_revision == "s01droptpl9c2a"


def test_migration_source_has_no_hardcoded_uuids():
    src = MIGRATION.read_text(encoding="utf-8")
    assert "op.execute" not in src
    assert "INSERT" not in src.upper()
    assert not re.search(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        src,
        flags=re.I,
    )


def test_upgrade_downgrade_idempotent(monkeypatch):
    mod = _load_migration()
    fake = FakeOp()

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "create_table", fake.create_table)
    monkeypatch.setattr(alembic_op, "create_index", fake.create_index)
    monkeypatch.setattr(alembic_op, "drop_index", fake.drop_index)
    monkeypatch.setattr(alembic_op, "drop_table", fake.drop_table)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(sa, "inspect", lambda _bind: FakeInspector(fake.tables))

    before = list(fake.calls)
    mod.upgrade()
    assert "lobby_media" in fake.tables
    assert any(c.startswith("create_table:lobby_media") for c in fake.calls[len(before) :])

    before2 = list(fake.calls)
    mod.upgrade()
    assert fake.calls[len(before2) :] == []

    mod.downgrade()
    assert "lobby_media" not in fake.tables

    before3 = list(fake.calls)
    mod.downgrade()
    assert fake.calls[len(before3) :] == []

    mod.upgrade()
    assert "lobby_media" in fake.tables


def test_occupied_ids_not_applicable_no_seeds():
    src = MIGRATION.read_text(encoding="utf-8")
    assert "catalog_entries" not in src
    assert "uuid5" not in src
    assert "uuid4(" not in src
