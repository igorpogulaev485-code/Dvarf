"""P24-01: idempotent live seed skeleton for D&D 2024 catalog.

Waves live under ``backend/data/srd/2024/live/``. The raw dump
``backend/data/srd/2024/catalog.json`` is **not** a live source — do not activate
its empty class/species/background stubs, Culture, or Engineering.

Schema contract for later packs (P24-00 lists → data packs):
- weapon: ``mastery`` is a top-level ``data`` field (not a ``properties`` entry)
- background: ``data.asi`` and ``data.origin_feat`` (may be empty placeholders)
- feat: ``data.category`` (may be empty)
- ``source`` ``srd-5.2`` / ``srd-5.2.1`` stamps ``content_layer=srd``
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence

import sqlalchemy as sa

from app.dnd.content_layer import stamp_data_layer

logger = logging.getLogger(__name__)
_migration_logger = logging.getLogger("alembic.runtime.migration")

CATALOG_NAMESPACE = uuid.NAMESPACE_URL
LIVE_EDITION = "2024"

# Playtest / stub kinds that must never become active via this seed.
BLOCKED_SLUGS = frozenset({"culture", "engineering"})
STUB_KINDS = frozenset({"race", "class", "background", "subclass"})


@dataclass(frozen=True)
class WaveSpec:
    filename: str


# Empty until P24-00 reference lists land and later packs ship JSON waves.
EDITION_2024_CATALOG_WAVES: tuple[WaveSpec, ...] = ()


def _data_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "srd" / "2024" / "live"


def _raw_dump_path() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "srd" / "2024" / "catalog.json"


def entry_id(*, kind: str, slug: str, edition: str = LIVE_EDITION) -> str:
    return str(uuid.uuid5(CATALOG_NAMESPACE, f"dvarf:catalog:{edition}:{kind}:{slug}"))


def normalize_source(source: str | None) -> str:
    raw = (source or "").strip()
    if raw in {"srd-5.2", "srd-5.2.1", "srd52", "srd_5_2"}:
        return "srd-5.2"
    return raw or "srd-5.2"


def normalize_weapon_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    """Keep weapon mastery as its own field, never as a property token."""
    out = dict(data) if isinstance(data, dict) else {}
    props = out.get("properties")
    mastery_from_props: str | None = None
    if isinstance(props, list):
        kept: list[Any] = []
        for item in props:
            token = str(item).strip().lower() if item is not None else ""
            if token in {"mastery", "weapon_mastery"} or token.startswith("mastery:"):
                if token.startswith("mastery:"):
                    mastery_from_props = token.split(":", 1)[1].strip() or None
                elif isinstance(item, dict) and item.get("mastery"):
                    mastery_from_props = str(item.get("mastery"))
                continue
            if isinstance(item, dict) and str(item.get("key") or "").lower() == "mastery":
                mastery_from_props = str(item.get("value") or item.get("slug") or "") or None
                continue
            kept.append(item)
        out["properties"] = kept
    if "mastery" not in out or out.get("mastery") in (None, ""):
        if mastery_from_props:
            out["mastery"] = mastery_from_props
        else:
            out.setdefault("mastery", None)
    return out


def normalize_background_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    out = dict(data) if isinstance(data, dict) else {}
    out.setdefault("asi", None)
    out.setdefault("origin_feat", None)
    return out


def normalize_feat_data(data: Mapping[str, Any] | None) -> dict[str, Any]:
    out = dict(data) if isinstance(data, dict) else {}
    out.setdefault("category", None)
    return out


def normalize_entry_payload(item: Mapping[str, Any]) -> dict[str, Any] | None:
    """Return a live-ready row or None if the row must stay out of the active catalog."""
    kind = str(item.get("kind") or "").strip()
    slug = str(item.get("slug") or "").strip().lower()
    if not kind or not slug:
        return None
    if slug in BLOCKED_SLUGS:
        return None

    data_raw = item.get("data") if isinstance(item.get("data"), dict) else {}
    if kind == "weapon":
        data = normalize_weapon_data(data_raw)
    elif kind == "background":
        data = normalize_background_data(data_raw)
    elif kind == "feat":
        data = normalize_feat_data(data_raw)
    else:
        data = dict(data_raw)

    # Empty stub cards from the raw dump must not go live.
    if kind in STUB_KINDS and _is_empty_stub(data):
        return None

    source = normalize_source(item.get("source"))
    data = stamp_data_layer(data, source=source, kind=kind, slug=slug)
    # Prefer legal tag ``srd`` even when source stays srd-5.2 for provenance.
    if source.startswith("srd"):
        data["content_layer"] = "srd"

    row_id = item.get("id") or entry_id(kind=kind, slug=slug)
    return {
        "id": str(row_id),
        "kind": kind,
        "slug": slug,
        "name_ru": str(item.get("name_ru") or slug),
        "name_en": item.get("name_en"),
        "rules_edition": LIVE_EDITION,
        "parent_id": item.get("parent_id"),
        "source": source,
        "external_ref": item.get("external_ref"),
        "data": data,
        "sort_order": int(item.get("sort_order") or 0),
        "is_active": bool(item.get("is_active", True)),
    }


def _is_empty_stub(data: Mapping[str, Any]) -> bool:
    if not data:
        return True
    # Only hit_die / empty shells count as stubs for class cards.
    meaningful = {
        k: v
        for k, v in data.items()
        if k not in {"content_layer", "asi", "origin_feat", "category", "mastery"}
        and v not in (None, "", [], {}, False)
    }
    if not meaningful:
        return True
    if set(meaningful.keys()) <= {"hit_die"}:
        return True
    return False


def load_wave_rows(waves: Sequence[WaveSpec] | None = None) -> list[dict[str, Any]]:
    """Load planned live rows. Does **not** read the raw catalog.json dump."""
    specs = tuple(waves) if waves is not None else EDITION_2024_CATALOG_WAVES
    root = _data_dir()
    out: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for spec in specs:
        path = root / spec.filename
        if not path.is_file():
            logger.warning("edition 2024 wave missing: %s", path)
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        items = payload if isinstance(payload, list) else payload.get("entries") or []
        if not isinstance(items, list):
            raise RuntimeError(f"Expected list in {path}")
        for item in items:
            if not isinstance(item, Mapping):
                continue
            row = normalize_entry_payload(item)
            if row is None:
                continue
            key = (row["kind"], row["slug"])
            if key in seen:
                # Later wave wins (replace previous planned row).
                out = [r for r in out if (r["kind"], r["slug"]) != key]
            seen.add(key)
            out.append(row)
    return out


def assert_raw_dump_not_activated(planned: Sequence[Mapping[str, Any]] | None = None) -> None:
    """Selfcheck: live plan must not pull empty stubs / Culture / Engineering."""
    rows = list(planned) if planned is not None else load_wave_rows()
    for row in rows:
        slug = str(row.get("slug") or "").lower()
        assert slug not in BLOCKED_SLUGS, slug
        if row.get("kind") in STUB_KINDS:
            assert not _is_empty_stub(row.get("data") or {}), row.get("slug")
    # Raw dump must remain on disk but never be the live wave source.
    dump = _raw_dump_path()
    assert dump.is_file(), f"raw dump expected at {dump} (not loaded live)"
    assert "catalog.json" not in {w.filename for w in EDITION_2024_CATALOG_WAVES}


@dataclass
class SeedStats:
    upserted: int = 0
    deactivated_stubs: int = 0


def deactivate_legacy_2024_stubs(conn: sa.Connection) -> int:
    """Hide empty 2024 stub rows and playtest Culture/Engineering if present."""
    result = conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = false
            WHERE rules_edition = '2024'
              AND (
                lower(slug) IN ('culture', 'engineering')
                OR (
                  kind::text IN ('race', 'class', 'background', 'subclass')
                  AND (
                    data IS NULL
                    OR data = '{}'::jsonb
                    OR (
                      jsonb_strip_nulls(data) - 'content_layer' - 'asi'
                        - 'origin_feat' - 'category' - 'mastery'
                    ) = '{}'::jsonb
                    OR (
                      (jsonb_strip_nulls(data) - 'content_layer') ? 'hit_die'
                      AND (
                        SELECT count(*) FROM jsonb_object_keys(
                          jsonb_strip_nulls(data) - 'content_layer'
                        )
                      ) = 1
                    )
                  )
                )
              )
              AND is_active IS TRUE
            """
        )
    )
    return int(result.rowcount or 0)


