"""Upsert pack-03 oath and horizon-walker catalog rows.

Revision ID: o0e1f2a3b4c5
Revises: n9c0d1e2f3a4
Create Date: 2026-11-11

Oath of Glory no longer asks for Athletics/Acrobatics. Oath of the Watchers
no longer asks for skills, tools, or languages. Horizon Walker 17 grants
Teleportation Circle instead of Plane Shift.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "o0e1f2a3b4c5"
down_revision: Union[str, Sequence[str], None] = "n9c0d1e2f3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SPEC_REL = Path("data/classes/subclass_catalog_seed_2014.json")

TARGETS = (
    "oath_of_glory",
    "oath_of_the_watchers",
    "horizon_walker",
)


def _stable_subclass_id(slug: str) -> str:
    digest = hashlib.md5(f"dvarf-subclass-2014-{slug}".encode("utf-8")).hexdigest()
    return f"33333333-3333-4333-a333-{digest[:12]}"


def _load_seed() -> list[dict[str, Any]]:
    candidates = [
        Path.cwd() / SPEC_REL,
        Path.cwd() / "backend" / SPEC_REL,
        Path(__file__).resolve().parents[2] / SPEC_REL,
    ]
    path = next((item for item in candidates if item.is_file()), None)
    if path is None:
        raise FileNotFoundError(f"Subclass seed not found; tried {candidates}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    found: list[dict[str, Any]] = []
    wanted = set(TARGETS)
    for cls in payload.get("classes") or []:
        parent = cls.get("parent_slug")
        grants_level = int(cls.get("grants_level") or 3)
        for sub in cls.get("subclasses") or []:
            slug = sub.get("slug")
            if slug not in wanted:
                continue
            found.append(
                {
                    "slug": slug,
                    "parent_slug": sub.get("parent_slug") or parent,
                    "grants_level": int(sub.get("grants_level") or grants_level),
                    "sub": sub,
                }
            )
            wanted.discard(slug)
    if wanted:
        raise ValueError(f"subclass seed missing {sorted(wanted)}")
    return found


def _catalog_data(row: dict[str, Any]) -> dict[str, Any]:
    sub = row["sub"]
    return {
        "parent_slug": row["parent_slug"],
        "grants_level": row["grants_level"],
        "source": sub.get("source"),
        "source_books": sub.get("source_books"),
        "sheet_grants": sub.get("sheet_grants") or {},
        "choices": sub.get("choices") or [],
        "notes_ru": sub.get("notes_ru"),
        "always_prepared_spells": sub.get("always_prepared_spells") or [],
        "features_by_level": sub.get("features_by_level") or {},
        "detail_status": sub.get("detail_status"),
    }


def _parent_id(conn: Any, parent_slug: str) -> str | None:
    found = conn.execute(
        sa.text(
            """
            SELECT id FROM catalog_entries
            WHERE kind = 'class'
              AND slug = :slug
              AND rules_edition = '2014'
              AND is_active = true
            ORDER BY sort_order ASC
            LIMIT 1
            """
        ),
        {"slug": parent_slug},
    ).first()
    return str(found[0]) if found else None


def upgrade() -> None:
    conn = op.get_bind()
    for row in _load_seed():
        sub = row["sub"]
        parent_id = _parent_id(conn, row["parent_slug"])
        if parent_id is None:
            raise RuntimeError(f"class {row['parent_slug']} is not in catalog_entries")
        data = _catalog_data(row)
        params = {
            "slug": row["slug"],
            "name_ru": sub["name_ru"],
            "name_en": sub.get("name_en"),
            "parent_id": parent_id,
            "source": sub.get("source") or "phb",
            "data": json.dumps(data, ensure_ascii=False),
        }
        existing = conn.execute(
            sa.text(
                """
                SELECT id FROM catalog_entries
                WHERE kind = 'subclass'
                  AND slug = :slug
                  AND rules_edition = '2014'
                LIMIT 1
                """
            ),
            {"slug": row["slug"]},
        ).mappings().first()
        if existing:
            conn.execute(
                sa.text(
                    """
                    UPDATE catalog_entries
                    SET name_ru = :name_ru,
                        name_en = :name_en,
                        parent_id = CAST(:parent_id AS uuid),
                        source = :source,
                        data = CAST(:data AS jsonb),
                        is_active = true,
                        updated_at = now()
                    WHERE id = :id
                    """
                ),
                {**params, "id": str(existing["id"])},
            )
            continue
        conn.execute(
            sa.text(
                """
                INSERT INTO catalog_entries (
                    id, kind, slug, name_ru, name_en, rules_edition,
                    parent_id, source, external_ref, data, sort_order, is_active
                ) VALUES (
                    CAST(:id AS uuid),
                    'subclass',
                    :slug,
                    :name_ru,
                    :name_en,
                    '2014',
                    CAST(:parent_id AS uuid),
                    :source,
                    NULL,
                    CAST(:data AS jsonb),
                    0,
                    true
                )
                """
            ),
            {**params, "id": _stable_subclass_id(row["slug"])},
        )


def downgrade() -> None:
    pass
