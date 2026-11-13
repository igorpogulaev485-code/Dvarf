"""ONB-03 migration: single head, chain, upgrade/downgrade; no hardcoded head assert."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/onb03usr9c2e1_user_onboarding.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("onb03usr9c2e1", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, columns: dict[str, set[str]] | None = None):
        self.columns = columns or {}

    def get_columns(self, table: str) -> list[dict[str, Any]]:
        return [{"name": n} for n in self.columns.get(table, set())]


class FakeBind:
    def __init__(self, inspector: FakeInspector):
        self.inspector = inspector


class FakeOp:
    def __init__(self, bind: FakeBind):
        self._bind = bind
        self.added_columns: list[tuple[str, str]] = []
        self.dropped_columns: list[tuple[str, str]] = []

    def get_bind(self) -> FakeBind:
        return self._bind

    def add_column(self, table: str, column):  # noqa: ANN001
        self.added_columns.append((table, column.name))
        self._bind.inspector.columns.setdefault(table, set()).add(column.name)

    def drop_column(self, table: str, name: str):
        self.dropped_columns.append((table, name))
        cols = self._bind.inspector.columns.setdefault(table, set())
        cols.discard(name)


def test_migration_revision_chain():
    mod = _load_migration()
    assert mod.revision == "onb03usr9c2e1"
    assert mod.down_revision == "w04sets8a1b2c"


def test_alembic_single_head_contains_onb03():
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    revs = {rev.revision for rev in script.walk_revisions()}
    assert "onb03usr9c2e1" in revs
    assert "w04sets8a1b2c" in revs
    assert heads[0] == "onb03usr9c2e1"


def test_upgrade_downgrade_idempotent(monkeypatch):
    mod = _load_migration()
    inspector = FakeInspector(columns={"users": {"id", "email", "theme_id"}})
    bind = FakeBind(inspector)
    fake = FakeOp(bind)

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "add_column", fake.add_column)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)
    monkeypatch.setattr(sa, "inspect", lambda _bind: inspector)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(mod.sa, "inspect", lambda _bind: inspector)

    mod.upgrade()
    assert ("users", "onboarding") in fake.added_columns
    assert "onboarding" in inspector.columns["users"]

    # Second upgrade is a no-op (idempotent).
    fake.added_columns.clear()
    mod.upgrade()
    assert fake.added_columns == []

    mod.downgrade()
    assert ("users", "onboarding") in fake.dropped_columns
    assert "onboarding" not in inspector.columns["users"]

    fake.dropped_columns.clear()
    mod.downgrade()
    assert fake.dropped_columns == []
