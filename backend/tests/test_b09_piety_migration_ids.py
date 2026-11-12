"""B-09 piety migration must not insert into a occupied id block.

Mirrors B-08: occupy legacy-looking ids with foreign rows, upsert by slug with
uuid5, downgrade by slug, re-upgrade — no catalog_entries_pkey collision.
"""

from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path
from typing import Any

import pytest

MIGRATION = Path(__file__).resolve().parents[1] / "alembic/versions/b09piety7a3c1_theros_piety.py"


def _load_migration():
    spec = importlib.util.spec_from_file_location("b09piety7a3c1_theros_piety", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class UniqueViolation(Exception):
    pass


class _Mappings:
    def __init__(self, rows: list[dict[str, Any]]):
        self._rows = rows

    def first(self) -> dict[str, Any] | None:
        return self._rows[0] if self._rows else None

    def all(self) -> list[dict[str, Any]]:
        return list(self._rows)

    def __iter__(self):
        return iter(self._rows)


class _Result:
    def __init__(self, rows: list[dict[str, Any]]):
        self._rows = rows

    def mappings(self) -> _Mappings:
        return _Mappings(self._rows)


class FakeCatalogConn:
    def __init__(self) -> None:
        self.by_id: dict[str, dict[str, Any]] = {}

    def occupy_legacy_ids(self, ids: tuple[str, ...]) -> None:
        for i, entry_id in enumerate(ids):
            self.by_id[entry_id] = {
                "id": entry_id,
                "kind": "item",
                "slug": f"occupied_foreign_{i}",
                "name_ru": f"Occupied {i}",
                "name_en": None,
                "rules_edition": "2014",
                "parent_id": None,
                "source": "test",
                "external_ref": None,
                "data": {"note": "foreign occupant"},
                "sort_order": i,
                "is_active": True,
            }

    def by_slug(self, kind: str, slug: str) -> dict[str, Any] | None:
        for row in self.by_id.values():
            if (
                row["kind"] == kind
                and row["rules_edition"] == "2014"
                and row["slug"] == slug
            ):
                return row
        return None

    def execute(self, statement: Any, params: dict[str, Any] | None = None) -> _Result:
        sql = re.sub(r"\s+", " ", str(statement)).strip().lower()
        params = dict(params or {})

        if sql.startswith("select id from catalog_entries") and "and slug = :slug" in sql:
            kind = params.get("kind", "feat")
            row = self.by_slug(kind, params["slug"])
            return _Result([{"id": row["id"]}] if row else [])

        if sql.startswith("select id, data from catalog_entries"):
            kind = "race" if "kind = 'race'" in sql or "kind = :kind" not in sql else params.get("kind", "race")
            if "kind = 'race'" in sql:
                kind = "race"
            row = self.by_slug(kind, params["slug"])
            if not row:
                return _Result([])
            return _Result([{"id": row["id"], "data": dict(row.get("data") or {})}])

        if sql.startswith("insert into catalog_entries"):
            entry_id = str(params["id"])
            if entry_id in self.by_id:
                raise UniqueViolation(
                    f'duplicate key value violates unique constraint '
                    f'"catalog_entries_pkey" Key (id)=({entry_id}) already exists.'
                )
            kind = params["kind"]
            if self.by_slug(kind, params["slug"]):
                raise UniqueViolation(f"duplicate kind/slug/edition slug={params['slug']}")
            data = params.get("data")
            if isinstance(data, str):
                data = json.loads(data)
            self.by_id[entry_id] = {
                "id": entry_id,
                "kind": kind,
                "slug": params["slug"],
                "name_ru": params.get("name_ru") or params["slug"],
                "name_en": params.get("name_en"),
                "rules_edition": params.get("edition") or "2014",
                "parent_id": params.get("parent_id"),
                "source": params.get("source"),
                "external_ref": None,
                "data": data or {},
                "sort_order": int(params.get("sort_order") or 999),
                "is_active": True,
            }
            return _Result([])

        if sql.startswith("update catalog_entries"):
            entry_id = str(params.get("id") or "")
            row = self.by_id.get(entry_id)
            if row is None and "slug = :slug" in sql:
                row = self.by_slug(params.get("kind", "feat"), params["slug"])
            if row is None:
                return _Result([])
            if "data" in params:
                data = params["data"]
                if isinstance(data, str):
                    data = json.loads(data)
                row["data"] = data
            for key in ("name_ru", "name_en", "source", "parent_id", "sort_order", "is_active"):
                if key in params and params[key] is not None:
                    row[key] = params[key]
            return _Result([])

        if sql.startswith("delete from catalog_entries"):
            kind = "feat"
            if "kind = 'feat'" in sql:
                kind = "feat"
            row = self.by_slug(kind, params["slug"])
            if row:
                del self.by_id[row["id"]]
            return _Result([])

        raise AssertionError(f"unhandled SQL in FakeCatalogConn: {sql[:160]}")


SAMPLE_ENTRIES = [
    {
        "slug": "theros_god_heliod",
        "kind": "feat",
        "name_ru": "Гелиод",
        "name_en": "Heliod",
        "source": "mot",
        "sort_order": 1,
        "parent_slug": None,
        "data": {"theros_kind": "god", "god_slug": "heliod"},
    },
    {
        "slug": "piety_heliod_devotee",
        "kind": "feat",
        "name_ru": "Послушник Гелиода",
        "name_en": "Heliod's Devotee",
        "source": "mot",
        "sort_order": 2,
        "parent_slug": "theros_god_heliod",
        "data": {"theros_kind": "piety_reward", "god_slug": "heliod", "rank": "devotee"},
    },
    {
        "slug": "supernatural_gift_oracle",
        "kind": "feat",
        "name_ru": "Оракул",
        "name_en": "Oracle",
        "source": "mot",
        "sort_order": 3,
        "parent_slug": None,
        "data": {"theros_kind": "supernatural_gift", "gift_slug": "oracle"},
    },
]


def test_legacy_ids_are_not_used_for_new_entries():
    mod = _load_migration()
    assert len(mod.LEGACY_HARDCODED_IDS) == 8
    assert "11111111-1111-4111-8111-111111111300" in mod.LEGACY_HARDCODED_IDS
    for entry in SAMPLE_ENTRIES:
        eid = mod.new_entry_id(entry["kind"], entry["slug"])
        assert eid not in mod.LEGACY_HARDCODED_IDS


def test_upsert_survives_occupied_legacy_ids_and_is_idempotent():
    mod = _load_migration()
    conn = FakeCatalogConn()
    conn.occupy_legacy_ids(mod.LEGACY_HARDCODED_IDS)

    with pytest.raises(UniqueViolation, match="11111111-1111-4111-8111-111111111300"):
        conn.execute(
            "INSERT INTO catalog_entries (id) VALUES (CAST(:id AS uuid))",
            {"id": mod.LEGACY_HARDCODED_IDS[0], "slug": "should_fail", "kind": "feat"},
        )

    id_by_slug: dict[str, str] = {}
    inserted: dict[str, str] = {}
    for entry in SAMPLE_ENTRIES:
        eid = mod._upsert_feat_entry(conn, entry, id_by_slug)
        inserted[entry["slug"]] = eid
        assert eid == mod.new_entry_id(entry["kind"], entry["slug"])
        assert eid not in mod.LEGACY_HARDCODED_IDS
        row = conn.by_slug("feat", entry["slug"])
        assert row is not None and row["id"] == eid
        if entry.get("parent_slug"):
            assert row["parent_id"] == inserted[entry["parent_slug"]]

    # Downgrade by slug
    for entry in SAMPLE_ENTRIES:
        conn.execute(
            "DELETE FROM catalog_entries WHERE kind = 'feat' "
            "AND rules_edition = '2014' AND slug = :slug",
            {"slug": entry["slug"]},
        )
        assert conn.by_slug("feat", entry["slug"]) is None

    for entry_id in mod.LEGACY_HARDCODED_IDS:
        assert entry_id in conn.by_id
        assert conn.by_id[entry_id]["kind"] == "item"

    # Re-upgrade
    id_by_slug = {}
    for entry in SAMPLE_ENTRIES:
        eid = mod._upsert_feat_entry(conn, entry, id_by_slug)
        assert eid == inserted[entry["slug"]]

    # Third pass refreshes in place
    for entry in SAMPLE_ENTRIES:
        refreshed = dict(entry)
        refreshed["name_ru"] = f"{entry['slug']} refreshed"
        eid = mod._upsert_feat_entry(conn, refreshed, id_by_slug)
        assert eid == inserted[entry["slug"]]
        assert conn.by_slug("feat", entry["slug"])["name_ru"] == refreshed["name_ru"]
