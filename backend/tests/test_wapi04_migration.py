"""W-API-04 migration: single head, ancestors in chain, upgrade/downgrade; no hardcoded tip."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/wapi04setcrt01_setting_creatures_items.py"
)

EXPECTED_TABLES = ("setting_creatures",)


def _load_migration():
    spec = importlib.util.spec_from_file_location("wapi04setcrt01", MIGRATION)
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
        return [
            {"name": n} for n in sorted(self.unique_constraints.get(table, set()))
        ]


class FakeOp:
    def __init__(self):
        # Pretend prior W-API tables already exist so we exercise ADD COLUMN paths.
        self.tables: set[str] = {
            "settings",
            "setting_artifacts",
            "world_source_keys",
        }
        self.columns: dict[str, set[str]] = {
            "setting_artifacts": {
                "id",
                "setting_id",
                "name",
                "rarity",
                "description",
                "requires_attunement",
                "abilities",
                "attack_damage",
                "attack_damage_type",
                "attack_ability",
                "attack_range_kind",
                "weight_lb",
                "sort_order",
                "created_at",
                "updated_at",
            },
            "world_source_keys": {
                "id",
                "setting_id",
                "source_path",
                "source_slug",
                "page_id",
                "artifact_id",
                "character_id",
                "created_at",
                "updated_at",
            },
        }
        self.indexes: dict[str, set[str]] = {
            "setting_artifacts": {"ix_setting_artifacts_setting_id"},
            "world_source_keys": {"ix_world_source_keys_setting_id"},
        }
        self.unique_constraints: dict[str, set[str]] = {}
        self.calls: list[str] = []
        self._bind = object()

    def get_bind(self):
        return self._bind

    def create_table(self, name: str, *args: Any, **kwargs: Any) -> None:
        self.calls.append(f"create_table:{name}")
        self.tables.add(name)
        self.columns.setdefault(name, set())
        for col in args:
            col_name = getattr(col, "name", None)
            if col_name:
                self.columns[name].add(col_name)

    def create_index(self, name: str, table: str, *args: Any, **kwargs: Any) -> None:
        self.calls.append(f"create_index:{name}")
        self.indexes.setdefault(table, set()).add(name)

    def add_column(self, table: str, column: Any) -> None:
        col_name = getattr(column, "name", None) or str(column)
        self.calls.append(f"add_column:{table}.{col_name}")
        self.columns.setdefault(table, set()).add(col_name)

    def drop_index(self, name: str, table_name: str | None = None, **kwargs: Any) -> None:
        self.calls.append(f"drop_index:{name}")
        if table_name:
            self.indexes.get(table_name, set()).discard(name)

    def drop_column(self, table: str, column: str) -> None:
        self.calls.append(f"drop_column:{table}.{column}")
        self.columns.get(table, set()).discard(column)

    def drop_table(self, name: str) -> None:
        self.calls.append(f"drop_table:{name}")
        self.tables.discard(name)
        self.columns.pop(name, None)
        self.indexes.pop(name, None)


def test_migration_revision_chain():
    mod = _load_migration()
    assert mod.revision == "wapi04setcrt01"
    assert mod.down_revision == "wapi03idslnk01"


def test_alembic_single_head_contains_ancestors():
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    assert "wapi04setcrt01" in ancestor_ids
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

    def _inspect(_bind):
        insp = FakeInspector(fake.tables, fake.columns)
        insp.indexes = {k: set(v) for k, v in fake.indexes.items()}
        insp.unique_constraints = {
            k: set(v) for k, v in fake.unique_constraints.items()
        }
        return insp

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "create_table", fake.create_table)
    monkeypatch.setattr(alembic_op, "create_index", fake.create_index)
    monkeypatch.setattr(alembic_op, "add_column", fake.add_column)
    monkeypatch.setattr(alembic_op, "drop_index", fake.drop_index)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)
    monkeypatch.setattr(alembic_op, "drop_table", fake.drop_table)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(sa, "inspect", _inspect)

    mod.upgrade()
    for table in EXPECTED_TABLES:
        assert table in fake.tables
    assert "item_kind" in fake.columns["setting_artifacts"]
    assert "rules_edition" in fake.columns["setting_artifacts"]
    assert "import_key" in fake.columns["setting_artifacts"]
    assert "creature_id" in fake.columns["world_source_keys"]

    before2 = list(fake.calls)
    mod.upgrade()
    assert fake.calls[len(before2) :] == []

    mod.downgrade()
    for table in EXPECTED_TABLES:
        assert table not in fake.tables
    assert "item_kind" not in fake.columns["setting_artifacts"]
    assert "creature_id" not in fake.columns["world_source_keys"]

    before3 = list(fake.calls)
    mod.downgrade()
    assert fake.calls[len(before3) :] == []

    mod.upgrade()
    for table in EXPECTED_TABLES:
        assert table in fake.tables
