"""Upsert official 2014 bestiary waves (~2380) into catalog_entries.

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-10-15 15:41:00.000000
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence, Union
from uuid import NAMESPACE_URL, uuid5

import sqlalchemy as sa
from alembic import op

revision: str = "g7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

WAVE_FILES = [
    "bestiary_mm_v1.json",
    "bestiary_vgm_mtf_v1.json",
    "bestiary_mpmm_v1.json",
    "bestiary_books_b4_v1.json",
    "bestiary_adventures_b5_v1.json",
]


def _data_dir() -> Path:
    candidates = [
        Path.cwd() / "backend" / "data" / "srd" / "2014",
        Path.cwd() / "data" / "srd" / "2014",
        Path(__file__).resolve().parents[2] / "data" / "srd" / "2014",
    ]
    for path in candidates:
        if path.is_dir():
            return path
    raise FileNotFoundError(f"bestiary data dir not found; tried {candidates}")


def _load_wave(name: str) -> list[dict[str, Any]]:
    path = _data_dir() / name
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise RuntimeError(f"Expected list in {path}")
    return payload


def upgrade() -> None:
    conn = op.get_bind()
    total = 0
    sort_base = 20000
    for wave in WAVE_FILES:
        rows = _load_wave(wave)
        for index, item in enumerate(rows):
            slug = item.get("slug")
            data = item.get("data") or {}
            if not slug or not isinstance(data, dict):
                continue
            entry_id = str(uuid5(NAMESPACE_URL, f"dvarf:catalog:bestiary:2014:{slug}"))
            existing = conn.execute(
                sa.text(
                    """
                    SELECT id FROM catalog_entries
                    WHERE kind = 'bestiary' AND rules_edition = '2014' AND slug = :slug
                    """
                ),
                {"slug": slug},
            ).mappings().first()

            payload = {
                "name_ru": item.get("name_ru") or slug,
                "name_en": item.get("name_en"),
                "source": item.get("source") or "ttg",
                "external_ref": json.dumps(item.get("external_ref") or {}, ensure_ascii=False),
                "data": json.dumps(data, ensure_ascii=False),
                "sort_order": int(item.get("sort_order") or (sort_base + index)),
            }

            if existing:
                conn.execute(
                    sa.text(
                        """
                        UPDATE catalog_entries
                        SET
                            name_ru = COALESCE(:name_ru, name_ru),
                            name_en = COALESCE(:name_en, name_en),
                            source = COALESCE(:source, source),
                            external_ref = CAST(:external_ref AS jsonb),
                            data = CAST(:data AS jsonb),
                            sort_order = :sort_order,
                            is_active = true,
                            updated_at = NOW()
                        WHERE id = :id
                        """
                    ),
                    {**payload, "id": str(existing["id"])},
                )
            else:
                conn.execute(
                    sa.text(
                        """
                        INSERT INTO catalog_entries (
                            id, kind, slug, name_ru, name_en, rules_edition,
                            parent_id, source, external_ref, data, sort_order, is_active
                        ) VALUES (
                            CAST(:id AS uuid), 'bestiary', :slug, :name_ru, :name_en, '2014',
                            NULL, :source, CAST(:external_ref AS jsonb), CAST(:data AS jsonb),
                            :sort_order, true
                        )
                        """
                    ),
                    {**payload, "id": entry_id, "slug": slug},
                )
            total += 1
        sort_base += 10000

    if total < 2000:
        raise RuntimeError(f"Expected ~2380 bestiary rows, got {total}")


def downgrade() -> None:
    op.execute("DELETE FROM catalog_entries WHERE kind = 'bestiary'")
