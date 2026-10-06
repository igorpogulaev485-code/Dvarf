"""Fix condition catalog Russian names + intoxicated

Revision ID: c0nd1t10nru1
Revises: a4b5c6d7e8f9
Create Date: 2026-10-06 18:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c0nd1t10nru1"
down_revision: Union[str, Sequence[str], None] = "a4b5c6d7e8f9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NAMES = {
    "blinded": ("Ослеплённый", "Blinded"),
    "charmed": ("Очарованный", "Charmed"),
    "deafened": ("Оглохший", "Deafened"),
    "exhaustion": ("Истощение", "Exhaustion"),
    "frightened": ("Испуганный", "Frightened"),
    "grappled": ("Схваченный", "Grappled"),
    "incapacitated": ("Недееспособный", "Incapacitated"),
    "invisible": ("Невидимый", "Invisible"),
    "paralyzed": ("Парализованный", "Paralyzed"),
    "petrified": ("Окаменевший", "Petrified"),
    "poisoned": ("Отравленный", "Poisoned"),
    "prone": ("Опрокинутый", "Prone"),
    "restrained": ("Опутанный", "Restrained"),
    "stunned": ("Ошеломлённый", "Stunned"),
    "unconscious": ("Бессознательный", "Unconscious"),
    "intoxicated": ("Опьянение", "Intoxicated"),
}


def upgrade() -> None:
    conn = op.get_bind()
    for slug, (name_ru, name_en) in NAMES.items():
        conn.execute(
            sa.text(
                """
                UPDATE catalog_entries
                SET name_ru = :name_ru,
                    name_en = COALESCE(name_en, :name_en)
                WHERE kind = 'condition'
                  AND slug = :slug
                """
            ),
            {"slug": slug, "name_ru": name_ru, "name_en": name_en},
        )

    # Ensure intoxicated exists for both editions (idempotent).
    catalog_kind = postgresql.ENUM(name="catalog_kind", create_type=False)
    catalog_rules_edition = postgresql.ENUM(name="catalog_rules_edition", create_type=False)
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
    for edition, suffix in (("2014", "14"), ("2024", "24")):
        exists = conn.execute(
            sa.text(
                """
                SELECT 1 FROM catalog_entries
                WHERE kind = 'condition' AND slug = 'intoxicated'
                  AND rules_edition = :edition
                LIMIT 1
                """
            ),
            {"edition": edition},
        ).first()
        if exists:
            continue
        rows.append(
            {
                "id": f"88888888-8888-4888-8888-8888888888{suffix}",
                "kind": "condition",
                "slug": "intoxicated",
                "name_ru": "Опьянение",
                "name_en": "Intoxicated",
                "rules_edition": edition,
                "parent_id": None,
                "source": "dvarf",
                "external_ref": None,
                "data": {"slug": "intoxicated", "max_level": 5},
                "sort_order": 160,
                "is_active": True,
            }
        )
    if rows:
        op.bulk_insert(catalog_entries, rows)

    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = COALESCE(data, '{}'::jsonb) || '{"max_level": 6}'::jsonb
            WHERE kind = 'condition' AND slug = 'exhaustion'
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE catalog_entries
            SET data = COALESCE(data, '{}'::jsonb) || '{"max_level": 5}'::jsonb
            WHERE kind = 'condition' AND slug = 'intoxicated'
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            DELETE FROM catalog_entries
            WHERE kind = 'condition'
              AND slug = 'intoxicated'
              AND source = 'dvarf'
            """
        )
    )
