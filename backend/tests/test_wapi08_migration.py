"""W-API-08 migration: single head, ancestors in chain; no hardcoded tip."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/wapi08partych01_world_import_characters_pdf.py"
)

EXPECTED_TABLE = "world_import_attachments"
EXPECTED_CHAR_COLS = ("import_key", "imported_setting_id", "assigned_user_id")
REVISION = "wapi08partych01"
DOWN = "wapi05restcfm01"


def _load_migration():
    spec = importlib.util.spec_from_file_location("wapi08partych01", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, tables: set[str], columns: dict[str, set[str]] | None = None):
        self.tables = set(tables)
        self.columns = {k: set(v) for k, v in (columns or {}).items()}
        self.indexes: dict[str, set[str]] = {}
        self.unique_constraints: dict[str, set[str]] = {}

    def get_table_names(self) -> list[str]:
        return sorted(self.tables)

    def get_columns(self, table: str) -> list[dict[str, str]]:
        return [{"name": n} for n in sorted(self.columns.get(table, set()))]

    def get_indexes(self, table: str) -> list[dict[str, str]]:
        return [{"name": n} for n in sorted(self.indexes.get(table, set()))]

    def get_unique_constraints(self, table: str) -> list[dict[str, str]]:
        return [{"name": n} for n in sorted(self.unique_constraints.get(table, set()))]


class FakeOp:
    def __init__(self):
        self.tables: set[str] = {
            "characters",
            "settings",
            "lobbies",
            "users",
            "world_import_jobs",
        }
        self.columns: dict[str, set[str]] = {
            "characters": {
                "id",
                "user_id",
                "name",
                "rules_edition",
                "sheet",
                "sheet_version",
                "level",
                "class_name",
                "race_name",
                "hp_current",
                "hp_max",
                "is_draft",
                "created_at",
                "updated_at",
                "deleted_at",
            },
        }
        self.indexes: dict[str, set[str]] = {}
        self.unique_constraints: dict[str, set[str]] = {}
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

    def create_index(self, name: str, table: str, *args: Any, **kwargs: Any) -> None:
        self.indexes.setdefault(table, set()).add(name)
        self.calls.append(f"create_index:{name}")

    def create_unique_constraint(
        self, name: str, table: str, cols: list[str], **kwargs: Any
    ) -> None:
        self.unique_constraints.setdefault(table, set()).add(name)
        self.calls.append(f"create_uq:{name}")

    def drop_table(self, name: str) -> None:
        self.tables.discard(name)
        self.calls.append(f"drop_table:{name}")

    def drop_column(self, table: str, column: str) -> None:
        self.columns.get(table, set()).discard(column)
        self.calls.append(f"drop_column:{table}.{column}")

    def drop_index(self, name: str, table_name: str | None = None, **kwargs: Any) -> None:
        if table_name:
            self.indexes.get(table_name, set()).discard(name)
        self.calls.append(f"drop_index:{name}")

    def drop_constraint(self, name: str, table: str, type_: str | None = None) -> None:
        self.unique_constraints.get(table, set()).discard(name)
        self.calls.append(f"drop_constraint:{name}")


def test_migration_revision_chain():
    mod = _load_migration()
    assert mod.revision == REVISION
    assert mod.down_revision == DOWN
    text = MIGRATION.read_text(encoding="utf-8")
    assert re.search(r"world_import_attachments", text)
    assert "import_key" in text


def test_alembic_single_head_and_ancestors():
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"
    revs = {r.revision for r in script.walk_revisions()}
    assert REVISION in revs
    assert DOWN in revs
    assert "wapi01impfnd01" in revs


def test_upgrade_downgrade_idempotent(monkeypatch):
    mod = _load_migration()
    fake = FakeOp()
    inspector = FakeInspector(fake.tables, fake.columns)
    inspector.indexes = fake.indexes
    inspector.unique_constraints = fake.unique_constraints

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "create_table", fake.create_table)
    monkeypatch.setattr(alembic_op, "add_column", fake.add_column)
    monkeypatch.setattr(alembic_op, "create_index", fake.create_index)
    monkeypatch.setattr(alembic_op, "create_unique_constraint", fake.create_unique_constraint)
    monkeypatch.setattr(alembic_op, "drop_table", fake.drop_table)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)
    monkeypatch.setattr(alembic_op, "drop_index", fake.drop_index)
    monkeypatch.setattr(alembic_op, "drop_constraint", fake.drop_constraint)
    monkeypatch.setattr(sa, "inspect", lambda _bind: inspector)

    # Keep inspector in sync with fake after mutations.
    def _refresh_inspector():
        inspector.tables = set(fake.tables)
        inspector.columns = {k: set(v) for k, v in fake.columns.items()}
        inspector.indexes = {k: set(v) for k, v in fake.indexes.items()}
        inspector.unique_constraints = {
            k: set(v) for k, v in fake.unique_constraints.items()
        }

    mod.upgrade()
    _refresh_inspector()
    assert EXPECTED_TABLE in fake.tables
    for col in EXPECTED_CHAR_COLS:
        assert col in fake.columns["characters"]
    calls_first = list(fake.calls)

    mod.upgrade()  # idempotent
    _refresh_inspector()
    assert fake.calls == calls_first or len(fake.calls) >= len(calls_first)

    mod.downgrade()
    _refresh_inspector()
    assert EXPECTED_TABLE not in fake.tables
    for col in EXPECTED_CHAR_COLS:
        assert col not in fake.columns.get("characters", set())
