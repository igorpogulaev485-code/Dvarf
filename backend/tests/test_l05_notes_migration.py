"""L-05 lobby_notes columns migration: chain / noop / downgrade; no hardcoded ids."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/l05notes9a1b2_lobby_notes_share_pin.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("l05notes9a1b2", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FakeInspector:
    def __init__(
        self,
        tables: set[str],
        *,
        columns: dict[str, set[str]] | None = None,
        fks: dict[str, set[str]] | None = None,
    ):
        self.tables = set(tables)
        self.columns = {k: set(v) for k, v in (columns or {}).items()}
        self.fks = {k: set(v) for k, v in (fks or {}).items()}

    def get_table_names(self) -> list[str]:
        return sorted(self.tables)

    def get_columns(self, table: str) -> list[dict[str, Any]]:
        return [{"name": n} for n in sorted(self.columns.get(table, set()))]

    def get_foreign_keys(self, table: str) -> list[dict[str, Any]]:
        return [{"name": n} for n in sorted(self.fks.get(table, set()))]


class FakeOp:
    def __init__(self) -> None:
        self.tables = {"lobby_notes", "users"}
        self.columns = {
            "lobby_notes": {
                "id",
                "lobby_id",
                "scope",
                "author_user_id",
                "title",
                "body",
                "created_at",
                "updated_at",
            },
        }
        self.fks: dict[str, set[str]] = {"lobby_notes": set()}
        self.calls: list[str] = []
        self._bind = object()

    def get_bind(self):
        return self._bind

    def add_column(self, table: str, column: Any) -> None:
        name = getattr(column, "name", None) or str(column)
        self.calls.append(f"add_column:{table}.{name}")
        self.columns.setdefault(table, set()).add(name)

    def create_foreign_key(
        self,
        name: str,
        source: str,
        referent: str,
        local: list[str],
        remote: list[str],
        **kwargs: Any,
    ) -> None:
        self.calls.append(f"create_foreign_key:{name}")
        self.fks.setdefault(source, set()).add(name)

    def drop_constraint(self, name: str, table: str, type_: str | None = None, **kwargs: Any) -> None:
        self.calls.append(f"drop_constraint:{name}")
        self.fks.get(table, set()).discard(name)

    def drop_column(self, table: str, column: str) -> None:
        self.calls.append(f"drop_column:{table}.{column}")
        self.columns.get(table, set()).discard(column)


def test_migration_has_expected_revision_chain():
    mod = _load_migration()
    assert mod.revision == "l05notes9a1b2"
    assert mod.down_revision == "l04roster8c4d2"


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
        return FakeInspector(fake.tables, columns=fake.columns, fks=fake.fks)

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(sa, "inspect", _inspect)

    before = list(fake.calls)
    mod.upgrade()
    new_calls = fake.calls[len(before) :]
    assert any("shared_with_master" in c for c in new_calls)
    assert any("pinned" in c for c in new_calls)
    assert any("updated_by_user_id" in c for c in new_calls)
    assert any("create_foreign_key:fk_lobby_notes_updated_by_user" in c for c in new_calls)
    assert "shared_with_master" in fake.columns["lobby_notes"]
    assert "pinned" in fake.columns["lobby_notes"]
    assert "updated_by_user_id" in fake.columns["lobby_notes"]

    mid = list(fake.calls)
    mod.upgrade()
    assert fake.calls[len(mid) :] == []

    mod.downgrade()
    assert "shared_with_master" not in fake.columns["lobby_notes"]
    assert "pinned" not in fake.columns["lobby_notes"]
    assert "updated_by_user_id" not in fake.columns["lobby_notes"]
    assert "fk_lobby_notes_updated_by_user" not in fake.fks["lobby_notes"]

    after_down = list(fake.calls)
    mod.downgrade()
    assert fake.calls[len(after_down) :] == []

    mod.upgrade()
    assert "shared_with_master" in fake.columns["lobby_notes"]


def test_alembic_single_head_includes_l05():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    ancestor_ids = {rev.revision for rev in script.walk_revisions()}
    assert "l05notes9a1b2" in ancestor_ids
    assert "l04roster8c4d2" in ancestor_ids
