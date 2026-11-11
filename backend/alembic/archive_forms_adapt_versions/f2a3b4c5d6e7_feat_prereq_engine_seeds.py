"""Feat prereq engine seeds: backgrounds + re-upsert SDQ/BPGG + race feat_pick.

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-10-07 15:45:00.000000
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _load_json(rel: str) -> dict[str, Any]:
    candidates = [
        Path.cwd() / rel,
        Path.cwd() / "backend" / rel,
        BACKEND_ROOT / rel,
    ]
    for path in candidates:
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"Spec not found: {rel}; tried {candidates}")


def _upsert_kind(
    conn: sa.Connection,
    *,
    kind: str,
    rows: list[dict[str, Any]],
    wave: str,
    default_source: str,
) -> None:
    for row in rows:
        slug = row["slug"]
        data = dict(row.get("data") or {})
        data["source"] = row.get("source") or data.get("source") or default_source
        data["wave"] = wave
        existing = (
            conn.execute(
                sa.text(
                    """
                    SELECT id, data FROM catalog_entries
                    WHERE kind = :kind AND slug = :slug AND rules_edition = '2014'
                    LIMIT 1
                    """
                ),
                {"kind": kind, "slug": slug},
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
                    "source": row.get("source") or default_source,
                    "data": json.dumps(merged, ensure_ascii=False),
                    "sort_order": int(row.get("sort_order") or 999),
                },
            )
            continue
        entry_id = row.get("id") or str(
            uuid.uuid5(uuid.NAMESPACE_URL, f"dvarf:{kind}:2014:{slug}")
        )
        conn.execute(
            sa.text(
                """
                INSERT INTO catalog_entries (
                    id, kind, slug, name_ru, name_en, rules_edition,
                    parent_id, source, external_ref, data, sort_order, is_active
                ) VALUES (
                    CAST(:id AS uuid), :kind, :slug, :name_ru, :name_en, '2014',
                    NULL, :source, NULL, CAST(:data AS jsonb), :sort_order, true
                )
                """
            ),
            {
                "id": str(entry_id),
                "kind": kind,
                "slug": slug,
                "name_ru": row["name_ru"],
                "name_en": row.get("name_en"),
                "source": row.get("source") or default_source,
                "data": json.dumps(data, ensure_ascii=False),
                "sort_order": int(row.get("sort_order") or 999),
            },
        )


def _patch_race_flags(conn: sa.Connection) -> None:
    for slug in ("custom_lineage", "human_variant"):
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{feat_pick}', 'true'::jsonb, true),
                    updated_at = now()
                WHERE kind = 'race' AND slug = :slug AND rules_edition = '2014'
                """
            ),
            {"slug": slug},
        )
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = (COALESCE(data, '{}'::jsonb) - 'feat_note_ru')
                || jsonb_build_object(
                    'cantrip_note_ru',
                    'Выбери любой заговор чародея; базовая характеристика — ИНТ, МУД или ХАР.'
                ),
                updated_at = now()
            WHERE kind = 'race' AND slug = 'kobold_draconic_sorcery'
              AND rules_edition = '2014'
            """
        )
    )


def upgrade() -> None:
    conn = op.get_bind()
    bg = _load_json("data/backgrounds/feat_linked_2014_background_catalog_spec.json")
    _upsert_kind(
        conn,
        kind="background",
        rows=list(bg.get("backgrounds") or []),
        wave="feat_linked",
        default_source="sdq",
    )
    sdq = _load_json("data/feats/sdq2014_feat_catalog_spec.json")
    _upsert_kind(
        conn,
        kind="feat",
        rows=list(sdq.get("feats") or []),
        wave="sdq",
        default_source="sdq",
    )
    bpgg = _load_json("data/feats/bpgg2014_feat_catalog_spec.json")
    _upsert_kind(
        conn,
        kind="feat",
        rows=list(bpgg.get("feats") or []),
        wave="bpgg",
        default_source="bpgg",
    )
    _patch_race_flags(conn)


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'background' AND rules_edition = '2014'
              AND data->>'wave' = 'feat_linked'
            """
        )
    )
