"""Enrich 2014 DMG/SRD magic weapons & armor (W2).

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-10-08 09:50:00.000000

- Restore combat stats / armor_kind from base templates.
- wear_slot, magic_bonus, effects MVP, description_ru, cost guide.
- Deactivate family stub rows slug=weapon / slug=armor (variant varies).
- Does not touch mundane gear, potions, 2024, or non-gear kinds.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "d6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/gear_magic_enrich_v1.json")


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
    raise FileNotFoundError(f"Magic enrich file not found; tried {candidates}")


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    updates = payload.get("updates") or []
    if len(updates) < 50:
        raise RuntimeError(f"Expected ~59 magic updates, got {len(updates)}")

    updated = 0
    for item in updates:
        kind = item.get("kind")
        slug = item.get("slug")
        data = item.get("data") or {}
        if kind not in ("weapon", "armor") or not slug:
            continue
        is_active = item.get("is_active")
        if is_active is None:
            is_active = True
        result = conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET
                    name_ru = COALESCE(:name_ru, name_ru),
                    name_en = COALESCE(:name_en, name_en),
                    source = COALESCE(:source, source),
                    data = CAST(:data AS jsonb),
                    is_active = :is_active,
                    updated_at = NOW()
                WHERE kind = CAST(:kind AS catalog_kind)
                  AND rules_edition IN ('2014', 'both')
                  AND slug = :slug
                """
            ),
            {
                "kind": kind,
                "slug": slug,
                "name_ru": item.get("name_ru"),
                "name_en": item.get("name_en"),
                "source": item.get("source"),
                "is_active": bool(is_active),
                "data": json.dumps(data, ensure_ascii=False),
            },
        )
        updated += result.rowcount or 0

    if updated < 50:
        raise RuntimeError(
            f"Expected to update many magic gear rows; only updated {updated}"
        )

    deactivate = payload.get("deactivate_slugs") or ["weapon", "armor"]
    if deactivate:
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET is_active = FALSE, updated_at = NOW()
                WHERE kind IN ('weapon', 'armor')
                  AND rules_edition IN ('2014', 'both')
                  AND slug = ANY(:slugs)
                  AND coalesce(data->>'variant_key', '') = 'varies'
                """
            ),
            {"slugs": list(deactivate)},
        )


def downgrade() -> None:
    """Cannot restore pre-enrich payloads; re-activate family stubs only."""
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET is_active = TRUE, updated_at = NOW()
            WHERE kind IN ('weapon', 'armor')
              AND rules_edition IN ('2014', 'both')
              AND slug IN ('weapon', 'armor')
            """
        )
    )
