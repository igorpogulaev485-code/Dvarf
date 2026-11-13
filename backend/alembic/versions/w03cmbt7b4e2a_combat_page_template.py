"""W-03: системный шаблон страницы «Бой» (upsert по page_kind).

Revision ID: w03cmbt7b4e2a
Revises: w02wiki0a2e0f
Create Date: 2026-11-13

- setting_page_templates: строка page_kind='combat', setting_id IS NULL.
- Id не зашит заранее: если строка уже есть — noop; иначе uuid4().
- Волны/лут живут в JSONB fields страниц — новых колонок нет.
"""

from __future__ import annotations

import json
from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "w03cmbt7b4e2a"
down_revision: Union[str, Sequence[str], None] = "w02wiki0a2e0f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PAGE_KIND = "combat"
TEMPLATE_NAME = "Бой"
SCHEMA = [
    {
        "key": "gm_notes",
        "label": "Заметки мастера",
        "type": "long",
        "gm_only": True,
    }
]


def upgrade() -> None:
    bind = op.get_bind()
    existing = bind.execute(
        sa.text(
            "SELECT id FROM setting_page_templates "
            "WHERE setting_id IS NULL AND page_kind = :kind "
            "LIMIT 1"
        ),
        {"kind": PAGE_KIND},
    ).fetchone()
    if existing is not None:
        return
    # Id выдаём в рантайме миграции (B-08: не падать на UniqueViolation чужих id).
    templates = sa.table(
        "setting_page_templates",
        sa.column("id", sa.UUID()),
        sa.column("setting_id", sa.UUID()),
        sa.column("page_kind", sa.String()),
        sa.column("name", sa.String()),
        sa.column("body_seed", sa.Text()),
        sa.column("schema", JSONB()),
        sa.column("enabled", sa.Boolean()),
    )
    op.bulk_insert(
        templates,
        [
            {
                "id": uuid4(),
                "setting_id": None,
                "page_kind": PAGE_KIND,
                "name": TEMPLATE_NAME,
                "body_seed": "",
                "schema": SCHEMA,
                "enabled": True,
            }
        ],
    )
    # json import kept for potential SQL fallbacks / test sniffing
    _ = json.dumps


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "DELETE FROM setting_page_templates "
            "WHERE setting_id IS NULL AND page_kind = :kind AND name = :name"
        ),
        {"kind": PAGE_KIND, "name": TEMPLATE_NAME},
    )
