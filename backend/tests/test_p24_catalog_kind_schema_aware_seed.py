"""Regression: Deploy #91 — seed must respect catalog_kind at each migration step.

Deploy #91 (``f12c7876``) failed on ``wapi08partych01 -> p2401lobbyed01``:

    invalid input value for enum catalog_kind: "bastion"

``bastion`` is added only in ``p24c12bast01`` (after C17), while every earlier
P24 migration already calls ``apply_edition_2024_catalog_seed``, whose live
waves include ``bastions_dmg24.json``.

This suite:

1. Asserts the only enum gap in the wapi08→head chain is ``bastion``.
2. Checks seed kinds ⊆ ``pg_enum`` at every seed-calling revision (static).
3. On real Postgres: seed without ``bastion`` skips those rows; after ADD VALUE
   the full seed inserts them.
4. On real Postgres (opt-in / when reachable): stepwise ``alembic upgrade +1``
   from ``wapi08partych01`` with legacy ``catalog.json`` dump to head.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

import pytest
import sqlalchemy as sa

from app.services.edition_2024_catalog_seed import (
    apply_edition_2024_catalog_seed,
    available_catalog_kinds,
    load_wave_rows,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND = REPO_ROOT / "backend"
VERSIONS = BACKEND / "alembic" / "versions"
DUMP_PATH = BACKEND / "data" / "srd" / "2024" / "catalog.json"

# Enum labels present at / immediately after ``wapi08partych01``
# (``bestiary`` added in ``f6a7b8c9d0e1``, before the P24 branchpoint).
KINDS_AT_WAPI08: frozenset[str] = frozenset(
    {
        "race",
        "class",
        "subclass",
        "background",
        "alignment",
        "skill",
        "feat",
        "spell",
        "weapon",
        "armor",
        "item",
        "condition",
        "bestiary",
    }
)

# revision_id → enum values added in that migration's upgrade (before its seed).
ENUM_ADDITIONS: dict[str, frozenset[str]] = {
    "p24c12bast01": frozenset({"bastion"}),
}

BASTION_TOTAL = 43  # 1 rules + 7 orders + 6 basic + 29 special
MARKER_2014_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
BARBARIAN_LEGACY_ID = "cf870cb5-f412-5718-80c2-a6fd8c82b45e"


def _postgres_url() -> str:
    return (
        os.environ.get("P24_MIGRATE_DATABASE_URL")
        or os.environ.get("TEST_DATABASE_URL")
        or os.environ.get("DATABASE_URL")
        or "postgresql+psycopg://dvarf:dvarf@127.0.0.1:5432/dvarf_mig"
    )


def _postgres_available(url: str | None = None) -> bool:
    target = url or _postgres_url()
    try:
        engine = sa.create_engine(target, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(sa.text("SELECT 1"))
        engine.dispose()
        return True
    except Exception:
        return False


def _script_directory():
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    return ScriptDirectory.from_config(cfg)


def _seed_calling_revisions() -> dict[str, Path]:
    """Map revision id → migration file for every file that calls the 2024 seed."""
    out: dict[str, Path] = {}
    needle = "apply_edition_2024_catalog_seed"
    for path in VERSIONS.glob("*.py"):
        text = path.read_text(encoding="utf-8")
        if needle not in text:
            continue
        m = re.search(r'^revision:\s*str\s*=\s*["\']([^"\']+)["\']', text, re.M)
        assert m, path.name
        out[m.group(1)] = path
    return out


def test_bastion_added_only_in_p24c12():
    hits: list[str] = []
    for path in VERSIONS.glob("*.py"):
        text = path.read_text(encoding="utf-8")
        if re.search(r"ADD VALUE\s+'bastion'", text):
            hits.append(path.name)
    assert hits == ["p24c12bast01_seed_bastions_dmg24.py"]


def test_live_waves_include_bastion_before_enum_migration():
    kinds = {r["kind"] for r in load_wave_rows()}
    assert "bastion" in kinds
    assert kinds - KINDS_AT_WAPI08 == {"bastion"}


def test_only_enum_incompatibility_wapi08_to_head_is_bastion():
    """Every seed-calling rev before p24c12 would fail without schema-aware filter."""
    script = _script_directory()
    heads = script.get_heads()
    assert heads == ["p24fixenum01"]

    seed_revs = _seed_calling_revisions()
    assert "p2401lobbyed01" in seed_revs
    assert "p24c12bast01" in seed_revs
    assert "p24fixenum01" in seed_revs

    # Topological ancestors of head, oldest first.
    ordered = list(
        reversed(list(script.walk_revisions(base="wapi08partych01", head=heads[0])))
    )
    # walk_revisions(..., base=wapi08) includes wapi08 as the last when reversed
    # starting point — drop it; we care about upgrades *after* wapi08.
    after_wapi = [r for r in ordered if r.revision != "wapi08partych01"]

    available = set(KINDS_AT_WAPI08)
    planned_kinds = {r["kind"] for r in load_wave_rows()}
    incompatibilities: list[tuple[str, frozenset[str]]] = []

    for rev in after_wapi:
        rid = rev.revision
        # Enum additions in this revision become visible before its seed call
        # (p24c12 uses autocommit_block around ADD VALUE, then seeds).
        available |= set(ENUM_ADDITIONS.get(rid, ()))
        if rid in seed_revs:
            missing = frozenset(planned_kinds - available)
            if missing:
                incompatibilities.append((rid, missing))

    assert incompatibilities, "expected pre-bastion seed revisions to be incompatible"
    for rid, missing in incompatibilities:
        assert missing == frozenset({"bastion"}), (rid, missing)
        assert rid != "p24c12bast01"
        assert rid != "p24fixenum01"

    # After C12 and at final reseed, seed is fully compatible.
    assert available >= planned_kinds


def test_p24c12_adds_bastion_before_seed_in_source():
    text = (VERSIONS / "p24c12bast01_seed_bastions_dmg24.py").read_text(encoding="utf-8")
    add_pos = text.index("ADD VALUE 'bastion'")
    seed_pos = text.index("apply_edition_2024_catalog_seed(op.get_bind())")
    assert "autocommit_block" in text
    assert add_pos < seed_pos


def test_final_head_migration_reseeds():
    text = (VERSIONS / "p24fixenum01_reseed_after_catalog_kind.py").read_text(
        encoding="utf-8"
    )
    assert "apply_edition_2024_catalog_seed" in text
    assert "down_revision" in text and "p24int01merge" in text
    assert 'revision: str = "p24fixenum01"' in text


def test_alembic_single_head_is_p24fixenum01():
    script = _script_directory()
    assert script.get_heads() == ["p24fixenum01"]


@pytest.mark.skipif(not _postgres_available(), reason="Postgres not available")
def test_postgres_seed_skips_bastion_until_enum_exists():
    """Mirrors pre-p24c12 schema: enum without bastion must not raise."""
    url = _postgres_url()
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
                  'feat','spell','weapon','armor','item','condition','bestiary'
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

        kinds = available_catalog_kinds(conn)
        assert kinds is not None
        assert "bastion" not in kinds
        assert "bestiary" in kinds

        planned = load_wave_rows()
        bastion_n = sum(1 for r in planned if r["kind"] == "bastion")
        assert bastion_n == BASTION_TOTAL

        stats = apply_edition_2024_catalog_seed(conn)
        assert stats.skipped_unsupported_kind == bastion_n
        assert stats.upserted == len(planned) - bastion_n

        bastion_rows = conn.execute(
            sa.text(
                "SELECT count(*) FROM catalog_entries WHERE kind::text = 'bastion'"
            )
        ).scalar()
        assert bastion_rows == 0

    # p24c12 pattern: ADD VALUE must commit before the new label is usable.
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(sa.text("ALTER TYPE catalog_kind ADD VALUE IF NOT EXISTS 'bastion'"))

    with engine.begin() as conn:
        kinds2 = available_catalog_kinds(conn)
        assert kinds2 is not None and "bastion" in kinds2
        stats2 = apply_edition_2024_catalog_seed(conn)
        assert stats2.skipped_unsupported_kind == 0
        assert stats2.upserted == len(planned)
        bastion_rows = conn.execute(
            sa.text("SELECT count(*) FROM catalog_entries WHERE kind = 'bastion'")
        ).scalar()
        assert bastion_rows == BASTION_TOTAL
        # Idempotent
        stats3 = apply_edition_2024_catalog_seed(conn)
        assert stats3.upserted == len(planned)
        assert stats3.skipped_unsupported_kind == 0

    engine.dispose()


def _inject_legacy_dump(conn: sa.Connection) -> None:
    dump = json.loads(DUMP_PATH.read_text(encoding="utf-8"))
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
                ON CONFLICT (kind, slug, rules_edition) DO NOTHING
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
    # n3c4d5e6f7a8-style: deactivate 2024 class stubs (prod shape).
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE kind = 'class' AND rules_edition = '2024' AND is_active = true
            """
        )
    )
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
            ON CONFLICT DO NOTHING
            """
        ),
        {
            "id": MARKER_2014_ID,
            "data": json.dumps({"hit_die": 10, "marker": "p24-bastion-enum-regression"}),
        },
    )


def _revision_path(upper: str, lower: str) -> list[str]:
    """Revisions from lower (exclusive) up to upper (inclusive), oldest first."""
    script = _script_directory()
    revs = [r.revision for r in script.iterate_revisions(upper, lower)]
    revs.reverse()
    return [r for r in revs if r != lower]


def _materialize_wapi08_schema(conn: sa.Connection) -> None:
    """Prod-shaped schema at ``wapi08partych01`` for the P24 seed chain.

    A clean ``alembic upgrade wapi08partych01`` from empty fails on archived
    2014 class/race seeds that never landed in ``alembic/versions`` (gloom
    stalker FK, aasimar race, …). Prod already passed those historically.
    We materialize the catalog + lobby shape at the branchpoint — enum
    **without** ``bastion`` — then stamp and run the real P24 migrations.
    """
    conn.execute(sa.text("CREATE TYPE rules_edition AS ENUM ('2014', '2024')"))
    conn.execute(
        sa.text(
            """
            CREATE TYPE catalog_kind AS ENUM (
              'race','class','subclass','background','alignment','skill',
              'feat','spell','weapon','armor','item','condition','bestiary'
            )
            """
        )
    )
    conn.execute(
        sa.text("CREATE TYPE catalog_rules_edition AS ENUM ('2014','2024','both')")
    )
    conn.execute(
        sa.text(
            """
            CREATE TABLE users (
              id uuid PRIMARY KEY,
              email varchar(320) NOT NULL
            )
            """
        )
    )
    conn.execute(
        sa.text(
            """
            CREATE TABLE lobbies (
              id uuid PRIMARY KEY,
              name varchar(200) NOT NULL DEFAULT 'test'
              -- rules_edition added by p2401lobbyed01
            )
            """
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
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now(),
              UNIQUE (kind, slug, rules_edition)
            )
            """
        )
    )
    conn.execute(sa.text("CREATE TABLE alembic_version (version_num varchar(32) NOT NULL)"))
    conn.execute(
        sa.text("INSERT INTO alembic_version (version_num) VALUES ('wapi08partych01')")
    )


