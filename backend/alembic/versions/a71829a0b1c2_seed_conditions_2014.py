"""seed SRD conditions catalog 2014

Revision ID: a71829a0b1c2
Revises: f6071829a0b1
Create Date: 2026-10-06 06:20:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a71829a0b1c2"
down_revision: Union[str, Sequence[str], None] = "f6071829a0b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

catalog_kind = postgresql.ENUM(name="catalog_kind", create_type=False)
catalog_rules_edition = postgresql.ENUM(name="catalog_rules_edition", create_type=False)

CONDITIONS = [
    ("blinded", "Ослеплённый", "Blinded"),
    ("charmed", "Очарованный", "Charmed"),
    ("deafened", "Оглохший", "Deafened"),
    ("frightened", "Испуганный", "Frightened"),
    ("grappled", "Схваченный", "Grappled"),
    ("incapacitated", "Недееспособный", "Incapacitated"),
    ("invisible", "Невидимый", "Invisible"),
    ("paralyzed", "Парализованный", "Paralyzed"),
    ("petrified", "Окаменевший", "Petrified"),
    ("poisoned", "Отравленный", "Poisoned"),
    ("prone", "Опрокинутый", "Prone"),
    ("restrained", "Опутанный", "Restrained"),
    ("stunned", "Ошеломлённый", "Stunned"),
    ("unconscious", "Бессознательный", "Unconscious"),
]


def upgrade() -> None:
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

    rows = []
    for index, (slug, name_ru, name_en) in enumerate(CONDITIONS, start=1):
        rows.append(
            {
                "id": f"77777777-7777-4777-8777-7777777777{index:02d}",
                "kind": "condition",
                "slug": slug,
                "name_ru": name_ru,
                "name_en": name_en,
                "rules_edition": "2014",
                "parent_id": None,
                "source": "srd",
                "external_ref": None,
                "data": {"slug": slug},
                "sort_order": index * 10,
                "is_active": True,
            }
        )

    op.bulk_insert(catalog_entries, rows)


def downgrade() -> None:
    conn = op.get_bind()
    slugs = [slug for slug, _, _ in CONDITIONS]
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'condition'
              AND rules_edition = '2014'
              AND slug = ANY(:slugs)
            """
        ),
        {"slugs": slugs},
    )
