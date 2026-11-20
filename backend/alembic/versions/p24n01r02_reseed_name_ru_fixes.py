"""P24-N01R2: re-seed 2024 catalog after live name_ru fixes.

Revision ID: p24n01r02
Revises: p24fixenum01
Create Date: 2026-11-20

Deploy #97 shipped JSON «Домен знания» (#541) but alembic head was already
``p24fixenum01``, so ``apply_edition_2024_catalog_seed`` never ran again and
Postgres kept the old ``name_ru`` («Домен знаний»). The create wizard leveling
step reads subclasses from ``GET /catalog?kind=subclass`` (DB), not from the
frontend JSON mirror.

This migration re-applies the idempotent live seed so DB cards match the tip
JSON (Knowledge Domain + dungeoneers-pack pack summaries, etc.).

Does not enable ``RULES_EDITION_2024_OPEN``. Does not modify 2014 catalog rows.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24n01r02"
down_revision: Union[str, Sequence[str], None] = "p24fixenum01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    """No data rollback — previous name_ru values are not restored."""
    pass
