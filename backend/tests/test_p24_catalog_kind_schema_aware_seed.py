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
4. **Deploy-shaped**: stamped ``wapi08`` + legacy dump → one
   ``command.upgrade(cfg, "head")`` (same as ``remote-release.sh`` / env.py),
   including the real ADM branch (schema materialized, not stamped).
5. Restart after a simulated failure past ``p24c12`` ``autocommit_block``.
6. Documents ``env.py`` transaction mode (no ``transaction_per_migration``).
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
            ON CONFLICT (kind, slug, rules_edition) DO NOTHING
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


# n0a1b2c3d4e5 updates these 2014 race rows; prod has them from earlier seeds.
_ELF_2014_RACES: tuple[tuple[str, str, str], ...] = (
    ("astral_elf", "Астральный эльф", "Astral Elf"),
    ("drow", "Дроу", "Drow"),
    ("high_elf", "Высший эльф", "High Elf"),
    ("half_elf_high", "Полуэльф (высший)", "Half-Elf (High)"),
)


def _materialize_wapi08_schema(conn: sa.Connection) -> None:
    """Prod-shaped schema at ``wapi08partych01`` for both P24 and ADM branches.

    A clean ``alembic upgrade wapi08partych01`` from empty fails on archived
    2014 class/race seeds that never landed in ``alembic/versions``. Prod
    already has that history. We materialize the pre-branchpoint tables the
    wapi08→head migrations touch — ``catalog_kind`` **without** ``bastion`` —
    then stamp ``wapi08partych01`` and let real migrations (including ADM)
    create their own tables/columns.
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
    # dice02b01widenroll alters these when present (idempotent no-op if absent).
    conn.execute(
        sa.text(
            """
            CREATE TABLE session_events (
              id uuid PRIMARY KEY,
              formula varchar(120),
              breakdown varchar(200)
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
    for i, (slug, name_ru, name_en) in enumerate(_ELF_2014_RACES):
        conn.execute(
            sa.text(
                """
                INSERT INTO catalog_entries (
                  id, kind, slug, name_ru, name_en, rules_edition,
                  parent_id, source, data, sort_order, is_active
                ) VALUES (
                  CAST(:id AS uuid), 'race', :slug, :name_ru, :name_en, '2014',
                  NULL, 'phb', CAST(:data AS jsonb), :sort_order, true
                )
                """
            ),
            {
                "id": f"bbbbbbbb-bbbb-4bbb-8bbb-{i:012d}",
                "slug": slug,
                "name_ru": name_ru,
                "name_en": name_en,
                "data": json.dumps({"bootstrap": "wapi08-fixture"}),
                "sort_order": 100 + i,
            },
        )
    conn.execute(sa.text("CREATE TABLE alembic_version (version_num varchar(32) NOT NULL)"))
    conn.execute(
        sa.text("INSERT INTO alembic_version (version_num) VALUES ('wapi08partych01')")
    )


def _reset_public_schema(url: str) -> None:
    engine = sa.create_engine(url, pool_pre_ping=True)
    with engine.begin() as conn:
        conn.execute(sa.text("DROP SCHEMA public CASCADE"))
        conn.execute(sa.text("CREATE SCHEMA public"))
        conn.execute(sa.text("GRANT ALL ON SCHEMA public TO dvarf"))
        conn.execute(sa.text("GRANT ALL ON SCHEMA public TO public"))
    engine.dispose()


def _prepare_wapi08_with_legacy_dump(url: str) -> None:
    engine = sa.create_engine(url, pool_pre_ping=True)
    with engine.begin() as conn:
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


def _alembic_config(url: str):
    from alembic.config import Config

    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


def _patch_database_url(monkeypatch: pytest.MonkeyPatch, url: str) -> None:
    """env.py reads ``settings.database_url`` — same path as remote-release."""
    monkeypatch.setenv("DATABASE_URL", url)
    from app.core import config as app_config

    monkeypatch.setattr(app_config.settings, "database_url", url, raising=False)


def _assert_head_prod_invariants(conn: sa.Connection) -> None:
    assert sorted(
        r[0] for r in conn.execute(sa.text("SELECT version_num FROM alembic_version"))
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

    # ADM branch actually applied (not stamped).
    tables = set(sa.inspect(conn).get_table_names())
    for required in (
        "admin_roles",
        "admin_secrets",
        "admin_audit_log",
        "product_events",
        "feedback_messages",
        "catalog_name_revisions",
    ):
        assert required in tables, required

    # admqf source column
    admin_cols = {c["name"] for c in sa.inspect(conn).get_columns("admin_roles")}
    assert "source" in admin_cols

    # dice02b widened columns
    se_cols = {c["name"]: c for c in sa.inspect(conn).get_columns("session_events")}
    assert getattr(se_cols["formula"]["type"], "length", None) == 200
    assert getattr(se_cols["breakdown"]["type"], "length", None) == 500

    # n0a1 patched elf races
    for slug in ("astral_elf", "drow", "high_elf", "half_elf_high"):
        row = conn.execute(
            sa.text(
                """
                SELECT data FROM catalog_entries
                WHERE kind = 'race' AND slug = :slug AND rules_edition = '2014'
                """
            ),
            {"slug": slug},
        ).first()
        assert row is not None, slug
        data = row[0] if isinstance(row[0], dict) else json.loads(row[0])
        assert data.get("bootstrap") == "wapi08-fixture"
        # Patched keys from n0a1 (at least one of the patch set).
        assert any(
            k in data
            for k in (
                "trait_cards",
                "spell_choices",
                "racial_spells",
                "racial_resources",
                "traits_text",
            )
        ), (slug, sorted(data))

    lobby_cols = {c["name"] for c in sa.inspect(conn).get_columns("lobbies")}
    assert "rules_edition" in lobby_cols

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


def test_env_py_single_transaction_no_transaction_per_migration():
    """Prod env.py wraps ``run_migrations`` in one ``begin_transaction``.

    There is no ``transaction_per_migration=True``. Therefore
    ``p24c12bast01``'s ``autocommit_block`` COMMIT's everything applied so far
    (including prior ``alembic_version`` rows), runs ``ADD VALUE`` outside a
    txn, then opens a new txn for the post-ADD seed and later revisions.
    """
    env_text = (BACKEND / "alembic" / "env.py").read_text(encoding="utf-8")
    assert "transaction_per_migration" not in env_text
    assert "begin_transaction()" in env_text
    c12 = (VERSIONS / "p24c12bast01_seed_bastions_dmg24.py").read_text(encoding="utf-8")
    assert "autocommit_block" in c12
    assert "ADD VALUE 'bastion'" in c12
    # Seed must run AFTER the autocommit ADD VALUE block.
    assert c12.index("autocommit_block") < c12.index(
        "apply_edition_2024_catalog_seed(op.get_bind())"
    )


def test_wapi08_to_head_data_risk_audit_static():
    """Static audit of wapi08→head migrations for prod data-dependent risks."""
    script = _script_directory()
    rev_ids = {
        r.revision
        for r in script.walk_revisions(base="wapi08partych01", head="p24fixenum01")
        if r.revision != "wapi08partych01"
    }
    findings: dict[str, list[str]] = {}
    for path in VERSIONS.glob("*.py"):
        text = path.read_text(encoding="utf-8")
        m = re.search(r'^revision:\s*str\s*=\s*["\']([^"\']+)["\']', text, re.M)
        if not m or m.group(1) not in rev_ids:
            continue
        rid = m.group(1)
        notes: list[str] = []
        if "ADD VALUE" in text:
            notes.append("ALTER TYPE ADD VALUE (needs autocommit / committed before use)")
        if "apply_edition_2024_catalog_seed" in text:
            notes.append("calls live 2024 seed (schema-aware)")
        if re.search(r"nullable\s*=\s*False", text) and "add_column" in text:
            if "server_default" in text or "server_default" in text.replace(" ", ""):
                notes.append("add_column NOT NULL with server_default (ok for existing rows)")
            elif rid == "p2401lobbyed01":
                notes.append("lobbies.rules_edition NOT NULL + server_default=2014")
            else:
                # New tables only — no backfill of existing rows.
                if "create_table" in text:
                    notes.append("NOT NULL on new table columns only")
                else:
                    notes.append("CHECK: NOT NULL add_column without obvious default")
        if "unique=True" in text or "create_unique_constraint" in text:
            notes.append("unique index/constraint (empty or new table / partial pending)")
        if rid == "n0a1b2c3d4e5":
            notes.append("requires existing 2014 race rows (astral_elf/drow/high_elf/half_elf_high)")
        if rid == "dice02b01widenroll":
            notes.append("widens session_events.formula/breakdown if table exists")
        if notes:
            findings[rid] = notes

    # Must notice the known bastion ADD VALUE + seed coupling.
    assert "p24c12bast01" in findings
    assert any("ADD VALUE" in n for n in findings["p24c12bast01"])
    assert "n0a1b2c3d4e5" in findings
    # No mystery NOT NULL-without-default on existing-row ALTER in this slice.
    for rid, notes in findings.items():
        for n in notes:
            assert "CHECK: NOT NULL" not in n, (rid, notes)


@pytest.mark.skipif(not _postgres_available(), reason="Postgres not available")
def test_single_upgrade_head_from_wapi08_like_deploy(monkeypatch, capfd):
    """One ``alembic upgrade head`` from wapi08 + legacy dump — mirrors deploy.

    Uses the same ``env.py`` path as ``deploy/remote-release.sh``
    (``settings.database_url`` → one outer ``begin_transaction``, no
    ``transaction_per_migration``). Captures alembic stderr because
    ``fileConfig`` in env.py resets logger handlers.
    """
    from alembic import command

    url = _postgres_url()
    _patch_database_url(monkeypatch, url)
    _reset_public_schema(url)
    _prepare_wapi08_with_legacy_dump(url)
    cfg = _alembic_config(url)

    capfd.readouterr()  # clear pytest/fixture noise
    command.upgrade(cfg, "head")
    captured = capfd.readouterr()
    log_text = captured.err or captured.out

    log_path = Path("/tmp/p24_single_upgrade_head_wapi08.log")
    log_path.write_text(log_text, encoding="utf-8")
    artifact = Path("/opt/cursor/artifacts/p24_single_upgrade_head_wapi08.log")
    try:
        artifact.parent.mkdir(parents=True, exist_ok=True)
        artifact.write_text(log_text, encoding="utf-8")
    except OSError:
        pass

    # Both branches must appear in the single upgrade head run.
    assert "p2401lobbyed01" in log_text, log_text[:500]
    assert "adm01framework01" in log_text
    assert "p24c12bast01" in log_text
    assert "n0a1b2c3d4e5" in log_text
    assert "p24int01merge" in log_text
    assert "p24fixenum01" in log_text
    # Schema-aware seed skipped bastions before C12; full after.
    assert "skipped_unsupported_kind=43" in log_text
    assert "skipped_unsupported_kind=0" in log_text
    # No unsafe-enum symptom under one upgrade head + autocommit_block.
    assert "unsafe use of new value" not in log_text.lower()

    engine = sa.create_engine(url, pool_pre_ping=True)
    with engine.begin() as conn:
        _assert_head_prod_invariants(conn)
    engine.dispose()

    # Idempotent second upgrade head (deploy retry with nothing pending).
    command.upgrade(cfg, "head")
    engine = sa.create_engine(url, pool_pre_ping=True)
    with engine.begin() as conn:
        _assert_head_prod_invariants(conn)
    engine.dispose()


@pytest.mark.skipif(not _postgres_available(), reason="Postgres not available")
def test_upgrade_head_restarts_after_fail_past_bastion_autocommit(monkeypatch):
    """If seed fails after ``ADD VALUE`` autocommit, redeploy ``upgrade head`` recovers.

    ``autocommit_block`` commits prior revisions + the new enum label. A failure
    inside the post-ADD seed rolls back only the new txn (p24c12 not stamped).
    Restart re-enters ``p24c12``: ADD VALUE is idempotent, seed reapplies.
    """
    import app.services.edition_2024_catalog_seed as seed_mod
    from alembic import command

    url = _postgres_url()
    _patch_database_url(monkeypatch, url)
    _reset_public_schema(url)
    _prepare_wapi08_with_legacy_dump(url)
    cfg = _alembic_config(url)

    real_seed = seed_mod.apply_edition_2024_catalog_seed
    fail_budget = {"left": 1}

    def flaky_seed(conn: sa.Connection):
        kinds = seed_mod.available_catalog_kinds(conn)
        if kinds is not None and "bastion" in kinds and fail_budget["left"] > 0:
            fail_budget["left"] -= 1
            raise RuntimeError(
                "simulated failure after bastion enum committed (post-autocommit seed)"
            )
        return real_seed(conn)

    monkeypatch.setattr(seed_mod, "apply_edition_2024_catalog_seed", flaky_seed)

    with pytest.raises(RuntimeError, match="simulated failure after bastion"):
        command.upgrade(cfg, "head")

    engine = sa.create_engine(url, pool_pre_ping=True)
    with engine.connect() as conn:
        kinds = available_catalog_kinds(conn) or frozenset()
        assert "bastion" in kinds  # ADD VALUE survived the rollback
        versions = sorted(
            r[0]
            for r in conn.execute(sa.text("SELECT version_num FROM alembic_version"))
        )
        assert "p24fixenum01" not in versions
        assert "p24c12bast01" not in versions
        # Pre-autocommit work stayed committed (at least one P24 rev before C12).
        assert any(v.startswith("p24") for v in versions) or any(
            v.startswith("adm") for v in versions
        )
    engine.dispose()

    # Deploy retry: same flaky wrapper now has budget 0 → full seed succeeds.
    command.upgrade(cfg, "head")
    engine = sa.create_engine(url, pool_pre_ping=True)
    with engine.begin() as conn:
        _assert_head_prod_invariants(conn)
    engine.dispose()


@pytest.mark.skipif(not _postgres_available(), reason="Postgres not available")
def test_stepwise_p24_path_still_covers_pre_bastion_seed(monkeypatch):
    """Keep a per-revision P24 walk for the pre-bastion seed window (p2401→c12)."""
    from alembic import command

    url = _postgres_url()
    _patch_database_url(monkeypatch, url)
    _reset_public_schema(url)
    _prepare_wapi08_with_legacy_dump(url)
    cfg = _alembic_config(url)

    p24_path = _revision_path("p24c12bast01", "wapi08partych01")
    assert p24_path[0] == "p2401lobbyed01"
    step_log: list[str] = []
    for rev in p24_path:
        command.upgrade(cfg, rev)
        engine = sa.create_engine(url, pool_pre_ping=True)
        with engine.connect() as conn:
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
        step_log.append(
            f"ok {rev}; bastion_in_enum={'bastion' in kinds}; bastion_rows={bastion_rows}"
        )
        if rev == "p2401lobbyed01":
            assert "bastion" not in kinds and bastion_rows == 0
        if rev == "p24c12bast01":
            assert "bastion" in kinds and bastion_rows == BASTION_TOTAL

    Path("/tmp/p24_stepwise_upgrade_wapi08_to_head.log").write_text(
        "\n".join(step_log) + "\n", encoding="utf-8"
    )
    assert step_log[0].startswith("ok p2401lobbyed01")
