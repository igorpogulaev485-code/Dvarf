"""L-06 journal drafts/chapters/media migration: chain / noop / downgrade; no hardcoded ids."""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from typing import Any

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic/versions/l06journ4c8e2_journal_drafts_chapters.py"
)


def _load_migration():
    spec = importlib.util.spec_from_file_location("l06journ4c8e2", MIGRATION)
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
        indexes: dict[str, set[str]] | None = None,
    ):
        self.tables = set(tables)
        self.columns = {k: set(v) for k, v in (columns or {}).items()}
        self.fks = {k: set(v) for k, v in (fks or {}).items()}
        self.indexes = {k: set(v) for k, v in (indexes or {}).items()}

    def get_table_names(self) -> list[str]:
        return sorted(self.tables)

    def get_columns(self, table: str) -> list[dict[str, Any]]:
        return [{"name": n} for n in sorted(self.columns.get(table, set()))]

    def get_foreign_keys(self, table: str) -> list[dict[str, Any]]:
        return [{"name": n} for n in sorted(self.fks.get(table, set()))]

    def get_indexes(self, table: str) -> list[dict[str, Any]]:
        return [{"name": n} for n in sorted(self.indexes.get(table, set()))]


class FakeOp:
    def __init__(self) -> None:
        self.tables = {"campaign_journal_entries", "lobby_media", "users"}
        self.columns = {
            "campaign_journal_entries": {
                "id",
                "lobby_id",
                "author_user_id",
                "entry_type",
                "title",
                "body",
                "image_url",
                "setting_id",
                "page_id",
                "from_session_id",
                "created_at",
                "updated_at",
            },
        }
        self.fks: dict[str, set[str]] = {"campaign_journal_entries": set()}
        self.indexes: dict[str, set[str]] = {"campaign_journal_entries": set()}
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

    def create_index(
        self,
        name: str,
        table: str,
        columns: list[str],
        **kwargs: Any,
    ) -> None:
        self.calls.append(f"create_index:{name}")
        self.indexes.setdefault(table, set()).add(name)

    def drop_constraint(self, name: str, table: str, type_: str | None = None) -> None:
        self.calls.append(f"drop_constraint:{name}")
        self.fks.get(table, set()).discard(name)

    def drop_index(self, name: str, table_name: str | None = None, **kwargs: Any) -> None:
        self.calls.append(f"drop_index:{name}")
        if table_name:
            self.indexes.get(table_name, set()).discard(name)

    def drop_column(self, table: str, column: str) -> None:
        self.calls.append(f"drop_column:{table}.{column}")
        self.columns.get(table, set()).discard(column)


def test_migration_has_expected_revision_chain():
    mod = _load_migration()
    assert mod.revision == "l06journ4c8e2"
    assert mod.down_revision == "l05notes9a1b2"


def test_migration_source_has_no_hardcoded_uuids():
    src = MIGRATION.read_text(encoding="utf-8")
    assert "op.execute" not in src
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

    monkeypatch.setattr(alembic_op, "get_bind", fake.get_bind)
    monkeypatch.setattr(alembic_op, "add_column", fake.add_column)
    monkeypatch.setattr(alembic_op, "create_foreign_key", fake.create_foreign_key)
    monkeypatch.setattr(alembic_op, "create_index", fake.create_index)
    monkeypatch.setattr(alembic_op, "drop_constraint", fake.drop_constraint)
    monkeypatch.setattr(alembic_op, "drop_index", fake.drop_index)
    monkeypatch.setattr(alembic_op, "drop_column", fake.drop_column)
    monkeypatch.setattr(mod, "op", fake)
    monkeypatch.setattr(
        sa,
        "inspect",
        lambda _bind: FakeInspector(
            fake.tables,
            columns=fake.columns,
            fks=fake.fks,
            indexes=fake.indexes,
        ),
    )

    before = list(fake.calls)
    mod.upgrade()
    new_calls = fake.calls[len(before) :]
    assert any("add_column:campaign_journal_entries.is_draft" in c for c in new_calls)
    assert any("add_column:campaign_journal_entries.chapter_id" in c for c in new_calls)
    assert any("add_column:campaign_journal_entries.media_id" in c for c in new_calls)
    assert "is_draft" in fake.columns["campaign_journal_entries"]
    assert "chapter_id" in fake.columns["campaign_journal_entries"]
    assert "media_id" in fake.columns["campaign_journal_entries"]

    mid = list(fake.calls)
    mod.upgrade()
    assert fake.calls[len(mid) :] == []

    mod.downgrade()
    assert "is_draft" not in fake.columns["campaign_journal_entries"]
    assert "chapter_id" not in fake.columns["campaign_journal_entries"]
    assert "media_id" not in fake.columns["campaign_journal_entries"]

    after_down = list(fake.calls)
    mod.downgrade()
    assert fake.calls[len(after_down) :] == []

    mod.upgrade()
    assert "is_draft" in fake.columns["campaign_journal_entries"]


def test_alembic_single_head_includes_l06():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    ancestor_ids = {rev.revision for rev in script.walk_revisions()}
    assert "l06journ4c8e2" in ancestor_ids
    assert "l05notes9a1b2" in ancestor_ids
