"""S-01 / L-19: drop encounter_templates — upgrade / noop / downgrade / upgrade; no hardcoded ids."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

import pytest

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/s01droptpl9c2a_drop_encounter_templates.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location(
        "s01droptpl9c2a_drop_encounter_templates", MIGRATION
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, columns_by_table: dict[str, set[str]]):
        self.columns_by_table = {k: set(v) for k, v in columns_by_table.items()}

    def get_columns(self, table: str) -> list[dict[str, Any]]:
        return [{"name": name} for name in sorted(self.columns_by_table.get(table, set()))]


class FakeOp:
    def __init__(self, columns_by_table: dict[str, set[str]] | None = None):
        self.columns_by_table = {
            k: set(v) for k, v in (columns_by_table or {"lobbies": {"encounter_templates"}}).items()
        }
        self.calls: list[str] = []
        self._bind = object()

    def get_bind(self):
        return self._bind

    def drop_column(self, table: str, column: str) -> None:
        self.calls.append(f"drop_column:{table}.{column}")
        self.columns_by_table.setdefault(table, set()).discard(column)

    def add_column(self, table: str, column: Any) -> None:
        name = getattr(column, "name", None) or str(column)
        self.calls.append(f"add_column:{table}.{name}")
        self.columns_by_table.setdefault(table, set()).add(name)


def test_migration_has_expected_revision_chain():
    mod = _load_migration()
    assert mod.revision == "s01droptpl9c2a"
    assert mod.down_revision == "l01roles8a4c2"


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
    fake = FakeOp({"lobbies": {"id", "name", "encounter_templates"}})

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)
    monkeypatch.setattr(alembic_op, "add_column", fake.add_column)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(
        sa, "inspect", lambda _bind: FakeInspector(fake.columns_by_table)
    )

    before = list(fake.calls)
    mod.upgrade()
    assert "encounter_templates" not in fake.columns_by_table["lobbies"]
    assert any(c.startswith("drop_column:") for c in fake.calls[len(before) :])

    mid = list(fake.calls)
    mod.upgrade()
    assert fake.calls[len(mid) :] == []

    mod.downgrade()
    assert "encounter_templates" in fake.columns_by_table["lobbies"]

    after_down = list(fake.calls)
    mod.downgrade()
    assert fake.calls[len(after_down) :] == []

    mod.upgrade()
    assert "encounter_templates" not in fake.columns_by_table["lobbies"]


def test_upgrade_noop_when_column_already_absent(monkeypatch):
    mod = _load_migration()
    fake = FakeOp({"lobbies": {"id", "name"}})

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(
        sa, "inspect", lambda _bind: FakeInspector(fake.columns_by_table)
    )

    mod.upgrade()
    assert fake.calls == []
