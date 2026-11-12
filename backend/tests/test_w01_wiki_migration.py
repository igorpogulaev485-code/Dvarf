"""W-01 migration: chain / noop / downgrade; no hardcoded head or UUIDs."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/w01wiki8d3a4_one_setting_revealed_at.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("w01wiki8d3a4", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, columns_by_table: dict[str, set[str]]):
        self.columns_by_table = {k: set(v) for k, v in columns_by_table.items()}

    def get_columns(self, table: str) -> list[dict[str, Any]]:
        return [{"name": name} for name in sorted(self.columns_by_table.get(table, set()))]


class FakeResult:
    def __init__(self, rows: list[tuple[Any, ...]] | None = None, one: tuple[Any, ...] | None = None):
        self._rows = list(rows or [])
        self._one = one

    def fetchall(self) -> list[tuple[Any, ...]]:
        return list(self._rows)

    def fetchone(self) -> tuple[Any, ...] | None:
        if self._one is not None:
            return self._one
        return self._rows[0] if self._rows else None


class FakeBind:
    def __init__(self):
        self.execute_calls: list[tuple[Any, Any]] = []
        self.settings_rows: list[tuple[Any, ...]] = []
        self.page_bodies: dict[Any, set[str]] = {}
        self.inserts: list[dict[str, Any]] = []

    def execute(self, stmt: Any, params: Any = None) -> FakeResult:
        self.execute_calls.append((stmt, params))
        sql = str(stmt).lower()
        if "from settings" in sql and "world_notes" in sql and "select id" in sql:
            return FakeResult(self.settings_rows)
        if "from setting_pages" in sql and "body =" in sql:
            sid = (params or {}).get("sid")
            body = (params or {}).get("body")
            if sid in self.page_bodies and body in self.page_bodies[sid]:
                return FakeResult(one=(1,))
            return FakeResult(one=None)
        if "max(sort_order)" in sql:
            return FakeResult(one=(-1,))
        if "insert into setting_pages" in sql:
            self.inserts.append(dict(params or {}))
            return FakeResult()
        if "update setting_pages" in sql:
            return FakeResult()
        return FakeResult()


class FakeOp:
    def __init__(self, bind: FakeBind, columns_by_table: dict[str, set[str]]):
        self._bind = bind
        self.columns_by_table = {k: set(v) for k, v in columns_by_table.items()}
        self.calls: list[str] = []

    def get_bind(self) -> FakeBind:
        return self._bind

    def add_column(self, table: str, column: Any) -> None:
        name = getattr(column, "name", None) or getattr(column, "key", None)
        self.calls.append(f"add_column:{table}:{name}")
        if name:
            self.columns_by_table.setdefault(table, set()).add(str(name))

    def drop_column(self, table: str, name: str) -> None:
        self.calls.append(f"drop_column:{table}:{name}")
        self.columns_by_table.setdefault(table, set()).discard(name)


def test_migration_revision_chain():
    mod = _load_migration()
    assert mod.revision == "w01wiki8d3a4"
    # down_revision — фактическая голова ветки L-16
    assert mod.down_revision == "l16start7c4e2"


def test_migration_source_has_no_hardcoded_uuids():
    src = MIGRATION.read_text(encoding="utf-8")
    assert not re.search(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        src,
        flags=re.I,
    )


def test_upgrade_downgrade_idempotent(monkeypatch):
    mod = _load_migration()
    bind = FakeBind()
    bind.settings_rows = [("setting-orphan", "хвост без страницы")]
    bind.page_bodies = {}
    fake = FakeOp(
        bind,
        columns_by_table={
            "settings": {"id", "world_notes", "lobby_id"},
            "setting_pages": {"id", "setting_id", "body", "revealed", "updated_at"},
        },
    )

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "add_column", fake.add_column)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(
        sa,
        "inspect",
        lambda _bind: FakeInspector(fake.columns_by_table),
    )

    mod.upgrade()
    assert "is_extra" in fake.columns_by_table["settings"]
    assert "revealed_at" in fake.columns_by_table["setting_pages"]
    assert len(bind.inserts) == 1
    assert bind.inserts[0]["body"] == "хвост без страницы"

    mid = list(fake.calls)
    inserts_mid = len(bind.inserts)
    # Повтор: колонки уже есть; хвост уже «есть» в page_bodies после первого insert —
    # симулируем, что страница теперь найдена.
    bind.page_bodies["setting-orphan"] = {"хвост без страницы"}
    mod.upgrade()
    assert fake.calls[len(mid) :] == []
    assert len(bind.inserts) == inserts_mid

    mod.downgrade()
    assert "is_extra" not in fake.columns_by_table["settings"]
    assert "revealed_at" not in fake.columns_by_table["setting_pages"]

    mid2 = list(fake.calls)
    mod.downgrade()
    assert fake.calls[len(mid2) :] == []

    mod.upgrade()
    assert "is_extra" in fake.columns_by_table["settings"]
    assert "revealed_at" in fake.columns_by_table["setting_pages"]


def test_alembic_single_head_includes_w01():
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
    assert "w01wiki8d3a4" in ancestor_ids
    assert "l16start7c4e2" in ancestor_ids
