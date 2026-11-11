"""Upsert background feature_name/text from PHB+ 2014 catalog spec.

Revision ID: z2a3b4c5d6e7
Revises: y1z2a3b4c5d6
Create Date: 2026-10-21

Existing sheets read feature text from background_grant (cache) and/or
traits markers; digital panel shows the grant. Refresh catalog.data so
new applies and ensureBackgroundFeatureOnDraft see corrected copy
(e.g. criminal «У вас есть…»).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "z2a3b4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "y1z2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/backgrounds/phb2014_background_catalog_spec.json")
PATCH_KEYS = (
    "feature_name_ru",
    "feature_text_ru",
    "feat_note_ru",
)


def _load_spec_backgrounds() -> dict[str, dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    path = next((p for p in candidates if p.is_file()), None)
    if path is None:
        raise FileNotFoundError(
            f"Background catalog spec not found; tried {candidates}"
        )
    payload = json.loads(path.read_text(encoding="utf-8"))
    by_slug: dict[str, dict[str, Any]] = {}
    for row in payload.get("backgrounds") or []:
        slug = row.get("slug")
        if not isinstance(slug, str) or not slug.strip():
            continue
        data = row.get("data") if isinstance(row.get("data"), dict) else {}
        by_slug[slug] = data
    if "criminal" not in by_slug:
        raise RuntimeError("criminal background missing from catalog spec")
    criminal_text = str(by_slug["criminal"].get("feature_text_ru") or "")
    if not criminal_text.startswith("У вас есть"):
        raise RuntimeError(
            "criminal feature_text_ru must start with «У вас есть» in spec"
        )
    return by_slug


def upgrade() -> None:
    conn = op.get_bind()
    by_slug = _load_spec_backgrounds()

    rows = (
        conn.execute(
            sa.text(
                """
                SELECT id, slug, data
                FROM catalog_entries
                WHERE kind = 'background'
                  AND rules_edition = '2014'
                  AND slug = ANY(:slugs)
                """
            ),
            {"slugs": list(by_slug.keys())},
        )
        .mappings()
        .all()
    )

    for row in rows:
        slug = row["slug"]
        spec_data = by_slug.get(slug) or {}
        patch = {
            key: spec_data[key]
            for key in PATCH_KEYS
            if key in spec_data and spec_data[key] is not None
        }
        if not patch:
            continue
        merged = dict(row["data"] or {})
        merged.update(patch)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = CAST(:data AS jsonb),
                    updated_at = now()
                WHERE id = :id
                """
            ),
            {
                "id": str(row["id"]),
                "data": json.dumps(merged, ensure_ascii=False),
            },
        )


def downgrade() -> None:
    # Content repair — no automatic reverse.
    pass
