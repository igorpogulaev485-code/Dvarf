"""W-API-03 migration: single head, ancestors in chain, upgrade/downgrade; no hardcoded tip."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/wapi03idslnk01_world_import_ids_links.py"
)

EXPECTED_TABLES = (
    "world_source_aliases",
    "world_import_draft_links",
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("wapi03idslnk01", MIGRATION)
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


def test_migration_revision_chain():
    mod = _load_migration()
    assert mod.revision == "wapi03idslnk01"
    assert mod.down_revision == "wapi01impfnd01"


def test_alembic_single_head_contains_ancestors():
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "wapi03idslnk01" in ancestor_ids
    assert "wapi01impfnd01" in ancestor_ids
    assert "p14spelru9a1b2" in ancestor_ids


def test_migration_source_has_no_hardcoded_uuids():
    src = MIGRATION.read_text(encoding="utf-8")
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

    mod.upgrade()
    for table in EXPECTED_TABLES:
        assert table in fake.tables

    before2 = list(fake.calls)
    mod.upgrade()
    assert fake.calls[len(before2) :] == []

    mod.downgrade()
    for table in EXPECTED_TABLES:
        assert table not in fake.tables

    before3 = list(fake.calls)
    mod.downgrade()
    assert fake.calls[len(before3) :] == []

    mod.upgrade()
    for table in EXPECTED_TABLES:
        assert table in fake.tables
