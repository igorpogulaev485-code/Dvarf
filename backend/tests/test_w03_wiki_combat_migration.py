"""W-03 migration: chain / noop / downgrade; no hardcoded head assert."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any
from uuid import UUID

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/w03cmbt7b4e2a_combat_page_template.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("w03cmbt7b4e2a", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeResult:
    def __init__(self, row=None):
        self._row = row

    def fetchone(self):
        return self._row

    def fetchall(self):
        return [self._row] if self._row is not None else []


class FakeBind:
    def __init__(self, existing=False):
        self.existing = existing
        self.execute_calls: list[tuple[Any, Any]] = []
        self.inserted: list[dict] = []

    def execute(self, stmt: Any, params: Any = None) -> FakeResult:
        self.execute_calls.append((stmt, params))
        sql = str(stmt).lower()
        if "select" in sql and "setting_page_templates" in sql:
            if self.existing:
                return FakeResult(("existing-id",))
            return FakeResult(None)
        if "delete" in sql:
            self.existing = False
        return FakeResult(None)


class FakeOp:
    def __init__(self, bind: FakeBind):
        self._bind = bind
        self.bulk_rows: list[dict] = []

    def get_bind(self) -> FakeBind:
        return self._bind

    def bulk_insert(self, table, rows):  # noqa: ANN001
        self.bulk_rows.extend(rows)
        self._bind.inserted.extend(rows)
        self._bind.existing = True


def test_migration_revision_chain():
    mod = _load_migration()
    assert mod.revision == "w03cmbt7b4e2a"
    assert mod.down_revision == "w02wiki0a2e0f"


def test_alembic_single_head_contains_w03():
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    assert any(rev.revision == "w03cmbt7b4e2a" for rev in script.walk_revisions())


def test_upgrade_downgrade_idempotent(monkeypatch):
    mod = _load_migration()
    bind = FakeBind(existing=False)
    fake = FakeOp(bind)

    import alembic.op as alembic_op

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "bulk_insert", fake.bulk_insert)
    monkeypatch.setattr(mod, "op", fake)

    mod.upgrade()
    assert len(fake.bulk_rows) == 1
    row = fake.bulk_rows[0]
    assert row["page_kind"] == "combat"
    assert row["setting_id"] is None
    assert isinstance(row["id"], UUID)

    # повторный апгрейд — 0 изменений (строка уже есть)
    before = len(fake.bulk_rows)
    bind.existing = True
    mod.upgrade()
    assert len(fake.bulk_rows) == before

    mod.downgrade()
    assert any("delete" in str(c[0]).lower() for c in bind.execute_calls)

    bind.existing = False
    before2 = len(fake.bulk_rows)
    mod.upgrade()
    assert len(fake.bulk_rows) == before2 + 1


def test_no_hardcoded_template_uuid_in_source():
    src = MIGRATION.read_text(encoding="utf-8")
    assert "a1000000-0000-4000-8000-000000000007" not in src
    assert "SYSTEM_TEMPLATE_IDS" not in src
