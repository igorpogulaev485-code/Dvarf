"""Regression: prod legacy 2024 catalog.json UUIDs must not break seed FK.

Deploy #90 failed on ``wapi08partych01 -> p2401lobbyed01`` when
``barbarian__berserker`` was inserted with planned UUID5 ``parent_id`` while
the parent class row still held the archived dump id
``cf870cb5-f412-5718-80c2-a6fd8c82b45e``.

This suite pre-seeds ``backend/data/srd/2024/catalog.json`` (then deactivates
classes like ``n3c4d5e6f7a8``) and re-runs the full live seed. Parent FKs must
resolve to the actual DB id; 2014 rows stay untouched; re-apply is idempotent.

When ``DATABASE_URL`` / default local Postgres is reachable, the same scenario
runs against a real ``catalog_entries`` table with an enforced self-FK.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import pytest
import sqlalchemy as sa

from app.services.edition_2024_catalog_seed import (
    apply_edition_2024_catalog_seed,
    entry_id,
    load_wave_rows,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND = REPO_ROOT / "backend"
DUMP_PATH = BACKEND / "data" / "srd" / "2024" / "catalog.json"
BARBARIAN_LEGACY_ID = "cf870cb5-f412-5718-80c2-a6fd8c82b45e"
BARBARIAN_UUID5 = entry_id(kind="class", slug="barbarian")

# Marker 2014 row — must survive the 2024 seed untouched.
MARKER_2014_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


class ForeignKeyViolation(Exception):
    """Mirrors psycopg.errors.ForeignKeyViolation for the in-memory store."""


class FakeResult:
    def __init__(self, row=None, rowcount: int = 0):
        self._row = row
        self.rowcount = rowcount

    def first(self):
        return self._row


class LegacyAwareFakeConn:
    """catalog_entries store with unique (kind, slug, edition) + parent FK."""

    def __init__(self) -> None:
        self.by_id: dict[str, dict[str, Any]] = {}

    def seed_legacy_dump(self, *, deactivate_classes: bool = True) -> int:
        payload = json.loads(DUMP_PATH.read_text(encoding="utf-8"))
        assert isinstance(payload, list)
        for item in payload:
            row = {
                "id": str(item["id"]),
                "kind": str(item["kind"]),
                "slug": str(item["slug"]).lower(),
                "name_ru": item.get("name_ru") or item["slug"],
                "name_en": item.get("name_en"),
                "edition": str(item.get("rules_edition") or "2024"),
                "parent_id": str(item["parent_id"]) if item.get("parent_id") else None,
                "source": item.get("source") or "srd-5.2",
                "external_ref": json.dumps(item.get("external_ref"))
                if item.get("external_ref") is not None
                else None,
                "data": json.dumps(item.get("data") or {}),
                "sort_order": int(item.get("sort_order") or 0),
                "is_active": bool(item.get("is_active", True)),
            }
            if row["id"] in self.by_id:
                raise AssertionError(f"duplicate legacy id {row['id']}")
            self.by_id[row["id"]] = row
        if deactivate_classes:
            for row in self.by_id.values():
                if row["kind"] == "class" and row["edition"] == "2024":
                    row["is_active"] = False
        # Untouched 2014 marker (simulates prod PHB class still present).
        self.by_id[MARKER_2014_ID] = {
            "id": MARKER_2014_ID,
            "kind": "class",
            "slug": "fighter",
            "name_ru": "Воин",
            "name_en": "Fighter",
            "edition": "2014",
            "parent_id": None,
            "source": "phb",
            "external_ref": None,
            "data": json.dumps({"hit_die": 10, "marker": "p24-legacy-regression"}),
            "sort_order": 0,
            "is_active": True,
        }
        return len(payload)

    def _find(self, kind: str, slug: str, edition: str) -> dict[str, Any] | None:
        for row in self.by_id.values():
            if (
                row["kind"] == kind
                and row["slug"] == slug
                and row["edition"] == edition
            ):
                return row
        return None

    def _assert_parent_fk(self, parent_id: str | None) -> None:
        if parent_id in (None, ""):
            return
        if str(parent_id) not in self.by_id:
            raise ForeignKeyViolation(
                f"insert or update on table catalog_entries violates foreign key "
                f"constraint catalog_entries_parent_id_fkey: "
                f"Key (parent_id)=({parent_id}) is not present in table catalog_entries."
            )

    def execute(self, statement: Any, params: dict[str, Any] | None = None) -> FakeResult:
        sql = str(statement)
        params = dict(params or {})

        if "UPDATE catalog_entries" in sql and "is_active = false" in sql and "WHERE" in sql:
            # deactivate_legacy_2024_stubs — best-effort count
            n = 0
            for row in self.by_id.values():
                if row["edition"] == "2024" and row["is_active"] is True:
                    # Approximate stub filter: hit_die-only / empty already inactive
                    # on our legacy seed for classes; count culture/engineering etc.
                    data = json.loads(row["data"] or "{}")
                    slug = row["slug"]
                    if slug in {"culture", "engineering"}:
                        row["is_active"] = False
                        n += 1
                        continue
                    if row["kind"] in {"race", "class", "background", "subclass"}:
                        meaningful = {
                            k: v
                            for k, v in data.items()
                            if k
                            not in {
                                "content_layer",
                                "asi",
                                "origin_feat",
                                "category",
                                "mastery",
                                "spell_list",
                                "spell_list_note_ru",
                            }
                            and v not in (None, "", [], {}, False)
                        }
                        if not meaningful or set(meaningful) <= {"hit_die"}:
                            row["is_active"] = False
                            n += 1
            return FakeResult(rowcount=n)

        if "SELECT id FROM catalog_entries" in sql:
            existing = self._find(params["kind"], params["slug"], params["edition"])
            return FakeResult(row=(existing["id"],) if existing else None)

        if "INSERT INTO catalog_entries" in sql:
            self._assert_parent_fk(params.get("parent_id"))
            entry_id_s = str(params["id"])
            if entry_id_s in self.by_id:
                raise AssertionError(f"duplicate pkey {entry_id_s}")
            key_hit = self._find(params["kind"], params["slug"], params["edition"])
            if key_hit:
                raise AssertionError(
                    f"unique (kind,slug,edition) conflict for {params['kind']}/{params['slug']}"
                )
            self.by_id[entry_id_s] = dict(params)
            return FakeResult(rowcount=1)

        if "UPDATE catalog_entries SET" in sql:
            self._assert_parent_fk(params.get("parent_id"))
            target = self.by_id.get(str(params["id"])) or self._find(
                params["kind"], params["slug"], params["edition"]
            )
            assert target is not None, params
            # Preserve primary key — never rewrite id to planned UUID5.
            preserved = target["id"]
            target.update(dict(params))
            target["id"] = preserved
            self.by_id[preserved] = target
            return FakeResult(rowcount=1)

        raise AssertionError(f"unexpected SQL: {sql[:240]}")


def _active_2024(conn: LegacyAwareFakeConn, kind: str) -> list[dict[str, Any]]:
    out = []
    for row in conn.by_id.values():
        if row["kind"] == kind and row["edition"] == "2024" and row["is_active"]:
            out.append(row)
    return out


def test_legacy_dump_barbarian_id_differs_from_uuid5():
    assert BARBARIAN_LEGACY_ID != BARBARIAN_UUID5
    dump = json.loads(DUMP_PATH.read_text(encoding="utf-8"))
    barb = next(e for e in dump if e.get("kind") == "class" and e.get("slug") == "barbarian")
    assert barb["id"] == BARBARIAN_LEGACY_ID


def test_seed_with_legacy_dump_resolves_parent_fk_and_keeps_ids():
    conn = LegacyAwareFakeConn()
    n_legacy = conn.seed_legacy_dump(deactivate_classes=True)
    assert n_legacy >= 700
    assert conn.by_id[BARBARIAN_LEGACY_ID]["is_active"] is False

    planned = load_wave_rows()
    planned_classes = {r["slug"] for r in planned if r["kind"] == "class"}
    planned_subs = {r["slug"] for r in planned if r["kind"] == "subclass"}
    assert "barbarian" in planned_classes
    assert "barbarian__berserker" in planned_subs

    stats1 = apply_edition_2024_catalog_seed(conn)  # type: ignore[arg-type]
    assert stats1.upserted == len(planned)

    barb = conn.by_id[BARBARIAN_LEGACY_ID]
    assert barb["slug"] == "barbarian"
    assert barb["is_active"] is True
    # Must NOT have been rewritten to UUID5.
    assert BARBARIAN_UUID5 not in conn.by_id or conn.by_id[BARBARIAN_UUID5]["slug"] != "barbarian"

    classes = _active_2024(conn, "class")
    subclasses = _active_2024(conn, "subclass")
    assert planned_classes.issubset({r["slug"] for r in classes})
    assert planned_subs.issubset({r["slug"] for r in subclasses})

    class_id_by_slug = {r["slug"]: r["id"] for r in classes}
    assert class_id_by_slug["barbarian"] == BARBARIAN_LEGACY_ID

    # Assert only live-wave subclasses (legacy dump used different slugs like
    # ``champion`` and may remain as inactive/active stubs — out of scope).
    live_subs = [r for r in subclasses if r["slug"] in planned_subs]
    assert len(live_subs) == len(planned_subs)
    for sub in live_subs:
        parent_id = sub.get("parent_id")
        assert parent_id, sub["slug"]
        assert parent_id in conn.by_id, sub["slug"]
        parent = conn.by_id[str(parent_id)]
        data = json.loads(sub["data"] or "{}")
        assert parent["slug"] == data.get("parent_class"), sub["slug"]
        assert parent["kind"] == "class"
        assert parent["edition"] == "2024"
        # Must not point at missing UUID5 when legacy parent exists.
        if data.get("parent_class") == "barbarian":
            assert parent_id == BARBARIAN_LEGACY_ID

    # 2014 marker untouched.
    marker = conn.by_id[MARKER_2014_ID]
    assert marker["edition"] == "2014"
    assert json.loads(marker["data"])["marker"] == "p24-legacy-regression"
    assert marker["is_active"] is True

    # Idempotent re-apply.
    before = {k: dict(v) for k, v in conn.by_id.items()}
    stats2 = apply_edition_2024_catalog_seed(conn)  # type: ignore[arg-type]
    assert stats2.upserted == len(planned)
    for key, row in conn.by_id.items():
        if row["edition"] != "2024":
            assert before[key] == row
    assert conn.by_id[BARBARIAN_LEGACY_ID]["id"] == BARBARIAN_LEGACY_ID
    berserker = next(r for r in subclasses if r["slug"] == "barbarian__berserker")
    # Re-fetch after second apply
    berserker = next(
        r
        for r in conn.by_id.values()
        if r["kind"] == "subclass" and r["slug"] == "barbarian__berserker"
    )
    assert berserker["parent_id"] == BARBARIAN_LEGACY_ID


def test_seed_without_legacy_still_links_uuid5_parents():
    """Clean CI path: no dump rows → planned UUID5 parents remain valid."""
    conn = LegacyAwareFakeConn()
    apply_edition_2024_catalog_seed(conn)  # type: ignore[arg-type]
    barb_id = entry_id(kind="class", slug="barbarian")
    assert barb_id in conn.by_id
    sub = next(
        r
        for r in conn.by_id.values()
        if r["kind"] == "subclass" and r["slug"] == "barbarian__berserker"
    )
    assert sub["parent_id"] == barb_id


def _postgres_url() -> str | None:
    raw = (
        os.environ.get("DATABASE_URL")
        or os.environ.get("TEST_DATABASE_URL")
        or "postgresql+psycopg://dvarf:dvarf@localhost:5432/dvarf_test"
    )
    return raw


def _postgres_available() -> bool:
    url = _postgres_url()
    if not url:
        return False
    try:
        engine = sa.create_engine(url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(sa.text("SELECT 1"))
        engine.dispose()
        return True
    except Exception:
        return False


@pytest.mark.skipif(not _postgres_available(), reason="Postgres not available")
def test_postgres_legacy_dump_seed_fk():
    """Real Postgres FK: legacy dump + full live seed must not raise."""
    url = _postgres_url()
    assert url
    engine = sa.create_engine(url, pool_pre_ping=True)
    with engine.begin() as conn:
        conn.execute(sa.text("DROP TABLE IF EXISTS catalog_entries CASCADE"))
        conn.execute(sa.text("DROP TYPE IF EXISTS catalog_kind CASCADE"))
        conn.execute(sa.text("DROP TYPE IF EXISTS catalog_rules_edition CASCADE"))
        conn.execute(
            sa.text(
                """
                CREATE TYPE catalog_kind AS ENUM (
                  'race','class','subclass','background','alignment','skill',
                  'feat','spell','weapon','armor','item','condition','bestiary','bastion'
                )
                """
            )
        )
        conn.execute(
            sa.text(
                "CREATE TYPE catalog_rules_edition AS ENUM ('2014','2024','both')"
            )
        )
        conn.execute(
            sa.text(
                """
                CREATE TABLE catalog_entries (
                  id uuid PRIMARY KEY,
                  kind catalog_kind NOT NULL,
                  slug varchar(80) NOT NULL,
                  name_ru varchar(160) NOT NULL,
                  name_en varchar(160),
                  rules_edition catalog_rules_edition NOT NULL,
                  parent_id uuid REFERENCES catalog_entries(id) ON DELETE SET NULL,
                  source varchar(80),
                  external_ref jsonb,
                  data jsonb NOT NULL DEFAULT '{}'::jsonb,
                  sort_order integer NOT NULL DEFAULT 0,
                  is_active boolean NOT NULL DEFAULT true,
                  UNIQUE (kind, slug, rules_edition)
                )
                """
            )
        )

        dump = json.loads(DUMP_PATH.read_text(encoding="utf-8"))
        # Insert parents before children (dump subclasses reference dump class ids).
        ordered = sorted(
            dump,
            key=lambda e: 0 if e.get("parent_id") in (None, "") else 1,
        )
        for item in ordered:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO catalog_entries (
                      id, kind, slug, name_ru, name_en, rules_edition,
                      parent_id, source, external_ref, data, sort_order, is_active
                    ) VALUES (
                      CAST(:id AS uuid),
                      CAST(:kind AS catalog_kind),
                      :slug, :name_ru, :name_en,
                      CAST(:edition AS catalog_rules_edition),
                      CAST(:parent_id AS uuid),
                      :source,
                      CAST(:external_ref AS jsonb),
                      CAST(:data AS jsonb),
                      :sort_order,
                      :is_active
                    )
                    """
                ),
                {
                    "id": str(item["id"]),
                    "kind": item["kind"],
                    "slug": str(item["slug"]).lower(),
                    "name_ru": item.get("name_ru") or item["slug"],
                    "name_en": item.get("name_en"),
                    "edition": item.get("rules_edition") or "2024",
                    "parent_id": item.get("parent_id"),
                    "source": item.get("source") or "srd-5.2",
                    "external_ref": json.dumps(item.get("external_ref"))
                    if item.get("external_ref") is not None
                    else None,
                    "data": json.dumps(item.get("data") or {}),
                    "sort_order": int(item.get("sort_order") or 0),
                    "is_active": bool(item.get("is_active", True)),
                },
            )
        # n3c4d5e6f7a8: deactivate 2024 class stubs
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET is_active = false
                WHERE kind = 'class' AND rules_edition = '2024' AND is_active = true
                """
            )
        )
        # 2014 marker
        conn.execute(
            sa.text(
                """
                INSERT INTO catalog_entries (
                  id, kind, slug, name_ru, name_en, rules_edition,
                  parent_id, source, data, sort_order, is_active
                ) VALUES (
                  CAST(:id AS uuid), 'class', 'fighter', 'Воин', 'Fighter', '2014',
                  NULL, 'phb', CAST(:data AS jsonb), 0, true
                )
                """
            ),
            {
                "id": MARKER_2014_ID,
                "data": json.dumps({"hit_die": 10, "marker": "p24-legacy-regression"}),
            },
        )

        apply_edition_2024_catalog_seed(conn)
        apply_edition_2024_catalog_seed(conn)  # idempotent

        barb = conn.execute(
            sa.text(
                """
                SELECT id::text, is_active
                FROM catalog_entries
                WHERE kind = 'class' AND slug = 'barbarian' AND rules_edition = '2024'
                """
            )
        ).first()
        assert barb is not None
        assert barb[0] == BARBARIAN_LEGACY_ID
        assert barb[1] is True

        orphans = conn.execute(
            sa.text(
                """
                SELECT c.slug
                FROM catalog_entries c
                WHERE c.rules_edition = '2024'
                  AND c.parent_id IS NOT NULL
                  AND NOT EXISTS (
                    SELECT 1 FROM catalog_entries p WHERE p.id = c.parent_id
                  )
                """
            )
        ).fetchall()
        assert orphans == []

        berserker = conn.execute(
            sa.text(
                """
                SELECT parent_id::text, is_active
                FROM catalog_entries
                WHERE kind = 'subclass'
                  AND slug = 'barbarian__berserker'
                  AND rules_edition = '2024'
                """
            )
        ).first()
        assert berserker is not None
        assert berserker[0] == BARBARIAN_LEGACY_ID
        assert berserker[1] is True

        # All planned live classes/subclasses active with resolvable parents.
        planned_subs = [r for r in load_wave_rows() if r["kind"] == "subclass"]
        for row in planned_subs:
            db_row = conn.execute(
                sa.text(
                    """
                    SELECT id::text, parent_id::text, is_active,
                           data->>'parent_class' AS parent_class
                    FROM catalog_entries
                    WHERE kind = 'subclass' AND slug = :slug AND rules_edition = '2024'
                    """
                ),
                {"slug": row["slug"]},
            ).first()
            assert db_row is not None, row["slug"]
            assert db_row[2] is True, row["slug"]
            assert db_row[1], row["slug"]
            parent = conn.execute(
                sa.text(
                    "SELECT slug FROM catalog_entries WHERE id = CAST(:id AS uuid)"
                ),
                {"id": db_row[1]},
            ).first()
            assert parent is not None, row["slug"]
            assert parent[0] == db_row[3] == row["data"]["parent_class"]

        marker = conn.execute(
            sa.text(
                """
                SELECT data->>'marker', rules_edition::text
                FROM catalog_entries WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": MARKER_2014_ID},
        ).first()
        assert marker[0] == "p24-legacy-regression"
        assert marker[1] == "2014"

    engine.dispose()


def test_alembic_single_head():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1, f"expected one alembic head, got {heads}"


def test_p24_chain_from_wapi08_present():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    script = ScriptDirectory.from_config(cfg)
    heads = script.get_heads()
    assert len(heads) == 1
    ancestor_ids = {
        rev.revision for rev in script.walk_revisions(base="base", head=heads[0])
    }
    required = {
        "wapi08partych01",
        "p2401lobbyed01",
        "p24c04class01",
        "p24c09phb01",
        "p24c15efa01",
        "p24c17frh01",
        "p24c20rtw01",
        "p24c21au01",
        "p24int01merge", "p24fixenum01", "p24n01r02", "p24n01r03", "i10sunf9a2c", "i10sunf9a2c",
    }
    missing = required - ancestor_ids
    assert not missing, missing