def apply_edition_2024_catalog_seed(conn: sa.Connection) -> SeedStats:
    """Idempotent apply: upsert live waves (none yet) and deactivate stubs."""
    stats = SeedStats()
    stats.deactivated_stubs = deactivate_legacy_2024_stubs(conn)
    rows = load_wave_rows()
    for row in rows:
        stats.upserted += _upsert_row(conn, row)
    _migration_logger.info(
        "P24-01 edition 2024 seed: upserted=%s deactivated_stubs=%s waves=%s",
        stats.upserted,
        stats.deactivated_stubs,
        len(EDITION_2024_CATALOG_WAVES),
    )
    return stats


def _upsert_row(conn: sa.Connection, row: Mapping[str, Any]) -> int:
    existing = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind::text = :kind
              AND slug = :slug
              AND rules_edition::text = :edition
            LIMIT 1
            """
        ),
        {"kind": row["kind"], "slug": row["slug"], "edition": LIVE_EDITION},
    ).first()
    payload = {
        "id": row["id"],
        "kind": row["kind"],
        "slug": row["slug"],
        "name_ru": row["name_ru"],
        "name_en": row.get("name_en"),
        "edition": LIVE_EDITION,
        "parent_id": row.get("parent_id"),
        "source": row["source"],
        "external_ref": json.dumps(row.get("external_ref")) if row.get("external_ref") is not None else None,
        "data": json.dumps(row.get("data") or {}),
        "sort_order": row.get("sort_order") or 0,
        "is_active": bool(row.get("is_active", True)),
    }
    if existing is None:
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
            payload,
        )
        return 1
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries SET
              name_ru = :name_ru,
              name_en = :name_en,
              parent_id = CAST(:parent_id AS uuid),
              source = :source,
              external_ref = CAST(:external_ref AS jsonb),
              data = CAST(:data AS jsonb),
              sort_order = :sort_order,
              is_active = :is_active
            WHERE id = CAST(:id AS uuid)
               OR (
                 kind::text = :kind AND slug = :slug
                 AND rules_edition::text = :edition
               )
            """
        ),
        {**payload, "id": str(existing[0])},
    )
    return 1
