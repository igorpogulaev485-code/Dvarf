"""seed common gear with weights; add weight_lb to weapons

Revision ID: d4e5f6071829
Revises: c3d4e5f60718
Create Date: 2026-10-06 04:25:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d4e5f6071829"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f60718"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

catalog_kind = postgresql.ENUM(name="catalog_kind", create_type=False)
catalog_rules_edition = postgresql.ENUM(name="catalog_rules_edition", create_type=False)

WEAPON_WEIGHTS = {
    "dagger": 1,
    "mace": 4,
    "quarterstaff": 4,
    "handaxe": 2,
    "javelin": 2,
    "warhammer": 2,
    "longsword": 3,
    "shortsword": 2,
    "light_crossbow": 5,
    "shortbow": 2,
}


def upgrade() -> None:
    conn = op.get_bind()
    for slug, weight in WEAPON_WEIGHTS.items():
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = COALESCE(data, '{}'::jsonb) || jsonb_build_object('weight_lb', :weight)
                WHERE kind = 'weapon' AND slug = :slug AND rules_edition IN ('2014', 'both')
                """
            ),
            {"slug": slug, "weight": weight},
        )

    catalog_entries = sa.table(
        "catalog_entries",
        sa.column("id", sa.UUID()),
        sa.column("kind", catalog_kind),
        sa.column("slug", sa.String()),
        sa.column("name_ru", sa.String()),
        sa.column("name_en", sa.String()),
        sa.column("rules_edition", catalog_rules_edition),
        sa.column("parent_id", sa.UUID()),
        sa.column("source", sa.String()),
        sa.column("external_ref", postgresql.JSONB()),
        sa.column("data", postgresql.JSONB()),
        sa.column("sort_order", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
    )

    gear = [
        (
            "55555555-5555-4555-8555-555555555501",
            "backpack",
            "Рюкзак",
            "Backpack",
            10,
            {"weight_lb": 5, "category": "gear"},
        ),
        (
            "55555555-5555-4555-8555-555555555502",
            "rope_hemp_50",
            "Верёвка пеньковая (15 м)",
            "Hempen rope (50 ft)",
            20,
            {"weight_lb": 10, "category": "gear"},
        ),
        (
            "55555555-5555-4555-8555-555555555503",
            "rations_1",
            "Сухой паёк (1 день)",
            "Rations (1 day)",
            30,
            {"weight_lb": 2, "category": "gear"},
        ),
        (
            "55555555-5555-4555-8555-555555555504",
            "waterskin",
            "Бурдюк",
            "Waterskin",
            40,
            {"weight_lb": 5, "category": "gear"},
        ),
        (
            "55555555-5555-4555-8555-555555555505",
            "torch",
            "Факел",
            "Torch",
            50,
            {"weight_lb": 1, "category": "gear"},
        ),
        (
            "55555555-5555-4555-8555-555555555506",
            "crowbar",
            "Ломик",
            "Crowbar",
            60,
            {"weight_lb": 5, "category": "gear"},
        ),
    ]

    op.bulk_insert(
        catalog_entries,
        [
            {
                "id": row[0],
                "kind": "item",
                "slug": row[1],
                "name_ru": row[2],
                "name_en": row[3],
                "rules_edition": "2014",
                "parent_id": None,
                "source": "SRD 5.1 (sample)",
                "external_ref": None,
                "data": row[5],
                "sort_order": row[4],
                "is_active": True,
            }
            for row in gear
        ],
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'item'
              AND slug IN (
                'backpack', 'rope_hemp_50', 'rations_1', 'waterskin', 'torch', 'crowbar'
              )
            """
        )
    )
    for slug in WEAPON_WEIGHTS:
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET data = data - 'weight_lb'
                WHERE kind = 'weapon' AND slug = :slug
                """
            ),
            {"slug": slug},
        )
