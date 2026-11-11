"""Magic Initiate / Ritual Caster: options_from class spell lists.

Revision ID: s1r0c0mifeat1
Revises: s1r0c0dmgart1
Create Date: 2026-10-20 14:40:00.000000

Replaces curated PHB spell subsets with options_from=class_spell_list /
class_ritual_list so the picker uses the live spell catalog (XGE, TCE, …).
Also restores bard on faerie_fire (PHB).
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "s1r0c0mifeat1"
down_revision: Union[str, Sequence[str], None] = "s1r0c0dmgart1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BACKEND_ROOT = Path(__file__).resolve().parents[2]
SPEC_REL = "data/feats/phb2014_feat_catalog_spec.json"
FEAT_SLUGS = {"magic_initiate", "ritual_caster"}


def _load_feats() -> list[dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        BACKEND_ROOT / SPEC_REL,
    ]
    for path in candidates:
        if path.is_file():
            return list(json.loads(path.read_text(encoding="utf-8")).get("feats") or [])
    raise FileNotFoundError(SPEC_REL)


def _upsert_feat(conn: sa.Connection, row: dict[str, Any]) -> None:
    slug = row["slug"]
    data = dict(row.get("data") or {})
    data["source"] = row.get("source") or data.get("source") or "phb"
    data["wave"] = "phb"
    existing = (
        conn.execute(
            sa.text(
                """
                SELECT id, data FROM catalog_entries
                WHERE kind = 'feat' AND slug = :slug AND rules_edition = '2014'
                LIMIT 1
                """
            ),
            {"slug": slug},
        )
        .mappings()
        .first()
    )
    if existing:
        merged = dict(existing["data"] or {})
        merged.update(data)
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET name_ru = :name_ru, name_en = :name_en, source = :source,
                    data = CAST(:data AS jsonb), sort_order = :sort_order,
                    is_active = true, updated_at = now()
                WHERE id = :id
                """
            ),
            {
                "id": str(existing["id"]),
                "name_ru": row["name_ru"],
                "name_en": row.get("name_en"),
                "source": row.get("source") or "phb",
                "data": json.dumps(merged, ensure_ascii=False),
                "sort_order": int(row.get("sort_order") or 999),
            },
        )
        return
    entry_id = row.get("id") or str(
        uuid.uuid5(uuid.NAMESPACE_URL, f"dvarf:feat:2014:{slug}")
    )
    conn.execute(
        sa.text(
            """
            INSERT INTO catalog_entries (
                id, kind, slug, name_ru, name_en, rules_edition,
                parent_id, source, external_ref, data, sort_order, is_active
            ) VALUES (
                CAST(:id AS uuid), 'feat', :slug, :name_ru, :name_en, '2014',
                NULL, :source, NULL, CAST(:data AS jsonb), :sort_order, true
            )
            """
        ),
        {
            "id": str(entry_id),
            "slug": slug,
            "name_ru": row["name_ru"],
            "name_en": row.get("name_en"),
            "source": row.get("source") or "phb",
            "data": json.dumps(data, ensure_ascii=False),
            "sort_order": int(row.get("sort_order") or 999),
        },
    )


def _fix_faerie_fire(conn: sa.Connection) -> None:
    row = (
        conn.execute(
            sa.text(
                """
                SELECT id, data FROM catalog_entries
                WHERE kind = 'spell' AND slug = 'faerie_fire' AND rules_edition = '2014'
                LIMIT 1
                """
            )
        )
        .mappings()
        .first()
    )
    if not row:
        return
    data = dict(row["data"] or {})
    classes = [str(c).lower() for c in (data.get("classes") or [])]
    if "bard" in classes:
        return
    data["classes"] = sorted(set([*classes, "bard"]))
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = CAST(:data AS jsonb), updated_at = now()
            WHERE id = :id
            """
        ),
        {"id": str(row["id"]), "data": json.dumps(data, ensure_ascii=False)},
    )


def upgrade() -> None:
    conn = op.get_bind()
    for row in _load_feats():
        if row.get("slug") in FEAT_SLUGS:
            _upsert_feat(conn, row)
    _fix_faerie_fire(conn)


def downgrade() -> None:
    # Catalog-driven lists are forward-only; no curated subset restore.
    pass
