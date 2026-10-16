"""Promote family parent slugs for W6 leftover families.

Revision ID: j2d3e4f5a6b7
Revises: i1c2d3e4f5a6
Create Date: 2026-10-08 13:55:00.000000

- Rename one variant per family so slug == family_slug
  (bag_of_tricks, carpet_of_flying, elemental_gem, horn_of_valhalla,
   ioun_stone, potion_of_giant_strength) — same pattern as potion_of_healing.
- Deactivate duplicate potion_of_*_giant_strength aliases.
- Does not wipe catalog.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j2d3e4f5a6b7"
down_revision: Union[str, Sequence[str], None] = "i1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DATA_REL = Path("data/srd/2014/gear_family_parents_v1.json")


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
    raise FileNotFoundError(f"Family parents file not found; tried {candidates}")


def upgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    renames = payload.get("renames") or []
    if len(renames) < 6:
        raise RuntimeError(f"Expected 6 family parent renames, got {len(renames)}")

    renamed = 0
    for row in renames:
        from_slug = row.get("from_slug")
        to_slug = row.get("to_slug")
        if not from_slug or not to_slug:
            continue

        target_exists = conn.execute(
            sa.text(
                """
                SELECT 1 FROM catalog_entries
                WHERE kind = 'item'
                  AND rules_edition IN ('2014', 'both')
                  AND slug = :slug
                LIMIT 1
                """
            ),
            {"slug": to_slug},
        ).first()
        if target_exists:
            # Parent already present — drop the from_slug duplicate instead.
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET is_active = FALSE, updated_at = NOW()
                    WHERE kind = 'item'
                      AND rules_edition IN ('2014', 'both')
                      AND slug = :slug
                    """
                ),
                {"slug": from_slug},
            )
            continue

        src = conn.execute(
            sa.text(
                """
                SELECT data FROM catalog_entries
                WHERE kind = 'item'
                  AND rules_edition IN ('2014', 'both')
                  AND slug = :slug
                LIMIT 1
                """
            ),
            {"slug": from_slug},
        ).first()
        if not src:
            raise RuntimeError(f"Missing source row for rename {from_slug} → {to_slug}")

        data = dict(src[0] or {})
        data["family_slug"] = to_slug
        if row.get("family_label_ru"):
            data["family_label_ru"] = row["family_label_ru"]
        if row.get("variant_key"):
            data["variant_key"] = row["variant_key"]
        if row.get("variant_label_ru"):
            data["variant_label_ru"] = row["variant_label_ru"]

        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET
                    slug = :to_slug,
                    data = CAST(:data AS jsonb),
                    is_active = TRUE,
                    updated_at = NOW()
                WHERE kind = 'item'
                  AND rules_edition IN ('2014', 'both')
                  AND slug = :from_slug
                """
            ),
            {
                "from_slug": from_slug,
                "to_slug": to_slug,
                "data": json.dumps(data, ensure_ascii=False),
            },
        )
        renamed += 1

    if renamed < 1:
        raise RuntimeError("Expected to rename at least one family parent slug")

    deactivate = payload.get("deactivate_slugs") or []
    if deactivate:
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET is_active = FALSE, updated_at = NOW()
                WHERE kind = 'item'
                  AND rules_edition IN ('2014', 'both')
                  AND slug = ANY(:slugs)
                """
            ),
            {"slugs": list(deactivate)},
        )


def downgrade() -> None:
    conn = op.get_bind()
    payload = _load_payload()
    # Reverse renames; reactivate deactivated aliases.
    for row in reversed(payload.get("renames") or []):
        from_slug = row.get("from_slug")
        to_slug = row.get("to_slug")
        if not from_slug or not to_slug:
            continue
        src = conn.execute(
            sa.text(
                """
                SELECT data FROM catalog_entries
                WHERE kind = 'item'
                  AND rules_edition IN ('2014', 'both')
                  AND slug = :slug
                LIMIT 1
                """
            ),
            {"slug": to_slug},
        ).first()
        if not src:
            continue
        # Only reverse if from_slug is free.
        conflict = conn.execute(
            sa.text(
                """
                SELECT 1 FROM catalog_entries
                WHERE kind = 'item'
                  AND rules_edition IN ('2014', 'both')
                  AND slug = :slug
                LIMIT 1
                """
            ),
            {"slug": from_slug},
        ).first()
        if conflict:
            continue
        data = dict(src[0] or {})
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET slug = :from_slug, data = CAST(:data AS jsonb), updated_at = NOW()
                WHERE kind = 'item'
                  AND rules_edition IN ('2014', 'both')
                  AND slug = :to_slug
                """
            ),
            {
                "from_slug": from_slug,
                "to_slug": to_slug,
                "data": json.dumps(data, ensure_ascii=False),
            },
        )

    deactivate = payload.get("deactivate_slugs") or []
    if deactivate:
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET is_active = TRUE, updated_at = NOW()
                WHERE kind = 'item'
                  AND rules_edition IN ('2014', 'both')
                  AND slug = ANY(:slugs)
                """
            ),
            {"slugs": list(deactivate)},
        )
