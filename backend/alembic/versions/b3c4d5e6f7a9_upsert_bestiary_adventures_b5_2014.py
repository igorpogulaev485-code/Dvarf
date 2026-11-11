"""Bridge: prod already stamped at b3c4d5e6f7a9 (B5 bestiary seed).

Revision ID: b3c4d5e6f7a9
Revises: c9d0e1f2a3b4
Create Date: 2026-10-16 03:20:00.000000

На проде alembic_version = b3c4d5e6f7a9 из параллельной ветки bestiary B5
(данные уже в catalog_entries, ~2380). Файл нужен, чтобы alembic нашёл
ревизию; upgrade пустой. Слияние с линией лобби/C — в m4n5o6p7q8r9.
"""

from __future__ import annotations

from typing import Sequence, Union

revision: str = "b3c4d5e6f7a9"
# Sibling of a0b1c2d3e4f5 (оба от c9): схема лобби уже на c9, bestiary stamp — здесь.
down_revision: Union[str, Sequence[str], None] = "c9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Данные B5 уже применены на проде; no-op для свежих инсталлов
    # (полный upsert остаётся в g7b8c9d0e1f2).
    pass


def downgrade() -> None:
    pass
