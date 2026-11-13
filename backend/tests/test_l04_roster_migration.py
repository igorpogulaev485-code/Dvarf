"""L-04 one-character-one-lobby migration: chain / noop / downgrade; no hardcoded ids."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/l04roster8c4d2_one_character_one_lobby.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("l04roster8c4d2", MIGRATION)
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
        uniques: dict[str, set[str]] | None = None,
        indexes: dict[str, set[str]] | None = None,
    ):
        self.tables = set(tables)
        self.columns = {k: set(v) for k, v in (columns or {}).items()}
        self.uniques = {k: set(v) for k, v in (uniques or {}).items()}
        self.indexes = {k: set(v) for k, v in (indexes or {}).items()}

    def get_table_names(self) -> list[str]:
        return sorted(self.tables)

    def get_columns(self, table: str) -> list[dict[str, Any]]:
        return [{"name": n} for n in sorted(self.columns.get(table, set()))]

    def get_unique_constraints(self, table: str) -> list[dict[str, Any]]:
        return [{"name": n} for n in sorted(self.uniques.get(table, set()))]

    def get_indexes(self, table: str) -> list[dict[str, Any]]:
        return [{"name": n} for n in sorted(self.indexes.get(table, set()))]


class FakeOp:
    def __init__(self) -> None:
        self.tables = {"lobby_members", "session_seats", "play_sessions", "characters"}
        self.columns = {
            "lobby_members": {"id", "lobby_id", "character_id", "user_id", "joined_at"},
            "session_seats": {"id", "session_id", "character_id", "seated_at"},
        }
        self.uniques = {
            "lobby_members": {"uq_lobby_members_lobby_character"},
        }
        self.indexes: dict[str, set[str]] = {"lobby_members": set()}
        self.calls: list[str] = []
        self._bind = object()
        self.executed: list[str] = []

    def get_bind(self):
        return self._bind

    def execute(self, stmt: Any) -> None:
        text = str(getattr(stmt, "text", stmt))
        self.calls.append("execute")
        self.executed.append(text)
        # Имитация: после dedupe unique можно ставить.
        self._deduped = True

    def create_unique_constraint(self, name: str, table: str, cols: list[str]) -> None:
        self.calls.append(f"create_unique_constraint:{name}")
        self.uniques.setdefault(table, set()).add(name)

    def drop_constraint(self, name: str, table: str, type_: str | None = None, **kwargs: Any) -> None:
        self.calls.append(f"drop_constraint:{name}")
        self.uniques.get(table, set()).discard(name)

    def add_column(self, table: str, column: Any) -> None:
        name = getattr(column, "name", None) or str(column)
        self.calls.append(f"add_column:{table}.{name}")
        self.columns.setdefault(table, set()).add(name)

    def drop_column(self, table: str, column: str) -> None:
        self.calls.append(f"drop_column:{table}.{column}")
        self.columns.get(table, set()).discard(column)


def test_migration_has_expected_revision_chain():
    mod = _load_migration()
    assert mod.revision == "l04roster8c4d2"
    assert mod.down_revision == "l02media7b3e1"


def test_migration_source_has_no_hardcoded_uuids():
    src = MIGRATION.read_text(encoding="utf-8")
    assert "INSERT" not in src.upper()
    assert not re.search(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
        src,
        flags=re.I,
    )


def test_upgrade_cleans_duplicates_then_unique_and_column(monkeypatch):
    mod = _load_migration()
    fake = FakeOp()

    import alembic.op as alembic_op
    import sqlalchemy as sa

    def _inspect(_bind):
        return FakeInspector(
            fake.tables,
            columns=fake.columns,
            uniques=fake.uniques,
            indexes=fake.indexes,
        )

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(sa, "inspect", _inspect)

    before = list(fake.calls)
    mod.upgrade()
    new_calls = fake.calls[len(before) :]
    assert any(c == "execute" for c in new_calls)
    assert any("create_unique_constraint:uq_lobby_members_character" in c for c in new_calls)
    assert "retained_after_kick" in fake.columns["session_seats"]
    # SQL dedupe: character in two lobbies — keep newest (documented by CTE ORDER BY).
    assert any("ROW_NUMBER" in t for t in fake.executed)
    assert any("joined_at DESC" in t for t in fake.executed)

    mid = list(fake.calls)
    mod.upgrade()
    assert fake.calls[len(mid) :] == []

    mod.downgrade()
    assert "retained_after_kick" not in fake.columns["session_seats"]
    assert "uq_lobby_members_character" not in fake.uniques["lobby_members"]

    after_down = list(fake.calls)
    mod.downgrade()
    assert fake.calls[len(after_down) :] == []

    mod.upgrade()
    assert "retained_after_kick" in fake.columns["session_seats"]
    assert "uq_lobby_members_character" in fake.uniques["lobby_members"]


def test_duplicate_membership_cleanup_policy_unit():
    """Зеркало миграции: оставить свежайшее joined_at, затем больший id."""
    rows = [
        {"id": 1, "character_id": "c1", "joined_at": "2026-01-01"},
        {"id": 3, "character_id": "c1", "joined_at": "2026-02-01"},
        {"id": 2, "character_id": "c1", "joined_at": "2026-02-01"},
        {"id": 4, "character_id": "c2", "joined_at": "2026-01-01"},
    ]
    by_char: dict[str, list] = {}
    for r in rows:
        by_char.setdefault(r["character_id"], []).append(r)
    keep = []
    drop = []
    for group in by_char.values():
        ordered = sorted(group, key=lambda r: (r["joined_at"], r["id"]), reverse=True)
        keep.append(ordered[0]["id"])
        drop.extend(o["id"] for o in ordered[1:])
    assert keep == [3, 4]
    assert drop == [2, 1]
    # 1 персонаж с дублями, 2 лишних членства сняты.
    assert len([c for c, g in by_char.items() if len(g) > 1]) == 1
    assert len(drop) == 2
