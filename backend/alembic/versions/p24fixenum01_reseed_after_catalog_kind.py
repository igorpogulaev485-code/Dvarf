"""P24: re-apply full 2024 catalog seed after all catalog_kind ALTER TYPEs.

Revision ID: p24fixenum01
Revises: p24int01merge
Create Date: 2026-11-20

Deploy #91 failed when early P24 migrations called ``apply_edition_2024_catalog_seed``
while live waves already included ``kind=bastion``, but the catalog_kind enum label
``bastion`` is only introduced in ``p24c12bast01``. The seed is now schema-aware
(skips kinds missing from ``pg_enum``). This head migration re-applies the full
idempotent seed after every enum/column step so deferred rows (bastions, …) are
guaranteed present at head — including environments that stamped past intermediate
seed revisions.

Does not enable ``RULES_EDITION_2024_OPEN``. Does not modify 2014 catalog rows.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "p24fixenum01"
down_revision: Union[str, Sequence[str], None] = "p24int01merge"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from alembic import op

    from app.services.edition_2024_catalog_seed import apply_edition_2024_catalog_seed

    apply_edition_2024_catalog_seed(op.get_bind())


def downgrade() -> None:
    # Data-only reseed; nothing to reverse without deleting live 2024 rows.
    pass
