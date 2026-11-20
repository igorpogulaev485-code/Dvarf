"""ADM-02 migration: blocked_at/blocked_by, одна голова Alembic."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/adm02userhelp01_user_block.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("adm02userhelp01", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(self, tables: set[str], columns: dict[str, set[str]] | None = None):
        self.tables = set(tables)
        self.columns = {k: set(v) for k, v in (columns or {}).items()}
        self.fks: dict[str, list[dict[str, Any]]] = {}

    def get_table_names(self) -> list[str]:
        return sorted(self.tables)

    def get_columns(self, table: str) -> list[dict[str, str]]:
        return [{"name": n} for n in sorted(self.columns.get(table, set()))]

    def get_foreign_keys(self, table: str) -> list[dict[str, Any]]:
        return list(self.fks.get(table, []))


class FakeOp:
    def __init__(self):
        self.tables: set[str] = {"users", "admin_roles", "admin_secrets", "admin_audit_log"}
        self.columns: dict[str, set[str]] = {
            "users": {"id", "email"},
        }
        self.fks: dict[str, list[dict[str, Any]]] = {"users": []}
        self.calls: list[str] = []
        self._bind = object()

    def get_bind(self):
        return self._bind

    def add_column(self, table: str, column: Any) -> None:
        name = getattr(column, "name", None)
        if name:
            self.columns.setdefault(table, set()).add(name)
            self.calls.append(f"add_column:{table}.{name}")
            # ForeignKey в колонке
            for fk in getattr(column, "foreign_keys", []) or []:
                self.fks.setdefault(table, []).append(
                    {
                        "name": f"{table}_{name}_fkey",
                        "constrained_columns": [name],
                    }
                )

    def drop_column(self, table: str, name: str) -> None:
        self.columns.setdefault(table, set()).discard(name)
        self.calls.append(f"drop_column:{table}.{name}")

    def drop_constraint(self, name: str, table: str, type_: str | None = None) -> None:
        self.fks[table] = [fk for fk in self.fks.get(table, []) if fk.get("name") != name]
        self.calls.append(f"drop_constraint:{name}")


def test_migration_revises_adm01():
    mod = _load_migration()
    assert mod.revision == "adm02userhelp01"
    assert mod.down_revision == "adm01framework01"
    text = MIGRATION.read_text(encoding="utf-8")
    assert re.search(r"blocked_at", text)
    assert re.search(r"blocked_by", text)


def test_alembic_single_head_includes_adm02():
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    revisions = {rev.revision for rev in script.walk_revisions()}
    assert "adm02userhelp01" in revisions
    assert "adm01framework01" in revisions
    # Голову не хардкодим как константу пачки — проверяем, что ADM-02 в предках/голове.
    ancestors: set[str] = set()
    stack = [heads[0]]
    while stack:
        rev_id = stack.pop()
        if rev_id in ancestors:
            continue
        ancestors.add(rev_id)
        cur = script.get_revision(rev_id)
        if cur is None or cur.down_revision is None:
            continue
        down = cur.down_revision
        if isinstance(down, (list, tuple, set)):
            stack.extend(down)
        else:
            stack.append(down)
    assert "adm02userhelp01" in ancestors


def test_upgrade_downgrade(monkeypatch):
    mod = _load_migration()
    fake = FakeOp()

    import alembic.op as alembic_op
    import sqlalchemy as sa

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "add_column", fake.add_column)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)
    monkeypatch.setattr(alembic_op, "drop_constraint", fake.drop_constraint)
    monkeypatch.setattr(mod, "op", fake)

    def inspect_bind(_bind):
        return FakeInspector(fake.tables, fake.columns)

    # Подменяем get_foreign_keys через FakeInspector с общим fks
    class Inspector(FakeInspector):
        def get_foreign_keys(self, table: str):
            return list(fake.fks.get(table, []))

    monkeypatch.setattr(
        sa,
        "inspect",
        lambda _bind: Inspector(fake.tables, fake.columns),
    )

    mod.upgrade()
    assert "blocked_at" in fake.columns["users"]
    assert "blocked_by" in fake.columns["users"]
    mod.upgrade()  # idempotent
    mod.downgrade()
    assert "blocked_at" not in fake.columns["users"]
    assert "blocked_by" not in fake.columns["users"]
