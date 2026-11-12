"""W-02 migration: chain / noop / downgrade; no hardcoded head or UUIDs."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/w02wiki0a2e0f_wiki_versions_trash.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("w02wiki0a2e0f", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, columns_by_table: dict[str, set[str]], tables: set[str] | None = None):
        self.columns_by_table = {k: set(v) for k, v in columns_by_table.items()}
        self.tables = set(tables or columns_by_table.keys())

    def get_columns(self, table: str) -> list[dict[str, Any]]:
        return [{"name": name} for name in sorted(self.columns_by_table.get(table, set()))]

    def get_table_names(self) -> list[str]:
        return sorted(self.tables)


class FakeResult:
    def fetchall(self) -> list:
        return []

    def fetchone(self):
        return None


class FakeBind:
    def __init__(self):
        self.execute_calls: list[tuple[Any, Any]] = []

    def execute(self, stmt: Any, params: Any = None) -> FakeResult:
        self.execute_calls.append((stmt, params))
        return FakeResult()


class FakeOp:
    def __init__(self, bind: FakeBind, columns_by_table: dict[str, set[str]], tables: set[str]):
        self._bind = bind
        self.columns_by_table = {k: set(v) for k, v in columns_by_table.items()}
        self.tables = set(tables)
        self.calls: list[str] = []

    def get_bind(self) -> FakeBind:
        return self._bind

    def add_column(self, table: str, column: Any) -> None:
        name = getattr(column, "name", None) or getattr(column, "key", None)
        self.calls.append(f"add_column:{table}:{name}")
        if name:
            self.columns_by_table.setdefault(table, set()).add(str(name))

    def create_index(self, *args, **kwargs) -> None:
        self.calls.append(f"create_index:{args[0] if args else kwargs.get('name')}")

    def create_table(self, name: str, *args, **kwargs) -> None:
        self.calls.append(f"create_table:{name}")
        self.tables.add(name)
        self.columns_by_table.setdefault(name, set())

    def drop_index(self, *args, **kwargs) -> None:
        self.calls.append("drop_index")

    def drop_table(self, name: str) -> None:
        self.calls.append(f"drop_table:{name}")
        self.tables.discard(name)

    def drop_column(self, table: str, name: str) -> None:
        self.calls.append(f"drop_column:{table}:{name}")
        self.columns_by_table.setdefault(table, set()).discard(name)


def test_migration_revision_chain():
    mod = _load_migration()
    assert mod.revision == "w02wiki0a2e0f"
    assert mod.down_revision == "w01wiki8d3a4"


def test_upgrade_downgrade_idempotent(monkeypatch):
    mod = _load_migration()
    bind = FakeBind()
    columns = {
        "settings": {"id", "lobby_id", "name", "is_extra"},
        "setting_pages": {"id", "setting_id", "title", "revealed_at"},
        "users": {"id"},
    }
    tables = set(columns)
    fake = FakeOp(bind, columns, tables)

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "add_column", fake.add_column)
    monkeypatch.setattr(alembic_op, "create_index", fake.create_index)
    monkeypatch.setattr(alembic_op, "create_table", fake.create_table)
    monkeypatch.setattr(alembic_op, "drop_index", fake.drop_index)
    monkeypatch.setattr(alembic_op, "drop_table", fake.drop_table)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(
        sa,
        "inspect",
        lambda _bind: FakeInspector(fake.columns_by_table, fake.tables),
    )

    mod.upgrade()
    assert "deleted_at" in fake.columns_by_table["settings"]
    assert "deleted_at" in fake.columns_by_table["setting_pages"]
    assert "setting_page_versions" in fake.tables
    assert len(bind.execute_calls) >= 1  # is_extra → deleted_at

    mid = list(fake.calls)
    mod.upgrade()
    assert fake.calls[len(mid) :] == []

    mod.downgrade()
    assert "deleted_at" not in fake.columns_by_table["settings"]
    assert "deleted_at" not in fake.columns_by_table["setting_pages"]
    assert "setting_page_versions" not in fake.tables

    mid2 = list(fake.calls)
    mod.downgrade()
    assert fake.calls[len(mid2) :] == []

    mod.upgrade()
    assert "deleted_at" in fake.columns_by_table["settings"]
    assert "setting_page_versions" in fake.tables


def test_alembic_single_head_includes_w02():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "w02wiki0a2e0f" in ancestor_ids
    assert "w01wiki8d3a4" in ancestor_ids