@pytest.mark.skipif(not _postgres_available(), reason="Postgres not available")
def test_stepwise_alembic_upgrade_wapi08_to_head_with_legacy_dump(monkeypatch):
    """Stepwise real alembic upgrades from stamped wapi08 + legacy dump to head."""
    from alembic import command
    from alembic.config import Config

    url = _postgres_url()
    monkeypatch.setenv("DATABASE_URL", url)
    from app.core import config as app_config

    monkeypatch.setattr(app_config.settings, "database_url", url, raising=False)

    engine = sa.create_engine(url, pool_pre_ping=True)
    with engine.begin() as conn:
        conn.execute(sa.text("DROP SCHEMA public CASCADE"))
        conn.execute(sa.text("CREATE SCHEMA public"))
        conn.execute(sa.text("GRANT ALL ON SCHEMA public TO dvarf"))
        conn.execute(sa.text("GRANT ALL ON SCHEMA public TO public"))
        _materialize_wapi08_schema(conn)
        kinds = available_catalog_kinds(conn)
        assert kinds is not None and "bastion" not in kinds and "bestiary" in kinds
        _inject_legacy_dump(conn)
        barb = conn.execute(
            sa.text(
                """
                SELECT id::text, is_active FROM catalog_entries
                WHERE kind = 'class' AND slug = 'barbarian' AND rules_edition = '2024'
                """
            )
        ).first()
        assert barb is not None
        assert barb[0] == BARBARIAN_LEGACY_ID
        assert barb[1] is False
    engine.dispose()

    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)

    # P24 seed chain (Deploy #91 died on the first step). Skip ADM data migrations
    # that need the full pre-wapi08 history; fake the ADM tip so the empty merge
    # + final reseed still run as on prod ``upgrade head``.
    p24_path = _revision_path("p24m03pr01", "wapi08partych01")
    assert p24_path[0] == "p2401lobbyed01", p24_path[:3]
    assert "p24c12bast01" in p24_path

    step_log: list[str] = []
    for rev in p24_path:
        command.upgrade(cfg, rev)
        engine = sa.create_engine(url, pool_pre_ping=True)
        with engine.connect() as conn:
            versions = sorted(
                r[0]
                for r in conn.execute(
                    sa.text("SELECT version_num FROM alembic_version")
                ).fetchall()
            )
            kinds = available_catalog_kinds(conn) or frozenset()
            bastion_rows = conn.execute(
                sa.text(
                    """
                    SELECT count(*) FROM catalog_entries
                    WHERE rules_edition = '2024' AND kind::text = 'bastion'
                    """
                )
            ).scalar()
        engine.dispose()
        line = (
            f"ok {rev}; versions={versions}; "
            f"bastion_in_enum={'bastion' in kinds}; bastion_rows={bastion_rows}"
        )
        step_log.append(line)
        if rev == "p2401lobbyed01":
            assert "bastion" not in kinds
            assert bastion_rows == 0
        if rev == "p24c12bast01":
            assert "bastion" in kinds
            assert bastion_rows == BASTION_TOTAL

    # Simulate completed ADM branch tip (merge is a no-op join).
    engine = sa.create_engine(url, pool_pre_ping=True)
    with engine.begin() as conn:
        conn.execute(
            sa.text(
                "INSERT INTO alembic_version (version_num) VALUES ('n0a1b2c3d4e5')"
            )
        )
    engine.dispose()

    for rev in ("p24int01merge", "p24fixenum01"):
        command.upgrade(cfg, rev)
        engine = sa.create_engine(url, pool_pre_ping=True)
        with engine.connect() as conn:
            versions = sorted(
                r[0]
                for r in conn.execute(
                    sa.text("SELECT version_num FROM alembic_version")
                ).fetchall()
            )
            bastion_rows = conn.execute(
                sa.text(
                    """
                    SELECT count(*) FROM catalog_entries
                    WHERE rules_edition = '2024' AND kind::text = 'bastion'
                    """
                )
            ).scalar()
        engine.dispose()
        step_log.append(f"ok {rev}; versions={versions}; bastion_rows={bastion_rows}")
        assert bastion_rows == BASTION_TOTAL

    log_path = Path("/tmp/p24_stepwise_upgrade_wapi08_to_head.log")
    log_path.write_text("\n".join(step_log) + "\n", encoding="utf-8")

    engine = sa.create_engine(url, pool_pre_ping=True)
    with engine.begin() as conn:
        assert sorted(
            r[0]
            for r in conn.execute(sa.text("SELECT version_num FROM alembic_version"))
        ) == ["p24fixenum01"]

        bastions = conn.execute(
            sa.text(
                """
                SELECT count(*) FROM catalog_entries
                WHERE rules_edition = '2024' AND kind = 'bastion' AND is_active
                """
            )
        ).scalar()
        assert bastions == BASTION_TOTAL

        orphans = conn.execute(
            sa.text(
                """
                SELECT c.slug FROM catalog_entries c
                WHERE c.rules_edition = '2024'
                  AND c.parent_id IS NOT NULL
                  AND NOT EXISTS (
                    SELECT 1 FROM catalog_entries p WHERE p.id = c.parent_id
                  )
                """
            )
        ).fetchall()
        assert orphans == []

        barb = conn.execute(
            sa.text(
                """
                SELECT id::text, is_active FROM catalog_entries
                WHERE kind = 'class' AND slug = 'barbarian' AND rules_edition = '2024'
                """
            )
        ).first()
        assert barb is not None
        assert barb[0] == BARBARIAN_LEGACY_ID
        assert barb[1] is True

        berserker = conn.execute(
            sa.text(
                """
                SELECT parent_id::text FROM catalog_entries
                WHERE kind = 'subclass' AND slug = 'barbarian__berserker'
                  AND rules_edition = '2024'
                """
            )
        ).first()
        assert berserker is not None
        assert berserker[0] == BARBARIAN_LEGACY_ID

        marker = conn.execute(
            sa.text(
                """
                SELECT data->>'marker', rules_edition::text
                FROM catalog_entries WHERE id = CAST(:id AS uuid)
                """
            ),
            {"id": MARKER_2014_ID},
        ).first()
        assert marker[0] == "p24-bastion-enum-regression"
        assert marker[1] == "2014"

        planned_kinds = {r["kind"] for r in load_wave_rows()}
        for kind in planned_kinds:
            n = conn.execute(
                sa.text(
                    """
                    SELECT count(*) FROM catalog_entries
                    WHERE rules_edition = '2024' AND kind::text = :kind AND is_active
                    """
                ),
                {"kind": kind},
            ).scalar()
            assert n and n > 0, kind

        # lobbies.rules_edition from p2401 present
        cols = {
            c["name"]
            for c in sa.inspect(conn).get_columns("lobbies")
        }
        assert "rules_edition" in cols

    engine.dispose()
    assert step_log[0].startswith("ok p2401lobbyed01"), step_log[0]
