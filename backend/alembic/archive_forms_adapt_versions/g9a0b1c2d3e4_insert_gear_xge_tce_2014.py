"""Insert 2014 XGE/TCE (+ EGW/DMG gap) magic items (W4).

Revision ID: g9a0b1c2d3e4
Revises: f8a9b0c1d2e3
Create Date: 2026-10-08 11:40:00.000000

- Upsert Xanathar's / Tasha's caster focuses, tattoos, common XGE toys,
  instruments of the bards, a few EGW items.
- RU names, wear_slot, source_book, effects MVP.
- Does not wipe DMG/PHB gear from prior waves.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "g9a0b1c2d3e4"
down_revision: Union[str, Sequence[str], None] = "f8a9b0c1d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/gear_xge_tce_v1.json")


def _load_payload() -> dict[str, Any]:
    candidates = [
        Path.cwd() / "backend" / DATA_REL,
        Path.cwd() / DATA_REL,
        Path(__file__).resolve().parents[2] / DATA_REL,
    ]
    for path in candidates:
        if path.is_file():
            payload = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(payload, dict):
                raise RuntimeError(f"Expected object in {path}")
            return payload
    raise FileNotFoundError(f"XGE/TCE gear file not found; tried {candidates}")


def _entry_id(item: dict[str, Any]) -> str:
    if item.get("id"):
        return str(item["id"])
    slug = item["slug"]
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"dvarf:catalog:item:2014:{slug}"))


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    inserts = payload.get("inserts") or []
    if len(inserts) < 60:
        raise RuntimeError(f"Expected ~80 XGE/TCE inserts, got {len(inserts)}")

    touched = 0
    for item in inserts:
        kind = item.get("kind") or "item"
        slug = item.get("slug")
        if kind != "item" or not slug:
            continue
        data = item.get("data") or {}
        exists = conn.execute(
            sa.text(
                """
                SELECT 1 FROM catalog_entries
                WHERE kind = 'item'
                  AND rules_edition IN ('2014', 'both')
                  AND slug = :slug
                LIMIT 1
                """
            ),
            {"slug": slug},
        ).first()
        params = {
            "slug": slug,
            "name_ru": item.get("name_ru"),
            "name_en": item.get("name_en"),
            "source": item.get("source"),
            "sort_order": int(item.get("sort_order") or 0),
            "data": json.dumps(data, ensure_ascii=False),
        }
        if exists:
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET
                        name_ru = :name_ru,
                        name_en = :name_en,
                        source = :source,
                        data = CAST(:data AS jsonb),
                        sort_order = :sort_order,
                        is_active = TRUE,
                        updated_at = NOW()
                    WHERE kind = 'item'
                      AND rules_edition IN ('2014', 'both')
                      AND slug = :slug
                    """
                ),
                params,
            )
        else:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO catalog_entries (
                        id, kind, slug, name_ru, name_en, rules_edition,
                        parent_id, source, external_ref, data, sort_order, is_active
                    ) VALUES (
                        CAST(:id AS uuid),
                        CAST(:kind AS catalog_kind),
                        :slug,
                        :name_ru,
                        :name_en,
                        CAST(:rules_edition AS catalog_rules_edition),
                        NULL,
                        :source,
                        NULL,
                        CAST(:data AS jsonb),
                        :sort_order,
                        TRUE
                    )
                    """
                ),
                {
                    **params,
                    "id": _entry_id(item),
                    "kind": kind,
                    "rules_edition": item.get("rules_edition") or "2014",
                },
            )
        touched += 1

    if touched < 60:
        raise RuntimeError(f"Expected to upsert many XGE/TCE rows; only {touched}")


def downgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    slugs = [item["slug"] for item in (payload.get("inserts") or []) if item.get("slug")]
    if not slugs:
        return
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'item'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
              AND (
                source LIKE 'XGE %%'
                OR source LIKE 'TCE %%'
                OR source LIKE 'EGW %%'
                OR source LIKE 'DMG %%'
              )
            """
        ),
        {"slugs": slugs},
    )
