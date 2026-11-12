"""B-08 race migration must not insert into the legacy …210–…216 id block.

Prod already uses those pkeys for other catalog_entries; the first B-08 draft
failed with UniqueViolation on aarakocra_eepc. This test occupies those ids with
foreign rows and runs upsert → delete-by-slug → upsert (upgrade/downgrade/upgrade).
"""

from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path
from typing import Any

import pytest

MIGRATION = Path(__file__).resolve().parents[1] / "alembic/versions/b08race9f4c2_mpmm_eepc_egw_races.py"


def _load_migration():
    spec = importlib.util.spec_from_file_location("b08race9f4c2_mpmm_eepc_egw_races", MIGRATION)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class UniqueViolation(Exception):
    """Mirrors psycopg.errors.UniqueViolation for the fake catalog."""


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
    """Minimal catalog_entries store that enforces primary-key uniqueness."""

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

    def race_by_slug(self, slug: str) -> dict[str, Any] | None:
        for row in self.by_id.values():
            if (
                row["kind"] == "race"
                and row["rules_edition"] == "2014"
                and row["slug"] == slug
            ):
                return row
        return None

    def execute(self, statement: Any, params: dict[str, Any] | None = None) -> _Result:
        sql = re.sub(r"\s+", " ", str(statement)).strip().lower()
        params = dict(params or {})

        if sql.startswith("select id from catalog_entries") and "and slug = :slug" in sql:
            row = self.race_by_slug(params["slug"])
            return _Result([{"id": row["id"]}] if row else [])

        if sql.startswith("select id, data from catalog_entries"):
            row = self.race_by_slug(params["slug"])
            if not row:
                return _Result([])
            return _Result([{"id": row["id"], "data": dict(row.get("data") or {})}])

        if sql.startswith("select id, slug from catalog_entries"):
            rows = [
                {"id": r["id"], "slug": r["slug"]}
                for r in self.by_id.values()
                if r["kind"] == "race" and r["rules_edition"] == "2014"
            ]
            return _Result(rows)

        if sql.startswith("select id, slug, name_ru from catalog_entries"):
            rows = [
                {"id": r["id"], "slug": r["slug"], "name_ru": r["name_ru"]}
                for r in self.by_id.values()
                if r["kind"] == "race" and r["rules_edition"] == "2014"
            ]
            return _Result(rows)

        if sql.startswith("insert into catalog_entries"):
            entry_id = str(params["id"])
            if entry_id in self.by_id:
                raise UniqueViolation(
                    f"duplicate key value violates unique constraint "
                    f'"catalog_entries_pkey" Key (id)=({entry_id}) already exists.'
                )
            # unique (kind, slug, edition)
            if self.race_by_slug(params["slug"]):
                raise UniqueViolation(
                    f"duplicate key for kind/slug/edition slug={params['slug']}"
                )
            data = params.get("data")
            if isinstance(data, str):
                data = json.loads(data)
            self.by_id[entry_id] = {
                "id": entry_id,
                "kind": "race",
                "slug": params["slug"],
                "name_ru": params.get("name_ru") or params["slug"],
                "name_en": params.get("name_en"),
                "rules_edition": "2014",
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
                row = self.race_by_slug(params["slug"])
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
            if "is_active" in sql and "is_active = true" in sql and "is_active" not in params:
                row["is_active"] = True
            if "is_active = false" in sql:
                row["is_active"] = False
            return _Result([])

        if sql.startswith("delete from catalog_entries"):
            row = self.race_by_slug(params["slug"])
            if row:
                del self.by_id[row["id"]]
            return _Result([])

        raise AssertionError(f"unhandled SQL in FakeCatalogConn: {sql[:160]}")


def _sample_race(slug: str, *, parent_slug: str | None = None) -> dict[str, Any]:
    return {
        "slug": slug,
        "name_ru": slug.replace("_", " ").title(),
        "name_en": slug,
        "parent_slug": parent_slug,
        "source": "eepc" if slug.endswith("_eepc") else "egw",
        "sort_order": 900,
        "speed": 30,
        "selectable": True,
    }


def test_legacy_hardcoded_ids_cover_prod_collision_block():
    mod = _load_migration()
    assert "11111111-1111-4111-8111-111111111210" in mod.LEGACY_HARDCODED_IDS
    assert len(mod.LEGACY_HARDCODED_IDS) == 7
    for slug in mod.NEW_SETTING_SLUGS:
        assert mod.new_race_entry_id(slug) not in mod.LEGACY_HARDCODED_IDS


def test_upsert_survives_occupied_legacy_ids_and_is_idempotent():
    mod = _load_migration()
    conn = FakeCatalogConn()
    conn.occupy_legacy_ids(mod.LEGACY_HARDCODED_IDS)

    # Prove the old strategy would still explode on prod.
    with pytest.raises(UniqueViolation, match="11111111-1111-4111-8111-111111111210"):
        conn.execute(
            "INSERT INTO catalog_entries (id) VALUES (CAST(:id AS uuid))",
            {"id": mod.LEGACY_HARDCODED_IDS[0], "slug": "should_fail"},
        )

    id_by_slug: dict[str, str] = {}
    # Seed a parent race under a non-legacy id so parent_id resolution works.
    parent = _sample_race("dragonborn")
    parent_id = mod._upsert_new_race(conn, parent, id_by_slug)
    assert parent_id == mod.new_race_entry_id("dragonborn")

    inserted: dict[str, str] = {}
    for slug in mod.NEW_SETTING_SLUGS:
        parent_slug = "dragonborn" if slug.startswith("dragonborn_") else None
        race = _sample_race(slug, parent_slug=parent_slug)
        entry_id = mod._upsert_new_race(conn, race, id_by_slug)
        inserted[slug] = entry_id
        assert entry_id == mod.new_race_entry_id(slug)
        assert entry_id not in mod.LEGACY_HARDCODED_IDS
        row = conn.race_by_slug(slug)
        assert row is not None
        assert row["id"] == entry_id
        if parent_slug:
            assert row["parent_id"] == parent_id

    # Downgrade: delete only what this migration inserted (by slug).
    for slug in mod.NEW_SETTING_SLUGS:
        conn.execute(
            "DELETE FROM catalog_entries WHERE kind = 'race' "
            "AND rules_edition = '2014' AND slug = :slug",
            {"slug": slug},
        )
        assert conn.race_by_slug(slug) is None

    # Foreign occupants of …210–…216 must remain.
    for entry_id in mod.LEGACY_HARDCODED_IDS:
        assert entry_id in conn.by_id
        assert conn.by_id[entry_id]["kind"] == "item"

    # Re-upgrade: same uuid5 ids, still no collision with legacy block.
    id_by_slug = {"dragonborn": parent_id}
    for slug in mod.NEW_SETTING_SLUGS:
        parent_slug = "dragonborn" if slug.startswith("dragonborn_") else None
        entry_id = mod._upsert_new_race(
            conn, _sample_race(slug, parent_slug=parent_slug), id_by_slug
        )
        assert entry_id == inserted[slug]
        assert conn.race_by_slug(slug)["id"] == inserted[slug]

    # Third pass updates in place (idempotent) without touching legacy ids.
    for slug in mod.NEW_SETTING_SLUGS:
        parent_slug = "dragonborn" if slug.startswith("dragonborn_") else None
        race = _sample_race(slug, parent_slug=parent_slug)
        race["name_ru"] = f"{slug} refreshed"
        entry_id = mod._upsert_new_race(conn, race, id_by_slug)
        assert entry_id == inserted[slug]
        assert conn.race_by_slug(slug)["name_ru"] == f"{slug} refreshed"


def test_downgrade_deletes_new_setting_slugs_only():
    mod = _load_migration()
    conn = FakeCatalogConn()
    conn.occupy_legacy_ids(mod.LEGACY_HARDCODED_IDS)
    id_by_slug: dict[str, str] = {}
    for slug in mod.NEW_SETTING_SLUGS:
        mod._upsert_new_race(conn, _sample_race(slug), id_by_slug)

    # Mimic the delete loop added to downgrade().
    for slug in mod.NEW_SETTING_SLUGS:
        conn.execute(
            "DELETE FROM catalog_entries WHERE kind = 'race' "
            "AND rules_edition = '2014' AND slug = :slug",
            {"slug": slug},
        )

    for slug in mod.NEW_SETTING_SLUGS:
        assert conn.race_by_slug(slug) is None
    assert len([r for r in conn.by_id.values() if r["kind"] == "item"]) == 7
