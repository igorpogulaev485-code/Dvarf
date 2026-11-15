"""W-API-05 migration: single head, ancestors in chain, upgrade/downgrade; no hardcoded tip."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/wapi05restcfm01_world_import_rest_confirm.py"
)

EXPECTED_TABLES = ("world_import_confirmations",)
EXPECTED_SETTINGS_COL = "ai_can_confirm"
EXPECTED_JOB_COLS = ("confirm_snapshot", "last_confirmed_at")


def _load_migration():
    spec = importlib.util.spec_from_file_location("wapi05restcfm01", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, tables: set[str], columns: dict[str, set[str]] | None = None):
        self.tables = set(tables)
        self.columns = {k: set(v) for k, v in (columns or {}).items()}
        self.indexes: dict[str, set[str]] = {}

    def get_table_names(self) -> list[str]:
        return sorted(self.tables)

    def get_columns(self, table: str) -> list[dict[str, str]]:
        return [{"name": n} for n in sorted(self.columns.get(table, set()))]

    def get_indexes(self, table: str) -> list[dict[str, str]]:
        return [{"name": n} for n in sorted(self.indexes.get(table, set()))]


class FakeOp:
    def __init__(self):
        self.tables: set[str] = {
            "settings",
            "lobbies",
            "users",
            "world_import_jobs",
            "world_api_tokens",
        }
        self.columns: dict[str, set[str]] = {
            "settings": {
                "id",
                "lobby_id",
                "name",
                "world_notes",
                "is_extra",
                "deleted_at",
                "created_at",
                "updated_at",
            },
            "world_import_jobs": {
                "id",
                "setting_id",
                "lobby_id",
                "author_id",
                "status",
                "rules_edition",
                "source_kind",
                "idempotency_key",
                "source_ref",
                "created_at",
                "updated_at",
            },
        }
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

    def add_column(self, table: str, column: Any) -> None:
        self.columns.setdefault(table, set()).add(column.name)
        self.calls.append(f"add_column:{table}.{column.name}")

    def drop_column(self, table: str, column: str) -> None:
        self.columns.setdefault(table, set()).discard(column)
        self.calls.append(f"drop_column:{table}.{column}")

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


def test_migration_file_exists_and_revises_wapi04():
    mod = _load_migration()
    assert mod.revision == "wapi05restcfm01"
    assert mod.down_revision == "wapi04setcrt01"
    text = MIGRATION.read_text(encoding="utf-8")
    assert re.search(r"ai_can_confirm", text)
    assert re.search(r"world_import_confirmations", text)


def test_alembic_single_head_and_wapi05_in_history():
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    revisions = {rev.revision for rev in script.walk_revisions()}
    assert "wapi05restcfm01" in revisions
    assert "wapi04setcrt01" in revisions


def test_upgrade_downgrade_idempotent(monkeypatch):
    mod = _load_migration()
    fake = FakeOp()

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "create_table", fake.create_table)
    monkeypatch.setattr(alembic_op, "add_column", fake.add_column)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)
    monkeypatch.setattr(alembic_op, "drop_table", fake.drop_table)
    monkeypatch.setattr(alembic_op, "create_index", fake.create_index)
    monkeypatch.setattr(alembic_op, "drop_index", fake.drop_index)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(sa, "inspect", lambda _bind: FakeInspector(fake.tables, fake.columns))

    mod.upgrade()
    assert EXPECTED_SETTINGS_COL in fake.columns["settings"]
    for col in EXPECTED_JOB_COLS:
        assert col in fake.columns["world_import_jobs"]
    for table in EXPECTED_TABLES:
        assert table in fake.tables

    # повторный upgrade — без дублей
    before = list(fake.calls)
    mod.upgrade()
    assert fake.calls == before

    mod.downgrade()
    assert EXPECTED_SETTINGS_COL not in fake.columns["settings"]
    for table in EXPECTED_TABLES:
        assert table not in fake.tables
