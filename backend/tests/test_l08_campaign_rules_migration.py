"""L-08 campaign_rules migration: chain / noop / downgrade; no hardcoded ids."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/l08rules9f2a1_campaign_rules.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("l08rules9f2a1", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, columns: set[str] | None = None):
        self.columns = set(columns or [])

    def get_columns(self, table: str) -> list[dict[str, Any]]:
        assert table == "lobbies"
        return [{"name": name} for name in sorted(self.columns)]


class FakeResult:
    def __init__(self, rows: list[tuple[Any, ...]]):
        self._rows = rows

    def fetchall(self) -> list[tuple[Any, ...]]:
        return list(self._rows)


class FakeBind:
    def __init__(self, rows: list[tuple[Any, ...]] | None = None):
        self.rows = list(rows or [])
        self.execute_calls: list[Any] = []

    def execute(self, stmt: Any, params: Any = None) -> FakeResult:
        self.execute_calls.append((stmt, params))
        sql = str(stmt)
        if "SELECT id, visibility_profile" in sql:
            return FakeResult(self.rows)
        return FakeResult([])


class FakeOp:
    def __init__(self, bind: FakeBind, columns: set[str]):
        self._bind = bind
        self.columns = set(columns)
        self.calls: list[str] = []

    def get_bind(self) -> FakeBind:
        return self._bind

    def add_column(self, table: str, column: Any) -> None:
        name = getattr(column, "name", None) or getattr(column, "key", None)
        self.calls.append(f"add_column:{table}:{name}")
        if name:
            self.columns.add(str(name))

    def drop_column(self, table: str, name: str) -> None:
        self.calls.append(f"drop_column:{table}:{name}")
        self.columns.discard(name)


def test_migration_has_expected_revision_chain():
    mod = _load_migration()
    assert mod.revision == "l08rules9f2a1"
    assert mod.down_revision == "l07whisp5d9e3"


def test_migration_source_has_no_hardcoded_uuids():
    src = MIGRATION.read_text(encoding="utf-8")
    assert not re.search(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        src,
        flags=re.I,
    )


def test_upgrade_downgrade_idempotent(monkeypatch):
    mod = _load_migration()
    bind = FakeBind(rows=[])
    fake = FakeOp(bind, columns={"id", "visibility_profile"})

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "add_column", fake.add_column)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(
        sa,
        "inspect",
        lambda _bind: FakeInspector(fake.columns),
    )

    before = list(fake.calls)
    mod.upgrade()
    assert "campaign_rules" in fake.columns
    assert any("add_column:lobbies:campaign_rules" in c for c in fake.calls[len(before) :])

    mid = list(fake.calls)
    mod.upgrade()
    assert fake.calls[len(mid) :] == []

    mod.downgrade()
    assert "campaign_rules" not in fake.columns

    mid2 = list(fake.calls)
    mod.downgrade()
    assert fake.calls[len(mid2) :] == []

    mod.upgrade()
    assert "campaign_rules" in fake.columns


def test_alembic_single_head_includes_l08():
    """Не хардкодим имя головы: одна голова, l08 в предках или сама голова."""
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
    assert "l08rules9f2a1" in ancestor_ids
    assert "l07whisp5d9e3" in ancestor_ids
