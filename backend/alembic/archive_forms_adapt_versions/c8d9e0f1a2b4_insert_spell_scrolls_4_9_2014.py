"""Insert Spell Scroll blanks levels 4–9 (2014).

Revision ID: c8d9e0f1a2b4
Revises: b7c8d9e0f1a2
Create Date: 2026-10-15 06:30:00.000000

- Completes the spell_scroll family (already had cantrip + 1–3).
- Rarity from DMG; cost from XGE crafting table.
- Upsert by slug; does not wipe prior gear waves.
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c8d9e0f1a2b4"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/gear_spell_scrolls_4_9_v1.json")
EXPECTED_SLUGS = tuple(f"spell_scroll_{n}" for n in range(4, 10))


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
    raise FileNotFoundError(f"Spell scroll 4–9 file not found; tried {candidates}")


def _entry_id(item: dict[str, Any]) -> str:
    if item.get("id"):
        return str(item["id"])
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"dvarf:catalog:item:2014:{item['slug']}"))


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    inserts = payload.get("inserts") or []
    by_slug = {
        item["slug"]: item
        for item in inserts
        if item.get("kind") == "item" and item.get("slug") in EXPECTED_SLUGS
    }
    missing = [slug for slug in EXPECTED_SLUGS if slug not in by_slug]
    if missing:
        raise RuntimeError(f"Missing spell scroll inserts: {missing}")

    for slug in EXPECTED_SLUGS:
        item = by_slug[slug]
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
                    "kind": "item",
                    "rules_edition": item.get("rules_edition") or "2014",
                },
            )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'item'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": list(EXPECTED_SLUGS)},
    )
